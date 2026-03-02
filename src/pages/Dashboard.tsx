import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, AlertTriangle, GraduationCap, Database, RefreshCw } from "lucide-react";
import { getAccurateDashboardStats, getOtherFeesBreakdown, getFeeTypeStats, getInstallments } from "@/services/fees";
import { supabase } from "@/integrations/supabase/client";
import { getGradeCounts } from "@/services/grades";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SkeletonStatsCard, SkeletonCard, SkeletonChart } from "@/components/skeleton";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Dashboard state
  const [stats, setStats] = useState({
    totalPupils: 0,
    schoolFeesExpected: 0,
    schoolFeesCollected: 0,
    schoolFeesOutstanding: 0,
    otherFeesExpected: 0,
    otherFeesCollected: 0,
    otherFeesOutstanding: 0,
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0
  });
  const [gradeCounts, setGradeCounts] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [otherFeesBreakdown, setOtherFeesBreakdown] = useState<any>({ breakdown: [] });
  const [feeTypeStats, setFeeTypeStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        // First test Supabase connection
        const { data, error: connError } = await supabase.from('grades').select('id').limit(1);
        if (connError) {
          setConnectionStatus('error');
          throw new Error(`Database connection failed: ${connError.message}`);
        }
        setConnectionStatus('connected');

        // Load dashboard data
        const [s, counts, payments, otherFees, feeStats] = await Promise.all([
          getAccurateDashboardStats().catch(err => {
            console.warn('Dashboard stats error:', err);
            return { 
              totalPupils: 0, 
              schoolFeesExpected: 0,
              schoolFeesCollected: 0,
              schoolFeesOutstanding: 0,
              otherFeesExpected: 0,
              otherFeesCollected: 0,
              otherFeesOutstanding: 0,
              totalExpected: 0,
              totalCollected: 0,
              totalOutstanding: 0
            };
          }),
          getGradeCounts().catch(err => {
            console.warn('Grade counts error:', err);
            return [];
          }),
          getInstallments().catch(err => {
            console.warn('Installments error:', err);
            return [];
          }),
          getOtherFeesBreakdown().catch(err => {
            console.warn('Other fees breakdown error:', err);
            return { breakdown: [] };
          }),
          getFeeTypeStats().catch(err => {
            console.warn('Fee type stats error:', err);
            return [];
          })
        ]);
        
        setStats(s);
        setGradeCounts(counts);
        setPaymentHistory(payments);
        setOtherFeesBreakdown(otherFees);
        setFeeTypeStats(feeStats);
        setError(null);
      } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to load dashboard data';
        console.error('Dashboard error:', e);
        setError(errorMessage);
        setConnectionStatus('error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setLoading(true);
    setError(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            <div className="h-8 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </div>

        {/* Collection Progress Skeleton */}
        <SkeletonCard />

        {/* Quick Actions Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error && connectionStatus === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h3 className="text-lg font-semibold mb-2">Database Connection Error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const collectionRate = stats.totalExpected > 0 ? (stats.totalCollected / stats.totalExpected) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">School management overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pupils</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPupils}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZMW {stats.totalExpected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All fees expected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZMW {stats.totalCollected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Amount collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZMW {stats.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Balance remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Collection Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Collection Rate</span>
              <span>{collectionRate.toFixed(1)}%</span>
            </div>
            <Progress value={collectionRate} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Button onClick={() => navigate('/pupils')} className="h-20 flex-col">
          <Users className="h-6 w-6 mb-2" />
          Manage Pupils
        </Button>
        <Button onClick={() => navigate('/parents')} className="h-20 flex-col" variant="outline">
          <Users className="h-6 w-6 mb-2" />
          Manage Parents
        </Button>
        <Button onClick={() => navigate('/terms')} className="h-20 flex-col" variant="outline">
          <GraduationCap className="h-6 w-6 mb-2" />
          Manage Terms
        </Button>
        <Button onClick={() => navigate('/reports')} className="h-20 flex-col" variant="outline">
          <Database className="h-6 w-6 mb-2" />
          View Reports
        </Button>
      </div>
    </div>
  );
}
