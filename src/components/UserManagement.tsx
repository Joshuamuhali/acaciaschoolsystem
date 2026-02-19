import { useState } from "react";
import { useUsers, useCreateUser, useUpdateUserRole, useDeleteUser } from "@/hooks/useUsers";
import { useUserRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Shield, Crown, UserCheck } from "lucide-react";
import { format } from "date-fns";

export default function UserManagement() {
  const { data: users, isLoading } = useUsers();
  const { role: currentUserRole } = useUserRole();
  const createUser = useCreateUser();
  const updateUserRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
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

  // Only Super Admin can manage users
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
          <p className="text-muted-foreground">Manage system users and their roles</p>
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

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : !users?.length ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="space-y-4">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium text-foreground">{user.full_name || "No name"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {format(new Date(user.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Badge className={getRoleColor(user.role)}>
                      <span className="flex items-center gap-1">
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </Badge>
                    
                    <div className="flex items-center space-x-1">
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
