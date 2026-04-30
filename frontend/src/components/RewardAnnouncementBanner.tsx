import { useEffect, useMemo, useState } from "react";
import { Award, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useReward } from "@/context/RewardContext";
import { api } from "@/lib/api";

export function RewardAnnouncementBanner() {
  const { currentUser } = useAuth();
  const { acknowledgeReward } = useReward();
  const [pendingRewardIds, setPendingRewardIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadPending = async () => {
      if (!currentUser?.companyId || !currentUser?.id || !currentUser?.role) return;
      if (currentUser.role !== "employee" && currentUser.role !== "controller") return;
      try {
        const { rewards } = await api.rewards.pending({
          companyId: currentUser.companyId,
          userId: currentUser.id,
          userRole: currentUser.role,
        });
        setPendingRewardIds(new Set((rewards || []).map((r: any) => r.id || r._id)));
      } catch (e) {
        console.error("Failed to load pending rewards for banner:", e);
      }
    };
    loadPending();
  }, [currentUser?.companyId, currentUser?.id, currentUser?.role]);

  const pendingId = useMemo(() => {
    const ids = Array.from(pendingRewardIds);
    return ids.length > 0 ? ids[0] : null;
  }, [pendingRewardIds]);

  if (!pendingId) return null;

  const dismiss = async () => {
    await acknowledgeReward(pendingId);
    setPendingRewardIds((prev) => {
      const copy = new Set(prev);
      copy.delete(pendingId);
      return copy;
    });
  };

  return (
    <div className="mx-4 mt-4 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-100 to-amber-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-500/20 p-2 text-amber-700">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-amber-900">New reward announcement</p>
            <p className="text-sm text-amber-800">
              A reward has been assigned to you or your role. This alert is shown once.
            </p>
          </div>
        </div>
        <button onClick={dismiss} className="rounded-md p-1 text-amber-700 hover:bg-amber-200/70">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
