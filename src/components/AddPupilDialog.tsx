import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, ArrowRight, Check, SkipForward, DollarSign, GraduationCap } from "lucide-react";
import { useCreatePupil } from "@/hooks/usePupils";
import { useGrades } from "@/hooks/useGrades";
import { useParents } from "@/hooks/useParents";
import { useFees } from "@/hooks/useFees";
import { useRecordPayment } from "@/hooks/usePayments";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Step = "pupil" | "payment";
type PaymentOption = "full" | "partial" | "skip";

export default function AddPupilDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("pupil");
  
  // Pupil form state
  const [fullName, setFullName] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [parentId, setParentId] = useState("");
  const [createdPupilId, setCreatedPupilId] = useState<string | null>(null);
  
  // Payment form state
  const [paymentOption, setPaymentOption] = useState<PaymentOption>("skip");
  const [partialAmount, setPartialAmount] = useState("");
  const [currentTerm, setCurrentTerm] = useState("1");
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear().toString());
  
  const createPupil = useCreatePupil();
  const recordPayment = useRecordPayment();
  const { data: grades } = useGrades();
  const { data: parents } = useParents();
  const { data: fees } = useFees();

  // Get fee for selected grade
  const gradeFee = useMemo(() => {
    if (!gradeId || !fees) return null;
    return fees.find(f => 
      f.grade_id === gradeId && 
      f.term_number === parseInt(currentTerm) && 
      f.year === parseInt(currentYear) &&
      f.is_active !== false
    );
  }, [fees, gradeId, currentTerm, currentYear]);

  const feeAmount = gradeFee ? Number(gradeFee.amount) : 0;

  const resetForm = () => {
    setStep("pupil");
    setFullName("");
    setGradeId("");
    setParentId("");
    setCreatedPupilId(null);
    setPaymentOption("skip");
    setPartialAmount("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const handleCreatePupil = (e: React.FormEvent) => {
    e.preventDefault();
    
    createPupil.mutate(
      { 
        full_name: fullName, 
        grade_id: gradeId || null, 
        parent_id: parentId || null 
      },
      { 
        onSuccess: (data: any) => {
          setCreatedPupilId(data?.id || data);
          
          if (feeAmount > 0) {
            setStep("payment");
          } else {
            toast.success("Pupil added successfully!");
            resetForm();
            setOpen(false);
          }
        },
        onError: () => {
          toast.error("Failed to add pupil");
        }
      }
    );
  };

  const handlePayment = async () => {
    if (!createdPupilId) return;
    
    if (paymentOption === "skip") {
      toast.success("Pupil added successfully! No payment recorded.");
      resetForm();
      setOpen(false);
      return;
    }
    
    const amount = paymentOption === "full" ? feeAmount : parseFloat(partialAmount);
    
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    try {
      await recordPayment.mutateAsync({
        pupil_id: createdPupilId,
        term_number: parseInt(currentTerm),
        year: parseInt(currentYear),
        amount_paid: amount,
      });
      
      toast.success(`Payment of ZMW ${amount.toLocaleString()} recorded successfully!`);
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Pupil</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "pupil" && "Add New Pupil"}
            {step === "payment" && "Record Initial Payment"}
          </DialogTitle>
        </DialogHeader>
        
        {step === "pupil" && (
          <form onSubmit={handleCreatePupil} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input 
                id="fullName"
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Enter pupil's full name"
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select value={gradeId} onValueChange={setGradeId}>
                <SelectTrigger id="grade">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades?.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="parent">Parent/Guardian</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger id="parent">
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {parents?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="term">Term</Label>
                <Select value={currentTerm} onValueChange={setCurrentTerm}>
                  <SelectTrigger id="term">
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
                <Label htmlFor="year">Year</Label>
                <Input 
                  id="year"
                  type="number" 
                  value={currentYear} 
                  onChange={(e) => setCurrentYear(e.target.value)} 
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={createPupil.isPending}
            >
              {createPupil.isPending ? (
                "Creating..."
              ) : (
                <>
                  Add Pupil <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>
        )}
        
        {step === "payment" && (
          <div className="space-y-4">
            {/* Fee Info Card */}
            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{fullName}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {grades?.find(g => g.id === gradeId)?.name}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-200">
                  <span className="text-sm">Required Fee (Term {currentTerm})</span>
                  <span className="font-bold text-lg">
                    ZMW {feeAmount.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            {/* Payment Options */}
            <RadioGroup 
              value={paymentOption} 
              onValueChange={(v) => setPaymentOption(v as PaymentOption)}
              className="space-y-3"
            >
              {/* Full Payment */}
              <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                paymentOption === "full" ? "border-green-500 bg-green-50" : "border-muted hover:border-green-200"
              }`}>
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="font-medium">Full Payment</span>
                    </div>
                    <Badge variant="default" className="bg-green-600">ZMW {feeAmount.toLocaleString()}</Badge>
                  </div>
                </Label>
              </div>
              
              {/* Partial Payment */}
              <div className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                paymentOption === "partial" ? "border-blue-500 bg-blue-50" : "border-muted hover:border-blue-200"
              }`}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="partial" id="partial" />
                  <Label htmlFor="partial" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">Partial Payment</span>
                    </div>
                    {paymentOption === "partial" && (
                      <div className="mt-2">
                        <Label className="text-xs text-muted-foreground mb-1">Enter amount</Label>
                        <Input
                          type="number"
                          placeholder={`Max: ZMW ${feeAmount.toLocaleString()}`}
                          value={partialAmount}
                          onChange={(e) => setPartialAmount(e.target.value)}
                          min="1"
                          max={feeAmount}
                          className="mt-1"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {partialAmount && (
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Remaining balance: </span>
                            <span className="font-medium text-orange-600">
                              ZMW {Math.max(0, feeAmount - parseFloat(partialAmount || "0")).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </Label>
                </div>
              </div>
              
              {/* Skip Payment */}
              <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                paymentOption === "skip" ? "border-gray-500 bg-gray-50" : "border-muted hover:border-gray-200"
              }`}>
                <RadioGroupItem value="skip" id="skip" />
                <Label htmlFor="skip" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <SkipForward className="h-4 w-4 text-gray-600" />
                    <span className="font-medium">Skip Payment</span>
                    <span className="text-sm text-muted-foreground">(Record later)</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>
            
            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  toast.success("Pupil added successfully! No payment recorded.");
                  resetForm();
                  setOpen(false);
                }}
              >
                Skip
              </Button>
              <Button 
                onClick={handlePayment}
                className="flex-1"
                disabled={recordPayment.isPending || (paymentOption === "partial" && !partialAmount)}
              >
                {recordPayment.isPending ? "Recording..." : (
                  paymentOption === "skip" ? "Continue" : `Record ${paymentOption === "full" ? "Full" : "Partial"} Payment`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
