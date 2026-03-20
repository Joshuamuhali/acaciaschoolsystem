// Unified entity types for both data sources
export interface Pupil {
  id: string;
  full_name: string;
  sex: string;
  grade_id: string | null;
  status: string;
  phone?: string | null;
  address?: string | null;
  school_id: number;
  parent_name?: string | null;
  parent_phone?: string | null;
  admission_blocked: boolean;
  created_at: string;
  grades?: Grade;
}

export interface Grade {
  id: string;
  name: string;
  level_order: number;
  section: string | null;
  is_active: boolean;
  capacity?: number | null;
  teacher_name?: string | null;
  room_number?: string | null;
  school_id: number;
  created_at: string;
}

export interface Payment {
  id: string;
  pupil_id: string;
  amount: number;
  status: 'draft' | 'posted' | 'voided';
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  term: string;
  created_by: string;
  posted_at: string | null;
  posted_by: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  school_id: number;
  pupils?: Pupil;
}

export interface Enrollment {
  id: number;
  pupil_id: string;
  term_id: string;
  grade_id: string | null;
  status: string;
  school_fees_expected: number;
  school_fees_paid: number;
  school_fees_outstanding: number;
  school_id: number;
  pupils?: Pupil;
  terms?: Term;
  grades?: Grade;
}

export interface Term {
  id: string;
  name: string | null;
  term_number: number;
  academic_year_id: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  school_id: number;
}

export interface Parent {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  school_id: number;
  pupils?: Pupil[];
}

export interface DashboardStats {
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

export interface GradeCount {
  id: string;
  name: string;
  count: number;
}

export interface PaymentRecord {
  id: string;
  pupil_name: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  term: string;
  status: string;
}

export interface FeeTypeStat {
  name: string;
  expected: number;
  collected: number;
  outstanding: number;
  pupils: number;
}

export interface OtherFeesBreakdown {
  breakdown: Array<{
    fee_type: string;
    total_expected: number;
    total_collected: number;
    total_outstanding: number;
    pupil_count: number;
  }>;
}

export interface TransportStats {
  totalPupils: number;
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  routeBreakdown: Array<{
    route_name: string;
    pupils: number;
    expected: number;
    collected: number;
    outstanding: number;
  }>;
}

// Data source contract interface
export interface IDataSource {
  // Pupils
  getPupils(gradeId?: string): Promise<Pupil[]>;
  getPupil(id: string): Promise<Pupil | null>;
  createPupil(pupil: Omit<Pupil, 'id' | 'created_at' | 'grades'>): Promise<Pupil>;
  updatePupil(id: string, updates: Partial<Pupil>): Promise<Pupil>;
  deletePupil(id: string): Promise<boolean>;

  // Grades
  getGrades(): Promise<Grade[]>;
  getGrade(id: string): Promise<Grade | null>;
  createGrade(grade: Omit<Grade, 'id' | 'created_at'>): Promise<Grade>;
  updateGrade(id: string, updates: Partial<Grade>): Promise<Grade>;
  deleteGrade(id: string): Promise<boolean>;
  getGradeCounts(): Promise<GradeCount[]>;

  // Payments
  getPayments(pupilId?: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | null>;
  createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'pupils'>): Promise<Payment>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment>;
  deletePayment(id: string): Promise<boolean>;
  getInstallments(): Promise<PaymentRecord[]>;

  // Enrollments
  getEnrollments(pupilId?: string): Promise<Enrollment[]>;
  getEnrollment(id: number): Promise<Enrollment | null>;
  createEnrollment(enrollment: Omit<Enrollment, 'id' | 'pupils' | 'terms' | 'grades'>): Promise<Enrollment>;
  updateEnrollment(id: number, updates: Partial<Enrollment>): Promise<Enrollment>;
  deleteEnrollment(id: number): Promise<boolean>;

  // Terms
  getTerms(): Promise<Term[]>;
  getTerm(id: string): Promise<Term | null>;
  createTerm(term: Omit<Term, 'id'>): Promise<Term>;
  updateTerm(id: string, updates: Partial<Term>): Promise<Term>;
  deleteTerm(id: string): Promise<boolean>;

  // Parents
  getParents(): Promise<Parent[]>;
  getParent(id: string): Promise<Parent | null>;
  createParent(parent: Omit<Parent, 'id' | 'pupils'>): Promise<Parent>;
  updateParent(id: string, updates: Partial<Parent>): Promise<Parent>;
  deleteParent(id: string): Promise<boolean>;

  // Dashboard Stats
  getDashboardStats(): Promise<DashboardStats>;
  getOtherFeesBreakdown(): Promise<OtherFeesBreakdown>;
  getFeeTypeStats(feeType?: string): Promise<FeeTypeStat[]>;
  getFeeTypeNames(): Promise<string[]>;
  getTransportStats(): Promise<TransportStats>;
  getTransportRoutes(): Promise<any[]>;

  // Health check
  healthCheck(): Promise<boolean>;
}

// Error types
export class DataSourceError extends Error {
  constructor(
    message: string,
    public source: 'supabase' | 'excel',
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DataSourceError';
  }
}

export class ExcelFileError extends DataSourceError {
  constructor(message: string, originalError?: Error) {
    super(message, 'excel', originalError);
    this.name = 'ExcelFileError';
  }
}

export class SupabaseError extends DataSourceError {
  constructor(message: string, originalError?: Error) {
    super(message, 'supabase', originalError);
    this.name = 'SupabaseError';
  }
}
