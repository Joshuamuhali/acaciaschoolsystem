import { 
  Pupil, 
  Grade, 
  Payment, 
  Enrollment, 
  Term, 
  Parent, 
  DashboardStats,
  GradeCount,
  PaymentRecord,
  FeeTypeStat,
  OtherFeesBreakdown,
  TransportStats
} from '../types';
import { ExcelRow } from './sheetReaders';

export class ExcelNormalizer {
  // Helper functions for finding values in Excel rows
  private findValue(row: ExcelRow, possibleKeys: string[]): any {
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return row[key];
      }
    }
    return null;
  }

  private findStringValue(row: ExcelRow, possibleKeys: string[]): string {
    const value = this.findValue(row, possibleKeys);
    return value ? value.toString().trim() : '';
  }

  private findNumberValue(row: ExcelRow, possibleKeys: string[]): number {
    const value = this.findValue(row, possibleKeys);
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    const num = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
  }

  private findDateValue(row: ExcelRow, possibleKeys: string[]): string {
    const value = this.findValue(row, possibleKeys);
    if (!value) return '';
    
    // If it's already a date string, return it
    const dateStr = value.toString();
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dateStr;
    }
    
    // Try to parse Excel date number
    const dateNum = parseFloat(dateStr);
    if (!isNaN(dateNum)) {
      const date = new Date((dateNum - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    return dateStr;
  }

  // Entity normalizers
  normalizePupil(row: ExcelRow, index: number): Pupil {
    return {
      id: `excel-pupil-${index}`,
      full_name: this.findStringValue(row, ['pupil_name', 'student_name', 'name', 'full_name']),
      sex: this.findStringValue(row, ['sex', 'gender']),
      grade_id: this.findStringValue(row, ['grade', 'grade_name', 'class']) || null,
      status: this.findStringValue(row, ['status', 'enrollment_status']) || 'Active',
      phone: this.findStringValue(row, ['phone', 'telephone', 'contact']) || null,
      address: this.findStringValue(row, ['address', 'residence']) || null,
      school_id: 1,
      parent_name: this.findStringValue(row, ['parent_name', 'guardian_name', 'parent']) || null,
      parent_phone: this.findStringValue(row, ['parent_phone', 'guardian_phone']) || null,
      admission_blocked: false,
      created_at: new Date().toISOString()
    };
  }

  normalizeGrade(row: ExcelRow, index: number): Grade {
    return {
      id: `excel-grade-${index}`,
      name: this.findStringValue(row, ['grade', 'grade_name', 'class', 'section']),
      level_order: index + 1,
      section: this.findStringValue(row, ['section', 'division']) || null,
      is_active: true,
      capacity: this.findNumberValue(row, ['capacity', 'max_students']) || null,
      teacher_name: this.findStringValue(row, ['teacher_name', 'class_teacher']) || null,
      room_number: this.findStringValue(row, ['room_number', 'classroom']) || null,
      school_id: 1,
      created_at: new Date().toISOString()
    };
  }

  normalizePayment(row: ExcelRow, index: number): Payment {
    return {
      id: `excel-payment-${index}`,
      pupil_id: `excel-pupil-${this.findStringValue(row, ['pupil_name', 'student_name'])}`,
      amount: this.findNumberValue(row, ['amount', 'payment', 'fee', 'total']),
      status: 'posted',
      payment_date: this.findDateValue(row, ['payment_date', 'date', 'transaction_date']),
      payment_method: this.findStringValue(row, ['payment_method', 'method', 'payment_type']),
      receipt_number: this.findStringValue(row, ['receipt_number', 'receipt', 'reference']) || `EXCEL-${index}`,
      term: this.findStringValue(row, ['term', 'term_name', 'academic_term']) || 'Current',
      created_by: 'Excel Import',
      posted_at: new Date().toISOString(),
      posted_by: 'Excel Import',
      voided_at: null,
      voided_by: null,
      void_reason: null,
      school_id: 1
    };
  }

  normalizeEnrollment(row: ExcelRow, index: number): Enrollment {
    const standardSchoolFee = 2400; // Default ZMW 2400 per pupil
    const amountPaid = this.findNumberValue(row, ['amount', 'payment', 'school_fees_paid']);
    
    return {
      id: index + 1,
      pupil_id: `excel-pupil-${this.findStringValue(row, ['pupil_name', 'student_name'])}`,
      term_id: `excel-term-${this.findStringValue(row, ['term', 'term_name'])}`,
      grade_id: this.findStringValue(row, ['grade', 'grade_name']) || null,
      status: this.findStringValue(row, ['status', 'enrollment_status']) || 'Active',
      school_fees_expected: standardSchoolFee,
      school_fees_paid: amountPaid,
      school_fees_outstanding: standardSchoolFee - amountPaid,
      school_id: 1
    };
  }

  normalizeTerm(row: ExcelRow, index: number): Term {
    return {
      id: `excel-term-${index}`,
      name: this.findStringValue(row, ['term', 'term_name', 'academic_term']),
      term_number: this.findNumberValue(row, ['term_number', 'term_id']) || 1,
      academic_year_id: 2026,
      is_active: true,
      start_date: this.findDateValue(row, ['start_date', 'term_start']),
      end_date: this.findDateValue(row, ['end_date', 'term_end']),
      school_id: 1
    };
  }

  normalizeParent(row: ExcelRow, index: number): Parent {
    return {
      id: `excel-parent-${index}`,
      full_name: this.findStringValue(row, ['parent_name', 'guardian_name', 'father_name', 'mother_name']),
      phone: this.findStringValue(row, ['parent_phone', 'guardian_phone', 'contact_phone']),
      email: this.findStringValue(row, ['email', 'parent_email']) || null,
      address: this.findStringValue(row, ['address', 'parent_address']) || null,
      school_id: 1
    };
  }

  normalizeDashboardStats(pupils: Pupil[], enrollments: Enrollment[], payments: Payment[]): DashboardStats {
    const totalPupils = pupils.length;
    const standardSchoolFee = 2400;
    const schoolFeesExpected = totalPupils * standardSchoolFee;
    const schoolFeesCollected = enrollments.reduce((sum, enrollment) => sum + enrollment.school_fees_paid, 0);
    const schoolFeesOutstanding = schoolFeesExpected - schoolFeesCollected;

    return {
      totalPupils,
      schoolFeesExpected,
      schoolFeesCollected,
      schoolFeesOutstanding,
      otherFeesExpected: 0, // Excel doesn't track other fees separately
      otherFeesCollected: 0,
      otherFeesOutstanding: 0,
      totalExpected: schoolFeesExpected,
      totalCollected: schoolFeesCollected,
      totalOutstanding: schoolFeesOutstanding
    };
  }

  normalizeGradeCounts(pupils: Pupil[], grades: Grade[]): GradeCount[] {
    const gradeMap = new Map<string, Set<string>>();

    pupils.forEach(pupil => {
      if (pupil.grade_id) {
        if (!gradeMap.has(pupil.grade_id)) {
          gradeMap.set(pupil.grade_id, new Set());
        }
        gradeMap.get(pupil.grade_id)!.add(pupil.id);
      }
    });

    const counts: GradeCount[] = [];
    gradeMap.forEach((pupilSet, gradeId) => {
      const grade = grades.find(g => g.id === gradeId);
      if (grade) {
        counts.push({
          id: grade.id,
          name: grade.name,
          count: pupilSet.size
        });
      }
    });

    return counts.sort((a, b) => a.name.localeCompare(b.name));
  }

  normalizePaymentRecords(payments: Payment[]): PaymentRecord[] {
    return payments.map(payment => ({
      id: payment.id,
      pupil_name: payment.pupils?.full_name || 'Unknown',
      amount: payment.amount,
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      receipt_number: payment.receipt_number,
      term: payment.term,
      status: payment.status
    }));
  }

  normalizeFeeTypeStats(payments: Payment[]): FeeTypeStat[] {
    const methodStats = new Map<string, { count: number; total: number }>();
    
    payments.forEach(payment => {
      const method = payment.payment_method;
      if (!methodStats.has(method)) {
        methodStats.set(method, { count: 0, total: 0 });
      }
      const stats = methodStats.get(method)!;
      stats.count++;
      stats.total += payment.amount;
    });

    return Array.from(methodStats.entries()).map(([method, stats]) => ({
      name: method,
      expected: stats.total,
      collected: stats.total,
      outstanding: 0,
      pupils: stats.count
    }));
  }

  normalizeOtherFeesBreakdown(): OtherFeesBreakdown {
    // Excel doesn't track other fees separately
    return { breakdown: [] };
  }

  normalizeTransportStats(): TransportStats {
    // Excel doesn't track transport data
    return {
      totalPupils: 0,
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      routeBreakdown: []
    };
  }

  // Helper to filter Term 1 2026 data
  filterTerm1Data(rows: ExcelRow[]): ExcelRow[] {
    return rows.filter(row => {
      const termValue = this.findStringValue(row, ['term', 'term_name', 'academic_term']);
      return termValue && (
        termValue.toLowerCase().includes('term 1') || 
        termValue.toLowerCase().includes('2026')
      );
    });
  }
}
