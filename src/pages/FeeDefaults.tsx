import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getFeeDefaults, createFeeDefault, updateFeeDefault, deleteFeeDefault } from "@/services/fee_defaults";
import { getGrades } from "@/services/grades";
import type { FeeDefault, Grade } from "@/types";

export default function FeeDefaults() {
  const [feeDefaults, setFeeDefaults] = useState<FeeDefault[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeDefault | null>(null);
  const [form, setForm] = useState({ grade_id: "", fee_type: "", amount: 0 });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [fd, g] = await Promise.all([getFeeDefaults(), getGrades()]);
      setFeeDefaults(fd);
      setGrades(g);
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
        await updateFeeDefault(editing.id, form);
      } else {
        await createFeeDefault(form);
      }
      setOpen(false);
      setEditing(null);
      setForm({ grade_id: "", fee_type: "", amount: 0 });
      load();
      toast({ title: editing ? "Fee default updated" : "Fee default created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (fd: FeeDefault) => {
    setEditing(fd);
    setForm({ grade_id: fd.grade_id, fee_type: fd.fee_type, amount: fd.amount });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this fee default?")) return;
    try {
      await deleteFeeDefault(id);
      load();
      toast({ title: "Fee default deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title font-heading">Fee Defaults</h1>
          <p className="page-description">Set default fees per grade</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ grade_id: "", fee_type: "", amount: 0 }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Fee Default</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Fee Default" : "New Fee Default"}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>Grade</Label>
                <Select value={form.grade_id} onValueChange={(v) => setForm({ ...form, grade_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                  <SelectContent>{grades.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Fee Type</Label><Input value={form.fee_type} onChange={(e) => setForm({ ...form, fee_type: e.target.value })} placeholder="e.g. school_fee" /></div>
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grade</TableHead>
                <TableHead>Fee Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeDefaults.map((fd) => {
                const grade = grades.find(g => g.id === fd.grade_id);
                return (
                  <TableRow key={fd.id}>
                    <TableCell>{grade?.name ?? "-"}</TableCell>
                    <TableCell>{fd.fee_type}</TableCell>
                    <TableCell>ZMW {fd.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(fd)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(fd.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {feeDefaults.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No fee defaults yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
