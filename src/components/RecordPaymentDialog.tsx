import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Lock } from "lucide-react";
import { useRecordPayment } from "@/hooks/usePayments";
import { usePupils } from "@/hooks/usePupils";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function RecordPaymentDialog() {
  const [open, setOpen] = useState(false);
  const [pupilId, setPupilId] = useState("");
  const [term, setTerm] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [amount, setAmount] = useState("");
  const [isTermLocked, setIsTermLocked] = useState(false);
  
  const recordPayment = useRecordPayment();
  const { data: pupils } = usePupils();
  const { isSchoolAdmin, isSuperAdmin } = useAuthWithPermissions();

  // School Admin cannot record payments if term is locked (unless they have override permission)
  const canRecordPayment = () => {
    if (isSuperAdmin?.()) return true;
    if (isSchoolAdmin?.()) {
      // Check if term is locked - if locked, School Admin cannot record
      // This would be fetched from API in real implementation
      return !isTermLocked;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    recordPayment.mutate(
      { pupil_id: pupilId, term_number: Number(term), year: Number(year), amount_paid: Number(amount) },
      { onSuccess: () => { setOpen(false); setPupilId(""); setTerm(""); setAmount(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> 
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        
        {/* Term Lock Warning for School Admin */}
        {isSchoolAdmin?.() && isTermLocked && (
          <Alert variant="destructive" className="mb-4">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Term is currently locked. Contact Super Admin to record payments for this term.
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Pupil</Label>
            <Select value={pupilId} onValueChange={setPupilId} disabled={!canRecordPayment()}>
              <SelectTrigger><SelectValue placeholder="Select pupil" /></SelectTrigger>
              <SelectContent>
                {pupils?.filter(p => p.status === "active").map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name} — {p.grades?.name || "No grade"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={term} onValueChange={setTerm} disabled={!canRecordPayment()}>
              <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} required disabled={!canRecordPayment()} />
          </div>
          <div className="space-y-2">
            <Label>Amount Paid (K)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0.01" disabled={!canRecordPayment()} />
          </div>
          <Button type="submit" className="w-full" disabled={recordPayment.isPending || !canRecordPayment()}>
            {recordPayment.isPending ? "Recording..." : isSchoolAdmin?.() && isTermLocked ? "Term Locked" : "Record Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
