import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth, UserRole } from "@/context/AuthContext";
import { AttendanceProvider } from "@/context/AttendanceContext";
import { TaskProvider } from "@/context/TaskContext";
import { KPIProvider } from "@/context/KPIContext";
import { RewardProvider } from "@/context/RewardContext";
import { NotificationProvider } from "@/context/NotificationContext";

// SaaS Public
import LandingPage from "./pages/LandingPage";

// Super Admin platform control
import SuperAdminLayout from "./pages/super-admin/SuperAdminLayout";
import SuperAdminDashboard from "./pages/super-admin/SuperAdminDashboard";
import CompaniesPage from "./pages/super-admin/CompaniesPage";

// Core Admin (admin) layout + pages
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import TasksPage from "./pages/TasksPage";
import AttendancePage from "./pages/AttendancePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import KPITargetsPage from "./pages/admin/KPITargetsPage";
import RewardsPage from "./pages/admin/RewardsPage";
import SkillsPage from "./pages/admin/SkillsPage";
import StandupsPage from "./pages/admin/StandupsPage";
import NotesPage from "./pages/admin/NotesPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import RolesPage from "./pages/admin/RolesPage";
import AttendanceControlPage from "./pages/admin/AttendanceControlPage";
import TaskAnalyticsPage from "./pages/TaskAnalyticsPage";

// Controller portal
import { ControllerLayout } from "@/components/ControllerLayout";
import ControllerDashboard from "./pages/portal/ControllerDashboard";

// Employee portal
import { EmployeeLayout } from "@/components/EmployeeLayout";
import EmployeeDashboard from "./pages/portal/EmployeeDashboard";

// Shared portal pages (reused across controller + employee)
import PortalSettingsPage from "./pages/portal/PortalSettingsPage";

import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import { GlobalElements } from "./components/GlobalElements";

const queryClient = new QueryClient();

/** Redirects to /login if not authenticated, or to wrong portal */
function RequireAuth({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== role) {
    // Route to the correct portal
    const portals: Record<UserRole, string> = {
      super_admin: "/super-admin/dashboard",
      admin: "/dashboard",
      controller: "/controller/dashboard",
      employee: "/employee/dashboard",
    };
    return <Navigate to={portals[currentUser.role]} replace />;
  }
  return <>{children}</>;
}

/** Root redirect: logged-in users go to their portal */
function RootRedirect() {
  const { currentUser } = useAuth();
  if (!currentUser) return <LandingPage />; // Default home for guests
  if (currentUser.role === "super_admin") return <Navigate to="/super-admin/dashboard" replace />;
  if (currentUser.role === "admin") return <Navigate to="/dashboard" replace />;
  if (currentUser.role === "controller") return <Navigate to="/controller/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
}

function AppRoutes() {
  return (
    <>
      <GlobalElements />
      <Routes>
        {/* Public */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />

        {/* ── Super Admin (Platform Owner) ────────────────────── */}
        <Route element={<RequireAuth role="super_admin"><SuperAdminLayout /></RequireAuth>}>
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/super-admin/companies" element={<CompaniesPage />} />
        </Route>

        {/* ── Company Admin ───────────────────────────────────── */}
        <Route element={<RequireAuth role="admin"><AppLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/analytics" element={<TaskAnalyticsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/roles" element={<RolesPage />} />
          <Route path="/admin/attendance-control" element={<AttendanceControlPage />} />
          <Route path="/admin/kpi" element={<KPITargetsPage />} />
          <Route path="/admin/rewards" element={<RewardsPage />} />
          <Route path="/admin/skills" element={<SkillsPage />} />
          <Route path="/admin/standups" element={<StandupsPage />} />
          <Route path="/admin/notes" element={<NotesPage />} />
        </Route>

        {/* ── Controller portal ────────────────────────────────── */}
        <Route element={<RequireAuth role="controller"><ControllerLayout /></RequireAuth>}>
          <Route path="/controller/dashboard" element={<ControllerDashboard />} />
          <Route path="/controller/tasks" element={<TasksPage />} />
          <Route path="/controller/attendance" element={<AttendancePage />} />
          <Route path="/controller/reports" element={<ReportsPage />} />
          <Route path="/controller/kpi" element={<KPITargetsPage />} />
          <Route path="/controller/standups" element={<StandupsPage />} />
          <Route path="/controller/notes" element={<NotesPage />} />
          <Route path="/controller/settings" element={<PortalSettingsPage />} />
          <Route path="/controller/roles" element={<RolesPage />} />
        </Route>

        {/* ── Employee portal ──────────────────────────────────── */}
        <Route element={<RequireAuth role="employee"><EmployeeLayout /></RequireAuth>}>
          <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee/tasks" element={<TasksPage />} />
          <Route path="/employee/attendance" element={<AttendancePage />} />
          <Route path="/employee/leaderboard" element={<LeaderboardPage />} />
          <Route path="/employee/standups" element={<StandupsPage />} />
          <Route path="/employee/notes" element={<NotesPage />} />
          <Route path="/employee/settings" element={<PortalSettingsPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AttendanceProvider>
            <TaskProvider>
              <KPIProvider>
                <RewardProvider>
                  <NotificationProvider>
                    <AppRoutes />
                  </NotificationProvider>
                </RewardProvider>
              </KPIProvider>
            </TaskProvider>
          </AttendanceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
