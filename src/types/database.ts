import { supabase } from '../lib/supabase';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  address?: string;
  school_id: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  user_roles: UserRole[];
}

export interface UserRole {
  id: number;
  user_id: string;
  school_id: number;
  role: 'system_admin' | 'director' | 'principal' | 'school_admin';
  is_active: boolean;
}

export interface Pupil {
  id: string;
  full_name: string;
  sex: string;
  grade_id: string;
  school_id: number;
  status: string;
  // Add other fields as needed
}

export interface Parent {
  id: string;
  full_name: string;
  phone: string;
  school_id: number;
  // Add other fields
}

export interface Payment {
  id: string;
  pupil_id: string;
  amount: number;
  status: 'draft' | 'posted' | 'voided';
  created_by: string;
  posted_at: string | null;
  posted_by: string | null;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  school_id: number;
}

export interface Enrollment {
  id: number;
  pupil_id: string;
  term_id: string;
  grade_id: string | null;
  status: string;
  school_fees_expected: number;
  school_fees_paid: number;
  school_id: number;
}

export interface TransportRoute {
  id: number;
  route_name: string;
  region: string;
  fee_amount: number;
  active: boolean;
  school_id: number;
}

export interface PupilTransportAssignment {
  id: number;
  enrollment_id: number;
  route_id: number;
  amount_expected: number;
  amount_paid: number;
  school_id: number;
}

export interface OtherFeeType {
  id: number;
  name: string;
  amount: number;
  term_applicable: number | null;
  school_id: number;
}

export interface PupilOtherFee {
  id: number;
  enrollment_id: number;
  fee_type_id: number;
  amount: number;
  amount_paid: number;
  is_enabled: boolean;
  school_id: number;
}
