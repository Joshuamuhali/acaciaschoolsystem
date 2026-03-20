import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/types/database";

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserRole = Database['public']['Tables']['user_roles']['Row'];

export interface SystemUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  user_roles: Array<{
    id: number;
    role: string;
    is_active: boolean;
  }>;
  school_name?: string;
}

export const systemAdminService = {
  // User management
  async createProfile(userData: {
    email: string;
    full_name: string;
    school_id: number;
    is_active: boolean;
  }): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        email: userData.email,
        full_name: userData.full_name,
        school_id: userData.school_id,
        is_active: userData.is_active
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    return data;
  },

  async assignRole(roleData: {
    user_id: string;
    role: string;
    school_id: number;
    is_active: boolean;
  }): Promise<UserRole> {
    const { data, error } = await supabase
      .from('user_roles')
      .insert(roleData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign role: ${error.message}`);
    }

    return data;
  },

  async updateProfileStatus(userId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update profile status: ${error.message}`);
    }
  },

  async deleteProfile(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to delete profile: ${error.message}`);
    }
  },

  async createRole(roleData: {
    role: string;
    description: string;
    school_id: number;
    is_active: boolean;
  }): Promise<UserRole> {
    const { data, error } = await supabase
      .from('user_roles')
      .insert(roleData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create role: ${error.message}`);
    }

    return data;
  },

  async getProfiles(): Promise<SystemUser[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles!inner(
          id,
          role,
          is_active
        ),
        schools!inner(
          name as school_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch profiles: ${error.message}`);
    }

    return data || [];
  },

  async getRoles(): Promise<UserRole[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        *,
        profiles!inner(
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }

    return data || [];
  }
};
