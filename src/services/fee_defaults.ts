import { supabase } from "@/integrations/supabase/client";
import type { FeeDefault } from "@/types";

export const getFeeDefaults = async (): Promise<FeeDefault[]> => {
  const { data, error } = await supabase.from("fee_defaults").select("*");
  if (error) throw error;
  return data;
};

export const createFeeDefault = async (fee: Omit<FeeDefault, "id" | "created_at">) => {
  const { data, error } = await supabase.from("fee_defaults").insert(fee).select().single();
  if (error) throw error;
  return data;
};

export const updateFeeDefault = async (id: string, fee: Partial<FeeDefault>) => {
  const { data, error } = await supabase.from("fee_defaults").update(fee).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteFeeDefault = async (id: string) => {
  const { error } = await supabase.from("fee_defaults").delete().eq("id", id);
  if (error) throw error;
};
