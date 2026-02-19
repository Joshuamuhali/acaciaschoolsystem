import { useState, useMemo } from "react";
import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import { GraduationCap, DollarSign, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { usePupils } from "@/hooks/usePupils";
import { useFees } from "@/hooks/useFees";
import { usePayments } from "@/hooks/usePayments";
import { useGrades } from "@/hooks/useGrades";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { format } from "date-fns";
import FinancialHealthMatrix from "@/components/dashboard/FinancialHealthMatrix";
import IntelligentAlerts from "@/components/dashboard/IntelligentAlerts";
import GradeCollectionHeatmap from "@/components/dashboard/GradeCollectionHeatmap";
import SchoolAdminDashboard from "@/components/SchoolAdmin/Dashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { TermNumber } from "@/types/enums";

export default function Dashboard() {
  const { isSchoolAdmin, isSuperAdmin } = useAuthWithPermissions();
  const [selectedTerm, setSelectedTerm] = useState<TermNumber>(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Define currentTerm and currentYear before using them in hooks
  const currentTerm: TermNumber = selectedTerm;
  const currentYear = selectedYear;
  
  const { data: pupils, isLoading: pupilsLoading, error: pupilsError } = usePupils();
  const { data: fees, isLoading: feesLoading, error: feesError } = useFees();
  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = usePayments();
  const { data: grades } = useGrades();
  const navigate = useNavigate();

  const totalPupils = pupils?.filter(p => p.status === "active").length ?? 0;

  const hasPupils = !!pupils && pupils.length > 0;
  const hasFees = !!fees && fees.length > 0;
  const hasPayments = !!payments && payments.length > 0;
  const hasGrades = !!grades && grades.length > 0;

  const error = pupilsError || feesError || paymentsError;

  const availableFeePeriods = useMemo(() => {
    const items = (fees ?? []).map((f: any) => `${f.year}-T${f.term_number}`)
    return Array.from(new Set(items)).sort()
  }, [fees]);

  const availablePaymentPeriods = useMemo(() => {
    const items = (payments ?? []).map((p: any) => `${p.year}-T${p.term_number}`)
    return Array.from(new Set(items)).sort()
  }, [payments]);

  // Calculate previous term data for comparison
  const previousTerm = (currentTerm > 1 ? (currentTerm - 1) : 3) as TermNumber;
  const previousYear = currentTerm > 1 ? currentYear : currentYear - 1;
  
  const previousTermCollected = (payments ?? [])
    .filter(p => p.term_number === previousTerm && p.year === previousYear)
    .reduce((sum, p) => sum + Number(p.amount_paid), 0);

  const totalExpected = (fees ?? [])
    .filter(f => f.term_number === currentTerm && f.year === currentYear)
    .reduce((sum, f) => {
      const count = (pupils ?? []).filter(p => p.grade_id === f.grade_id && p.status === "active").length;
      return sum + count * Number(f.amount);
    }, 0);

  const totalCollected = (payments ?? [])
    .filter(p => p.term_number === currentTerm && p.year === currentYear)
    .reduce((sum, p) => sum + Number(p.amount_paid), 0);

  // Calculate actual payment aging
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
  const sixtyDaysAgo = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000));
  const ninetyDaysAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));

  const outstandingPayments = (pupils ?? [])
    .filter(p => p.status === "active")
    .map(pupil => {
      const pupilExpected = (fees ?? [])
        .filter(f => f.term_number === currentTerm && f.year === currentYear && f.grade_id === pupil.grade_id)
        .reduce((sum, f) => sum + Number(f.amount), 0);
      
      const pupilPaid = (payments ?? [])
        .filter(p => p.pupil_id === pupil.id && p.term_number === currentTerm && p.year === currentYear)
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);
      
      return {
        pupilId: pupil.id,
        balance: pupilExpected - pupilPaid,
        lastPaymentDate: (payments ?? [])
          .filter(p => p.pupil_id === pupil.id && p.term_number === currentTerm && p.year === currentYear)
          .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]?.payment_date
      };
    })
    .filter(p => p.balance > 0);

  const riskExposure = {
    days30: outstandingPayments
      .filter(p => p.lastPaymentDate && new Date(p.lastPaymentDate) >= thirtyDaysAgo)
      .reduce((sum, p) => sum + p.balance, 0),
    days60: outstandingPayments
      .filter(p => p.lastPaymentDate && new Date(p.lastPaymentDate) >= sixtyDaysAgo && new Date(p.lastPaymentDate) < thirtyDaysAgo)
      .reduce((sum, p) => sum + p.balance, 0),
    days90: outstandingPayments
      .filter(p => p.lastPaymentDate && new Date(p.lastPaymentDate) >= ninetyDaysAgo && new Date(p.lastPaymentDate) < sixtyDaysAgo)
      .reduce((sum, p) => sum + p.balance, 0),
    total: outstandingPayments.reduce((sum, p) => sum + p.balance, 0),
  };

  const outstanding = riskExposure.total;

  const recentPayments = (payments ?? []).slice(0, 5);

  const pupilsPerGrade = (grades ?? []).map(g => ({
    name: g.name,
    count: (pupils ?? []).filter(p => p.grade_id === g.id && p.status === "active").length,
  }));

  const gradeHeatmapItems = (grades ?? []).map((g) => {
    const gradePupils = (pupils ?? []).filter((p) => p.grade_id === g.id && p.status === "active");
    const gradeFeeTotal = (fees ?? [])
      .filter((f) => f.term_number === currentTerm && f.year === currentYear && f.grade_id === g.id)
      .reduce((sum, f) => sum + gradePupils.length * Number(f.amount), 0);

    const gradeCollected = (payments ?? [])
      .filter((p) => p.term_number === currentTerm && p.year === currentYear && p.pupils?.grade_id === g.id)
      .reduce((sum, p) => sum + Number(p.amount_paid), 0);

    const gradeOutstanding = gradeFeeTotal - gradeCollected;
    const collectionRate = gradeFeeTotal > 0 ? Math.round((gradeCollected / gradeFeeTotal) * 100) : 0;

    return {
      gradeId: g.id,
      gradeName: g.name,
      expected: Math.max(0, Math.round(gradeFeeTotal)),
      collected: Math.max(0, Math.round(gradeCollected)),
      outstanding: Math.max(0, Math.round(gradeOutstanding)),
      collectionRate,
    };
  });

  const collectionRateTotal = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  // Generate intelligent alerts based on real data
  const dashboardAlerts = [];

  // Outstanding balance alert
  if (outstanding > 0) {
    const outstandingPercentage = totalExpected > 0 ? (outstanding / totalExpected) * 100 : 0;
    dashboardAlerts.push({
      id: "overdue-payments",
      type: "payment_risk" as const,
      severity: (outstandingPercentage > 40 ? "critical" : outstandingPercentage > 20 ? "high" : "medium") as "high" | "medium" | "low" | "critical",
      title: "Outstanding balances require attention",
      description: `ZMW ${Math.round(outstanding).toLocaleString()} (${Math.round(outstandingPercentage)}%) is still outstanding for Term ${currentTerm}.`,
      entity: `Term ${currentTerm} ${currentYear}`,
      timestamp: new Date(),
      actionable: true,
      actionLabel: "Go to Payments",
      actionPath: "/dashboard/payments",
    });
  }

  // Low collection rate alert
  if (collectionRateTotal < 50 && totalExpected > 0) {
    dashboardAlerts.push({
      id: "low-collection-rate",
      type: "collection_rate" as const,
      severity: "high" as const,
      title: "Low collection rate detected",
      description: `Only ${collectionRateTotal}% of expected fees have been collected for Term ${currentTerm}.`,
      entity: `Term ${currentTerm} ${currentYear}`,
      timestamp: new Date(),
      actionable: true,
      actionLabel: "View Collection Report",
      actionPath: "/dashboard/reports",
    });
  }

  // High risk pupils alert
  const highRiskPupils = outstandingPayments.filter(p => p.balance > totalExpected * 0.5).length;
  if (highRiskPupils > 0) {
    dashboardAlerts.push({
      id: "high-risk-pupils",
      type: "pupil_risk" as const,
      severity: "medium" as const,
      title: "High-risk pupils identified",
      description: `${highRiskPupils} pupils have outstanding balances over 50% of their expected fees.`,
      entity: `Term ${currentTerm} ${currentYear}`,
      timestamp: new Date(),
      actionable: true,
      actionLabel: "View Pupils",
      actionPath: "/dashboard/pupils?tab=risk",
    });
  }

  // Term lock alert
  if (currentTerm !== 1) {
    dashboardAlerts.push({
      id: "term-locked",
      type: "term_override" as const,
      severity: "medium" as const,
      title: "Term is currently locked",
      description: "Editing pupil financial data is restricted while the term is locked.",
      entity: `Term ${currentTerm}`,
      timestamp: new Date(),
      actionable: true,
      actionLabel: "Emergency Console",
      actionPath: "/dashboard/admin/emergency",
    });
  }

  // Debug logging
  console.log('Dashboard Debug:', {
    pupils: pupils?.length,
    fees: fees?.length,
    payments: payments?.length,
    grades: grades?.length,
    currentYear,
    currentTerm,
    availableFeePeriods,
    availablePaymentPeriods,
    previousTerm,
    previousYear,
    previousTermCollected,
    totalExpected,
    totalCollected,
    outstanding,
    riskExposure,
    collectionRateTotal,
    dashboardAlerts: dashboardAlerts.length,
    pupilsLoading,
    feesLoading,
    paymentsLoading,
    pupilsError,
    feesError,
    paymentsError,
    // Add detailed data inspection
    pupilsData: pupils,
    feesData: fees,
    paymentsData: payments,
    gradesData: grades,
    // Check if data exists
    hasPupils: !!pupils && pupils.length > 0,
    hasFees: !!fees && fees.length > 0,
    hasPayments: !!payments && payments.length > 0,
    hasGrades: !!grades && grades.length > 0,
    // Sample first few records for inspection
    samplePupil: pupils?.[0],
    sampleFee: fees?.[0],
    samplePayment: payments?.[0],
    sampleGrade: grades?.[0]
  });

  // Show School Admin Dashboard for School Admin role
  if (isSchoolAdmin?.()) {
    return <SchoolAdminDashboard />;
  }

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        description="Overview of school fees and pupil records"
        actions={
          <div className="flex items-center gap-3">
            <Select value={String(currentTerm)} onValueChange={(v) => setSelectedTerm(parseInt(v) as TermNumber)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(currentYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {error && (
        <div className="bg-card border rounded-lg p-4 text-sm text-red-700">
          {(error as any)?.message || "Failed to load dashboard data"}
        </div>
      )}

      <div className="mb-8">
        <FinancialHealthMatrix
          data={{
            revenueVelocity: {
              current: Math.round(totalCollected),
              previous: Math.round(previousTermCollected),
              change: previousTermCollected > 0 ? Math.round(((totalCollected - previousTermCollected) / previousTermCollected) * 100) : 0,
            },
            riskExposure: {
              days30: Math.round(riskExposure.days30),
              days60: Math.round(riskExposure.days60),
              days90: Math.round(riskExposure.days90),
              total: Math.round(riskExposure.total),
            },
            collectionRate: collectionRateTotal,
            activeAlerts: dashboardAlerts.length,
          }}
          currentTerm={currentTerm}
          currentYear={currentYear}
          isLocked={currentTerm !== 1} // For now, only Term 1 is unlocked
          totalExpected={totalExpected} // Pass total expected for dynamic risk calculation
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Pupils" value={totalPupils} subtitle="Across all grades" icon={<GraduationCap className="h-5 w-5" />} />
        <StatCard title="Total Expected" value={`K${totalExpected.toFixed(2)}`} subtitle={`Term ${currentTerm}, ${currentYear}`} icon={<TrendingUp className="h-5 w-5" />} variant="default" />
        <StatCard title="Total Collected" value={`K${totalCollected.toFixed(2)}`} subtitle={`Term ${currentTerm}, ${currentYear}`} icon={<DollarSign className="h-5 w-5" />} variant="success" />
        <StatCard title="Outstanding Balance" value={`K${outstanding.toFixed(2)}`} subtitle="Pending payments" icon={<AlertTriangle className="h-5 w-5" />} variant="warning" />
        {/* Data Status Indicators */}
        <div className="col-span-full sm:col-span-2 lg:col-span-4 bg-muted p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Data Status</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${hasPupils ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Pupils</span>
              <span className="text-xs text-muted-foreground">{pupils?.length || 0} records</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${hasFees ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Fees</span>
              <span className="text-xs text-muted-foreground">{fees?.length || 0} records</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${hasPayments ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Payments</span>
              <span className="text-xs text-muted-foreground">{payments?.length || 0} records</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${hasGrades ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>Grades</span>
              <span className="text-xs text-muted-foreground">{grades?.length || 0} records</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <GradeCollectionHeatmap
          items={gradeHeatmapItems}
          onGradeClick={() => {
            navigate("/dashboard/payments");
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold font-display text-foreground mb-4">Recent Payments</h2>
          {!recentPayments.length ? (
            <div className="text-sm text-muted-foreground text-center py-8">No payments recorded yet</div>
          ) : (
            <ul className="space-y-3">
              {recentPayments.map((pay) => (
                <li key={pay.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-foreground">{pay.pupils?.full_name}</span>
                    <span className="text-muted-foreground ml-2">Term {pay.term_number}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-medium">K{Number(pay.amount_paid).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(pay.payment_date), "dd MMM")}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <IntelligentAlerts
          alerts={dashboardAlerts}
          onAlertAction={(alertId) => {
            const alert = dashboardAlerts.find((a) => a.id === alertId);
            if (alert?.actionPath) {
              navigate(alert.actionPath);
            }
          }}
        />
      </div>
    </div>
  );
}
