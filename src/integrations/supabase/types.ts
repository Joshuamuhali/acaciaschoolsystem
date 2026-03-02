export type Database = {
  public: {
    Tables: {
      grades: {
        Row: {
          id: number;
          name: string;
          level_order: number;
        };
        Insert: {
          name: string;
          level_order: number;
        };
        Update: {
          name?: string;
          level_order?: number;
        };
      };
      academic_years: {
        Row: {
          id: number;
          year_name: string;
          is_active: boolean;
        };
        Insert: {
          year_name: string;
          is_active?: boolean;
        };
        Update: {
          year_name?: string;
          is_active?: boolean;
        };
      };
      terms: {
        Row: {
          id: number;
          academic_year_id: number;
          term_number: number;
          is_active: boolean;
        };
        Insert: {
          academic_year_id: number;
          term_number: number;
          is_active?: boolean;
        };
        Update: {
          academic_year_id?: number;
          term_number?: number;
          is_active?: boolean;
        };
      };
      parents: {
        Row: {
          id: number;
          full_name: string;
          phone: string;
        };
        Insert: {
          full_name: string;
          phone?: string;
        };
        Update: {
          full_name?: string;
          phone?: string;
        };
      };
      pupils: {
        Row: {
          id: number;
          full_name: string;
          sex: 'M' | 'F';
          parent_id: number | null;
          grade_id: number | null;
          status: string;
        };
        Insert: {
          full_name: string;
          sex: 'M' | 'F';
          parent_id?: number;
          grade_id?: number;
          status?: string;
        };
        Update: {
          full_name?: string;
          sex?: 'M' | 'F';
          parent_id?: number | null;
          grade_id?: number | null;
          status?: string;
        };
      };
      enrollments: {
        Row: {
          id: number;
          pupil_id: number;
          term_id: number;
          grade_id: number;
          status: string;
          school_fees_expected: number;
          school_fees_paid: number;
          created_at: string;
        };
        Insert: {
          pupil_id: number;
          term_id: number;
          grade_id: number;
          status?: string;
          school_fees_expected?: number;
          school_fees_paid?: number;
        };
        Update: {
          pupil_id?: number;
          term_id?: number;
          grade_id?: number;
          status?: string;
          school_fees_expected?: number;
          school_fees_paid?: number;
        };
      };
      payments: {
        Row: {
          id: number;
          enrollment_id: number;
          amount: number;
          payment_date: string;
        };
        Insert: {
          enrollment_id: number;
          amount: number;
          payment_date?: string;
        };
        Update: {
          enrollment_id?: number;
          amount?: number;
          payment_date?: string;
        };
      };
      other_fee_types: {
        Row: {
          id: number;
          name: string;
          amount: number;
          term_applicable: number | null;
        };
        Insert: {
          name: string;
          amount: number;
          term_applicable?: number | null;
        };
        Update: {
          name?: string;
          amount?: number;
          term_applicable?: number | null;
        };
      };
      pupil_other_fees: {
        Row: {
          id: number;
          enrollment_id: number;
          fee_type_id: number;
          amount: number;
          amount_paid: number;
        };
        Insert: {
          enrollment_id: number;
          fee_type_id: number;
          amount: number;
          amount_paid?: number;
        };
        Update: {
          enrollment_id?: number;
          fee_type_id?: number;
          amount?: number;
          amount_paid?: number;
        };
      };
      pupil_discounts: {
        Row: {
          id: number;
          pupil_id: number;
          discount_type: 'percentage' | 'fixed';
          discount_value: number;
          applies_to: string;
          reason: string | null;
          created_by: string | null;
        };
        Insert: {
          pupil_id: number;
          discount_type: 'percentage' | 'fixed';
          discount_value: number;
          applies_to: string;
          reason?: string | null;
          created_by?: string | null;
        };
        Update: {
          pupil_id?: number;
          discount_type?: 'percentage' | 'fixed';
          discount_value?: number;
          applies_to?: string;
          reason?: string | null;
          created_by?: string | null;
        };
      };
    };
  };
};