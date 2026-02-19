import { Link } from "react-router-dom";
import StatCard from "@/components/StatCard";
import { 
  Users, 
  GraduationCap, 
  DollarSign, 
  AlertTriangle, 
  Shield, 
  Lock, 
  TrendingUp,
  Settings,
  FileText,
  CreditCard
} from "lucide-react";
import { useSystemStats } from "@/hooks/useSuperAdmin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function SuperAdminDashboard() {
  const { data: stats, isLoading } = useSystemStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const quickLinks = [
    { 
      label: "User Management", 
      icon: Users, 
      path: "/dashboard/admin/users",
      description: "Manage users and roles",
      color: "text-blue-600"
    },
    { 
      label: "Audit Logs", 
      icon: FileText, 
      path: "/dashboard/admin/audit",
      description: "View system activity",
      color: "text-purple-600"
    },
    { 
      label: "Fee Management", 
      icon: DollarSign, 
      path: "/dashboard/admin/fees",
      description: "Manage fees and terms",
      color: "text-green-600"
    },
    { 
      label: "Term Settings", 
      icon: Lock, 
      path: "/dashboard/admin/fees",
      description: "Lock/unlock terms",
      color: "text-orange-600"
    },
    { 
      label: "School Settings", 
      icon: Settings, 
      path: "/dashboard/admin/school",
      description: "Configure school",
      color: "text-gray-600"
    },
    { 
      label: "Emergency Overrides", 
      icon: Shield, 
      path: "/dashboard/admin/emergency",
      description: "System overrides",
      color: "text-red-600"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold font-display text-foreground">Super Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Full system control and overview for Acacia Country School
        </p>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Users" 
          value={stats?.totalUsers || 0} 
          subtitle={`${stats?.activeUsers || 0} active`} 
          icon={<Users className="h-5 w-5" />} 
        />
        <StatCard 
          title="Total Pupils" 
          value={stats?.totalPupils || 0} 
          subtitle="Across all grades" 
          icon={<GraduationCap className="h-5 w-5" />} 
        />
        <StatCard 
          title="Total Expected" 
          value={`K${(stats?.totalExpected || 0).toFixed(2)}`} 
          subtitle="This term" 
          icon={<TrendingUp className="h-5 w-5" />} 
          variant="default"
        />
        <StatCard 
          title="Outstanding" 
          value={`K${(stats?.outstandingBalance || 0).toFixed(2)}`} 
          subtitle="Pending payments" 
          icon={<AlertTriangle className="h-5 w-5" />} 
          variant="warning"
        />
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Locked Terms</span>
              <Badge variant={stats?.lockedTerms ? "destructive" : "default"}>
                {stats?.lockedTerms || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending Approvals</span>
              <Badge variant={stats?.pendingApprovals ? "destructive" : "default"}>
                {stats?.pendingApprovals || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Active Fees</span>
              <Badge variant="default">{stats?.totalFees || 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Super Admins</span>
              <Badge className="bg-red-100 text-red-800">
                {stats?.usersByRole.SuperAdmin || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Directors</span>
              <Badge className="bg-blue-100 text-blue-800">
                {stats?.usersByRole.Director || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">School Admins</span>
              <Badge className="bg-green-100 text-green-800">
                {stats?.usersByRole.SchoolAdmin || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Collected</span>
              <span className="font-medium text-green-600">
                K{(stats?.totalCollected || 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Collection Rate</span>
              <span className="font-medium">
                {stats?.totalExpected > 0 
                  ? `${((stats.totalCollected / stats.totalExpected) * 100).toFixed(1)}%`
                  : "0%"
                }
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Parents</span>
              <span className="font-medium">{stats?.totalParents || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="flex items-start space-x-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`p-2 rounded-lg bg-muted ${link.color}`}>
                  <link.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{link.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity?.length ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">Payment Recorded</span>
                    <span className="text-muted-foreground ml-2">
                      Term {activity.term_number}, {activity.year}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-medium">
                      K{Number(activity.amount_paid).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(activity.created_at), "dd MMM")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
