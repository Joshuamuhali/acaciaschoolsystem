import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, AlertTriangle } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  resource?: string;
  action?: string;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  resource, 
  action, 
  fallback, 
  redirectTo = "/dashboard" 
}: ProtectedRouteProps) {
  const { 
    isAuthenticated, 
    loading, 
    role,
    canAccessAdminPanel,
    canManageUsers,
    canManageFinancials,
    canPerformSystemActions
  } = useAuthWithPermissions();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super Admin has access to everything
  if (role === 'SuperAdmin') {
    return <>{children}</>;
  }

  // Check specific permission if provided
  if (resource && action) {
    let hasPermission = false;
    
    // Simple permission mapping
    switch (resource) {
      case 'users':
        hasPermission = canManageUsers();
        break;
      case 'system':
        hasPermission = canAccessAdminPanel();
        break;
      case 'payments':
      case 'fees':
        hasPermission = canManageFinancials();
        break;
      default:
        hasPermission = true; // Allow access to basic resources
    }
    
    if (!hasPermission) {
      if (fallback) {
        return <>{fallback}</>;
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Access Restricted</p>
                <p className="text-sm mt-2">
                  You don't have permission to {action} {resource}.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// High-level protected routes for common patterns
export function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, role } = useAuthWithPermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin and Director have admin access
  if (role === 'SuperAdmin' || role === 'Director') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Admin Access Required</p>
            <p className="text-sm mt-2">
              You need administrator privileges to access this page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SuperAdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, role } = useAuthWithPermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role !== 'SuperAdmin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Super Admin Access Required</p>
              <p className="text-sm mt-2">
                Only Super Administrators can access this page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

export function FinancialRoute({ children }: { children: ReactNode }) {
  const { canManageFinancials, isAuthenticated, loading } = useAuthWithPermissions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!canManageFinancials) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Financial Access Required</p>
              <p className="text-sm mt-2">
                You don't have permission to manage financial operations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Permission-based route wrapper
export function PermissionRoute({ 
  children, 
  resource, 
  action 
}: { 
  children: ReactNode; 
  resource: string; 
  action: string; 
}) {
  return (
    <ProtectedRoute resource={resource} action={action}>
      {children}
    </ProtectedRoute>
  );
}
