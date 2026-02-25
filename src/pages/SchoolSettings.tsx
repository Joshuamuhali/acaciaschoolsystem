import { useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getSchoolSettings, updateSchoolSetting } from "@/services/school_settings";
import type { SchoolSetting } from "@/types";

export default function SchoolSettings() {
  const [settings, setSettings] = useState<SchoolSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolSetting | null>(null);
  const [form, setForm] = useState({ key: "", value: "" });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const s = await getSchoolSettings();
      setSettings(s);
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
        await updateSchoolSetting(editing.key, form.value);
      } else {
        // For new, perhaps not implement add, since keys are predefined
        toast({ title: "Error", description: "Adding new settings not implemented", variant: "destructive" });
        return;
      }
      setOpen(false);
      setEditing(null);
      setForm({ key: "", value: "" });
      load();
      toast({ title: "Setting updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (s: SchoolSetting) => {
    setEditing(s);
    setForm({ key: s.key, value: s.value });
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title font-heading">School Settings</h1>
          <p className="page-description">System configuration</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ key: "", value: "" }); } }}>
          <DialogTrigger asChild>
            <Button disabled><Plus className="h-4 w-4 mr-2" />Add Setting</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit Setting" : "New Setting"}</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div><Label>Key</Label><Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} disabled={!!editing} /></div>
              <div><Label>Value</Label><Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
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
                <TableHead>Key</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.key}</TableCell>
                  <TableCell>{s.value}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {settings.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No settings yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
