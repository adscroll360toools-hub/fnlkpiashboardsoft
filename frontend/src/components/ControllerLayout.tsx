import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    LayoutDashboard, ClipboardCheck, CalendarClock,
    BarChart3, Settings, LogOut, Bell, Target, MessageSquare, StickyNote, X, Menu, Tags,
} from "lucide-react";
import { DelayedTaskNotificationBar } from "@/components/DelayedTaskNotificationBar";

const navItems = [
    { label: "Dashboard", to: "/controller/dashboard", icon: LayoutDashboard },
    { label: "Tasks", to: "/controller/tasks", icon: ClipboardCheck },
    { label: "Attendance", to: "/controller/attendance", icon: CalendarClock },
    { label: "Reports", to: "/controller/reports", icon: BarChart3 },
    { label: "KPI", to: "/controller/kpi", icon: Target },
    { label: "Standups", to: "/controller/standups", icon: MessageSquare },
    { label: "Notes", to: "/controller/notes", icon: StickyNote },
    { label: "Roles", to: "/controller/roles", icon: Tags },
    { label: "Settings", to: "/controller/settings", icon: Settings },
];

const NOTIFICATIONS: any[] = [];

export function ControllerLayout() {
    const { currentUser, logout } = useAuth();
    const { notifications: globalNotifications } = useNotification();
    const navigate = useNavigate();
    const [notifOpen, setNotifOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const [dismissedNotifIds, setDismissedNotifIds] = useState<Set<string>>(new Set());

    // Merge system notifications
    const notifications = globalNotifications
        .filter(n => !dismissedNotifIds.has(n.id))
        .map(n => ({
            id: n.id,
            title: n.title,
            desc: n.message,
            time: new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            icon: Bell,
            color: n.type === 'Meeting' ? 'text-blue-600 bg-blue-100' : 'text-purple-600 bg-purple-100'
        }))
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime() || 0);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
        };
        if (notifOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [notifOpen]);

    const handleLogout = () => { logout(); navigate("/login", { replace: true }); };

    return (
        <div className="min-h-screen flex bg-background">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-56 bg-card border-r flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:relative lg:translate-x-0`}>
                {/* Brand */}
                <div className="flex items-center gap-2.5 px-4 py-4 border-b">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
                        <span className="text-xs font-bold text-white">Z</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">Zaptiz</p>
                        <p className="text-[10px] text-violet-600 font-medium">Controller Portal</p>
                    </div>
                </div>
                {/* Nav */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                    {navItems.map((item) => (
                        <NavLink key={item.to} to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? "bg-violet-600 text-white font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`
                            }
                        >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                {/* Logout */}
                <div className="border-t p-3">
                    <button onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                        <LogOut className="h-4 w-4 shrink-0" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Overlay on mobile */}
            {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-14 flex items-center justify-between border-b bg-card px-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-1.5 rounded-lg hover:bg-muted">
                            <Menu className="h-5 w-5" />
                        </button>
                        <span className="text-sm text-muted-foreground hidden sm:block">
                            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <div className="relative" ref={notifRef}>
                            <button onClick={() => setNotifOpen((v) => !v)}
                                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <Bell className="h-[18px] w-[18px]" />
                                {notifications.length > 0 && (
                                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">
                                        {notifications.length}
                                    </span>
                                )}
                            </button>
                            <AnimatePresence>
                                {notifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        className="absolute right-0 top-11 z-50 w-80 rounded-2xl border bg-card shadow-xl"
                                    >
                                        <div className="flex items-center justify-between border-b px-4 py-3">
                                            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                                            <button onClick={() => setDismissedNotifIds(new Set([...dismissedNotifIds, ...notifications.map(n => n.id)]))} className="text-[11px] text-primary hover:underline">Clear all</button>
                                        </div>
                                        <div className="max-h-72 overflow-y-auto divide-y">
                                            {notifications.length === 0 ? (
                                                <div className="py-8 text-center text-sm text-muted-foreground">No notifications</div>
                                            ) : notifications.map((n) => {
                                                const Icon = n.icon;
                                                return (
                                                    <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-muted/50 group cursor-pointer">
                                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.color}`}>
                                                            <Icon className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-foreground">{n.title}</p>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">{n.desc}</p>
                                                            <p className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</p>
                                                        </div>
                                                        <button onClick={() => setDismissedNotifIds(p => new Set([...p, n.id]))}
                                                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted"
                                                        >
                                                            <X className="h-3 w-3 text-muted-foreground" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {/* User */}
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-violet-600 text-white text-xs font-medium">
                                    {currentUser?.name.slice(0, 2).toUpperCase() ?? "CT"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden sm:block">
                                <p className="text-sm font-medium leading-none text-foreground">{currentUser?.name}</p>
                                <p className="text-[11px] text-violet-600">Controller</p>
                            </div>
                        </div>
                    </div>
                </header>
                <DelayedTaskNotificationBar scope="company" />
                <main className="flex-1 overflow-auto p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
