import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/types/database";

export type PupilFinancialSummary = Database['public']['Tables']['pupil_financial_summary']['Row'];

export const getPupilFinancialSummary = async (status: string = "active"): Promise<PupilFinancialSummary[]> => {
  const { data, error } = await supabase
    .from("pupil_financial_summary")
    .select("*")
    .eq("status", status)
    .order("full_name");

  if (error) {
    throw new Error(`Failed to fetch pupil financial summary: ${error.message}`);
  }

  return data || [];
};
