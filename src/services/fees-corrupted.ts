import { supabase } from "@/integrations/supabase/client";
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
        console.warn(`Table '${tableName}' does not exist or is not accessible. Using fallback data.`);
        return fallbackData;
      }
      
      // Handle RLS (Row Level Security) issues
      if (error.message?.includes('permission denied')) {
        console.error(`Permission denied accessing table '${tableName}'. Check RLS policies.`, error);
        return fallbackData;
      }
      
      // Handle network errors
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        console.error(`Network error accessing table '${tableName}'. Retrying...`, error);
        // Optional: Implement retry logic here
        return fallbackData;
      }
      
      // Log other errors
      console.error(`Error accessing table '${tableName}':`, error);
      return fallbackData;
    }
    
    return data || fallbackData;
  } catch (err) {
    console.error(`Unexpected error accessing table '${tableName}':`, err);
    return fallbackData;
  }
};

// Helper function for retry logic
const retryQuery = async <T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T | null> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Query failed after ${maxRetries} attempts:`, error);
        throw error;
      }
      
      console.warn(`Query attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  return null;
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
        other_fee_types!inner(name, amount)
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
    const admittedPupils = pupils?.filter(p => p.status === 'admitted').length || 0;
    const newPupils = pupils?.filter(p => p.status === 'new').length || 0;
    
    // School fees: Fixed 2400 per pupil for expected amount
    const schoolFeesExpected = totalPupils * 2400;
    const schoolFeesCollected = schoolFees?.reduce((sum, f) => sum + Number(f.total_collected), 0) || 0;
    const schoolFeesOutstanding = schoolFeesExpected - schoolFeesCollected;
    
    // Other fees: Only count fees that are enabled and assigned to pupils
    const otherFeesExpected = otherFees?.reduce((sum, f) => sum + Number(f.total_expected), 0) || 0;
    const otherFeesCollected = otherFees?.reduce((sum, f) => sum + Number(f.collected), 0) || 0;
    const otherFeesOutstanding = otherFees?.reduce((sum, f) => sum + Number(f.balance), 0) || 0;
    
    // Calculate discounts
    const totalDiscountAmount = installments?.reduce((sum, i) => {
      return sum + (Number(i.amount_paid) * Number(i.discount_applied) / 100);
    }, 0) || 0;
    
    const pupilsWithDiscounts = new Set(
      installments?.filter(i => i.discount_applied > 0).map(i => i.pupil_id)
    ).size;
    
    return {
      totalPupils,
      admittedPupils,
      newPupils,
      schoolFeesExpected,
      schoolFeesCollected,
      schoolFeesOutstanding,
      otherFeesExpected,
      otherFeesCollected,
      otherFeesOutstanding,
      totalExpected: schoolFeesExpected + otherFeesExpected,
      totalCollected: schoolFeesCollected + otherFeesCollected,
      totalOutstanding: schoolFeesOutstanding + otherFeesOutstanding,
      totalDiscountAmount,
      pupilsWithDiscounts
    };
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    throw error;
  }
};

// Dashboard stats - Now using database view for optimal performance
export const getDashboardStats = async () => {
  const { data, error } = await supabase
    .from("dashboard_stats")
    .select("*")
    .single();

  if (error) throw error;

  return data;
};

// Reports - Now using database views for optimal performance
export const getOutstandingPerGrade = async () => {
  const { data, error } = await supabase
    .from("outstanding_by_grade")
    .select("*")
    .order("level_order");

  if (error) throw error;
  return data || [];
};

export const getCollectionPerTerm = async () => {
  const { data, error } = await supabase
    .from("collection_by_term")
    .select("*")
    .order("start_date");

  if (error) throw error;
  return data || [];
};

export const getDailyCollection = async () => {
  const { data, error } = await supabase
    .from("installments")
    .select("amount_paid, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  const dayMap: Record<string, { date: string; total: number }> = {};
  data?.forEach((inst) => {
    const d = new Date(inst.created_at).toISOString().split("T")[0];
    if (!dayMap[d]) dayMap[d] = { date: d, total: 0 };
    dayMap[d].total += Number(inst.amount_paid);
  });
  return Object.values(dayMap);
};

export const getSchoolTotals = async () => {
  const [schoolFees, otherFees] = await Promise.all([
    supabase.from("school_fees").select("total_expected, total_collected"),
    supabase.from("other_fees").select("total_expected, collected")
  ]);

  const totalExpected = (schoolFees.data?.reduce((sum, f) => sum + Number(f.total_expected), 0) ?? 0);
  const totalCollected = (schoolFees.data?.reduce((sum, f) => sum + Number(f.total_collected), 0) ?? 0);

  return { totalExpected, totalCollected };
};

export const getOtherFeesBreakdown = async () => {
  const { data, error } = await supabase
    .from('other_fees_breakdown')
    .select('*');

  if (error) throw error;

  return data || [];
};

export const getFeeTypeStats = async (feeType?: string) => {
  try {
    let query = supabase.from('other_fees').select('total_expected, collected, balance, fee_type');
    
    // Only count enabled fees
    query = query.eq('is_enabled', true);
    
    if (feeType && feeType !== 'all') {
      query = query.eq('fee_type', feeType);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const expected = data?.reduce((sum, f) => sum + Number(f.total_expected), 0) || 0;
    const collected = data?.reduce((sum, f) => sum + Number(f.collected), 0) || 0;
    const outstanding = data?.reduce((sum, f) => sum + Number(f.balance), 0) || 0;
    
    return {
      expected,
      collected,
      outstanding,
      feeType: feeType || 'all',
      count: data?.length || 0
    };
  } catch (error) {
    console.error('Error getting fee type stats:', error);
    throw error;
  }
};

export const getPupilsByFeeType = async (feeType: string) => {
  const { data, error } = await supabase
    .from("other_fees")
    .select("*, pupils(*, grades(*))")
    .eq("fee_type", feeType)
    .eq("is_enabled", true)
    .gt("balance", 0)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
};

// Toggle other fee for a pupil
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
        .from('terms')
        .select('id')
        .eq('is_active', true)
        .single();
      currentTermId = term?.id;
    }

    if (isEnabled) {
      // Enable fee - create or update record
      const { data, error } = await supabase
        .from('other_fees')
        .upsert({
          pupil_id: pupilId,
          term_id: currentTermId,
          fee_type: feeType,
          total_expected: getDefaultFeeAmount(feeType),
          collected: 0,
          balance: getDefaultFeeAmount(feeType),
          is_enabled: true,
          paid_toggle: false
        }, {
          onConflict: 'pupil_id,term_id,fee_type'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Disable fee - update is_enabled to false
      const { data, error } = await supabase
        .from('other_fees')
        .update({ is_enabled: false })
        .eq('pupil_id', pupilId)
        .eq('term_id', currentTermId)
        .eq('fee_type', feeType)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error toggling other fee:', error);
    throw error;
  }
};

// Helper function to get default fee amounts
const getDefaultFeeAmount = (feeType: string): number => {
  const feeAmounts: Record<string, number> = {
    'Lunch': 600,
    'Transport': 400,
    'Maintenance': 150,
    'Registration': 200,
    'Sports': 200,
    'Library': 270,
    'PTC': 300
  };
  return feeAmounts[feeType] || 0;
};

export const getDiscountBreakdown = async (): Promise<{ discount_percentage: number; pupils: string[] }[]> => {
  const { data, error } = await supabase
    .from("installments")
    .select("discount_applied, pupils(full_name)")
    .gt("discount_applied", 0)
    .order("discount_applied", { ascending: false });

  if (error) throw error;

  // Group by discount_applied
  const grouped: Record<number, string[]> = {};
  data?.forEach((item: any) => {
    const discount = item.discount_applied;
    const pupilName = item.pupils.full_name;
    if (!grouped[discount]) grouped[discount] = [];
    if (!grouped[discount].includes(pupilName)) {
      grouped[discount].push(pupilName);
    }
  });

  return Object.keys(grouped).map((discount) => ({
    discount_percentage: Number(discount),
    pupils: grouped[discount],
  }));
};
