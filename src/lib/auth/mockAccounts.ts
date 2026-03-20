import type { User, UserRole } from './types';

export const mockAccounts = [
  {
    id: "1",
    email: "joshua.muhali@acaciagroupzm.com",
    password: "Admin123!",
    fullName: "Joshua Muhali",
    role: "system_admin" as UserRole,
  },
  {
    id: "2",
    email: "chilufya@acaciagroupzm.com",
    password: "Admin123!",
    fullName: "Chilufya",
    role: "school_admin" as UserRole,
  },
  {
    id: "3",
    email: "innocent@acaciagroupzm.com",
    password: "Admin123!",
    fullName: "Innocent",
    role: "director" as UserRole,
  },
  {
    id: "4",
    email: "principal@acaciagroupzm.com",
    password: "Admin123!",
    fullName: "Principal",
    role: "principal" as UserRole,
  },
] as const;

export function findMockAccount(email: string, password: string): User | null {
  const account = mockAccounts.find(acc => 
    acc.email.toLowerCase() === email.toLowerCase() && acc.password === password
  );
  
  return account ? {
    id: account.id,
    email: account.email,
    fullName: account.fullName,
    role: account.role,
  } : null;
}
