import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppUser } from "@/context/AuthContext";
import type { TaskAccessControl, TaskAccessLevel } from "@/lib/taskAccess";
import { TASK_ACCESS_LEVELS } from "@/lib/taskAccess";

type Tab = "role" | "person";

interface Props {
  open: boolean;
  onClose: () => void;
  pool: AppUser[];
  value: TaskAccessControl;
  onChange: (next: TaskAccessControl) => void;
}

function levelColor(level: TaskAccessLevel): string {
  if (level === "Admin") return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  if (level === "Editor") return "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/30";
  return "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/30";
}

export function TaskRolesPermissionsPicker({ open, onClose, pool, value, onChange }: Props) {
  const [tab, setTab] = useState<Tab>("role");
  const [personId, setPersonId] = useState("");
  const [personLevel, setPersonLevel] = useState<TaskAccessLevel>("Editor");

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    pool.forEach((u) => m.set(u.id, u.name));
    return m;
  }, [pool]);

  const addRole = (level: TaskAccessLevel) => {
    if (value.roleGrants.includes(level)) return;
    onChange({ ...value, roleGrants: [...value.roleGrants, level] });
  };

  const removeRole = (level: TaskAccessLevel) => {
    onChange({ ...value, roleGrants: value.roleGrants.filter((r) => r !== level) });
  };

  const addPerson = () => {
    if (!personId) return;
    const rest = value.userGrants.filter((g) => g.userId !== personId);
    onChange({ ...value, userGrants: [...rest, { userId: personId, access: personLevel }] });
    setPersonId("");
  };

  const removePersonGrant = (userId: string) => {
    onChange({ ...value, userGrants: value.userGrants.filter((g) => g.userId !== userId) });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed left-1/2 top-1/2 z-[121] w-[min(100vw-1.5rem,420px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Roles &amp; permissions</h3>
              <button type="button" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 flex rounded-lg border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setTab("role")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium ${
                  tab === "role" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Shield className="h-3.5 w-3.5" /> By role
              </button>
              <button
                type="button"
                onClick={() => setTab("person")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium ${
                  tab === "person" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                <Users className="h-3.5 w-3.5" /> By person
              </button>
            </div>

            {tab === "role" ? (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground">Grant visibility for everyone with this task role label.</p>
                <div className="flex flex-wrap gap-2">
                  {TASK_ACCESS_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      disabled={value.roleGrants.includes(lvl)}
                      onClick={() => addRole(lvl)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition hover:opacity-90 disabled:opacity-40 ${levelColor(lvl)}`}
                    >
                      + {lvl}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">Assign a person and their access level.</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Person</label>
                    <select
                      value={personId}
                      onChange={(e) => setPersonId(e.target.value)}
                      className="flex h-10 w-full min-h-[44px] rounded-md border border-input bg-background px-3 text-base sm:text-sm"
                    >
                      <option value="">Select…</option>
                      {pool.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full space-y-1 sm:w-32">
                    <label className="text-[11px] font-medium text-muted-foreground">Access</label>
                    <select
                      value={personLevel}
                      onChange={(e) => setPersonLevel(e.target.value as TaskAccessLevel)}
                      className="flex h-10 w-full min-h-[44px] rounded-md border border-input bg-background px-3 text-base sm:text-sm"
                    >
                      {TASK_ACCESS_LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Button type="button" size="sm" className="w-full" disabled={!personId} onClick={addPerson}>
                  Add person
                </Button>
              </div>
            )}

            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">Current selections</p>
              <div className="flex min-h-[2.5rem] flex-wrap gap-1.5">
                {value.roleGrants.map((lvl) => (
                  <span
                    key={`role-${lvl}`}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${levelColor(lvl)}`}
                  >
                    Role: {lvl}
                    <button type="button" className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10" onClick={() => removeRole(lvl)} aria-label={`Remove ${lvl}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {value.userGrants.map((g) => (
                  <span
                    key={g.userId}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${levelColor(g.access)}`}
                  >
                    {nameById.get(g.userId) || g.userId} — {g.access}
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
                      onClick={() => removePersonGrant(g.userId)}
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {value.roleGrants.length === 0 && value.userGrants.length === 0 ? (
                  <span className="text-xs italic text-muted-foreground">None yet</span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={onClose}>
                Done
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
