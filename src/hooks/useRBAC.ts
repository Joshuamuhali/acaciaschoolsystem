import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

// Permission checking hook
export function useUserPermissions() {
  return useQuery({
    queryKey: ["user_permissions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_user_permissions", {
        _user_id: user.id,
      });
      if (error) throw error;
      return data || [];
    },
  });
}

// Check specific permission
export function useHasPermission(resource: string, action: string) {
  const { data: permissions } = useUserPermissions();
  
  return permissions?.some(
    (p: any) => p.resource === resource && p.action === action
  ) || false;
}

// Permission matrix for admin
export function usePermissionMatrix() {
  return useQuery({
    queryKey: ["permission_matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permission_matrix" as any)
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });
}

// Recent access attempts
export function useRecentAccessAttempts() {
  return useQuery({
    queryKey: ["recent_access_attempts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recent_access_attempts" as any)
        .select("*")
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

// Grant permission to user
export function useGrantUserPermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      permissionId, 
      granted, 
      expiresAt 
    }: { 
    userId: string; 
    permissionId: string; 
    granted: boolean; 
    expiresAt?: string;
  }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("user_permissions" as any)
        .upsert({
          user_id: userId,
          permission_id: permissionId,
          granted,
          granted_by: user?.id,
          expires_at: expiresAt,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_permissions"] });
      queryClient.invalidateQueries({ queryKey: ["permission_matrix"] });
      toast.success("Permission updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Grant permission to role
export function useGrantRolePermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      role, 
      permissionId 
    }: { 
    role: string; 
    permissionId: string;
  }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("role_permissions" as any)
        .upsert({
          role,
          permission_id: permissionId,
          granted_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission_matrix"] });
      toast.success("Role permission updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Revoke permission from user
export function useRevokeUserPermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, permissionId }: { userId: string; permissionId: string }) => {
      const { error } = await supabase
        .from("user_permissions" as any)
        .delete()
        .eq("user_id", userId)
        .eq("permission_id", permissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_permissions"] });
      queryClient.invalidateQueries({ queryKey: ["permission_matrix"] });
      toast.success("Permission revoked");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Revoke permission from role
export function useRevokeRolePermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ role, permissionId }: { role: string; permissionId: string }) => {
      const { error } = await supabase
        .from("role_permissions" as any)
        .delete()
        .eq("role", role)
        .eq("permission_id", permissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission_matrix"] });
      toast.success("Role permission revoked");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Get all available permissions
export function useAllPermissions() {
  return useQuery({
    queryKey: ["all_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions" as any)
        .select("*")
        .order("resource, action");
      if (error) throw error;
      return data || [];
    },
  });
}

// Permission checking utility functions
export const permissions = {
  // User Management
  canCreateUsers: () => useHasPermission('users', 'create'),
  canReadUsers: () => useHasPermission('users', 'read'),
  canUpdateUsers: () => useHasPermission('users', 'update'),
  canDeleteUsers: () => useHasPermission('users', 'delete'),
  canActivateUsers: () => useHasPermission('users', 'activate'),
  canAssignRoles: () => useHasPermission('users', 'assign_role'),
  canResetPasswords: () => useHasPermission('users', 'reset_password'),
  
  // Pupil Management
  canCreatePupils: () => useHasPermission('pupils', 'create'),
  canReadPupils: () => useHasPermission('pupils', 'read'),
  canUpdatePupils: () => useHasPermission('pupils', 'update'),
  canDeletePupils: () => useHasPermission('pupils', 'delete'),
  
  // Parent Management
  canCreateParents: () => useHasPermission('parents', 'create'),
  canReadParents: () => useHasPermission('parents', 'read'),
  canUpdateParents: () => useHasPermission('parents', 'update'),
  canDeleteParents: () => useHasPermission('parents', 'delete'),
  
  // Payment Management
  canCreatePayments: () => useHasPermission('payments', 'create'),
  canReadPayments: () => useHasPermission('payments', 'read'),
  canUpdatePayments: () => useHasPermission('payments', 'update'),
  canDeletePayments: () => useHasPermission('payments', 'delete'),
  canSoftDeletePayments: () => useHasPermission('payments', 'soft_delete'),
  canApproveDeletions: () => useHasPermission('payments', 'approve_delete'),
  canAdjustPayments: () => useHasPermission('payments', 'adjust'),
  canRefundPayments: () => useHasPermission('payments', 'refund'),
  
  // Fee Management
  canCreateFees: () => useHasPermission('fees', 'create'),
  canReadFees: () => useHasPermission('fees', 'read'),
  canUpdateFees: () => useHasPermission('fees', 'update'),
  canDeleteFees: () => useHasPermission('fees', 'delete'),
  canActivateFees: () => useHasPermission('fees', 'activate'),
  
  // Audit & Reporting
  canReadAuditLogs: () => useHasPermission('audit_logs', 'read'),
  canExportAuditLogs: () => useHasPermission('audit_logs', 'export'),
  canReadReports: () => useHasPermission('reports', 'read'),
  canCreateReports: () => useHasPermission('reports', 'create'),
  canExportReports: () => useHasPermission('reports', 'export'),
  
  // System Administration
  canManageSettings: () => useHasPermission('system', 'settings'),
  canCreateBackups: () => useHasPermission('system', 'backup'),
  canRestoreBackups: () => useHasPermission('system', 'restore'),
  canPerformMaintenance: () => useHasPermission('system', 'maintenance'),
  
  // Term Management
  canLockTerms: () => useHasPermission('term', 'lock'),
  canUnlockTerms: () => useHasPermission('term', 'unlock'),
  canOverrideTerms: () => useHasPermission('term', 'override'),
  
  // Grade Management
  canCreateGrades: () => useHasPermission('grades', 'create'),
  canReadGrades: () => useHasPermission('grades', 'read'),
  canUpdateGrades: () => useHasPermission('grades', 'update'),
  canDeleteGrades: () => useHasPermission('grades', 'delete'),
};

// Higher-level permission checks
export const canAccessAdminPanel = () => {
  const canReadUsers = permissions.canReadUsers();
  const canManageSettings = permissions.canManageSettings();
  const canReadAuditLogs = permissions.canReadAuditLogs();
  return canReadUsers || canManageSettings || canReadAuditLogs;
};

export const canManageUsers = () => {
  const canCreate = permissions.canCreateUsers();
  const canUpdate = permissions.canUpdateUsers();
  const canDelete = permissions.canDeleteUsers();
  const canAssignRoles = permissions.canAssignRoles();
  return canCreate || canUpdate || canDelete || canAssignRoles;
};

export const canManageFinancials = () => {
  const canCreatePayments = permissions.canCreatePayments();
  const canUpdatePayments = permissions.canUpdatePayments();
  const canCreateFees = permissions.canCreateFees();
  const canUpdateFees = permissions.canUpdateFees();
  const canApproveDeletions = permissions.canApproveDeletions();
  return canCreatePayments || canUpdatePayments || canCreateFees || canUpdateFees || canApproveDeletions;
};

export const canPerformSystemActions = () => {
  const canManageSettings = permissions.canManageSettings();
  const canCreateBackups = permissions.canCreateBackups();
  const canPerformMaintenance = permissions.canPerformMaintenance();
  const canOverrideTerms = permissions.canOverrideTerms();
  return canManageSettings || canCreateBackups || canPerformMaintenance || canOverrideTerms;
};
