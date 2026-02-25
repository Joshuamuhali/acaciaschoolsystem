import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getGrades, createGrade, updateGrade, deleteGrade } from "@/services/grades";
import type { Grade } from "@/types";
import { supabase } from "@/integrations/supabase/client";

export default function Grades() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feeSettings, setFeeSettings] = useState<any[]>([]);
  const [gradeStats, setGradeStats] = useState<Record<string, { pupils: number; collected: number; outstanding: number }>>({});
  const [form, setForm] = useState({ name: "", level_order: 0, section: "", is_active: true });
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const g = await getGrades();
      setGrades(g);
      // const stats = await getGradeStats(g);
      // setGradeStats(stats);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editing) {
        await updateGrade(editing.id, form);
      } else {
        await createGrade(form);
      }
      setOpen(false);
      setEditing(null);
      setForm({ name: "", level_order: 0, section: "", is_active: true });
      load();
      toast({ title: editing ? "Grade updated" : "Grade created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (grade: Grade) => {
    setEditing(grade);
    setForm({ name: grade.name, level_order: grade.level_order, section: grade.section || "", is_active: grade.is_active });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this grade?")) return;
    try {
      await deleteGrade(id);
      load();
      toast({ title: "Grade deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const loadFeeSettings = async (gradeId: string) => {
    const { data, error } = await (supabase as any).from("fee_defaults").select("*").eq("grade_id", gradeId);
    if (error) throw error;
    setFeeSettings(data || []);
  };

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title font-heading">Grades</h1>
          <p className="page-description">Manage school grades and classes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/grade-settings')}>Grade Settings</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Grade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Grade" : "New Grade"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grade 1" /></div>
                <div><Label>Level Order</Label><Input type="number" value={form.level_order} onChange={(e) => setForm({ ...form, level_order: Number(e.target.value) || 0 })} placeholder="e.g. 1" /></div>
                <div><Label>Section</Label><Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. Primary" /></div>
                <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings for {selectedGrade?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeSettings.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.fee_type}</TableCell>
                    <TableCell>{f.amount}</TableCell>
                    <TableCell>{f.is_active ? 'Yes' : 'No'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm" className="text-destructive">Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {feeSettings.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No fee settings for this grade.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Pupils</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((g) => {
                const s = gradeStats[g.id] || { pupils: 0, collected: 0, outstanding: 0 };
                return (
                  <TableRow key={g.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pupils?grade=${g.id}`)}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell><span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{s.pupils}</span></TableCell>
                    <TableCell className="text-success font-medium">ZMW {s.collected.toLocaleString()}</TableCell>
                    <TableCell className="text-secondary font-medium">ZMW {s.outstanding.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" title="Edit grade" onClick={() => handleEdit(g)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Grade settings" onClick={() => { setSelectedGrade(g); setSettingsOpen(true); loadFeeSettings(g.id); }}>
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete grade" onClick={() => handleDelete(g.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {grades.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No grades yet. Click "Add Grade" to get started.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
