import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, AlertTriangle, GraduationCap, Database, RefreshCw } from "lucide-react";
import { getDashboardStats } from "@/services/fees";
import { getGradeCounts } from "@/services/grades";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    totalPupils: 0, 
    admittedPupils: 0,
    newPupils: 0,
    totalCollected: 0, 
    totalOutstanding: 0,
    totalExpected: 0
  });
  const [gradeCounts, setGradeCounts] = useState<{ id: string; name: string; count: number }[]>([]);
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
        const [s, counts] = await Promise.all([
          getDashboardStats().catch(err => {
            console.warn('Dashboard stats error:', err);
            return { 
              totalPupils: 0, 
              admittedPupils: 0, 
              newPupils: 0, 
              totalCollected: 0, 
              totalOutstanding: 0,
              totalExpected: 0
            };
          }),
          getGradeCounts().catch(err => {
            console.warn('Grade counts error:', err);
            return [];
          }),
        ]);
        
        setStats(s);
        setGradeCounts(counts);
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

  const schoolFeesCards = [
    { 
      label: "Total Pupils", 
      value: stats.totalPupils, 
      icon: Users, 
      color: "text-primary",
      detail: `${stats.admittedPupils} admitted, ${stats.newPupils} new`
    },
    { label: "Total Expected", value: `ZMW ${(stats as any).schoolFeesExpected?.toLocaleString() || '0'}`, icon: DollarSign, color: "text-blue-500", detail: undefined },
    { label: "Total Collected", value: `ZMW ${(stats as any).schoolFeesCollected?.toLocaleString() || '0'}`, icon: DollarSign, color: "text-success", detail: undefined },
    { label: "Outstanding", value: `ZMW ${(stats as any).schoolFeesOutstanding?.toLocaleString() || '0'}`, icon: AlertTriangle, color: "text-secondary", detail: undefined },
  ];

  const otherFeesCards = [
    { label: "Total Expected", value: `ZMW ${(stats as any).otherFeesExpected?.toLocaleString() || '0'}`, icon: DollarSign, color: "text-blue-500", detail: undefined },
    { label: "Total Collected", value: `ZMW ${(stats as any).otherFeesCollected?.toLocaleString() || '0'}`, icon: DollarSign, color: "text-success", detail: undefined },
    { label: "Outstanding", value: `ZMW ${(stats as any).otherFeesOutstanding?.toLocaleString() || '0'}`, icon: AlertTriangle, color: "text-secondary", detail: undefined },
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

      {/* School Fees Section */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4 text-primary">School Fees</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {schoolFeesCards.map((c) => (
            <div key={c.label} className="stat-card flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-accent ${c.color}`}>
                <c.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold font-heading">{c.value}</p>
                {c.detail && <p className="text-xs text-muted-foreground mt-1">{c.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other Fees Section */}
      <div className="mb-8">
        <h2 className="text-xl font-heading font-semibold mb-4 text-primary">Other Fees</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {otherFeesCards.map((c) => (
            <div key={c.label} className="stat-card flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-accent ${c.color}`}>
                <c.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold font-heading">{c.value}</p>
                {c.detail && <p className="text-xs text-muted-foreground mt-1">{c.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
}
