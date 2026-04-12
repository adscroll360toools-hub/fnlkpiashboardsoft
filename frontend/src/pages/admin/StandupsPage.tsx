import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Plus, Clock, X, Trash2, AlertTriangle, Pencil, Loader2 } from "lucide-react";
import { stagger, fadeUp } from "@/lib/animations";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STANDUP_TIME = "09:35 AM";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function localYMD(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgoYMD(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localYMD(d);
}

export interface StandupRow {
  id: string;
  userId: string;
  userName: string;
  standupDate: string;
  yesterdayWork: string;
  todayPlan: string;
  blockers: string;
  submittedAt?: string;
}

function mapStandup(s: any): StandupRow {
  return {
    id: s.id || s._id,
    userId: s.userId,
    userName: s.userName || "",
    standupDate: s.standupDate,
    yesterdayWork: s.yesterdayWork || "",
    todayPlan: s.todayPlan || "",
    blockers: s.blockers || "None",
    submittedAt: s.submittedAt,
  };
}

export default function StandupsPage() {
  const { currentUser, users } = useAuth();
  const companyId = currentUser?.companyId;

  const isManager = currentUser?.role === "admin" || currentUser?.role === "controller";

  const teamForStandup = useMemo(
    () => users.filter((u) => u.role === "employee" || u.role === "controller"),
    [users]
  );

  const [standups, setStandups] = useState<StandupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [yesterdayWork, setYesterdayWork] = useState("");
  const [todayPlan, setTodayPlan] = useState("");
  const [blockers, setBlockers] = useState("None");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [historyDate, setHistoryDate] = useState(() => localYMD());
  const [modalStandupDate, setModalStandupDate] = useState<string | null>(null);

  const loadStandups = useCallback(async () => {
    if (!companyId) {
      setStandups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string> = {
        companyId,
        from: daysAgoYMD(120),
        to: localYMD(),
      };
      if (!isManager && currentUser?.id) params.userId = currentUser.id;
      const { standups: raw } = await api.standups.list(params);
      setStandups((raw || []).map(mapStandup));
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to load standups");
      setStandups([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, isManager, currentUser?.id]);

  useEffect(() => {
    loadStandups();
  }, [loadStandups]);

  const todayYmd = localYMD();
  const todayStandups = standups.filter((s) => s.standupDate === todayYmd);
  const todayCount = todayStandups.length;
  const expectedCount = teamForStandup.length;
  const pendingCount = Math.max(0, expectedCount - todayCount);

  const historyStandups = standups.filter((s) => s.standupDate === historyDate);

  const openCreate = () => {
    setEditingId(null);
    setModalStandupDate(null);
    setFormError("");
    if (isManager) {
      const first = teamForStandup[0];
      setSelectedUserId(first?.id || "");
    } else {
      setSelectedUserId(currentUser?.id || "");
    }
    setYesterdayWork("");
    setTodayPlan("");
    setBlockers("None");
    setShowModal(true);
  };

  const openEdit = (row: StandupRow) => {
    if (!isManager && row.userId !== currentUser?.id) return;
    setEditingId(row.id);
    setModalStandupDate(row.standupDate);
    setSelectedUserId(row.userId);
    setYesterdayWork(row.yesterdayWork);
    setTodayPlan(row.todayPlan);
    setBlockers(row.blockers || "None");
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !currentUser) return;
    if (!yesterdayWork.trim() || !todayPlan.trim()) {
      setFormError("Yesterday work and Today plan are required.");
      return;
    }
    const uid = isManager ? selectedUserId : currentUser.id;
    if (!uid) {
      setFormError("Select a team member.");
      return;
    }
    const u = users.find((x) => x.id === uid);
    setFormError("");
    setSubmitting(true);
    try {
      if (editingId) {
        await api.standups.update(editingId, {
          companyId,
          yesterdayWork: yesterdayWork.trim(),
          todayPlan: todayPlan.trim(),
          blockers: blockers.trim() || "None",
          userName: u?.name || "",
        });
        toast.success("Standup updated", { description: "Changes saved to the database." });
      } else {
        await api.standups.create({
          companyId,
          userId: uid,
          userName: u?.name || "",
          standupDate: todayYmd,
          yesterdayWork: yesterdayWork.trim(),
          todayPlan: todayPlan.trim(),
          blockers: blockers.trim() || "None",
        });
        toast.success("Standup saved", { description: `${u?.name || "Team member"} — submitted for ${todayYmd}.` });
      }
      setShowModal(false);
      await loadStandups();
    } catch (err: any) {
      setFormError(err?.message || "Save failed");
      toast.error(err?.message || "Failed to save standup");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (row: StandupRow) => {
    if (!isManager) return;
    if (!window.confirm(`Delete standup for ${row.userName} on ${row.standupDate}?`)) return;
    try {
      await api.standups.remove(row.id);
      toast.success("Standup removed");
      await loadStandups();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  const displayRows = historyDate === todayYmd ? todayStandups : historyStandups;

  if (!companyId) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
        Standups require a company workspace.
      </div>
    );
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Daily Standups</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Scheduled standup time: <span className="font-medium text-foreground">{STANDUP_TIME}</span> · Linked to each user and calendar date
            </p>
          </div>
          <Button id="record-standup-btn" className="h-10 gap-2 rounded-lg px-5 text-sm font-medium" onClick={openCreate}>
            <Plus className="h-4 w-4" /> {isManager ? "Record standup" : "Submit my standup"}
          </Button>
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-2xl bg-primary/5 border border-primary/20 p-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Clock className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Today — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </p>
            <p className="text-xs text-muted-foreground">
              {todayCount} submitted · {pendingCount} pending (of {expectedCount} team members)
            </p>
          </div>
          {pendingCount > 0 && isManager && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5 shrink-0">
              <AlertTriangle className="h-3.5 w-3.5" />
              {pendingCount} pending
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3">
          <Label className="text-xs text-muted-foreground shrink-0">View history by date</Label>
          <input
            type="date"
            value={historyDate}
            onChange={(e) => setHistoryDate(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          />
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setHistoryDate(todayYmd)}>
            Today
          </Button>
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-card p-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading standups…
            </div>
          ) : displayRows.length === 0 ? (
            <div className="rounded-2xl bg-card p-10 shadow-card text-center text-sm text-muted-foreground">
              No standups for {historyDate}. {historyDate === todayYmd ? "Click Submit to add one." : "Try another date."}
            </div>
          ) : (
            displayRows.map((standup) => (
              <motion.div
                key={standup.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card p-5 shadow-card group relative border"
              >
                {isManager && (
                  <div className="absolute right-3 top-3 flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(standup)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                      title="Edit standup"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(standup)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      title="Delete standup"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {!isManager && standup.userId === currentUser?.id && standup.standupDate === todayYmd && (
                  <button
                    type="button"
                    onClick={() => openEdit(standup)}
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                    title="Edit my standup"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}

                <div className="mb-3 flex flex-wrap items-center gap-2 pr-16">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{standup.userName || "User"}</span>
                  <span className="font-tabular text-xs text-muted-foreground">
                    {standup.standupDate}
                    {standup.submittedAt && ` · ${new Date(standup.submittedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}`}
                  </span>
                </div>
                <div className="space-y-2.5 pl-0 sm:pl-9">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Yesterday</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{standup.yesterdayWork}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Today</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{standup.todayPlan}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Blockers</p>
                    <p
                      className={`text-sm whitespace-pre-wrap ${
                        standup.blockers === "None" || !standup.blockers.trim()
                          ? "text-muted-foreground"
                          : "text-destructive font-medium"
                      }`}
                    >
                      {standup.blockers}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowModal(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{editingId ? "Edit standup" : "Daily standup"}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Date: {modalStandupDate || todayYmd} · Fields sync to the database
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowModal(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  {isManager && (
                    <div className="space-y-1.5">
                      <Label htmlFor="standup-user">Team member</Label>
                      <select
                        id="standup-user"
                        disabled={!!editingId}
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {teamForStandup.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="standup-yesterday">
                      Yesterday work <span className="text-destructive">*</span>
                    </Label>
                    <textarea
                      id="standup-yesterday"
                      rows={3}
                      required
                      placeholder="What you completed yesterday…"
                      value={yesterdayWork}
                      onChange={(e) => {
                        setYesterdayWork(e.target.value);
                        setFormError("");
                      }}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="standup-today">
                      Today plan <span className="text-destructive">*</span>
                    </Label>
                    <textarea
                      id="standup-today"
                      rows={3}
                      required
                      placeholder="What you will work on today…"
                      value={todayPlan}
                      onChange={(e) => {
                        setTodayPlan(e.target.value);
                        setFormError("");
                      }}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="standup-blockers">Blockers</Label>
                    <Input
                      id="standup-blockers"
                      placeholder='None or describe blockers'
                      value={blockers}
                      onChange={(e) => setBlockers(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  {formError && <p className="text-xs text-destructive">{formError}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="flex-1 h-9" disabled={submitting} onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1 h-9 gap-1.5" disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {editingId ? "Save changes" : "Submit"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
