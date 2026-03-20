import { useUser } from './useUser';

export function useRole() {
  const { user } = useUser();
  const roles = user?.user_roles?.map(ur => ur.role as 'system_admin' | 'director' | 'principal' | 'school_admin') || [];

  return {
    hasRole: (role: string) => roles.includes(role as any),
    hasAnyRole: (roleArray: string[]) => roleArray.some(role => roles.includes(role as any)),
    isSystemAdmin: roles.includes('system_admin'),
    isDirector: roles.includes('director'),
    isPrincipal: roles.includes('principal'),
    isSchoolAdmin: roles.includes('school_admin'),
  };
}
