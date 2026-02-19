import StatCard from "@/components/StatCard";
import PageHeader from "@/components/PageHeader";
import { GraduationCap, DollarSign, AlertTriangle, TrendingUp, Users, Shield, Settings, Eye, EyeOff, Lock } from "lucide-react";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { PermissionGuard } from "@/components/PermissionGuard";
import { usePupils } from "@/hooks/usePupils";
import { useFees } from "@/hooks/useFees";
import { usePayments } from "@/hooks/usePayments";
import { useGrades } from "@/hooks/useGrades";
import { useParents } from "@/hooks/useParents";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const {
    canReadUsers,
    canReadPupils,
    canReadParents,
    canReadPayments,
    canReadFees,
    canReadAuditLogs,
    canManageSettings,
    canAccessAdminPanel,
    canManageUsers,
    canManageFinancials,
    canPerformSystemActions,
    isAuthenticated,
    loading
  } = useAuthWithPermissions();

  const { data: pupils } = usePupils();
  const { data: fees } = useFees();
  const { data: payments } = usePayments();
  const { data: grades } = useGrades();
  const { data: parents } = useParents();

  const currentYear = new Date().getFullYear();
  const currentTerm = 1;

  // Calculate statistics based on user permissions
  const getDashboardStats = () => {
    const stats = {
      totalPupils: 0,
      totalParents: 0,
      totalExpected: 0,
      totalCollected: 0,
      outstandingBalance: 0,
      pendingApprovals: 0,
      lockedTerms: 0,
      totalFees: 0,
      recentActivity: []
    };

    if (canReadPupils) {
      stats.totalPupils = pupils?.filter(p => p.status === "active").length ?? 0;
    }

    if (canReadParents) {
      stats.totalParents = parents?.length ?? 0;
    }

    if (canReadFees) {
      stats.totalExpected = (fees ?? [])
        .filter(f => f.is_active)
        .reduce((sum, f) => {
          const count = (pupils ?? []).filter(p => p.grade_id === f.grade_id && p.status === "active").length;
          return sum + count * Number(f.amount);
        }, 0);
    }

    if (canReadPayments) {
      stats.totalCollected = (payments ?? [])
        .filter(p => !p.is_deleted && p.term_number === currentTerm && p.year === currentYear)
        .reduce((sum, p) => sum + Number(p.amount_paid), 0);
      
      stats.pendingApprovals = payments?.filter(p => p.is_deleted).length ?? 0;
      stats.recentActivity = payments?.slice(0, 5).reverse() ?? [];
    }

    stats.outstandingBalance = stats.totalExpected - stats.totalCollected;

    return stats;
  };

  const stats = getDashboardStats();

  // Role-based quick actions
  const getQuickActions = () => {
    const actions = [];

    if (canManageUsers) {
      actions.push({
        label: "User Management",
        icon: Users,
        path: "/dashboard/admin/users",
        description: "Manage users and roles"
      });
    }

    if (canManageFinancials) {
      actions.push({
        label: "Fee Management",
        icon: DollarSign,
        path: "/dashboard/admin/fees",
        description: "Manage fee structures"
      });
    }

    if (canPerformSystemActions) {
      actions.push({
        label: "System Settings",
        icon: Settings,
        path: "/dashboard/admin/school",
        description: "System configuration"
      });
    }

    if (canReadAuditLogs) {
      actions.push({
        label: "Audit Logs",
        icon: Shield,
        path: "/dashboard/admin/audit",
        description: "View system activity"
      });
    }

    return actions;
  };

  const quickActions = getQuickActions();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">Authentication Required</p>
          <p className="text-sm text-muted-foreground">Please sign in to access the dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Dashboard" description="Overview of school operations" />

      {/* Role-based Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canReadPupils && (
          <StatCard 
            title="Total Pupils" 
            value={stats.totalPupils} 
            subtitle="Across all grades" 
            icon={<GraduationCap className="h-5 w-5" />} 
          />
        )}
        
        {canReadParents && (
          <StatCard 
            title="Total Parents" 
            value={stats.totalParents} 
            subtitle="Registered parents" 
            icon={<Users className="h-5 w-5" />} 
          />
        )}
        
        {canReadFees && (
          <StatCard 
            title="Total Expected" 
            value={`K${stats.totalExpected.toFixed(2)}`} 
            subtitle={`Term ${currentTerm}, ${currentYear}`} 
            icon={<TrendingUp className="h-5 w-5" />} 
            variant="default"
          />
        )}
        
        {canReadPayments && (
          <StatCard 
            title="Total Collected" 
            value={`K${stats.totalCollected.toFixed(2)}`} 
            subtitle={`Term ${currentTerm}, ${currentYear}`} 
            icon={<DollarSign className="h-5 w-5" />} 
            variant="success" 
          />
        )}
        
        {canReadPayments && (
          <StatCard 
            title="Outstanding Balance" 
            value={`K${stats.outstandingBalance.toFixed(2)}`} 
            subtitle="Pending payments" 
            icon={<AlertTriangle className="h-5 w-5" />} 
            variant="warning" 
          />
        )}
      </div>

      {/* Role-based Quick Actions */}
      {quickActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.path}
                  className="flex items-start space-x-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`p-2 rounded-lg bg-muted ${canAccessAdminPanel ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{action.label}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role-based Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pupils Section */}
        {canReadPupils && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Pupils Overview
                </span>
                {canManageUsers && (
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Pupils</span>
                  <Badge variant="default">{stats.totalPupils}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">By Grade:</span>
                    {grades?.map((grade) => (
                      <span key={grade.id} className="px-2 py-1 bg-muted rounded text-xs">
                        {grade.name}: {pupils?.filter(p => p.grade_id === grade.id && p.status === 'active').length || 0}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parents Section */}
        {canReadParents && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Parents Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Parents</span>
                  <Badge variant="default">{stats.totalParents}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {stats.totalParents > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Active Accounts:</span>
                        <span>{stats.totalParents}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Overview (Admin/Director) */}
        {(canManageFinancials || canReadPayments) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Overview
                {canManageFinancials && (
                  <Badge className="bg-green-100 text-green-800">Admin</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Total Expected</span>
                  <div className="text-2xl font-bold text-primary">
                    K{stats.totalExpected.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Collected</span>
                  <div className="text-2xl font-bold text-green-600">
                    K{stats.totalCollected.toFixed(2)}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Outstanding</span>
                  <div className="text-2xl font-bold text-orange-600">
                    K{stats.outstandingBalance.toFixed(2)}
                  </div>
                </div>
              </div>
              
              {canManageFinancials && stats.pendingApprovals > 0 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">
                      {stats.pendingApprovals} pending payment deletions
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audit Logs (Director/SuperAdmin only) */}
        {canReadAuditLogs && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentActivity.length > 0 ? (
                  stats.recentActivity.map((activity: any) => (
                    <div key={activity.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-foreground">
                          {activity.pupils?.full_name || 'Unknown'}
                        </span>
                        <span className="text-muted-foreground ml-2">
                          Term {activity.term_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-primary font-medium">
                          K{Number(activity.amount_paid).toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(activity.payment_date), "dd MMM")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-text">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Settings (SuperAdmin only) */}
        {canManageSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">System Health</span>
                  <Badge className="bg-green-100 text-green-800">Operational</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Database:</span>
                    <span className="text-green-600">Connected</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>API:</span>
                    <span className="text-green-600">Active</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Auth:</span>
                    <span className="text-green-600">Working</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
