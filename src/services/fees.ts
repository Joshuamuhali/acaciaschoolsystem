import { supabase } from "@/integrations/supabase/client";
import type { SchoolFee, OtherFee, Installment } from "@/types";
import { createTransaction } from "@/services/transactions";

// School Fees - Simplified with direct queries (schema now consistent)
export const getSchoolFees = async (pupilId: string): Promise<SchoolFee[]> => {
  const { data, error } = await supabase
    .from("school_fees")
    .select("*, terms(name)")
    .eq("pupil_id", pupilId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createSchoolFee = async (fee: Omit<SchoolFee, "id" | "created_at" | "terms" | "total_collected" | "balance" | "paid_toggle">) => {
  const { data, error } = await supabase
    .from("school_fees")
    .insert({ ...fee, total_collected: 0, balance: fee.total_expected, paid_toggle: false })
    .select()
    .single();
  if (error) throw error;

  return data;
};

// Other Fees - Simplified with direct queries (schema now consistent)
export const getOtherFees = async (pupilId?: string): Promise<OtherFee[]> => {
  let query = supabase
    .from("other_fees")
    .select("*, terms(name), pupils(full_name, grades(name))")
    .order("created_at", { ascending: false });

  if (pupilId) {
    query = query.eq("pupil_id", pupilId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const createOtherFee = async (fee: Omit<OtherFee, "id" | "created_at" | "balance" | "total_collected" | "paid_toggle" | "terms">) => {
  const { data, error } = await supabase.from("other_fees").insert({ ...fee, balance: fee.total_expected, total_collected: 0, paid_toggle: false }).select().single();
  if (error) throw error;
  return data;
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

// Installments - Simplified with direct queries (schema now consistent)
export const getInstallments = async (pupilId: string): Promise<Installment[]> => {
  const { data, error } = await supabase
    .from("installments")
    .select("*, school_fees(terms(name)), pupils(grades(name))")
    .eq("pupil_id", pupilId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

export const recordSchoolFeePayment = async (
  pupilId: string,
  schoolFeeId: string,
  amount: number,
  RCT_no: string
) => {
  // Use stored procedure for atomic payment processing
  const { data, error } = await supabase.rpc('process_school_fee_payment', {
    p_pupil_id: pupilId,
    p_school_fee_id: schoolFeeId,
    p_amount: amount,
    p_rct_no: RCT_no
  });

  if (error) throw error;

  // Check if payment was successful
  if (!data?.success) {
    throw new Error(data?.error || 'Payment processing failed');
  }

  return data;
};

export const recordOtherFeePayment = async (
  pupilId: string,
  otherFeeId: string,
  amount: number,
  RCT_no: string = ''
) => {
  // Use stored procedure for atomic payment processing
  const { data, error } = await supabase.rpc('process_other_fee_payment', {
    p_pupil_id: pupilId,
    p_other_fee_id: otherFeeId,
    p_amount: amount,
    p_rct_no: RCT_no
  });

  if (error) throw error;

  // Check if payment was successful
  if (!data?.success) {
    throw new Error(data?.error || 'Payment processing failed');
  }

  return data;
};

// NEW: Accurate dashboard stats based on payment data
export const getAccurateDashboardStats = async () => {
  try {
    // Get all pupils
    const { data: pupils } = await supabase.from('pupils').select('id, status');
    
    // Get all school fees
    const { data: schoolFees } = await supabase.from('school_fees').select('total_expected, total_collected, balance');
    
    // Get all other fees
    const { data: otherFees } = await supabase.from('other_fees').select('total_expected, collected, balance, fee_type');
    
    // Get all installments for discount calculation
    const { data: installments } = await supabase.from('installments').select('amount_paid, discount_applied');
    
    const totalPupils = pupils?.length || 0;
    const admittedPupils = pupils?.filter(p => p.status === 'admitted').length || 0;
    const newPupils = pupils?.filter(p => p.status === 'new').length || 0;
    
    const schoolFeesExpected = schoolFees?.reduce((sum, f) => sum + Number(f.total_expected), 0) || 0;
    const schoolFeesCollected = schoolFees?.reduce((sum, f) => sum + Number(f.total_collected), 0) || 0;
    const schoolFeesOutstanding = schoolFees?.reduce((sum, f) => sum + Number(f.balance), 0) || 0;
    
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

export const getPupilsByFeeType = async (feeType: string) => {
  const { data, error } = await supabase
    .from("other_fees")
    .select("*, pupils(*, grades(*))")
    .eq("fee_type", feeType)
    .gt("balance", 0)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
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
