import { SidebarTrigger } from "@/components/ui/sidebar";
import { Shield, Copyright } from "lucide-react";

export function TopNavbar() {
  const currentYear = new Date().getFullYear();
  
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4 text-secondary" />
        <span className="font-medium">System Admin</span>
      </div>
    </header>
  );
}
