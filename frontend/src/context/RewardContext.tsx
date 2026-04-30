import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth, UserRole } from "./AuthContext";
import { api } from "@/lib/api";

export type RewardFormat = "bonus" | "certificate" | "recognition" | "gift";
export type ManagedRewardFormat = "bonus" | "certificate" | "recognition";
export interface RewardFormatConfig {
  format: ManagedRewardFormat;
  isActive: boolean;
}

export interface AppReward {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  rewardType?: RewardFormat;
  eligibleRole?: UserRole | "All";
  eligibleEmployeeId?: string;
  createdAt: string;
}

interface RewardContextType {
  rewards: AppReward[];
  formatConfigs: RewardFormatConfig[];
  refreshRewards: () => Promise<void>;
  refreshFormatConfigs: () => Promise<void>;
  createReward: (reward: Omit<AppReward, "id" | "createdAt">) => Promise<{ success: boolean; error?: string }>;
  deleteReward: (rewardId: string) => Promise<{ success: boolean; error?: string }>;
  setFormatActive: (format: ManagedRewardFormat, isActive: boolean) => Promise<{ success: boolean; error?: string }>;
  /** Mark reward as seen (server + stops home popup). */
  acknowledgeReward: (rewardId: string) => Promise<void>;
}

const RewardContext = createContext<RewardContextType | null>(null);

function mapReward(r: any): AppReward {
  const allowed: RewardFormat[] = ["bonus", "certificate", "recognition", "gift"];
  const rewardType = allowed.includes(r.rewardType) ? r.rewardType : "recognition";
  return {
    id: r.id || r._id,
    title: r.title,
    description: r.description || "",
    imageUrl: r.imageUrl,
    rewardType,
    eligibleRole: r.eligibleRole || undefined,
    eligibleEmployeeId: r.eligibleEmployeeId || undefined,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
  };
}

export function RewardProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [rewards, setRewards] = useState<AppReward[]>([]);
  const [formatConfigs, setFormatConfigs] = useState<RewardFormatConfig[]>([]);

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

  const refreshFormatConfigs = useCallback(async () => {
    if (!currentUser?.companyId) {
      setFormatConfigs([]);
      return;
    }
    try {
      const { formats } = await api.rewards.formats(currentUser.companyId);
      setFormatConfigs(
        (formats || []).map((f: any) => ({
          format: f.format as ManagedRewardFormat,
          isActive: !!f.isActive,
        }))
      );
    } catch (e) {
      console.error("Failed to load reward format configs:", e);
      setFormatConfigs([]);
    }
  }, [currentUser?.companyId]);

  useEffect(() => {
    refreshFormatConfigs();
  }, [refreshFormatConfigs]);

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
          rewardType: r.rewardType || "recognition",
          eligibleRole: r.eligibleRole === "All" ? null : r.eligibleRole,
          eligibleEmployeeId: r.eligibleEmployeeId || null,
        });
        await refreshRewards();
        await refreshFormatConfigs();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [currentUser, refreshRewards, refreshFormatConfigs]
  );

  const deleteReward = useCallback(
    async (rewardId: string) => {
      if (currentUser?.role !== "admin") return { success: false, error: "Not authorized" };
      if (!currentUser.companyId) return { success: false, error: "No company" };
      try {
        await api.rewards.remove(rewardId, currentUser.companyId);
        await refreshRewards();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [currentUser, refreshRewards]
  );

  const setFormatActive = useCallback(
    async (format: ManagedRewardFormat, isActive: boolean) => {
      if (currentUser?.role !== "admin") return { success: false, error: "Not authorized" };
      if (!currentUser.companyId) return { success: false, error: "No company" };
      try {
        await api.rewards.setFormat(format, { companyId: currentUser.companyId, isActive });
        await refreshFormatConfigs();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    [currentUser, refreshFormatConfigs]
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
    <RewardContext.Provider
      value={{
        rewards,
        formatConfigs,
        refreshRewards,
        refreshFormatConfigs,
        createReward,
        deleteReward,
        setFormatActive,
        acknowledgeReward,
      }}
    >
      {children}
    </RewardContext.Provider>
  );
}

export function useReward() {
  const ctx = useContext(RewardContext);
  if (!ctx) throw new Error("useReward must be used within RewardProvider");
  return ctx;
}
