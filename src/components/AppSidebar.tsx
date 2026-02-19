import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CreditCard,
  DollarSign,
  FileText,
  Shield,
  Settings,
  ChevronLeft,
  LogOut,
  Menu,
  AlertTriangle,
  ChevronRight,
  Search,
  Bell,
  Command,
  Tag
} from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Pupils", icon: GraduationCap, path: "/dashboard/pupils" },
  { label: "Parents", icon: Users, path: "/dashboard/parents" },
  { label: "Fees", icon: DollarSign, path: "/dashboard/fees" },
  { label: "Payments", icon: CreditCard, path: "/dashboard/payments" },
  { label: "Reports", icon: FileText, path: "/dashboard/reports" },
];

const adminNavItems = [
  { label: "Admin", icon: Shield, path: "/dashboard/admin/dashboard" },
  { label: "Users", icon: Users, path: "/dashboard/admin/users" },
  { label: "Audit", icon: FileText, path: "/dashboard/admin/audit" },
  { label: "Settings", icon: Settings, path: "/dashboard/admin/school" },
  { label: "Emergency", icon: AlertTriangle, path: "/dashboard/admin/emergency" },
];

// School Admin navigation - operational focus
const schoolAdminNavItems = [
  { label: "School Config", icon: Settings, path: "/dashboard/admin/school" },
  { label: "Grades", icon: GraduationCap, path: "/dashboard/admin/grades" },
  { label: "Fee Types", icon: Tag, path: "/dashboard/admin/fee-types" },
  { label: "Fee Structure", icon: DollarSign, path: "/dashboard/admin/fees" },
];

interface AppSidebarProps {
  onLogout: () => void;
}

export default function AppSidebar({ onLogout }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(true); // Default collapsed for minimal rail
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { canAccessAdminPanel, role, isSuperAdmin, isSchoolAdmin } = useAuthWithPermissions();

  // Check if path is active
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <img src={schoolLogo} alt="Acacia" className="h-8 w-auto" />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-sidebar-accent"
        >
          <Menu className="h-5 w-5 text-sidebar-foreground" />
        </button>
      </div>

      {/* Desktop Minimal Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 hidden md:flex flex-col",
          collapsed ? "w-16" : "w-64"
        )}
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
      >
        {/* Logo Area */}
        <div className="h-14 flex items-center justify-center border-b border-sidebar-border">
          <img src={schoolLogo} alt="Logo" className="h-8 w-8" />
        </div>

        {/* Main Nav */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors relative",
                isActive(item.path)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn(
                "transition-opacity duration-200 whitespace-nowrap",
                collapsed ? "opacity-0 w-0" : "opacity-100"
              )}>
                {item.label}
              </span>
              {isActive(item.path) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}
            </Link>
          ))}

          {/* Admin Section - Different for Super Admin vs School Admin */}
          {typeof canAccessAdminPanel === 'function' && canAccessAdminPanel() && (
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              {!collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase">
                  {isSuperAdmin?.() ? 'Governance' : 'School Config'}
                </div>
              )}
              {/* Super Admin sees governance nav */}
              {isSuperAdmin?.() && adminNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors relative",
                    isActive(item.path)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className={cn(
                    "transition-opacity duration-200 whitespace-nowrap",
                    collapsed ? "opacity-0 w-0" : "opacity-100"
                  )}>
                    {item.label}
                  </span>
                  {isActive(item.path) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                </Link>
              ))}
              {/* School Admin sees operational nav */}
              {isSchoolAdmin?.() && schoolAdminNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors relative",
                    isActive(item.path)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className={cn(
                    "transition-opacity duration-200 whitespace-nowrap",
                    collapsed ? "opacity-0 w-0" : "opacity-100"
                  )}>
                    {item.label}
                  </span>
                  {isActive(item.path) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-sidebar-border space-y-1">
          <button
            onClick={onLogout}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors w-full",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className={cn(
              "transition-opacity duration-200 whitespace-nowrap",
              collapsed ? "opacity-0 w-0" : "opacity-100"
            )}>
              Log Out
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border p-4">
            <div className="flex items-center gap-3 mb-6">
              <img src={schoolLogo} alt="Logo" className="h-8" />
              <span className="font-semibold text-sidebar-foreground">Acacia School</span>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive(item.path)
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
              {/* Admin section for mobile */}
              {canAccessAdminPanel?.() && (
                <>
                  <div className="pt-4 mt-4 border-t border-sidebar-border px-3 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase">
                    {isSuperAdmin?.() ? 'Governance' : 'School Config'}
                  </div>
                  {(isSuperAdmin?.() ? adminNavItems : schoolAdminNavItems).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive(item.path)
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  ))}
                </>
              )}
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
