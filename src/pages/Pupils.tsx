import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createPupil, getPupils } from "@/services/pupils";
import { getFeeDefaults } from "@/services/fee_defaults";
import { createSchoolFee } from "@/services/fees";
import { getGrades } from "@/services/grades";
import type { Pupil, Grade } from "@/types";

export default function Pupils() {
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const gradeFilter = searchParams.get("grade") || "";
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", sex: "", grade_id: "", parent_name: "", parent_phone: "", status: "new" as "new" | "old", admission_blocked: false });
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const handleSave = async () => {
    try {
      const pupil = await createPupil(form);
      // Create school fee from fee_defaults
      const feeDefaults = await getFeeDefaults();
      const fee = feeDefaults.find(f => f.grade_id === form.grade_id && f.fee_type === 'school_fee');
      if (fee) {
        // const { data: term } = await getCurrentTerm();
        // if (term) {
        //   await createSchoolFee({ pupil_id: pupil.id, term_id: term.id, total_expected: fee.amount });
        // }
      }
      setOpen(false);
      setForm({ full_name: "", sex: "", grade_id: "", parent_name: "", parent_phone: "", status: "new" as "new" | "old", admission_blocked: false });
      load();
      toast({ title: "Pupil created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title font-heading">Pupils</h1>
          <p className="page-description">Manage student records</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm({ full_name: "", sex: "", grade_id: "", parent_name: "", parent_phone: "", status: "new" as "new" | "old", admission_blocked: false }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Pupil</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Pupil</DialogTitle><DialogDescription>Fill in the pupil details below.</DialogDescription></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
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
              <div><Label>Parent Name</Label><Input value={form.parent_name} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></div>
              <div><Label>Parent Phone</Label><Input value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "new" | "old" })}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent><SelectItem value="new">New</SelectItem><SelectItem value="old">Old</SelectItem></SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Sex</TableHead><TableHead>Grade</TableHead><TableHead>Parent</TableHead><TableHead>Status</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pupils/${p.id}`)}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>{p.sex}</TableCell>
                  <TableCell>{p.grades?.name ?? "-"}</TableCell>
                  <TableCell>{p.parent_name}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'admitted' ? 'default' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-24"></TableCell>
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
