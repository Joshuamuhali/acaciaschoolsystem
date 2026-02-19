import { useState } from "react";
import { usePayments } from "@/hooks/usePayments";
import { useOverrideTermLock, useAdjustPaymentBalance } from "@/hooks/useSuperAdmin";
import { useUserRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Shield, 
  Lock, 
  Unlock, 
  Scale, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  FileText
} from "lucide-react";
import { format } from "date-fns";

export default function EmergencyOverrides() {
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { role: currentUserRole } = useUserRole();
  const overrideTermLock = useOverrideTermLock();
  const adjustPaymentBalance = useAdjustPaymentBalance();
  
  const [selectedTerm, setSelectedTerm] = useState({ term: 1, year: new Date().getFullYear() });
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");

  // Get pending deletions
  const pendingDeletions = payments?.filter(p => p.is_deleted) || [];
  const termPayments = payments?.filter(p => 
    p.term_number === selectedTerm.term && 
    p.year === selectedTerm.year
  ) || [];

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

  const handleApprovalAction = () => {
    if (!selectedPayment) return;
    
    // Payment approval/rejection functionality will be implemented with API integration
    setApproveDialogOpen(false);
    setSelectedPayment(null);
  };

  // Only Super Admin can access
  if (currentUserRole !== "SuperAdmin") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Access Restricted</p>
            <p className="text-sm">Only Super Admin can access emergency overrides.</p>
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
          <h2 className="text-2xl font-bold font-display text-foreground">Emergency Overrides</h2>
          <p className="text-muted-foreground">Critical system overrides for exceptional circumstances</p>
        </div>
      </div>

      {/* Warning Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Warning:</strong> These actions override normal system controls and should only be used in emergency situations. All actions are permanently logged.
        </AlertDescription>
      </Alert>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Deletions</p>
                <p className="text-2xl font-bold text-red-600">{pendingDeletions.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Term {selectedTerm.term} Payments</p>
                <p className="text-2xl font-bold text-blue-600">{termPayments.length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Status</p>
                <p className="text-2xl font-bold text-green-600">Operational</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Override Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Term Lock Override */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Term Lock Override
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Select value={selectedTerm.term.toString()} onValueChange={(value) => setSelectedTerm({ ...selectedTerm, term: Number(value) })}>
                <SelectTrigger className="w-32">
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
            
            <p className="text-sm text-muted-foreground">
              Override term lock for Term {selectedTerm.term}, {selectedTerm.year} to allow payment modifications.
            </p>
            
            <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Unlock className="h-4 w-4 mr-2" />
                  Override Term Lock
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Override Term Lock</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This will override the term lock and allow modifications to payments for Term {selectedTerm.term}, {selectedTerm.year}.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label>Override Reason</Label>
                    <Input
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Enter detailed reason for override..."
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setLockDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleOverrideLock} 
                      disabled={overrideTermLock.isPending}
                    >
                      Override Lock
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* System Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              System Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Recalculate All Balances
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                    Reset Academic Year
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Clear All Caches
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              These actions affect the entire system and should be used with caution.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Pending Payment Deletions ({pendingDeletions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading pending approvals...</div>
          ) : !pendingDeletions.length ? (
            <div className="text-center py-8 text-muted-foreground">No pending deletions</div>
          ) : (
            <div className="space-y-4">
              {pendingDeletions.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium">{payment.pupils?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.pupils?.grades?.name} • Term {payment.term_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deleted: {format(new Date(payment.deleted_at!), "dd MMM yyyy HH:mm")}
                    </p>
                    {payment.deletion_reason && (
                      <p className="text-sm text-orange-600 mt-1">
                        Reason: {payment.deletion_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600">K{Number(payment.amount_paid).toFixed(2)}</span>
                    <Dialog open={approveDialogOpen && selectedPayment?.id === payment.id} onOpenChange={setApproveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Review Payment Deletion</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Payment Details</Label>
                            <div className="mt-2 p-3 bg-muted rounded text-sm">
                              <p><strong>Student:</strong> {selectedPayment?.pupils?.full_name}</p>
                              <p><strong>Grade:</strong> {selectedPayment?.pupils?.grades?.name}</p>
                              <p><strong>Amount:</strong> K{Number(selectedPayment?.amount_paid).toFixed(2)}</p>
                              <p><strong>Term:</strong> {selectedPayment?.term_number}</p>
                              <p><strong>Deleted by:</strong> {selectedPayment?.deleted_by}</p>
                              <p><strong>Reason:</strong> {selectedPayment?.deletion_reason}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="destructive" 
                              onClick={() => {
                                setApprovalAction("reject");
                                handleApprovalAction();
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject Deletion
                            </Button>
                            <Button 
                              onClick={() => {
                                setApprovalAction("approve");
                                handleApprovalAction();
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve Deletion
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
        </CardContent>
      </Card>

      {/* Balance Adjustments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Recent Balance Adjustments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Scale className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent balance adjustments</p>
            <p className="text-sm">Payment adjustments will appear here when made.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
