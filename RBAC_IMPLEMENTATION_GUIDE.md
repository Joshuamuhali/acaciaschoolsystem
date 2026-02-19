# Enhanced RBAC Implementation Guide

## 🎯 Overview

This enhanced Role-Based Access Control (RBAC) system provides granular permission management for the Acacia Country School fee tracking system. It replaces the basic role checks with a comprehensive permission matrix.

## 📋 Features

### **1. Granular Permissions**
- **Resource-Action Model**: Each permission is defined by resource + action (e.g., `payments.create`, `users.read`)
- **35+ Predefined Permissions**: Covering all system operations
- **Custom Permissions**: Easy to extend for new features

### **2. Multi-Level Access Control**
- **Role Permissions**: Base permissions assigned to roles (SuperAdmin, Director, SchoolAdmin)
- **User Overrides**: Individual user permissions that can grant or deny specific access
- **Temporary Permissions**: Time-limited permissions with expiration dates

### **3. Comprehensive Auditing**
- **Access Logging**: Every permission check is logged with IP, user agent, and success/failure
- **Permission Matrix**: Visual overview of all role and user permissions
- **Change Tracking**: All permission changes are audited

### **4. Security Features**
- **Database-Level Enforcement**: RLS policies use permission functions
- **Frontend Guards**: React components prevent unauthorized UI access
- **Real-Time Updates**: Permission changes take effect immediately

## 🗄 Database Schema

### **Core Tables**

```sql
-- Permissions definition
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,
  description TEXT,
  resource TEXT, -- 'users', 'payments', 'fees', etc.
  action TEXT   -- 'create', 'read', 'update', 'delete', etc.
);

-- Role permissions (many-to-many)
CREATE TABLE role_permissions (
  role app_role,
  permission_id UUID REFERENCES permissions(id),
  granted_by UUID,
  granted_at TIMESTAMPTZ
);

-- User permissions (overrides)
CREATE TABLE user_permissions (
  user_id UUID REFERENCES auth.users(id),
  permission_id UUID REFERENCES permissions(id),
  granted BOOLEAN,
  expires_at TIMESTAMPTZ
);

-- Access logging
CREATE TABLE resource_access_log (
  user_id UUID,
  resource TEXT,
  action TEXT,
  success BOOLEAN,
  ip_address INET,
  created_at TIMESTAMPTZ
);
```

### **Key Functions**

```sql
-- Check if user has permission
SELECT has_permission(user_id, 'payments', 'create');

-- Get all user permissions
SELECT * FROM get_user_permissions(user_id);

-- Log access attempt
SELECT log_resource_access(user_id, 'payments', 'create');
```

## 🔧 Implementation Steps

### **1. Run Database Migration**
```bash
# Apply the RBAC schema
npx supabase db push
```

### **2. Update Components**

Replace existing role checks with permission guards:

```typescript
// Before
{currentUserRole === "SuperAdmin" && <AdminPanel />}

// After
<PermissionGuard resource="system" action="settings">
  <AdminPanel />
</PermissionGuard>
```

### **3. Use Permission Hooks**

```typescript
// In components
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";

function PaymentForm() {
  const { canCreatePayments } = useAuthWithPermissions();
  
  if (!canCreatePayments) {
    return <AccessDenied />;
  }
  
  return <form>...</form>;
}
```

### **4. High-Level Guards**

```typescript
// For common patterns
<AdminOnly>
  <UserManagement />
</AdminOnly>

<SuperAdminOnly>
  <SystemSettings />
</SuperAdminOnly>

<FinancialOnly>
  <PaymentAdjustment />
</FinancialOnly>
```

## 📊 Permission Categories

### **User Management**
- `users.create` - Create new users
- `users.read` - View user information
- `users.update` - Update user details
- `users.delete` - Delete users
- `users.activate` - Activate/deactivate users
- `users.assign_role` - Assign roles
- `users.reset_password` - Reset passwords

### **Financial Operations**
- `payments.create` - Record payments
- `payments.read` - View payment details
- `payments.update` - Update payments
- `payments.soft_delete` - Soft delete payments
- `payments.approve_delete` - Approve deletions
- `payments.adjust` - Adjust payment amounts
- `payments.refund` - Process refunds

### **System Administration**
- `system.settings` - Manage system settings
- `system.backup` - Create backups
- `system.restore` - Restore from backup
- `system.maintenance` - Perform maintenance

### **Term Management**
- `term.lock` - Lock terms
- `term.unlock` - Unlock terms
- `term.override` - Override term locks

## 🎛 Usage Examples

### **Basic Permission Check**
```typescript
import { PermissionGuard } from "@/components/PermissionGuard";

<PermissionGuard resource="payments" action="create">
  <PaymentForm />
</PermissionGuard>
```

### **Custom Fallback**
```typescript
<PermissionGuard 
  resource="users" 
  action="delete"
  fallback={<div>You cannot delete users</div>}
>
  showMessage={false}
>
  <DeleteButton />
</PermissionGuard>
```

### **Programmatic Check**
```typescript
import { usePermission } from "@/hooks/useAuthWithPermissions";

function DeleteUserButton({ userId }) {
  const { hasPermission } = usePermission("users", "delete");
  
  return (
    <Button 
      onClick={() => deleteUser(userId)}
      disabled={!hasPermission}
    >
      Delete User
    </Button>
  );
}
```

### **Batch Permission Checks**
```typescript
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";

function AdminDashboard() {
  const { 
    canManageUsers, 
    canManageFinancials, 
    canPerformSystemActions 
  } = useAuthWithPermissions();
  
  return (
    <div>
      {canManageUsers && <UserManagement />}
      {canManageFinancials && <FinancialOverview />}
      {canPerformSystemActions && <SystemTools />}
    </div>
  );
}
```

## 🔒 Security Best Practices

### **1. Database-Level Enforcement**
Always use RLS policies that call permission functions:

```sql
CREATE POLICY "Payments create" ON payments
FOR INSERT TO authenticated
WITH CHECK (has_permission(auth.uid(), 'payments', 'create'));
```

### **2. Frontend Defense**
Use permission guards to prevent unauthorized UI access:

```typescript
// Prevents rendering the component entirely
<PermissionGuard resource="system" action="settings">
  <SettingsPage />
</PermissionGuard>
```

### **3. API Protection**
Log all permission checks:

```sql
CREATE TRIGGER payments_access_log
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION log_payment_access();
```

### **4. Temporary Permissions**
Use time-limited permissions for special cases:

```typescript
// Grant temporary access for 24 hours
grantUserPermission({
  userId: "user-123",
  permissionId: "perm-456", 
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
});
```

## 📈 Migration from Role-Based

### **Current System**
```typescript
// Simple role checks
if (currentUserRole === "SuperAdmin") {
  // Allow access
}
```

### **Enhanced System**
```typescript
// Permission-based checks
if (hasPermission('system', 'settings')) {
  // Allow access
}
```

### **Migration Benefits**
1. **Granular Control**: Grant specific abilities without full role access
2. **Temporary Access**: Time-limited permissions for special cases
3. **Audit Trail**: Complete logging of all permission checks
4. **Flexibility**: Easy to add new permissions without changing roles

## 🚀 Advanced Features

### **1. Permission Templates**
Create permission sets for common roles:

```sql
-- Template for "Temporary Auditor"
INSERT INTO user_permissions (user_id, permission_id, granted, expires_at)
SELECT 
  user_id, 
  p.id, 
  true, 
  now() + interval '7 days'
FROM permissions p 
WHERE p.name IN ('audit.read', 'audit.export');
```

### **2. Conditional Permissions**
Context-aware permissions based on data:

```sql
CREATE OR REPLACE FUNCTION has_context_permission(
  user_id UUID,
  resource TEXT,
  action TEXT,
  context JSONB
)
```

### **3. Permission Inheritance**
Role permissions that automatically include lower-level permissions:

```sql
-- SuperAdmin inherits all Director permissions
SELECT * FROM get_user_permissions(user_id)
WHERE role = 'SuperAdmin'
UNION ALL
SELECT * FROM get_user_permissions(user_id)
WHERE role = 'Director';
```

## 📝 Monitoring & Auditing

### **View Permission Matrix**
```sql
SELECT * FROM permission_matrix;
```

### **Check Recent Access**
```sql
SELECT * FROM recent_access_attempts 
WHERE success = false 
ORDER BY created_at DESC;
```

### **Audit Permission Changes**
```sql
SELECT * FROM audit_logs 
WHERE table_name IN ('role_permissions', 'user_permissions');
```

## 🎯 Next Steps

1. **Deploy the RBAC schema** to your Supabase project
2. **Update existing components** to use permission guards
3. **Test permission flows** with different user roles
4. **Monitor access logs** for security insights
5. **Customize permissions** based on your specific needs

This enhanced RBAC system provides enterprise-grade access control while maintaining the simplicity needed for a school environment.
