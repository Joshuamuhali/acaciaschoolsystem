import { supabase } from "@/lib/supabase";
import type { Pupil } from "@/types";

export const getPupil = async (id: string): Promise<Pupil> => {
  const { data, error } = await supabase.from("pupils").select("*, grades(name)").eq("id", id).single();
  if (error) throw error;
  return data as Pupil;
};

export const getPupils = async (gradeId?: string): Promise<Pupil[]> => {
  let query = supabase.from("pupils").select("*, grades(name)", { count: 'exact' });

  if (gradeId) {
    query = query.eq("grade_id", gradeId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Pupil[];
};

export const createPupil = async (pupil: Omit<Pupil, "id" | "grades" | "created_at">) => {
  const { data, error } = await supabase.from("pupils").insert(pupil).select().single();
  if (error) throw error;
  return data as Pupil;
};

export const updatePupil = async (id: string, updates: Partial<Pupil>) => {
  const { data, error } = await supabase.from("pupils").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data as Pupil;
};

export const deletePupil = async (id: string) => {
  const { error } = await supabase.from("pupils").delete().eq("id", id);
  if (error) throw error;
};
