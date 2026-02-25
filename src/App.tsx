import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Grades from "./pages/Grades";
import Pupils from "./pages/Pupils";
import PupilProfile from "./pages/PupilProfile";
import Terms from "./pages/Terms";
import Fees from "./pages/Fees";
import Reports from "./pages/Reports";
import FeeDefaults from "./pages/FeeDefaults";
import SchoolSettings from "./pages/SchoolSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/pupils" element={<Pupils />} />
            <Route path="/pupils/:id" element={<PupilProfile />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/fee-defaults" element={<FeeDefaults />} />
            <Route path="/settings" element={<SchoolSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DashboardLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
