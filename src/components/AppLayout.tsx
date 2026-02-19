import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

export default function AppLayout({ children, onLogout }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar onLogout={onLogout} />
      <main className="md:ml-64 pt-14 md:pt-0 min-h-screen">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
