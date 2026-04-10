import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3, Building2, LayoutDashboard, LogOut,
  Menu, X, ChevronRight, Shield
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/super-admin/dashboard" },
  { label: "Companies", icon: Building2, path: "/super-admin/companies" },
];

export default function SuperAdminLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 72 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex flex-col bg-slate-900 border-r border-white/5 z-40 flex-shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <div className="text-white font-bold text-sm leading-tight">Zaptiz</div>
              <div className="text-blue-400 text-xs font-medium">Super Admin</div>
            </motion.div>
          )}
        </div>

        {/* Super Admin Badge */}
        {sidebarOpen && (
          <div className="mx-3 mt-3 mb-1 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div>
              <div className="text-blue-300 text-xs font-semibold">Platform Owner</div>
              <div className="text-slate-500 text-xs truncate">{currentUser?.email}</div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${active
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
                {sidebarOpen && active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-2 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/5 transition-all"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 bg-slate-800 border border-white/10 rounded-full w-6 h-6 flex items-center justify-center hover:bg-slate-700 transition-colors"
        >
          {sidebarOpen ? <X className="w-3 h-3 text-slate-400" /> : <Menu className="w-3 h-3 text-slate-400" />}
        </button>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
