import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

// School Settings
export function useSchoolSettings() {
  return useQuery({
    queryKey: ["school_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_settings" as any)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateSchoolSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: any) => {
      const { error } = await supabase
        .from("school_settings" as any)
        .update(settings)
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school_settings"] });
      toast.success("School settings updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Enhanced User Management
export function useEnhancedUsers() {
  return useQuery({
    queryKey: ["enhanced_users"],
    queryFn: async () => {
      // Get users from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*");
      
      if (profilesError) throw profilesError;
      
      // Get roles for each profile
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile: any) => {
          const { data: role } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id)
            .single();
          
          return {
            id: profile.id,
            email: profile.email || 'No email',
            full_name: profile.full_name || profile.email || 'Unknown User',
            role: role?.role || 'School Admin',
            status: 'active',
            pupils_managed: 0,
            created_at: profile.created_at,
            last_sign_in: profile.updated_at || profile.created_at,
            email_confirmed: profile.created_at // Assuming created means confirmed
          };
        })
      );
      
      return usersWithRoles;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      fullName, 
      role 
    }: { 
      email: string; 
      password: string; 
      fullName: string; 
      role: "Director" | "SuperAdmin" | "SchoolAdmin";
    }) => {
      // Step 1: Create user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Step 2: Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: authData.user.id, role });

      if (roleError) throw roleError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enhanced_users"] });
      toast.success("User created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      newRole 
    }: { 
      userId: string; 
      newRole: "Director" | "SuperAdmin" | "SchoolAdmin";
    }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enhanced_users"] });
      toast.success("User role updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      // Delete user role first
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Delete user from auth
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enhanced_users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase.rpc("toggle_user_status" as any, {
        user_id: userId,
        is_active: isActive,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enhanced_users"] });
      toast.success("User status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Enhanced Audit Logs
export function useEnhancedAuditLogs(filters?: {
  tableName?: string;
  actionType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ["enhanced_audit_logs", filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_filtered_audit_logs" as any, {
        p_table_name: filters?.tableName,
        p_action_type: filters?.actionType,
        p_user_id: filters?.userId,
        p_start_date: filters?.startDate,
        p_end_date: filters?.endDate,
        p_limit: 100,
      });
      if (error) throw error;
      return data;
    },
  });
}

// Term Lock Override
export function useOverrideTermLock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      termNumber, 
      year, 
      reason 
    }: { 
      termNumber: number; 
      year: number; 
      reason: string;
    }) => {
      const { error } = await supabase.rpc("override_term_lock" as any, {
        term_number: termNumber,
        year: year,
        override_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["term_lock"] });
      toast.success("Term lock overridden");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Balance Adjustment
export function useAdjustPaymentBalance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      paymentId, 
      newAmount, 
      reason 
    }: { 
      paymentId: string; 
      newAmount: number; 
      reason: string;
    }) => {
      const { error } = await supabase.rpc("adjust_payment_balance" as any, {
        payment_id: paymentId,
        new_amount: newAmount,
        adjustment_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["balance_per_pupil"] });
      toast.success("Payment balance adjusted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// System Statistics for Dashboard
export function useSystemStats() {
  return useQuery({
    queryKey: ["system_stats"],
    queryFn: async () => {
      const [
        usersResult,
        pupilsResult,
        parentsResult,
        paymentsResult,
        feesResult,
        termLockResult
      ] = await Promise.all([
        supabase.from("users_with_roles_enhanced" as any).select("id, role, status"),
        supabase.from("pupils").select("id, status"),
        supabase.from("parents").select("id"),
        supabase.from("payments").select("id, amount_paid, is_deleted, term_number, year"),
        supabase.from("fees").select("id, amount, is_active"),
        supabase.from("term_lock" as any).select("is_locked, term_number, year")
      ]);

      const users = usersResult.data || [];
      const pupils = pupilsResult.data || [];
      const parents = parentsResult.data || [];
      const payments = paymentsResult.data || [];
      const fees = feesResult.data || [];
      const termLocks = termLockResult.data || [];

      const currentYear = new Date().getFullYear();
      const currentTerm = 1;

      // Calculate statistics
      const totalExpected = fees
        .filter((f: any) => f.is_active)
        .reduce((sum, f) => sum + Number((f as any).amount), 0);

      const totalCollected = payments
        .filter((p: any) => !(p as any).is_deleted && (p as any).term_number === currentTerm && (p as any).year === currentYear)
        .reduce((sum, p) => sum + Number((p as any).amount_paid), 0);

      const pendingApprovals = payments.filter((p: any) => (p as any).is_deleted).length;

      const lockedTerms = termLocks.filter((tl: any) => (tl as any).is_locked).length;

      return {
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => (u as any).status === 'active').length,
        totalPupils: pupils.filter((p: any) => (p as any).status === 'active').length,
        totalParents: parents.length,
        totalExpected,
        totalCollected,
        outstandingBalance: totalExpected - totalCollected,
        pendingApprovals,
        lockedTerms,
        totalFees: fees.filter((f: any) => (f as any).is_active).length,
        usersByRole: {
          SuperAdmin: users.filter((u: any) => (u as any).role === 'SuperAdmin').length,
          Director: users.filter((u: any) => (u as any).role === 'Director').length,
          SchoolAdmin: users.filter((u: any) => (u as any).role === 'SchoolAdmin').length,
        },
        recentActivity: payments.slice(-5).reverse(),
      };
    },
  });
}
