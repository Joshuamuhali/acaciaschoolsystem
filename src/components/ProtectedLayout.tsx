import { ReactNode } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock, AlertTriangle } from "lucide-react";

interface ProtectedLayoutProps {
  children?: ReactNode;
}

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
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
    return children ? <>{children}</> : <Outlet />;
  }

  // Check if user can access admin routes
  if (location.pathname.startsWith('/dashboard/admin')) {
    if (!canAccessAdminPanel()) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
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
  }

  return children ? <>{children}</> : <Outlet />;
}
