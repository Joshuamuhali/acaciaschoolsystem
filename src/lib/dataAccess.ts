// Data Access Layer - Unified Interface
export type DataSource = 'excel' | 'supabase';

// Current data source configuration
export let currentDataSource: DataSource = 'excel'; // Default to Excel for MVP

// Interface definitions for data operations
export interface PupilData {
  id: string;
  full_name: string;
  sex: string;
  grade_id?: string | null;
  status: string;
  phone?: string | null;
  address?: string | null;
  school_id: number;
}

export interface GradeData {
  id: string;
  grade_name: string;
  section?: string | null;
  capacity?: number | null;
  teacher_name?: string | null;
  room_number?: string | null;
  school_id: number;
}

export interface PaymentData {
  id: string;
  pupil_id: string;
  amount: number;
  status: string;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  term: string;
  school_id: number;
}

export interface ParentData {
  id: string;
  full_name: string;
  phone: string;
  school_id: number;
}

export interface EnrollmentData {
  id: number;
  pupil_id: string;
  term_id: string;
  grade_id: string | null;
  status: string;
  school_fees_expected: number;
  school_fees_paid: number;
  school_id: number;
}

// Data Access Interface
export interface DataAccessInterface {
  // Pupils
  getPupils(): Promise<PupilData[]>;
  getPupil(id: string): Promise<PupilData | null>;
  createPupil(pupil: Omit<PupilData, 'id'>): Promise<PupilData>;
  updatePupil(id: string, pupil: Partial<PupilData>): Promise<PupilData>;
  deletePupil(id: string): Promise<boolean>;

  // Grades
  getGrades(): Promise<GradeData[]>;
  getGrade(id: string): Promise<GradeData | null>;
  createGrade(grade: Omit<GradeData, 'id'>): Promise<GradeData>;
  updateGrade(id: string, grade: Partial<GradeData>): Promise<GradeData>;
  deleteGrade(id: string): Promise<boolean>;

  // Payments
  getPayments(): Promise<PaymentData[]>;
  getPaymentsByPupil(pupilId: string): Promise<PaymentData[]>;
  createPayment(payment: Omit<PaymentData, 'id'>): Promise<PaymentData>;
  updatePayment(id: string, payment: Partial<PaymentData>): Promise<PaymentData>;

  // Parents
  getParents(): Promise<ParentData[]>;
  getParent(id: string): Promise<ParentData | null>;
  createParent(parent: Omit<ParentData, 'id'>): Promise<ParentData>;
  updateParent(id: string, parent: Partial<ParentData>): Promise<ParentData>;

  // Enrollments
  getEnrollments(): Promise<EnrollmentData[]>;
  getEnrollmentsByPupil(pupilId: string): Promise<EnrollmentData[]>;
  createEnrollment(enrollment: Omit<EnrollmentData, 'id'>): Promise<EnrollmentData>;
}

// Excel Data Provider
class ExcelDataProvider implements DataAccessInterface {
  private excelData: any = {};

  constructor() {
    this.loadExcelData();
  }

  private async loadExcelData() {
    try {
      // Load reconciliation data from public folder
      const response = await fetch('/SCHOOL RECONCILIATION 2025.xlsx');
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Read the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        // Convert to object format
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        this.excelData = rows.map((row, index) => {
          const obj: any = { _rowNumber: index + 2 };
          headers.forEach((header, colIndex) => {
            obj[header] = row[colIndex] || '';
          });
          return obj;
        }).filter(row => Object.values(row).some(value => value !== ''));
      }
    } catch (error) {
      console.error('Failed to load Excel data:', error);
      this.excelData = [];
    }
  }

  async getPupils(): Promise<PupilData[]> {
    // Filter Excel data for pupil records and transform
    return this.excelData
      .filter((row: any) => row.full_name || row.student_name || row.pupil_name)
      .map((row: any, index: number) => ({
        id: `excel-pupil-${index}`,
        full_name: row.full_name || row.student_name || row.pupil_name || '',
        sex: row.sex || '',
        grade_id: row.grade ? `excel-grade-${row.grade}` : null,
        status: row.status || 'Active',
        phone: row.phone || null,
        address: row.address || null,
        school_id: 1
      }));
  }

  async getPupil(id: string): Promise<PupilData | null> {
    const pupils = await this.getPupils();
    return pupils.find(p => p.id === id) || null;
  }

  async createPupil(pupil: Omit<PupilData, 'id'>): Promise<PupilData> {
    // For Excel provider, this would add to in-memory data
    // In real implementation, you might want to show a message that Excel is read-only
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }

  async updatePupil(id: string, pupil: Partial<PupilData>): Promise<PupilData> {
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }

  async deletePupil(id: string): Promise<boolean> {
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }

  async getGrades(): Promise<GradeData[]> {
    // Extract unique grades from Excel data
    const uniqueGrades = new Map();
    this.excelData.forEach((row: any) => {
      if (row.grade || row.grade_name) {
        const gradeName = row.grade || row.grade_name;
        if (!uniqueGrades.has(gradeName)) {
          uniqueGrades.set(gradeName, {
            id: `excel-grade-${gradeName}`,
            grade_name: gradeName,
            section: row.section || null,
            capacity: row.capacity ? parseInt(row.capacity) : null,
            teacher_name: row.teacher_name || null,
            room_number: row.room_number || null,
            school_id: 1
          });
        }
      }
    });
    return Array.from(uniqueGrades.values());
  }

  async getGrade(id: string): Promise<GradeData | null> {
    const grades = await this.getGrades();
    return grades.find(g => g.id === id) || null;
  }

  async createGrade(grade: Omit<GradeData, 'id'>): Promise<GradeData> {
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }

  async updateGrade(id: string, grade: Partial<GradeData>): Promise<GradeData> {
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }

  async deleteGrade(id: string): Promise<boolean> {
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }

  async getPayments(): Promise<PaymentData[]> {
    return this.excelData
      .filter((row: any) => row.amount || row.payment)
      .map((row: any, index: number) => ({
        id: `excel-payment-${index}`,
        pupil_id: `excel-pupil-${row.pupil_name || row.student_name || ''}`,
        amount: parseFloat(row.amount || row.payment || '0'),
        status: row.status || 'posted',
        payment_date: row.payment_date || new Date().toISOString(),
        payment_method: row.payment_method || 'Cash',
        receipt_number: row.receipt_number || `EXCEL-${index}`,
        term: row.term || 'Current',
        school_id: 1
      }));
  }

  async getPaymentsByPupil(pupilId: string): Promise<PaymentData[]> {
    const payments = await this.getPayments();
    return payments.filter(p => p.pupil_id === pupilId);
  }

  async createPayment(payment: Omit<PaymentData, 'id'>): Promise<PaymentData> {
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }

  async updatePayment(id: string, payment: Partial<PaymentData>): Promise<PaymentData> {
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }

  async getParents(): Promise<ParentData[]> {
    return this.excelData
      .filter((row: any) => row.parent_name || row.guardian)
      .map((row: any, index: number) => ({
        id: `excel-parent-${index}`,
        full_name: row.parent_name || row.guardian || '',
        phone: row.parent_phone || row.phone || '',
        school_id: 1
      }));
  }

  async getParent(id: string): Promise<ParentData | null> {
    const parents = await this.getParents();
    return parents.find(p => p.id === id) || null;
  }

  async createParent(parent: Omit<ParentData, 'id'>): Promise<ParentData> {
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }

  async updateParent(id: string, parent: Partial<ParentData>): Promise<ParentData> {
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }

  async getEnrollments(): Promise<EnrollmentData[]> {
    return this.excelData
      .filter((row: any) => row.pupil_name || row.student_name)
      .map((row: any, index: number) => ({
        id: index + 1,
        pupil_id: `excel-pupil-${row.pupil_name || row.student_name || ''}`,
        term_id: `excel-term-${row.term || 'Current'}`,
        grade_id: row.grade ? `excel-grade-${row.grade}` : null,
        status: row.status || 'Active',
        school_fees_expected: 2400, // Default ZMW 2400
        school_fees_paid: parseFloat(row.amount || '0'),
        school_id: 1
      }));
  }

  async getEnrollmentsByPupil(pupilId: string): Promise<EnrollmentData[]> {
    const enrollments = await this.getEnrollments();
    return enrollments.filter(e => e.pupil_id === pupilId);
  }

  async createEnrollment(enrollment: Omit<EnrollmentData, 'id'>): Promise<EnrollmentData> {
    throw new Error('Excel provider is read-only. Use Supabase provider for write operations.');
  }
}

// Supabase Data Provider
class SupabaseDataProvider implements DataAccessInterface {
  private supabase: any;

  constructor() {
    // Import supabase dynamically to avoid circular dependencies
    import('../lib/supabase').then(({ supabase }) => {
      this.supabase = supabase;
    });
  }

  async getPupils(): Promise<PupilData[]> {
    const { data, error } = await this.supabase
      .from('pupils')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async getPupil(id: string): Promise<PupilData | null> {
    const { data, error } = await this.supabase
      .from('pupils')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createPupil(pupil: Omit<PupilData, 'id'>): Promise<PupilData> {
    const { data, error } = await this.supabase
      .from('pupils')
      .insert(pupil)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updatePupil(id: string, pupil: Partial<PupilData>): Promise<PupilData> {
    const { data, error } = await this.supabase
      .from('pupils')
      .update(pupil)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deletePupil(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('pupils')
      .delete()
      .eq('id', id);
    
    return !error;
  }

  async getGrades(): Promise<GradeData[]> {
    const { data, error } = await this.supabase
      .from('grades')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async getGrade(id: string): Promise<GradeData | null> {
    const { data, error } = await this.supabase
      .from('grades')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createGrade(grade: Omit<GradeData, 'id'>): Promise<GradeData> {
    const { data, error } = await this.supabase
      .from('grades')
      .insert(grade)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateGrade(id: string, grade: Partial<GradeData>): Promise<GradeData> {
    const { data, error } = await this.supabase
      .from('grades')
      .update(grade)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteGrade(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('grades')
      .delete()
      .eq('id', id);
    
    return !error;
  }

  async getPayments(): Promise<PaymentData[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async getPaymentsByPupil(pupilId: string): Promise<PaymentData[]> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('pupil_id', pupilId);
    
    if (error) throw error;
    return data || [];
  }

  async createPayment(payment: Omit<PaymentData, 'id'>): Promise<PaymentData> {
    const { data, error } = await this.supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updatePayment(id: string, payment: Partial<PaymentData>): Promise<PaymentData> {
    const { data, error } = await this.supabase
      .from('payments')
      .update(payment)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getParents(): Promise<ParentData[]> {
    const { data, error } = await this.supabase
      .from('parents')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async getParent(id: string): Promise<ParentData | null> {
    const { data, error } = await this.supabase
      .from('parents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createParent(parent: Omit<ParentData, 'id'>): Promise<ParentData> {
    const { data, error } = await this.supabase
      .from('parents')
      .insert(parent)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateParent(id: string, parent: Partial<ParentData>): Promise<ParentData> {
    const { data, error } = await this.supabase
      .from('parents')
      .update(parent)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getEnrollments(): Promise<EnrollmentData[]> {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select('*');
    
    if (error) throw error;
    return data || [];
  }

  async getEnrollmentsByPupil(pupilId: string): Promise<EnrollmentData[]> {
    const { data, error } = await this.supabase
      .from('enrollments')
      .select('*')
      .eq('pupil_id', pupilId);
    
    if (error) throw error;
    return data || [];
  }

  async createEnrollment(enrollment: Omit<EnrollmentData, 'id'>): Promise<EnrollmentData> {
    const { data, error } = await this.supabase
      .from('enrollments')
      .insert(enrollment)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}

// Data Access Layer Factory
export class DataAccessLayer {
  private static instance: DataAccessLayer;
  private excelProvider: ExcelDataProvider;
  private supabaseProvider: SupabaseDataProvider;

  private constructor() {
    this.excelProvider = new ExcelDataProvider();
    this.supabaseProvider = new SupabaseDataProvider();
  }

  static getInstance(): DataAccessLayer {
    if (!DataAccessLayer.instance) {
      DataAccessLayer.instance = new DataAccessLayer();
    }
    return DataAccessLayer.instance;
  }

  private getCurrentProvider(): DataAccessInterface {
    switch (currentDataSource) {
      case 'excel':
        return this.excelProvider;
      case 'supabase':
        return this.supabaseProvider;
      default:
        return this.excelProvider;
    }
  }

  // Public API methods
  async getPupils(): Promise<PupilData[]> {
    return this.getCurrentProvider().getPupils();
  }

  async getPupil(id: string): Promise<PupilData | null> {
    return this.getCurrentProvider().getPupil(id);
  }

  async createPupil(pupil: Omit<PupilData, 'id'>): Promise<PupilData> {
    return this.getCurrentProvider().createPupil(pupil);
  }

  async updatePupil(id: string, pupil: Partial<PupilData>): Promise<PupilData> {
    return this.getCurrentProvider().updatePupil(id, pupil);
  }

  async deletePupil(id: string): Promise<boolean> {
    return this.getCurrentProvider().deletePupil(id);
  }

  async getGrades(): Promise<GradeData[]> {
    return this.getCurrentProvider().getGrades();
  }

  async getGrade(id: string): Promise<GradeData | null> {
    return this.getCurrentProvider().getGrade(id);
  }

  async createGrade(grade: Omit<GradeData, 'id'>): Promise<GradeData> {
    return this.getCurrentProvider().createGrade(grade);
  }

  async updateGrade(id: string, grade: Partial<GradeData>): Promise<GradeData> {
    return this.getCurrentProvider().updateGrade(id, grade);
  }

  async deleteGrade(id: string): Promise<boolean> {
    return this.getCurrentProvider().deleteGrade(id);
  }

  async getPayments(): Promise<PaymentData[]> {
    return this.getCurrentProvider().getPayments();
  }

  async getPaymentsByPupil(pupilId: string): Promise<PaymentData[]> {
    return this.getCurrentProvider().getPaymentsByPupil(pupilId);
  }

  async createPayment(payment: Omit<PaymentData, 'id'>): Promise<PaymentData> {
    return this.getCurrentProvider().createPayment(payment);
  }

  async updatePayment(id: string, payment: Partial<PaymentData>): Promise<PaymentData> {
    return this.getCurrentProvider().updatePayment(id, payment);
  }

  async getParents(): Promise<ParentData[]> {
    return this.getCurrentProvider().getParents();
  }

  async getParent(id: string): Promise<ParentData | null> {
    return this.getCurrentProvider().getParent(id);
  }

  async createParent(parent: Omit<ParentData, 'id'>): Promise<ParentData> {
    return this.getCurrentProvider().createParent(parent);
  }

  async updateParent(id: string, parent: Partial<ParentData>): Promise<ParentData> {
    return this.getCurrentProvider().updateParent(id, parent);
  }

  async getEnrollments(): Promise<EnrollmentData[]> {
    return this.getCurrentProvider().getEnrollments();
  }

  async getEnrollmentsByPupil(pupilId: string): Promise<EnrollmentData[]> {
    return this.getCurrentProvider().getEnrollmentsByPupil(pupilId);
  }

  async createEnrollment(enrollment: Omit<EnrollmentData, 'id'>): Promise<EnrollmentData> {
    return this.getCurrentProvider().createEnrollment(enrollment);
  }
}

// Export singleton instance
export const dataAccess = DataAccessLayer.getInstance();

// Utility function to switch data source
export function switchDataSource(source: DataSource): void {
  currentDataSource = source;
  console.log(`Data source switched to: ${source}`);
}

// Utility function to get current data source
export function getCurrentDataSource(): DataSource {
  return currentDataSource;
}
