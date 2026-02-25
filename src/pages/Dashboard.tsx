import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, AlertTriangle, GraduationCap, Database, RefreshCw, Percent, Search, Filter, Calendar, Download } from "lucide-react";
import { getAccurateDashboardStats, getOtherFeesBreakdown, getPupilsByFeeType, getDiscountBreakdown } from "@/services/fees";
import { supabase } from "@/integrations/supabase/client";
import { getGradeCounts } from "@/services/grades";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Simple pie chart component
const PieChart = ({ data, title }: { data: { label: string; value: number; color: string }[], title: string }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  return (
    <Card className="p-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-32 h-32 mx-auto">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {data.map((segment, index) => {
              const percentage = total > 0 ? (segment.value / total) * 100 : 0;
              const angle = (percentage / 100) * 360;
              const startAngle = data.slice(0, index).reduce((acc, s) => acc + (total > 0 ? (s.value / total) * 360 : 0), 0);
              const endAngle = startAngle + angle;
              
              const startX = 100 + radius * Math.cos((startAngle * Math.PI) / 180);
              const startY = 100 + radius * Math.sin((startAngle * Math.PI) / 180);
              const endX = 100 + radius * Math.cos((endAngle * Math.PI) / 180);
              const endY = 100 + radius * Math.sin((endAngle * Math.PI) / 180);
              const largeArcFlag = angle > 180 ? 1 : 0;
              
              return (
                <g key={index}>
                  <path
                    d={`M 100 100 L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                    fill={segment.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((segment, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: segment.color }}
                />
                <span>{segment.label}</span>
              </div>
              <span className="font-medium">
                {total > 0 ? Math.round((segment.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({ 
    totalPupils: 0, 
    admittedPupils: 0,
    newPupils: 0,
    totalExpected: 0,
    totalCollected: 0, 
    totalOutstanding: 0,
    schoolFeesExpected: 0,
    schoolFeesCollected: 0,
    schoolFeesOutstanding: 0,
    otherFeesExpected: 0,
    otherFeesCollected: 0,
    otherFeesOutstanding: 0,
    totalDiscountAmount: 0,
    pupilsWithDiscounts: 0
  });
  const [gradeCounts, setGradeCounts] = useState<{ id: string; name: string; count: number }[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [paymentLimit, setPaymentLimit] = useState(10);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        // First test Supabase connection
        const { data, error: connError } = await supabase.from('grades').select('count').single();
        if (connError) {
          setConnectionStatus('error');
          throw new Error(`Database connection failed: ${connError.message}`);
        }
        setConnectionStatus('connected');

        // Load dashboard data
        const [s, counts, payments] = await Promise.all([
          getAccurateDashboardStats().catch(err => {
            console.warn('Dashboard stats error:', err);
            return { 
              totalPupils: 0, 
              admittedPupils: 0, 
              newPupils: 0, 
              totalExpected: 0,
              totalCollected: 0, 
              totalOutstanding: 0,
              schoolFeesExpected: 0,
              schoolFeesCollected: 0,
              schoolFeesOutstanding: 0,
              otherFeesExpected: 0,
              otherFeesCollected: 0,
              otherFeesOutstanding: 0,
              totalDiscountAmount: 0,
              pupilsWithDiscounts: 0
            };
          }),
          getGradeCounts().catch(err => {
            console.warn('Grade counts error:', err);
            return [];
          }),
          supabase.from('installments')
            .select("*, pupils(full_name), school_fees(terms(name)), other_fees(fee_type)")
            .order("created_at", { ascending: false })
            .limit(10)
            .then(({ data, error }) => {
              if (error) throw error;
              return data || [];
            })
        ]);
        
        setStats(s);
        setGradeCounts(counts);
        setPaymentHistory(payments);
        setError(null);
      } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to load dashboard data';
        
        // Provide user-friendly error messages
        let userFriendlyMessage = 'Unable to load dashboard data. ';
        
        if (errorMessage.includes('connection')) {
          userFriendlyMessage += 'Please check your internet connection and try again.';
        } else if (errorMessage.includes('Database')) {
          userFriendlyMessage += 'Database service may be temporarily unavailable. Please try again in a few moments.';
        } else if (errorMessage.includes('timeout')) {
          userFriendlyMessage += 'Request timed out. Please try again.';
        } else {
          userFriendlyMessage += 'An unexpected error occurred. Please try refreshing the page.';
        }
        
        setError(userFriendlyMessage);
        setConnectionStatus('error');
      } finally {
        setLoading(false);
      }
    };
    load();

    // Set up real-time subscriptions for live updates
    const pupilsSubscription = supabase
      .channel('pupils-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pupils' }, () => {
        console.log('Pupils data changed, refreshing dashboard...');
        load();
      })
      .subscribe();

    const feesSubscription = supabase
      .channel('fees-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'school_fees' }, () => {
        console.log('School fees data changed, refreshing dashboard...');
        load();
      })
      .subscribe();

    const installmentsSubscription = supabase
      .channel('installments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'installments' }, () => {
        console.log('Installments data changed, refreshing dashboard...');
        load();
      })
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      pupilsSubscription.unsubscribe();
      feesSubscription.unsubscribe();
      installmentsSubscription.unsubscribe();
    };
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setConnectionStatus('checking');
    // Trigger reload
    window.location.reload();
  };

  const handleEditPayment = async () => {
    if (!selectedPayment) return;

    const oldAmount = selectedPayment.amount_paid_original || selectedPayment.amount_paid;
    const newAmount = selectedPayment.amount_paid;
    const oldDiscount = selectedPayment.discount_applied_original || 0;
    const newDiscount = selectedPayment.discount_applied || 0;

    // Calculate old and new effective amounts
    const oldEffective = oldAmount - (oldAmount * oldDiscount / 100);
    const newEffective = newAmount - (newAmount * newDiscount / 100);
    const adjustment = newEffective - oldEffective;

    try {
      // Update installment
      const { error: instError } = await supabase
        .from('installments')
        .update({
          amount_paid: newAmount,
          discount_applied: newDiscount,
          RCT_no: selectedPayment.RCT_no || null
        })
        .eq('id', selectedPayment.id);

      if (instError) throw instError;

      // Update fee record
      if (selectedPayment.school_fee_id) {
        const { data: fee } = await supabase.from('school_fees').select('total_collected, balance').eq('id', selectedPayment.school_fee_id).single();
        const newCollected = Number(fee.total_collected) + adjustment;
        const newBalance = Number(fee.balance) - adjustment;
        await supabase
          .from('school_fees')
          .update({
            total_collected: newCollected,
            balance: newBalance,
            paid_toggle: newBalance <= 0
          })
          .eq('id', selectedPayment.school_fee_id);

      } else if (selectedPayment.other_fee_id) {
        const { data: fee } = await supabase.from('other_fees').select('collected, balance').eq('id', selectedPayment.other_fee_id).single();
        const newCollected = Number(fee.collected) + adjustment;
        const newBalance = Number(fee.balance) - adjustment;
        await supabase
          .from('other_fees')
          .update({
            collected: newCollected,
            balance: newBalance,
            paid_toggle: newBalance <= 0
          })
          .eq('id', selectedPayment.other_fee_id);
      }

      setEditPaymentOpen(false);
      setSelectedPayment(null);
      // Reload payment history
      const { data: payments } = await supabase
        .from('installments')
        .select("*, pupils(full_name), school_fees(terms(name)), other_fees(fee_type)")
        .order("created_at", { ascending: false })
        .limit(10);
      setPaymentHistory(payments || []);
      toast({ title: "Payment updated successfully" });
    } catch (error: any) {
      toast({ title: "Error updating payment", description: error.message, variant: "destructive" });
    }
  };

  const schoolFeesCards = [
    { label: "Expected", value: `ZMW ${(stats.schoolFeesExpected || 0).toLocaleString()}`, color: "text-blue-500" },
    { label: "Collected", value: `ZMW ${(stats.schoolFeesCollected || 0).toLocaleString()}`, color: "text-green-500" },
    { label: "Outstanding", value: `ZMW ${(stats.schoolFeesOutstanding || 0).toLocaleString()}`, color: "text-red-500" },
  ];

  const otherFeesCards = [
    { label: "Expected", value: `ZMW ${(stats.otherFeesExpected || 0).toLocaleString()}`, color: "text-blue-500" },
    { label: "Collected", value: `ZMW ${(stats.otherFeesCollected || 0).toLocaleString()}`, color: "text-green-500" },
    { label: "Outstanding", value: `ZMW ${(stats.otherFeesOutstanding || 0).toLocaleString()}`, color: "text-red-500" },
  ];

  const discountCards = [
    { label: "Total Discount", value: `ZMW ${(stats.totalDiscountAmount || 0).toLocaleString()}`, color: "text-purple-500" },
    { label: "Pupils with Discounts", value: stats.pupilsWithDiscounts || 0, color: "text-blue-500" },
    { label: "Average Discount", value: `${stats.pupilsWithDiscounts > 0 ? (stats.totalDiscountAmount / stats.pupilsWithDiscounts).toFixed(2) : 0}%`, color: "text-green-500" },
  ];

  // Pie chart data
  const feeDistributionData = [
    { label: "School Fees", value: stats.schoolFeesExpected || 0, color: "#3b82f6" },
    { label: "Other Fees", value: stats.otherFeesExpected || 0, color: "#10b981" },
  ];

  const collectionStatusData = [
    { label: "Collected", value: stats.totalCollected || 0, color: "#22c55e" },
    { label: "Outstanding", value: stats.totalOutstanding || 0, color: "#ef4444" },
  ];

  const pupilStatusData = [
    { label: "Admitted", value: stats.admittedPupils || 0, color: "#22c55e" },
    { label: "New", value: stats.newPupils || 0, color: "#3b82f6" },
    { label: "Other", value: (stats.totalPupils || 0) - (stats.admittedPupils || 0) - (stats.newPupils || 0), color: "#6b7280" },
  ];

  const summaryCards = [
    { label: "Total Pupils", value: stats.totalPupils || 0, icon: Users, color: "text-primary", detail: `${stats.admittedPupils || 0} admitted, ${stats.newPupils || 0} new` },
    { label: "Total Expected (All Fees)", value: `ZMW ${(stats.totalExpected || 0).toLocaleString()}`, icon: DollarSign, color: "text-blue-600", detail: "School + Other fees" },
    { label: "Total Collected (All Fees)", value: `ZMW ${(stats.totalCollected || 0).toLocaleString()}`, icon: DollarSign, color: "text-green-600", detail: "School + Other fees" },
    { label: "Total Outstanding (All Fees)", value: `ZMW ${(stats.totalOutstanding || 0).toLocaleString()}`, icon: AlertTriangle, color: "text-red-600", detail: "School + Other fees" },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin mb-4" />
        <div className="text-center">
          <p>Loading dashboard data...</p>
          <p className="text-sm mt-2">Connecting to Supabase database</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-center max-w-md">
          <Database className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Database Connection Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title font-heading">Dashboard</h1>
            <p className="page-description">Overview of school operations</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Database className={`h-4 w-4 ${
              connectionStatus === 'connected' ? 'text-green-500' : 
              connectionStatus === 'error' ? 'text-red-500' : 'text-yellow-500'
            }`} />
            <span className="text-muted-foreground">
              {connectionStatus === 'connected' ? 'Connected to Supabase' : 
               connectionStatus === 'error' ? 'Connection Error' : 'Checking...'}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats Section - Compact */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4 text-primary">Financial Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Pupils</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalPupils}</div>
            <div className="text-xs text-muted-foreground">
              {stats.admittedPupils} admitted, {stats.newPupils} new
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-muted-foreground">Expected</span>
            </div>
            <div className="text-2xl font-bold">ZMW {(stats.totalExpected || 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">All fees</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Collected</span>
            </div>
            <div className="text-2xl font-bold">ZMW {(stats.totalCollected || 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">All fees</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-muted-foreground">Outstanding</span>
            </div>
            <div className="text-2xl font-bold">ZMW {(stats.totalOutstanding || 0).toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">All fees</div>
          </Card>
        </div>
      </div>

      {/* Progress Bars Section */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4 text-primary">Collection Progress</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">School Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {schoolFeesCards.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={item.color}>{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  {item.label === "Collected" && stats.schoolFeesExpected > 0 && (
                    <Progress 
                      value={(stats.schoolFeesCollected / stats.schoolFeesExpected) * 100} 
                      className="h-2"
                    />
                  )}
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-600">Collection Rate</span>
                  <span className="font-bold">
                    {stats.schoolFeesExpected > 0 ? Math.round((stats.schoolFeesCollected / stats.schoolFeesExpected) * 100) : 0}%
                  </span>
                </div>
                <Progress 
                  value={stats.schoolFeesExpected > 0 ? (stats.schoolFeesCollected / stats.schoolFeesExpected) * 100 : 0} 
                  className="h-2 mt-1"
                />
              </div>
            </CardContent>
          </Card>
          <Card className="p-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Other Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {otherFeesCards.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={item.color}>{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  {item.label === "Collected" && stats.otherFeesExpected > 0 && (
                    <Progress 
                      value={(stats.otherFeesCollected / stats.otherFeesExpected) * 100} 
                      className="h-2"
                    />
                  )}
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-600">Collection Rate</span>
                  <span className="font-bold">
                    {stats.otherFeesExpected > 0 ? Math.round((stats.otherFeesCollected / stats.otherFeesExpected) * 100) : 0}%
                  </span>
                </div>
                <Progress 
                  value={stats.otherFeesExpected > 0 ? (stats.otherFeesCollected / stats.otherFeesExpected) * 100 : 0} 
                  className="h-2 mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pie Charts Section */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4 text-primary">Visual Analytics</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <PieChart 
            data={feeDistributionData} 
            title="Fee Distribution" 
          />
          <PieChart 
            data={collectionStatusData} 
            title="Collection Status" 
          />
          <PieChart 
            data={pupilStatusData} 
            title="Pupil Status" 
          />
        </div>
      </div>

      {/* Discounts Section - Compact */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4 text-primary">Discounts Analysis</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {discountCards.map((item, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Percent className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <div className="text-xl font-bold">{item.value}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment History Section - Enhanced */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-semibold text-primary">Payment History</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLoadingPayments(true)}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by pupil name, RCT number, or fee type..."
              value={paymentSearch}
              onChange={(e) => setPaymentSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="all">All Payments</option>
              <option value="school_fee">School Fees</option>
              <option value="other_fee">Other Fees</option>
              <option value="with_discount">With Discount</option>
              <option value="without_discount">Without Discount</option>
            </select>
            <select
              value={paymentLimit}
              onChange={(e) => setPaymentLimit(Number(e.target.value))}
              className="px-3 py-2 border rounded-md bg-background text-sm"
            >
              <option value="10">Last 10</option>
              <option value="25">Last 25</option>
              <option value="50">Last 50</option>
              <option value="100">Last 100</option>
            </select>
          </div>
        </div>

        {paymentHistory.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No payments recorded yet</p>
              <p className="text-sm">Payment records will appear here once payments are made</p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-medium">Pupil</TableHead>
                    <TableHead className="font-medium">Fee Type</TableHead>
                    <TableHead className="font-medium text-right">Amount</TableHead>
                    <TableHead className="font-medium text-right">Discount</TableHead>
                    <TableHead className="font-medium text-right">Effective</TableHead>
                    <TableHead className="font-medium">RCT #</TableHead>
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="font-medium text-center">Status</TableHead>
                    <TableHead className="font-medium text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory
                    .filter(payment => {
                      const matchesSearch = paymentSearch === "" || 
                        payment.pupils?.full_name?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        payment.RCT_no?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
                        (payment.fee_type === 'school_fee' ? 'School Fee' : payment.other_fees?.fee_type || payment.fee_type).toLowerCase().includes(paymentSearch.toLowerCase());
                      
                      const matchesFilter = paymentFilter === "all" ||
                        (paymentFilter === "school_fee" && payment.fee_type === 'school_fee') ||
                        (paymentFilter === "other_fee" && payment.fee_type !== 'school_fee') ||
                        (paymentFilter === "with_discount" && payment.discount_applied > 0) ||
                        (paymentFilter === "without_discount" && payment.discount_applied === 0);
                      
                      return matchesSearch && matchesFilter;
                    })
                    .slice(0, paymentLimit)
                    .map((inst) => {
                      const effectiveAmount = Number(inst.amount_paid) - (Number(inst.amount_paid) * inst.discount_applied / 100);
                      return (
                        <TableRow key={inst.id} className="hover:bg-muted/25 transition-colors">
                          <TableCell>
                            <div>
                              <div className="font-medium">{inst.pupils?.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {inst.fee_type === 'school_fee' ? 'School Fee' : inst.other_fees?.fee_type || inst.fee_type}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={inst.fee_type === 'school_fee' ? 'default' : 'secondary'}>
                              {inst.fee_type === 'school_fee' ? 'School' : 'Other'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ZMW {Number(inst.amount_paid).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {inst.discount_applied > 0 ? (
                              <Badge variant="outline" className="text-purple-600 border-purple-600">
                                {inst.discount_applied}%
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ZMW {effectiveAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {inst.RCT_no ? (
                              <Badge variant="outline" className="font-mono text-xs">
                                {inst.RCT_no}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No RCT</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{new Date(inst.created_at).toLocaleDateString()}</div>
                              <div className="text-muted-foreground text-xs">
                                {new Date(inst.created_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={inst.discount_applied > 0 ? 'default' : 'secondary'}>
                              {inst.discount_applied > 0 ? 'Discounted' : 'Full'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => { 
                                setSelectedPayment({
                                  ...inst, 
                                  amount_paid_original: inst.amount_paid, 
                                  discount_applied_original: inst.discount_applied
                                }); 
                                setEditPaymentOpen(true); 
                              }}
                              className="h-8 px-3"
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
            {paymentHistory.length > paymentLimit && (
              <div className="border-t bg-muted/25 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Showing {Math.min(paymentLimit, paymentHistory.length)} of {paymentHistory.length} payments
                </p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Pupils per Grade Section */}
      <div className="stat-card">
        <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Pupils per Grade
        </h2>
        {gradeCounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No grades created yet or no data available.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gradeCounts.map((g) => (
              <div 
                key={g.name} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/pupils?grade=${g.id}`)}
                title={`Click to view ${g.name} pupils`}
              >
                <span className="font-medium text-sm">{g.name}</span>
                <span className="text-lg font-bold text-primary">{g.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Payment Modal */}
      <Dialog open={editPaymentOpen} onOpenChange={setEditPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Pupil: {selectedPayment?.pupils?.full_name} | Fee: {selectedPayment?.fee_type === 'school_fee' ? 'School Fee' : selectedPayment?.other_fees?.fee_type}
            </p>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Original Amount:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ZMW {Number(selectedPayment.amount_paid).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Date: {new Date(selectedPayment.created_at).toLocaleDateString()}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-amount">Payment Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  value={selectedPayment.amount_paid || ''}
                  onChange={(e) => setSelectedPayment({ ...selectedPayment, amount_paid: Number(e.target.value) })}
                  min="0"
                  step="0.01"
                  placeholder="Enter payment amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-rct">RCT Number (Receipt)</Label>
                <Input
                  id="edit-rct"
                  value={selectedPayment.RCT_no || ''}
                  onChange={(e) => setSelectedPayment({ ...selectedPayment, RCT_no: e.target.value })}
                  placeholder="Enter RCT number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-discount">Discount Percentage (%)</Label>
                <Input
                  id="edit-discount"
                  type="number"
                  value={selectedPayment.discount_applied || 0}
                  onChange={(e) => setSelectedPayment({ ...selectedPayment, discount_applied: Number(e.target.value) })}
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="e.g. 10.00"
                />
                {selectedPayment.discount_applied > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Effective amount: ZMW {(Number(selectedPayment.amount_paid) - (Number(selectedPayment.amount_paid) * selectedPayment.discount_applied / 100)).toLocaleString()}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditPaymentOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditPayment}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
