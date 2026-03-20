import * as XLSX from "xlsx";

export type TermPupilRow = {
  rowNumber: number;
  id: number | null;
  fullName: string;
  sex: string;
  oldOrNew: string;
  totalSchoolFees: number;
  firstInstallmentAmount: number;
  firstInstallmentDate: string;
  firstInstallmentReceipt: string;
  secondInstallmentAmount: number;
  secondInstallmentDate: string;
  secondInstallmentReceipt: string;
  thirdInstallmentAmount: number;
  thirdInstallmentDate: string;
  thirdInstallmentReceipt: string;
  balance: number;
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const cleaned = String(value).replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function parseTerm12026Sheet(sheet: XLSX.WorkSheet): TermPupilRow[] {
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  console.log(`Raw sheet has ${rows.length} rows`);
  
  // Debug: Log first few rows to understand structure
  console.log("First 10 rows of raw data:");
  rows.slice(0, 10).forEach((row, idx) => {
    console.log(`Row ${idx}:`, JSON.stringify(row));
  });

  // Actual table starts after summary rows and double header rows
  // In your file, data starts around Excel row 7 (TEDD CHOONGO)
  const candidateRows = rows.slice(7);
  console.log(`Candidate data rows (after header): ${candidateRows.length}`);

  const parsed = candidateRows
    .map((row, index) => {
      const fullName = toText(row[1]);

      if (!fullName) return null;

      // Debug: Log key columns for first few pupils
      if (index < 5) {
        console.log(`Pupil ${index} - Name: "${fullName}"`, {
          col0: row[0],
          col1: row[1], 
          col2: row[2],
          col3: row[3],
          col4: row[4],
          col5: row[5],
          col6: row[6],
          col7: row[7],
          col8: row[8],
          col9: row[9],
          col10: row[10],
          col11: row[11],
          col12: row[12],
          col13: row[13],
          col14: row[14],
          col4asNumber: toNumber(row[4]),
          col5asNumber: toNumber(row[5]),
          col6asNumber: toNumber(row[6]),
          col7asNumber: toNumber(row[7]),
          col8asNumber: toNumber(row[8])
        });
      }

      return {
        rowNumber: index + 7, // Adjusted to start from row 7
        id: row[0] === "" ? null : toNumber(row[0]),
        fullName,
        sex: toText(row[2]),
        oldOrNew: toText(row[3]),
        totalSchoolFees: toNumber(row[4]), // Column 4 should be the 2400 fee
        firstInstallmentAmount: toNumber(row[5]),
        firstInstallmentDate: toText(row[6]),
        firstInstallmentReceipt: toText(row[7]),
        secondInstallmentAmount: toNumber(row[8]),
        secondInstallmentDate: toText(row[9]),
        secondInstallmentReceipt: toText(row[10]),
        thirdInstallmentAmount: toNumber(row[11]),
        thirdInstallmentDate: toText(row[12]),
        thirdInstallmentReceipt: toText(row[13]),
        balance: toNumber(row[14]),
      };
    })
    .filter((row): row is TermPupilRow => row !== null);

  console.log(`Parsed ${parsed.length} valid pupil rows from TERM 1 2026`);
  
  // Debug: Show sample of parsed data
  if (parsed.length > 0) {
    console.log("Sample parsed pupil:", JSON.stringify(parsed[0]));
    const calculation = {
      pupilCount: parsed.length,
      sampleFee: parsed[0].totalSchoolFees,
      expectedTotal: parsed.length * parsed[0].totalSchoolFees
    };
    console.log("Total fees calculation:", JSON.stringify(calculation));
    
    // Also show sum of all fees to verify
    const totalFeesSum = parsed.reduce((sum, p) => sum + p.totalSchoolFees, 0);
    console.log("Actual sum of all fees:", totalFeesSum);
    
    // Debug: Find pupils with fees not equal to 2400
    const unusualFees = parsed.filter(p => p.totalSchoolFees !== 2400);
    if (unusualFees.length > 0) {
      console.log(`Found ${unusualFees.length} pupils with unusual fees:`, unusualFees.slice(0, 5));
    }
    
    // Show fee distribution
    const feeDistribution = parsed.reduce((acc, p) => {
      acc[p.totalSchoolFees] = (acc[p.totalSchoolFees] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    console.log("Fee distribution:", feeDistribution);
  }
  
  return parsed;
}
