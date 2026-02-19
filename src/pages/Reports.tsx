import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import { 
  Download, 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign, 
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Filter,
  AlertCircle
} from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { usePupils } from "@/hooks/usePupils";
import { useFees } from "@/hooks/useFees";
import { useGrades } from "@/hooks/useGrades";
import { cn } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";

const COLORS = {
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#8b5cf6",
};

export default function Reports() {
  const [selectedTerm, setSelectedTerm] = useState<string>("1");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [activeReport, setActiveReport] = useState<string>("overview");
  
  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = usePayments();
  const { data: pupils, isLoading: pupilsLoading, error: pupilsError } = usePupils();
  const { data: fees, isLoading: feesLoading, error: feesError } = useFees();
  const { data: grades, isLoading: gradesLoading, error: gradesError } = useGrades();

  const isLoading = paymentsLoading || pupilsLoading || feesLoading || gradesLoading;
  const error = paymentsError || pupilsError || feesError || gradesError;

  const currentYear = parseInt(selectedYear);
  const currentTerm = parseInt(selectedTerm);

  // Calculate report data
  const reportData = useMemo(() => {
    if (!payments || !pupils || !fees || !grades) return null;

    const termPayments = payments.filter(p => 
      p.term_number === currentTerm && p.year === currentYear
    );

    const gradeData = grades.map(grade => {
      const gradePupils = pupils.filter(p => p.grade_id === grade.id && p.status === "active");
      const gradeFee = fees.find(f => 
        f.grade_id === grade.id && f.term_number === currentTerm && f.year === currentYear
      );
      const feeAmount = gradeFee ? Number(gradeFee.amount) : 0;
      const expected = feeAmount * gradePupils.length;
      
      const collected = termPayments
        .filter(p => gradePupils.some(gp => gp.id === p.pupil_id))
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);
      
      const outstanding = expected - collected;
      const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 0;

      return {
        name: grade.name,
        expected,
        collected,
        outstanding,
        collectionRate,
        pupilCount: gradePupils.length,
      };
    });

    const paidFull = gradeData.filter(g => g.collectionRate >= 90).length;
    const paidPartial = gradeData.filter(g => g.collectionRate >= 50 && g.collectionRate < 90).length;
    const paidMinimal = gradeData.filter(g => g.collectionRate > 0 && g.collectionRate < 50).length;
    const unpaid = gradeData.filter(g => g.collectionRate === 0).length;

    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    const monthlyTrend = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthPayments = payments.filter(p => {
        const payDate = new Date(p.payment_date);
        return payDate >= monthStart && payDate <= monthEnd;
      });
      
      return {
        month: format(month, "MMM"),
        amount: monthPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0),
        count: monthPayments.length,
      };
    });

    const totalExpected = gradeData.reduce((sum, g) => sum + g.expected, 0);
    const totalCollected = gradeData.reduce((sum, g) => sum + g.collected, 0);
    const totalOutstanding = totalExpected - totalCollected;
    const overallCollectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

    return {
      gradeData,
      paymentStatus: [
        { name: "Excellent (90%+)", value: paidFull, color: COLORS.green },
        { name: "Good (50-89%)", value: paidPartial, color: COLORS.yellow },
        { name: "At Risk (1-49%)", value: paidMinimal, color: COLORS.orange },
        { name: "Unpaid", value: unpaid, color: COLORS.red },
      ],
      monthlyTrend,
      totals: {
        expected: totalExpected,
        collected: totalCollected,
        outstanding: totalOutstanding,
        collectionRate: overallCollectionRate,
      },
    };
  }, [payments, pupils, fees, grades, currentTerm, currentYear]);

  const filteredGradeData = useMemo(() => {
    if (!reportData) return [];
    if (selectedGrade === "all") return reportData.gradeData;
    return reportData.gradeData.filter(g => g.name === selectedGrade);
  }, [reportData, selectedGrade]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Interactive financial analytics" />
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Interactive financial analytics" />
        <div className="bg-card border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <div className="font-medium">Failed to load reports data</div>
          </div>
          <div className="text-sm text-muted-foreground">
            {(error as any)?.message || "An error occurred while loading reports data"}
          </div>
        </div>
      </div>
    );
  }

  if (!reportData || reportData.gradeData.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Reports" description="Interactive financial analytics" />
        <div className="bg-card border rounded-lg p-6 text-center">
          <div className="text-muted-foreground mb-2">No data available</div>
          <div className="text-sm text-muted-foreground">
            No records found for Term {currentTerm}, {currentYear}. Try selecting a different term/year or add fee/payment records.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports" 
        description="Interactive financial analytics and insights" 
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
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

        <Select value={selectedGrade} onValueChange={setSelectedGrade}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Grade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades?.map(g => (
              <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZMW {reportData.totals.expected.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ZMW {reportData.totals.collected.toLocaleString()}
            </div>
            <Progress value={reportData.totals.collectionRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ZMW {reportData.totals.outstanding.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totals.collectionRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="grid w-full grid-cols-4 lg:w-fit">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="grades">
            <Users className="h-4 w-4 mr-2" />
            By Grade
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <PieChartIcon className="h-4 w-4 mr-2" />
            Distribution
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collection Overview</CardTitle>
              <CardDescription>Expected vs Collected by Grade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredGradeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `ZMW ${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="expected" fill={COLORS.blue} name="Expected" />
                    <Bar dataKey="collected" fill={COLORS.green} name="Collected" />
                    <Bar dataKey="outstanding" fill={COLORS.red} name="Outstanding" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGradeData.map((grade) => (
              <Card key={grade.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{grade.name}</CardTitle>
                    <Badge variant={grade.collectionRate >= 60 ? "default" : "destructive"}>
                      {grade.collectionRate}%
                    </Badge>
                  </div>
                  <CardDescription>{grade.pupilCount} students</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Collection Progress</span>
                      <span className="font-medium">{grade.collectionRate}%</span>
                    </div>
                    <Progress value={grade.collectionRate} />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="text-center p-2 bg-muted rounded">
                      <div className="text-xs text-muted-foreground">Expected</div>
                      <div className="font-semibold text-sm">ZMW {(grade.expected / 1000).toFixed(0)}K</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <div className="text-xs text-green-600">Collected</div>
                      <div className="font-semibold text-sm text-green-700">ZMW {(grade.collected / 1000).toFixed(0)}K</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <div className="text-xs text-red-600">Due</div>
                      <div className="font-semibold text-sm text-red-700">ZMW {(grade.outstanding / 1000).toFixed(0)}K</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Payment Trends</CardTitle>
              <CardDescription>Payment volume over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportData.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `ZMW ${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke={COLORS.green} strokeWidth={2} name="Amount Collected" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Payment Status Distribution</CardTitle>
                <CardDescription>Grades by collection performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.paymentStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {reportData.paymentStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.paymentStatus.map((status) => (
                    <div key={status.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                        <span className="text-sm">{status.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{status.value}</span>
                        <span className="text-xs text-muted-foreground">grades</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

