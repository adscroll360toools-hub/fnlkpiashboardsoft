import { useMemo } from "react";
import { Award } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useReward } from "@/context/RewardContext";

export default function PortalRewardsPage() {
  const { currentUser } = useAuth();
  const { rewards } = useReward();

  const myRewards = useMemo(() => {
    if (!currentUser) return [];
    return rewards
      .filter((r) => {
        if (r.eligibleEmployeeId) return r.eligibleEmployeeId === currentUser.id;
        if (r.eligibleRole && r.eligibleRole !== "All") return r.eligibleRole === currentUser.role;
        return currentUser.role === "employee" || currentUser.role === "controller";
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [currentUser, rewards]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Rewards</h1>
        <p className="text-sm text-muted-foreground">Rewards and recognitions assigned to you.</p>
      </div>
      {myRewards.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No rewards available yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {myRewards.map((reward) => (
            <div key={reward.id} className="rounded-2xl border bg-card p-4 shadow-card">
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{reward.title}</p>
                  <p className="text-xs capitalize text-muted-foreground">{reward.rewardType || "recognition"}</p>
                </div>
              </div>
              {reward.imageUrl ? (
                <img src={reward.imageUrl} alt={reward.title} className="mb-3 h-36 w-full rounded-lg object-cover" />
              ) : null}
              <p className="text-sm text-muted-foreground">{reward.description}</p>
              <p className="mt-3 text-xs text-muted-foreground">
                {new Date(reward.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
