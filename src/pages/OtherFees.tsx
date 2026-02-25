import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createOtherFee, getOtherFees, updateOtherFee, deleteOtherFee } from "@/services/fees";
import { getTerms } from "@/services/terms";
import { getPupils } from "@/services/pupils";
import type { OtherFee, Term, Pupil } from "@/types";

export default function OtherFees() {
  const [fees, setFees] = useState<OtherFee[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [pupils, setPupils] = useState<Pupil[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<OtherFee | null>(null);
  const [form, setForm] = useState({
    pupil_id: "",
    term_id: "",
    fee_type: "",
    total_expected: 0
  });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [f, t, p] = await Promise.all([
        getOtherFees(),
        getTerms(),
        getPupils()
      ]);
      setFees(f);
      setTerms(t);
      setPupils(p);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editingFee) {
        await updateOtherFee(editingFee.id, {
          pupil_id: form.pupil_id,
          term_id: form.term_id,
          fee_type: form.fee_type,
          total_expected: form.total_expected
        });
        toast({ title: "Fee updated successfully" });
      } else {
        await createOtherFee({
          pupil_id: form.pupil_id,
          term_id: form.term_id,
          fee_type: form.fee_type,
          total_expected: form.total_expected,
          collected: 0
        });
        toast({ title: "Fee created successfully" });
      }
      setOpen(false);
      setEditingFee(null);
      setForm({ pupil_id: "", term_id: "", fee_type: "", total_expected: 0 });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (fee: OtherFee) => {
    setEditingFee(fee);
    setForm({
      pupil_id: fee.pupil_id,
      term_id: fee.term_id,
      fee_type: fee.fee_type,
      total_expected: fee.total_expected
    });
    setOpen(true);
  };

  const handleDelete = async (fee: OtherFee) => {
    if (!confirm(`Are you sure you want to delete this ${fee.fee_type} fee for ${fee.pupils?.full_name}?`)) {
      return;
    }

    try {
      await deleteOtherFee(fee.id);
      load();
      toast({ title: "Fee deleted successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setForm({ pupil_id: "", term_id: "", fee_type: "", total_expected: 0 });
    setEditingFee(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title font-heading">Other Fees Management</h1>
          <p className="page-description">Manage additional fees like maintenance, sports, library, PTC, etc.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Fee</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingFee ? 'Edit' : 'Add'} Other Fee</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Pupil</Label>
                <Select value={form.pupil_id} onValueChange={(v) => setForm({ ...form, pupil_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select pupil" /></SelectTrigger>
                  <SelectContent>
                    {pupils.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term</Label>
                <Select value={form.term_id} onValueChange={(v) => setForm({ ...form, term_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    {terms.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fee Type</Label>
                <Select value={form.fee_type} onValueChange={(v) => setForm({ ...form, fee_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select fee type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Library">Library</SelectItem>
                    <SelectItem value="PTC">PTC</SelectItem>
                    <SelectItem value="Exam">Exam</SelectItem>
                    <SelectItem value="Transportation">Transportation</SelectItem>
                    <SelectItem value="Lunch">Lunch</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (ZMW)</Label>
                <Input
                  type="number"
                  value={form.total_expected}
                  onChange={(e) => setForm({ ...form, total_expected: +e.target.value })}
                />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!form.pupil_id || !form.term_id || !form.fee_type}>
                {editingFee ? 'Update' : 'Create'} Fee
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pupil</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Fee Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id}>
                  <TableCell>{fee.pupils?.full_name ?? "-"}</TableCell>
                  <TableCell>{fee.terms?.name ?? "-"}</TableCell>
                  <TableCell className="font-medium">{fee.fee_type}</TableCell>
                  <TableCell>ZMW {Number(fee.total_expected).toLocaleString()}</TableCell>
                  <TableCell>ZMW {Number(fee.collected).toLocaleString()}</TableCell>
                  <TableCell className="font-semibold text-secondary">
                    ZMW {Number(fee.balance).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      fee.paid_toggle ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {fee.paid_toggle ? 'Paid' : 'Unpaid'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(fee)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(fee)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {fees.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No other fees found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
