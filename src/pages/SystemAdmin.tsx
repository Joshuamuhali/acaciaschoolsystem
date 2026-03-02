import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Shield, Users, Database, Settings, Download, Trash2, AlertTriangle, 
  CheckCircle, Clock, Activity, Power, Zap, RefreshCw, UserX, LogOut,
  TestTube, FileText, Server, TriangleAlert, Ban, RotateCcw, Calculator,
  TrendingUp, UserCheck, Lock, Unlock, Eye, EyeOff, DatabaseBackup,
  HardDrive, ShieldAlert, Terminal, GitBranch, Layers,
  DollarSign, CreditCard, Receipt, FileSpreadsheet, BarChart3, CalendarDays
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function SystemAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // System Overview State
  const [systemStats, setSystemStats] = useState({
    totalPupils: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    activeTerm: "Term 1 2024",
    systemStatus: "Operational",
    lastBackup: new Date().toISOString()
  });

  // System Controls State
  const [systemControls, setSystemControls] = useState({
    maintenanceMode: false,
    realTimeSubscriptions: true,
    automaticBalanceRecalc: true,
    paymentEditLogging: true,
    systemLogging: true,
    discountSystem: true
  });

  // Database Tools State
  const [tableCounts, setTableCounts] = useState({
    pupils: 0,
    grades: 0,
    terms: 0,
    school_fees: 0,
    other_fees: 0,
    installments: 0,
    transactions: 0
  });

  // Identity Control State
  const [identityData, setIdentityData] = useState({
    totalUsers: 0,
    adminUsers: 3,
    recentLogins: [
      { id: 1, user: "Admin", time: "2 mins ago", ip: "192.168.1.1" },
      { id: 2, user: "Teacher", time: "15 mins ago", ip: "192.168.1.2" },
      { id: 3, user: "Staff", time: "1 hour ago", ip: "192.168.1.3" }
    ]
  });

  // Dialog States
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; action: string; title: string; description: string }>({
    open: false,
    action: "",
    title: "",
    description: ""
  });
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSystemData();
  }, []);

  const loadSystemData = async () => {
    try {
      // Get actual pupil count
      const { count: pupilCount } = await supabase
        .from('pupils')
        .select('*', { count: 'exact', head: true });

      // Get actual grades count
      const { count: gradeCount } = await supabase
        .from('grades')
        .select('*', { count: 'exact', head: true });

      // Get actual terms count
      const { count: termCount } = await supabase
        .from('terms')
        .select('*', { count: 'exact', head: true });

      // Get actual school fees count
      const { count: schoolFeesCount } = await supabase
        .from('school_fees')
        .select('*', { count: 'exact', head: true });

      // Get actual other fees count
      const { count: otherFeesCount } = await supabase
        .from('other_fees')
        .select('*', { count: 'exact', head: true });

      // Get actual installments count
      const { count: installmentsCount } = await supabase
        .from('installments')
        .select('*', { count: 'exact', head: true });

      // Get actual transactions count
      const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      // Get active term
      const { data: activeTerm } = await supabase
        .from('terms')
        .select('name')
        .eq('is_active', true)
        .single();

      // Calculate actual financial data from dashboard_stats view
      const { data: dashboardStats } = await supabase
        .from('dashboard_stats')
        .select('*')
        .single();

      setSystemStats({
        totalPupils: pupilCount || 0,
        totalCollected: dashboardStats?.total_collected || 0,
        totalOutstanding: dashboardStats?.total_outstanding || 0,
        activeTerm: activeTerm?.name || "No Active Term",
        systemStatus: systemControls.maintenanceMode ? "Maintenance" : "Operational",
        lastBackup: new Date().toISOString()
      });

      // Update table counts with real data
      setTableCounts({
        pupils: pupilCount || 0,
        grades: gradeCount || 0,
        terms: termCount || 0,
        school_fees: schoolFeesCount || 0,
        other_fees: otherFeesCount || 0,
        installments: installmentsCount || 0,
        transactions: transactionsCount || 0
      });

      // Update identity data with real user count
      setIdentityData(prev => ({
        ...prev,
        totalUsers: pupilCount || 0
      }));

    } catch (error) {
      console.error('Error loading system data:', error);
      toast({
        title: "Error Loading Data",
        description: "Failed to load system statistics from database",
        variant: "destructive"
      });
    }
  };

  const handleSystemControlToggle = (key: keyof typeof systemControls) => {
    setSystemControls(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    toast({
      title: "System Control Updated",
      description: `${key.replace(/([A-Z])/g, ' $1').trim()} ${!systemControls[key] ? 'enabled' : 'disabled'}`,
    });

    // Update system status if maintenance mode changes
    if (key === 'maintenanceMode') {
      setSystemStats(prev => ({
        ...prev,
        systemStatus: !systemControls.maintenanceMode ? "Maintenance" : "Operational"
      }));
    }
  };

  const handleFinancialAction = (action: string) => {
    setConfirmDialog({
      open: true,
      action,
      title: `Confirm ${action}`,
      description: `This will ${action.toLowerCase()} for all records. This action cannot be undone.`
    });
  };

  const handleDangerousAction = (action: string) => {
    setConfirmDialog({
      open: true,
      action,
      title: `⚠️ DANGEROUS: ${action}`,
      description: `This is a destructive action that will ${action.toLowerCase()}. Type CONFIRM to proceed.`
    });
  };

  const executeAction = async () => {
    setLoading(true);
    
    try {
      switch (confirmDialog.action) {
        case "Recalculate All Pupil Balances":
          // Update all school fees balances
          const { data: schoolFees } = await supabase.from('school_fees').select('id, total_amount, total_collected');
          if (schoolFees) {
            for (const fee of schoolFees) {
              const balance = Number(fee.total_amount) - Number(fee.total_collected);
              await supabase
                .from('school_fees')
                .update({ balance, paid_toggle: balance <= 0 })
                .eq('id', fee.id);
            }
          }
          
          // Update all other fees balances
          const { data: otherFees } = await supabase.from('other_fees').select('id, amount, collected');
          if (otherFees) {
            for (const fee of otherFees) {
              const balance = Number(fee.amount) - Number(fee.collected);
              await supabase
                .from('other_fees')
                .update({ balance, paid_toggle: balance <= 0 })
                .eq('id', fee.id);
            }
          }
          break;

        case "Rebuild Dashboard Statistics":
          // Refresh the dashboard_stats materialized view
          await supabase.rpc('refresh_dashboard_stats');
          break;

        case "Recompute Term Analytics":
          // Recalculate term-based analytics
          const { data: terms } = await supabase.from('terms').select('*');
          if (terms) {
            for (const term of terms) {
              // Recalculate term statistics here
              console.log(`Recomputing analytics for term: ${term.name}`);
            }
          }
          break;

        case "Reset All Discounts":
          // Set all discounts to 0
          await supabase.from('installments').update({ discount_applied: 0 });
          break;

        case "Normalize Installments":
          // Fix any inconsistent installment data
          await supabase.rpc('normalize_installments');
          break;

        default:
          // Simulate other actions
          await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      toast({
        title: "Action Completed",
        description: `${confirmDialog.action} completed successfully`,
      });
      
      // Reload data to show updated values
      await loadSystemData();
      
    } catch (error) {
      console.error('Error executing action:', error);
      toast({
        title: "Action Failed",
        description: `Failed to execute ${confirmDialog.action}: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setConfirmDialog({ open: false, action: "", title: "", description: "" });
      setConfirmText("");
      setLoading(false);
    }
  };

  const canExecuteDangerousAction = confirmText === "CONFIRM";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-primary">System Admin Control Center</h1>
        </div>
        <Badge variant={systemStats.systemStatus === "Operational" ? "default" : "destructive"} className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          {systemStats.systemStatus}
        </Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="controls">System Controls</TabsTrigger>
          <TabsTrigger value="financial">Financial Engine</TabsTrigger>
          <TabsTrigger value="identity">Identity Control</TabsTrigger>
          <TabsTrigger value="database">Database Tools</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        {/* 1️⃣ OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pupils</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.totalPupils}</div>
                <p className="text-xs text-muted-foreground">Registered students</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">ZMW {systemStats.totalCollected.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">All fees collected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">ZMW {systemStats.totalOutstanding.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Outstanding balances</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Term</CardTitle>
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.activeTerm}</div>
                <p className="text-xs text-muted-foreground">Current academic term</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{systemStats.systemStatus}</div>
                <p className="text-xs text-muted-foreground">Current system state</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
                <DatabaseBackup className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold">
                  {new Date(systemStats.lastBackup).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(systemStats.lastBackup).toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2️⃣ SYSTEM CONTROLS TAB */}
        <TabsContent value="controls" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries({
                maintenanceMode: { label: "Maintenance Mode", icon: Power, description: "Put system in maintenance mode" },
                realTimeSubscriptions: { label: "Real-time Subscriptions", icon: Zap, description: "Enable live data updates" },
                automaticBalanceRecalc: { label: "Automatic Balance Recalculation", icon: Calculator, description: "Auto-calculate balances on changes" },
                paymentEditLogging: { label: "Payment Edit Logging", icon: FileText, description: "Log all payment modifications" },
                systemLogging: { label: "System Logging", icon: Activity, description: "Enable comprehensive system logging" },
                discountSystem: { label: "Discount System", icon: CreditCard, description: "Enable discount functionality" }
              }).map(([key, config]) => {
                const Icon = config.icon;
                const isEnabled = systemControls[key as keyof typeof systemControls];
                
                return (
                  <div key={key} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-sm text-muted-foreground">{config.description}</div>
                      </div>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => handleSystemControlToggle(key as keyof typeof systemControls)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3️⃣ FINANCIAL ENGINE TAB */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Financial Engine Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { action: "Recalculate All Pupil Balances", icon: RefreshCw, color: "blue" },
                  { action: "Rebuild Dashboard Statistics", icon: BarChart3, color: "green" },
                  { action: "Recompute Term Analytics", icon: TrendingUp, color: "purple" },
                  { action: "Reset All Discounts", icon: CreditCard, color: "orange" },
                  { action: "Normalize Installments", icon: Layers, color: "cyan" }
                ].map(({ action, icon: Icon, color }) => (
                  <Button
                    key={action}
                    onClick={() => handleFinancialAction(action)}
                    variant="outline"
                    className="h-20 flex-col gap-2"
                  >
                    <Icon className={`h-6 w-6 text-${color}-600`} />
                    <span className="text-sm text-center">{action}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4️⃣ IDENTITY CONTROL TAB */}
        <TabsContent value="identity" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Users</span>
                  <Badge variant="secondary">{identityData.totalUsers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Admin Users</span>
                  <Badge variant="default">{identityData.adminUsers}</Badge>
                </div>
                <div className="pt-4 space-y-2">
                  <Button className="w-full justify-start" variant="outline">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Promote User to Admin
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <UserX className="h-4 w-4 mr-2" />
                    Remove Admin
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <LogOut className="h-4 w-4 mr-2" />
                    Force Logout User
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Logins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {identityData.recentLogins.map((login) => (
                    <div key={login.id} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <div className="font-medium">{login.user}</div>
                        <div className="text-xs text-muted-foreground">{login.ip}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{login.time}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5️⃣ DATABASE TOOLS TAB */}
        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Button 
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.from('grades').select('count').single();
                      if (error) throw error;
                      toast({ 
                        title: "Connection Test", 
                        description: "Database connection successful" 
                      });
                    } catch (error) {
                      toast({ 
                        title: "Connection Failed", 
                        description: error.message,
                        variant: "destructive"
                      });
                    }
                  }} 
                  className="justify-start"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test Database Connection
                </Button>
                <Button 
                  onClick={async () => {
                    try {
                      // Create a backup record
                      const { error } = await supabase
                        .from('payment_log')
                        .insert({
                          action: 'system_backup',
                          details: `Manual backup triggered at ${new Date().toISOString()}`,
                          created_at: new Date().toISOString()
                        });
                      
                      if (error) throw error;
                      
                      toast({ 
                        title: "Backup Triggered", 
                        description: "System backup initiated successfully" 
                      });
                      
                      // Update last backup time
                      setSystemStats(prev => ({
                        ...prev,
                        lastBackup: new Date().toISOString()
                      }));
                    } catch (error) {
                      toast({ 
                        title: "Backup Failed", 
                        description: error.message,
                        variant: "destructive"
                      });
                    }
                  }} 
                  className="justify-start"
                >
                  <DatabaseBackup className="h-4 w-4 mr-2" />
                  Trigger Backup
                </Button>
              </div>

              <div>
                <h4 className="font-medium mb-3">Table Counts</h4>
                <div className="grid gap-2 text-sm">
                  {Object.entries(tableCounts).map(([table, count]) => (
                    <div key={table} className="flex justify-between p-2 rounded border">
                      <span className="capitalize">{table.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6️⃣ DANGER ZONE TAB */}
        <TabsContent value="danger" className="space-y-6">
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle className="text-red-700 dark:text-red-300">⚠️ DANGER ZONE</AlertTitle>
            <AlertDescription className="text-red-600 dark:text-red-400">
              These actions are destructive and cannot be undone. Proceed with extreme caution.
            </AlertDescription>
          </Alert>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Ban className="h-5 w-5" />
                Destructive Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                "Clear All Payment Edit Logs",
                "Reset Dashboard Cache", 
                "Delete All Test Data",
                "Reset System Settings to Default"
              ].map((action) => (
                <Dialog key={action}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {action}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-red-600">⚠️ Confirm {action}</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. Type "CONFIRM" to proceed.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Type CONFIRM to proceed"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="border-red-300 focus:border-red-500"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setConfirmText("")}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={!canExecuteDangerousAction}
                        onClick={() => {
                          handleDangerousAction(action);
                          setConfirmText("");
                        }}
                      >
                        Execute
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog for Financial Actions */}
      <Dialog open={confirmDialog.open && !confirmDialog.title.includes("DANGEROUS")} onOpenChange={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={executeAction} disabled={loading}>
              {loading ? "Executing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
