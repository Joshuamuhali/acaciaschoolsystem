# 🚀 Enhanced RBAC System Deployment Guide

## 🎯 Overview

This guide provides step-by-step instructions for deploying the enhanced Role-Based Access Control (RBAC) system for Acacia Country School. The system now provides granular permissions, comprehensive auditing, and proper security at both database and frontend levels.

## 📋 Prerequisites

### **1. Database Access**
- Supabase CLI installed and configured
- Database connection working
- Admin access to run migrations

### **2. Environment Setup**
- Node.js 18+ installed
- React development server running
- Environment variables configured

### **3. Required Files**
All files have been created and are ready for deployment.

## 🔧 Step-by-Step Deployment

### **Step 1: Database Migration**

#### **1.1 Run All Migrations**
```bash
# Navigate to project root
cd "c:/Users/Hp/Desktop/Acacia Muhali/school-balance-book-main"

# Apply all migrations in order
npx supabase db push

# Verify migration success
npx supabase migration list
```

#### **1.2 Verify Database Schema**
```sql
-- Check if all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'permissions', 'role_permissions', 'user_permissions', 'school_settings',
  'users_with_roles_enhanced', 'resource_access_log', 'permission_matrix',
  'recent_access_attempts', 'pupils', 'parents', 'fees', 'payments',
  'grades', 'audit_logs', 'user_roles', 'term_lock'
);

-- Check if RLS policies exist
SELECT tablename FROM pg_policies 
WHERE tablename IN (
  'pupils', 'parents', 'fees', 'payments', 'grades', 'audit_logs',
  'user_roles', 'school_settings'
);

-- Check if functions exist
SELECT proname FROM pg_proc 
WHERE proname IN (
  'has_permission', 'get_user_permissions', 'log_resource_access',
  'toggle_user_status', 'override_term_lock', 'adjust_payment_balance',
  'can_access_pupil', 'can_access_payment'
);
```

### **Step 2: Test Authentication**

#### **2.1 Create Super Admin User**
```sql
-- Run the Super Admin creation script
-- This will create the user and assign Super Admin role
\i create_super_admin.sql

-- Or use Supabase Dashboard
-- 1. Go to Authentication → Users
-- 2. Click "Add user"
-- 3. Email: acaciaprojects86@gmail.com
-- 4. Full Name: Super Admin
-- 5. Password: [your secure password]
-- 6. Role: Super Admin
```

#### **2.2 Test Role-Based Access**
```typescript
// Test different user roles
// 1. Login as Super Admin - should see all navigation
// 2. Login as Director - should see limited navigation
// 3. Login as School Admin - should see basic navigation
// 4. Try to access restricted pages - should see "Access Restricted"
```

### **Step 3: Frontend Testing**

#### **3.1 Start Development Server**
```bash
npm run dev
```

#### **3.2 Test Permission Guards**
```typescript
// Test PermissionGuard component
<PermissionGuard resource="users" action="create">
  <UserForm />
</PermissionGuard>

// Should show form if user has permission
<PermissionGuard resource="users" action="create">
  <UserForm />
</PermissionGuard>

// Should show access denied if no permission
<PermissionGuard resource="users" action="delete">
  <div>Access Denied</div>
</PermissionGuard>
```

#### **3.3 Test Dashboard Adaptation**
```typescript
// Super Admin should see all stats
// Director should see limited stats
// School Admin should see basic stats

// Verify by checking browser console
console.log('User role:', role);
console.log('Can manage users:', canManageUsers);
console.log('Can access admin panel:', canAccessAdminPanel);
```

### **Step 4: Production Deployment**

#### **4.1 Environment Variables**
```bash
# Verify production environment
echo "VITE_SUPABASE_URL: $VITE_SUPABASE_URL"
echo "VITE_SUPABASE_ANON_KEY: $VITE_SUPABASE_ANON_KEY"

# Should be set to production values
```

#### **4.2 Build for Production**
```bash
# Build optimized production bundle
npm run build

# Check build output
ls -la dist/
```

#### **4.3 Database Backup**
```bash
# Create database backup before major changes
npx supabase db dump --data-only > backup_$(date +%Y%m%d_%H%M%S).sql

# Store backup securely
```

## 🔒 Security Verification

### **5.1 RLS Policy Testing**
```sql
-- Test RLS policies
-- Test as different user roles
SELECT * FROM public.pupils WHERE id = 'test-pupil-id';

-- Should work for Super Admin, fail for others
SELECT * FROM public.audit_logs WHERE performed_by = auth.uid();

-- Test permission functions
SELECT public.has_permission(auth.uid(), 'users', 'create');
```

### **5.2 Permission Function Testing**
```sql
-- Test permission checking
SELECT public.has_permission('user-id', 'users', 'read');

-- Test with invalid user
SELECT public.has_permission('invalid-user-id', 'users', 'read');
-- Should return false
```

### **5.3 Access Logging**
```sql
-- Check audit logs for permission checks
SELECT * FROM public.resource_access_log 
WHERE user_id = 'test-user-id' 
ORDER BY created_at DESC 
LIMIT 10;

-- Should show all permission attempts
```

## 🚨 Troubleshooting

### **Common Issues**

#### **Issue 1: Permission Not Loading**
```typescript
// Symptoms: Permission checks return false even after user is authenticated
// Causes: useAuthWithPermissions hook not properly initialized
// Solution: Ensure permissionsLoaded state is properly managed

// Check in browser console
console.log('Permissions loaded:', permissionsLoaded);
console.log('User role:', role);
```

#### **Issue 2: Navigation Items Not Filtering**
```typescript
// Symptoms: All navigation items visible regardless of role
// Causes: useAuthWithPermissions hook not returning proper permission values
// Solution: Verify permission checker functions return correct boolean values
```

#### **Issue 3: Database Connection**
```bash
# Check database connection
npx supabase db status

# Check connection string
echo $DATABASE_URL

# Test with Supabase CLI
npx supabase db remote changes
```

#### **Issue 4: TypeScript Errors**
```typescript
// Symptoms: Type errors in permission hooks
// Causes: Missing type definitions or incorrect imports
// Solution: Ensure all types are properly imported and defined
```

## 📊 Monitoring & Maintenance

### **6.1 Performance Monitoring**
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%permissions%' 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Monitor RLS policy performance
SELECT schemaname, tablename, policyname, perfcalls 
FROM pg_policies 
WHERE schemaname = 'public';
```

### **6.2 Regular Maintenance**
```sql
-- Clean up old audit logs (keep last 6 months)
DELETE FROM public.audit_logs 
WHERE created_at < NOW() - INTERVAL '6 months';

-- Update statistics
ANALYZE public.audit_logs;

-- Rebuild indexes
REINDEX INDEX CONCURRENTLY public.resource_access_log;
```

## 🎯 Success Criteria

### **✅ Deployment Success Indicators**
- [ ] All database migrations applied successfully
- [ ] RLS policies are working correctly
- [ ] Frontend permission guards are functional
- [ ] Users can only access authorized features
- [ ] Audit logs are capturing all access attempts
- [ ] No TypeScript errors in production
- [ ] Performance is acceptable (< 100ms for permission checks)

## 🚀 Rollback Plan

### **Emergency Rollback**
```bash
# If issues occur, rollback to previous state
npx supabase db rollback <migration-version>

# Restore from backup
psql -h localhost -U postgres -d acacia_school < backup_file.sql
```

## 📚 Documentation

### **User Management Guide**
```markdown
# Document RBAC system for administrators
# Include examples of permission assignments
# Provide troubleshooting steps
# Create user role matrix documentation
```

### **API Documentation**
```markdown
# Document all permission functions
# Provide examples of permission checks
# Include RBAC best practices
```

## 🎯 Next Steps

### **1. User Training**
- Train administrators on RBAC system
- Document permission assignment workflows
- Create user guides for common scenarios

### **2. Security Review**
- Regular security audits of RBAC implementation
- Review audit logs for unauthorized access attempts
- Update permissions as roles change

### **3. Enhancement Planning**
- Add custom permission types for specific features
- Implement time-based permissions for temporary access
- Add approval workflows for sensitive operations

---

## 📞 Support & Contact

### **For Technical Issues**
1. Check database logs: `SELECT * FROM public.audit_logs WHERE created_at > NOW() - INTERVAL '1 day'`
2. Check browser console for JavaScript errors
3. Review network requests in browser dev tools
4. Test with different user roles and permissions

### **For Feature Requests**
1. Document current permission structure
2. Identify required resources and actions
3. Design permission matrix for new features
4. Implement with proper security considerations

---

**Deployment Status**: Ready for production with enhanced RBAC system
