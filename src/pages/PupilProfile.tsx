import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getPupil, updatePupil } from "@/services/pupils";
import { getSchoolFees, createSchoolFee, getOtherFees, createOtherFee, updateOtherFee, getInstallments, recordSchoolFeePayment, recordOtherFeePayment } from "@/services/fees";
import { getTerms } from "@/services/terms";
import { getGrades } from "@/services/grades";
import type { Pupil, SchoolFee, OtherFee, Installment, Term, Grade } from "@/types";

export default function PupilProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [schoolFees, setSchoolFees] = useState<SchoolFee[]>([]);
  const [otherFees, setOtherFees] = useState<OtherFee[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit pupil dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    sex: "",
    grade_id: "",
    parent_name: "",
    parent_phone: "",
    status: "new" as "new" | "old" | "admitted",
    admission_blocked: false
  });

  // Payment dialog
  const [payOpen, setPayOpen] = useState(false);
  const [payFee, setPayFee] = useState<SchoolFee | OtherFee | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payRCT, setPayRCT] = useState("");

  // Create fee dialog
  const [feeOpen, setFeeOpen] = useState(false);
  const [feeForm, setFeeForm] = useState({ term_id: "", total_expected: 2400 });

  // Other fee dialog
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherForm, setOtherForm] = useState({ term_id: "", fee_type: "", total_expected: 0 });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, sf, of, inst, t, g] = await Promise.all([
        getPupil(id), getSchoolFees(id), getOtherFees(id), getInstallments(id), getTerms(), getGrades()
      ]);
      setPupil(p); 
      setSchoolFees(sf); 
      setOtherFees(of); 
      setInstallments(inst); 
      setTerms(t);
      setGrades(g);
      
      // Initialize edit form with current pupil data
      if (p) {
        setEditForm({
          full_name: p.full_name,
          sex: p.sex,
          grade_id: p.grade_id || "",
          parent_name: p.parent_name || "",
          parent_phone: p.parent_phone || "",
          status: p.status,
          admission_blocked: p.admission_blocked
        });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleEditPupil = async () => {
    if (!id) return;
    try {
      await updatePupil(id, editForm);
      setEditOpen(false);
      load();
      toast({ title: "Pupil information updated" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleMarkPaid = async (fee: OtherFee) => {
    if (!id) return;
    try {
      await recordOtherFeePayment(id, fee.id, fee.balance);
      load();
      toast({ title: "Marked as paid" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const totalBalance = schoolFees.reduce((s, f) => s + Number(f.balance), 0) + otherFees.reduce((s, f) => s + Number(f.balance), 0);
  const totalExpected = schoolFees.reduce((s, f) => s + Number(f.total_expected), 0) + otherFees.reduce((s, f) => s + Number(f.total_expected), 0);

  const handleCreateFee = async () => {
    if (!id) return;
    try {
      await createSchoolFee({
        pupil_id: id,
        term_id: feeForm.term_id,
        total_expected: feeForm.total_expected,
        collected: 0,
      });
      setFeeOpen(false);
      setFeeForm({ term_id: "", total_expected: 2400 });
      load();
      toast({ title: "School fee created" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handlePayment = async () => {
    if (!id || !payFee) return;
    try {
      if (payFee && 'total_expected' in payFee) {
        // School fee
        await recordSchoolFeePayment(id, payFee.id, +payAmount, payRCT);
      } else if (payFee) {
        // Other fee
        await recordOtherFeePayment(id, payFee.id, +payAmount);
      }
      setPayOpen(false); setPayFee(null); setPayAmount(""); setPayRCT("");
      load();
      toast({ title: "Payment recorded" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleOtherFee = async () => {
    if (!id) return;
    try {
      await createOtherFee({ pupil_id: id, term_id: otherForm.term_id, fee_type: otherForm.fee_type, total_expected: otherForm.total_expected });
      setOtherOpen(false); setOtherForm({ term_id: "", fee_type: "", total_expected: 0 });
      load();
      toast({ title: "Other fee added" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleUnblock = async () => {
    if (!id) return;
    try {
      await updatePupil(id, { status: 'admitted' });
      load();
      toast({ title: "Admission unblocked" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  if (!pupil) return <div className="text-center py-12 text-muted-foreground">Pupil not found</div>;

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate("/pupils")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />Back to Pupils
      </Button>

      <div className="flex items-center justify-between page-header">
        <div>
          <h1 className="page-title font-heading">{pupil.full_name}</h1>
          <p className="page-description">Grade: {pupil.grades?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={pupil.status === 'admitted' ? 'default' : 'secondary'}>
            {pupil.status}
          </Badge>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit Pupil
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Pupil Information</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <Label>Full Name</Label>
                  <Input 
                    value={editForm.full_name} 
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} 
                  />
                </div>
                <div>
                  <Label>Sex</Label>
                  <Select value={editForm.sex} onValueChange={(v) => setEditForm({ ...editForm, sex: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sex" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grade</Label>
                  <Select value={editForm.grade_id} onValueChange={(v) => setEditForm({ ...editForm, grade_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Parent Name</Label>
                  <Input 
                    value={editForm.parent_name} 
                    onChange={(e) => setEditForm({ ...editForm, parent_name: e.target.value })} 
                  />
                </div>
                <div>
                  <Label>Parent Phone</Label>
                  <Input 
                    value={editForm.parent_phone} 
                    onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })} 
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v as "new" | "old" | "admitted" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="old">Old</SelectItem>
                      <SelectItem value="admitted">Admitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleEditPupil} className="w-full">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="school-fees">School Fees</TabsTrigger>
          <TabsTrigger value="other-fees">Other Fees</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="stat-card">
              <p className="text-sm text-muted-foreground">Parent</p>
              <p className="font-semibold">{pupil.parent_name}</p>
              <p className="text-sm text-muted-foreground">{pupil.parent_phone}</p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-muted-foreground">Total Expected</p>
              <p className="text-2xl font-bold font-heading text-primary">ZMW {totalExpected.toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold font-heading text-secondary">ZMW {totalBalance.toLocaleString()}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="school-fees" className="mt-4">
          <div className="flex justify-end mb-4">
            <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Assign School Fee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign School Fee</DialogTitle>
                  <p className="text-sm text-muted-foreground">School fees are preset at ZMW 2,400 per term. Select the term to assign.</p>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Term</Label>
                    <Select value={feeForm.term_id} onValueChange={(v) => setFeeForm({ ...feeForm, term_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount (ZMW)</Label>
                    <Input
                      type="number"
                      value={feeForm.total_expected}
                      onChange={(e) => setFeeForm({ ...feeForm, total_expected: Number(e.target.value) || 2400 })}
                      placeholder="2400"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Standard school fee is ZMW 2,400 per term</p>
                  </div>
                  <Button onClick={handleCreateFee} className="w-full" disabled={!feeForm.term_id}>
                    Assign School Fee
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead>Total Expected</TableHead>
                  <TableHead>Total Collected</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schoolFees.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.terms?.name ?? "-"}</TableCell>
                    <TableCell>ZMW {Number(f.total_expected).toLocaleString()}</TableCell>
                    <TableCell>ZMW {Number(f.total_collected).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-secondary">ZMW {Number(f.balance).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={f.paid_toggle ? 'default' : 'secondary'}>{f.paid_toggle ? 'Yes' : 'No'}</Badge></TableCell>
                    <TableCell>
                      {Number(f.balance) > 0 && !f.paid_toggle && (
                        <Button size="sm" variant="outline" onClick={() => { setPayFee(f); setPayOpen(true); }}>
                          Record Payment
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {schoolFees.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No fees assigned.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog open={payOpen} onOpenChange={setPayOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">Outstanding: ZMW {Number(payFee?.balance ?? 0).toLocaleString()}</p>
                <div><Label>Amount</Label><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} max={payFee?.balance} /></div>
                {payFee && 'total_expected' in payFee && <div><Label>RCT No</Label><Input value={payRCT} onChange={(e) => setPayRCT(e.target.value)} /></div>}
                <Button onClick={handlePayment} className="w-full">Confirm Payment</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="other-fees" className="mt-4">
          <div className="flex justify-end mb-4">
            <Dialog open={otherOpen} onOpenChange={setOtherOpen}>
              <DialogTrigger asChild><Button size="sm"><DollarSign className="h-4 w-4 mr-1" />Add Other Fee</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Other Fee</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Term</Label>
                    <Select value={otherForm.term_id} onValueChange={(v) => setOtherForm({ ...otherForm, term_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                      <SelectContent>{terms.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Fee Type</Label><Input value={otherForm.fee_type} onChange={(e) => setOtherForm({ ...otherForm, fee_type: e.target.value })} placeholder="e.g. Exam Fee" /></div>
                  <div><Label>Total Expected</Label><Input type="number" value={otherForm.total_expected} onChange={(e) => setOtherForm({ ...otherForm, total_expected: +e.target.value })} /></div>
                  <Button onClick={handleOtherFee} className="w-full">Add Fee</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Term</TableHead><TableHead>Fee Type</TableHead><TableHead>Total Expected</TableHead><TableHead>Collected</TableHead><TableHead>Balance</TableHead><TableHead>Paid</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {otherFees.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.terms?.name ?? "-"}</TableCell>
                    <TableCell>{f.fee_type}</TableCell>
                    <TableCell>ZMW {Number(f.total_expected).toLocaleString()}</TableCell>
                    <TableCell>ZMW {Number(f.collected).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-secondary">ZMW {Number(f.balance).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={f.paid_toggle ? 'default' : 'secondary'}>{f.paid_toggle ? 'Yes' : 'No'}</Badge></TableCell>
                    <TableCell>
                      {Number(f.balance) > 0 && !f.paid_toggle && <Button size="sm" variant="outline" onClick={() => { setPayFee(f); setPayOpen(true); }}>Record Payment</Button>}
                    </TableCell>
                  </TableRow>
                ))}
                {otherFees.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No other fees.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Installment No</TableHead><TableHead>Amount Paid</TableHead><TableHead>Balance Remaining</TableHead><TableHead>RCT No</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {installments.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.installment_no}</TableCell>
                    <TableCell className="font-semibold text-success">ZMW {Number(i.amount_paid).toLocaleString()}</TableCell>
                    <TableCell>ZMW {Number(i.balance_remaining).toLocaleString()}</TableCell>
                    <TableCell>{i.RCT_no}</TableCell>
                    <TableCell>{new Date(i.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {installments.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No payments yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
