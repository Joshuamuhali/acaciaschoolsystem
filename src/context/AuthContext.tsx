import React, { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import type { User, AuthSession, AuthContextType } from '@/lib/auth/types';
import { login, logout, getSession, isAuthenticated, getCurrentUser, hasRole } from '@/lib/auth/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    const existingSession = getSession();
    setSession(existingSession);
    setLoading(false);
  }, []);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    const success = await login(email, password);
    
    if (success) {
      const newSession = getSession();
      setSession(newSession);
    }
    
    setLoading(false);
    return success;
  };

  const handleLogout = () => {
    logout();
    setSession(null);
  };

  const value: AuthContextType = {
    user: session?.user ?? null,
    session,
    login: handleLogin,
    logout: handleLogout,
    isAuthenticated: () => isAuthenticated(),
    hasRole,
    getCurrentUser: () => getCurrentUser(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
