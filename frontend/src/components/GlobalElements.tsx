import { useEffect } from "react";
import { toast } from "sonner";
import { useReward } from "@/context/RewardContext";
import { useAuth } from "@/context/AuthContext";
import { useTask } from "@/context/TaskContext";

export function GlobalElements() {
    const { getPendingNotifications, markNotificationViewed } = useReward();
    const { currentUser } = useAuth();
    const { tasks } = useTask();

    useEffect(() => {
        if (!currentUser) return;
        const pendingRewards = getPendingNotifications();
        pendingRewards.forEach(r => {
            toast('🏆 Congratulations!', {
                description: `You have earned the "${r.title}" reward!\n${r.description}`,
                duration: 10000,
                onDismiss: () => markNotificationViewed(r.id),
                onAutoClose: () => markNotificationViewed(r.id),
            });
        });
    }, [currentUser, getPendingNotifications, markNotificationViewed]);

    // System Notifications for new Tasks
    useEffect(() => {
        if (!currentUser) return;
        // Mock new task notification - We could check tasks created recently assigned to this user
        // We can just rely on standard create task toast instead of global for now.
    }, [currentUser, tasks]);

    return null;
}
