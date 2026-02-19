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
  GraduationCap, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  TrendingUp,
  Search,
  AlertCircle
} from "lucide-react";
import { useGrades, useCreateGrade, useDeleteGrade } from "@/hooks/useGrades";
import { usePupils } from "@/hooks/usePupils";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { toast } from "sonner";

export default function SchoolAdminGrades() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [newGradeName, setNewGradeName] = useState("");
  const [editGradeName, setEditGradeName] = useState("");
  
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: pupils } = usePupils();
  const { isSuperAdmin } = useAuthWithPermissions();
  
  const createGrade = useCreateGrade();
  const deleteGrade = useDeleteGrade();

  // Calculate grade statistics
  const gradeStats = useMemo(() => {
    if (!grades || !pupils) return [];
    
    return grades.map(grade => {
      const gradePupils = pupils.filter(p => p.grade_id === grade.id && p.status === "active");
      return {
        ...grade,
        pupilCount: gradePupils.length,
        isActive: true,
      };
    });
  }, [grades, pupils]);

  // Filter grades by search
  const filteredGrades = useMemo(() => {
    if (!searchTerm) return gradeStats;
    return gradeStats.filter(g => 
      g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [gradeStats, searchTerm]);

  const handleCreateGrade = async () => {
    if (!newGradeName.trim()) {
      toast.error("Grade name is required");
      return;
    }
    
    try {
      await createGrade.mutateAsync({ name: newGradeName.trim() });
      setNewGradeName("");
      setCreateDialogOpen(false);
      toast.success("Grade created successfully");
    } catch (error) {
      toast.error("Failed to create grade");
    }
  };

  const handleEditGrade = async () => {
    if (!editGradeName.trim() || !selectedGrade) {
      toast.error("Grade name is required");
      return;
    }
    
    // Grade update functionality will be implemented with API integration
    setEditDialogOpen(false);
  };

  const handleDeleteGrade = async () => {
    if (!selectedGrade) return;
    
    if (selectedGrade.pupilCount > 0) {
      toast.error("Cannot delete grade with enrolled pupils");
      setDeleteDialogOpen(false);
      return;
    }
    
    try {
      await deleteGrade.mutateAsync(selectedGrade.id);
      setDeleteDialogOpen(false);
      setSelectedGrade(null);
      toast.success("Grade deleted successfully");
    } catch (error) {
      toast.error("Failed to delete grade");
    }
  };

  if (gradesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Grades" description="Manage school grade levels" />
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Grades" 
        description="Manage grade levels and monitor enrollment"
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Grade
          </Button>
        }
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Grades</p>
                <p className="text-2xl font-bold">{grades?.length || 0}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Grades</p>
                <p className="text-2xl font-bold">
                  {grades?.length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pupils</p>
                <p className="text-2xl font-bold">{pupils?.filter(p => p.status === "active").length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search grades..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grades Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGrades.map((grade) => (
          <Card key={grade.id} className={!grade.isActive ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{grade.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {grade.pupilCount} {grade.pupilCount === 1 ? "pupil" : "pupils"} enrolled
                  </CardDescription>
                </div>
                <Badge variant={grade.isActive ? "default" : "secondary"}>
                  {grade.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedGrade(grade);
                    setEditGradeName(grade.name);
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setSelectedGrade(grade);
                    setDeleteDialogOpen(true);
                  }}
                  disabled={grade.pupilCount > 0}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
              {grade.pupilCount > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Cannot delete grade with enrolled pupils
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGrades.length === 0 && (
        <div className="text-center py-12 bg-card border rounded-lg">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No grades found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchTerm ? "Try a different search term." : "Create your first grade to get started."}
          </p>
        </div>
      )}

      {/* Create Grade Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Grade</DialogTitle>
            <DialogDescription>
              Add a new grade level to your school.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="gradeName">Grade Name</Label>
              <Input
                id="gradeName"
                placeholder="e.g., Primary 1, P1, S1"
                value={newGradeName}
                onChange={(e) => setNewGradeName(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateGrade}
                disabled={createGrade.isPending || !newGradeName.trim()}
              >
                {createGrade.isPending ? "Creating..." : "Create Grade"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Grade Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Grade</DialogTitle>
            <DialogDescription>
              Update the grade name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="editGradeName">Grade Name</Label>
              <Input
                id="editGradeName"
                value={editGradeName}
                onChange={(e) => setEditGradeName(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditGrade} disabled={!editGradeName.trim()}>
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
            <DialogTitle>Delete Grade</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedGrade?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteGrade}
              disabled={deleteGrade.isPending}
            >
              {deleteGrade.isPending ? "Deleting..." : "Delete Grade"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
