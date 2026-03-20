import * as XLSX from "xlsx";

export type ParsedPupilFeeRow = {
  rowIndex: number;
  className: string;
  fullName: string;
  sex: 'M' | 'F' | null;
  oldOrNew: 'O' | 'N' | null;
  totalSchoolFees: number;
  firstInstallmentAmount: number;
  firstInstallmentDate: string | null;
  firstInstallmentReceiptNo: string | null;
  secondInstallmentAmount: number;
  secondInstallmentDate: string | null;
  secondInstallmentReceiptNo: string | null;
  thirdInstallmentAmount: number;
  thirdInstallmentDate: string | null;
  thirdInstallmentReceiptNo: string | null;
  totalPaid: number;
  computedBalance: number;
  paymentStatus: 'paid_in_full' | 'with_balance' | 'not_paid' | 'overpaid';
};

export type RowType =
  | 'blank'
  | 'header'
  | 'section_header'
  | 'subtotal'
  | 'grand_total'
  | 'pupil'
  | 'junk';

// Helper functions
export function normalizeCell(value: unknown): string {
  return String(value ?? '').trim();
}

export function parseMoney(value: unknown): number {
  const raw = normalizeCell(value);

  if (!raw || raw === '-' || raw === '—') return 0;

  // (20.00) => -20.00
  const negativeBracketMatch = raw.match(/^\(([\d,]+(?:\.\d+)?)\)$/);
  if (negativeBracketMatch) {
    return -Number(negativeBracketMatch[1].replace(/,/g, ''));
  }

  const cleaned = raw.replace(/,/g, '');
  const num = Number(cleaned);

  return Number.isFinite(num) ? num : 0;
}

export function parseOptionalText(value: unknown): string | null {
  const raw = normalizeCell(value);
  return raw ? raw : null;
}

export function isSex(value: unknown): value is 'M' | 'F' {
  const raw = normalizeCell(value);
  return raw === 'M' || raw === 'F';
}

export function isOldOrNew(value: unknown): value is 'O' | 'N' {
  const raw = normalizeCell(value);
  return raw === 'O' || raw === 'N';
}

// Row type detection
const SECTION_PATTERNS = [
  /^BABY CLASS/i,
  /^MIDDLE CLASS/i,
  /^RECEPTION$/i,
  /^GRADE\s*\d+/i,
];

const HEADER_LABELS = new Set([
  'paid in full',
  'with balance',
  'not paid',
  'total enrolled',
  'full name of pupil',
  'sex',
  'old or new',
  'total schl fees',
  'amount',
  'date',
  'rct no.',
]);

export function isRealPupilName(value: unknown): boolean {
  const name = String(value ?? '').trim();

  if (!name) return false;
  if (name === '-' || name === '—') return false;

  const blocked = new Set([
    'PAID IN FULL',
    'WITH BALANCE',
    'NOT PAID',
    'TOTAL ENROLLED',
    'TOTAL PAID',
    'FULL NAME OF PUPIL',
    'SEX',
    'OLD OR NEW',
    'TOTAL SCHL FEES',
    'AMOUNT',
    'DATE',
    'RCT NO.'
  ]);

  if (blocked.has(name.toUpperCase())) return false;

  // require letters and at least 2 words for a pupil name
  const hasLetters = /[A-Za-z]/.test(name);
  const wordCount = name.split(/\s+/).filter(Boolean).length;

  return hasLetters && wordCount >= 2;
}

export function classifyRow(row: unknown[]): RowType {
  const cells = row.map(normalizeCell);
  const nonEmpty = cells.filter(Boolean);

  if (nonEmpty.length === 0) return 'blank';

  const joined = nonEmpty.join(' ').toLowerCase();

  // Grand total rows
  if (joined.includes('total paid') || joined.includes('total enrolled')) {
    return 'grand_total';
  }

  // Section headers (class names)
  if (nonEmpty.length === 1 && SECTION_PATTERNS.some((p) => p.test(nonEmpty[0]))) {
    return 'section_header';
  }

  // Column headers
  if (nonEmpty.every((c) => HEADER_LABELS.has(c.toLowerCase()))) {
    return 'header';
  }

  // Check if it's a pupil row
  const fullName = cells[1];
  const sex = cells[2];
  const fee = parseMoney(cells[4]);

  // Must have a real name
  if (!isRealPupilName(fullName)) {
    return 'junk';
  }

  // Must have some indication of being a pupil record
  if ((sex === 'M' || sex === 'F') || fee > 0 || parseMoney(cells[5]) > 0) {
    return 'pupil';
  }

  return 'junk';
}

export function parsePupilRow(
  row: unknown[],
  rowIndex: number,
  className: string
): ParsedPupilFeeRow | null {
  const cells = row.map(normalizeCell);

  const fullName = cells[1]?.trim();
  if (!fullName) return null;

  const lowerName = fullName.toLowerCase();
  if (['paid in full', 'with balance', 'not paid', 'total enrolled', 'total paid'].includes(lowerName)) {
    return null;
  }

  const totalSchoolFees = parseMoney(cells[4]);
  const firstInstallmentAmount = parseMoney(cells[5]);
  const secondInstallmentAmount = parseMoney(cells[8]);
  const thirdInstallmentAmount = parseMoney(cells[11]);

  const totalPaid = firstInstallmentAmount + secondInstallmentAmount + thirdInstallmentAmount;
  const computedBalance = totalSchoolFees - totalPaid;

  let paymentStatus: ParsedPupilFeeRow['paymentStatus'] = 'not_paid';
  if (computedBalance < 0) {
    paymentStatus = 'overpaid';
  } else if (computedBalance === 0 && totalSchoolFees > 0) {
    paymentStatus = 'paid_in_full';
  } else if (totalPaid > 0 && computedBalance > 0) {
    paymentStatus = 'with_balance';
  }

  return {
    rowIndex,
    className,
    fullName,
    sex: isSex(cells[2]) ? cells[2] : null,
    oldOrNew: isOldOrNew(cells[3]) ? cells[3] : null,
    totalSchoolFees,
    firstInstallmentAmount,
    firstInstallmentDate: parseOptionalText(cells[6]),
    firstInstallmentReceiptNo: parseOptionalText(cells[7]),
    secondInstallmentAmount,
    secondInstallmentDate: parseOptionalText(cells[9]),
    secondInstallmentReceiptNo: parseOptionalText(cells[10]),
    thirdInstallmentAmount,
    thirdInstallmentDate: parseOptionalText(cells[12]),
    thirdInstallmentReceiptNo: parseOptionalText(cells[13]),
    totalPaid,
    computedBalance,
    paymentStatus,
  };
}

export type ParsedSheetResult = {
  pupils: ParsedPupilFeeRow[];
};

export function parseSchoolReconciliationSheet(sheet: XLSX.WorkSheet): ParsedSheetResult {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  console.log(`School reconciliation sheet has ${rows.length} rows`);

  const pupils: ParsedPupilFeeRow[] = [];
  let currentClassName = '';

  rows.forEach((row, index) => {
    const rowType = classifyRow(row);

    // Debug first few rows
    if (index < 15) {
      console.log(`Row ${index} (${rowType}):`, row.slice(0, 8));
    }

    if (rowType === 'section_header') {
      // Extract class name from header
      const className = row.find(cell => 
        normalizeCell(cell).includes('CLASS') || 
        normalizeCell(cell).includes('GRADE') || 
        normalizeCell(cell).includes('RECEPTION') ||
        normalizeCell(cell).includes('BABY') ||
        normalizeCell(cell).includes('MIDDLE')
      );
      currentClassName = className ? normalizeCell(className) : '';
      console.log(`Section header: ${currentClassName}`);
      return;
    }

    if (rowType === 'pupil') {
      const parsed = parsePupilRow(row, index, currentClassName);
      if (!parsed) return;

      // Final safety: skip rows with no fee and no payments and no plausible name
      const looksReal =
        parsed.fullName.length > 1 &&
        (parsed.totalSchoolFees > 0 || parsed.totalPaid > 0 || parsed.sex !== null);

      if (!looksReal) return;

      pupils.push(parsed);
    }
    // Ignore all other row types: subtotal, grand_total, header, blank, junk
  });

  console.log(`Parsed ${pupils.length} valid pupil rows`);

  // Debug: Show distribution
  const statusCount = pupils.reduce((acc, p) => {
    acc[p.paymentStatus] = (acc[p.paymentStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log('Payment status distribution:', statusCount);

  // Debug: Show sample
  if (pupils.length > 0) {
    console.log('Sample parsed pupil:', pupils[0]);
  }

  return { pupils };
}

export type DashboardMetrics = {
  totalPupils: number;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  paidInFullCount: number;
  withBalanceCount: number;
  notPaidCount: number;
  overpaidCount: number;
  collectionRate: number;
};

export function computeDashboardMetrics(pupils: ParsedPupilFeeRow[]): DashboardMetrics {
  const totalPupils = pupils.length;

  const totalExpected = pupils.reduce((sum, p) => sum + p.totalSchoolFees, 0);
  const totalCollected = pupils.reduce((sum, p) => sum + p.totalPaid, 0);
  const totalOutstanding = pupils
    .map(p => Math.max(p.computedBalance, 0))
    .reduce((sum, balance) => sum + balance, 0);

  const paidInFullCount = pupils.filter((p) => p.paymentStatus === 'paid_in_full').length;
  const withBalanceCount = pupils.filter((p) => p.paymentStatus === 'with_balance').length;
  const notPaidCount = pupils.filter((p) => p.paymentStatus === 'not_paid').length;
  const overpaidCount = pupils.filter((p) => p.paymentStatus === 'overpaid').length;

  const collectionRate =
    totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

  const metrics = {
    totalPupils,
    totalExpected,
    totalCollected,
    totalOutstanding,
    paidInFullCount,
    withBalanceCount,
    notPaidCount,
    overpaidCount,
    collectionRate,
  };

  console.log('Dashboard metrics calculated:', metrics);
  return metrics;
}
