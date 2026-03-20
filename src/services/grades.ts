import { supabase } from "@/lib/supabase";
import type { Grade } from "@/types";

export const getGrades = async (): Promise<Grade[]> => {
  const { data, error } = await supabase.from("grades").select("*").order("name");
  if (error) throw error;
  return data as unknown as Grade[];
};

export const createGrade = async (grade: Omit<Grade, "id" | "created_at">) => {
  const { data, error } = await supabase.from("grades").insert(grade).select().single();
  if (error) throw error;

  const grade_id = data.id;

  // Get active default fees
  // const { data: activeFees, error: feeError } = await supabase.from("default_fee_settings").select("fee_type", "amount").eq("is_active", true);
  // if (feeError) throw feeError;

  // Insert into fee_defaults
  // if (activeFees && activeFees.length > 0) {
  //   const feeDefaults = activeFees.map(fee => ({
  //     grade_id,
  //     fee_type: fee.fee_type,
  //     amount: fee.amount
  //   }));
  //   const { error: insertError } = await supabase.from("fee_defaults").insert(feeDefaults);
  //   if (insertError) throw insertError;
  // }

  return data;
};

export const updateGrade = async (id: string, grade: Partial<Grade>) => {
  const { data, error } = await supabase.from("grades").update(grade).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteGrade = async (id: string) => {
  const { error } = await supabase.from("grades").delete().eq("id", id);
  if (error) throw error;
};

export const getGradeCounts = async (): Promise<{ id: string; name: string; count: number }[]> => {
  const [grades, pupils] = await Promise.all([
    getGrades(),
    supabase.from("pupils").select("grade_id, status"), // Get all pupils with status
  ]);
  const counts = grades.map((g) => ({
    id: g.id,
    name: g.name,
    count: pupils.data?.filter((p) => p.grade_id === g.id).length ?? 0, // Count all pupils in the grade
  }));
  return counts;
};
