// =============================================
// SUPABASE HELPER MODULE - UUID-SAFE
// Fully UUID-compliant database operations
// =============================================

import { supabase } from "@/integrations/supabase/client";

// ===========================
// TYPE DEFINITIONS
// ===========================
export interface Pupil {
  id: string;
  full_name: string;
  sex: string;
  grade_id: string;
  parent_name?: string;
  parent_phone?: string;
  status: string;
  admission_blocked: boolean;
  created_at: string;
}

export interface Grade {
  id: string;
  name: string;
  level_order: number;
  section?: string;
  is_active: boolean;
  created_at: string;
}

export interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface SchoolFee {
  id: string;
  pupil_id: string;
  term_id: string;
  total_expected: number;
  total_collected: number;
  balance: number;
  paid_toggle: boolean;
  created_at: string;
}

export interface OtherFee {
  id: string;
  pupil_id: string;
  term_id: string;
  fee_type: string;
  total_expected: number;
  total_collected: number;
  balance: number;
  paid_toggle: boolean;
  created_at: string;
}

export interface Installment {
  id: string;
  pupil_id: string;
  fee_type: string;
  school_fee_id?: string;
  other_fee_type?: string;
  installment_no: number;
  amount_paid: number;
  balance_remaining: number;
  RCT_no?: string;
  date_paid: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  pupil_id: string;
  fee_type: string;
  amount: number;
  installment_no?: number;
  RCT_no?: string;
  date_paid: string;
  recorded_by?: string;
  created_at: string;
}

// ===========================
// ERROR HANDLING UTILITY
// ===========================
const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase ${operation} error:`, error);
  return { data: null, error };
};

// ===========================
// PUPILS OPERATIONS
// ===========================
export const fetchPupil = async (uuid: string) => {
  const { data, error } = await supabase
    .from('pupils')
    .select('*')
    .eq('id', uuid)
    .single();

  if (error) return handleSupabaseError(error, 'fetchPupil');
  return { data, error: null };
};

export const fetchPupils = async (filters?: { grade_id?: string; status?: string }) => {
  let query = supabase.from('pupils').select('*');

  if (filters?.grade_id) query = query.eq('grade_id', filters.grade_id);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return handleSupabaseError(error, 'fetchPupils');
  return { data: data || [], error: null };
};

export const insertPupil = async (pupil: Omit<Pupil, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('pupils')
    .insert([pupil])
    .select()
    .single();

  if (error) return handleSupabaseError(error, 'insertPupil');
  return { data, error: null };
};

export const updatePupil = async (uuid: string, updates: Partial<Omit<Pupil, 'id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('pupils')
    .update(updates)
    .eq('id', uuid)
    .select()
    .single();

  if (error) return handleSupabaseError(error, 'updatePupil');
  return { data, error: null };
};

export const deletePupil = async (uuid: string) => {
  const { error } = await supabase
    .from('pupils')
    .delete()
    .eq('id', uuid);

  if (error) return handleSupabaseError(error, 'deletePupil');
  return { data: null, error: null };
};

// ===========================
// GRADES OPERATIONS
// ===========================
export const fetchGrades = async () => {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .order('level_order');

  if (error) return handleSupabaseError(error, 'fetchGrades');
  return { data: data || [], error: null };
};

export const fetchGrade = async (uuid: string) => {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .eq('id', uuid)
    .single();

  if (error) return handleSupabaseError(error, 'fetchGrade');
  return { data, error: null };
};

export const insertGrade = async (grade: Omit<Grade, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('grades')
    .insert([grade])
    .select()
    .single();

  if (error) return handleSupabaseError(error, 'insertGrade');
  return { data, error: null };
};

export const updateGrade = async (uuid: string, updates: Partial<Omit<Grade, 'id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('grades')
    .update(updates)
    .eq('id', uuid)
    .select()
    .single();

  if (error) return handleSupabaseError(error, 'updateGrade');
  return { data, error: null };
};

// ===========================
// TERMS OPERATIONS
// ===========================
export const fetchTerms = async () => {
  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) return handleSupabaseError(error, 'fetchTerms');
  return { data: data || [], error: null };
};

export const fetchTerm = async (uuid: string) => {
  const { data, error } = await supabase
    .from('terms')
    .select('*')
    .eq('id', uuid)
    .single();

  if (error) return handleSupabaseError(error, 'fetchTerm');
  return { data, error: null };
};

export const insertTerm = async (term: Omit<Term, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('terms')
    .insert([term])
    .select()
    .single();

  if (error) return handleSupabaseError(error, 'insertTerm');
  return { data, error: null };
};

// ===========================
// SCHOOL FEES OPERATIONS
// ===========================
export const fetchSchoolFees = async (pupilId: string) => {
  const { data, error } = await supabase
    .from('school_fees')
    .select('*, terms(name)')
    .eq('pupil_id', pupilId)
    .order('created_at', { ascending: false });

  if (error) return handleSupabaseError(error, 'fetchSchoolFees');
  return { data: data || [], error: null };
};

export const fetchSchoolFee = async (uuid: string) => {
  const { data, error } = await supabase
    .from('school_fees')
    .select('*')
    .eq('id', uuid)
    .single();

  if (error) return handleSupabaseError(error, 'fetchSchoolFee');
  return { data, error: null };
};

export const insertSchoolFee = async (fee: Omit<SchoolFee, 'id' | 'total_collected' | 'balance' | 'paid_toggle' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('school_fees')
    .insert([{
      ...fee,
      total_collected: 0,
      balance: fee.total_expected,
      paid_toggle: false
    }])
    .select()
    .single();

  if (error) return handleSupabaseError(error, 'insertSchoolFee');
  return { data, error: null };
};

export const updateSchoolFee = async (uuid: string, pupilId: string, updates: Partial<Omit<SchoolFee, 'id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('school_fees')
    .update(updates)
    .eq('id', uuid)
    .eq('pupil_id', pupilId)
    .select()
    .single();

  if (error) return handleSupabaseError(error, 'updateSchoolFee');
  return { data, error: null };
};

// ===========================
// OTHER FEES OPERATIONS
// ===========================
export const fetchOtherFees = async (pupilId: string) => {
  const { data, error } = await supabase
    .from('other_fees')
    .select('*, terms(name)')
    .eq('pupil_id', pupilId)
    .order('created_at', { ascending: false });

  if (error) return handleSupabaseError(error, 'fetchOtherFees');
  return { data: data || [], error: null };
};

export const fetchOtherFee = async (uuid: string) => {
  const { data, error } = await supabase
    .from('other_fees')
    .select('*')
    .eq('id', uuid)
    .single();

  if (error) return handleSupabaseError(error, 'fetchOtherFee');
  return { data, error: null };
};

export const insertOtherFee = async (fee: Omit<OtherFee, 'id' | 'total_collected' | 'balance' | 'paid_toggle' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('other_fees')
    .insert([{
      ...fee,
      total_collected: 0,
      balance: fee.total_expected,
      paid_toggle: false
    }])
    .select()
    .single();

  if (error) return handleSupabaseError(error, 'insertOtherFee');
  return { data, error: null };
};

export const updateOtherFee = async (uuid: string, updates: Partial<Omit<OtherFee, 'id' | 'created_at'>>) => {
  const { data, error } = await supabase
    .from('other_fees')
    .update(updates)
    .eq('id', uuid)
    .select()
    .single();

  if (error) return handleSupabaseError(error, 'updateOtherFee');
  return { data, error: null };
};

// ===========================
// INSTALLMENTS OPERATIONS
// ===========================
export const fetchInstallments = async (pupilId: string) => {
  const { data, error } = await supabase
    .from('installments')
    .select('*, school_fees(terms(name)), pupils(grades(name))')
    .eq('pupil_id', pupilId)
    .order('created_at', { ascending: false });

  if (error) return handleSupabaseError(error, 'fetchInstallments');
  return { data: data || [], error: null };
};

// ===========================
// TRANSACTIONS OPERATIONS
// ===========================
export const fetchTransactions = async (pupilId?: string) => {
  let query = supabase.from('transactions').select('*');

  if (pupilId) query = query.eq('pupil_id', pupilId);

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) return handleSupabaseError(error, 'fetchTransactions');
  return { data: data || [], error: null };
};

// ===========================
// PAYMENT OPERATIONS (RPC)
// ===========================
export const paySchoolFee = async (params: {
  pupilId: string;
  schoolFeeId: string;
  amount: number;
  rctNo: string;
}) => {
  const { data, error } = await supabase.rpc('process_school_fee_payment', {
    p_pupil_id: params.pupilId,
    p_school_fee_id: params.schoolFeeId,
    p_amount: params.amount,
    p_rct_no: params.rctNo
  });

  if (error) return handleSupabaseError(error, 'paySchoolFee');

  if (!data?.success) {
    return { data: null, error: { message: data?.error || 'Payment processing failed' } };
  }

  return { data, error: null };
};

export const payOtherFee = async (params: {
  pupilId: string;
  otherFeeId: string;
  amount: number;
  rctNo: string;
}) => {
  const { data, error } = await supabase.rpc('process_other_fee_payment', {
    p_pupil_id: params.pupilId,
    p_other_fee_id: params.otherFeeId,
    p_amount: params.amount,
    p_rct_no: params.rctNo
  });

  if (error) return handleSupabaseError(error, 'payOtherFee');

  if (!data?.success) {
    return { data: null, error: { message: data?.error || 'Payment processing failed' } };
  }

  return { data, error: null };
};

// ===========================
// REPORTS & VIEWS
// ===========================
export const getDashboardStats = async () => {
  const { data, error } = await supabase
    .from('dashboard_stats')
    .select('*')
    .single();

  if (error) return handleSupabaseError(error, 'getDashboardStats');

  // Calculate total expected fees (2400 * pupil count)
  const totalExpectedFees = data.total_pupils * 2400;

  return {
    data: {
      ...data,
      total_expected: totalExpectedFees
    },
    error: null
  };
};

export const getPupilFinancialSummary = async (pupilId?: string) => {
  let query = supabase.from('pupil_financial_summary').select('*');

  if (pupilId) query = query.eq('id', pupilId);

  const { data, error } = await query.order('full_name');

  if (error) return handleSupabaseError(error, 'getPupilFinancialSummary');
  return { data: data || [], error: null };
};

export const getOutstandingByGrade = async () => {
  const { data, error } = await supabase
    .from('outstanding_by_grade')
    .select('*')
    .order('level_order');

  if (error) return handleSupabaseError(error, 'getOutstandingByGrade');
  return { data: data || [], error: null };
};

export const getCollectionByTerm = async () => {
  const { data, error } = await supabase
    .from('collection_by_term')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) return handleSupabaseError(error, 'getCollectionByTerm');
  return { data: data || [], error: null };
};

export const getDailyCollection = async () => {
  const { data, error } = await supabase
    .from('installments')
    .select('amount_paid, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return handleSupabaseError(error, 'getDailyCollection');

  // Group by date
  const dayMap: Record<string, { date: string; total: number }> = {};
  data?.forEach((inst) => {
    const d = new Date(inst.created_at).toISOString().split("T")[0];
    if (!dayMap[d]) dayMap[d] = { date: d, total: 0 };
    dayMap[d].total += Number(inst.amount_paid);
  });

  return { data: Object.values(dayMap), error: null };
};

// ===========================
// UTILITY FUNCTIONS
// ===========================
export const generateUUID = () => crypto.randomUUID();

// Export all functions
export default {
  // Pupils
  fetchPupil,
  fetchPupils,
  insertPupil,
  updatePupil,
  deletePupil,

  // Grades
  fetchGrades,
  fetchGrade,
  insertGrade,
  updateGrade,

  // Terms
  fetchTerms,
  fetchTerm,
  insertTerm,

  // School Fees
  fetchSchoolFees,
  fetchSchoolFee,
  insertSchoolFee,
  updateSchoolFee,

  // Other Fees
  fetchOtherFees,
  fetchOtherFee,
  insertOtherFee,
  updateOtherFee,

  // Installments
  fetchInstallments,

  // Transactions
  fetchTransactions,

  // Payments
  paySchoolFee,
  payOtherFee,

  // Reports
  getDashboardStats,
  getPupilFinancialSummary,
  getOutstandingByGrade,
  getCollectionByTerm,
  getDailyCollection,

  // Utils
  generateUUID
};
