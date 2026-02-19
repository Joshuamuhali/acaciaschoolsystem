import { useState } from "react";
import { useFees } from "@/hooks/useFees";
import { useGrades, useCreateGrade, useDeleteGrade } from "@/hooks/useGrades";
import { usePayments } from "@/hooks/usePayments";
import { useOverrideTermLock, useAdjustPaymentBalance } from "@/hooks/useSuperAdmin";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  Lock, 
  Unlock, 
  Edit, 
  Trash2, 
  Plus, 
  AlertTriangle,
  Shield,
  TrendingUp,
  Users,
  Calendar,
  Scale
} from "lucide-react";
import { format } from "date-fns";

export default function FeeTermManagement() {
  const { data: fees, isLoading: feesLoading } = useFees();
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { isSuperAdmin, isSchoolAdmin } = useAuthWithPermissions();
  const overrideTermLock = useOverrideTermLock();
  const adjustPaymentBalance = useAdjustPaymentBalance();
  
  const [selectedTerm, setSelectedTerm] = useState({ term: 1, year: new Date().getFullYear() });
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [newAmount, setNewAmount] = useState("");
  
  const [newFee, setNewFee] = useState({
    gradeId: "",
    termNumber: 1,
    year: new Date().getFullYear(),
    amount: "",
  });

  // Calculate statistics for selected term
  const termStats = {
    totalExpected: fees?.filter(f => 
      f.term_number === selectedTerm.term && 
      f.year === selectedTerm.year && 
      f.is_active
    ).reduce((sum, f) => sum + Number(f.amount), 0) || 0,
    
    totalCollected: payments?.filter(p => 
      p.term_number === selectedTerm.term && 
      p.year === selectedTerm.year && 
      !p.is_deleted
    ).reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0,
    
    pendingApprovals: payments?.filter(p => p.is_deleted).length || 0,
  };

  termStats.outstanding = termStats.totalExpected - termStats.totalCollected;

  const handleCreateFee = (e: React.FormEvent) => {
    e.preventDefault();
    // Fee creation functionality will be implemented with API integration
    setFeeDialogOpen(false);
  };

  const handleOverrideLock = () => {
    overrideTermLock.mutate(
      {
        termNumber: selectedTerm.term,
        year: selectedTerm.year,
        reason: overrideReason,
      },
      {
        onSuccess: () => {
          setLockDialogOpen(false);
          setOverrideReason("");
        },
      }
    );
  };

  const handleAdjustBalance = () => {
    if (!selectedPayment || !newAmount || !adjustmentReason) return;
    
    adjustPaymentBalance.mutate(
      {
        paymentId: selectedPayment.id,
        newAmount: Number(newAmount),
        reason: adjustmentReason,
      },
      {
        onSuccess: () => {
          setAdjustDialogOpen(false);
          setSelectedPayment(null);
          setNewAmount("");
          setAdjustmentReason("");
        },
      }
    );
  };

  // Both Super Admin and School Admin can access fee management
  const canAccess = isSuperAdmin?.() || isSchoolAdmin?.();
  const isSuperAdminUser = isSuperAdmin?.();
  
  if (!canAccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Access Restricted</p>
            <p className="text-sm">Only administrators can manage fees and terms.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Fee & Term Management</h2>
          <p className="text-muted-foreground">Manage fee structures and term controls</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Fee</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateFee} className="space-y-4">
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select value={newFee.gradeId} onValueChange={(value) => setNewFee({ ...newFee, gradeId: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {grades?.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>
                          {grade.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Term</Label>
                    <Select value={newFee.termNumber.toString()} onValueChange={(value) => setNewFee({ ...newFee, termNumber: Number(value) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Term 1</SelectItem>
                        <SelectItem value="2">Term 2</SelectItem>
                        <SelectItem value="3">Term 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={newFee.year}
                      onChange={(e) => setNewFee({ ...newFee, year: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount (K)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newFee.amount}
                    onChange={(e) => setNewFee({ ...newFee, amount: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Fee
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Term Selector and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Select Term</Label>
              <div className="flex gap-2">
                <Select value={selectedTerm.term.toString()} onValueChange={(value) => setSelectedTerm({ ...selectedTerm, term: Number(value) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={selectedTerm.year}
                  onChange={(e) => setSelectedTerm({ ...selectedTerm, year: Number(e.target.value) })}
                  className="w-24"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expected</p>
                <p className="text-xl font-bold text-green-600">K{termStats.totalExpected.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold text-blue-600">K{termStats.totalCollected.toFixed(2)}</p>
              </div>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold text-orange-600">K{termStats.outstanding.toFixed(2)}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="fees" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fees">Fee Structures</TabsTrigger>
          {isSuperAdminUser && (
            <>
              <TabsTrigger value="terms">Term Controls</TabsTrigger>
              <TabsTrigger value="overrides">Emergency Overrides</TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Fee Structures */}
        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fee Structures</CardTitle>
            </CardHeader>
            <CardContent>
              {feesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading fees...</div>
              ) : !fees?.length ? (
                <div className="text-center py-8 text-muted-foreground">No fees configured</div>
              ) : (
                <div className="space-y-4">
                  {fees
                    .filter(f => f.term_number === selectedTerm.term && f.year === selectedTerm.year)
                    .map((fee) => (
                      <div key={fee.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div>
                          <p className="font-medium">{fee.grades?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Term {fee.term_number}, {fee.year}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-primary">K{Number(fee.amount).toFixed(2)}</span>
                          <Badge variant={fee.is_active ? "default" : "secondary"}>
                            {fee.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Term Controls */}
        <TabsContent value="terms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Term Lock Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">Term {selectedTerm.term}, {selectedTerm.year}</p>
                    <p className="text-sm text-muted-foreground">
                      Control access to payment modifications
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Status: Unknown</Badge>
                    <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Lock className="h-4 w-4 mr-2" />
                          Override Lock
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Override Term Lock</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p>
                            Override term lock for Term {selectedTerm.term}, {selectedTerm.year}?
                          </p>
                          <div className="space-y-2">
                            <Label>Reason for override</Label>
                            <Input
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              placeholder="Enter reason for override..."
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setLockDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleOverrideLock} disabled={overrideTermLock.isPending}>
                              Override Lock
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Emergency Overrides */}
        <TabsContent value="overrides" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Balance Adjustments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Emergency payment adjustments for exceptional circumstances. All actions are logged.
                </p>
                
                {paymentsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
                ) : !payments?.length ? (
                  <div className="text-center py-8 text-muted-foreground">No payments found</div>
                ) : (
                  <div className="space-y-4">
                    {payments
                      .filter(p => p.term_number === selectedTerm.term && p.year === selectedTerm.year)
                      .slice(0, 10)
                      .map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                          <div>
                            <p className="font-medium">{payment.pupils?.full_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {payment.pupils?.grades?.name} • Term {payment.term_number}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payment.payment_date), "dd MMM yyyy")}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-primary">K{Number(payment.amount_paid).toFixed(2)}</span>
                            <Badge variant={payment.is_deleted ? "destructive" : "default"}>
                              {payment.is_deleted ? "Deleted" : "Active"}
                            </Badge>
                            <Dialog open={adjustDialogOpen && selectedPayment?.id === payment.id} onOpenChange={setAdjustDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedPayment(payment)}
                                >
                                  <Scale className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Adjust Payment Balance</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Payment</Label>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {selectedPayment?.pupils?.full_name} • Current: K{Number(selectedPayment?.amount_paid).toFixed(2)}
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>New Amount (K)</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={newAmount}
                                      onChange={(e) => setNewAmount(e.target.value)}
                                      placeholder="Enter new amount..."
                                      required
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Adjustment Reason</Label>
                                    <Input
                                      value={adjustmentReason}
                                      onChange={(e) => setAdjustmentReason(e.target.value)}
                                      placeholder="Enter reason for adjustment..."
                                      required
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                                      Cancel
                                    </Button>
                                    <Button onClick={handleAdjustBalance} disabled={adjustPaymentBalance.isPending}>
                                      Adjust Balance
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
