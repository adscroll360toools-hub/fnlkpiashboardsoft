import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles, Trophy, Award, Star } from "lucide-react";
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
          key="reward-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reward-popup-title"
        >
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 shadow-2xl"
          >
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />
            <div className="relative p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                <TypeIcon className="h-8 w-8 text-white" />
              </div>
              <p className="mb-1 flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-widest text-violet-300">
                <Sparkles className="h-3.5 w-3.5" /> New reward
              </p>
              <h2 id="reward-popup-title" className="text-2xl font-bold tracking-tight text-white">
                {popupReward.title}
              </h2>
              <p className="mt-4 text-left text-sm leading-relaxed text-slate-300">{popupReward.description}</p>
              <Button className="mt-8 h-11 w-full rounded-xl bg-white text-base font-semibold text-slate-900 hover:bg-slate-100" onClick={dismiss}>
                Awesome, thanks!
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
