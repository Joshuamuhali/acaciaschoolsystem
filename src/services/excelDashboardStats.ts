// Excel-based Dashboard Stats Service
// This replicates the exact same interface as the Supabase services but reads from Excel

interface DashboardStats {
  totalPupils: number;
  schoolFeesExpected: number;
  schoolFeesCollected: number;
  schoolFeesOutstanding: number;
  otherFeesExpected: number;
  otherFeesCollected: number;
  otherFeesOutstanding: number;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
}

interface GradeCount {
  id: string;
  name: string;
  count: number;
}

interface PaymentRecord {
  id: string;
  pupil_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  term: string;
  status: string;
}

interface FeeTypeStat {
  name: string;
  expected: number;
  collected: number;
  outstanding: number;
  pupils: number;
}

interface OtherFeesBreakdown {
  breakdown: Array<{
    fee_type: string;
    total_expected: number;
    total_collected: number;
    total_outstanding: number;
    pupil_count: number;
  }>;
}

// Excel data cache
let excelDataCache: any[] = [];
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Load Excel data with caching
const loadExcelData = async (): Promise<any[]> => {
  const now = Date.now();
  if (excelDataCache.length > 0 && (now - lastCacheTime) < CACHE_DURATION) {
    return excelDataCache;
  }

  try {
    const response = await fetch('/SCHOOL RECONCILIATION 2025.xlsx');
    if (!response.ok) {
      throw new Error('Failed to load Excel file');
    }

    const arrayBuffer = await response.arrayBuffer();
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (jsonData.length === 0) {
      return [];
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1) as any[][];

    const data = rows.map((row, index) => {
      const obj: any = { _rowNumber: index + 2 };
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex] || '';
      });
      return obj;
    }).filter(row => Object.values(row).some(value => value !== '' && value !== null && value !== undefined));

    excelDataCache = data;
    lastCacheTime = now;
    return data;
  } catch (error) {
    console.error('Error loading Excel data:', error);
    return [];
  }
};

// Helper functions to extract data from Excel rows
const extractTermValue = (row: any): string => {
  const termColumns = ['term', 'term_name', 'academic_term', 'term_id', 'period', 'academic_period'];
  
  for (const col of termColumns) {
    if (row[col] && typeof row[col] === 'string') {
      return row[col];
    }
  }
  
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string' && 
        (value.toLowerCase().includes('term') || 
         value.toLowerCase().includes('2026'))) {
      return value;
    }
  }
  
  return '';
};

const extractPupilName = (row: any): string => {
  const nameColumns = ['pupil_name', 'student_name', 'name', 'full_name', 'pupil'];
  for (const col of nameColumns) {
    if (row[col]) return row[col];
  }
  return '';
};

const extractAmount = (row: any): number => {
  const amountColumns = ['amount', 'fee', 'payment', 'total', 'balance', 'school_fees'];
  for (const col of amountColumns) {
    if (row[col]) {
      const num = parseFloat(row[col].toString().replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) return num;
    }
  }
  return 0;
};

const extractGrade = (row: any): string => {
  const gradeColumns = ['grade', 'grade_name', 'class', 'section'];
  for (const col of gradeColumns) {
    if (row[col]) return row[col];
  }
  return '';
};

const extractPaymentMethod = (row: any): string => {
  const methodColumns = ['payment_method', 'method', 'payment_type'];
  for (const col of methodColumns) {
    if (row[col]) return row[col];
  }
  return '';
};

const extractStatus = (row: any): string => {
  const statusColumns = ['status', 'payment_status', 'state'];
  for (const col of statusColumns) {
    if (row[col]) return row[col];
  }
  return 'posted';
};

// Filter for Term 1 2026 data
const getTerm1Data = async (): Promise<any[]> => {
  const allData = await loadExcelData();
  return allData.filter(row => {
    const termValue = extractTermValue(row);
    return termValue && (
      termValue.toLowerCase().includes('term 1') || 
      termValue.toLowerCase().includes('2026')
    );
  });
};

// Main dashboard stats function - matches exact interface of getAccurateDashboardStats
export const getAccurateDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const term1Data = await getTerm1Data();
    
    // Get unique pupils
    const uniquePupils = new Set<string>();
    term1Data.forEach(row => {
      const pupilName = extractPupilName(row);
      if (pupilName) uniquePupils.add(pupilName);
    });

    // Calculate school fees (assuming ZMW 2400 per pupil as standard)
    const standardSchoolFee = 2400;
    const totalPupils = uniquePupils.size;
    const schoolFeesExpected = totalPupils * standardSchoolFee;
    
    // Calculate actual school fees collected from payments
    const schoolFeesCollected = term1Data.reduce((sum, row) => {
      const amount = extractAmount(row);
      return sum + amount;
    }, 0);

    const schoolFeesOutstanding = schoolFeesExpected - schoolFeesCollected;

    // For now, other fees are not tracked in Excel (would need separate columns)
    const otherFeesExpected = 0;
    const otherFeesCollected = 0;
    const otherFeesOutstanding = 0;

    return {
      totalPupils,
      schoolFeesExpected,
      schoolFeesCollected,
      schoolFeesOutstanding,
      otherFeesExpected,
      otherFeesCollected,
      otherFeesOutstanding,
      totalExpected: schoolFeesExpected + otherFeesExpected,
      totalCollected: schoolFeesCollected + otherFeesCollected,
      totalOutstanding: schoolFeesOutstanding + otherFeesOutstanding
    };
  } catch (error) {
    console.error('Error getting Excel dashboard stats:', error);
    return {
      totalPupils: 0,
      schoolFeesExpected: 0,
      schoolFeesCollected: 0,
      schoolFeesOutstanding: 0,
      otherFeesExpected: 0,
      otherFeesCollected: 0,
      otherFeesOutstanding: 0,
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0
    };
  }
};

// Grade counts function - matches exact interface of getGradeCounts
export const getGradeCounts = async (): Promise<GradeCount[]> => {
  try {
    const term1Data = await getTerm1Data();
    const gradeMap = new Map<string, Set<string>>();

    // Count unique pupils per grade
    term1Data.forEach(row => {
      const pupilName = extractPupilName(row);
      const grade = extractGrade(row);
      
      if (pupilName && grade) {
        if (!gradeMap.has(grade)) {
          gradeMap.set(grade, new Set());
        }
        gradeMap.get(grade)!.add(pupilName);
      }
    });

    // Convert to array format
    const counts: GradeCount[] = [];
    gradeMap.forEach((pupils, grade) => {
      counts.push({
        id: `excel-grade-${grade}`,
        name: grade,
        count: pupils.size
      });
    });

    return counts.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting Excel grade counts:', error);
    return [];
  }
};

// Installments/Payment history - matches interface of getInstallments
export const getInstallments = async (): Promise<PaymentRecord[]> => {
  try {
    const term1Data = await getTerm1Data();
    
    return term1Data.map((row, index) => ({
      id: `excel-payment-${index}`,
      pupil_name: extractPupilName(row),
      amount: extractAmount(row),
      payment_date: row.payment_date || new Date().toISOString().split('T')[0],
      payment_method: extractPaymentMethod(row),
      receipt_number: row.receipt_number || `EXCEL-${index}`,
      term: extractTermValue(row),
      status: extractStatus(row)
    })).filter(record => record.pupil_name && record.amount > 0);
  } catch (error) {
    console.error('Error getting Excel installments:', error);
    return [];
  }
};

// Other fees breakdown - simplified for Excel
export const getOtherFeesBreakdown = async (): Promise<OtherFeesBreakdown> => {
  try {
    // For now, return empty breakdown as Excel doesn't track other fees separately
    // This can be extended if Excel has other fee columns
    return { breakdown: [] };
  } catch (error) {
    console.error('Error getting Excel other fees breakdown:', error);
    return { breakdown: [] };
  }
};

// Fee type stats - simplified for Excel
export const getFeeTypeStats = async (): Promise<FeeTypeStat[]> => {
  try {
    const term1Data = await getTerm1Data();
    
    // Group by payment method as a proxy for fee types
    const methodStats = new Map<string, { count: number; total: number }>();
    
    term1Data.forEach(row => {
      const method = extractPaymentMethod(row);
      const amount = extractAmount(row);
      
      if (method && amount > 0) {
        if (!methodStats.has(method)) {
          methodStats.set(method, { count: 0, total: 0 });
        }
        const stats = methodStats.get(method)!;
        stats.count++;
        stats.total += amount;
      }
    });

    const stats: FeeTypeStat[] = [];
    methodStats.forEach((data, method) => {
      stats.push({
        name: method,
        expected: data.total,
        collected: data.total,
        outstanding: 0,
        pupils: data.count
      });
    });

    return stats;
  } catch (error) {
    console.error('Error getting Excel fee type stats:', error);
    return [];
  }
};

// Additional functions that might be needed
export const getFeeTypeNames = async (): Promise<string[]> => {
  try {
    const stats = await getFeeTypeStats();
    return stats.map(stat => stat.name);
  } catch (error) {
    console.error('Error getting Excel fee type names:', error);
    return [];
  }
};

export const getFeeTypeSummary = async (feeType?: string): Promise<any> => {
  try {
    const stats = await getFeeTypeStats();
    if (feeType && feeType !== 'all') {
      return stats.find(stat => stat.name === feeType) || null;
    }
    return stats;
  } catch (error) {
    console.error('Error getting Excel fee type summary:', error);
    return null;
  }
};

export const getFeeTypePreviewRecords = async (feeType?: string): Promise<any> => {
  try {
    const payments = await getInstallments();
    if (feeType && feeType !== 'all') {
      return payments.filter(payment => payment.payment_method === feeType);
    }
    return payments;
  } catch (error) {
    console.error('Error getting Excel fee type preview records:', error);
    return { records: [], summary: null };
  }
};

// Transport stats (simplified for Excel)
export const getTransportStats = async (): Promise<any> => {
  try {
    // Return empty transport stats for now
    // Can be extended if Excel has transport data
    return {
      totalPupils: 0,
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      routeBreakdown: []
    };
  } catch (error) {
    console.error('Error getting Excel transport stats:', error);
    return {
      totalPupils: 0,
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      routeBreakdown: []
    };
  }
};

export const getTransportRoutes = async (): Promise<any[]> => {
  try {
    // Return empty routes for now
    return [];
  } catch (error) {
    console.error('Error getting Excel transport routes:', error);
    return [];
  }
};

// Clear cache function for testing
export const clearExcelCache = (): void => {
  excelDataCache = [];
  lastCacheTime = 0;
};
