import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Search, CreditCard, AlertTriangle, TrendingUp, Calendar, Filter, Activity, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RecordPaymentDialog from "@/components/RecordPaymentDialog";
import { usePayments } from "@/hooks/usePayments";
import { usePupils } from "@/hooks/usePupils";
import { useFees } from "@/hooks/useFees";
import { cn } from "@/lib/utils";
import { format, differenceInDays, isSameDay, subDays } from "date-fns";

interface PaymentWithIntelligence {
  id: string;
  pupil_id: string;
  amount_paid: number;
  payment_date: string;
  term_number: number;
  year: number;
  created_at: string;
  is_deleted?: boolean;
  pupils: {
    full_name: string;
    grades?: { name: string } | null;
  } | null;
  isLargePayment: boolean;
  isRecent: boolean;
  daysSinceLastPayment: number | null;
  frequencyFlag: "normal" | "frequent" | "rare";
  riskFlag: "low" | "medium" | "high";
  patternType: "regular" | "irregular" | "new" | "inactive";
}

export default function Payments() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [suspiciousMode, setSuspiciousMode] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  
  const { data: payments, isLoading, error } = usePayments();
  const { data: pupils } = usePupils();
  const { data: fees } = useFees();

  const currentYear = new Date().getFullYear();

  // Debug logging
  console.log('Payments Page Debug:', {
    payments: payments?.length,
    pupils: pupils?.length,
    fees: fees?.length,
    currentYear,
    isLoading,
    error
  });

  // Calculate dynamic thresholds based on actual payment data
  const allPayments = payments || [];
  const avgPaymentAmount = allPayments.length > 0 
    ? allPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0) / allPayments.length 
    : 0;
  const maxPaymentAmount = allPayments.length > 0 
    ? Math.max(...allPayments.map(p => Number(p.amount_paid))) 
    : 0;
  const largePaymentThreshold = avgPaymentAmount > 0 ? avgPaymentAmount * 2 : 10000; // 2x average or default

  // Process payments with intelligence
  const paymentsWithIntel = useMemo((): PaymentWithIntelligence[] => {
    if (!payments) return [];
    
    const paymentsByPupil = payments.reduce((acc, p) => {
      if (!acc[p.pupil_id]) acc[p.pupil_id] = [];
      acc[p.pupil_id].push(p);
      return acc;
    }, {} as Record<string, typeof payments>);

    return payments.map((payment) => {
      const pupilPayments = paymentsByPupil[payment.pupil_id] || [];
      const sortedPupilPayments = [...pupilPayments].sort(
        (a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime()
      );
      
      const currentIndex = sortedPupilPayments.findIndex(p => p.id === payment.id);
      const previousPayment = currentIndex > 0 ? sortedPupilPayments[currentIndex - 1] : null;
      
      const daysSinceLastPayment = previousPayment 
        ? differenceInDays(new Date(payment.payment_date), new Date(previousPayment.payment_date))
        : null;

      const avgAmount = pupilPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0) / pupilPayments.length;
      const isLargePayment = Number(payment.amount_paid) > largePaymentThreshold;
      const isRecent = differenceInDays(new Date(), new Date(payment.payment_date)) <= 7;

      const paymentCount = pupilPayments.length;
      let frequencyFlag: "normal" | "frequent" | "rare" = "normal";
      if (paymentCount > 5) frequencyFlag = "frequent";
      else if (paymentCount === 1) frequencyFlag = "rare";

      let patternType: "regular" | "irregular" | "new" | "inactive" = "irregular";
      if (paymentCount === 1) patternType = "new";
      else if (daysSinceLastPayment && daysSinceLastPayment <= 35) patternType = "regular";
      else if (daysSinceLastPayment && daysSinceLastPayment > 90) patternType = "inactive";

      let riskFlag: "low" | "medium" | "high" = "low";
      if (isLargePayment || (daysSinceLastPayment && daysSinceLastPayment < 1)) riskFlag = "high";
      else if (patternType === "irregular") riskFlag = "medium";

      return {
        ...payment,
        isLargePayment,
        isRecent,
        daysSinceLastPayment,
        frequencyFlag,
        riskFlag,
        patternType,
      };
    });
  }, [payments, largePaymentThreshold]);

  // Stats
  const stats = useMemo(() => {
    const totalPayments = payments?.length || 0;
    const totalAmount = payments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;
    const recentPayments = payments?.filter(p => 
      differenceInDays(new Date(), new Date(p.payment_date)) <= 7
    ).length || 0;
    const suspiciousPayments = paymentsWithIntel.filter(p => p.riskFlag === "high" || p.isLargePayment).length;
    const uniqueDays = new Set(payments?.map(p => format(new Date(p.payment_date), "yyyy-MM-dd"))).size || 1;
    const dailyAverage = totalAmount / Math.max(1, uniqueDays);

    return { totalPayments, totalAmount, recentPayments, suspiciousPayments, dailyAverage };
  }, [payments, paymentsWithIntel]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    let result = paymentsWithIntel;
    if (activeTab === "recent") result = result.filter(p => p.isRecent);
    else if (activeTab === "suspicious") result = result.filter(p => p.riskFlag === "high" || p.isLargePayment);
    else if (activeTab === "large") result = result.filter(p => p.isLargePayment);
    if (suspiciousMode) result = result.filter(p => p.riskFlag === "high" || p.isLargePayment || p.patternType === "irregular");
    if (selectedTerm !== "all") result = result.filter(p => p.term_number === parseInt(selectedTerm));
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(p =>
        p.pupils?.full_name?.toLowerCase().includes(term) ||
        p.pupils?.grades?.name?.toLowerCase().includes(term)
      );
    }
    return result.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [paymentsWithIntel, activeTab, suspiciousMode, selectedTerm, search]);

  const paymentsGroupedByTerm = useMemo(() => {
    const map = new Map<string, { label: string; termNumber: number; year: number; payments: PaymentWithIntelligence[] }>();
    for (const p of filteredPayments) {
      const key = `${p.year}-T${p.term_number}`;
      if (!map.has(key)) {
        map.set(key, {
          label: `Term ${p.term_number}, ${p.year}`,
          termNumber: p.term_number,
          year: p.year,
          payments: [],
        });
      }
      map.get(key)!.payments.push(p);
    }

    const groups = Array.from(map.values());
    groups.sort((a, b) => (b.year - a.year) || (b.termNumber - a.termNumber));
    for (const g of groups) {
      g.payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    }
    return groups;
  }, [filteredPayments]);

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high": return <Badge variant="destructive" className="text-xs">High Risk</Badge>;
      case "medium": return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">Medium</Badge>;
      default: return null;
    }
  };

  const getPatternBadge = (pattern: string) => {
    switch (pattern) {
      case "regular": return <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">Regular</Badge>;
      case "new": return <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">New</Badge>;
      case "inactive": return <Badge variant="outline" className="bg-gray-100 text-gray-800 text-xs">Inactive</Badge>;
      default: return <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">Irregular</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Payments" 
        description="Transaction intelligence and payment tracking" 
        actions={<RecordPaymentDialog />} 
      />

      {error && (
        <div className="bg-card border rounded-lg p-4 text-sm text-red-700">
          {(error as any)?.message || "Failed to load payments"}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">ZMW {stats.totalAmount.toLocaleString()}</div>
            <Progress value={75} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.recentPayments}</div>
            <p className="text-xs text-muted-foreground">Payments this week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suspicious Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-red-600">{stats.suspiciousPayments}</div>
              {stats.suspiciousPayments > 0 && <AlertTriangle className="h-5 w-5 text-red-500" />}
            </div>
            <p className="text-xs text-muted-foreground">Flagged transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Intelligence Panel */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Activity className="h-5 w-5" />
            Transaction Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-blue-700">Daily Average</div>
              <div className="text-xl font-bold text-blue-800">
                ZMW {Math.round(stats.dailyAverage).toLocaleString()}
              </div>
              <p className="text-xs text-blue-600 mt-1">Average collections per day</p>
            </div>
            <div>
              <div className="text-sm text-blue-700">Pattern Analysis</div>
              <div className="text-xl font-bold text-blue-800">
                {paymentsWithIntel.filter(p => p.patternType === "regular").length}
              </div>
              <p className="text-xs text-blue-600 mt-1">Regular payment patterns</p>
            </div>
            <div>
              <div className="text-sm text-blue-700">Compliance Score</div>
              <div className="text-xl font-bold text-green-700">
                {stats.suspiciousPayments === 0 ? "100%" : `${Math.max(0, 100 - (stats.suspiciousPayments / Math.max(1, stats.totalPayments) * 100)).toFixed(0)}%`}
              </div>
              <p className="text-xs text-blue-600 mt-1">Clean transaction rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="suspicious" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800">
                <Shield className="h-3 w-3 mr-1" />
                Suspicious
              </TabsTrigger>
              <TabsTrigger value="large">Large</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="1">Term 1</SelectItem>
              <SelectItem value="2">Term 2</SelectItem>
              <SelectItem value="3">Term 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="suspicious-mode" checked={suspiciousMode} onCheckedChange={setSuspiciousMode} />
            <label htmlFor="suspicious-mode" className="text-sm cursor-pointer">Suspicious Activity Mode</label>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search payments..." className="pl-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No payments found.</p>
          <p className="text-sm text-muted-foreground mt-1">{search || suspiciousMode ? "Try adjusting your filters." : "Click 'Record Payment' to start."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedTerm === "all" ? (
            <div className="space-y-8">
              {paymentsGroupedByTerm.map((group) => (
                <div key={group.label} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                    <Badge variant="secondary">{group.payments.length} payments</Badge>
                    <div className="flex-1 h-px bg-border" />
                    <div className="text-sm text-muted-foreground">
                      Total: ZMW {Math.round(group.payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)).toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.payments.map((payment) => (
                      <div key={payment.id} className={cn(
                        "bg-card border rounded-lg p-4 transition-all",
                        payment.riskFlag === "high" && "border-red-200 bg-red-50/30",
                        payment.isLargePayment && "border-orange-200 bg-orange-50/30"
                      )}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn("p-2 rounded-lg", payment.riskFlag === "high" ? "bg-red-100" : payment.isLargePayment ? "bg-orange-100" : "bg-green-100")}>
                              <CreditCard className={cn("h-5 w-5", payment.riskFlag === "high" ? "text-red-600" : payment.isLargePayment ? "text-orange-600" : "text-green-600")} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{payment.pupils?.full_name || "Unknown"}</span>
                                {getRiskBadge(payment.riskFlag)}
                                {payment.isLargePayment && <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">Large Payment</Badge>}
                              </div>
                              <div className="text-sm text-muted-foreground">{payment.pupils?.grades?.name || "No grade"} • Term {payment.term_number}, {payment.year}</div>
                              <div className="flex items-center gap-2 mt-1">
                                {getPatternBadge(payment.patternType)}
                                {payment.frequencyFlag === "frequent" && <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">Frequent Payer</Badge>}
                              </div>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className={cn("text-xl font-bold", payment.riskFlag === "high" ? "text-red-600" : "text-green-600")}>
                              ZMW {Number(payment.amount_paid).toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">{format(new Date(payment.payment_date), "dd MMM yyyy")}</div>
                            {payment.daysSinceLastPayment !== null && (
                              <div className="text-xs text-muted-foreground">
                                {payment.daysSinceLastPayment === 0 ? "Same day as previous" : `${payment.daysSinceLastPayment} days since last`}
                              </div>
                            )}
                          </div>
                        </div>
                        {(payment.riskFlag === "high" || payment.isLargePayment) && (
                          <div className="mt-3 pt-3 border-t text-sm">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                              <div className="text-red-700">
                                {payment.isLargePayment && <p>Large payment detected: significantly above average</p>}
                                {payment.daysSinceLastPayment !== null && payment.daysSinceLastPayment < 1 && <p>Multiple payments on same day - review for duplicates</p>}
                                {payment.patternType === "irregular" && <p>Irregular payment pattern detected</p>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <div key={payment.id} className={cn(
                "bg-card border rounded-lg p-4 transition-all",
                payment.riskFlag === "high" && "border-red-200 bg-red-50/30",
                payment.isLargePayment && "border-orange-200 bg-orange-50/30"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg", payment.riskFlag === "high" ? "bg-red-100" : payment.isLargePayment ? "bg-orange-100" : "bg-green-100")}>
                      <CreditCard className={cn("h-5 w-5", payment.riskFlag === "high" ? "text-red-600" : payment.isLargePayment ? "text-orange-600" : "text-green-600")} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{payment.pupils?.full_name || "Unknown"}</span>
                        {getRiskBadge(payment.riskFlag)}
                        {payment.isLargePayment && <Badge variant="outline" className="bg-orange-100 text-orange-800 text-xs">Large Payment</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">{payment.pupils?.grades?.name || "No grade"} • Term {payment.term_number}, {payment.year}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {getPatternBadge(payment.patternType)}
                        {payment.frequencyFlag === "frequent" && <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">Frequent Payer</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className={cn("text-xl font-bold", payment.riskFlag === "high" ? "text-red-600" : "text-green-600")}>
                      ZMW {Number(payment.amount_paid).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">{format(new Date(payment.payment_date), "dd MMM yyyy")}</div>
                    {payment.daysSinceLastPayment !== null && (
                      <div className="text-xs text-muted-foreground">
                        {payment.daysSinceLastPayment === 0 ? "Same day as previous" : `${payment.daysSinceLastPayment} days since last`}
                      </div>
                    )}
                  </div>
                </div>
                {(payment.riskFlag === "high" || payment.isLargePayment) && (
                  <div className="mt-3 pt-3 border-t text-sm">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div className="text-red-700">
                        {payment.isLargePayment && <p>Large payment detected: significantly above average</p>}
                        {payment.daysSinceLastPayment !== null && payment.daysSinceLastPayment < 1 && <p>Multiple payments on same day - review for duplicates</p>}
                        {payment.patternType === "irregular" && <p>Irregular payment pattern detected</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
