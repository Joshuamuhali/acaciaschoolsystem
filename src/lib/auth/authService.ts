import type { User, AuthSession, LoginCredentials } from './types';
import { findMockAccount } from './mockAccounts';

const SESSION_KEY = 'school_system_auth_session';

export function createAuthSession(user: User): AuthSession {
  return {
    user,
    isAuthenticated: true,
    loginTime: Date.now(),
  };
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): AuthSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function login(email: string, password: string): Promise<boolean> {
  try {
    const user = findMockAccount(email, password);
    
    if (!user) {
      return false;
    }

    const session = createAuthSession(user);
    saveSession(session);
    
    return true;
  } catch {
    return false;
  }
}

export function logout(): void {
  clearSession();
}

export function getSession(): AuthSession | null {
  return loadSession();
}

export function isAuthenticated(): boolean {
  const session = loadSession();
  return session?.isAuthenticated ?? false;
}

export function getCurrentUser(): User | null {
  const session = loadSession();
  return session?.user ?? null;
}

export function hasRole(requiredRole: User['role']): boolean {
  const user = getCurrentUser();
  return user?.role === requiredRole;
}
