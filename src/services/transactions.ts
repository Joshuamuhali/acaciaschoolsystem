import { supabase } from "@/integrations/supabase/client";
import type { Transaction } from "@/types";

export const getTransactions = async (pupilId?: string): Promise<Transaction[]> => {
  let query = supabase.from("transactions").select("*");
  if (pupilId) query = query.eq("pupil_id", pupilId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createTransaction = async (transaction: Omit<Transaction, "id" | "created_at">) => {
  const { data, error } = await supabase.from("transactions").insert(transaction).select().single();
  if (error) throw error;
  return data;
};
