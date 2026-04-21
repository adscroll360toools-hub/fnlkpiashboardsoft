import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus, X, Trash2, Loader2 } from "lucide-react";
import { KPIProgressBar } from "@/components/KPIProgressBar";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface SkillRow {
  id: string;
  userId: string;
  userName: string;
  role: string;
  skill: string;
  progress: number;
  target: number;
}

const roleSkills: Record<string, string[]> = {
  "Video Editor": ["Color Grading", "Storytelling", "Sound Design", "Motion Graphics"],
  "Graphic Designer": ["Motion Graphics", "AI Tools", "3D Design", "Typography"],
  "Content Writer": ["Hook Writing", "SEO Captions", "Copywriting", "Storytelling"],
};

function mapSkill(s: any): SkillRow {
  return {
    id: s.id || s._id,
    userId: s.userId,
    userName: s.userName || "",
    role: s.role || "",
    skill: s.skill,
    progress: s.progress ?? 0,
    target: s.target ?? 100,
  };
}

export default function SkillsPage() {
  const { users, currentUser } = useAuth();
  const companyId = currentUser?.companyId;
  const isAdmin = currentUser?.role === "admin";
  const isController = currentUser?.role === "controller";
  const canAssign = isAdmin || isController;

  const teamMembers = users.filter((u) => u.role === "employee" || u.role === "controller");

  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    userId: teamMembers[0]?.id || "",
    role: "",
    skill: "",
    progress: 50,
    target: 100,
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setSkills([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { skills: raw } = await api.skills.list(companyId);
      const mapped = (raw || []).map(mapSkill);
      if (currentUser?.role === "employee" || currentUser?.role === "controller") {
        setSkills(mapped.filter((s) => s.userId === currentUser.id));
      } else {
        setSkills(mapped);
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to load skills");
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    const first = teamMembers[0];
    setForm({
      userId: first?.id || "",
      role: first ? (first.position || first.role) : "",
      skill: "",
      progress: 50,
      target: 100,
    });
    setFormError("");
    setShowModal(true);
  };

  const onPickEmployee = (userId: string) => {
    const u = teamMembers.find((x) => x.id === userId);
    setForm((f) => ({
      ...f,
      userId,
      role: u ? (u.position || u.role) : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    if (!form.skill.trim()) {
      setFormError("Skill name is required.");
      return;
    }
    const u = teamMembers.find((x) => x.id === form.userId);
    if (!u) {
      setFormError("Select a team member.");
      return;
    }
    setSaving(true);
    try {
      await api.skills.create({
        companyId,
        userId: u.id,
        userName: u.name,
        role: form.role.trim() || u.position || u.role,
        skill: form.skill.trim(),
        progress: form.progress,
        target: form.target,
      });
      toast.success("Skill saved to database", { description: `${form.skill} → ${u.name}` });
      setShowModal(false);
      await load();
    } catch (err: any) {
      setFormError(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleProgressUpdate = async (id: string, newProgress: number) => {
    if (!companyId) return;
    const v = Math.min(100, Math.max(0, newProgress));
    try {
      await api.skills.update(id, { companyId, progress: v });
      setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, progress: v } : s)));
      toast.success("Progress updated");
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  };

  const handleRemove = async (row: SkillRow) => {
    if (!companyId) return;
    try {
      await api.skills.remove(row.id, companyId);
      toast.success("Skill removed");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  if (!companyId) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">Skills require a company workspace.</div>
    );
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Skill Growth</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track skill development — stored in the database</p>
          </div>
          {canAssign && (
            <Button id="assign-skill-btn" className="h-10 gap-2 rounded-lg px-5 text-sm font-medium" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Assign Skill
            </Button>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">This Week&apos;s Learning</h2>
            <span className="text-xs text-muted-foreground">
              {skills.length} skill{skills.length !== 1 ? "s" : ""}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : skills.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No skills yet. Click <strong>Assign Skill</strong> to add one.
            </p>
          ) : (
            <div className="space-y-5">
              {skills.map((item) => (
                <div key={item.id} className="group flex items-center gap-4">
                  <div className="w-36 shrink-0">
                    <p className="text-sm font-medium text-foreground">{item.userName}</p>
                    <p className="text-xs capitalize text-muted-foreground">{item.role || "—"}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <KPIProgressBar label={item.skill} current={item.progress} target={item.target} unit="%" />
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleProgressUpdate(item.id, item.progress - 5)}
                      className="h-7 w-7 rounded-md bg-muted text-sm font-bold text-muted-foreground hover:bg-border"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProgressUpdate(item.id, item.progress + 5)}
                      className="h-7 w-7 rounded-md bg-muted text-sm font-bold text-muted-foreground hover:bg-border"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive transition-colors hover:bg-destructive hover:text-white"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-foreground">Recommended Skills by Role</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {Object.entries(roleSkills).map(([role, skillList]) => (
              <div key={role} className="rounded-xl bg-muted p-4">
                <div className="mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{role}</p>
                </div>
                <ul className="space-y-1.5">
                  {skillList.map((sk) => (
                    <li key={sk} className="text-xs text-muted-foreground">
                      • {sk}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
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
              onClick={() => !saving && setShowModal(false)}
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
              <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <h2 className="text-base font-semibold text-foreground">Assign Skill</h2>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowModal(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="skill-employee">Team member</Label>
                      <select
                        id="skill-employee"
                        value={form.userId}
                        onChange={(e) => onPickEmployee(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {teamMembers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="skill-role">Role / title</Label>
                      <Input
                        id="skill-role"
                        placeholder="e.g. Video Editor"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="skill-name">
                      Skill name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="skill-name"
                      placeholder="e.g. Color Grading"
                      value={form.skill}
                      onChange={(e) => {
                        setForm({ ...form, skill: e.target.value });
                        setFormError("");
                      }}
                      className="h-9"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="skill-progress">Progress (%)</Label>
                      <Input
                        id="skill-progress"
                        type="number"
                        min={0}
                        max={100}
                        value={form.progress}
                        onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="skill-target">Target (%)</Label>
                      <Input
                        id="skill-target"
                        type="number"
                        min={1}
                        max={100}
                        value={form.target}
                        onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  {formError && <p className="text-xs text-destructive">{formError}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="h-9 flex-1" disabled={saving} onClick={() => setShowModal(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="h-9 flex-1 gap-1.5" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Save
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
