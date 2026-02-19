import { useState } from "react";
import { usePermissionMatrix, useAllPermissions, useGrantUserPermission, useRevokeUserPermission, useGrantRolePermission, useRevokeRolePermission } from "@/hooks/useRBAC";
import { useUserRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Shield, 
  Plus, 
  Trash2, 
  Users, 
  Settings, 
  Eye, 
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter
} from "lucide-react";

export default function PermissionManager() {
  const { role: currentUserRole } = useUserRole();
  const { data: permissionMatrix, isLoading: matrixLoading } = usePermissionMatrix();
  const { data: allPermissions, isLoading: permissionsLoading } = useAllPermissions();
  const grantUserPermission = useGrantUserPermission();
  const revokeUserPermission = useRevokeUserPermission();
  const grantRolePermission = useGrantRolePermission();
  const revokeRolePermission = useRevokeRolePermission();
  
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("");
  const [permissionFilter, setPermissionFilter] = useState("all");

  // Only Super Admin can access
  if (currentUserRole !== "SuperAdmin") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Access Restricted</p>
            <p className="text-sm">Only Super Admin can manage permissions.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleGrantUserPermission = (granted: boolean) => {
    if (!selectedUser || !selectedPermission) return;
    
    grantUserPermission.mutate({
      userId: selectedUser,
      permissionId: selectedPermission,
      granted,
    });
  };

  const handleRevokeUserPermission = () => {
    if (!selectedUser || !selectedPermission) return;
    
    revokeUserPermission.mutate({
      userId: selectedUser,
      permissionId: selectedPermission,
    });
  };

  const handleGrantRolePermission = (granted: boolean) => {
    if (!selectedRole || !selectedPermission) return;
    
    if (granted) {
      grantRolePermission.mutate({
        role: selectedRole,
        permissionId: selectedPermission,
      });
    } else {
      revokeRolePermission.mutate({
        role: selectedRole,
        permissionId: selectedPermission,
      });
    }
  };

  const groupedPermissions = allPermissions?.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, any[]>) || {};

  const filteredPermissions = permissionFilter === "all" 
    ? allPermissions 
    : allPermissions?.filter(p => p.resource === permissionFilter) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Permission Manager</h2>
          <p className="text-muted-foreground">Manage role and user permissions</p>
        </div>
      </div>

      <Tabs defaultValue="matrix" className="space-y-6">
        <TabsList>
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>
          <TabsTrigger value="users">User Permissions</TabsTrigger>
          <TabsTrigger value="roles">Role Permissions</TabsTrigger>
        </TabsList>

        {/* Permission Matrix */}
        <TabsContent value="matrix" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Permission Matrix</span>
                <Select value={permissionFilter} onValueChange={setPermissionFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    {Object.keys(groupedPermissions).map(resource => (
                      <SelectItem key={resource} value={resource}>
                        {resource}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matrixLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading permission matrix...</div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([resource, perms]) => (
                    <div key={resource} className="space-y-3">
                      <h3 className="font-medium text-lg capitalize">{resource}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {perms.map((permission: any) => (
                          <div key={permission.id} className="p-3 border border-border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{permission.action}</span>
                              <Badge variant="outline">{permission.name}</Badge>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span>Super Admin:</span>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Director:</span>
                                {permissionMatrix?.some((m: any) => 
                                  m.role === 'Director' && 
                                  m.permission_name === permission.name
                                ) ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <span>School Admin:</span>
                                {permissionMatrix?.some((m: any) => 
                                  m.role === 'SchoolAdmin' && 
                                  m.permission_name === permission.name
                                ) ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Permissions */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>User Permissions</span>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Grant Permission
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Grant User Permission</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>User Email</Label>
                        <Input
                          value={selectedUser}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          placeholder="Enter user email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Permission</Label>
                        <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allPermissions?.map((perm: any) => (
                              <SelectItem key={perm.id} value={perm.id}>
                                {perm.name} ({perm.resource}.{perm.action})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleGrantUserPermission(true)}
                          disabled={!selectedUser || !selectedPermission}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Grant
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleGrantUserPermission(false)}
                          disabled={!selectedUser || !selectedPermission}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>User permission management interface</p>
                <p className="text-sm">Grant or deny specific permissions to individual users</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Permissions */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Role Permissions</span>
                <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Manage Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Manage Role Permissions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Director">Director</SelectItem>
                            <SelectItem value="SchoolAdmin">School Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Permission</Label>
                        <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allPermissions?.map((perm: any) => (
                              <SelectItem key={perm.id} value={perm.id}>
                                {perm.name} ({perm.resource}.{perm.action})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleGrantRolePermission(true)}
                          disabled={!selectedRole || !selectedPermission}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Grant
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleGrantRolePermission(false)}
                          disabled={!selectedRole || !selectedPermission}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Role permission management interface</p>
                <p className="text-sm">Modify permissions for Director and School Admin roles</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
