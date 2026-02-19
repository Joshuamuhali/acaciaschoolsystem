import { ReactNode } from "react";
import { useUserRole } from "@/hooks/useAuth";
import { permissions } from "@/hooks/useRBAC";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, AlertTriangle } from "lucide-react";

interface PermissionGuardProps {
  children: ReactNode;
  resource: string;
  action: string;
  fallback?: ReactNode;
  showMessage?: boolean;
}

export function PermissionGuard({ 
  children, 
  resource, 
  action, 
  fallback, 
  showMessage = true 
}: PermissionGuardProps) {
  const { role: currentUserRole, loading } = useUserRole();
  const hasPermission = permissions[`can${resource.charAt(0).toUpperCase() + resource.slice(1)}${action.charAt(0).toUpperCase() + action.slice(1)}`]();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-24">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showMessage) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Access Restricted</p>
            <p className="text-sm">
              You don't have permission to {action} {resource}.
              {currentUserRole && ` Current role: ${currentUserRole}`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// Higher-level permission guards for common use cases
export function AdminOnly({ children }: { children: ReactNode }) {
  const { role: currentUserRole } = useUserRole();
  
  if (!["SuperAdmin", "Director"].includes(currentUserRole || "")) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Admin Access Required</p>
            <p className="text-sm">This feature requires administrative privileges.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

export function SuperAdminOnly({ children }: { children: ReactNode }) {
  const { role: currentUserRole } = useUserRole();
  
  if (currentUserRole !== "SuperAdmin") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Super Admin Access Required</p>
            <p className="text-sm">This feature is only available to Super Admins.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

export function FinancialOnly({ children }: { children: ReactNode }) {
  const canManageFinancials = permissions.canManageFinancials();
  
  if (!canManageFinancials) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Financial Access Required</p>
            <p className="text-sm">You don't have permission to manage financial operations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

export function SystemOnly({ children }: { children: ReactNode }) {
  const canPerformSystemActions = permissions.canPerformSystemActions();
  
  if (!canPerformSystemActions) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">System Access Required</p>
            <p className="text-sm">You don't have permission to perform system operations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
