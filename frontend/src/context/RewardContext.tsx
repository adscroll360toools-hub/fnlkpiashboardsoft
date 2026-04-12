import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth, UserRole } from "./AuthContext";
import { api } from "@/lib/api";

export interface AppReward {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  eligibleRole?: UserRole | "All";
  eligibleEmployeeId?: string;
  createdAt: string;
}

interface RewardContextType {
  rewards: AppReward[];
  refreshRewards: () => Promise<void>;
  createReward: (reward: Omit<AppReward, "id" | "createdAt">) => Promise<{ success: boolean; error?: string }>;
  deleteReward: (rewardId: string) => Promise<{ success: boolean; error?: string }>;
  /** Mark reward as seen (server + stops home popup). */
  acknowledgeReward: (rewardId: string) => Promise<void>;
}

const RewardContext = createContext<RewardContextType | null>(null);

function mapReward(r: any): AppReward {
  return {
    id: r.id || r._id,
    title: r.title,
    description: r.description || "",
    imageUrl: r.imageUrl,
    eligibleRole: r.eligibleRole || undefined,
    eligibleEmployeeId: r.eligibleEmployeeId || undefined,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
  };
}

export function RewardProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [rewards, setRewards] = useState<AppReward[]>([]);

  const refreshRewards = useCallback(async () => {
    if (!currentUser?.companyId) {
      setRewards([]);
      return;
    }
    try {
      const { rewards: raw } = await api.rewards.list(currentUser.companyId);
      setRewards((raw || []).map(mapReward));
    } catch (e) {
      console.error("Failed to load rewards:", e);
      setRewards([]);
    }
  }, [currentUser?.companyId]);

  useEffect(() => {
    refreshRewards();
  }, [refreshRewards]);

  const createReward = useCallback(
    async (r: Omit<AppReward, "id" | "createdAt">) => {
      if (!currentUser?.companyId) return { success: false, error: "Not logged in" };
      if (currentUser.role !== "admin") return { success: false, error: "Only company admins can create rewards" };
      try {
        await api.rewards.create({
          ...r,
          companyId: currentUser.companyId,
          createdById: currentUser.id,
          createdByName: currentUser.name,
          eligibleRole: r.eligibleRole === "All" ? null : r.eligibleRole,
          eligibleEmployeeId: r.eligibleEmployeeId || null,
        });
        await refreshRewards();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [currentUser, refreshRewards]
  );

  const deleteReward = useCallback(
    async (rewardId: string) => {
      if (currentUser?.role !== "admin") return { success: false, error: "Not authorized" };
      if (!currentUser.companyId) return { success: false, error: "No company" };
      try {
        await api.rewards.remove(rewardId);
        await refreshRewards();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [currentUser, refreshRewards]
  );

  const acknowledgeReward = useCallback(
    async (rewardId: string) => {
      if (!currentUser?.companyId) return;
      try {
        await api.rewards.ack(rewardId, { companyId: currentUser.companyId, userId: currentUser.id });
      } catch (e) {
        console.error(e);
      }
    },
    [currentUser?.companyId, currentUser?.id]
  );

  return (
    <RewardContext.Provider value={{ rewards, refreshRewards, createReward, deleteReward, acknowledgeReward }}>
      {children}
    </RewardContext.Provider>
  );
}

export function useReward() {
  const ctx = useContext(RewardContext);
  if (!ctx) throw new Error("useReward must be used within RewardProvider");
  return ctx;
}
