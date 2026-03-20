import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Shield, Plus, Edit, Trash2, Key, Mail, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "@/hooks/useRole";
import { useUserContext } from "@/contexts/UserContext";
import { systemAdminService, type SystemUser, type UserRole } from "@/services/systemAdmin";

export default function SystemAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAnyRole } = useRole();
  const { user } = useUserContext();
  
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);

  // User form state
  const [userForm, setUserForm] = useState({
    email: "",
    full_name: "",
    role: "",
    school_id: 1
  });

  // Role form state
  const [roleForm, setRoleForm] = useState({
    role: "",
    description: "",
    is_active: true
  });

  useEffect(() => {
    if (!hasAnyRole(['system_admin'])) {
      navigate('/');
      return;
    }
    loadUsers();
    loadRoles();
  }, [hasAnyRole, navigate]);

  const loadUsers = async () => {
    try {
      const data = await systemAdminService.getProfiles();
      setUsers(data);
    } catch (error: any) {
      toast({
        title: "Error loading users",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadRoles = async () => {
    try {
      const data = await systemAdminService.getRoles();
      
      // Count users per role
      const rolesWithCounts = await Promise.all(
        data.map(async (role) => {
          // For now, use a placeholder count
          return {
            ...role,
            id: 0, // Temporary ID for display
            user_count: 0
          };
        })
      );
      
      setRoles(rolesWithCounts);
    } catch (error: any) {
      toast({
        title: "Error loading roles",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.full_name || !userForm.role) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create user profile
      const profile = await systemAdminService.createProfile({
        email: userForm.email,
        full_name: userForm.full_name,
        school_id: userForm.school_id,
        is_active: true
      });

      // Assign role
      await systemAdminService.assignRole({
        user_id: profile.id,
        role: userForm.role,
        school_id: userForm.school_id,
        is_active: true
      });

      toast({
        title: "User Created",
        description: `User ${userForm.full_name} has been created successfully.`,
      });

      setShowCreateUser(false);
      setUserForm({ email: "", full_name: "", role: "", school_id: 1 });
      loadUsers();
      loadRoles();
    } catch (error: any) {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!roleForm.role || !roleForm.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await systemAdminService.createRole({
        role: roleForm.role,
        description: roleForm.description,
        school_id: 1,
        is_active: roleForm.is_active
      });

      toast({
        title: "Role Created",
        description: `Role ${roleForm.role} has been created successfully.`,
      });

      setShowCreateRole(false);
      setRoleForm({ role: "", description: "", is_active: true });
      loadRoles();
    } catch (error: any) {
      toast({
        title: "Error creating role",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user: SystemUser) => {
    try {
      await systemAdminService.updateProfileStatus(user.id, !user.is_active);

      toast({
        title: "User Status Updated",
        description: `User has been ${user.is_active ? 'deactivated' : 'activated'}.`,
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (user: SystemUser) => {
    if (!confirm(`Are you sure you want to delete ${user.full_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await systemAdminService.deleteProfile(user.id);

      toast({
        title: "User Deleted",
        description: `User ${user.full_name} has been deleted.`,
      });

      loadUsers();
      loadRoles();
    } catch (error: any) {
      toast({
        title: "Error deleting user",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'system_admin':
        return 'destructive';
      case 'school_admin':
        return 'default';
      case 'director':
        return 'secondary';
      case 'principal':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Administration</h1>
          <p className="text-muted-foreground">Manage users and roles</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'users' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('users')}
          className="flex items-center gap-2"
        >
          <Users className="h-4 w-4" />
          Users
        </Button>
        <Button
          variant={activeTab === 'roles' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('roles')}
          className="flex items-center gap-2"
        >
          <Shield className="h-4 w-4" />
          Roles
        </Button>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Users Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">User Management</h2>
            <Button onClick={() => setShowCreateUser(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getRoleBadgeVariant(user.user_roles[0]?.role)}>
                              {user.user_roles[0]?.role?.replace('_', ' ').toUpperCase() || 'No Role'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {user.school_name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleUserStatus(user)}
                      >
                        {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Roles Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Role Management</h2>
            <Button onClick={() => setShowCreateRole(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>

          {/* Roles List */}
          <Card>
            <CardHeader>
              <CardTitle>All Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roles.map((role) => (
                  <div key={role.role} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{role.role.replace('_', ' ').toUpperCase()}</p>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={role.is_active ? 'default' : 'destructive'}>
                              {role.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {role.user_count} user{role.user_count !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New User</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={userForm.role} onValueChange={(value) => setUserForm(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system_admin">System Admin</SelectItem>
                    <SelectItem value="school_admin">School Admin</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="principal">Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateUser} disabled={loading}>
                  {loading ? "Creating..." : "Create User"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateUser(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role_name">Role Name</Label>
                <Input
                  id="role_name"
                  value={roleForm.role}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="custom_role"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Role description"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateRole} disabled={loading}>
                  {loading ? "Creating..." : "Create Role"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateRole(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
