import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { permissions } from "./useRBAC";

export function useAuthWithPermissions() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session) {
        // Load permissions after authentication
        try {
          // This will trigger the permissions query
          setPermissionsLoaded(true);
        } catch (error) {
          console.error('Error loading permissions:', error);
        }
      } else {
        setPermissionsLoaded(false);
      }
      
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setPermissionsLoaded(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user || null;
  const role = user ? getUserRole(user) : null;

  // Permission helpers - return false if permissions not loaded yet
  const createPermissionChecker = (resource: string, action: string) => {
    return () => {
      if (!permissionsLoaded || !role) return false;
      
      // Super Admin has full access to everything
      if (role === 'SuperAdmin') return true;
      
      // School Admin has operational access but NOT governance/system access
      if (role === 'School Admin' || role === 'SchoolAdmin') {
        // Operational resources School Admin CAN access
        const operationalResources = ['pupils', 'parents', 'payments', 'fees', 'grades', 'reports'];
        const operationalActions = ['read', 'create', 'update'];
        
        // School Admin CANNOT access governance/system resources
        const governanceResources = ['system', 'users', 'audit_logs'];
        const governanceActions = ['delete', 'backup', 'restore', 'maintenance', 'settings', 'override', 'assign_role'];
        
        // Cannot access governance resources
        if (governanceResources.includes(resource)) return false;
        
        // Cannot perform governance actions
        if (governanceActions.includes(action)) return false;
        
        // Can access operational resources with basic actions
        if (operationalResources.includes(resource) && operationalActions.includes(action)) {
          // Special case: payments - School Admin cannot delete/override unless policy allows
          if (resource === 'payments' && (action === 'delete' || action === 'adjust' || action === 'refund')) {
            return false; // Only Super Admin can delete/adjust payments
          }
          
          // Special case: fees - School Admin can create/update but system governs structure
          if (resource === 'fees' && action === 'delete') {
            return false; // Cannot delete fee structures
          }
          
          return true;
        }
        
        return false;
      }
      
      // Director has most access except system-level controls
      if (role === 'Director') {
        // Directors can access most things except system settings and user management
        if (resource === 'system' || resource === 'users') return false;
        if (['backup', 'restore', 'maintenance', 'override'].includes(action)) return false;
        return true;
      }
      
      return false;
    };
  };

  // Helper to check if user is School Admin (operational role)
  const isSchoolAdmin = () => role === 'School Admin' || role === 'SchoolAdmin';
  
  // Helper to check if user is Super Admin (governance role)
  const isSuperAdmin = () => role === 'SuperAdmin';
  
  // Helper to check if user can access emergency features
  const canAccessEmergency = () => role === 'SuperAdmin';

  // High-level permissions - return functions for consistency
  const canAccessAdminPanel = createPermissionChecker('system', 'settings');
  const canManageUsers = createPermissionChecker('users', 'create');
  const canManageFinancials = createPermissionChecker('payments', 'create');
  const canPerformSystemActions = createPermissionChecker('system', 'backup');

  return {
    session,
    user,
    role,
    loading,
    permissionsLoaded,
    isAuthenticated: !!session,
    
    // Role helpers
    isSchoolAdmin,
    isSuperAdmin,
    canAccessEmergency,
    
    // Permission helpers
    canCreateUsers: createPermissionChecker('users', 'create'),
    canReadUsers: createPermissionChecker('users', 'read'),
    canUpdateUsers: createPermissionChecker('users', 'update'),
    canDeleteUsers: createPermissionChecker('users', 'delete'),
    canActivateUsers: createPermissionChecker('users', 'activate'),
    canAssignRoles: createPermissionChecker('users', 'assign_role'),
    canResetPasswords: createPermissionChecker('users', 'reset_password'),
    
    canCreatePupils: createPermissionChecker('pupils', 'create'),
    canReadPupils: createPermissionChecker('pupils', 'read'),
    canUpdatePupils: createPermissionChecker('pupils', 'update'),
    canDeletePupils: createPermissionChecker('pupils', 'delete'),
    
    canCreateParents: createPermissionChecker('parents', 'create'),
    canReadParents: createPermissionChecker('parents', 'read'),
    canUpdateParents: createPermissionChecker('parents', 'update'),
    canDeleteParents: createPermissionChecker('parents', 'delete'),
    
    canCreatePayments: createPermissionChecker('payments', 'create'),
    canReadPayments: createPermissionChecker('payments', 'read'),
    canUpdatePayments: createPermissionChecker('payments', 'update'),
    canDeletePayments: createPermissionChecker('payments', 'delete'),
    canSoftDeletePayments: createPermissionChecker('payments', 'soft_delete'),
    canApproveDeletions: createPermissionChecker('payments', 'approve_delete'),
    canAdjustPayments: createPermissionChecker('payments', 'adjust'),
    canRefundPayments: createPermissionChecker('payments', 'refund'),
    
    canCreateFees: createPermissionChecker('fees', 'create'),
    canReadFees: createPermissionChecker('fees', 'read'),
    canUpdateFees: createPermissionChecker('fees', 'update'),
    canDeleteFees: createPermissionChecker('fees', 'delete'),
    canActivateFees: createPermissionChecker('fees', 'activate'),
    
    canReadAuditLogs: createPermissionChecker('audit_logs', 'read'),
    canExportAuditLogs: createPermissionChecker('audit_logs', 'export'),
    canReadReports: createPermissionChecker('reports', 'read'),
    canCreateReports: createPermissionChecker('reports', 'create'),
    canExportReports: createPermissionChecker('reports', 'export'),
    
    canManageSettings: createPermissionChecker('system', 'settings'),
    canCreateBackups: createPermissionChecker('system', 'backup'),
    canRestoreBackups: createPermissionChecker('system', 'restore'),
    canPerformMaintenance: createPermissionChecker('system', 'maintenance'),
    
    canLockTerms: createPermissionChecker('term', 'lock'),
    canUnlockTerms: createPermissionChecker('term', 'unlock'),
    canOverrideTerms: createPermissionChecker('term', 'override'),
    
    canCreateGrades: createPermissionChecker('grades', 'create'),
    canReadGrades: createPermissionChecker('grades', 'read'),
    canUpdateGrades: createPermissionChecker('grades', 'update'),
    canDeleteGrades: createPermissionChecker('grades', 'delete'),
    
    // High-level permissions
    canAccessAdminPanel,
    canManageUsers,
    canManageFinancials,
    canPerformSystemActions,
  };
}

// Helper function to get user role from metadata
function getUserRole(user: any): string | null {
  // Temporary override for Super Admin
  if (user?.email === 'acaciaprojects86@gmail.com') {
    return 'SuperAdmin';
  }
  return user?.user_metadata?.role || null;
}

// Permission checking hook for specific actions
export function usePermission(resource: string, action: string) {
  const { loading, permissionsLoaded } = useAuthWithPermissions();
  
  const hasPermission = permissions[`can${resource.charAt(0).toUpperCase() + resource.slice(1)}${action.charAt(0).toUpperCase() + action.slice(1)}`]();
  
  return {
    hasPermission,
    loading: loading || !permissionsLoaded,
  };
}

// Role-based hook
export function useRole() {
  const { role, loading } = useAuthWithPermissions();
  
  return {
    role,
    loading,
    isSuperAdmin: role === "SuperAdmin",
    isDirector: role === "Director",
    isSchoolAdmin: role === "SchoolAdmin",
    isAdmin: ["SuperAdmin", "Director"].includes(role || ""),
    hasAnyRole: !!role,
  };
}
