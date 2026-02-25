import { supabase } from "@/integrations/supabase/client";
import type { SchoolFee, OtherFee, Installment } from "@/types";
import { createTransaction } from "@/services/transactions";

// School Fees - Enhanced with robust error handling
export const getSchoolFees = async (pupilId: string): Promise<SchoolFee[]> => {
  try {
    // First try standard query
    const { data, error } = await supabase
      .from("school_fees")
      .select("*, terms(name)")
      .eq("pupil_id", pupilId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data;
    }

    console.warn('Standard school fees query failed, trying fallback:', error?.message);

    // Fallback: Get all fees and filter client-side
    const { data: allFees, error: fallbackError } = await supabase
      .from("school_fees")
      .select("*, terms(name)")
      .order("created_at", { ascending: false });

    if (fallbackError) {
      console.error('Fallback query also failed:', fallbackError.message);
      return [];
    }

    // Filter by pupil_id (handle both string and number comparisons)
    const filteredFees = allFees?.filter(fee =>
      String(fee.pupil_id) === pupilId || fee.pupil_id === parseInt(pupilId)
    ) || [];

    return filteredFees;
  } catch (err) {
    console.error('Unexpected error in getSchoolFees:', err);
    return [];
  }
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

// Other Fees - Enhanced with robust error handling
export const getOtherFees = async (pupilId: string): Promise<OtherFee[]> => {
  try {
    // First try standard query
    const { data, error } = await supabase
      .from("other_fees")
      .select("*, terms(name)")
      .eq("pupil_id", pupilId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data;
    }

    console.warn('Standard other fees query failed, trying fallback:', error?.message);

    // Fallback: Get all fees and filter client-side
    const { data: allFees, error: fallbackError } = await supabase
      .from("other_fees")
      .select("*, terms(name)")
      .order("created_at", { ascending: false });

    if (fallbackError) {
      console.error('Fallback query also failed:', fallbackError.message);
      return [];
    }

    // Filter by pupil_id (handle both string and number comparisons)
    const filteredFees = allFees?.filter(fee =>
      String(fee.pupil_id) === pupilId || fee.pupil_id === parseInt(pupilId)
    ) || [];

    return filteredFees;
  } catch (err) {
    console.error('Unexpected error in getOtherFees:', err);
    return [];
  }
};

export const createOtherFee = async (fee: Omit<OtherFee, "id" | "created_at" | "balance" | "collected" | "paid_toggle" | "terms">) => {
  const { data, error } = await supabase.from("other_fees").insert({ ...fee, balance: fee.total_expected, collected: 0, paid_toggle: false }).select().single();
  if (error) throw error;
  return data;
};

export const updateOtherFee = async (id: string, updates: Partial<OtherFee>) => {
  const { data, error } = await supabase.from("other_fees").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

// Installments - Enhanced with robust error handling
export const getInstallments = async (pupilId: string): Promise<Installment[]> => {
  try {
    // First try standard query with relationships
    const { data, error } = await supabase
      .from("installments")
      .select("*, school_fees(terms(name)), pupils(grades(name))")
      .eq("pupil_id", pupilId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data;
    }

    console.warn('Standard installments query failed, trying fallback:', error?.message);

    // Fallback: Get all installments and filter client-side
    const { data: allInstallments, error: fallbackError } = await supabase
      .from("installments")
      .select("*")
      .order("created_at", { ascending: false });

    if (fallbackError) {
      console.error('Fallback query also failed:', fallbackError.message);
      return [];
    }

    // Filter by pupil_id (handle both string and number comparisons)
    const filteredInstallments = allInstallments?.filter(installment =>
      String(installment.pupil_id) === pupilId || installment.pupil_id === parseInt(pupilId)
    ) || [];

    return filteredInstallments;
  } catch (err) {
    console.error('Unexpected error in getInstallments:', err);
    return [];
  }
};

export const recordSchoolFeePayment = async (
  pupilId: string,
  schoolFeeId: string,
  amount: number,
  RCT_no: string
) => {
  // Get current school fee
  const { data: fee, error: feeErr } = await supabase
    .from("school_fees")
    .select("total_expected, total_collected, balance, paid_toggle")
    .eq("id", schoolFeeId)
    .single();
  if (feeErr) throw feeErr;
  if (amount > fee.balance) throw new Error("Payment exceeds outstanding balance");

  // Update school fee
  const newCollected = fee.total_collected + amount;
  const newBalance = fee.balance - amount;
  const newPaidToggle = newBalance <= 0;
  const { error: updateErr } = await supabase
    .from("school_fees")
    .update({ total_collected: newCollected, balance: newBalance, paid_toggle: newPaidToggle })
    .eq("id", schoolFeeId);
  if (updateErr) throw updateErr;

  // Get next installment_no
  const { count, error: countErr } = await supabase
    .from("installments")
    .select("*", { count: 'exact', head: true })
    .eq("school_fee_id", schoolFeeId);
  if (countErr) throw countErr;
  const installment_no = (count ?? 0) + 1;

  // Record installment
  const { error: instErr } = await supabase.from("installments").insert({
    pupil_id: pupilId,
    school_fee_id: schoolFeeId,
    installment_no,
    amount_paid: amount,
    balance_remaining: newBalance,
    RCT_no,
  });
  if (instErr) throw instErr;

  // Log transaction
  await createTransaction({
    pupil_id: pupilId,
    fee_type: 'school_fee',
    amount,
    installment_no,
    RCT_no,
    date_paid: new Date().toISOString(),
    recorded_by: 'user',
  });

  // Check for pupil status update
  const { data: settings, error: settingsErr } = await supabase
    .from("school_settings")
    .select("value")
    .eq("key", "admission_threshold")
    .single();
  if (settingsErr) throw settingsErr;
  const threshold = parseFloat(settings.value);
  if (newCollected >= threshold * fee.total_expected) {
    await supabase.from("pupils").update({ status: 'admitted' }).eq("id", pupilId);
  }
};

export const recordOtherFeePayment = async (
  pupilId: string,
  otherFeeId: string,
  amount: number
) => {
  // Get current other fee
  const { data: fee, error: feeErr } = await supabase
    .from("other_fees")
    .select("total_expected, collected, balance, paid_toggle")
    .eq("id", otherFeeId)
    .single();
  if (feeErr) throw feeErr;
  if (amount > fee.balance) throw new Error("Payment exceeds outstanding balance");

  // Update other fee
  const newCollected = fee.collected + amount;
  const newBalance = fee.balance - amount;
  const newPaidToggle = newBalance <= 0;
  const { error: updateErr } = await supabase
    .from("other_fees")
    .update({ collected: newCollected, balance: newBalance, paid_toggle: newPaidToggle })
    .eq("id", otherFeeId);
  if (updateErr) throw updateErr;

  // Log transaction
  await createTransaction({
    pupil_id: pupilId,
    fee_type: fee.fee_type,
    amount,
    installment_no: null,
    RCT_no: '',
    date_paid: new Date().toISOString(),
    recorded_by: 'user',
  });
};

// Dashboard stats
export const getDashboardStats = async () => {
  const [allPupils, admittedPupils, schoolFees, otherFees, installments] = await Promise.all([
    supabase.from("pupils").select("id, status"),
    supabase.from("pupils").select("id").eq("status", "admitted"),
    supabase.from("school_fees").select("balance"),
    supabase.from("other_fees").select("balance"),
    supabase.from("installments").select("amount_paid"),
  ]);

  const totalPupils = allPupils.data?.length ?? 0;
  const admittedPupilsCount = admittedPupils.data?.length ?? 0;
  const newPupilsCount = allPupils.data?.filter(p => p.status === 'new').length ?? 0;

  // Calculate total expected fees as 2,400 * number of pupils (grade-level calculation)
  const totalExpectedFees = totalPupils * 2400;

  const totalOutstanding = (schoolFees.data?.reduce((sum, f) => sum + Number(f.balance), 0) ?? 0) + (otherFees.data?.reduce((sum, f) => sum + Number(f.balance), 0) ?? 0);
  const totalCollected = installments.data?.reduce((sum, i) => sum + Number(i.amount_paid), 0) ?? 0;

  return {
    totalPupils,
    admittedPupils: admittedPupilsCount,
    newPupils: newPupilsCount,
    totalCollected,
    totalOutstanding,
    totalExpected: totalExpectedFees // Explicitly calculated as 2,400 * pupil count
  };
};

// Reports
export const getOutstandingPerGrade = async () => {
  const [schoolData, otherData] = await Promise.all([
    supabase.from("school_fees").select("balance, pupils(grades(name))"),
    supabase.from("other_fees").select("balance, pupils(grades(name))")
  ]);

  if (schoolData.error) throw schoolData.error;
  if (otherData.error) throw otherData.error;

  const gradeMap: Record<string, { name: string; outstanding: number }> = {};

  const addToMap = (data: any[]) => {
    data.forEach((fee: any) => {
      const gradeName = fee.pupils?.grades?.name ?? "Unknown";
      if (!gradeMap[gradeName]) gradeMap[gradeName] = { name: gradeName, outstanding: 0 };
      gradeMap[gradeName].outstanding += Number(fee.balance);
    });
  };

  addToMap(schoolData.data ?? []);
  addToMap(otherData.data ?? []);

  return Object.values(gradeMap);
};

export const getCollectionPerTerm = async () => {
  const [schoolData, otherData] = await Promise.all([
    supabase.from("school_fees").select("total_collected, terms(name)"),
    supabase.from("other_fees").select("collected, terms(name)")
  ]);

  if (schoolData.error) throw schoolData.error;
  if (otherData.error) throw otherData.error;

  const termMap: Record<string, { name: string; collected: number }> = {};

  const addToMap = (data: any[], field: string) => {
    data.forEach((fee: any) => {
      const termName = fee.terms?.name ?? "Other";
      if (!termMap[termName]) termMap[termName] = { name: termName, collected: 0 };
      termMap[termName].collected += Number(fee[field]);
    });
  };

  addToMap(schoolData.data ?? [], "total_collected");
  addToMap(otherData.data ?? [], "collected");

  return Object.values(termMap);
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

  const totalExpected = (schoolFees.data?.reduce((sum, f) => sum + Number(f.total_expected), 0) ?? 0) + (otherFees.data?.reduce((sum, f) => sum + Number(f.total_expected), 0) ?? 0);
  const totalCollected = (schoolFees.data?.reduce((sum, f) => sum + Number(f.total_collected), 0) ?? 0) + (otherFees.data?.reduce((sum, f) => sum + Number(f.collected), 0) ?? 0);

  return { totalExpected, totalCollected };
};
