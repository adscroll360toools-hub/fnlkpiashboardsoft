import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
}

interface NotificationContextType {
  notifications: AppNotification[];
  sendNotification: (type: string, title: string, message: string) => Promise<{ success: boolean; error?: string }>;
  fetchNotifications: () => Promise<void>;
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
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const fetchNotifications = async () => {
    if (!currentUser || currentUser.role === 'super_admin' || !currentUser.companyId) return;
    try {
      const res = await api.notifications.list(currentUser.companyId);
      setNotifications(res.notifications.map(mapNotification));
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 minute poll
    return () => clearInterval(interval);
  }, [currentUser?.companyId, currentUser?.role]);

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

  return (
    <NotificationContext.Provider value={{ notifications, sendNotification, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
}
