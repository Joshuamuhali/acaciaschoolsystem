import { useState } from "react";
import { useEnhancedAuditLogs } from "@/hooks/useSuperAdmin";
import { useUserRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  FileText, 
  Eye,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Shield
} from "lucide-react";
import { format } from "date-fns";

export default function SuperAdminAuditLogs() {
  const { role: currentUserRole } = useUserRole();
  const [filters, setFilters] = useState({
    tableName: "",
    actionType: "",
    userId: "",
    startDate: "",
    endDate: "",
  });
  
  const { data: logs, isLoading, refetch } = useEnhancedAuditLogs(
    Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ""))
  );

  const actionTypes = [
    "INSERT", "UPDATE", "DELETE", "SOFT_DELETE", "APPROVE_DELETION", 
    "REJECT_DELETION", "LOCK_TERM", "UNLOCK_TERM", "BALANCE_ADJUSTMENT", 
    "OVERRIDE_TERM_LOCK"
  ];

  const tableNames = [
    "users", "user_roles", "pupils", "parents", "grades", "fees", 
    "payments", "audit_logs", "term_lock", "school_settings"
  ];

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "INSERT":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "UPDATE":
        return <FileText className="h-4 w-4 text-blue-600" />;
      case "DELETE":
      case "SOFT_DELETE":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "APPROVE_DELETION":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "REJECT_DELETION":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "LOCK_TERM":
        return <Lock className="h-4 w-4 text-orange-600" />;
      case "UNLOCK_TERM":
        return <Shield className="h-4 w-4 text-green-600" />;
      case "BALANCE_ADJUSTMENT":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "OVERRIDE_TERM_LOCK":
        return <Shield className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "INSERT":
        return "bg-green-100 text-green-800 border-green-200";
      case "UPDATE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "DELETE":
      case "SOFT_DELETE":
        return "bg-red-100 text-red-800 border-red-200";
      case "APPROVE_DELETION":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECT_DELETION":
        return "bg-red-100 text-red-800 border-red-200";
      case "LOCK_TERM":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "UNLOCK_TERM":
        return "bg-green-100 text-green-800 border-green-200";
      case "BALANCE_ADJUSTMENT":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "OVERRIDE_TERM_LOCK":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      tableName: "",
      actionType: "",
      userId: "",
      startDate: "",
      endDate: "",
    });
  };

  const exportLogs = () => {
    // CSV export functionality will be implemented with proper data export
  };

  // Only Director and Super Admin can access
  if (!["Director", "SuperAdmin"].includes(currentUserRole || "")) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Access Restricted</p>
            <p className="text-sm">Only Director and Super Admin can view audit logs.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Audit Logs</h2>
          <p className="text-muted-foreground">View all system activity and changes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => refetch()}>
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <h3 className="font-medium">Filters</h3>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={filters.actionType} onValueChange={(value) => handleFilterChange("actionType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    {actionTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Table</Label>
                <Select value={filters.tableName} onValueChange={(value) => handleFilterChange("tableName", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All tables" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All tables</SelectItem>
                    {tableNames.map(table => (
                      <SelectItem key={table} value={table}>{table}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input
                  placeholder="User ID"
                  value={filters.userId}
                  onChange={(e) => handleFilterChange("userId", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    placeholder="Start date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="End date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity ({logs?.length || 0} records)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
          ) : !logs?.length ? (
            <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="mt-1">
                      {getActionIcon(log.action_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getActionColor(log.action_type)}>
                          {log.action_type}
                        </Badge>
                        <Badge variant="outline">{log.table_name}</Badge>
                        {log.record_id && (
                          <span className="text-xs text-muted-foreground font-mono">
                            ID: {log.record_id.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">{log.performer_email}</span>
                          {log.performer_name && (
                            <span className="text-muted-foreground ml-2">
                              ({log.performer_name})
                            </span>
                          )}
                          {log.performer_role && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {log.performer_role}
                            </Badge>
                          )}
                        </p>
                        
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd MMM yyyy HH:mm:ss")}
                          {log.ip_address && (
                            <span className="ml-2">• IP: {log.ip_address}</span>
                          )}
                        </p>
                        
                        {/* Data preview */}
                        {(log.old_data || log.new_data) && (
                          <div className="mt-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 text-xs">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View Details
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>Audit Log Details</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <Label>Action</Label>
                                      <p>{log.action_type}</p>
                                    </div>
                                    <div>
                                      <Label>Table</Label>
                                      <p>{log.table_name}</p>
                                    </div>
                                    <div>
                                      <Label>User</Label>
                                      <p>{log.performer_email}</p>
                                    </div>
                                    <div>
                                      <Label>Timestamp</Label>
                                      <p>{format(new Date(log.created_at), "dd MMM yyyy HH:mm:ss")}</p>
                                    </div>
                                  </div>
                                  
                                  {log.old_data && (
                                    <div>
                                      <Label>Old Data</Label>
                                      <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                                        {JSON.stringify(log.old_data, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  {log.new_data && (
                                    <div>
                                      <Label>New Data</Label>
                                      <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                                        {JSON.stringify(log.new_data, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
