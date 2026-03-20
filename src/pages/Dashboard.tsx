import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, AlertTriangle, GraduationCap, Database } from "lucide-react";
import { useDashboardData } from "@/hooks/data/useDashboardData";
import { useDataSource } from "@/context/DataSourceContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";

// Simple skeleton components
const SkeletonStatsCard = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
    </CardContent>
  </Card>
);

const SkeletonCard = ({ children }: { children?: React.ReactNode }) => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        {children}
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { getCurrentUser, isAuthenticated } = useAuth();
  const { source } = useDataSource();
  
  // Use the new dashboard data hook
  const {
    stats,
    gradeCounts,
    installments,
    feeTypeStats,
    otherFeesBreakdown,
    transportStats,
    loading,
    error,
    reload
  } = useDashboardData();

  const [selectedFeeType, setSelectedFeeType] = useState<string | null>(null);
  const [selectedGradeScope, setSelectedGradeScope] = useState<'all' | string>('all');
  const [feePreviewData, setFeePreviewData] = useState<any>({ records: [], summary: null });
  const [availableFeeTypes, setAvailableFeeTypes] = useState<string[]>([]);
  const [selectedTransportGrade, setSelectedTransportGrade] = useState<string>('all');
  const [selectedTransportRoute, setSelectedTransportRoute] = useState<string>('all');

  // Set available fee types when data loads
  useEffect(() => {
    if (feeTypeStats.length > 0) {
      setAvailableFeeTypes(feeTypeStats.map(stat => stat.name));
    }
  }, [feeTypeStats]);

  // Calculate percentages for progress bars
  const schoolFeesPercentage = stats?.schoolFeesExpected > 0 ? (stats.schoolFeesCollected / stats.schoolFeesExpected) * 100 : 0;
  const totalFeesPercentage = stats?.totalExpected > 0 ? (stats.totalCollected / stats.totalExpected) * 100 : 0;

  // Load fee preview data when selectors change
  useEffect(() => {
    const loadFeePreview = async () => {
      if (!selectedFeeType) {
        setFeePreviewData({ records: [], summary: null });
        return;
      }

      try {
        // For now, we'll use the fee type stats to create preview data
        // This can be enhanced later with proper preview functionality
        const relevantStats = feeTypeStats.filter(stat => 
          selectedFeeType === 'all' || stat.name === selectedFeeType
        );
        
        const records = installments.slice(0, 10).filter(payment => 
          selectedFeeType === 'all' || payment.payment_method === selectedFeeType
        );

        setFeePreviewData({ 
          records, 
          summary: relevantStats.length > 0 ? relevantStats[0] : null 
        });
      } catch (error) {
        console.error('Error loading fee preview data:', error);
        setFeePreviewData({ records: [], summary: null });
      }
    };

    loadFeePreview();
  }, [selectedFeeType, selectedGradeScope]);

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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </div>

        {/* Collection Progress Skeleton */}
        <SkeletonCard />

        {/* Other Fees Analytics Skeleton */}
        <SkeletonCard />

        {/* Quick Actions Skeleton */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <h3 className="text-lg font-semibold mb-2">Data Loading Error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()} className="w-full">
                Retry Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const collectionRate = stats?.totalExpected > 0 ? (stats?.totalCollected / stats?.totalExpected) * 100 : 0;

  const displayStats = {
    expected: stats?.totalExpected || 0,
    collected: stats?.totalCollected || 0,
    outstanding: stats?.totalOutstanding || 0,
    label: 'All fees expected'
  };

  // Debug: Log what the dashboard is actually displaying
  console.log("Dashboard displayStats:", displayStats);
  console.log("Raw stats from API:", stats);

  const displayCollectionRate = displayStats.expected > 0 ? (displayStats.collected / displayStats.expected) * 100 : 0;

  // Compute filtered transport stats inline
  const getFilteredTransportStats = () => {
    const stats = transportStats || { totalPupils: 0, totalExpected: 0, totalCollected: 0, totalOutstanding: 0, routeBreakdown: [] };
    const routes = stats.routeBreakdown || [];

    // Filter routes based on selections
    const filteredRoutes = routes.filter((route: any) => {
      if (selectedTransportRoute !== 'all' && route.region !== selectedTransportRoute) {
        return false;
      }
      return true;
    });

    // Calculate totals from filtered routes
    const totalPupils = filteredRoutes.reduce((sum: number, route: any) => sum + (route.pupils || 0), 0);
    const totalExpected = filteredRoutes.reduce((sum: number, route: any) => sum + (route.expected || 0), 0);
    const totalCollected = filteredRoutes.reduce((sum: number, route: any) => sum + (route.collected || 0), 0);
    const totalOutstanding = totalExpected - totalCollected;

    return {
      totalPupils: selectedTransportRoute === 'all' ? stats.totalPupils : totalPupils,
      totalExpected: selectedTransportRoute === 'all' ? stats.totalExpected : totalExpected,
      totalCollected: selectedTransportRoute === 'all' ? stats.totalCollected : totalCollected,
      totalOutstanding: selectedTransportRoute === 'all' ? stats.totalOutstanding : totalOutstanding,
      routeBreakdown: filteredRoutes
    };
  };

  const filteredTransportStats = getFilteredTransportStats();

  // Get user info for welcome message
  const user = getCurrentUser();
  const getRoleGreeting = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'administrator':
      case 'director':
        return 'Welcome Director';
      case 'teacher':
        return 'Welcome Teacher';
      case 'parent':
        return 'Welcome Parent';
      case 'student':
        return 'Welcome Student';
      default:
        return 'Welcome';
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
      case 'administrator':
      case 'director':
        return 'bg-red-100 text-red-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      case 'parent':
        return 'bg-green-100 text-green-800';
      case 'student':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">{getRoleGreeting(user?.role)}</h2>
              <p className="text-emerald-100">Welcome to the Acacia Country School Management Portal</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-emerald-100">Logged in as</p>
                <p className="font-semibold">{user?.fullName || user?.email || 'User'}</p>
              </div>
              <Badge className={`${getRoleBadgeColor(user?.role)} text-white border-0`}>
                {user?.role || 'User'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">School management overview</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pupils</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPupils || 0}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZMW {displayStats.expected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{displayStats.label}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZMW {displayStats.collected.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Amount collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">ZMW {displayStats.outstanding.toLocaleString()}</div>
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
              <span>{displayCollectionRate.toFixed(1)}%</span>
            </div>
            <Progress value={displayCollectionRate} className="w-full" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
