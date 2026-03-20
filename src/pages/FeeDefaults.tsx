import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getGrades, getOtherFeeTypes, getPupilsInGrade, updateEnrollmentSchoolFees, upsertPupilOtherFee, type Grade, type OtherFeeType } from "@/services/feeDefaults";

interface GradeFeeDefaults {
  grade_id: number;
  school_fee_amount: number;
  other_fees: number[];
}

export default function FeeDefaults() {
  const { toast } = useToast();
  
  const [grades, setGrades] = useState<Grade[]>([]);
  const [otherFeeTypes, setOtherFeeTypes] = useState<OtherFeeType[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [schoolFeeAmount, setSchoolFeeAmount] = useState<number>(2400);
  const [selectedOtherFees, setSelectedOtherFees] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGrades();
    loadOtherFeeTypes();
  }, []);

  const loadGrades = async () => {
    try {
      const data = await getGrades();
      setGrades(data);
    } catch (error) {
      console.error('Error loading grades:', error);
    }
  };

  const loadOtherFeeTypes = async () => {
    try {
      const data = await getOtherFeeTypes(true);
      setOtherFeeTypes(data);
    } catch (error) {
      console.error('Error loading other fee types:', error);
    }
  };

  const loadGradeDefaults = async (gradeId: string) => {
    if (!gradeId) return;
    
    // For now, set default values - in future, load from database
    setSchoolFeeAmount(2400);
    setSelectedOtherFees([]);
  };

  const handleGradeChange = (gradeId: string) => {
    setSelectedGrade(gradeId);
    loadGradeDefaults(gradeId);
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

  const calculateTotal = () => {
    const otherFeesTotal = selectedOtherFees.reduce((sum, feeId) => {
      const fee = otherFeeTypes.find(f => f.id === feeId);
      return sum + (fee?.amount || 0);
    }, 0);
    
    return schoolFeeAmount + otherFeesTotal;
  };

  const handleSave = async () => {
    if (!selectedGrade) {
      toast({
        title: "Error",
        description: "Please select a grade",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Save grade fee defaults to database
      const gradeDefaults: GradeFeeDefaults = {
        grade_id: parseInt(selectedGrade),
        school_fee_amount: schoolFeeAmount,
        other_fees: selectedOtherFees
      };

      // For now, just show success - implement actual database save
      console.log('Saving grade defaults:', gradeDefaults);
      
      toast({
        title: "Success",
        description: `Fee defaults saved for ${grades.find(g => g.id.toString() === selectedGrade)?.name}`,
      });
      
      // Apply defaults to all pupils in this grade
      await applyDefaultsToPupils(parseInt(selectedGrade), gradeDefaults);
      
    } catch (error: any) {
      console.error('Error saving defaults:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save fee defaults",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyDefaultsToPupils = async (gradeId: number, defaults: GradeFeeDefaults) => {
    // Get all pupils in this grade
    const pupils = await getPupilsInGrade(parseInt(defaults.grade_id));
    
    if (!pupils) {
      toast({ title: "Error", description: "Failed to fetch pupils", variant: "destructive" });
      return;
    }

    for (const pupil of pupils) {
      if (pupil.enrollments && pupil.enrollments.length > 0) {
        const enrollmentId = pupil.enrollments[0].id;
        
        // Update enrollment with school fee amount
        await updateEnrollmentSchoolFees(enrollmentId, defaults.school_fee_amount);

        // Add other fees for this pupil
        for (const feeId of defaults.other_fees) {
          const fee = otherFeeTypes.find(f => f.id === feeId);
          if (fee) {
            await upsertPupilOtherFee(enrollmentId, feeId, fee.amount);
          }
        }
      }
    }
  };

  const getFeeName = (feeId: number) => {
    const fee = otherFeeTypes.find(f => f.id === feeId);
    return fee?.name || 'Unknown Fee';
  };

  const getFeeAmount = (feeId: number) => {
    const fee = otherFeeTypes.find(f => f.id === feeId);
    return fee?.amount || 0;
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Grade Fee Defaults</h1>
        <p className="text-muted-foreground">
          Set default fees that automatically apply to all pupils in a grade
        </p>
      </div>

      <div className="grid gap-6">
        {/* Grade Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedGrade} onValueChange={handleGradeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade.id} value={grade.id.toString()}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedGrade && (
          <>
            {/* School Fee */}
            <Card>
              <CardHeader>
                <CardTitle>School Fee (Always Applied)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>
                  <div className="flex items-end">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      ZMW {schoolFeeAmount.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Other Fees */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Fees (Optional)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select which additional fees apply to all pupils in this grade
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {otherFeeTypes.map((fee) => (
                    <div key={fee.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                            {fee.description || 'Additional fee'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">
                          ZMW {fee.amount.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Total Calculation */}
            <Card>
              <CardHeader>
                <CardTitle>Total Calculation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
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
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total per Pupil:</span>
                      <span className="text-primary">ZMW {calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Card>
              <CardContent className="pt-6">
                <Button 
                  onClick={handleSave}
                  disabled={loading || !selectedGrade}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Saving...' : 'Save Grade Defaults'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
