import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Plus, Trophy, Star, Award, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useReward } from "@/context/RewardContext";
import { useAuth, UserRole } from "@/context/AuthContext";
import type { RewardFormat } from "@/context/RewardContext";

const FORMAT_LABELS: Record<RewardFormat, string> = {
  bonus: "Bonus",
  certificate: "Certificate",
  recognition: "Recognition",
  gift: "Gift",
};

const rewardTypes = [
  { icon: Trophy, label: "Bonus", color: "bg-primary/10 text-primary" },
  { icon: Award, label: "Certificate", color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  { icon: Star, label: "Recognition", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  { icon: Gift, label: "Gift", color: "bg-destructive/10 text-destructive" },
];

function rewardTargetLabel(
  reward: { eligibleEmployeeId?: string; eligibleRole?: string },
  userList: { id: string; name: string; role: string }[]
): string {
  if (reward.eligibleEmployeeId) {
    const u = userList.find((x) => x.id === reward.eligibleEmployeeId);
    return u ? `${u.name} (${u.role})` : "Specific user";
  }
  if (reward.eligibleRole === "controller") return "All controllers";
  if (reward.eligibleRole === "employee") return "All employees";
  return "All team";
}

export default function RewardsPage() {
  const { rewards, createReward, deleteReward } = useReward();
  const { users } = useAuth();
  const teamForRewards = users.filter((u) => u.role === "employee" || u.role === "controller");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    rewardType: "recognition" as RewardFormat,
    eligibleRole: "All" as UserRole | "All",
    eligibleEmployeeId: ""
  });

  const openAdd = () => {
    setForm({ title: "", description: "", imageUrl: "", rewardType: "recognition", eligibleRole: "All", eligibleEmployeeId: "" });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      return toast.error("Reward Title and Description are required.");
    }
    const res = await createReward({
      title: form.title,
      description: form.description,
      imageUrl: form.imageUrl,
      rewardType: form.rewardType,
      eligibleRole: form.eligibleRole === "All" ? undefined : form.eligibleRole,
      eligibleEmployeeId: form.eligibleEmployeeId || undefined,
    });

    if (res.success) {
      toast.success("Reward added and sent to designated users!");
      setShowModal(false);
    } else {
      toast.error(res.error);
    }
  };

  const handleRemove = async (id: string, title: string) => {
    const res = await deleteReward(id);
    if (res.success) toast.success("Reward removed", { description: title });
    else toast.error(res.error);
  };

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Rewards & Incentives</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Team-wide rewards surface on each team member home screen once. Choose a format when sending.
            </p>
          </div>
          <Button id="add-reward-btn" className="h-10 gap-2 rounded-lg px-5 text-sm font-medium" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Add Reward
          </Button>
        </motion.div>

        {/* Reward type preview cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {rewardTypes.map((type) => (
            <div key={type.label} className="rounded-2xl bg-card p-4 shadow-card">
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${type.color}`}>
                <type.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">{type.label} format</p>
            </div>
          ))}
        </motion.div>

        {/* Rewards table */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-card shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Sent Rewards</h2>
            <span className="text-xs text-muted-foreground">{rewards.length} reward{rewards.length !== 1 ? "s" : ""}</span>
          </div>
          {rewards.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">
              No rewards yet. Click <strong>Add Reward</strong> to create one.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Reward</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Format</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Target</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {rewards.map((reward) => (
                    <motion.tr key={reward.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b last:border-0 transition-colors hover:bg-muted/50 group"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-foreground">{reward.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-xs">{reward.description}</p>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {FORMAT_LABELS[reward.rewardType || "recognition"]}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{rewardTargetLabel(reward, users)}</td>
                      <td className="px-5 py-3 font-tabular text-sm text-muted-foreground">{new Date(reward.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-right">
                          <button onClick={() => handleRemove(reward.id, reward.title)}
                            className={`flex w-full items-center justify-end gap-2 px-3 py-2 text-sm text-destructive opacity-0 group-hover:opacity-100 transition-opacity`} >
                            <Trash2 className="h-4 w-4" />
                          </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </motion.div>
      </motion.div>

      {/* Add Reward Modal */}
      <AnimatePresence>
        {showModal && (
            <motion.div key="modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            >
              <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <h2 className="text-base font-bold text-foreground">Send Global Reward</h2>
                  <button onClick={() => setShowModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  <div>
                    <Label>Reward Title <span className="text-destructive">*</span></Label>
                    <Input placeholder="e.g. Employee of the Month" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
                  </div>
                  <div>
                    <Label>Message/Description <span className="text-destructive">*</span></Label>
                    <textarea rows={3} placeholder="Congratulations on..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none mt-1" />
                  </div>
                  <div>
                    <Label>Reward Image URL (Optional)</Label>
                    <Input placeholder="https://..." value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
                  </div>
                  <div>
                    <Label>Format</Label>
                    <select
                      value={form.rewardType}
                      onChange={(e) => setForm({ ...form, rewardType: e.target.value as RewardFormat })}
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="bonus">Bonus</option>
                      <option value="certificate">Certificate</option>
                      <option value="recognition">Recognition</option>
                      <option value="gift">Gift</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div>
                      <Label>Target Role</Label>
                      <select value={form.eligibleRole} onChange={(e) => setForm({ ...form, eligibleRole: e.target.value as UserRole | "All" })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                        <option value="All">All Roles</option>
                        <option value="controller">Controllers</option>
                        <option value="employee">Employees</option>
                      </select>
                    </div>
                    <div>
                      <Label>Specific Employee</Label>
                      <select value={form.eligibleEmployeeId} onChange={(e) => setForm({ ...form, eligibleEmployeeId: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm mt-1">
                        <option value="">Any (Use Role)</option>
                        {teamForRewards.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 h-9 gap-1.5"><Plus className="h-4 w-4" /> Send Reward</Button>
                  </div>
                </form>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
