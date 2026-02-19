import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Search, GraduationCap, AlertTriangle, Plus, Filter, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import AddPupilDialog from "@/components/AddPupilDialog";
import { usePupils } from "@/hooks/usePupils";
import { useFees } from "@/hooks/useFees";
import { usePayments } from "@/hooks/usePayments";
import { useGrades } from "@/hooks/useGrades";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { TermNumber } from "@/types/enums";

interface PupilWithRisk {
  id: string;
  full_name: string;
  grade_id: string | null;
  parent_id: string | null;
  status: string;
  created_at: string;
  grades: { name: string } | null;
  parents: { full_name: string; phone_number: string | null } | null;
  expected: number;
  paid: number;
  balance: number;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  lifetimePaid: number;
  lastPaymentDate: Date | null;
  paymentCount: number;
}

export default function Pupils() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedPupil, setSelectedPupil] = useState<PupilWithRisk | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<TermNumber>(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const { data: pupils, isLoading, error } = usePupils();
  const { data: fees } = useFees();
  const { data: payments } = usePayments();
  const { data: grades } = useGrades();

  const currentYear = selectedYear;
  const currentTerm: TermNumber = selectedTerm;

  // Calculate dynamic risk thresholds based on actual pupil data
  const allRiskScores = useMemo(() => {
    if (!pupils) return [];
    return pupils.map((pupil) => {
      const expected = fees
        ?.filter(f => f.grade_id === pupil.grade_id && f.term_number === currentTerm && f.year === currentYear)
        .reduce((sum, f) => sum + Number(f.amount), 0) || 0;

      const pupilPayments = payments?.filter(p => p.pupil_id === pupil.id && p.term_number === currentTerm && p.year === currentYear) || [];
      const paid = pupilPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
      
      const lastPayment = pupilPayments.length > 0
        ? [...pupilPayments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]
        : null;
      
      const balance = expected - paid;
      
      let riskScore = 0;
      if (expected > 0) riskScore += (balance / expected) * 40;
      if (lastPayment) {
        const daysSince = differenceInDays(new Date(), new Date(lastPayment.payment_date));
        if (daysSince > 90) riskScore += 30;
        else if (daysSince > 60) riskScore += 20;
        else if (daysSince > 30) riskScore += 10;
      } else if (expected > 0) riskScore += 30;
      
      const paymentCount = pupilPayments.length;
      if (expected > 0 && paymentCount === 0) riskScore += 20;
      else if (paymentCount < 2) riskScore += 10;
      
      if (pupil.status === "inactive") riskScore += 10;
      
      riskScore = Math.min(100, Math.max(0, riskScore));
      
      return riskScore;
    });
  }, [pupils, fees, payments, currentTerm, currentYear]);

  const averageRiskScore = useMemo(() => {
    if (allRiskScores.length === 0) return 0;
    return allRiskScores.reduce((sum, score) => sum + score, 0) / allRiskScores.length;
  }, [allRiskScores]);

  const criticalRiskThreshold = Math.max(75, averageRiskScore + 25); // 75 or 25 above average
  const highRiskThreshold = Math.max(50, averageRiskScore + 15); // 50 or 15 above average  
  const mediumRiskThreshold = Math.max(25, averageRiskScore); // 25 or average

  const pupilsWithRisk = useMemo((): PupilWithRisk[] => {
    if (!pupils || !fees || !payments) return [];
    
    return pupils.map((pupil) => {
      const expected = (fees ?? [])
        .filter(f => f.term_number === currentTerm && f.year === currentYear && f.grade_id === pupil.grade_id)
        .reduce((sum, f) => sum + Number(f.amount), 0);
      
      const paid = (payments ?? [])
        .filter(p => p.pupil_id === pupil.id && p.term_number === currentTerm && p.year === currentYear)
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);
      
      const balance = expected - paid;
      const lifetimePaid = (payments ?? [])
        .filter(p => p.pupil_id === pupil.id)
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);
      
      const pupilPayments = (payments ?? [])
        .filter(p => p.pupil_id === pupil.id && p.term_number === currentTerm && p.year === currentYear);
      
      const lastPayment = pupilPayments.length > 0 
        ? [...pupilPayments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]
        : null;
      
      let riskScore = 0;
      if (expected > 0) riskScore += (balance / expected) * 40;
      if (lastPayment) {
        const daysSince = differenceInDays(new Date(), new Date(lastPayment.payment_date));
        if (daysSince > 90) riskScore += 30;
        else if (daysSince > 60) riskScore += 20;
        else if (daysSince > 30) riskScore += 10;
      } else if (expected > 0) riskScore += 30;
      
      const paymentCount = pupilPayments.length;
      if (expected > 0 && paymentCount === 0) riskScore += 20;
      else if (paymentCount < 2) riskScore += 10;
      
      if (pupil.status === "inactive") riskScore += 10;
      
      riskScore = Math.min(100, Math.max(0, riskScore));
      
      let riskLevel: "low" | "medium" | "high" | "critical" = "low";
      if (riskScore >= criticalRiskThreshold) riskLevel = "critical";
      else if (riskScore >= highRiskThreshold) riskLevel = "high";
      else if (riskScore >= mediumRiskThreshold) riskLevel = "medium";
      
      return {
        ...pupil,
        expected,
        paid,
        balance,
        riskScore: Math.round(riskScore),
        riskLevel,
        lifetimePaid,
        lastPaymentDate: lastPayment ? new Date(lastPayment.payment_date) : null,
        paymentCount,
      };
    });
  }, [pupils, fees, payments, currentTerm, currentYear, criticalRiskThreshold, highRiskThreshold, mediumRiskThreshold]);

  const filteredPupils = useMemo(() => {
    let result = pupilsWithRisk;
    if (activeTab === "risk") result = result.filter(p => p.riskLevel === "high" || p.riskLevel === "critical");
    else if (activeTab === "recent") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      result = result.filter(p => new Date(p.created_at) >= thirtyDaysAgo);
    } else if (activeTab === "inactive") result = result.filter(p => p.status === "inactive");
    
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(p => 
        p.full_name.toLowerCase().includes(term) ||
        p.grades?.name?.toLowerCase().includes(term) ||
        p.parents?.full_name?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [pupilsWithRisk, activeTab, search]);

  const pupilsGrouped = useMemo(() => {
    const map = new Map<string, { gradeName: string; pupils: PupilWithRisk[] }>();
    for (const pupil of filteredPupils) {
      const gradeName = pupil.grades?.name || "No Grade";
      if (!map.has(gradeName)) map.set(gradeName, { gradeName, pupils: [] });
      map.get(gradeName)!.pupils.push(pupil);
    }

    const groups = Array.from(map.values());
    groups.sort((a, b) => a.gradeName.localeCompare(b.gradeName));
    for (const g of groups) g.pupils.sort((a, b) => a.full_name.localeCompare(b.full_name));
    return groups;
  }, [filteredPupils]);

  const handlePupilClick = (pupil: PupilWithRisk) => {
    setSelectedPupil(pupil);
    setIsPanelOpen(true);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "bg-green-100 text-green-800 border-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "low": return "Good";
      case "medium": return "Watch";
      case "high": return "Risk";
      case "critical": return "Critical";
      default: return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pupils"
        description="Manage student records and financial risk profiles"
        actions={<AddPupilDialog />}
      />

      {error && (
        <div className="bg-card border rounded-lg p-4 text-sm text-red-700">
          {(error as any)?.message || "Failed to load pupils"}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Pupils</div>
          <div className="text-2xl font-bold">{pupilsWithRisk.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active</div>
          <div className="text-2xl font-bold text-green-600">
            {pupilsWithRisk.filter(p => p.status === "active").length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">High Risk</div>
          <div className="text-2xl font-bold text-red-600">
            {pupilsWithRisk.filter(p => p.riskLevel === "high" || p.riskLevel === "critical").length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Outstanding</div>
          <div className="text-2xl font-bold text-orange-600">
            ZMW {pupilsWithRisk.reduce((sum, p) => sum + p.balance, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All Pupils</TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-800">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Financial Risk
            </TabsTrigger>
            <TabsTrigger value="recent">Recently Added</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Term:</span>
            <Select value={currentTerm.toString()} onValueChange={(v) => setSelectedTerm(Number(v) as TermNumber)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Year:</span>
            <Select value={currentYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pupils..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Pupil Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 mb-4" />
              <div className="h-8 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredPupils.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No pupils found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Try adjusting your search or filters." : "Click 'Add Pupil' to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {pupilsGrouped.map((group) => (
            <div key={group.gradeName} className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-foreground">{group.gradeName}</h3>
                <Badge variant="secondary">{group.pupils.length} pupils</Badge>
                <div className="flex-1 h-px bg-border"></div>
                <div className="text-sm text-muted-foreground">
                  Outstanding: ZMW {group.pupils.reduce((sum, p) => sum + p.balance, 0).toLocaleString()}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.pupils.map((pupil) => (
                  <button
                    key={pupil.id}
                    onClick={() => handlePupilClick(pupil)}
                    className="text-left bg-card border rounded-lg p-4 hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {pupil.full_name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {pupil.parents?.full_name || "No parent"}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(getRiskColor(pupil.riskLevel))}>
                        {getRiskLabel(pupil.riskLevel)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Risk Score</span>
                        <span className={cn(
                          "font-medium",
                          pupil.riskLevel === "critical" ? "text-red-600" :
                          pupil.riskLevel === "high" ? "text-orange-600" :
                          pupil.riskLevel === "medium" ? "text-yellow-600" : "text-green-600"
                        )}>
                          {pupil.riskScore}/100
                        </span>
                      </div>
                      <Progress 
                        value={pupil.riskScore} 
                        className="h-2"
                      />
                      
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Balance</span>
                        <span className={cn(
                          "font-medium",
                          pupil.balance > 0 ? "text-red-600" : "text-green-600"
                        )}>
                          ZMW {pupil.balance.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Lifetime Paid</span>
                        <span className="font-medium text-green-600">
                          ZMW {pupil.lifetimePaid.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <Badge variant={pupil.status === "active" ? "default" : "secondary"}>
                        {pupil.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Slide Panel */}
      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedPupil && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  {selectedPupil.full_name}
                  <Badge variant="outline" className={cn(getRiskColor(selectedPupil.riskLevel))}>
                    {getRiskLabel(selectedPupil.riskLevel)}
                  </Badge>
                </SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6">
                {/* Profile Section */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Profile</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Grade</span>
                      <span>{selectedPupil.grades?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parent</span>
                      <span>{selectedPupil.parents?.full_name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parent Phone</span>
                      <span>{selectedPupil.parents?.phone_number || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={selectedPupil.status === "active" ? "default" : "secondary"}>
                        {selectedPupil.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Added</span>
                      <span>{format(new Date(selectedPupil.created_at), "dd MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Financial Summary */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Financial Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Expected (Term {currentTerm})</div>
                      <div className="text-lg font-semibold">ZMW {selectedPupil.expected.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-green-600">Paid</div>
                      <div className="text-lg font-semibold text-green-700">ZMW {selectedPupil.paid.toLocaleString()}</div>
                    </div>
                    <div className={cn(
                      "rounded-lg p-3",
                      selectedPupil.balance > 0 ? "bg-red-50" : "bg-green-50"
                    )}>
                      <div className={cn(
                        "text-xs",
                        selectedPupil.balance > 0 ? "text-red-600" : "text-green-600"
                      )}>Balance</div>
                      <div className={cn(
                        "text-lg font-semibold",
                        selectedPupil.balance > 0 ? "text-red-700" : "text-green-700"
                      )}>
                        ZMW {selectedPupil.balance.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600">Lifetime Paid</div>
                      <div className="text-lg font-semibold text-blue-700">
                        ZMW {selectedPupil.lifetimePaid.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Risk Analysis */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Risk Analysis</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Risk Score</span>
                        <span className={cn(
                          "font-medium",
                          selectedPupil.riskLevel === "critical" ? "text-red-600" :
                          selectedPupil.riskLevel === "high" ? "text-orange-600" :
                          selectedPupil.riskLevel === "medium" ? "text-yellow-600" : "text-green-600"
                        )}>
                          {selectedPupil.riskScore}/100
                        </span>
                      </div>
                      <Progress value={selectedPupil.riskScore} className="h-2" />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Count</span>
                        <span>{selectedPupil.paymentCount} payments</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Payment</span>
                        <span>
                          {selectedPupil.lastPaymentDate 
                            ? format(selectedPupil.lastPaymentDate, "dd MMM yyyy")
                            : "Never"
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Days Since Payment</span>
                        <span>
                          {selectedPupil.lastPaymentDate
                            ? `${differenceInDays(new Date(), selectedPupil.lastPaymentDate)} days`
                            : "N/A"
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Action Center */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Actions</h4>
                  <div className="space-y-2">
                    <Button className="w-full" variant="outline">
                      View Payment History
                    </Button>
                    <Button className="w-full" variant="outline">
                      Record Payment
                    </Button>
                    <Button className="w-full" variant="outline">
                      Edit Pupil
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
