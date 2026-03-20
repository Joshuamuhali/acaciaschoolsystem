import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/types/database";

export type Grade = Database['public']['Tables']['grades']['Row'];
export type OtherFeeType = Database['public']['Tables']['other_fee_types']['Row'];
export type Pupil = Database['public']['Tables']['pupils']['Row'];
export type Enrollment = Database['public']['Tables']['enrollments']['Row'];
export type PupilOtherFee = Database['public']['Tables']['pupil_other_fees']['Row'];

export interface GradeFeeDefaults {
  grade_id: number;
  school_fee_amount: number;
  other_fees: number[];
}

export const getGrades = async (): Promise<Grade[]> => {
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch grades: ${error.message}`);
  }

  return data || [];
};

export const getOtherFeeTypes = async (enabled: boolean = true): Promise<OtherFeeType[]> => {
  const { data, error } = await supabase
    .from('other_fee_types')
    .select('*')
    .eq('is_enabled', enabled)
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch other fee types: ${error.message}`);
  }

  return data || [];
};

export const getPupilsInGrade = async (gradeId: number): Promise<Pupil[]> => {
  const { data, error } = await supabase
    .from('pupils')
    .select('id, enrollments(id)')
    .eq('grade_id', gradeId);

  if (error) {
    throw new Error(`Failed to fetch pupils in grade: ${error.message}`);
  }

  return data || [];
};

export const updateEnrollmentSchoolFees = async (enrollmentId: number, amount: number): Promise<void> => {
  const { error } = await supabase
    .from('enrollments')
    .update({ school_fees_expected: amount })
    .eq('id', enrollmentId);

  if (error) {
    throw new Error(`Failed to update enrollment school fees: ${error.message}`);
  }
};

export const upsertPupilOtherFee = async (enrollmentId: number, feeId: number, amount: number): Promise<void> => {
  const { error } = await supabase
    .from('pupil_other_fees')
    .upsert({
      enrollment_id: enrollmentId,
      other_fee_id: feeId,
      amount: amount
    });

  if (error) {
    throw new Error(`Failed to upsert pupil other fee: ${error.message}`);
  }
};
