export interface Grade {
  id: string;
  name: string;
  level_order: number;
  section: string | null;
  is_active: boolean;
  default_fees: string[];
  created_at: string;
}

export interface Term {
  id: string;
  name: string | null;
  term_number: number;
  academic_year_id: number;
  is_active: boolean;
}

export interface Pupil {
  id: string;
  full_name: string;
  sex: string;
  grade_id: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  status: 'new' | 'old' | 'admitted';
  admission_blocked: boolean;
  created_at: string;
  grades?: Grade;
  pupil_discounts?: PupilDiscount[];
}

export interface PupilDiscount {
  id: string;
  pupil_id: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applies_to: 'tuition' | 'transport' | 'lunch' | 'all';
  term_id: string | null;
  is_active: boolean;
  reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolFee {
  id: string;
  pupil_id: string;
  term_id: string;
  total_expected: number;
  collected: number;
  balance: number;
  paid_toggle: boolean;
  total_collected: number;
  created_at: string;
  terms?: Term;
  pupils?: Pupil;
}

export interface OtherFee {
  id: string;
  pupil_id: string;
  term_id: string;
  fee_type: string;
  total_expected: number;
  collected: number;
  balance: number;
  paid_toggle: boolean;
  is_enabled: boolean;
  is_active: boolean;
  created_at: string;
  terms?: Term;
  pupils?: Pupil;
}

export interface Installment {
  id: string;
  pupil_id: string;
  fee_type: 'school_fee' | 'other_fee';
  school_fee_id: string | null;
  other_fee_type: 'sports' | 'maintenance' | 'library' | 'lunch' | 'ptc' | null;
  installment_no: number;
  amount_paid: number;
  balance_remaining: number;
  RCT_no: string | null;
  date_paid: string;
  created_at: string;
  school_fees?: SchoolFee;
  pupils?: Pupil;
}

export interface FeeDefault {
  id: string;
  grade_id: string;
  fee_type: string;
  amount: number;
  created_at: string;
}

export interface SchoolSetting {
  id: string;
  key: string;
  value: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  pupil_id: string;
  fee_type: string;
  amount: number;
  installment_no: number | null;
  RCT_no: string | null;
  date_paid: string;
  recorded_by: string | null;
  created_at: string;
}
