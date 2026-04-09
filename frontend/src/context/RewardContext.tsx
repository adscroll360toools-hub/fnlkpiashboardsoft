import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth, UserRole } from "./AuthContext";

export interface AppReward {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    eligibleRole?: UserRole | "All";
    eligibleEmployeeId?: string; // If specific employee
    createdAt: string;
}

export interface RewardNotification {
    rewardId: string;
    userId: string;
    viewed: boolean;
}

interface RewardContextType {
    rewards: AppReward[];
    notifications: RewardNotification[];
    createReward: (reward: Omit<AppReward, "id" | "createdAt">) => { success: boolean; error?: string };
    deleteReward: (rewardId: string) => { success: boolean; error?: string };
    markNotificationViewed: (rewardId: string) => void;
    getPendingNotifications: () => AppReward[];
}

const RewardContext = createContext<RewardContextType | null>(null);

const STORE_REWARDS = "adscroll360_rewards_v2";
const STORE_NOTIFICATIONS = "adscroll360_reward_notifications_v2";

function loadData<T>(key: string, defaultValue: T): T {
    try {
        const d = localStorage.getItem(key);
        if (d) return JSON.parse(d);
    } catch {}
    return defaultValue;
}

export function RewardProvider({ children }: { children: ReactNode }) {
    const { currentUser, users } = useAuth();
    const [rewards, setRewards] = useState<AppReward[]>(() => loadData(STORE_REWARDS, []));
    const [notifications, setNotifications] = useState<RewardNotification[]>(() => loadData(STORE_NOTIFICATIONS, []));

    useEffect(() => {
        localStorage.setItem(STORE_REWARDS, JSON.stringify(rewards));
    }, [rewards]);

    useEffect(() => {
        localStorage.setItem(STORE_NOTIFICATIONS, JSON.stringify(notifications));
    }, [notifications]);

    const createReward = (r: Omit<AppReward, "id" | "createdAt">) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        if (currentUser.role !== "admin") return { success: false, error: "Only admins can create rewards" };

        const newReward: AppReward = {
            ...r,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        };

        setRewards(prev => [newReward, ...prev]);

        // Generate notifications for eligible users
        const newNotifs: RewardNotification[] = [];
        for (const user of users) {
             if (r.eligibleEmployeeId && r.eligibleEmployeeId === user.id) {
                 newNotifs.push({ rewardId: newReward.id, userId: user.id, viewed: false });
             } else if (r.eligibleRole && (r.eligibleRole === "All" || r.eligibleRole === user.role)) {
                 newNotifs.push({ rewardId: newReward.id, userId: user.id, viewed: false });
             }
        }
        setNotifications(prev => [...prev, ...newNotifs]);

        return { success: true };
    };

    const deleteReward = (rewardId: string) => {
        if (currentUser?.role !== "admin") return { success: false, error: "Not authorized" };
        setRewards(prev => prev.filter(r => r.id !== rewardId));
        setNotifications(prev => prev.filter(n => n.rewardId !== rewardId));
        return { success: true };
    };

    const markNotificationViewed = (rewardId: string) => {
        if (!currentUser) return;
        setNotifications(prev => prev.map(n => 
            (n.rewardId === rewardId && n.userId === currentUser.id) ? { ...n, viewed: true } : n
        ));
    };

    const getPendingNotifications = () => {
        if (!currentUser) return [];
        const pending = notifications.filter(n => n.userId === currentUser.id && !n.viewed);
        return pending.map(n => rewards.find(r => r.id === n.rewardId)).filter(Boolean) as AppReward[];
    };

    return (
        <RewardContext.Provider value={{ rewards, notifications, createReward, deleteReward, markNotificationViewed, getPendingNotifications }}>
            {children}
        </RewardContext.Provider>
    );
}

export function useReward() {
    const ctx = useContext(RewardContext);
    if (!ctx) throw new Error("useReward must be used within RewardProvider");
    return ctx;
}
