import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Trash2, Settings, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { createPupil, getPupils, deletePupil, updatePupil } from "@/services/pupils";
import { createSchoolFee, createOtherFee } from "@/services/fees";
import { getGrades } from "@/services/grades";
import { getTerms } from "@/services/terms";
import { supabase } from "@/integrations/supabase/client";
import type { Pupil, Grade } from "@/types";
import { SkeletonTable, SkeletonForm, SkeletonCard } from "@/components/skeleton";

export default function Pupils() {
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const gradeFilter = searchParams.get("grade") || "";
  const [editingPupil, setEditingPupil] = useState<Pupil | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", sex: "", grade_id: "", parent_name: "", parent_phone: "", status: "new" as "new" | "old", admission_blocked: false });
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Edit dialog fee management
  const [editingPupilFees, setEditingPupilFees] = useState<number[]>([]);
  const [editingFeesLoading, setEditingFeesLoading] = useState(false);

  // Bulk fee assignment state
  const [feeAssignmentOpen, setFeeAssignmentOpen] = useState(false);
  const [selectedPupils, setSelectedPupils] = useState<number[]>([]);
  const [otherFeeTypes, setOtherFeeTypes] = useState<any[]>([]);
  const [selectedOtherFees, setSelectedOtherFees] = useState<number[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setFeesLoading(true);
    try {
      const [p, g, feesResult] = await Promise.all([
        getPupils(gradeFilter || undefined), 
        getGrades(),
        supabase.from('other_fee_types').select('*').order('name')
      ]);
      setPupils(p);
      setGrades(g);
      const fees = feesResult?.data || [];
      setOtherFeeTypes(fees);
    } catch (e: any) {
      console.error('Load error:', e);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setFeesLoading(false);
    }
  };

  useEffect(() => { load(); }, [gradeFilter]);

  // Bulk fee assignment functions
  const handlePupilSelection = (pupilId: number, checked: boolean) => {
    setSelectedPupils(prev => {
      if (checked) {
        return [...prev, pupilId];
      } else {
        return prev.filter(id => id !== pupilId);
      }
    });
  };

  const handleOtherFeeToggle = (feeId: number, checked: boolean) => {
    setSelectedOtherFees(prev => {
      if (checked) {
        return [...prev, feeId];
      } else {
        return prev.filter(id => id !== feeId);
      }
    });
  };

  const handleBulkFeeAssignment = async () => {
    if (selectedPupils.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one pupil",
        variant: "destructive"
      });
      return;
    }

    if (selectedOtherFees.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one fee type",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Get enrollments for selected pupils
      const { data: enrollments, error } = await supabase
        .from('enrollments')
        .select('id, pupil_id')
        .in('pupil_id', selectedPupils);

      if (error) throw error;

      // Assign selected other fees to all selected pupils
      for (const enrollment of enrollments || []) {
        for (const feeId of selectedOtherFees) {
          const fee = otherFeeTypes.find(f => f.id === feeId);
          if (fee) {
            await supabase
              .from('pupil_other_fees')
              .upsert({
                enrollment_id: enrollment.id,
                fee_type_id: feeId,
                amount: fee.amount,
                amount_paid: 0
              });
          }
        }
      }

      toast({
        title: "Success",
        description: `Assigned ${selectedOtherFees.length} fee types to ${selectedPupils.length} pupils`
      });
      
      // Reset selections
      setSelectedPupils([]);
      setSelectedOtherFees([]);
      setFeeAssignmentOpen(false);
      
    } catch (error: any) {
      console.error('Bulk fee assignment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign fees",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = pupils.filter((p) =>
    p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (pupil: Pupil) => {
    if (!confirm(`Are you sure you want to delete ${pupil.full_name}? This will also delete all associated fees and payments.`)) {
      return;
    }

    try {
      await deletePupil(pupil.id);
      load();
      toast({ title: "Pupil deleted successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    try {
      if (editingPupil) {
        // Update existing pupil
        await updatePupil(editingPupil.id, form);

        // Save fee assignments
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('id')
          .eq('pupil_id', editingPupil.id)
          .single();

        if (!enrollmentError && enrollment) {
          // Remove existing other fees
          await supabase
            .from('pupil_other_fees')
            .delete()
            .eq('enrollment_id', enrollment.id);

          // Add selected other fees
          for (const feeId of editingPupilFees) {
            const fee = otherFeeTypes.find(f => f.id === feeId);
            if (fee) {
              await supabase
                .from('pupil_other_fees')
                .insert({
                  enrollment_id: enrollment.id,
                  fee_type_id: feeId,
                  amount: fee.amount,
                  amount_paid: 0
                });
            }
          }
        }

        toast({ title: "Pupil updated successfully" });
      } else {
        // Create new pupil - fees will be automatically assigned by database trigger
        const pupil = await createPupil(form);
        toast({ title: "Pupil created successfully" });
      }

      setOpen(false);
      setEditingPupil(null);
      setForm({ full_name: "", sex: "", grade_id: "", parent_name: "", parent_phone: "", status: "new" as "new" | "old", admission_blocked: false });
      setEditingPupilFees([]);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = async (pupil: Pupil) => {
    setEditingPupil(pupil);
    setForm({
      full_name: pupil.full_name,
      sex: pupil.sex,
      grade_id: pupil.grade_id,
      parent_name: pupil.parent_name || "",
      parent_phone: pupil.parent_phone || "",
      status: pupil.status as "new" | "old",
      admission_blocked: pupil.admission_blocked
    });

    // Load pupil's current fees
    try {
      setEditingFeesLoading(true);
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('pupil_id', pupil.id)
        .single();

      if (!enrollmentError && enrollment) {
        const { data: pupilFees, error: feesError } = await supabase
          .from('pupil_other_fees')
          .select('fee_type_id')
          .eq('enrollment_id', enrollment.id);

        if (!feesError) {
          setEditingPupilFees(pupilFees?.map(f => f.fee_type_id) || []);
        }
      }
    } catch (error) {
      console.error('Error loading pupil fees:', error);
    } finally {
      setEditingFeesLoading(false);
    }

    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title font-heading">Pupils</h1>
          <p className="page-description">Manage student records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/grades')}>Grades</Button>
          <Button onClick={() => setShowAddForm(!showAddForm)} variant={showAddForm ? "secondary" : "default"}>
            <Plus className="h-4 w-4 mr-2" />
            {showAddForm ? "Cancel" : "Add Pupil"}
          </Button>
        </div>
      </div>

      {/* Edit Pupil Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingPupil(null); setForm({ full_name: "", sex: "", grade_id: "", parent_name: "", parent_phone: "", status: "new" as "new" | "old", admission_blocked: false }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPupil ? "Edit Pupil" : "Add New Pupil"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Enter full name" />
            </div>
            <div>
              <Label>Sex</Label>
              <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grade</Label>
              <Select value={form.grade_id} onValueChange={(v) => setForm({ ...form, grade_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>{grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parent Name</Label>
              <Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} placeholder="Enter parent name" />
            </div>
            <div>
              <Label>Parent Phone</Label>
              <Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} placeholder="Enter phone number" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "new" | "old" })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="old">Old</SelectItem></SelectContent>
              </Select>
            </div>

            {/* Fee Assignment Section - Only show when editing existing pupil */}
            {editingPupil && (
              <div className="border-t pt-4">
                <Label className="text-base font-medium mb-3 block">Assign Additional Fees</Label>
                {editingFeesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="ml-2 text-sm text-muted-foreground">Loading fees...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {Array.isArray(otherFeeTypes) && otherFeeTypes.map((fee) => (
                      <div key={fee.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-fee-${fee.id}`}
                          checked={editingPupilFees.includes(fee.id)}
                          onCheckedChange={(checked) => {
                            setEditingPupilFees(prev => {
                              if (checked) {
                                return [...prev, fee.id];
                              } else {
                                return prev.filter(id => id !== fee.id);
                              }
                            });
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`edit-fee-${fee.id}`} className="text-sm font-medium cursor-pointer">
                            {fee.name}
                          </Label>
                          <div className="text-xs text-muted-foreground">
                            ZMW {fee.amount?.toLocaleString() || '0'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button onClick={handleSave} disabled={!form.full_name.trim() || !form.grade_id}>
              {editingPupil ? "Update Pupil" : "Create Pupil"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Pupil Creation Form - Only shown when adding new pupils */}
      {showAddForm && (
        <div className="rounded-xl border bg-card p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Pupil</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Enter full name" />
            </div>
            <div>
              <Label>Sex</Label>
              <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Grade</Label>
              <Select value={form.grade_id} onValueChange={(v) => setForm({ ...form, grade_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>{grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Parent Name</Label>
              <Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} placeholder="Enter parent name" />
            </div>
            <div>
              <Label>Parent Phone</Label>
              <Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} placeholder="Enter phone number" />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "new" | "old" })}>
                <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="old">Old</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} disabled={!form.full_name.trim() || !form.grade_id}>
            <Plus className="h-4 w-4 mr-2" />
            Create Pupil
          </Button>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search pupils..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={gradeFilter || "all"} onValueChange={(v) => setSearchParams(v === "all" ? {} : { grade: v.toString() })}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Fee Assignment Button */}
      {selectedPupils.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{selectedPupils.length} pupil(s) selected</span>
              <Button
                onClick={() => setFeeAssignmentOpen(true)}
                className="ml-4"
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Assign Fees
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead className="w-12">Select</TableHead><TableHead>Name</TableHead><TableHead>Sex</TableHead><TableHead>Grade</TableHead><TableHead>Parent</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Checkbox
                      checked={selectedPupils.includes(parseInt(p.id.toString()))}
                      onCheckedChange={(checked) => handlePupilSelection(parseInt(p.id.toString()), checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>{p.sex}</TableCell>
                  <TableCell>{p.grades?.name ?? "-"}</TableCell>
                  <TableCell>{p.parent_name}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'admitted' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-24">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/payments/${p.id}`);
                        }}
                        title="Record payment"
                      >
                        Payment
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(p);
                        }}
                        title="Edit pupil"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/pupil-profile/${p.id}`);
                        }}
                        title="Manage fees"
                      >
                        <DollarSign className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p);
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete pupil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No pupils found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Bulk Fee Assignment Dialog */}
      <Dialog open={feeAssignmentOpen} onOpenChange={setFeeAssignmentOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Fees to Selected Pupils</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">Selected Pupils: {selectedPupils.length}</Label>
              <div className="text-sm text-muted-foreground">
                {selectedPupils.map(id => pupils.find(p => parseInt(p.id.toString()) === id)?.full_name).join(', ')}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Select Fee Types to Assign</Label>
              {feesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-muted-foreground">Loading fee types...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {Array.isArray(otherFeeTypes) && otherFeeTypes.map((fee) => (
                    <div key={fee.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                      <Checkbox
                        id={`bulk-fee-${fee.id}`}
                        checked={selectedOtherFees.includes(fee.id)}
                        onCheckedChange={(checked) => handleOtherFeeToggle(fee.id, checked as boolean)}
                      />
                      <div>
                        <Label htmlFor={`bulk-fee-${fee.id}`} className="font-medium">
                          {fee.name}
                        </Label>
                        <div className="text-sm text-muted-foreground">
                          ZMW {fee.amount?.toLocaleString() || '0'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setFeeAssignmentOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBulkFeeAssignment}
                disabled={selectedPupils.length === 0 || selectedOtherFees.length === 0}
              >
                Assign Fees ({selectedPupils.length} pupils)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
