import { supabase } from '@/lib/supabase';
import {
  IDataSource,
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
  TransportStats,
  SupabaseError
} from './types';

export class SupabaseDataSource implements IDataSource {
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await supabase.from('pupils').select('id').limit(1);
      return !error;
    } catch (error) {
      console.error('Supabase health check failed:', error);
      return false;
    }
  }

  // Pupils
  async getPupils(gradeId?: string): Promise<Pupil[]> {
    try {
      let query = supabase
        .from('pupils')
        .select('*, grades(name)')
        .order('full_name');

      if (gradeId) {
        query = query.eq('grade_id', gradeId);
      }

      const { data, error } = await query;
      
      if (error) throw new SupabaseError(`Failed to get pupils: ${error.message}`, error);
      return (data as Pupil[]) || [];
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get pupils', error instanceof Error ? error : undefined);
    }
  }

  async getPupil(id: string): Promise<Pupil | null> {
    try {
      const { data, error } = await supabase
        .from('pupils')
        .select('*, grades(name)')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new SupabaseError(`Failed to get pupil: ${error.message}`, error);
      }

      return data as Pupil;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get pupil', error instanceof Error ? error : undefined);
    }
  }

  async createPupil(pupil: Omit<Pupil, 'id' | 'created_at' | 'grades'>): Promise<Pupil> {
    try {
      const { data, error } = await supabase
        .from('pupils')
        .insert(pupil)
        .select('*, grades(name)')
        .single();

      if (error) throw new SupabaseError(`Failed to create pupil: ${error.message}`, error);
      return data as Pupil;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to create pupil', error instanceof Error ? error : undefined);
    }
  }

  async updatePupil(id: string, updates: Partial<Pupil>): Promise<Pupil> {
    try {
      const { data, error } = await supabase
        .from('pupils')
        .update(updates)
        .eq('id', id)
        .select('*, grades(name)')
        .single();

      if (error) throw new SupabaseError(`Failed to update pupil: ${error.message}`, error);
      return data as Pupil;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to update pupil', error instanceof Error ? error : undefined);
    }
  }

  async deletePupil(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('pupils').delete().eq('id', id);
      if (error) throw new SupabaseError(`Failed to delete pupil: ${error.message}`, error);
      return true;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to delete pupil', error instanceof Error ? error : undefined);
    }
  }

  // Grades
  async getGrades(): Promise<Grade[]> {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .order('name');

      if (error) throw new SupabaseError(`Failed to get grades: ${error.message}`, error);
      return (data as Grade[]) || [];
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get grades', error instanceof Error ? error : undefined);
    }
  }

  async getGrade(id: string): Promise<Grade | null> {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new SupabaseError(`Failed to get grade: ${error.message}`, error);
      }

      return data as Grade;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get grade', error instanceof Error ? error : undefined);
    }
  }

  async createGrade(grade: Omit<Grade, 'id' | 'created_at'>): Promise<Grade> {
    try {
      const { data, error } = await supabase
        .from('grades')
        .insert(grade)
        .select()
        .single();

      if (error) throw new SupabaseError(`Failed to create grade: ${error.message}`, error);
      return data as Grade;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to create grade', error instanceof Error ? error : undefined);
    }
  }

  async updateGrade(id: string, updates: Partial<Grade>): Promise<Grade> {
    try {
      const { data, error } = await supabase
        .from('grades')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new SupabaseError(`Failed to update grade: ${error.message}`, error);
      return data as Grade;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to update grade', error instanceof Error ? error : undefined);
    }
  }

  async deleteGrade(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('grades').delete().eq('id', id);
      if (error) throw new SupabaseError(`Failed to delete grade: ${error.message}`, error);
      return true;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to delete grade', error instanceof Error ? error : undefined);
    }
  }

  async getGradeCounts(): Promise<GradeCount[]> {
    try {
      const [grades, pupils] = await Promise.all([
        this.getGrades(),
        supabase.from('pupils').select('grade_id, status')
      ]);

      const counts = grades.map((g) => ({
        id: g.id,
        name: g.name,
        count: pupils.filter((p: any) => p.grade_id === g.id).length,
      }));

      return counts;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get grade counts', error instanceof Error ? error : undefined);
    }
  }

  // Payments
  async getPayments(pupilId?: string): Promise<Payment[]> {
    try {
      let query = supabase
        .from('payments')
        .select('*, pupils(full_name)');

      if (pupilId) {
        query = query.eq('pupil_id', pupilId);
      }

      const { data, error } = await query;
      
      if (error) throw new SupabaseError(`Failed to get payments: ${error.message}`, error);
      return (data as Payment[]) || [];
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get payments', error instanceof Error ? error : undefined);
    }
  }

  async getPayment(id: string): Promise<Payment | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, pupils(full_name)')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new SupabaseError(`Failed to get payment: ${error.message}`, error);
      }

      return data as Payment;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get payment', error instanceof Error ? error : undefined);
    }
  }

  async createPayment(payment: Omit<Payment, 'id' | 'created_at' | 'pupils'>): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select('*, pupils(full_name)')
        .single();

      if (error) throw new SupabaseError(`Failed to create payment: ${error.message}`, error);
      return data as Payment;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to create payment', error instanceof Error ? error : undefined);
    }
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select('*, pupils(full_name)')
        .single();

      if (error) throw new SupabaseError(`Failed to update payment: ${error.message}`, error);
      return data as Payment;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to update payment', error instanceof Error ? error : undefined);
    }
  }

  async deletePayment(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw new SupabaseError(`Failed to delete payment: ${error.message}`, error);
      return true;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to delete payment', error instanceof Error ? error : undefined);
    }
  }

  async getInstallments(): Promise<PaymentRecord[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, pupils(full_name)');

      if (error) throw new SupabaseError(`Failed to get installments: ${error.message}`, error);
      
      return ((data as Payment[]) || []).map(payment => ({
        id: payment.id,
        pupil_name: payment.pupils?.full_name || 'Unknown',
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        receipt_number: payment.receipt_number,
        term: payment.term,
        status: payment.status
      }));
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get installments', error instanceof Error ? error : undefined);
    }
  }

  // Enrollments
  async getEnrollments(pupilId?: string): Promise<Enrollment[]> {
    try {
      let query = supabase
        .from('enrollments')
        .select('*, pupils(full_name), grades(name), terms(name)');

      if (pupilId) {
        query = query.eq('pupil_id', pupilId);
      }

      const { data, error } = await query;
      
      if (error) throw new SupabaseError(`Failed to get enrollments: ${error.message}`, error);
      return ((data as any[]) || []).map(enrollment => ({
        ...enrollment,
        school_fees_outstanding: enrollment.school_fees_expected - enrollment.school_fees_paid
      }));
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get enrollments', error instanceof Error ? error : undefined);
    }
  }

  async getEnrollment(id: number): Promise<Enrollment | null> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, pupils(full_name), grades(name), terms(name)')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new SupabaseError(`Failed to get enrollment: ${error.message}`, error);
      }

      const enrollment = data as any;
      return {
        ...enrollment,
        school_fees_outstanding: enrollment.school_fees_expected - enrollment.school_fees_paid
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get enrollment', error instanceof Error ? error : undefined);
    }
  }

  async createEnrollment(enrollment: Omit<Enrollment, 'id' | 'pupils' | 'terms' | 'grades'>): Promise<Enrollment> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .insert(enrollment)
        .select('*, pupils(full_name), grades(name), terms(name)')
        .single();

      if (error) throw new SupabaseError(`Failed to create enrollment: ${error.message}`, error);
      
      const result = data as any;
      return {
        ...result,
        school_fees_outstanding: result.school_fees_expected - result.school_fees_paid
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to create enrollment', error instanceof Error ? error : undefined);
    }
  }

  async updateEnrollment(id: number, updates: Partial<Enrollment>): Promise<Enrollment> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .update(updates)
        .eq('id', id)
        .select('*, pupils(full_name), grades(name), terms(name)')
        .single();

      if (error) throw new SupabaseError(`Failed to update enrollment: ${error.message}`, error);
      
      const result = data as any;
      return {
        ...result,
        school_fees_outstanding: result.school_fees_expected - result.school_fees_paid
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to update enrollment', error instanceof Error ? error : undefined);
    }
  }

  async deleteEnrollment(id: number): Promise<boolean> {
    try {
      const { error } = await supabase.from('enrollments').delete().eq('id', id);
      if (error) throw new SupabaseError(`Failed to delete enrollment: ${error.message}`, error);
      return true;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to delete enrollment', error instanceof Error ? error : undefined);
    }
  }

  // Terms
  async getTerms(): Promise<Term[]> {
    try {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw new SupabaseError(`Failed to get terms: ${error.message}`, error);
      return (data as Term[]) || [];
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get terms', error instanceof Error ? error : undefined);
    }
  }

  async getTerm(id: string): Promise<Term | null> {
    try {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new SupabaseError(`Failed to get term: ${error.message}`, error);
      }

      return data as Term;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get term', error instanceof Error ? error : undefined);
    }
  }

  async createTerm(term: Omit<Term, 'id'>): Promise<Term> {
    try {
      const { data, error } = await supabase
        .from('terms')
        .insert(term)
        .select()
        .single();

      if (error) throw new SupabaseError(`Failed to create term: ${error.message}`, error);
      return data as Term;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to create term', error instanceof Error ? error : undefined);
    }
  }

  async updateTerm(id: string, updates: Partial<Term>): Promise<Term> {
    try {
      const { data, error } = await supabase
        .from('terms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new SupabaseError(`Failed to update term: ${error.message}`, error);
      return data as Term;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to update term', error instanceof Error ? error : undefined);
    }
  }

  async deleteTerm(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('terms').delete().eq('id', id);
      if (error) throw new SupabaseError(`Failed to delete term: ${error.message}`, error);
      return true;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to delete term', error instanceof Error ? error : undefined);
    }
  }

  // Parents
  async getParents(): Promise<Parent[]> {
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .order('full_name');

      if (error) throw new SupabaseError(`Failed to get parents: ${error.message}`, error);
      return (data as Parent[]) || [];
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get parents', error instanceof Error ? error : undefined);
    }
  }

  async getParent(id: string): Promise<Parent | null> {
    try {
      const { data, error } = await supabase
        .from('parents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new SupabaseError(`Failed to get parent: ${error.message}`, error);
      }

      return data as Parent;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get parent', error instanceof Error ? error : undefined);
    }
  }

  async createParent(parent: Omit<Parent, 'id' | 'pupils'>): Promise<Parent> {
    try {
      const { data, error } = await supabase
        .from('parents')
        .insert(parent)
        .select()
        .single();

      if (error) throw new SupabaseError(`Failed to create parent: ${error.message}`, error);
      return data as Parent;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to create parent', error instanceof Error ? error : undefined);
    }
  }

  async updateParent(id: string, updates: Partial<Parent>): Promise<Parent> {
    try {
      const { data, error } = await supabase
        .from('parents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new SupabaseError(`Failed to update parent: ${error.message}`, error);
      return data as Parent;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to update parent', error instanceof Error ? error : undefined);
    }
  }

  async deleteParent(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('parents').delete().eq('id', id);
      if (error) throw new SupabaseError(`Failed to delete parent: ${error.message}`, error);
      return true;
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to delete parent', error instanceof Error ? error : undefined);
    }
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('school_fees_expected, school_fees_paid');

      if (enrollmentError) throw new SupabaseError(`Failed to get dashboard stats: ${enrollmentError.message}`, enrollmentError);

      const { data: otherFees, error: otherFeesError } = await supabase
        .from('pupil_other_fees')
        .select('amount, amount_paid');

      if (otherFeesError) {
        console.warn('Other fees error:', otherFeesError);
      }

      const totalPupils = enrollments?.length || 0;
      const schoolFeesExpected = enrollments?.reduce((sum: number, e: any) => sum + (e.school_fees_expected || 0), 0) || 0;
      const schoolFeesCollected = enrollments?.reduce((sum: number, e: any) => sum + (e.school_fees_paid || 0), 0) || 0;
      const schoolFeesOutstanding = schoolFeesExpected - schoolFeesCollected;

      const otherFeesExpected = otherFees?.reduce((sum: number, f: any) => sum + (f.amount || 0), 0) || 0;
      const otherFeesCollected = otherFees?.reduce((sum: number, f: any) => sum + (f.amount_paid || 0), 0) || 0;
      const otherFeesOutstanding = otherFeesExpected - otherFeesCollected;

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
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get dashboard stats', error instanceof Error ? error : undefined);
    }
  }

  async getOtherFeesBreakdown(): Promise<OtherFeesBreakdown> {
    try {
      const { data, error } = await supabase
        .from('pupil_other_fees')
        .select(`
          amount,
          amount_paid,
          other_fee_types!fee_type_id(name),
          enrollments!inner(pupils!inner(full_name))
        `);

      if (error) throw new SupabaseError(`Failed to get other fees breakdown: ${error.message}`, error);

      const breakdown = new Map<string, any>();
      
      ((data as any[]) || []).forEach((fee: any) => {
        const feeType = fee.other_fee_types?.name || 'Unknown';
        if (!breakdown.has(feeType)) {
          breakdown.set(feeType, {
            fee_type: feeType,
            total_expected: 0,
            total_collected: 0,
            total_outstanding: 0,
            pupil_count: 0
          });
        }
        
        const stats = breakdown.get(feeType);
        stats.total_expected += fee.amount || 0;
        stats.total_collected += fee.amount_paid || 0;
        stats.total_outstanding += (fee.amount || 0) - (fee.amount_paid || 0);
        stats.pupil_count += 1;
      });

      return { breakdown: Array.from(breakdown.values()) };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get other fees breakdown', error instanceof Error ? error : undefined);
    }
  }

  async getFeeTypeStats(feeType?: string): Promise<FeeTypeStat[]> {
    try {
      let query = supabase
        .from('pupil_other_fees')
        .select(`
          amount,
          amount_paid,
          other_fee_types!fee_type_id(name)
        `);

      if (feeType && feeType !== 'all') {
        query = query.eq('other_fee_types.name', feeType);
      }

      const { data, error } = await query;
      
      if (error) throw new SupabaseError(`Failed to get fee type stats: ${error.message}`, error);

      const stats = new Map<string, FeeTypeStat>();
      
      ((data as any[]) || []).forEach((fee: any) => {
        const feeTypeName = fee.other_fee_types?.name || 'Unknown';
        if (!stats.has(feeTypeName)) {
          stats.set(feeTypeName, {
            name: feeTypeName,
            expected: 0,
            collected: 0,
            outstanding: 0,
            pupils: 0
          });
        }
        
        const stat = stats.get(feeTypeName)!;
        stat.expected += fee.amount || 0;
        stat.collected += fee.amount_paid || 0;
        stat.outstanding += (fee.amount || 0) - (fee.amount_paid || 0);
        stat.pupils += 1;
      });

      return Array.from(stats.values());
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get fee type stats', error instanceof Error ? error : undefined);
    }
  }

  async getFeeTypeNames(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('other_fee_types')
        .select('name')
        .order('name');

      if (error) throw new SupabaseError(`Failed to get fee type names: ${error.message}`, error);
      return ((data as any[]) || []).map((ft: any) => ft.name);
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get fee type names', error instanceof Error ? error : undefined);
    }
  }

  async getTransportStats(): Promise<TransportStats> {
    try {
      const { data: assignments, error: assignmentError } = await supabase
        .from('pupil_transport_assignments')
        .select(`
          amount_expected,
          amount_paid,
          transport_routes!route_id(route_name, fee_amount)
        `);

      if (assignmentError) throw new SupabaseError(`Failed to get transport stats: ${assignmentError.message}`, assignmentError);

      const routeBreakdown = new Map<string, any>();
      let totalPupils = 0;
      let totalExpected = 0;
      let totalCollected = 0;

      ((assignments as any[]) || []).forEach((assignment: any) => {
        const routeName = assignment.transport_routes?.route_name || 'Unknown';
        if (!routeBreakdown.has(routeName)) {
          routeBreakdown.set(routeName, {
            route_name: routeName,
            pupils: 0,
            expected: 0,
            collected: 0,
            outstanding: 0
          });
        }

        const breakdown = routeBreakdown.get(routeName)!;
        breakdown.pupils += 1;
        breakdown.expected += assignment.amount_expected || 0;
        breakdown.collected += assignment.amount_paid || 0;
        breakdown.outstanding += (assignment.amount_expected || 0) - (assignment.amount_paid || 0);

        totalPupils += 1;
        totalExpected += assignment.amount_expected || 0;
        totalCollected += assignment.amount_paid || 0;
      });

      return {
        totalPupils,
        totalExpected,
        totalCollected,
        totalOutstanding: totalExpected - totalCollected,
        routeBreakdown: Array.from(routeBreakdown.values())
      };
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get transport stats', error instanceof Error ? error : undefined);
    }
  }

  async getTransportRoutes(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transport_routes')
        .select('*')
        .eq('active', true)
        .order('route_name');

      if (error) throw new SupabaseError(`Failed to get transport routes: ${error.message}`, error);
      return data || [];
    } catch (error) {
      if (error instanceof SupabaseError) throw error;
      throw new SupabaseError('Failed to get transport routes', error instanceof Error ? error : undefined);
    }
  }
}
