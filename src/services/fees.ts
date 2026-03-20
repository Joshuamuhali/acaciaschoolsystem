import { supabase } from "@/lib/supabase";
import type { SchoolFee, OtherFee, Installment, PupilDiscount } from "@/types";
import { createTransaction } from "@/services/transactions";

// Helper function to check if table exists and handle errors gracefully
const safeSupabaseQuery = async <T = any>(
  tableName: string,
  query: () => Promise<any>,
  fallbackData: T[] = []
): Promise<T[]> => {
  try {
    const { data, error } = await query();
    
    if (error) {
      // Handle 404 (table not found) and other errors gracefully
      if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
        // Table does not exist - return empty data
        return fallbackData;
      }

      // Handle RLS (Row Level Security) issues
      if (error.message?.includes('permission denied')) {
        // Permission denied - return empty data
        return fallbackData;
      }

      // Handle network errors
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        // Network error - return empty data
        return fallbackData;
      }

      // Log other errors for debugging (will be removed in production)
      return fallbackData;
    }
    
    return data || fallbackData;
  } catch (err) {
    console.error(`Unexpected error accessing table '${tableName}':`, err);
    return fallbackData;
  }
};

// School Fees - Updated to match your schema (enrollments table)
export const getSchoolFees = async (pupilId?: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("enrollments")
      .select(`
        *,
        pupils!inner(full_name),
        grades!inner(name),
        terms!inner(name)
      `)
      .eq(pupilId ? "pupil_id" : "", pupilId || "")
      .order("created_at", { ascending: false });
    
    if (error) {
      if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
        console.warn(`Table 'enrollments' does not exist or is not accessible. Using fallback data.`);
        return [];
      }
      console.error('Error fetching school fees:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching school fees:', err);
    return [];
  }
};

export const createSchoolFee = async (fee: any): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from("enrollments")
      .insert({ 
        ...fee, 
        school_fees_paid: 0, 
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating school fee:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error creating school fee:', err);
    throw err;
  }
};

// Other Fees - Updated to match your schema (pupil_other_fees table)
export const getOtherFees = async (pupilId?: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("pupil_other_fees")
      .select(`
        *,
        enrollments!inner(
          pupil_id,
          terms!inner(name)
        ),
        other_fee_types!fee_type_id(name, amount)
      `)
      .eq(pupilId ? "enrollments.pupil_id" : "", pupilId || "")
      .order("id", { ascending: false });
    
    if (error) {
      if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
        console.warn(`Table 'pupil_other_fees' does not exist or is not accessible. Using fallback data.`);
        return [];
      }
      console.error('Error fetching other fees:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching other fees:', err);
    return [];
  }
};

export const createOtherFee = async (fee: any): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from("pupil_other_fees")
      .insert({ 
        ...fee, 
        amount_paid: 0
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating other fee:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error creating other fee:', err);
    throw err;
  }
};

export const updateOtherFee = async (id: string, updates: Partial<OtherFee>) => {
  const { data, error } = await supabase.from("other_fees").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteOtherFee = async (id: string) => {
  const { error } = await supabase.from("other_fees").delete().eq("id", id);
  if (error) throw error;
};

// Installments - Updated to match your schema (payments table)
export const getInstallments = async (pupilId?: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("payments")
      .select(`
        *,
        enrollments!inner(
          pupil_id,
          pupils!inner(full_name),
          grades!inner(name)
        )
      `)
      .eq(pupilId ? "enrollments.pupil_id" : "", pupilId || "")
      .order("payment_date", { ascending: false });
    
    if (error) {
      if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
        console.warn(`Table 'payments' does not exist or is not accessible. Using fallback data.`);
        return [];
      }
      console.error('Error fetching installments:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching installments:', err);
    return [];
  }
};

export const recordSchoolFeePayment = async (
  pupilId: string,
  enrollmentId: string,
  amount: number,
  RCT_no: string
) => {
  try {
    // Update enrollment payment status
    const { data: enrollment, error: fetchError } = await supabase
      .from("enrollments")
      .select("school_fees_paid, school_fees_expected")
      .eq("id", enrollmentId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching enrollment:', fetchError);
      throw fetchError;
    }
    
    const newPaidAmount = (enrollment?.school_fees_paid || 0) + amount;
    
    // Update enrollment with new payment
    const { data, error } = await supabase
      .from("enrollments")
      .update({ 
        school_fees_paid: newPaidAmount,
        status: newPaidAmount >= (enrollment?.school_fees_expected || 0) ? 'paid' : 'partial'
      })
      .eq("id", enrollmentId)
      .select()
      .single();
    
    if (error) {
      console.error('Error recording school fee payment:', error);
      throw error;
    }
    
    // Record payment transaction
    await supabase
      .from("payments")
      .insert({
        enrollment_id: enrollmentId,
        amount: amount,
        payment_date: new Date().toISOString()
      });
    
    return data;
  } catch (err) {
    console.error('Unexpected error recording school fee payment:', err);
    throw err;
  }
};

export const recordOtherFeePayment = async (
  pupilId: string,
  pupilOtherFeeId: string,
  amount: number,
  RCT_no: string = ''
) => {
  try {
    // Update pupil_other_fees payment status
    const { data: feeData, error: fetchError } = await supabase
      .from("pupil_other_fees")
      .select("amount_paid, amount")
      .eq("id", pupilOtherFeeId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching pupil other fee:', fetchError);
      throw fetchError;
    }
    
    const newPaidAmount = (feeData?.amount_paid || 0) + amount;
    
    // Update pupil_other_fees with new payment
    const { data, error } = await supabase
      .from("pupil_other_fees")
      .update({ 
        amount_paid: newPaidAmount
      })
      .eq("id", pupilOtherFeeId)
      .select()
      .single();
    
    if (error) {
      console.error('Error recording other fee payment:', error);
      throw error;
    }
    
    // Get enrollment_id for payment record
    const { data: enrollment } = await supabase
      .from("pupil_other_fees")
      .select("enrollment_id")
      .eq("id", pupilOtherFeeId)
      .single();
    
    // Record payment transaction
    if (enrollment?.enrollment_id) {
      await supabase
        .from("payments")
        .insert({
          enrollment_id: enrollment.enrollment_id,
          amount: amount,
          payment_date: new Date().toISOString()
        });
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error recording other fee payment:', err);
    throw err;
  }
};

// PUPIL DISCOUNT SERVICES (NEW)
export const getPupilDiscounts = async (pupilId: string): Promise<PupilDiscount[]> => {
  try {
    const { data, error } = await supabase
      .from("pupil_discounts")
      .select("*")
      .eq("pupil_id", pupilId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    
    if (error) {
      if (error.message?.includes('does not exist') || error.code === 'PGRST116') {
        console.warn(`Table 'pupil_discounts' does not exist or is not accessible. Using fallback data.`);
        return [];
      }
      console.error('Error fetching pupil discounts:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching pupil discounts:', err);
    return [];
  }
};

export const savePupilDiscount = async (discount: Omit<PupilDiscount, "id" | "created_at" | "updated_at">) => {
  try {
    const { data, error } = await supabase
      .from("pupil_discounts")
      .upsert(discount)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving pupil discount:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error saving pupil discount:', err);
    throw err;
  }
};

export const removePupilDiscount = async (pupilId: string, appliesTo: string, termId: string | null = null) => {
  try {
    const { data, error } = await supabase
      .from("pupil_discounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("pupil_id", pupilId)
      .eq("applies_to", appliesTo)
      .eq("term_id", termId)
      .eq("is_active", true);
    
    if (error) {
      console.error('Error removing pupil discount:', error);
      throw error;
    }
    
    return data;
  } catch (err) {
    console.error('Unexpected error removing pupil discount:', err);
    throw err;
  }
};

// DASHBOARD STATS FUNCTIONS (UPDATED FOR NEW SCHEMA)
export const getAccurateDashboardStats = async (): Promise<any> => {
  try {
    // Get enrollments data (school fees)
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("enrollments")
      .select(`
        school_fees_expected,
        school_fees_paid,
        pupils!inner(full_name),
        grades!inner(name)
      `);
    
    if (enrollmentError) {
      console.error('Error fetching enrollments:', enrollmentError);
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
    
    // Get pupil_other_fees data
    const { data: otherFees, error: otherFeesError } = await supabase
      .from("pupil_other_fees")
      .select(`
        amount,
        amount_paid,
        other_fee_types!fee_type_id(name),
        enrollments!inner(pupils!inner(full_name))
      `);
    
    if (otherFeesError) {
      console.error('Error fetching other fees:', otherFeesError);
    }
    
    const totalPupils = enrollments?.length || 0;
    const schoolFeesExpected = enrollments?.reduce((sum, e) => sum + (e.school_fees_expected || 0), 0) || 0;
    const schoolFeesCollected = enrollments?.reduce((sum, e) => sum + (e.school_fees_paid || 0), 0) || 0;
    const schoolFeesOutstanding = schoolFeesExpected - schoolFeesCollected;
    
    const otherFeesExpected = otherFees?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
    const otherFeesCollected = otherFees?.reduce((sum, f) => sum + (f.amount_paid || 0), 0) || 0;
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
  } catch (err) {
    console.error('Error getting dashboard stats:', err);
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

export const getFeeTypeStats = async (feeType?: string): Promise<any> => {
  try {
    let query = supabase
      .from("pupil_other_fees")
      .select(`
        amount,
        amount_paid,
        other_fee_types!fee_type_id(name)
      `);
    
    if (feeType && feeType !== 'all') {
      query = query.eq("other_fee_types.name", feeType);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error getting fee type stats:', error);
      return {
        expected: 0,
        collected: 0,
        outstanding: 0,
        feeType: feeType || 'all',
        count: 0
      };
    }
    
    const expected = data?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
    const collected = data?.reduce((sum, f) => sum + (f.amount_paid || 0), 0) || 0;
    const outstanding = expected - collected;
    
    return {
      expected,
      collected,
      outstanding,
      feeType: feeType || 'all',
      count: data?.length || 0
    };
  } catch (err) {
    console.error('Error getting fee type stats:', err);
    return {
      expected: 0,
      collected: 0,
      outstanding: 0,
      feeType: feeType || 'all',
      count: 0
    };
  }
};

export const getFeeTypeSummary = async (feeType: string, gradeId?: string): Promise<any> => {
  try {
    let query = supabase
      .from("pupil_other_fees")
      .select(`
        amount,
        amount_paid,
        enrollments!inner(
          grades!inner(name)
        )
      `)
      .eq("other_fee_types.name", feeType);

    if (gradeId && gradeId !== 'all') {
      query = query.eq("enrollments.grades.id", gradeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting fee type summary:', error);
      return {
        expected: 0,
        collected: 0,
        outstanding: 0,
        count: 0
      };
    }

    const expected = data?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
    const collected = data?.reduce((sum, f) => sum + (f.amount_paid || 0), 0) || 0;
    const outstanding = expected - collected;

    return {
      expected,
      collected,
      outstanding,
      count: data?.length || 0
    };
  } catch (err) {
    console.error('Error getting fee type summary:', err);
    return {
      expected: 0,
      collected: 0,
      outstanding: 0,
      count: 0
    };
  }
};

export const getOtherFeesBreakdown = async (): Promise<any> => {
  try {
    const { data, error } = await supabase
      .from("pupil_other_fees")
      .select(`
        amount,
        amount_paid,
        other_fee_types!fee_type_id(name)
      `);
    
    if (error) {
      console.error('Error getting other fees breakdown:', error);
      return {
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        breakdown: []
      };
    }
    
    // Group by fee type
    const breakdown: any = {};
    data?.forEach((fee: any) => {
      const typeName = fee.other_fee_types?.[0]?.name || 'Unknown';
      if (!breakdown[typeName]) {
        breakdown[typeName] = {
          expected: 0,
          collected: 0,
          outstanding: 0,
          count: 0
        };
      }
      breakdown[typeName].expected += fee.amount || 0;
      breakdown[typeName].collected += fee.amount_paid || 0;
      breakdown[typeName].outstanding += (fee.amount || 0) - (fee.amount_paid || 0);
      breakdown[typeName].count += 1;
    });
    
    const totalExpected = Object.values(breakdown).reduce((sum: number, item: any) => sum + Number(item.expected || 0), 0);
    const totalCollected = Object.values(breakdown).reduce((sum: number, item: any) => sum + Number(item.collected || 0), 0);
    const totalOutstanding = Number(totalExpected) - Number(totalCollected);
    
    return {
      totalExpected,
      totalCollected,
      totalOutstanding,
      breakdown: Object.entries(breakdown).map(([name, stats]) => ({ name, ...(stats as any) }))
    };
  } catch (err) {
    console.error('Error getting other fees breakdown:', err);
    return {
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      breakdown: []
    };
  }
};

// ADDITIONAL REPORTING FUNCTIONS
export const getFeeTypeNames = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from("other_fee_types")
      .select("name")
      .order("name");

    if (error) {
      console.error('Error getting fee type names:', error);
      return [];
    }

    return data?.map(item => item.name) || [];
  } catch (err) {
    console.error('Error getting fee type names:', err);
    return [];
  }
};

export const getFeeTypePreviewRecords = async (feeType: string, gradeId?: string, limit: number = 10): Promise<any[]> => {
  try {
    let query = supabase
      .from("pupil_other_fees")
      .select(`
        amount,
        amount_paid,
        enrollments!inner(
          pupils!inner(full_name),
          grades!inner(name),
          terms!inner(name)
        ),
        other_fee_types!fee_type_id(name)
      `)
      .eq("other_fee_types.name", feeType)
      .order("id", { ascending: false })
      .limit(limit);

    if (gradeId && gradeId !== 'all') {
      query = query.eq("enrollments.grades.id", gradeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting fee type preview records:', error);
      return [];
    }

    return data?.map(record => ({
      pupilName: record.enrollments?.[0]?.pupils?.[0]?.full_name || 'Unknown',
      grade: record.enrollments?.[0]?.grades?.[0]?.name || 'Unknown',
      feeCategory: record.other_fee_types?.[0]?.name || 'Unknown',
      amount: record.amount || 0,
      paymentStatus: (record.amount_paid || 0) >= (record.amount || 0) ? 'Paid' : 'Partial',
      date: record.enrollments?.[0]?.terms?.[0]?.name || 'Unknown'
    })) || [];
  } catch (err) {
    console.error('Error getting fee type preview records:', err);
    return [];
  }
};

// TRANSPORT MODULE FUNCTIONS
export const getTransportRoutes = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("transport_routes")
      .select("*")
      .order("route_name");

    if (error) {
      console.error('Error getting transport routes:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error getting transport routes:', err);
    return [];
  }
};

export const assignTransportToPupil = async (
  pupilId: string,
  routeId: number,
  termId?: string
): Promise<any> => {
  try {
    // Get current term if not provided
    let currentTermId = termId;
    if (!currentTermId) {
      const { data: term } = await supabase
        .from("terms")
        .select("id")
        .eq("is_active", true)
        .single();
      currentTermId = term?.id;
    }

    if (!currentTermId) {
      throw new Error('No active term found');
    }

    // Get enrollment for this pupil and term
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id")
      .eq("pupil_id", pupilId)
      .eq("term_id", currentTermId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('Enrollment not found for this pupil and term');
    }

    // Get route fee
    const { data: route, error: routeError } = await supabase
      .from("transport_routes")
      .select("fee_amount")
      .eq("id", routeId)
      .single();

    if (routeError || !route) {
      throw new Error('Transport route not found');
    }

    // Assign transport (upsert)
    const { data, error } = await supabase
      .from("pupil_transport_assignments")
      .upsert({
        enrollment_id: enrollment.id,
        route_id: routeId,
        amount_expected: route.fee_amount,
        amount_paid: 0
      }, {
        onConflict: 'enrollment_id'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error assigning transport:', error);
    throw error;
  }
};

export const removeTransportFromPupil = async (
  pupilId: string,
  termId?: string
): Promise<void> => {
  try {
    // Get current term if not provided
    let currentTermId = termId;
    if (!currentTermId) {
      const { data: term } = await supabase
        .from("terms")
        .select("id")
        .eq("is_active", true)
        .single();
      currentTermId = term?.id;
    }

    if (!currentTermId) {
      throw new Error('No active term found');
    }

    // Get enrollment for this pupil and term
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id")
      .eq("pupil_id", pupilId)
      .eq("term_id", currentTermId)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('Enrollment not found for this pupil and term');
    }

    // Remove transport assignment
    const { error } = await supabase
      .from("pupil_transport_assignments")
      .delete()
      .eq("enrollment_id", enrollment.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing transport:', error);
    throw error;
  }
};

export const getPupilTransportAssignment = async (
  pupilId: string,
  termId?: string
): Promise<any | null> => {
  try {
    // Get current term if not provided
    let currentTermId = termId;
    if (!currentTermId) {
      const { data: term } = await supabase
        .from("terms")
        .select("id")
        .eq("is_active", true)
        .single();
      currentTermId = term?.id;
    }

    if (!currentTermId) {
      return null;
    }

    // Get enrollment for this pupil and term
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id")
      .eq("pupil_id", pupilId)
      .eq("term_id", currentTermId)
      .single();

    if (enrollmentError || !enrollment) {
      return null;
    }

    // Get transport assignment
    const { data, error } = await supabase
      .from("pupil_transport_assignments")
      .select(`
        *,
        transport_routes(*)
      `)
      .eq("enrollment_id", enrollment.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error getting transport assignment:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('Error getting transport assignment:', error);
    return null;
  }
};

export const getTransportStats = async (): Promise<any> => {
  try {
    const { data: assignments, error } = await supabase
      .from("pupil_transport_assignments")
      .select(`
        amount_expected,
        amount_paid,
        transport_routes(route_name, region, fee_amount)
      `);

    if (error) {
      console.error('Error getting transport stats:', error);
      return {
        totalPupils: 0,
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        routeBreakdown: []
      };
    }

    // Calculate totals
    const totalPupils = assignments?.length || 0;
    const totalExpected = assignments?.reduce((sum, a) => sum + (a.amount_expected || 0), 0) || 0;
    const totalCollected = assignments?.reduce((sum, a) => sum + (a.amount_paid || 0), 0) || 0;
    const totalOutstanding = totalExpected - totalCollected;

    // Group by route
    const routeStats: any = {};
    assignments?.forEach((assignment: any) => {
      const routeName = assignment.transport_routes?.route_name || 'Unknown';
      const region = assignment.transport_routes?.region || 'Unknown';

      if (!routeStats[routeName]) {
        routeStats[routeName] = {
          route: routeName,
          region,
          pupils: 0,
          expected: 0,
          collected: 0,
          outstanding: 0
        };
      }

      routeStats[routeName].pupils += 1;
      routeStats[routeName].expected += assignment.amount_expected || 0;
      routeStats[routeName].collected += assignment.amount_paid || 0;
    });

    // Calculate outstanding per route
    Object.values(routeStats).forEach((route: any) => {
      route.outstanding = route.expected - route.collected;
    });

    return {
      totalPupils,
      totalExpected,
      totalCollected,
      totalOutstanding,
      routeBreakdown: Object.values(routeStats)
    };
  } catch (err) {
    console.error('Error getting transport stats:', err);
    return {
      totalPupils: 0,
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      routeBreakdown: []
    };
  }
};

// ADDITIONAL REPORTING FUNCTIONS
export const getOutstandingPerGrade = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("enrollments")
      .select(`
        school_fees_expected,
        school_fees_paid,
        grades!inner(name)
      `);
    
    if (error) {
      console.error('Error getting outstanding per grade:', error);
      return [];
    }
    
    // Group by grade and calculate outstanding
    const gradeData: any = {};
    data?.forEach((enrollment: any) => {
      const gradeName = enrollment.grades?.name || 'Unknown';
      if (!gradeData[gradeName]) {
        gradeData[gradeName] = {
          grade: gradeName,
          expected: 0,
          collected: 0,
          outstanding: 0,
          pupils: 0
        };
      }
      gradeData[gradeName].expected += enrollment.school_fees_expected || 0;
      gradeData[gradeName].collected += enrollment.school_fees_paid || 0;
      gradeData[gradeName].pupils += 1;
    });
    
    Object.values(gradeData).forEach((grade: any) => {
      grade.outstanding = grade.expected - grade.collected;
    });
    
    return Object.values(gradeData);
  } catch (err) {
    console.error('Unexpected error getting outstanding per grade:', err);
    return [];
  }
};

export const getCollectionPerTerm = async () => {
  try {
    // Get enrollments with school fees data
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('school_fees_expected, school_fees_paid, terms!inner(name, term_number)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting collection per term:', error);
      return [];
    }
    
    // Group by term and calculate collections
    const termData: any = {};
    enrollments?.forEach((enrollment: any) => {
      const termName = `Term ${enrollment.terms?.term_number || 'Unknown'}`;
      if (!termData[termName]) {
        termData[termName] = {
          term: termName,
          term_number: enrollment.terms?.term_number || 0,
          expected: 0,
          collected: 0,
          outstanding: 0,
          enrollments: []
        };
      }
      
      termData[termName].expected += enrollment.school_fees_expected || 0;
      termData[termName].collected += enrollment.school_fees_paid || 0;
      termData[termName].outstanding = termData[termName].expected - termData[termName].collected;
      termData[termName].enrollments.push(enrollment);
    });
    
    return Object.values(termData);
  } catch (error) {
    console.error('Error in getCollectionPerTerm:', error);
    return [];
  }
};

export const getDailyCollection = async (dateRange?: { start: string; end: string }): Promise<any[]> => {
  try {
    let query = supabase
      .from("payments")
      .select(`
        amount,
        payment_date,
        enrollments!inner(
          pupils!inner(full_name)
        )
      `)
      .order("payment_date", { ascending: true });
    
    if (dateRange) {
      query = query
        .gte("payment_date", dateRange.start)
        .lte("payment_date", dateRange.end);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error getting daily collection:', error);
      return [];
    }
    
    // Group by date
    const dailyData: any = {};
    data?.forEach((payment: any) => {
      const date = new Date(payment.payment_date).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          amount: 0,
          transactions: 0
        };
      }
      dailyData[date].amount += payment.amount || 0;
      dailyData[date].transactions += 1;
    });
    
    return Object.values(dailyData);
  } catch (err) {
    console.error('Unexpected error getting daily collection:', err);
    return [];
  }
};

export const getSchoolTotals = async (): Promise<any> => {
  try {
    const { data: enrollments, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("school_fees_expected, school_fees_paid");
    
    if (enrollmentError) {
      console.error('Error getting school totals:', enrollmentError);
      return {
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        totalPupils: 0
      };
    }
    
    const totalExpected = enrollments?.reduce((sum, e) => sum + (e.school_fees_expected || 0), 0) || 0;
    const totalCollected = enrollments?.reduce((sum, e) => sum + (e.school_fees_paid || 0), 0) || 0;
    const totalOutstanding = totalExpected - totalCollected;
    const totalPupils = enrollments?.length || 0;
    
    return {
      totalExpected,
      totalCollected,
      totalOutstanding,
      totalPupils
    };
  } catch (err) {
    console.error('Unexpected error getting school totals:', err);
    return {
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalPupils: 0
    };
  }
};

// TOGGLE OTHER FEE FUNCTION (UPDATED FOR NEW SCHEMA)
export const toggleOtherFee = async (
  pupilId: string,
  feeType: string,
  isEnabled: boolean,
  termId?: string
) => {
  try {
    // Get current term if not provided
    let currentTermId = termId;
    if (!currentTermId) {
      const { data: term } = await supabase
        .from("terms")
        .select("id")
        .eq("is_active", true)
        .single();
      currentTermId = term?.id;
    }

    if (!currentTermId) {
      throw new Error('No active term found');
    }

    // Get enrollment for this pupil and term
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id")
      .eq("pupil_id", pupilId)
      .eq("term_id", currentTermId)
      .single();
    
    if (enrollmentError || !enrollment) {
      throw new Error('Enrollment not found for this pupil and term');
    }

    if (isEnabled) {
      // Enable fee - create or update pupil_other_fees record
      const { data: feeTypeData } = await supabase
        .from("other_fee_types")
        .select("id, amount")
        .eq("name", feeType)
        .single();
      
      if (!feeTypeData) {
        throw new Error(`Fee type '${feeType}' not found`);
      }

      const { data, error } = await supabase
        .from("pupil_other_fees")
        .upsert({
          enrollment_id: enrollment.id,
          fee_type_id: feeTypeData.id,
          amount: feeTypeData.amount,
          amount_paid: 0
        }, {
          onConflict: 'enrollment_id,fee_type_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } else {
      // Disable fee - delete pupil_other_fees record
      const { data: feeTypeData } = await supabase
        .from("other_fee_types")
        .select("id")
        .eq("name", feeType)
        .single();
      
      if (feeTypeData) {
        const { error } = await supabase
          .from("pupil_other_fees")
          .delete()
          .eq("enrollment_id", enrollment.id)
          .eq("fee_type_id", feeTypeData.id);
        
        if (error) throw error;
      }
      
      return { success: true, message: `Fee ${feeType} disabled` };
    }
  } catch (error) {
    console.error('Error toggling other fee:', error);
    throw error;
  }
};
