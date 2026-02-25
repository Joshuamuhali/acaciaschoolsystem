import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Edit, CheckCircle, Plus, BookOpen, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getSchoolFees, createSchoolFee, getOtherFees, createOtherFee, getInstallments, recordSchoolFeePayment, recordOtherFeePayment } from "@/services/fees";
import { getTerms } from "@/services/terms";
import { getGrades } from "@/services/grades";
import { supabase } from "@/integrations/supabase/client";
import type { Pupil, SchoolFee, OtherFee, Installment, Term, Grade } from "@/types";

// Type guard to distinguish OtherFee from SchoolFee
function isOtherFee(fee: SchoolFee | OtherFee): fee is OtherFee {
  return 'fee_type' in fee;
}

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
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);

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

  const handlePayment = async () => {
    if (!id || !payFee) return;

    console.log('handlePayment called at', new Date().toISOString(), 'for fee:', payFee.id);

    setIsProcessingPayment(true); // Set immediately to prevent multiple clicks

    if (isProcessingPayment) {
      console.log('Payment already processing, ignoring click');
      return; // Prevent multiple submissions
    }

    const amount = paymentType === "full" ? Number(payFee.balance) : Number(payAmount);
    if (!amount || amount <= 0 || amount > Number(payFee.balance)) {
      toast({ title: "Error", description: "Invalid payment amount", variant: "destructive" });
      setIsProcessingPayment(false); // Reset on error
      return;
    }

    const discount = discountApplied ? discountPercentage : 0;

    console.log('Calling RPC for amount:', amount, 'discount:', discount);

    try {
      if (!isOtherFee(payFee)) { 
        await supabase.rpc('process_school_fee_payment', {
          p_pupil_id: id,
          p_school_fee_id: payFee.id,
          p_amount: amount,
          p_discount: discount,
          p_rct_no: payRCT
        });
      } else {
        throw new Error("This payment form is specifically for school fees only. Other fees must be paid separately.");
      }
      setPayOpen(false);
      setPayFee(null);
      setPayAmount("");
      setPayRCT("");
      setPaymentType("full");
      setDiscountApplied(false);
      setDiscountPercentage(0);
      load();
      toast({ title: "Payment recorded successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const totalBalance = schoolFees.reduce((s, f) => s + Number(f.balance), 0) + otherFees.reduce((s, f) => s + Number(f.balance), 0);
  const totalExpected = schoolFees.reduce((s, f) => s + Number(f.total_expected), 0) + otherFees.reduce((s, f) => s + Number(f.total_expected), 0);

  const payableFees = [...schoolFees, ...otherFees]
    .filter(f => Number(f.balance) > 0 && !f.paid_toggle)
    .sort((a, b) => Number(b.balance) - Number(a.balance));

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
              <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-2" />Edit Pupil</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Pupil Information</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div><Label>Full Name</Label><Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} /></div>
                <div>
                  <Label>Sex</Label>
                  <Select value={editForm.sex} onValueChange={(v) => setEditForm({ ...editForm, sex: v })}>
                    <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grade</Label>
                  <Select value={editForm.grade_id} onValueChange={(v) => setEditForm({ ...editForm, grade_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                    <SelectContent>{grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Parent Name</Label><Input value={editForm.parent_name} onChange={(e) => setEditForm({ ...editForm, parent_name: e.target.value })} /></div>
                <div><Label>Parent Phone</Label><Input value={editForm.parent_phone} onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })} /></div>
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

          {/* PAYMENT SECTION - IMMEDIATELY VISIBLE */}
          {payableFees.length > 0 ? (
            <div className="border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Outstanding Payments ({payableFees.length})
                </h3>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  Action Required
                </Badge>
              </div>

              <div className="space-y-3">
                {payableFees.slice(0, 3).map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md border border-orange-100 dark:border-orange-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {'fee_type' in fee ? fee.fee_type : 'School Fee'}
                        </span>
                        {'terms' in fee && fee.terms && (
                          <Badge variant="outline" className="text-xs">
                            {fee.terms.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Balance: <span className="font-semibold text-orange-600">ZMW {Number(fee.balance).toLocaleString()}</span>
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setPayFee(fee);
                        setPayOpen(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white min-w-[100px]"
                      aria-label={`Record payment for ${'fee_type' in fee ? fee.fee_type : 'school fee'}`}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Pay Now
                    </Button>
                  </div>
                ))}

                {payableFees.length > 3 && (
                  <p className="text-sm text-center text-muted-foreground">
                    +{payableFees.length - 3} more fees • Check School Fees & Other Fees tabs
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    All Fees Paid
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    No outstanding payments for this pupil
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Up to Date
                </Badge>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="school-fees" className="mt-4">
          <div className="flex justify-end mb-4">
            <Dialog open={feeOpen} onOpenChange={setFeeOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Add School Fee</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add School Fee</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div><Label>Term</Label>
                    <Select value={feeForm.term_id} onValueChange={(v) => setFeeForm({ ...feeForm, term_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                      <SelectContent>{terms.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Total Expected</Label><Input type="number" value={feeForm.total_expected} onChange={(e) => setFeeForm({ ...feeForm, total_expected: +e.target.value })} /></div>
                  <Button onClick={async () => {
                    if (!id || !feeForm.term_id) return;
                    await createSchoolFee({ pupil_id: id, term_id: feeForm.term_id, total_expected: feeForm.total_expected, collected: 0 });
                    setFeeOpen(false);
                    setFeeForm({ term_id: "", total_expected: 2400 });
                    load();
                    toast({ title: "School fee added" });
                  }} className="w-full">Add School Fee</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Term</TableHead><TableHead>Total Expected</TableHead><TableHead>Collected</TableHead><TableHead>Balance</TableHead><TableHead>Paid</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {schoolFees.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.terms?.name ?? "-"}</TableCell>
                    <TableCell>ZMW {Number(f.total_expected).toLocaleString()}</TableCell>
                    <TableCell>ZMW {Number(f.total_collected).toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-secondary">ZMW {Number(f.balance).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={f.paid_toggle ? 'default' : 'secondary'}>{f.paid_toggle ? 'Yes' : 'No'}</Badge></TableCell>
                    <TableCell>
                      {Number(f.balance) > 0 && !f.paid_toggle && <Button size="sm" variant="outline" onClick={() => { setPayFee(f); setPayOpen(true); }}>Record Payment</Button>}
                    </TableCell>
                  </TableRow>
                ))}
                {schoolFees.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No school fees.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
                  <Button onClick={async () => {
                    if (!id || !otherForm.term_id || !otherForm.fee_type) return;
                    await createOtherFee({ pupil_id: id, term_id: otherForm.term_id, fee_type: otherForm.fee_type, total_expected: otherForm.total_expected, collected: 0 });
                    setOtherOpen(false);
                    setOtherForm({ term_id: "", fee_type: "", total_expected: 0 });
                    load();
                    toast({ title: "Other fee added" });
                  }} className="w-full">Add Other Fee</Button>
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

      {/* Payment Dialog - Moved outside Tabs so it can be accessed from overview */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Fee: {payFee ? ('fee_type' in payFee ? payFee.fee_type : 'School Fee') : "-"}
            </p>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Outstanding Balance:</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  ZMW {Number(payFee?.balance ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Payment Type</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="full-payment"
                    name="payment-type"
                    checked={paymentType === "full"}
                    onChange={() => setPaymentType("full")}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="full-payment" className="cursor-pointer">
                    Full Payment - Pay the entire outstanding balance
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="partial-payment"
                    name="payment-type"
                    checked={paymentType === "partial"}
                    onChange={() => setPaymentType("partial")}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="partial-payment" className="cursor-pointer">
                    Partial Payment - Pay a portion of the balance
                  </Label>
                </div>
              </div>
            </div>

            {/* Amount Input - Only show for partial payments */}
            {paymentType === "partial" && (
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Payment Amount (ZMW)</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter payment amount"
                  max={payFee?.balance}
                  min="0"
                  step="0.01"
                />
                {payAmount && Number(payAmount) > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Remaining balance after payment: ZMW {(Number(payFee?.balance ?? 0) - Number(payAmount)).toLocaleString()}
                  </div>
                )}
              </div>
            )}

            {/* Amount Display for Full Payment */}
            {paymentType === "full" && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Amount to be paid:</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    ZMW {Number(payFee?.balance ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {payFee && 'total_expected' in payFee && (
              <div className="space-y-2">
                <Label htmlFor="rct-number">RCT Number (Receipt)</Label>
                <Input
                  id="rct-number"
                  value={payRCT}
                  onChange={(e) => setPayRCT(e.target.value)}
                  placeholder="Enter RCT number"
                />
              </div>
            )}

            {/* Discount Section */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apply-discount"
                  checked={discountApplied}
                  onCheckedChange={(checked) => setDiscountApplied(checked === true)}
                />
                <Label htmlFor="apply-discount" className="cursor-pointer">Apply Discount</Label>
              </div>
              {discountApplied && (
                <div className="space-y-2">
                  <Label htmlFor="discount-percentage">Discount Percentage (%)</Label>
                  <Input
                    id="discount-percentage"
                    type="number"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 10.00"
                  />
                  {discountPercentage > 0 && payAmount && (
                    <div className="text-xs text-muted-foreground">
                      Effective amount: ZMW {(Number(payAmount) - (Number(payAmount) * discountPercentage / 100)).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setPayOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={isProcessingPayment || (paymentType === "partial" && (!payAmount || Number(payAmount) <= 0 || Number(payAmount) > Number(payFee?.balance ?? 0)))}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isProcessingPayment ? "Processing..." : `Record ${paymentType === "full" ? "Full" : "Partial"} Payment`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
