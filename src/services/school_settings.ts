import { supabase } from "@/lib/supabase";
import type { SchoolSetting } from "@/types";

export const getSchoolSettings = async (): Promise<SchoolSetting[]> => {
  const { data, error } = await supabase.from("school_settings").select("*");
  if (error) throw error;
  return data;
};

export const getSchoolSetting = async (key: string): Promise<SchoolSetting> => {
  const { data, error } = await supabase.from("school_settings").select("*").eq("key", key).single();
  if (error) throw error;
  return data;
};

export const updateSchoolSetting = async (key: string, value: string) => {
  const { data, error } = await supabase.from("school_settings").update({ value }).eq("key", key).select().single();
  if (error) throw error;
  return data;
};
