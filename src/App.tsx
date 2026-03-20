import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import Grades from "./pages/Grades";
import Pupils from "./pages/Pupils";
import PupilProfile from "./pages/PupilProfile";
import Parents from "./pages/Parents";
import Terms from "./pages/Terms";
import Fees from "./pages/Fees";
import Reports from "./pages/Reports";
import FeeDefaults from "./pages/FeeDefaults";
import SchoolSettings from "./pages/SchoolSettings";
import SystemAdmin from "./pages/SystemAdmin";
import ProfileManagement from "./pages/ProfileManagement";
import NotFound from "./pages/NotFound";
import Payments from "./pages/Payments";
import ExcelImport from "./pages/ExcelImport";
import ReconciliationData from "./pages/ReconciliationData";
import DataSourceAdmin from "./pages/DataSourceAdmin";
import ExcelStructureAnalyzer from "./components/ExcelStructureAnalyzer";
import { DataSourceProvider } from "./context/DataSourceContext";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/*" element={
        <DashboardLayout>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/grades" element={
              <ProtectedRoute>
                <Grades />
              </ProtectedRoute>
            } />
            <Route path="/pupils" element={
              <ProtectedRoute>
                <Pupils />
              </ProtectedRoute>
            } />
            <Route path="/pupils/:id" element={
              <ProtectedRoute>
                <PupilProfile />
              </ProtectedRoute>
            } />
            <Route path="/payments/:pupilId" element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            } />
            <Route path="/parents" element={
              <ProtectedRoute>
                <Parents />
              </ProtectedRoute>
            } />
            <Route path="/terms" element={
              <ProtectedRoute>
                <Terms />
              </ProtectedRoute>
            } />
            <Route path="/fees" element={
              <ProtectedRoute>
                <Fees />
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/fee-defaults" element={
              <ProtectedRoute>
                <FeeDefaults />
              </ProtectedRoute>
            } />
            <Route path="/school-settings" element={
              <ProtectedRoute>
                <SchoolSettings />
              </ProtectedRoute>
            } />
            <Route path="/system-admin" element={
              <ProtectedRoute>
                <SystemAdmin />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfileManagement />
              </ProtectedRoute>
            } />
            <Route path="/data-source-admin" element={
              <ProtectedRoute>
                <DataSourceAdmin />
              </ProtectedRoute>
            } />
            <Route path="/excel-import" element={
              <ProtectedRoute>
                <ExcelImport />
              </ProtectedRoute>
            } />
            <Route path="/reconciliation-data" element={
              <ProtectedRoute>
                <ReconciliationData />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DashboardLayout>
      } />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataSourceProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </DataSourceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
