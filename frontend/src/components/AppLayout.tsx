import { useState, useRef, useEffect, useMemo } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, CheckCheck, ClipboardCheck, Trophy, AlertCircle, X, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useTask } from "@/context/TaskContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useNotification } from "@/context/NotificationContext";
import { DelayedTaskNotificationBar } from "@/components/DelayedTaskNotificationBar";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  icon: React.ElementType;
  iconColor: string;
}

export function AppLayout() {
  const { currentUser } = useAuth();
  const { tasks } = useTask();
  const { breakRequests } = useAttendance();
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll } = useNotification();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Build live notifications from real data
  const liveNotifications = useMemo<Notification[]>(() => {
    const items: Notification[] = [];

    // Custom notifications
    notifications.forEach((n) => {
      items.push({
        id: `global-notif-${n.id}`,
        title: n.title,
        description: n.message,
        time: new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: false,
        icon: Bell,
        iconColor: n.type === 'Meeting' ? 'text-blue-600 bg-blue-100' : 'text-purple-600 bg-purple-100',
      });
    });

    // Completed tasks pending approval
    tasks
      .filter((t) => t.status === "Completed")
      .slice(0, 5)
      .forEach((t) => {
        items.push({
          id: `task-completed-${t.id}`,
          title: "Task Ready for Review",
          description: `"${t.title}" was completed by ${t.assigneeName}`,
          time: t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "recently",
          read: false,
          icon: ClipboardCheck,
          iconColor: "text-primary bg-primary/10",
        });
      });

    // Approved tasks
    tasks
      .filter((t) => t.status === "Approved")
      .slice(0, 3)
      .forEach((t) => {
        items.push({
          id: `task-approved-${t.id}`,
          title: "Task Approved",
          description: `"${t.title}" has been approved`,
          time: "recently",
          read: false,
          icon: CheckCheck,
          iconColor: "text-green-600 bg-green-100 dark:bg-green-900/30",
        });
      });

    // Pending break requests
    const today = new Date().toISOString().slice(0, 10);
    breakRequests
      .filter((r) => r.status === "Pending" && r.date === today)
      .forEach((r) => {
        items.push({
          id: `break-${r.id}`,
          title: "Break Request Pending",
          description: `Break requested: ${r.reason} (${r.sessionTime})`,
          time: new Date(r.requestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          read: false,
          icon: AlertCircle,
          iconColor: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
        });
      });

    // Tasks with unread chat messages  
    tasks
      .filter((t) => t.messages && t.messages.length > 0)
      .slice(0, 3)
      .forEach((t) => {
        const lastMsg = t.messages[t.messages.length - 1];
        items.push({
          id: `chat-${t.id}-${lastMsg.id}`,
          title: "New Message",
          description: `${lastMsg.senderName}: "${lastMsg.text.slice(0, 50)}${lastMsg.text.length > 50 ? "…" : ""}"`,
          time: new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          read: false,
          icon: Trophy,
          iconColor: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
        });
      });

    return items
      .filter((n) => !dismissedIds.has(n.id))
      .map((n) => ({ ...n, read: !!n.read }))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime() || 0); // basic sort
  }, [tasks, breakRequests, notifications, dismissedIds]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  const dismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="h-5 w-px bg-border" />
              <span className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  id="notification-bell"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    if (!notifOpen) markAllRead();
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="h-[18px] w-[18px]" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown panel */}
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className="absolute right-0 top-11 z-50 w-80 rounded-2xl border bg-card shadow-xl"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {unreadCount} new
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="max-h-80 overflow-y-auto divide-y">
                        {liveNotifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Bell className="mb-2 h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No notifications</p>
                          </div>
                        ) : (
                          liveNotifications.map((notif) => {
                            const Icon = notif.icon;
                            return (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  if (notif.id.startsWith("global-notif-")) {
                                    markAsRead(notif.id.replace("global-notif-", ""));
                                  }
                                }}
                                className={`group relative flex gap-3 px-4 py-3 transition-colors cursor-pointer hover:bg-muted/50 ${!notif.read ? "bg-primary/[0.03]" : ""
                                  }`}
                              >
                                {/* Unread indicator */}
                                {!notif.read && (
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary" />
                                )}
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${notif.iconColor}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-foreground">{notif.title}</p>
                                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                    {notif.description}
                                  </p>
                                  <p className="mt-1 text-[10px] text-muted-foreground/70">{notif.time}</p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismiss(notif.id);
                                  }}
                                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted"
                                >
                                  <X className="h-3 w-3 text-muted-foreground" />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      {liveNotifications.length > 0 && (
                        <div className="border-t px-4 py-2.5 text-center">
                          <button
                            onClick={() => {
                              clearAll();
                              setDismissedIds(new Set([...dismissedIds, ...liveNotifications.map((n) => n.id)]));
                            }}
                            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Clear all notifications
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User */}
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                    {currentUser?.name.slice(0, 2).toUpperCase() ?? "CA"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium leading-none text-foreground">{currentUser?.name ?? "Admin"}</p>
                  <p className="text-[11px] text-muted-foreground">Core Admin</p>
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
    </SidebarProvider>
  );
}
