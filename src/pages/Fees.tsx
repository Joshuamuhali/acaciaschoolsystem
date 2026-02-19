import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, TrendingUp, AlertTriangle, Grid3X3, List, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddFeeDialog from "@/components/AddFeeDialog";
import { useFees } from "@/hooks/useFees";
import { usePupils } from "@/hooks/usePupils";
import { usePayments } from "@/hooks/usePayments";
import { useGrades } from "@/hooks/useGrades";
import { useCurrencyDisplay } from "@/hooks/useCurrencyDisplay";
import { cn } from "@/lib/utils";

interface GradeRevenueData {
  gradeId: string;
  gradeName: string;
  feeAmount: number;
  studentCount: number;
  totalExpected: number;
  totalCollected: number;
  collectionRate: number;
  outstanding: number;
}

export default function Fees() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedTerm, setSelectedTerm] = useState<string>("1");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [searchGrade, setSearchGrade] = useState("");
  
  const { data: fees, isLoading: feesLoading, error: feesError } = useFees();
  const { data: pupils, isLoading: pupilsLoading, error: pupilsError } = usePupils();
  const { data: payments } = usePayments();
  const { data: grades } = useGrades();
  const { formatCurrency } = useCurrencyDisplay();

  const isLoading = feesLoading || pupilsLoading;
  const error = feesError || pupilsError;

  const currentYear = parseInt(selectedYear);
  const currentTerm = parseInt(selectedTerm);

  // Debug logging
  console.log('Fees Page Debug:', {
    fees: fees?.length,
    pupils: pupils?.length,
    payments: payments?.length,
    grades: grades?.length,
    currentYear,
    currentTerm,
    feesLoading,
    pupilsLoading,
    feesError,
    pupilsError
  });

  const revenueData = useMemo((): GradeRevenueData[] => {
    if (!grades || !fees) return [];
    
    return grades.map((grade) => {
      const gradeFee = fees.find(f => 
        f.grade_id === grade.id && 
        f.term_number === currentTerm && 
        f.year === currentYear
      );
      
      const feeAmount = gradeFee ? Number(gradeFee.amount) : 0;
      const studentCount = pupils?.filter(p => 
        p.grade_id === grade.id && p.status === "active"
      ).length || 0;
      
      const totalExpected = feeAmount * studentCount;
      
      // Calculate collected for this grade
      const gradePupilIds = pupils?.filter(p => p.grade_id === grade.id).map(p => p.id) || [];
      const totalCollected = payments?.filter(p => 
        gradePupilIds.includes(p.pupil_id) &&
        p.term_number === currentTerm &&
        p.year === currentYear
      ).reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
      
      const outstanding = totalExpected - totalCollected;
      const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
      
      return {
        gradeId: grade.id,
        gradeName: grade.name,
        feeAmount,
        studentCount,
        totalExpected,
        totalCollected,
        collectionRate,
        outstanding,
      };
    });
  }, [grades, fees, pupils, payments, currentTerm, currentYear]);

  const filteredGrades = useMemo(() => {
    if (!searchGrade) return revenueData;
    return revenueData.filter(g => 
      g.gradeName.toLowerCase().includes(searchGrade.toLowerCase())
    );
  }, [revenueData, searchGrade]);

  // Global stats
  const totalExpected = revenueData.reduce((sum, g) => sum + g.totalExpected, 0);
  const totalCollected = revenueData.reduce((sum, g) => sum + g.totalCollected, 0);
  const totalOutstanding = totalExpected - totalCollected;
  const overallCollectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  
  // Forecasting
  const projectedShortfall = totalOutstanding; // Current trend projection
  const atRiskRevenue = revenueData
    .filter(g => g.collectionRate < 50)
    .reduce((sum, g) => sum + g.outstanding, 0);

  // Calculate dynamic collection thresholds based on actual data
  const averageCollectionRate = revenueData.length > 0 
    ? revenueData.reduce((sum, g) => sum + g.collectionRate, 0) / revenueData.length 
    : 0;
  
  const excellentThreshold = Math.max(80, averageCollectionRate + 10); // 80% or 10% above average
  const goodThreshold = Math.max(60, averageCollectionRate); // 60% or average
  const warningThreshold = Math.max(40, averageCollectionRate - 10); // 40% or 10% below average

  const getCollectionColor = (rate: number) => {
    if (rate >= excellentThreshold) return "bg-green-500";
    if (rate >= goodThreshold) return "bg-yellow-500";
    if (rate >= warningThreshold) return "bg-orange-500";
    return "bg-red-500";
  };

  const getCollectionStatus = (rate: number) => {
    if (rate >= excellentThreshold) return "Excellent";
    if (rate >= goodThreshold) return "Good";
    if (rate >= warningThreshold) return "Warning";
    return "Critical";
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Fee Structure" 
        description="Revenue modeling and fee management by grade" 
        actions={<AddFeeDialog />} 
      />

      {error && (
        <div className="bg-card border rounded-lg p-4 text-sm text-red-700">
          {(error as any)?.message || "Failed to load fees data"}
        </div>
      )}

      {isLoading && !fees && (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expected Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpected)}</div>
            <p className="text-xs text-muted-foreground">Term {currentTerm}, {currentYear}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</div>
            <Progress value={overallCollectionRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">{100 - overallCollectionRate}% remaining</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{overallCollectionRate}%</div>
              <Badge variant={overallCollectionRate >= 60 ? "default" : "destructive"}>
                {getCollectionStatus(overallCollectionRate)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {revenueData.length} grades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecasting Panel */}
      {totalOutstanding > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Calculator className="h-5 w-5" />
              Revenue Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-orange-700">Projected Shortfall</div>
                <div className="text-xl font-bold text-orange-800">
                  {formatCurrency(projectedShortfall)}
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  If current collection trend continues
                </p>
              </div>
              <div>
                <div className="text-sm text-orange-700">At-Risk Revenue</div>
                <div className="text-xl font-bold text-red-700">
                  {formatCurrency(atRiskRevenue)}
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  From grades with &lt;50% collection
                </p>
              </div>
              <div>
                <div className="text-sm text-orange-700">Risk Grades</div>
                <div className="text-xl font-bold text-red-700">
                  {revenueData.filter(g => g.collectionRate < 50).length}
                </div>
                <p className="text-xs text-orange-600 mt-1">
                  Grades requiring attention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Term 1</SelectItem>
              <SelectItem value="2">Term 2</SelectItem>
              <SelectItem value="3">Term 3</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search grades..." 
              className="pl-9 w-48" 
              value={searchGrade} 
              onChange={(e) => setSearchGrade(e.target.value)} 
            />
          </div>
          
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")}>
            <TabsList>
              <TabsTrigger value="grid">
                <Grid3X3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      {feesLoading || pupilsLoading ? (
        <div className={cn(
          "gap-4",
          viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "space-y-2"
        )}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 mb-4" />
              <div className="h-8 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredGrades.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No fee data found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchGrade ? "Try adjusting your search." : "Click 'Add Fee' to configure grade fees."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGrades.map((grade) => (
            <Card key={grade.gradeId} className={cn(
              "hover:shadow-md transition-shadow",
              grade.collectionRate < 40 && "border-red-200 bg-red-50/30"
            )}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{grade.gradeName}</CardTitle>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      grade.collectionRate >= excellentThreshold ? "bg-green-100 text-green-800" :
                      grade.collectionRate >= goodThreshold ? "bg-yellow-100 text-yellow-800" :
                      grade.collectionRate >= warningThreshold ? "bg-orange-100 text-orange-800" :
                      "bg-red-100 text-red-800"
                    )}
                  >
                    {getCollectionStatus(grade.collectionRate)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {grade.studentCount} students • {formatCurrency(grade.feeAmount)} / student
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Collection Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Collection</span>
                    <span className="font-medium">{grade.collectionRate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all", getCollectionColor(grade.collectionRate))}
                      style={{ width: `${grade.collectionRate}%` }}
                    />
                  </div>
                </div>
                
                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-muted rounded p-2">
                    <div className="text-xs text-muted-foreground">Expected</div>
                    <div className="font-semibold">{formatCurrency(grade.totalExpected)}</div>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <div className="text-xs text-green-600">Collected</div>
                    <div className="font-semibold text-green-700">{formatCurrency(grade.totalCollected)}</div>
                  </div>
                </div>
                
                {grade.outstanding > 0 && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t">
                    <span className="text-red-600">Outstanding</span>
                    <span className="font-medium text-red-700">{formatCurrency(grade.outstanding)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Grade</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Students</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Fee Amount</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Expected</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Collected</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Outstanding</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Collection Rate</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrades.map((grade) => (
                  <tr key={grade.gradeId} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{grade.gradeName}</td>
                    <td className="px-4 py-3">{grade.studentCount}</td>
                    <td className="px-4 py-3">{formatCurrency(grade.feeAmount)}</td>
                    <td className="px-4 py-3">{formatCurrency(grade.totalExpected)}</td>
                    <td className="px-4 py-3 text-green-600">{formatCurrency(grade.totalCollected)}</td>
                    <td className={cn(
                      "px-4 py-3",
                      grade.outstanding > 0 ? "text-red-600" : "text-green-600"
                    )}>
                      {formatCurrency(grade.outstanding)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full", getCollectionColor(grade.collectionRate))}
                            style={{ width: `${grade.collectionRate}%` }}
                          />
                        </div>
                        <span className="text-xs">{grade.collectionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
