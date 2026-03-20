import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/lib/auth/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallbackPath?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallbackPath = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="system_admin">{children}</ProtectedRoute>;
}

export function DirectorOnlyRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="director">{children}</ProtectedRoute>;
}

export function SchoolAdminOnlyRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="school_admin">{children}</ProtectedRoute>;
}
