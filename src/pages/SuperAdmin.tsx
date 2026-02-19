import { Navigate } from "react-router-dom";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import SuperAdminDashboard from "@/components/SuperAdmin/Dashboard";
import SuperAdminUserManagement from "@/components/SuperAdmin/UserManagement";
import SuperAdminAuditLogs from "@/components/SuperAdmin/AuditLogs";
import SuperAdminFeeTermManagement from "@/components/SuperAdmin/FeeTermManagement";
import SuperAdminSchoolSettings from "@/components/SuperAdmin/SchoolSettings";
import SuperAdminEmergencyOverrides from "@/components/SuperAdmin/EmergencyOverrides";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

interface SuperAdminProps {
  activeTab?: string;
}

export default function SuperAdmin({ activeTab = "dashboard" }: SuperAdminProps) {
  const { isAuthenticated } = useAuthWithPermissions();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Route-level protection handles role checks
  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <SuperAdminDashboard />;
      case "users":
        return <SuperAdminUserManagement />;
      case "audit":
        return <SuperAdminAuditLogs />;
      case "fees":
        return <SuperAdminFeeTermManagement />;
      case "school":
        return <SuperAdminSchoolSettings />;
      case "emergency":
        return <SuperAdminEmergencyOverrides />;
      default:
        return <SuperAdminDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {renderTabContent()}
    </div>
  );
}
