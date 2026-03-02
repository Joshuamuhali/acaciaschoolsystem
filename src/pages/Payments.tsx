import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonForm, SkeletonCard } from "@/components/skeleton";

interface Pupil {
  id: number;
  full_name: string;
  enrollments?: {
    id: number;
    school_fees_expected: number;
    school_fees_paid: number;
    terms: {
      term_number: number;
    };
  }[];
}

export default function Payments() {
  const { pupilId } = useParams<{ pupilId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'school' | 'other'>('school' as const);
  const [otherFees, setOtherFees] = useState<any[]>([]);
  const [selectedOtherFees, setSelectedOtherFees] = useState<number[]>([]);

  useEffect(() => {
    const fetchPupil = async () => {
      const { data, error } = await supabase
        .from('pupils')
        .select('*, enrollments(*)')
        .eq('id', pupilId)
        .single();

      if (error) {
        console.error('Error fetching pupil:', error);
        toast({
          title: "Error",
          description: "Failed to load pupil data",
          variant: "destructive"
        });
      } else {
        setPupil(data);
        setPaymentAmount(data?.enrollments?.[0]?.school_fees_expected?.toString() || '');
      }
    };

    const fetchOtherFees = async () => {
      const { data, error } = await supabase
        .from('pupil_other_fees')
        .select('*, other_fee_types(*)')
        .eq('enrollment_id', pupil?.enrollments?.[0]?.id);

      if (error) {
        console.error('Error fetching other fees:', error);
      } else {
        setOtherFees(data || []);
      }
    };

    if (pupilId) {
      fetchPupil();
      fetchOtherFees();
    }
    setLoading(false);
  }, [pupilId]);

  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      });
      return;
    }

    try {
      if (paymentType === 'school') {
        // Record school fee payment
        const { error } = await supabase
          .from('payments')
          .insert({
            enrollment_id: pupil?.enrollments?.[0]?.id,
            amount: parseFloat(paymentAmount),
            payment_date: new Date().toISOString()
          });

        if (error) throw error;

        // Update enrollment paid amount
        const currentPaid = pupil?.enrollments?.[0]?.school_fees_paid || 0;
        const { error: updateError } = await supabase
          .from('enrollments')
          .update({ 
            school_fees_paid: currentPaid + parseFloat(paymentAmount)
          })
          .eq('id', pupil?.enrollments?.[0]?.id);

        if (updateError) throw updateError;

      } else if (paymentType === 'other' && selectedOtherFees.length > 0) {
        // Record other fee payments
        for (const feeId of selectedOtherFees) {
          const fee = otherFees.find(f => f.id === feeId);
          if (fee) {
            const { error } = await supabase
              .from('pupil_other_fees')
              .update({
                amount_paid: (fee.amount_paid || 0) + parseFloat(paymentAmount)
              })
              .eq('id', feeId);

            if (error) throw error;
          }
        }
      }

      toast({
        title: "Success",
        description: `Payment of ZMW ${paymentAmount} recorded successfully`,
      });
      
      // Refresh data
      window.location.reload();
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive"
      });
    }
  };

  const handlePaymentTypeChange = (value: 'school' | 'other') => {
    setPaymentType(value);
  };

  const handleFeeSelection = (feeId: number) => {
    setSelectedOtherFees(prev => {
      if (prev.includes(feeId)) {
        return prev.filter(id => id !== feeId);
      } else {
        return [...prev, feeId];
      }
    });
  };

  const outstandingSchoolFees = (pupil?.enrollments?.[0]?.school_fees_expected || 0) - (pupil?.enrollments?.[0]?.school_fees_paid || 0);
  const outstandingOtherFees = otherFees.reduce((sum, fee) => sum + ((fee.amount || 0) - (fee.amount_paid || 0)), 0);

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="mb-6">
          <div className="h-10 w-32 bg-muted rounded animate-pulse mb-4" />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!pupil) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Pupil not found</p>
          <Button onClick={() => navigate('/pupils')} className="mt-4">
            Back to Pupils
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate('/pupils')}
          className="mb-4"
        >
          ← Back to Pupils
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Record Payment - {pupil.full_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="payment-type">Payment Type</Label>
                <Select value={paymentType} onValueChange={(value: 'school' | 'other') => setPaymentType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School Fees</SelectItem>
                    <SelectItem value="other">Other Fees</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount (ZMW)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {paymentType === 'school' && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">School Fees Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Expected:</span>
                    <span>ZMW {pupil?.enrollments?.[0]?.school_fees_expected?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paid:</span>
                    <span>ZMW {pupil?.enrollments?.[0]?.school_fees_paid?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Outstanding:</span>
                    <span className={outstandingSchoolFees > 0 ? "text-red-600" : "text-green-600"}>
                      ZMW {outstandingSchoolFees.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {paymentType === 'other' && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Other Fees</h3>
                <div className="space-y-2">
                  {otherFees.map((fee) => (
                    <div key={fee.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedOtherFees.includes(fee.id)}
                          onChange={() => handleFeeSelection(fee.id)}
                          className="rounded"
                        />
                        <span>{fee.other_fee_types?.name || 'Unknown Fee'}</span>
                      </div>
                      <div className="text-right">
                        <div>ZMW {fee.amount?.toLocaleString() || '0'}</div>
                        <div className="text-sm text-muted-foreground">
                          Paid: ZMW {fee.amount_paid?.toLocaleString() || '0'}
                        </div>
                        <div className="font-semibold">
                          Outstanding: ZMW {(fee.amount - (fee.amount_paid || 0)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 p-3 bg-background rounded">
                    <div className="text-sm text-muted-foreground mb-2">
                      Total Other Fees Outstanding: ZMW {outstandingOtherFees.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={handlePayment}
              className="w-full"
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || (paymentType === 'other' && selectedOtherFees.length === 0)}
            >
              Record Payment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
