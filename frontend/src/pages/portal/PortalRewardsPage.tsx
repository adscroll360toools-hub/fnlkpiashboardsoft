import { useMemo } from "react";
import { Award, Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useReward } from "@/context/RewardContext";
import { Button } from "@/components/ui/button";

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

  const handleDownloadImage = (imageUrl: string, title: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `${title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_reward`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                <div className="mb-3 overflow-hidden rounded-lg border bg-muted/30">
                  <img
                    src={reward.imageUrl}
                    alt={reward.title}
                    className="h-48 w-full object-contain p-2 sm:h-56"
                  />
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">{reward.description}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{new Date(reward.createdAt).toLocaleDateString()}</p>
                {reward.imageUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => handleDownloadImage(reward.imageUrl || "", reward.title)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
