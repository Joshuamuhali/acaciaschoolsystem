import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Search, Users, ChevronRight, Phone, CreditCard, TrendingUp, Calendar, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddParentDialog from "@/components/AddParentDialog";
import { useParents } from "@/hooks/useParents";
import { usePayments } from "@/hooks/usePayments";
import { useFees } from "@/hooks/useFees";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { TermNumber } from "@/types/enums";

interface ParentWithFinancials {
  id: string;
  full_name: string;
  phone_number: string | null;
  account_number: string | null;
  created_at: string;
  pupils: Array<{
    id: string;
    full_name: string;
    grade_id: string | null;
    status: string;
  }> | null;
  totalChildren: number;
  activeChildren: number;
  combinedBalance: number;
  combinedExpected: number;
  combinedPaid: number;
  lifetimePaid: number;
  paymentCount: number;
  lastPaymentDate: Date | null;
  consistencyScore: number;
  paymentTrend: "improving" | "stable" | "declining" | "none";
}

export default function Parents() {
  const [search, setSearch] = useState("");
  const [selectedParent, setSelectedParent] = useState<ParentWithFinancials | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<TermNumber>(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const { data: parents, isLoading: parentsLoading, error: parentsError } = useParents();
  const { data: payments, isLoading: paymentsLoading, error: paymentsError } = usePayments();
  const { data: fees, isLoading: feesLoading, error: feesError } = useFees();

  const currentYear = selectedYear;
  const currentTerm: TermNumber = selectedTerm;

  const parentsWithFinancials = useMemo((): ParentWithFinancials[] => {
    if (!parents) return [];
    
    return parents.map((parent) => {
      const children = parent.pupils || [];
      const activeChildren = children.filter(c => c.status === "active").length;
      
      let combinedExpected = 0;
      let combinedPaid = 0;
      let lifetimePaid = 0;
      
      // Calculate per child
      for (const child of children) {
        const childFees = fees?.filter(f => 
          f.grade_id === child.grade_id && 
          f.term_number === currentTerm && 
          f.year === currentYear
        ) || [];
        const expected = childFees.reduce((sum, f) => sum + Number(f.amount), 0);
        combinedExpected += expected;
        
        const childPaymentsAll = payments?.filter(p => p.pupil_id === child.id) || [];
        const childPaymentsTerm = childPaymentsAll.filter(p => p.term_number === currentTerm && p.year === currentYear);
        const paidThisTerm = childPaymentsTerm.reduce((sum, p) => sum + Number(p.amount_paid), 0);
        combinedPaid += paidThisTerm;
        lifetimePaid += childPaymentsAll.reduce((sum, p) => sum + Number(p.amount_paid), 0);
      }
      
      const combinedBalance = combinedExpected - combinedPaid;
      
      // Calculate payment trend
      const allPayments = (payments || []).filter(p => 
        children.some(c => c.id === p.pupil_id)
      ).sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
      
      const paymentCount = allPayments.length;
      const lastPayment = allPayments.length > 0 
        ? allPayments[allPayments.length - 1] 
        : null;
      
      // Calculate consistency score (0-100)
      let consistencyScore = 0;
      if (paymentCount > 0) {
        consistencyScore = Math.min(100, (paymentCount / Math.max(1, children.length * 2)) * 50);
        if (combinedBalance <= 0) consistencyScore += 50;
        else if (combinedBalance < combinedExpected * 0.5) consistencyScore += 25;
      }
      
      // Determine trend
      let paymentTrend: "improving" | "stable" | "declining" | "none" = "none";
      if (paymentCount >= 3) {
        const recent = allPayments.slice(-3);
        const amounts = recent.map(p => Number(p.amount_paid));
        if (amounts[2] > amounts[0]) paymentTrend = "improving";
        else if (amounts[2] < amounts[0]) paymentTrend = "declining";
        else paymentTrend = "stable";
      }
      
      return {
        ...parent,
        totalChildren: children.length,
        activeChildren,
        combinedBalance,
        combinedExpected,
        combinedPaid,
        lifetimePaid,
        paymentCount,
        lastPaymentDate: lastPayment ? new Date(lastPayment.payment_date) : null,
        consistencyScore: Math.round(consistencyScore),
        paymentTrend,
      };
    });
  }, [parents, fees, payments, currentTerm, currentYear]);

  const isLoading = parentsLoading || paymentsLoading || feesLoading;
  const error = parentsError || paymentsError || feesError;

  const filteredParents = useMemo(() => {
    if (!search) return parentsWithFinancials;
    const term = search.toLowerCase();
    return parentsWithFinancials.filter(p => 
      p.full_name.toLowerCase().includes(term) ||
      p.phone_number?.toLowerCase().includes(term) ||
      p.pupils?.some(child => child.full_name.toLowerCase().includes(term))
    );
  }, [parentsWithFinancials, search]);

  const handleParentClick = (parent: ParentWithFinancials) => {
    setSelectedParent(parent);
    setIsPanelOpen(true);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining": return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      case "stable": return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "improving": return "Improving";
      case "declining": return "Declining";
      case "stable": return "Stable";
      default: return "No data";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Parents" 
        description="Manage parent accounts and family financial overview" 
        actions={<AddParentDialog />} 
      />

      {error && (
        <div className="bg-card border rounded-lg p-4 text-sm text-red-700">
          {(error as any)?.message || "Failed to load data"}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
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
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Parents</div>
          <div className="text-2xl font-bold">{parentsWithFinancials.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Active Families</div>
          <div className="text-2xl font-bold text-green-600">
            {parentsWithFinancials.filter(p => p.activeChildren > 0).length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Outstanding</div>
          <div className="text-2xl font-bold text-red-600">
            ZMW {parentsWithFinancials.reduce((sum, p) => sum + p.combinedBalance, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Collected</div>
          <div className="text-2xl font-bold text-green-600">
            ZMW {parentsWithFinancials.reduce((sum, p) => sum + p.combinedPaid, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search parents or children..." 
          className="pl-9" 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      {/* Parent Cards Grid */}
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
      ) : filteredParents.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No parents found.</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? "Try adjusting your search." : "Click 'Add Parent' to get started."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParents.map((parent) => (
            <button
              key={parent.id}
              onClick={() => handleParentClick(parent)}
              className="text-left bg-card border rounded-lg p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {parent.full_name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Phone className="h-3 w-3" />
                    {parent.phone_number || "No phone"}
                  </div>
                </div>
                <Badge variant={parent.combinedBalance > 0 ? "destructive" : "default"}>
                  {parent.combinedBalance > 0 ? "Balance Due" : "Paid Up"}
                </Badge>
              </div>
              
              {/* Children Info */}
              <div className="flex items-center gap-2 mb-3">
                <Baby className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {parent.totalChildren} child{parent.totalChildren !== 1 ? "ren" : ""}
                  {parent.activeChildren > 0 && (
                    <span className="text-muted-foreground"> ({parent.activeChildren} active)</span>
                  )}
                </span>
              </div>
              
              {/* Financial Summary */}
              <div className="space-y-2 pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Combined Balance</span>
                  <span className={cn(
                    "font-medium",
                    parent.combinedBalance > 0 ? "text-red-600" : "text-green-600"
                  )}>
                    ZMW {parent.combinedBalance.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lifetime Paid</span>
                  <span className="font-medium text-green-600">
                    ZMW {parent.lifetimePaid.toLocaleString()}
                  </span>
                </div>
                
                {/* Consistency Score */}
                <div className="pt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Payment Consistency</span>
                    <span className="font-medium">{parent.consistencyScore}/100</span>
                  </div>
                  <Progress value={parent.consistencyScore} className="h-1.5" />
                </div>
              </div>
              
              {/* Trend & Last Payment */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-1 text-sm">
                  {getTrendIcon(parent.paymentTrend)}
                  <span className="text-muted-foreground">{getTrendLabel(parent.paymentTrend)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {parent.lastPaymentDate 
                    ? `Last: ${format(parent.lastPaymentDate, "dd MMM")}`
                    : "No payments"
                  }
                </div>
              </div>
              
              <ChevronRight className="h-4 w-4 text-muted-foreground mt-2 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Detail Slide Panel */}
      <Sheet open={isPanelOpen} onOpenChange={setIsPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedParent && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle>{selectedParent.full_name}</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-6">
                {/* Contact Info */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone</span>
                      <span>{selectedParent.phone_number || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number</span>
                      <span>{selectedParent.account_number || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Registered</span>
                      <span>{format(new Date(selectedParent.created_at), "dd MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Children Section */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Children ({selectedParent.totalChildren})
                  </h4>
                  <div className="space-y-2">
                    {selectedParent.pupils?.map((child) => (
                      <div key={child.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div>
                          <span className="font-medium">{child.full_name}</span>
                          <Badge variant={child.status === "active" ? "default" : "secondary"} className="ml-2">
                            {child.status}
                          </Badge>
                        </div>
                      </div>
                    )) || <p className="text-sm text-muted-foreground">No children linked</p>}
                  </div>
                </div>
                
                <Separator />
                
                {/* Financial Overview */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Family Financial Overview</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">Expected (Term {currentTerm})</div>
                      <div className="text-lg font-semibold">ZMW {selectedParent.combinedExpected.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-green-600">Paid</div>
                      <div className="text-lg font-semibold text-green-700">ZMW {selectedParent.combinedPaid.toLocaleString()}</div>
                    </div>
                    <div className={cn(
                      "rounded-lg p-3",
                      selectedParent.combinedBalance > 0 ? "bg-red-50" : "bg-green-50"
                    )}>
                      <div className={cn(
                        "text-xs",
                        selectedParent.combinedBalance > 0 ? "text-red-600" : "text-green-600"
                      )}>Balance</div>
                      <div className={cn(
                        "text-lg font-semibold",
                        selectedParent.combinedBalance > 0 ? "text-red-700" : "text-green-700"
                      )}>
                        ZMW {selectedParent.combinedBalance.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs text-blue-600">Lifetime Paid</div>
                      <div className="text-lg font-semibold text-blue-700">
                        ZMW {selectedParent.lifetimePaid.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Payment Behavior */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Payment Behavior</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Consistency Score</span>
                        <span className="font-medium">{selectedParent.consistencyScore}/100</span>
                      </div>
                      <Progress value={selectedParent.consistencyScore} className="h-2" />
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Payments</span>
                        <span>{selectedParent.paymentCount} payments</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Trend</span>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(selectedParent.paymentTrend)}
                          <span>{getTrendLabel(selectedParent.paymentTrend)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Payment</span>
                        <span>
                          {selectedParent.lastPaymentDate 
                            ? format(selectedParent.lastPaymentDate, "dd MMM yyyy")
                            : "Never"
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Days Since Payment</span>
                        <span>
                          {selectedParent.lastPaymentDate
                            ? `${differenceInDays(new Date(), selectedParent.lastPaymentDate)} days`
                            : "N/A"
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Actions */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Actions</h4>
                  <div className="space-y-2">
                    <Button className="w-full" variant="outline">
                      View Family Payment History
                    </Button>
                    <Button className="w-full" variant="outline">
                      Record Payment
                    </Button>
                    <Button className="w-full" variant="outline">
                      Edit Parent
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
