export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      currencies: {
        Row: {
          id: string
          code: string
          name: string | null
          symbol: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          name?: string | null
          symbol?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string | null
          symbol?: string | null
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: Database['public']['Enums']['app_role']
        }
        Insert: {
          id?: string
          user_id: string
          role: Database['public']['Enums']['app_role']
        }
        Update: {
          id?: string
          user_id?: string
          role?: Database['public']['Enums']['app_role']
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          created_at?: string
        }
      }
      school_settings: {
        Row: {
          id: string
          school_name: string
          color_primary: string
          color_secondary: string
          logo_url: string | null
          allow_partial_payments: boolean
          max_installments: number
          currency_symbol: string
          academic_year_start_month: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_name?: string
          color_primary?: string
          color_secondary?: string
          logo_url?: string | null
          allow_partial_payments?: boolean
          max_installments?: number
          currency_symbol?: string
          academic_year_start_month?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_name?: string
          color_primary?: string
          color_secondary?: string
          logo_url?: string | null
          allow_partial_payments?: boolean
          max_installments?: number
          currency_symbol?: string
          academic_year_start_month?: number
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          action_type: string
          table_name: string
          record_id: string | null
          performed_by: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          action_type: string
          table_name: string
          record_id?: string | null
          performed_by?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          action_type?: string
          table_name?: string
          record_id?: string | null
          performed_by?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      grades: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      parents: {
        Row: {
          id: string
          full_name: string
          phone_number: string | null
          account_number: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          phone_number?: string | null
          account_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          phone_number?: string | null
          account_number?: string | null
          created_at?: string
        }
      }
      pupils: {
        Row: {
          id: string
          full_name: string
          sex: 'M' | 'F' | null
          grade_id: string | null
          parent_id: string | null
          status: string
          currency_id: string | null
          tuition_fee: number
          other_fee: number
          amount_paid: number
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          sex?: 'M' | 'F' | null
          grade_id?: string | null
          parent_id?: string | null
          status?: string
          currency_id?: string | null
          tuition_fee?: number
          other_fee?: number
          amount_paid?: number
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          sex?: 'M' | 'F' | null
          grade_id?: string | null
          parent_id?: string | null
          status?: string
          currency_id?: string | null
          tuition_fee?: number
          other_fee?: number
          amount_paid?: number
          created_at?: string
        }
      }
      fees: {
        Row: {
          id: string
          grade_id: string
          term_number: 1 | 2 | 3
          year: number
          amount: number
          created_by: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          grade_id: string
          term_number: 1 | 2 | 3
          year: number
          amount: number
          created_by?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          grade_id?: string
          term_number?: 1 | 2 | 3
          year?: number
          amount?: number
          created_by?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          pupil_id: string
          term_number: 1 | 2 | 3
          year: number
          amount_paid: number
          payment_date: string
          recorded_by: string | null
          is_deleted: boolean
          deleted_by: string | null
          deleted_at: string | null
          deletion_reason: string | null
          approval_status: 'approved' | 'pending_approval' | 'rejected'
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pupil_id: string
          term_number: 1 | 2 | 3
          year: number
          amount_paid: number
          payment_date?: string
          recorded_by?: string | null
          is_deleted?: boolean
          deleted_by?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          approval_status?: 'approved' | 'pending_approval' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pupil_id?: string
          term_number?: 1 | 2 | 3
          year?: number
          amount_paid?: number
          payment_date?: string
          recorded_by?: string | null
          is_deleted?: boolean
          deleted_by?: string | null
          deleted_at?: string | null
          deletion_reason?: string | null
          approval_status?: 'approved' | 'pending_approval' | 'rejected'
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string
        }
      }
      term_lock: {
        Row: {
          id: string
          term_number: 1 | 2 | 3
          year: number
          is_locked: boolean
          locked_by: string | null
          locked_at: string | null
          lock_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          term_number: 1 | 2 | 3
          year: number
          is_locked?: boolean
          locked_by?: string | null
          locked_at?: string | null
          lock_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          term_number?: 1 | 2 | 3
          year?: number
          is_locked?: boolean
          locked_by?: string | null
          locked_at?: string | null
          lock_reason?: string | null
          created_at?: string
        }
      }
      permissions: {
        Row: {
          id: string
          name: string
          description: string | null
          resource: string
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          resource: string
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          resource?: string
          action?: string
          created_at?: string
        }
      }
      role_permissions: {
        Row: {
          id: string
          role: Database['public']['Enums']['app_role']
          permission_id: string
          granted_by: string | null
          granted_at: string
        }
        Insert: {
          id?: string
          role: Database['public']['Enums']['app_role']
          permission_id: string
          granted_by?: string | null
          granted_at?: string
        }
        Update: {
          id?: string
          role?: Database['public']['Enums']['app_role']
          permission_id?: string
          granted_by?: string | null
          granted_at?: string
        }
      }
      user_permissions: {
        Row: {
          id: string
          user_id: string
          permission_id: string
          granted: boolean
          granted_by: string | null
          granted_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          permission_id: string
          granted?: boolean
          granted_by?: string | null
          granted_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          permission_id?: string
          granted?: boolean
          granted_by?: string | null
          granted_at?: string
          expires_at?: string | null
        }
      }
      resource_access_log: {
        Row: {
          id: string
          user_id: string | null
          resource: string
          action: string
          resource_id: string | null
          ip_address: string | null
          user_agent: string | null
          success: boolean
          denial_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          resource: string
          action: string
          resource_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          denial_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          resource?: string
          action?: string
          resource_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          success?: boolean
          denial_reason?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      balance_per_pupil: {
        Row: {
          pupil_id: string
          pupil_name: string
          grade_name: string | null
          parent_name: string | null
          expected_amount: number
          collected_amount: number
          balance_amount: number
          payment_status: 'paid' | 'partial' | 'unpaid'
        }
      }
      grade_summary: {
        Row: {
          grade_id: string
          grade_name: string
          total_pupils: number
          total_expected: number
          total_collected: number
          total_pending: number
        }
      }
      pending_deletion_approvals: {
        Row: {
          payment_id: string
          pupil_id: string
          pupil_name: string
          grade_name: string | null
          amount_paid: number
          payment_date: string
          deletion_reason: string | null
          deleted_at: string | null
          recorded_by_name: string | null
          deleted_by_name: string | null
        }
      }
      users_with_roles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: Database['public']['Enums']['app_role'] | null
          created_at: string
          last_sign_in_at: string | null
        }
      }
      permission_matrix: {
        Row: {
          role: string
          permission_name: string
          resource: string
          action: string
          granted_at: string
          source_type: string
        }
      }
      recent_access_attempts: {
        Row: {
          created_at: string
          email: string
          resource: string
          action: string
          success: boolean
          denial_reason: string | null
          ip_address: string | null
          user_agent: string | null
        }
      }
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database['public']['Enums']['app_role']
        }
        Returns: boolean
      }
      has_any_role: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
      get_user_role: {
        Args: {
          _user_id: string
        }
        Returns: Database['public']['Enums']['app_role']
      }
      has_permission: {
        Args: {
          _user_id: string
          _resource: string
          _action: string
        }
        Returns: boolean
      }
      get_user_permissions: {
        Args: {
          _user_id: string
        }
        Returns: Array<{
          permission_name: string
          resource: string
          action: string
          source: string
          granted_at: string
          expires_at: string | null
        }>
      }
      log_resource_access: {
        Args: {
          _user_id: string
          _resource: string
          _action: string
          _resource_id?: string
          _success?: boolean
          _denial_reason?: string
        }
        Returns: void
      }
    }
    Enums: {
      app_role: 'Director' | 'SuperAdmin' | 'SchoolAdmin'
    }
  }
}
