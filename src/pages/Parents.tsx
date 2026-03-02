import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Phone, Mail, Users, Edit, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getParents, createParent, updateParent, deleteParent, ParentWithPupils } from "@/services/parents";
import { getPupils } from "@/services/pupils";

interface Parent {
  id: string;
  parent_code: string;
  full_name: string;
  phone: string;
  email?: string;
  nrc?: string;
  address?: string;
  occupation?: string;
  emergency_contact?: string;
  relationship_to_pupil: string;
  pupils_count?: number;
  created_at: string;
}

interface Pupil {
  id: string;
  full_name: string;
  parent_name?: string;
  parent_phone?: string;
  grade_id: string;
  grade_name?: string;
  grades?: { name: string };
}

export default function Parents() {
  const [parents, setParents] = useState<ParentWithPupils[]>([]);
  const [pupils, setPupils] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingParent, setEditingParent] = useState<ParentWithPupils | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<ParentWithPupils | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    nrc: "",
    address: "",
    occupation: "",
    emergency_contact: "",
    relationship_to_pupil: "Parent"
  });

  useEffect(() => {
    loadParents();
    loadPupils();
  }, []);

  const loadParents = async () => {
    try {
      const data = await getParents();
      setParents(data);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadPupils = async () => {
    try {
      const data = await getPupils();
      setPupils(data || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteParent = async (parent: ParentWithPupils) => {
    try {
      await deleteParent(parent.id);
      toast({ 
        title: "Success", 
        description: `Parent "${parent.full_name}" has been deleted` 
      });
      
      // Refresh data
      await loadParents();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const confirmDeleteParent = (parent: ParentWithPupils) => {
    setParentToDelete(parent);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteParent = async () => {
    if (parentToDelete) {
      await handleDeleteParent(parentToDelete);
      setDeleteConfirmOpen(false);
      setParentToDelete(null);
    }
  };

  const handleEditParent = (parent: ParentWithPupils) => {
    setEditingParent(parent);
    setFormData({
      full_name: parent.full_name,
      phone: parent.phone,
      email: parent.email || "",
      nrc: parent.nrc || "",
      address: parent.address || "",
      occupation: parent.occupation || "",
      emergency_contact: parent.emergency_contact || "",
      relationship_to_pupil: parent.relationship_to_pupil
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParent) return;
    
    try {
      await updateParent(editingParent.id, formData);
      toast({ title: "Success", description: "Parent updated successfully" });
      
      // Reset form and close dialog
      setFormData({
        full_name: "",
        phone: "",
        email: "",
        nrc: "",
        address: "",
        occupation: "",
        emergency_contact: "",
        relationship_to_pupil: "Parent"
      });
      setIsEditDialogOpen(false);
      setEditingParent(null);
      
      // Refresh data
      await loadParents();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createParent(formData);
      toast({ title: "Success", description: "Parent created successfully" });
      
      // Reset form
      setFormData({
        full_name: "",
        phone: "",
        email: "",
        nrc: "",
        address: "",
        occupation: "",
        emergency_contact: "",
        relationship_to_pupil: "Parent"
      });
      setIsAddDialogOpen(false);
      
      // Refresh data
      await loadParents();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredParents = parents.filter(parent =>
    parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.phone.includes(searchTerm)
  );


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading parents...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parent Management</h1>
          <p className="text-muted-foreground">Manage parent information and contacts</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Parent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Parent</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="nrc">NRC</Label>
                <Input
                  id="nrc"
                  value={formData.nrc}
                  onChange={(e) => setFormData(prev => ({ ...prev, nrc: e.target.value }))}
                  placeholder="NRC Number"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="relationship">Relationship</Label>
                  <Select
                    value={formData.relationship_to_pupil}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, relationship_to_pupil: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Guardian">Guardian</SelectItem>
                      <SelectItem value="Relative">Relative</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                  placeholder="Emergency contact number"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add Parent</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredParents.map((parent) => {
          return (
            <Card key={parent.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {parent.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{parent.full_name}</CardTitle>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {parent.parent_code}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {parent.pupils_count} pupil{(parent.pupils_count || 0) > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditParent(parent)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => confirmDeleteParent(parent)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{parent.phone}</span>
                </div>
                {parent.email && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{parent.email}</span>
                  </div>
                )}
                {parent.nrc && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-muted-foreground">NRC:</span>
                    <span>{parent.nrc}</span>
                  </div>
                )}
                {parent.pupils.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center space-x-2 text-sm font-medium mb-2">
                      <Users className="h-4 w-4" />
                      <span>Children</span>
                    </div>
                    <div className="space-y-1">
                      {parent.pupils.map((pupil) => (
                        <div key={pupil.id} className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                          {pupil.full_name} - {pupil.grade_name || 'Unassigned'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredParents.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No parents found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first parent"}
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this parent from the system. This action cannot be undone.
              {parentToDelete && (
                <div className="mt-2 font-medium">
                  Parent: {parentToDelete.full_name} ({parentToDelete.phone})
                  {parentToDelete.pupils.length > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      This will also remove associations with {parentToDelete.pupils.length} pupil(s)
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteParent} className="bg-destructive text-destructive-foreground">
              Delete Parent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Parent Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Parent</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateParent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_full_name">Full Name *</Label>
                <Input
                  id="edit_full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_phone">Phone *</Label>
                <Input
                  id="edit_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_nrc">NRC</Label>
              <Input
                id="edit_nrc"
                value={formData.nrc}
                onChange={(e) => setFormData(prev => ({ ...prev, nrc: e.target.value }))}
                placeholder="NRC Number"
              />
            </div>
            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit_address">Address</Label>
              <Textarea
                id="edit_address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_occupation">Occupation</Label>
                <Input
                  id="edit_occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit_relationship">Relationship</Label>
                <Select
                  value={formData.relationship_to_pupil}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, relationship_to_pupil: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Guardian">Guardian</SelectItem>
                    <SelectItem value="Relative">Relative</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit_emergency_contact">Emergency Contact</Label>
              <Input
                id="edit_emergency_contact"
                value={formData.emergency_contact}
                onChange={(e) => setFormData(prev => ({ ...prev, emergency_contact: e.target.value }))}
                placeholder="Emergency contact number"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Parent</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
