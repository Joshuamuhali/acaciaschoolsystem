import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  GraduationCap, 
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  Calendar,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { usePayments } from "@/hooks/usePayments";
import { usePupils } from "@/hooks/usePupils";
import { useFees } from "@/hooks/useFees";
import { useGrades } from "@/hooks/useGrades";
import { format, differenceInDays, startOfDay, isToday, subDays } from "date-fns";

export default function SchoolAdminDashboard() {
  const [currentTerm, setCurrentTerm] = useState(1);
  const [currentYear] = useState(new Date().getFullYear());
  
  const { data: payments } = usePayments();
  const { data: pupils } = usePupils();
  const { data: fees } = useFees();
  const { data: grades } = useGrades();

  // Calculate operational stats
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const weekAgo = subDays(today, 7);
    
    // Today's collection
    const todayPayments = payments?.filter(p => 
      isToday(new Date(p.payment_date)) && !p.is_deleted
    ) || [];
    const todayCollection = todayPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    
    // This week's collection
    const weekPayments = payments?.filter(p => {
      const payDate = new Date(p.payment_date);
      return payDate >= weekAgo && !p.is_deleted;
    }) || [];
    const weekCollection = weekPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    
    // This term's collection
    const termPayments = payments?.filter(p => 
      p.term_number === currentTerm && 
      p.year === currentYear && 
      !p.is_deleted
    ) || [];
    const termCollection = termPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
    
    // Expected fees for current term
    const activePupils = pupils?.filter(p => p.status === "active") || [];
    const termFees = fees?.filter(f => 
      f.term_number === currentTerm && 
      f.year === currentYear && 
      f.is_active !== false
    ) || [];
    
    const totalExpected = activePupils.reduce((sum, pupil) => {
      const pupilFee = termFees.find(f => f.grade_id === pupil.grade_id);
      return sum + (pupilFee ? Number(pupilFee.amount) : 0);
    }, 0);
    
    const outstanding = totalExpected - termCollection;
    const collectionRate = totalExpected > 0 ? Math.round((termCollection / totalExpected) * 100) : 0;
    
    // Overdue pupils (no payment in last 30 days)
    const thirtyDaysAgo = subDays(today, 30);
    const overduePupils = activePupils.filter(pupil => {
      const pupilPayments = payments?.filter(p => 
        p.pupil_id === pupil.id && !p.is_deleted
      ) || [];
      if (pupilPayments.length === 0) return true;
      const lastPayment = pupilPayments.sort((a, b) => 
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      )[0];
      return new Date(lastPayment.payment_date) < thirtyDaysAgo;
    });
    
    return {
      todayCollection,
      weekCollection,
      termCollection,
      totalExpected,
      outstanding,
      collectionRate,
      overduePupils: overduePupils.length,
      totalPupils: activePupils.length,
      totalParents: new Set(pupils?.map(p => p.parent_id).filter(Boolean)).size,
    };
  }, [payments, pupils, fees, currentTerm, currentYear]);

  // Recent activity (last 5 actions)
  const recentActivity = useMemo(() => {
    const activity: Array<{
      type: string;
      description: string;
      timestamp: Date;
      icon: any;
    }> = [];
    
    // Recent payments
    const recentPayments = payments
      ?.filter(p => !p.is_deleted)
      ?.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
      ?.slice(0, 3) || [];
    
    recentPayments.forEach(p => {
      activity.push({
        type: "payment",
        description: `Payment recorded: ${p.pupils?.full_name} - ZMW ${Number(p.amount_paid).toLocaleString()}`,
        timestamp: new Date(p.payment_date),
        icon: DollarSign,
      });
    });
    
    // Sort by timestamp
    return activity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);
  }, [payments]);

  // Grade-wise collection status
  const gradeStatus = useMemo(() => {
    if (!grades || !pupils || !payments || !fees) return [];
    
    return grades.map(grade => {
      const gradePupils = pupils.filter(p => p.grade_id === grade.id && p.status === "active");
      const gradeFee = fees.find(f => 
        f.grade_id === grade.id && 
        f.term_number === currentTerm && 
        f.year === currentYear &&
        f.is_active !== false
      );
      const feeAmount = gradeFee ? Number(gradeFee.amount) : 0;
      const expected = feeAmount * gradePupils.length;
      
      const collected = payments
        ?.filter(p => 
          gradePupils.some(gp => gp.id === p.pupil_id) &&
          p.term_number === currentTerm &&
          p.year === currentYear &&
          !p.is_deleted
        )
        .reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
      
      const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0;
      
      return {
        name: grade.name,
        pupilCount: gradePupils.length,
        expected,
        collected,
        rate,
        status: rate >= 80 ? "excellent" : rate >= 50 ? "good" : rate > 0 ? "at_risk" : "critical",
      };
    });
  }, [grades, pupils, payments, fees, currentTerm, currentYear]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="School Admin Dashboard" 
        description="Operational control center for daily financial management"
      />

      {/* Status Strip */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Term {currentTerm}, {currentYear}</span>
        </div>
        <div className="hidden sm:block w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          {stats.collectionRate >= 60 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">Term Open</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-600 font-medium">Low Collection</span>
            </>
          )}
        </div>
        <div className="hidden sm:block w-px h-4 bg-border" />
        <div className="text-sm text-muted-foreground">
          {stats.overduePupils} pupils with no recent payment
        </div>
      </div>

      {/* Collection Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              ZMW {stats.todayCollection.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{format(new Date(), "dd MMM yyyy")}</p>
          </CardContent>
        </Card>
        
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              ZMW {stats.weekCollection.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Term</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ZMW {stats.termCollection.toLocaleString()}
            </div>
            <Progress value={stats.collectionRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        
        <Card className={stats.outstanding > 0 ? "border-red-200 bg-red-50/30" : "border-green-200 bg-green-50/30"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.outstanding > 0 ? "text-red-700" : "text-green-700"}`}>
              ZMW {stats.outstanding.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{stats.collectionRate}% collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Risk Snapshot
          </CardTitle>
          <CardDescription>Pupils requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.overduePupils}</div>
              <div className="text-sm text-red-600">Overdue Pupils</div>
              <div className="text-xs text-muted-foreground mt-1">No payment in 30+ days</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-700">
                {gradeStatus.filter(g => g.status === "at_risk").length}
              </div>
              <div className="text-sm text-orange-600">At-Risk Grades</div>
              <div className="text-xs text-muted-foreground mt-1">Collection below 50%</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">
                {gradeStatus.filter(g => g.status === "critical").length}
              </div>
              <div className="text-sm text-yellow-600">Critical Grades</div>
              <div className="text-xs text-muted-foreground mt-1">No payments recorded</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Collection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Grade Collection Status
          </CardTitle>
          <CardDescription>Payment status by grade level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {gradeStatus.map((grade) => (
              <div 
                key={grade.name}
                className={`p-3 rounded-lg border text-center transition-all hover:shadow-md cursor-pointer ${
                  grade.status === "excellent" ? "bg-green-50 border-green-200" :
                  grade.status === "good" ? "bg-blue-50 border-blue-200" :
                  grade.status === "at_risk" ? "bg-orange-50 border-orange-200" :
                  "bg-red-50 border-red-200"
                }`}
              >
                <div className="font-semibold text-sm">{grade.name}</div>
                <div className={`text-lg font-bold mt-1 ${
                  grade.status === "excellent" ? "text-green-700" :
                  grade.status === "good" ? "text-blue-700" :
                  grade.status === "at_risk" ? "text-orange-700" :
                  "text-red-700"
                }`}>
                  {grade.rate}%
                </div>
                <div className="text-xs text-muted-foreground">{grade.pupilCount} pupils</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/dashboard/payments">
                <DollarSign className="h-4 w-4 mr-2" />
                Record Payment
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/dashboard/pupils">
                <Plus className="h-4 w-4 mr-2" />
                Add Pupil
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/dashboard/parents">
                <Users className="h-4 w-4 mr-2" />
                Add Parent
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/dashboard/reports">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Reports
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Record a payment or add a pupil to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 bg-primary/10 rounded">
                      <activity.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(activity.timestamp, "dd MMM yyyy, HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pupils</p>
                <p className="text-2xl font-bold">{stats.totalPupils}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Parents</p>
                <p className="text-2xl font-bold">{stats.totalParents}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Grades</p>
                <p className="text-2xl font-bold">{grades?.length || 0}</p>
              </div>
              <GraduationCap className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
