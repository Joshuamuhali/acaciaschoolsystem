import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createPupil, getPupils, deletePupil, updatePupil } from "@/services/pupils";
import { createSchoolFee, createOtherFee } from "@/services/fees";
import { getGrades } from "@/services/grades";
import { getTerms } from "@/services/terms";
import type { Pupil, Grade } from "@/types";

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

  const load = async () => {
    setLoading(true);
    try {
      const [p, g] = await Promise.all([getPupils(gradeFilter || undefined), getGrades()]);
      setPupils(p);
      setGrades(g);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [gradeFilter]);

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
        toast({ title: "Pupil updated successfully" });
      } else {
        // Create new pupil - fees will be automatically assigned by database trigger
        const pupil = await createPupil(form);
        toast({ title: "Pupil created successfully" });
      }

      setOpen(false);
      setEditingPupil(null);
      setForm({ full_name: "", sex: "", grade_id: "", parent_name: "", parent_phone: "", status: "new" as "new" | "old", admission_blocked: false });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (pupil: Pupil) => {
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
        <Select value={gradeFilter || "all"} onValueChange={(v) => setSearchParams(v === "all" ? {} : { grade: v })}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Sex</TableHead><TableHead>Grade</TableHead><TableHead>Parent</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
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
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No pupils found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
