import {
  LayoutDashboard, GraduationCap, Users, CalendarDays,
  DollarSign, BarChart3, Settings, Shield, UserCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import schoolLogo from "@/assets/school-logo.png";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Grades", url: "/grades", icon: GraduationCap },
  { title: "Pupils", url: "/pupils", icon: Users },
  { title: "Parents", url: "/parents", icon: UserCheck },
  { title: "Terms", url: "/terms", icon: CalendarDays },
  { title: "Fees", url: "/fees", icon: DollarSign },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Shield },
];

export function AppSidebar() {
  const sidebar = useSidebar();
  const collapsed = sidebar?.state === "collapsed";

  return (
    <Sidebar className="border-r-0" collapsible="icon">
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <img src={schoolLogo} alt="Acacia Country School" className="h-10 w-auto flex-shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <h2 className="font-heading text-sm font-bold text-sidebar-foreground truncate">Acacia Country</h2>
            <p className="text-[11px] text-sidebar-foreground/60 truncate">School Management</p>
          </div>
        )}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-wider">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
