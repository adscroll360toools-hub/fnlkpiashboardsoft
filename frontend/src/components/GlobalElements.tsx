import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, Trophy, Award, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useReward, AppReward } from "@/context/RewardContext";

const POPUP_KEY = "zaptiz_reward_popup_seen";

function loadSeen(): Record<string, boolean> {
  try {
    const s = localStorage.getItem(POPUP_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return {};
}

function markSeen(userId: string, rewardId: string) {
  const o = loadSeen();
  o[`${userId}:${rewardId}`] = true;
  localStorage.setItem(POPUP_KEY, JSON.stringify(o));
}

function wasSeen(userId: string, rewardId: string) {
  return !!loadSeen()[`${userId}:${rewardId}`];
}

export function GlobalElements() {
  const { currentUser } = useAuth();
  const { acknowledgeReward } = useReward();
  const [popupReward, setPopupReward] = useState<AppReward | null>(null);

  const checkPending = useCallback(async () => {
    if (!currentUser?.companyId || !currentUser.id) return;
    if (currentUser.role === "admin" || currentUser.role === "super_admin") return;
    try {
      const { rewards } = await api.rewards.pending({
        companyId: currentUser.companyId,
        userId: currentUser.id,
        userRole: currentUser.role,
      });
      const list = (rewards || []) as any[];
      const allowedRt = ["bonus", "certificate", "recognition", "gift"] as const;
      const mapped: AppReward[] = list.map((r) => ({
        id: r.id || r._id,
        title: r.title,
        description: r.description || "",
        imageUrl: r.imageUrl,
        rewardType: allowedRt.includes(r.rewardType) ? r.rewardType : "recognition",
        eligibleRole: r.eligibleRole,
        eligibleEmployeeId: r.eligibleEmployeeId,
        createdAt: r.created_at || r.createdAt,
      }));
      const first = mapped.find((r) => !wasSeen(currentUser.id, r.id));
      if (first) setPopupReward(first);
    } catch (e) {
      console.error(e);
    }
  }, [currentUser?.companyId, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    checkPending();
  }, [checkPending]);

  const TypeIcon =
    popupReward?.rewardType === "bonus"
      ? Trophy
      : popupReward?.rewardType === "certificate"
        ? Award
        : popupReward?.rewardType === "gift"
          ? Gift
          : Star;

  const dismiss = async () => {
    if (!popupReward || !currentUser) return;
    markSeen(currentUser.id, popupReward.id);
    await acknowledgeReward(popupReward.id);
    setPopupReward(null);
    await checkPending();
  };

  return (
    <AnimatePresence>
      {popupReward && (
        <motion.div
          key="reward-side-popup"
          initial={{ opacity: 0, x: 32, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 32, y: -8 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          className="fixed right-4 top-4 z-[300] w-[calc(100vw-2rem)] max-w-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reward-popup-title"
        >
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 shadow-2xl">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
            <button
              type="button"
              aria-label="Close reward notification"
              onClick={dismiss}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-200 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative p-5">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                  <TypeIcon className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-violet-300">
                    <Sparkles className="h-3.5 w-3.5" /> New reward
                  </p>
                  <h2 id="reward-popup-title" className="truncate text-lg font-bold tracking-tight text-white">
                    {popupReward.title}
                  </h2>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-300">{popupReward.description}</p>
              <Button className="mt-4 h-10 w-full rounded-lg bg-white text-sm font-semibold text-slate-900 hover:bg-slate-100" onClick={dismiss}>
                Mark as read
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
