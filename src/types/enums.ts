import { Database } from './supabase'

export type AppRole = Database['public']['Enums']['app_role']
export type PaymentStatus = 'approved' | 'pending_approval' | 'rejected'
export type PupilStatus = 'active' | 'inactive' | 'O' | 'N'
export type PaymentStatusView = 'paid' | 'partial' | 'unpaid'
export type TermNumber = 1 | 2 | 3

export const ROLES = {
  DIRECTOR: 'Director' as AppRole,
  SUPER_ADMIN: 'SuperAdmin' as AppRole,
  SCHOOL_ADMIN: 'SchoolAdmin' as AppRole,
} as const

export const PERMISSIONS = {
  // Users
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_ACTIVATE: 'users.activate',
  USERS_ASSIGN_ROLE: 'users.assign_role',
  USERS_RESET_PASSWORD: 'users.reset_password',
  
  // Pupils
  PUPILS_CREATE: 'pupils.create',
  PUPILS_READ: 'pupils.read',
  PUPILS_UPDATE: 'pupils.update',
  PUPILS_DELETE: 'pupils.delete',
  
  // Parents
  PARENTS_CREATE: 'parents.create',
  PARENTS_READ: 'parents.read',
  PARENTS_UPDATE: 'parents.update',
  PARENTS_DELETE: 'parents.delete',
  
  // Payments
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_READ: 'payments.read',
  PAYMENTS_UPDATE: 'payments.update',
  PAYMENTS_DELETE: 'payments.delete',
  PAYMENTS_SOFT_DELETE: 'payments.soft_delete',
  PAYMENTS_APPROVE_DELETE: 'payments.approve_delete',
  PAYMENTS_ADJUST: 'payments.adjust',
  PAYMENTS_REFUND: 'payments.refund',
  
  // Fees
  FEES_CREATE: 'fees.create',
  FEES_READ: 'fees.read',
  FEES_UPDATE: 'fees.update',
  FEES_DELETE: 'fees.delete',
  FEES_ACTIVATE: 'fees.activate',
  
  // Grades
  GRADES_CREATE: 'grades.create',
  GRADES_READ: 'grades.read',
  GRADES_UPDATE: 'grades.update',
  GRADES_DELETE: 'grades.delete',
  
  // Reports
  REPORTS_READ: 'reports.read',
  REPORTS_CREATE: 'reports.create',
  REPORTS_EXPORT: 'reports.export',
  
  // Audit
  AUDIT_READ: 'audit.read',
  AUDIT_EXPORT: 'audit.export',
  
  // System
  SYSTEM_SETTINGS: 'system.settings',
  SYSTEM_BACKUP: 'system.backup',
  SYSTEM_RESTORE: 'system.restore',
  SYSTEM_MAINTENANCE: 'system.maintenance',
  
  // Term
  TERM_LOCK: 'term.lock',
  TERM_UNLOCK: 'term.unlock',
  TERM_OVERRIDE: 'term.override',
} as const

export const RESOURCES = {
  USERS: 'users',
  PUPILS: 'pupils',
  PARENTS: 'parents',
  PAYMENTS: 'payments',
  FEES: 'fees',
  GRADES: 'grades',
  REPORTS: 'reports',
  AUDIT_LOGS: 'audit_logs',
  SYSTEM: 'system',
  TERM: 'term',
} as const

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  ACTIVATE: 'activate',
  ASSIGN_ROLE: 'assign_role',
  RESET_PASSWORD: 'reset_password',
  SOFT_DELETE: 'soft_delete',
  APPROVE_DELETE: 'approve_delete',
  ADJUST: 'adjust',
  REFUND: 'refund',
  LOCK: 'lock',
  UNLOCK: 'unlock',
  OVERRIDE: 'override',
  SETTINGS: 'settings',
  BACKUP: 'backup',
  RESTORE: 'restore',
  MAINTENANCE: 'maintenance',
  EXPORT: 'export',
} as const
