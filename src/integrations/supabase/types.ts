export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_by: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      fees: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          grade_id: string
          id: string
          is_active: boolean
          term_number: number
          year: number
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          grade_id: string
          id?: string
          is_active?: boolean
          term_number: number
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          grade_id?: string
          id?: string
          is_active?: boolean
          term_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fees_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      parents: {
        Row: {
          account_number: string | null
          created_at: string
          full_name: string
          id: string
          phone_number: string | null
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          full_name: string
          id?: string
          phone_number?: string | null
        }
        Update: {
          account_number?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone_number?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_paid: number
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          id: string
          is_deleted: boolean
          payment_date: string
          pupil_id: string
          recorded_by: string | null
          term_number: number
          year: number
        }
        Insert: {
          amount_paid: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
          is_deleted?: boolean
          payment_date?: string
          pupil_id: string
          recorded_by?: string | null
          term_number: number
          year: number
        }
        Update: {
          amount_paid?: number
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          id?: string
          is_deleted?: boolean
          payment_date?: string
          pupil_id?: string
          recorded_by?: string | null
          term_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_pupil_id_fkey"
            columns: ["pupil_id"]
            isOneToOne: false
            referencedRelation: "pupils"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
        }
        Relationships: []
      }
      pupils: {
        Row: {
          created_at: string
          full_name: string
          grade_id: string | null
          id: string
          parent_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          full_name: string
          grade_id?: string | null
          id?: string
          parent_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          grade_id?: string | null
          id?: string
          parent_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pupils_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pupils_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "Director" | "SuperAdmin" | "SchoolAdmin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["Director", "SuperAdmin", "SchoolAdmin"],
    },
  },
} as const
