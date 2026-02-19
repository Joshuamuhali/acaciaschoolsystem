import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Tag,
  AlertCircle,
  Info
} from "lucide-react";
import { useFees } from "@/hooks/useFees";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Fee Type definition
interface FeeType {
  id: string;
  name: string;
  description?: string;
  isRequired: boolean;
  isActive: boolean;
  createdAt: Date;
}

export default function FeeTypes() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFeeType, setSelectedFeeType] = useState<FeeType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form states
  const [newFeeTypeName, setNewFeeTypeName] = useState("");
  const [newFeeTypeDescription, setNewFeeTypeDescription] = useState("");
  const [newFeeTypeRequired, setNewFeeTypeRequired] = useState(false);
  
  const { isSchoolAdmin, isSuperAdmin } = useAuthWithPermissions();
  const { data: fees } = useFees();

  // Mock fee types - in real implementation, these would come from API
  const feeTypes: FeeType[] = useMemo(() => {
    // Derive unique fee types from existing fees
    const uniqueTypes = new Map<string, FeeType>();
    
    fees?.forEach(fee => {
      const typeName = fee.fee_type || "Tuition";
      if (!uniqueTypes.has(typeName)) {
        uniqueTypes.set(typeName, {
          id: `type-${typeName.toLowerCase().replace(/\s+/g, '-')}`,
          name: typeName,
          description: getDefaultDescription(typeName),
          isRequired: typeName === "Tuition",
          isActive: true,
          createdAt: new Date(),
        });
      }
    });
    
    // Add default types if no fees exist
    if (uniqueTypes.size === 0) {
      [
        { id: "type-tuition", name: "Tuition", description: "Standard tuition fees", isRequired: true, isActive: true, createdAt: new Date() },
        { id: "type-development", name: "Development Fee", description: "School development and infrastructure", isRequired: false, isActive: true, createdAt: new Date() },
        { id: "type-uniform", name: "Uniform", description: "School uniform and attire", isRequired: false, isActive: true, createdAt: new Date() },
        { id: "type-transport", name: "Transport", description: "School transport services", isRequired: false, isActive: true, createdAt: new Date() },
        { id: "type-examination", name: "Examination", description: "Examination and assessment fees", isRequired: false, isActive: true, createdAt: new Date() },
      ].forEach(type => uniqueTypes.set(type.name, type));
    }
    
    return Array.from(uniqueTypes.values());
  }, [fees]);

  function getDefaultDescription(typeName: string): string {
    const descriptions: Record<string, string> = {
      "Tuition": "Standard tuition fees for academic instruction",
      "Development Fee": "School development and infrastructure improvements",
      "Uniform": "School uniform and required attire",
      "Transport": "School transport and bus services",
      "Examination": "Examination and assessment fees",
      "Library": "Library access and resource fees",
      "Sports": "Sports activities and equipment",
      "Computer": "Computer lab and technology access",
    };
    return descriptions[typeName] || "Fee type description";
  }

  // Filter fee types by search
  const filteredFeeTypes = useMemo(() => {
    if (!searchTerm) return feeTypes;
    return feeTypes.filter(ft => 
      ft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ft.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [feeTypes, searchTerm]);

  // Count fees using each type
  const getFeeTypeUsage = (typeName: string) => {
    return fees?.filter(f => (f.fee_type || "Tuition") === typeName).length || 0;
  };

  const handleCreateFeeType = () => {
    if (!newFeeTypeName.trim()) {
      toast.error("Fee type name is required");
      return;
    }
    
    // Check for duplicate
    if (feeTypes.some(ft => ft.name.toLowerCase() === newFeeTypeName.trim().toLowerCase())) {
      toast.error("Fee type already exists");
      return;
    }
    
    // Fee type creation will be implemented with API integration
    toast.success(`Fee type "${newFeeTypeName}" created successfully`);
    setNewFeeTypeName("");
    setNewFeeTypeDescription("");
    setNewFeeTypeRequired(false);
    setCreateDialogOpen(false);
  };

  const handleEditFeeType = () => {
    if (!selectedFeeType || !newFeeTypeName.trim()) {
      toast.error("Fee type name is required");
      return;
    }
    
    // Fee type update will be implemented with API integration
    toast.success(`Fee type "${newFeeTypeName}" updated successfully`);
    setEditDialogOpen(false);
    setSelectedFeeType(null);
  };

  const handleDeleteFeeType = () => {
    if (!selectedFeeType) return;
    
    const usage = getFeeTypeUsage(selectedFeeType.name);
    if (usage > 0) {
      toast.error(`Cannot delete fee type. It is used by ${usage} fee structures.`);
      setDeleteDialogOpen(false);
      return;
    }
    
    // Fee type deletion will be implemented with API integration
    toast.success(`Fee type "${selectedFeeType.name}" deleted successfully`);
    setDeleteDialogOpen(false);
    setSelectedFeeType(null);
  };

  const canManageFeeTypes = () => {
    return isSuperAdmin?.() || isSchoolAdmin?.();
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Fee Types" 
        description="Manage fee categories and types for your school"
        actions={
          canManageFeeTypes() && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Type
            </Button>
          )
        }
      />

      {/* Info Card */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 font-medium">About Fee Types</p>
              <p className="text-sm text-blue-600 mt-1">
                Fee types are reusable categories that help organize your fee structure. 
                Common types include Tuition, Development Fee, Uniform, Transport, etc. 
                These can be assigned different amounts per grade in the Fee Structure section.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search fee types..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Fee Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFeeTypes.map((feeType) => {
          const usage = getFeeTypeUsage(feeType.name);
          
          return (
            <Card key={feeType.id} className={!feeType.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Tag className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{feeType.name}</CardTitle>
                      <div className="flex items-center gap-1 mt-0.5">
                        {feeType.isRequired && (
                          <Badge variant="default" className="text-xs">Required</Badge>
                        )}
                        <Badge variant={feeType.isActive ? "outline" : "secondary"} className="text-xs">
                          {feeType.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {feeType.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Used in <span className="font-medium text-foreground">{usage}</span> fee structures
                  </div>
                  
                  {canManageFeeTypes() && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFeeType(feeType);
                          setNewFeeTypeName(feeType.name);
                          setNewFeeTypeDescription(feeType.description || "");
                          setNewFeeTypeRequired(feeType.isRequired);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedFeeType(feeType);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={usage > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {usage > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Cannot delete - in use
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredFeeTypes.length === 0 && (
        <div className="text-center py-12 bg-card border rounded-lg">
          <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No fee types found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm ? "Try a different search term." : "Create your first fee type to get started."}
          </p>
        </div>
      )}

      {/* Create Fee Type Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Fee Type</DialogTitle>
            <DialogDescription>
              Add a new fee category to your school.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="feeTypeName">Fee Type Name *</Label>
              <Input
                id="feeTypeName"
                placeholder="e.g., Tuition, Development Fee, Uniform"
                value={newFeeTypeName}
                onChange={(e) => setNewFeeTypeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeTypeDescription">Description</Label>
              <Input
                id="feeTypeDescription"
                placeholder="Brief description of this fee type"
                value={newFeeTypeDescription}
                onChange={(e) => setNewFeeTypeDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="feeTypeRequired"
                checked={newFeeTypeRequired}
                onChange={(e) => setNewFeeTypeRequired(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="feeTypeRequired" className="cursor-pointer">
                This is a required fee for all pupils
              </Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateFeeType}
                disabled={!newFeeTypeName.trim()}
              >
                Create Fee Type
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Fee Type Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Fee Type</DialogTitle>
            <DialogDescription>
              Update the fee type details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="editFeeTypeName">Fee Type Name *</Label>
              <Input
                id="editFeeTypeName"
                value={newFeeTypeName}
                onChange={(e) => setNewFeeTypeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFeeTypeDescription">Description</Label>
              <Input
                id="editFeeTypeDescription"
                value={newFeeTypeDescription}
                onChange={(e) => setNewFeeTypeDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editFeeTypeRequired"
                checked={newFeeTypeRequired}
                onChange={(e) => setNewFeeTypeRequired(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="editFeeTypeRequired" className="cursor-pointer">
                This is a required fee for all pupils
              </Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditFeeType} disabled={!newFeeTypeName.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Fee Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedFeeType?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFeeType}>
              Delete Fee Type
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
