import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  sendNotification: (type: string, title: string, message: string) => Promise<{ success: boolean; error?: string }>;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

function mapNotification(n: any): AppNotification {
  return {
    id: n._id || n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    senderId: n.senderId,
    senderName: n.senderName,
    createdAt: n.createdAt,
    read: !!n.read,
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser || currentUser.role === 'super_admin' || !currentUser.companyId) return;
    try {
      const res = await api.notifications.list(currentUser.companyId, currentUser.id);
      const mapped = res.notifications.map(mapNotification);
      setNotifications(mapped);
      setUnreadCount(typeof res.unreadCount === "number" ? res.unreadCount : mapped.filter((n) => !n.read).length);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, [currentUser?.companyId, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // near real-time polling
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const sendNotification = async (type: string, title: string, message: string) => {
    if (!currentUser || !currentUser.companyId) return { success: false, error: "Not authenticated" };
    try {
      await api.notifications.create({
        companyId: currentUser.companyId,
        type,
        title,
        message,
        senderId: currentUser.id,
        senderName: currentUser.name,
      });
      await fetchNotifications();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to send notification" };
    }
  };

  const markAsRead = useCallback(async (id: string) => {
    if (!currentUser?.companyId) return;
    try {
      await api.notifications.markRead(id, { companyId: currentUser.companyId, userId: currentUser.id });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  }, [currentUser?.companyId, currentUser?.id]);

  const markAllRead = useCallback(async () => {
    if (!currentUser?.companyId) return;
    try {
      await api.notifications.markAllRead({ companyId: currentUser.companyId, userId: currentUser.id });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }, [currentUser?.companyId, currentUser?.id]);

  const clearAll = useCallback(async () => {
    if (!currentUser?.companyId) return;
    try {
      await api.notifications.clearAll(currentUser.companyId);
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }, [currentUser?.companyId]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, sendNotification, fetchNotifications, markAsRead, markAllRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}
