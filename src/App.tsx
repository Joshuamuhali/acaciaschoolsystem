import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, Suspense, lazy } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import AppLayout from "@/components/AppLayout";
import ProtectedLayout from "@/components/ProtectedLayout";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
// Lazy load components for better performance
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Pupils = lazy(() => import("@/pages/Pupils"));
const Parents = lazy(() => import("@/pages/Parents"));
const Fees = lazy(() => import("@/pages/Fees"));
const Payments = lazy(() => import("@/pages/Payments"));
const Reports = lazy(() => import("@/pages/Reports"));
const AuditLogs = lazy(() => import("@/pages/AuditLogs"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const SuperAdmin = lazy(() => import("@/pages/SuperAdmin"));
const Grades = lazy(() => import("@/pages/Grades"));
const FeeTypes = lazy(() => import("@/pages/FeeTypes"));
const NotFound = lazy(() => import("@/pages/NotFound"));
import { ProtectedRoute, AdminRoute, SuperAdminRoute, FinancialRoute, PermissionRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

function AuthenticatedApp() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ProtectedLayout>
      <AppLayout onLogout={handleLogout}>
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        }>
          <Routes>
          {/* Dashboard Overview */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* Main Management Routes */}
          <Route 
            path="/dashboard/pupils" 
            element={
              <PermissionRoute resource="pupils" action="read">
                <Pupils />
              </PermissionRoute>
            } 
          />
          <Route 
            path="/dashboard/parents" 
            element={
              <PermissionRoute resource="parents" action="read">
                <Parents />
              </PermissionRoute>
            } 
          />
          <Route 
            path="/dashboard/fees" 
            element={
              <PermissionRoute resource="fees" action="read">
                <Fees />
              </PermissionRoute>
            } 
          />
          <Route 
            path="/dashboard/payments" 
            element={
              <PermissionRoute resource="payments" action="read">
                <Payments />
              </PermissionRoute>
            } 
          />
          <Route 
            path="/dashboard/reports" 
            element={
              <PermissionRoute resource="reports" action="read">
                <Reports />
              </PermissionRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route path="/dashboard/admin" element={<Navigate to="/dashboard/admin/dashboard" replace />} />
          <Route 
            path="/dashboard/admin/dashboard" 
            element={
              <SuperAdminRoute>
                <SuperAdmin activeTab="dashboard" />
              </SuperAdminRoute>
            } 
          />
          <Route 
            path="/dashboard/admin/users" 
            element={
              <PermissionRoute resource="users" action="read">
                <SuperAdmin activeTab="users" />
              </PermissionRoute>
            } 
          />
          <Route 
            path="/dashboard/admin/audit" 
            element={
              <PermissionRoute resource="audit_logs" action="read">
                <SuperAdmin activeTab="audit" />
              </PermissionRoute>
            } 
          />
          <Route 
            path="/dashboard/admin/fees" 
            element={
              <PermissionRoute resource="fees" action="read">
                <SuperAdmin activeTab="fees" />
              </PermissionRoute>
            } 
          />
          <Route 
            path="/dashboard/admin/grades" 
            element={
              <PermissionRoute resource="grades" action="read">
                <Grades />
              </PermissionRoute>
            } 
          />
          <Route 
            path="/dashboard/admin/fee-types" 
            element={
              <PermissionRoute resource="fees" action="read">
                <FeeTypes />
              </PermissionRoute>
            } 
          />
          <Route 
            path="/dashboard/admin/school" 
            element={
              <PermissionRoute resource="system" action="settings">
                <SuperAdmin activeTab="school" />
              </PermissionRoute>
            } 
          />
          <Route 
            path="/dashboard/admin/emergency" 
            element={
              <SuperAdminRoute>
                <SuperAdmin activeTab="emergency" />
              </SuperAdminRoute>
            } 
          />

          {/* Legacy Admin Route Redirects */}
          <Route path="/admin" element={<Navigate to="/dashboard/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<Navigate to="/dashboard/admin/dashboard" replace />} />
          <Route path="/admin/users" element={<Navigate to="/dashboard/admin/users" replace />} />
          <Route path="/admin/audit" element={<Navigate to="/dashboard/admin/audit" replace />} />
          <Route path="/admin/fees" element={<Navigate to="/dashboard/admin/fees" replace />} />
          <Route path="/admin/school" element={<Navigate to="/dashboard/admin/school" replace />} />
          <Route path="/admin/emergency" element={<Navigate to="/dashboard/admin/emergency" replace />} />
          
          {/* Legacy Route Redirects */}
          <Route path="/pupils" element={<Navigate to="/dashboard/pupils" replace />} />
          <Route path="/parents" element={<Navigate to="/dashboard/parents" replace />} />
          <Route path="/fees" element={<Navigate to="/dashboard/fees" replace />} />
          <Route path="/payments" element={<Navigate to="/dashboard/payments" replace />} />
          <Route path="/reports" element={<Navigate to="/dashboard/reports" replace />} />
          <Route path="/audit-logs" element={<Navigate to="/dashboard/admin/audit" replace />} />
          <Route path="/settings" element={<Navigate to="/dashboard/admin/school" replace />} />
          
          {/* Default Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </ProtectedLayout>
  );
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            {session ? (
              <AuthenticatedApp />
            ) : (
              <Routes>
                <Route path="/login" element={
                  <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center bg-background">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  }>
                    <Login />
                  </Suspense>
                } />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            )}
          </BrowserRouter>
        </TooltipProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
};

export default App;
