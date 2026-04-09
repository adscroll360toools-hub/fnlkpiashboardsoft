import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Plus, Clock, X, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface Standup {
  id: number;
  employee: string;
  date: string;
  time: string;
  yesterday: string;
  today: string;
  blockers: string;
}

const initialStandups: Standup[] = [];

export default function StandupsPage() {
  const { users } = useAuth();
  const activeEmployees = users.filter(u => u.role === "employee").map(u => u.name);
  const employeeCount = activeEmployees.length;

  const [standups, setStandups] = useState<Standup[]>(initialStandups);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee: activeEmployees[0] || "", yesterday: "", today: "", blockers: "None" });
  const [formError, setFormError] = useState("");

  const openAdd = () => { setForm({ employee: activeEmployees[0] || "", yesterday: "", today: "", blockers: "None" }); setFormError(""); setShowModal(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.yesterday.trim() || !form.today.trim()) {
      setFormError("Yesterday and Today fields are required.");
      return;
    }
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    setStandups((prev) => [
      { id: Date.now(), employee: form.employee, date: dateStr, time: timeStr, yesterday: form.yesterday, today: form.today, blockers: form.blockers || "None" },
      ...prev,
    ]);
    toast.success("Standup recorded!", { description: `${form.employee}'s standup submitted.` });
    setShowModal(false);
  };

  const handleRemove = (id: number, employee: string) => {
    setStandups((prev) => prev.filter((s) => s.id !== id));
    toast.error("Standup removed", { description: `${employee}'s entry deleted.` });
  };

  const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const todayCount = standups.filter((s) => s.date === todayStr).length;

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Daily Standups</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track daily meeting responses · Standup at 09:35 AM</p>
          </div>
          <Button id="record-standup-btn" className="h-10 gap-2 rounded-lg px-5 text-sm font-medium" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Record Standup
          </Button>
        </motion.div>

        {/* Today's info bar */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Today's Standup — {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            <p className="text-xs text-muted-foreground">
              {todayCount} of {employeeCount} employees have submitted responses
            </p>
          </div>
          {/* Missing employees */}
          {todayCount < employeeCount && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {employeeCount - todayCount} pending
            </div>
          )}
        </motion.div>

        {/* Standup cards */}
        <motion.div variants={fadeUp} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {standups.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl bg-card p-10 shadow-card text-center text-sm text-muted-foreground">
                No standups recorded yet. Click <strong>Record Standup</strong> to add one.
              </motion.div>
            ) : (
              standups.map((standup) => (
                <motion.div
                  key={standup.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="rounded-2xl bg-card p-5 shadow-card group relative"
                >
                  {/* Remove button — appears on hover */}
                  <button
                    onClick={() => handleRemove(standup.id, standup.employee)}
                    className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                    title="Remove this standup"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{standup.employee}</span>
                    <span className="font-tabular text-xs text-muted-foreground ml-auto pr-8">{standup.date} · {standup.time}</span>
                  </div>
                  <div className="space-y-2.5 pl-9">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Yesterday</p>
                      <p className="text-sm text-foreground">{standup.yesterday}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Today</p>
                      <p className="text-sm text-foreground">{standup.today}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Blockers</p>
                      <p className={`text-sm ${standup.blockers === "None" ? "text-muted-foreground" : "text-destructive font-medium"}`}>
                        {standup.blockers}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* Record Standup Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
            <motion.div key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">Record Standup</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Daily standup for {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                  <button onClick={() => setShowModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="standup-employee">Employee</Label>
                    <select id="standup-employee" value={form.employee}
                      onChange={(e) => setForm({ ...form, employee: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                      {activeEmployees.map((emp) => <option key={emp} value={emp}>{emp}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="standup-yesterday">What did you do yesterday? <span className="text-destructive">*</span></Label>
                    <textarea id="standup-yesterday" rows={2} placeholder="Completed task, attended meeting…"
                      value={form.yesterday}
                      onChange={(e) => { setForm({ ...form, yesterday: e.target.value }); setFormError(""); }}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      autoFocus />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="standup-today">What will you do today? <span className="text-destructive">*</span></Label>
                    <textarea id="standup-today" rows={2} placeholder="Working on design, writing blog…"
                      value={form.today}
                      onChange={(e) => { setForm({ ...form, today: e.target.value }); setFormError(""); }}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="standup-blockers">Any blockers?</Label>
                    <Input id="standup-blockers" placeholder='Type "None" if no blockers'
                      value={form.blockers} onChange={(e) => setForm({ ...form, blockers: e.target.value })} className="h-9" />
                  </div>
                  {formError && <p className="text-xs text-destructive">{formError}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 h-9 gap-1.5"><Plus className="h-4 w-4" /> Submit</Button>
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
