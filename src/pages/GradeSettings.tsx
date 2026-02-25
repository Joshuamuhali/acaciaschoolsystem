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
import { supabase } from "@/integrations/supabase/client";

interface FeeSetting {
  fee_type: string;
  amount: number;
  is_active: boolean;
}

export default function GradeSettings() {
  const [settings, setSettings] = useState<FeeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeSetting | null>(null);
  const [form, setForm] = useState({ fee_type: "", amount: 0, is_active: true });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from("default_fee_settings").select("*");
      if (error) throw error;
      setSettings(data || []);
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
        // Update
        const { error } = await (supabase as any).from("default_fee_settings").update(form).eq("fee_type", editing.fee_type);
        if (error) throw error;
        toast({ title: "Fee setting updated" });
      } else {
        // Create
        const { error } = await (supabase as any).from("default_fee_settings").insert(form);
        if (error) throw error;
        toast({ title: "Fee setting created" });
      }
      setOpen(false);
      setEditing(null);
      setForm({ fee_type: "", amount: 0, is_active: true });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (s: FeeSetting) => {
    setEditing(s);
    setForm({ fee_type: s.fee_type, amount: s.amount, is_active: s.is_active });
    setOpen(true);
  };

  const handleDelete = async (fee_type: string) => {
    if (!confirm("Delete this fee setting?")) return;
    try {
      const { error } = await (supabase as any).from("default_fee_settings").delete().eq("fee_type", fee_type);
      if (error) throw error;
      load();
      toast({ title: "Fee setting deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title font-heading">Grade Settings</h1>
          <p className="page-description">Manage default fee settings for grades</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ fee_type: "", amount: 0, is_active: true }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Fee Setting</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Fee Setting" : "New Fee Setting"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div><Label>Fee Type</Label><Input value={form.fee_type} onChange={(e) => setForm({ ...form, fee_type: e.target.value })} placeholder="e.g. school_fee" disabled={!!editing} /></div>
              <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })} placeholder="e.g. 1000" /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
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
                <TableHead>Fee Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((s) => (
                <TableRow key={s.fee_type}>
                  <TableCell className="font-medium">{s.fee_type}</TableCell>
                  <TableCell>{s.amount}</TableCell>
                  <TableCell><Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.fee_type)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {settings.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No fee settings yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
