import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Percent, CreditCard, Calendar, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Pupil {
  id: number;
  full_name: string;
  grade_id: number;
  grades?: { name: string };
}

interface OtherFeeType {
  id: number;
  name: string;
  amount: number;
}

interface PupilOtherFee {
  id: number;
  fee_type_id: number;
  amount: number;
  amount_paid: number;
  other_fee_types?: OtherFeeType;
}

interface PupilDiscount {
  id?: number;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  applies_to: string;
  description?: string;
}

interface Installment {
  id?: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  amount_paid?: number;
}

export default function PupilFinancialSettings() {
  const { pupilId } = useParams<{ pupilId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fee Structure
  const [schoolFeeAmount, setSchoolFeeAmount] = useState<number>(2400);
  const [otherFeeTypes, setOtherFeeTypes] = useState<OtherFeeType[]>([]);
  const [pupilOtherFees, setPupilOtherFees] = useState<PupilOtherFee[]>([]);
  const [selectedOtherFees, setSelectedOtherFees] = useState<number[]>([]);

  // Discounts
  const [discounts, setDiscounts] = useState<PupilDiscount[]>([]);
  const [newDiscount, setNewDiscount] = useState<PupilDiscount>({
    discount_type: 'percentage',
    discount_value: 0,
    applies_to: 'school_fee'
  });

  // Payment Plan
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [newInstallment, setNewInstallment] = useState({
    amount: 0,
    due_date: '',
    installment_number: 1
  });

  useEffect(() => {
    if (pupilId) {
      loadPupilData();
      loadOtherFeeTypes();
    }
  }, [pupilId]);

  const loadPupilData = async () => {
    try {
      setLoading(true);

      // Load pupil and enrollment data
      const { data: pupilData, error: pupilError } = await supabase
        .from('pupils')
        .select('*, grades(*)')
        .eq('id', pupilId)
        .single();

      if (pupilError) throw pupilError;
      setPupil(pupilData);

      // Load enrollment data
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('pupil_id', pupilId)
        .single();

      if (!enrollmentError && enrollmentData) {
        setSchoolFeeAmount(enrollmentData.school_fees_expected || 2400);
      }

      // Load pupil other fees
      const { data: otherFeesData, error: otherFeesError } = await supabase
        .from('pupil_other_fees')
        .select('*, other_fee_types(*)')
        .eq('enrollment_id', enrollmentData?.id);

      if (!otherFeesError) {
        setPupilOtherFees(otherFeesData || []);
        setSelectedOtherFees(otherFeesData?.map(f => f.fee_type_id) || []);
      }

      // Load discounts (if implemented)
      // setDiscounts(discountsData || []);

      // Load installments (if implemented)
      // setInstallments(installmentsData || []);

    } catch (error: any) {
      console.error('Error loading pupil data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load pupil data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOtherFeeTypes = async () => {
    const { data, error } = await supabase
      .from('other_fee_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading other fee types:', error);
    } else {
      setOtherFeeTypes(data || []);
    }
  };

  const handleOtherFeeToggle = (feeId: number, checked: boolean) => {
    setSelectedOtherFees(prev => {
      if (checked) {
        return [...prev, feeId];
      } else {
        return prev.filter(id => id !== feeId);
      }
    });
  };

  const handleAddDiscount = () => {
    if (newDiscount.discount_value <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid discount value",
        variant: "destructive"
      });
      return;
    }

    setDiscounts(prev => [...prev, { ...newDiscount, id: Date.now() }]);
    setNewDiscount({
      discount_type: 'percentage',
      discount_value: 0,
      applies_to: 'school_fee'
    });
  };

  const handleRemoveDiscount = (index: number) => {
    setDiscounts(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddInstallment = () => {
    if (newInstallment.amount <= 0 || !newInstallment.due_date) {
      toast({
        title: "Error",
        description: "Please enter valid installment details",
        variant: "destructive"
      });
      return;
    }

    const installment: Installment = {
      installment_number: installments.length + 1,
      amount: newInstallment.amount,
      due_date: newInstallment.due_date,
      status: 'pending'
    };

    setInstallments(prev => [...prev, installment]);
    setNewInstallment({
      amount: 0,
      due_date: '',
      installment_number: installments.length + 2
    });
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallments(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotalFees = () => {
    const otherFeesTotal = selectedOtherFees.reduce((sum, feeId) => {
      const feeType = otherFeeTypes.find(f => f.id === feeId);
      return sum + (feeType?.amount || 0);
    }, 0);

    return schoolFeeAmount + otherFeesTotal;
  };

  const calculateDiscountedAmount = () => {
    let total = calculateTotalFees();

    discounts.forEach(discount => {
      if (discount.discount_type === 'percentage') {
        total -= total * (discount.discount_value / 100);
      } else {
        total -= discount.discount_value;
      }
    });

    return Math.max(0, total);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Get enrollment ID
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('pupil_id', pupilId)
        .single();

      if (enrollmentError) throw enrollmentError;

      // Update school fee amount
      await supabase
        .from('enrollments')
        .update({ school_fees_expected: schoolFeeAmount })
        .eq('id', enrollment.id);

      // Update other fees
      // Remove existing other fees
      await supabase
        .from('pupil_other_fees')
        .delete()
        .eq('enrollment_id', enrollment.id);

      // Add selected other fees
      for (const feeId of selectedOtherFees) {
        const feeType = otherFeeTypes.find(f => f.id === feeId);
        if (feeType) {
          await supabase
            .from('pupil_other_fees')
            .insert({
              enrollment_id: enrollment.id,
              fee_type_id: feeId,
              amount: feeType.amount,
              amount_paid: 0
            });
        }
      }

      // Save discounts (implement if needed)
      // Save installments (implement if needed)

      toast({
        title: "Success",
        description: `Financial settings saved for ${pupil?.full_name}`,
      });

    } catch (error: any) {
      console.error('Error saving financial settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save financial settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading financial settings...</p>
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
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/pupils')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pupils
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{pupil.full_name}</h1>
            <p className="text-muted-foreground">Financial Settings & Configuration</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="fees" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fees">Fee Structure</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
          <TabsTrigger value="installments">Payment Plan</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* Fee Structure Tab */}
        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Fee Structure Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* School Fee */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="school-fee">School Fee Amount (ZMW)</Label>
                  <Input
                    id="school-fee"
                    type="number"
                    value={schoolFeeAmount}
                    onChange={(e) => setSchoolFeeAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="50"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    This is the base school fee for all pupils
                  </p>
                </div>
                <div className="flex items-end">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    ZMW {schoolFeeAmount.toLocaleString()}
                  </Badge>
                </div>
              </div>

              {/* Other Fees */}
              <div>
                <Label className="text-base font-medium">Additional Fees</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select which additional fees apply to this pupil
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {otherFeeTypes.map((fee) => (
                    <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`fee-${fee.id}`}
                          checked={selectedOtherFees.includes(fee.id)}
                          onCheckedChange={(checked) => handleOtherFeeToggle(fee.id, checked as boolean)}
                        />
                        <div>
                          <Label htmlFor={`fee-${fee.id}`} className="font-medium">
                            {fee.name}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            ZMW {fee.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discounts Tab */}
        <TabsContent value="discounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Percent className="h-5 w-5 mr-2" />
                Discounts & Reductions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Discount */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={newDiscount.discount_type}
                    onValueChange={(value: 'percentage' | 'fixed') => setNewDiscount(prev => ({ ...prev, discount_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    value={newDiscount.discount_value}
                    onChange={(e) => setNewDiscount(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step={newDiscount.discount_type === 'percentage' ? '1' : '10'}
                  />
                </div>
                <div>
                  <Label>Applies To</Label>
                  <Select
                    value={newDiscount.applies_to}
                    onValueChange={(value) => setNewDiscount(prev => ({ ...prev, applies_to: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school_fee">School Fee</SelectItem>
                      <SelectItem value="other_fees">Other Fees</SelectItem>
                      <SelectItem value="total">Total Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddDiscount} className="w-full">
                    Add Discount
                  </Button>
                </div>
              </div>

              {/* Existing Discounts */}
              <div className="space-y-3">
                <h4 className="font-medium">Applied Discounts</h4>
                {discounts.map((discount, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">
                        {discount.discount_type === 'percentage'
                          ? `${discount.discount_value}% off`
                          : `ZMW ${discount.discount_value} off`
                        }
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({discount.applies_to})
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDiscount(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {discounts.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No discounts applied
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Plan Tab */}
        <TabsContent value="installments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Payment Plan & Installments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add New Installment */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label>Installment #</Label>
                  <Input
                    type="number"
                    value={newInstallment.installment_number}
                    disabled
                    className="bg-background"
                  />
                </div>
                <div>
                  <Label>Amount (ZMW)</Label>
                  <Input
                    type="number"
                    value={newInstallment.amount}
                    onChange={(e) => setNewInstallment(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="50"
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={newInstallment.due_date}
                    onChange={(e) => setNewInstallment(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddInstallment} className="w-full">
                    Add Installment
                  </Button>
                </div>
              </div>

              {/* Existing Installments */}
              <div className="space-y-3">
                <h4 className="font-medium">Payment Schedule</h4>
                {installments.map((installment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline">
                        #{installment.installment_number}
                      </Badge>
                      <div>
                        <div className="font-medium">
                          ZMW {installment.amount.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Due: {new Date(installment.due_date).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge
                        variant={
                          installment.status === 'paid' ? 'default' :
                          installment.status === 'overdue' ? 'destructive' : 'secondary'
                        }
                      >
                        {installment.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveInstallment(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                {installments.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No payment installments configured
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Fee Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Fee Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>School Fee:</span>
                      <span className="font-medium">ZMW {schoolFeeAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Other Fees:</span>
                      <span className="font-medium">
                        ZMW {selectedOtherFees.reduce((sum, feeId) => {
                          const fee = otherFeeTypes.find(f => f.id === feeId);
                          return sum + (fee?.amount || 0);
                        }, 0).toLocaleString()}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total Fees:</span>
                      <span>ZMW {calculateTotalFees().toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">After Discounts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Original Total:</span>
                      <span className="font-medium">ZMW {calculateTotalFees().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discounts:</span>
                      <span className="font-medium text-green-600">
                        -ZMW {(calculateTotalFees() - calculateDiscountedAmount()).toLocaleString()}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Final Amount:</span>
                      <span className="text-primary">ZMW {calculateDiscountedAmount().toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Plan Summary */}
              {installments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Plan Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{installments.length}</div>
                        <div className="text-sm text-muted-foreground">Total Installments</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          ZMW {installments.reduce((sum, inst) => sum + inst.amount, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Planned</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {installments.filter(inst => inst.status === 'paid').length}
                        </div>
                        <div className="text-sm text-muted-foreground">Paid Installments</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Applied Other Fees */}
              {selectedOtherFees.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Applied Additional Fees</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedOtherFees.map(feeId => {
                        const fee = otherFeeTypes.find(f => f.id === feeId);
                        return fee ? (
                          <div key={fee.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <span className="font-medium">{fee.name}</span>
                            <Badge variant="secondary">ZMW {fee.amount.toLocaleString()}</Badge>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
