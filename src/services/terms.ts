import { supabase } from "@/integrations/supabase/client";
import type { Term } from "@/types";

export const getTerms = async (): Promise<Term[]> => {
  const { data, error } = await supabase.from("terms").select("*").order("start_date", { ascending: false });
  if (error) throw error;
  return data;
};

export const createTerm = async (term: Omit<Term, "id" | "created_at">) => {
  const { data, error } = await supabase.from("terms").insert(term).select().single();
  if (error) throw error;
  return data;
};

export const deleteTerm = async (id: string) => {
  const { error } = await supabase.from("terms").delete().eq("id", id);
  if (error) throw error;
};

export const updateTerm = async (id: string, term: Partial<Term>) => {
  const { data, error } = await supabase.from("terms").update(term).eq("id", id).select().single();
  if (error) throw error;
  return data;
};
