import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getTerms, createTerm, updateTerm, deleteTerm } from "@/services/terms";
import type { Term } from "@/types";

export default function Terms() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Term | null>(null);
  const [form, setForm] = useState({ name: "", start_date: "", end_date: "", is_active: false });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      setTerms(await getTerms());
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editing) { await updateTerm(editing.id, form); } else { await createTerm(form); }
      setOpen(false); setEditing(null); setForm({ name: "", start_date: "", end_date: "", is_active: false });
      load(); toast({ title: editing ? "Term updated" : "Term created" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (t: Term) => {
    setEditing(t);
    setForm({ name: t.name, start_date: t.start_date, end_date: t.end_date, is_active: t.is_active });
    setOpen(true);
  };
  const handleDelete = async (id: string) => { if (!confirm("Delete this term?")) return; try { await deleteTerm(id); load(); toast({ title: "Term deleted" }); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } };

  const handleForceOpen = async (id: string) => { try { await updateTerm(id, { is_active: true }); load(); toast({ title: "Term activated" }); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } };
  const handleForceClose = async (id: string) => { try { await updateTerm(id, { is_active: false }); load(); toast({ title: "Term deactivated" }); } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); } };

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div><h1 className="page-title font-heading">Terms</h1><p className="page-description">Manage academic terms</p></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: "", start_date: "", end_date: "", is_active: false }); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Term</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Term" : "New Term"}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Term 1 2025" /></div>
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {terms.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{new Date(t.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(t.end_date).toLocaleDateString()}</TableCell>
                  <TableCell><Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleForceOpen(t.id)}>Open</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleForceClose(t.id)}>Close</Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {terms.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No terms yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
