import { SidebarTrigger } from "@/components/ui/sidebar";
import { Copyright, User, Database, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompactDataSourceToggle } from "@/components/settings/DataSourceToggle";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TopNavbar() {
  const currentYear = new Date().getFullYear();
  const { getCurrentUser, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const handleRefresh = () => {
    // Clear all Excel-related cache
    localStorage.removeItem('workbook_cache');
    localStorage.removeItem('workbook_timestamp');
    localStorage.removeItem('school_system_data_source'); // Reset to default
    
    // Show feedback
    const refreshBtn = document.querySelector('[title="Refresh Excel data"]') as HTMLButtonElement;
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>';
    }
    
    // Reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const user = getCurrentUser();

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 flex-shrink-0 shadow-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div className="flex flex-col">
          <h1 className="font-heading text-lg font-bold text-primary">
            Acacia Country School
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Copyright className="h-3 w-3" />
            {currentYear} Acacia Country School. All rights reserved.
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Data Source Toggle - Online/Offline Mode */}
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <CompactDataSourceToggle />
        </div>

        {/* Refresh Button - Re-parse Excel data */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          className="flex items-center gap-2"
          title="Refresh Excel data"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {/* User Menu with Logout */}
        {isAuthenticated() && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user.fullName}</span>
                <LogOut className="h-4 w-4 text-red-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm">
                <div className="pb-2">
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-muted-foreground">{user.email}</p>
                  <p className="text-primary font-medium capitalize">{user.role?.replace(/_/g, ' ')}</p>
                </div>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
