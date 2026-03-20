import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/types/database";

export type OtherFeeType = Database['public']['Tables']['other_fee_types']['Row'];

export const getOtherFeeTypes = async (): Promise<OtherFeeType[]> => {
  const { data, error } = await supabase
    .from('other_fee_types')
    .select('*')
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch other fee types: ${error.message}`);
  }

  return data || [];
};
