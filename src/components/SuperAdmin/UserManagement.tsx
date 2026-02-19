import { useState } from "react";
import { useEnhancedUsers, useToggleUserStatus, useCreateUser, useUpdateUserRole, useDeleteUser } from "@/hooks/useSuperAdmin";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Crown, 
  UserCheck, 
  Power, 
  PowerOff,
  Key,
  Search,
  Filter
} from "lucide-react";
import { format } from "date-fns";

export default function SuperAdminUserManagement() {
  const { data: users, isLoading, error } = useEnhancedUsers();
  const { role: currentUserRole } = useAuthWithPermissions();
  const toggleUserStatus = useToggleUserStatus();
  const createUser = useCreateUser();
  const updateUserRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "SchoolAdmin" as const,
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(newUser, {
      onSuccess: () => {
        setCreateDialogOpen(false);
        setNewUser({ email: "", password: "", fullName: "", role: "SchoolAdmin" });
      },
    });
  };

  const handleUpdateRole = (newRole: "Director" | "SuperAdmin" | "SchoolAdmin") => {
    if (selectedUser) {
      updateUserRole.mutate(
        { userId: selectedUser.id, newRole },
        {
          onSuccess: () => {
            setEditDialogOpen(false);
            setSelectedUser(null);
          },
        }
      );
    }
  };

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const isActive = currentStatus === "active";
    toggleUserStatus.mutate({ userId, isActive: !isActive });
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteUser.mutate(userId);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SuperAdmin":
        return <Crown className="h-4 w-4" />;
      case "Director":
        return <Shield className="h-4 w-4" />;
      case "SchoolAdmin":
        return <UserCheck className="h-4 w-4" />;
      default:
        return <UserCheck className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "SuperAdmin":
        return "bg-red-100 text-red-800 border-red-200";
      case "Director":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "SchoolAdmin":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "deactivated":
        return "bg-red-100 text-red-800 border-red-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Filter users
  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  }) || [];

  // Only Super Admin can access
  if (currentUserRole !== "SuperAdmin") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Access Restricted</p>
            <p className="text-sm">Only Super Admin can manage users.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage system users, roles, and permissions</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SchoolAdmin">School Admin</SelectItem>
                    <SelectItem value="Director">Director</SelectItem>
                    <SelectItem value="SuperAdmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createUser.isPending}>
                {createUser.isPending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="SuperAdmin">Super Admin</SelectItem>
                  <SelectItem value="Director">Director</SelectItem>
                  <SelectItem value="SchoolAdmin">School Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>System Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : !filteredUsers.length ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium text-foreground">{user.full_name || "No name"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getRoleColor(user.role)}>
                          <span className="flex items-center gap-1">
                            {getRoleIcon(user.role)}
                            {user.role}
                          </span>
                        </Badge>
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                        {user.pupils_managed > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {user.pupils_managed} pupils
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {format(new Date(user.created_at), "dd MMM yyyy")}
                        {user.last_sign_in_at && (
                          <span> • Last login {format(new Date(user.last_sign_in_at), "dd MMM yyyy")}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Status Toggle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={user.status === "active" ? "text-green-600" : "text-red-600"}
                      onClick={() => handleToggleStatus(user.id, user.status)}
                      disabled={toggleUserStatus.isPending}
                    >
                      {user.status === "active" ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                    </Button>
                    
                    {/* Reset Password */}
                    <Dialog open={resetPasswordDialogOpen && selectedUser?.id === user.id} onOpenChange={setResetPasswordDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reset Password</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p>
                            Reset password for <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})?
                          </p>
                          <p className="text-sm text-muted-foreground">
                            This will send a password reset email to the user.
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setResetPasswordDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                // Password reset functionality will be implemented with email service
                                setResetPasswordDialogOpen(false);
                              }}
                            >
                              Send Reset Email
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Edit Role */}
                    <Dialog open={editDialogOpen && selectedUser?.id === user.id} onOpenChange={setEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit User Role</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>User</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {user.full_name} ({user.email})
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>New Role</Label>
                            <Select
                              defaultValue={user.role}
                              onValueChange={handleUpdateRole}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SchoolAdmin">School Admin</SelectItem>
                                <SelectItem value="Director">Director</SelectItem>
                                <SelectItem value="SuperAdmin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Delete User */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={deleteUser.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
