import {
  IDataSource,
  Pupil,
  Grade,
  Payment,
  Enrollment,
  Parent,
  DashboardStats,
  GradeCount,
  PaymentRecord,
  OtherFeesBreakdown,
  FeeTypeStat,
  TransportStats,
  ExcelFileError,
  Term
} from './types';
import { loadWorkbook } from "./excel/workbook";
import { parseSchoolReconciliationSheet, computeDashboardMetrics, ParsedPupilFeeRow } from "./excel/schoolReconciliationParser";

const TERM_SHEET_NAME = "TERM 1 2026";

export class ExcelDataSource implements IDataSource {
  private isInitialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;
    await loadWorkbook();
    this.isInitialized = true;
  }

  private async refreshIfNeeded(): Promise<void> {
    await this.ensureInitialized();
  }

  // Pupils - focused on TERM 1 2026 only
  async getPupils(gradeId?: string): Promise<Pupil[]> {
    try {
      const workbook = await loadWorkbook();
      const sheet = workbook.Sheets[TERM_SHEET_NAME];

      if (!sheet) {
        throw new Error(`Sheet not found: ${TERM_SHEET_NAME}`);
      }

      const { pupils } = parseSchoolReconciliationSheet(sheet);

      return pupils.map((row, index) => ({
        id: `${row.className}__${row.fullName}__${row.rowIndex}`,
        full_name: row.fullName,
        sex: row.sex || undefined,
        old_or_new: row.oldOrNew || undefined,
        total_fees: row.totalSchoolFees,
        balance: row.computedBalance,
        payment_status: row.paymentStatus === 'paid_in_full' ? 'paid' : 
                     row.paymentStatus === 'with_balance' ? 'partial' : 
                     row.paymentStatus === 'not_paid' ? 'unpaid' : 'paid',
        grade_id: undefined,
        status: 'active',
        school_id: undefined,
        admission_blocked: false,
        created_at: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("getPupils failed:", error);
      throw new ExcelFileError("Failed to get pupils", error instanceof Error ? error : undefined);
    }
  }

  // Dashboard stats - calculated from TERM 1 2026
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      console.log("Getting dashboard stats from Excel...");

      const workbook = await loadWorkbook();
      const sheet = workbook.Sheets[TERM_SHEET_NAME];

      if (!sheet) {
        throw new Error("TERM 1 2026 sheet not found");
      }

      const { pupils } = parseSchoolReconciliationSheet(sheet);
      const metrics = computeDashboardMetrics(pupils);

      const stats = {
        totalPupils: metrics.totalPupils,
        totalExpected: metrics.totalExpected,
        totalCollected: metrics.totalCollected,
        totalOutstanding: metrics.totalOutstanding,
        schoolFeesExpected: metrics.totalExpected,
        schoolFeesCollected: metrics.totalCollected,
        schoolFeesOutstanding: metrics.totalOutstanding,
        otherFeesExpected: 0,
        otherFeesCollected: 0,
        otherFeesOutstanding: 0,
      };

      console.log("ExcelDataSource returning stats (new parser):", JSON.stringify(stats));
      return stats;
    } catch (error) {
      console.error("getDashboardStats failed:", error);
      throw new ExcelFileError("Failed to get dashboard stats", error instanceof Error ? error : undefined);
    }
  }

  // Get detailed pupil information
  async getPupil(id: string): Promise<Pupil> {
    try {
      const pupils = await this.getPupils();
      const pupil = pupils.find(p => p.id === id);
      
      if (!pupil) {
        throw new Error(`Pupil not found: ${id}`);
      }
      
      return pupil;
    } catch (error) {
      console.error("getPupil failed:", error);
      throw new ExcelFileError("Failed to get pupil", error instanceof Error ? error : undefined);
    }
  }
  async healthCheck(): Promise<boolean> {
    try {
      const workbook = await loadWorkbook();
      return workbook.Sheets[TERM_SHEET_NAME] !== undefined;
    } catch (error) {
      console.error("Excel health check failed:", error);
      return false;
    }
  }

  // Stub implementations for other required methods
  async getGrades(): Promise<Grade[]> {
    return [];
  }

  async getPayments(): Promise<Payment[]> {
    return [];
  }

  async getEnrollments(): Promise<Enrollment[]> {
    return [];
  }

  async getParents(): Promise<Parent[]> {
    return [];
  }

  async getGradeCounts(): Promise<GradeCount[]> {
    return [];
  }

  async getInstallments(): Promise<PaymentRecord[]> {
    return [];
  }

  async getOtherFeesBreakdown(): Promise<OtherFeesBreakdown> {
    return { breakdown: [] };
  }

  async getFeeTypeStats(feeType?: string): Promise<FeeTypeStat[]> {
    return [];
  }

  async getFeeTypeNames(): Promise<string[]> {
    return [];
  }

  async getTransportStats(): Promise<TransportStats> {
    return {
      totalPupils: 0,
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      routeBreakdown: []
    };
  }

  async getTransportRoutes(): Promise<any[]> {
    return [];
  }

  // Terms - stub implementations
  async getTerms(): Promise<Term[]> {
    return [];
  }

  async getTerm(id: string): Promise<Term | null> {
    return null;
  }

  async createTerm(term: Omit<Term, 'id'>): Promise<Term> {
    throw new ExcelFileError("Excel data source is read-only. Cannot create terms.");
  }

  async updateTerm(id: string, updates: Partial<Term>): Promise<Term> {
    throw new ExcelFileError("Excel data source is read-only. Cannot update terms.");
  }

  async deleteTerm(id: string): Promise<boolean> {
    throw new ExcelFileError("Excel data source is read-only. Cannot delete terms.");
  }

  // Read-only methods - throw errors
  async createPupil(data: Partial<Pupil>): Promise<Pupil> {
    throw new ExcelFileError("Excel data source is read-only. Cannot create pupils.");
  }

  async updatePupil(id: string, updates: Partial<Pupil>): Promise<Pupil> {
    throw new ExcelFileError("Excel data source is read-only. Cannot update pupils.");
  }

  async deletePupil(id: string): Promise<boolean> {
    throw new ExcelFileError("Excel data source is read-only. Cannot delete pupils.");
  }

  async createGrade(data: Partial<Grade>): Promise<Grade> {
    throw new ExcelFileError("Excel data source is read-only. Cannot create grades.");
  }

  async updateGrade(id: string, updates: Partial<Grade>): Promise<Grade> {
    throw new ExcelFileError("Excel data source is read-only. Cannot update grades.");
  }

  async deleteGrade(id: string): Promise<boolean> {
    throw new ExcelFileError("Excel data source is read-only. Cannot delete grades.");
  }

  async createPayment(data: Partial<Payment>): Promise<Payment> {
    throw new ExcelFileError("Excel data source is read-only. Cannot create payments.");
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    throw new ExcelFileError("Excel data source is read-only. Cannot update payments.");
  }

  async deletePayment(id: string): Promise<boolean> {
    throw new ExcelFileError("Excel data source is read-only. Cannot delete payments.");
  }

  async createEnrollment(data: Partial<Enrollment>): Promise<Enrollment> {
    throw new ExcelFileError("Excel data source is read-only. Cannot create enrollments.");
  }

  async updateEnrollment(id: number, updates: Partial<Enrollment>): Promise<Enrollment> {
    throw new ExcelFileError("Excel data source is read-only. Cannot update enrollments.");
  }

  async deleteEnrollment(id: number): Promise<boolean> {
    throw new ExcelFileError("Excel data source is read-only. Cannot delete enrollments.");
  }

  async createParent(data: Partial<Parent>): Promise<Parent> {
    throw new ExcelFileError("Excel data source is read-only. Cannot create parents.");
  }

  async updateParent(id: string, updates: Partial<Parent>): Promise<Parent> {
    throw new ExcelFileError("Excel data source is read-only. Cannot update parents.");
  }

  async deleteParent(id: string): Promise<boolean> {
    throw new ExcelFileError("Excel data source is read-only. Cannot delete parents.");
  }

  async getGrade(id: string): Promise<Grade | null> {
    const grades = await this.getGrades();
    return grades.find(g => g.id === id) || null;
  }

  async getPayment(id: string): Promise<Payment | null> {
    const payments = await this.getPayments();
    return payments.find(p => p.id === id) || null;
  }

  async getEnrollment(id: number): Promise<Enrollment | null> {
    const enrollments = await this.getEnrollments();
    return enrollments.find(e => e.id === id) || null;
  }

  async getParent(id: string): Promise<Parent | null> {
    const parents = await this.getParents();
    return parents.find(p => p.id === id) || null;
  }
}
