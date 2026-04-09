import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Plus, X, Trash2 } from "lucide-react";
import { KPIProgressBar } from "@/components/KPIProgressBar";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface SkillEntry {
  id: number;
  employee: string;
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

const initialSkills: SkillEntry[] = [];

export default function SkillsPage() {
  const { users } = useAuth();
  const activeEmployees = users.filter(u => u.role === "employee").map(u => u.name);

  const [skills, setSkills] = useState<SkillEntry[]>(initialSkills);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ employee: activeEmployees[0] || "", role: "", skill: "", progress: 50, target: 100 });
  const [formError, setFormError] = useState("");

  const openAdd = () => { setForm({ employee: activeEmployees[0] || "", role: "", skill: "", progress: 50, target: 100 }); setFormError(""); setShowModal(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.skill.trim()) { setFormError("Skill name is required."); return; }
    setSkills((prev) => [{ id: Date.now(), ...form }, ...prev]);
    toast.success("Skill assigned!", { description: `${form.skill} → ${form.employee}` });
    setShowModal(false);
  };

  const handleProgressUpdate = (id: number, newProgress: number) => {
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, progress: Math.min(100, Math.max(0, newProgress)) } : s));
    toast.success("Progress updated!");
  };

  const handleRemove = (id: number, name: string, employee: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
    toast.error("Skill removed", { description: `${name} — ${employee}` });
  };

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Skill Growth</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track weekly skill development for each employee</p>
          </div>
          <Button id="assign-skill-btn" className="h-10 gap-2 rounded-lg px-5 text-sm font-medium" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Assign Skill
          </Button>
        </motion.div>

        {/* Current progress */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">This Week's Learning</h2>
            <span className="text-xs text-muted-foreground">{skills.length} skill{skills.length !== 1 ? "s" : ""}</span>
          </div>
          {skills.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No skills assigned yet. Click <strong>Assign Skill</strong> to get started.</p>
          ) : (
            <div className="space-y-5">
              {skills.map((item) => (
                <div key={item.id} className="flex items-center gap-4 group">
                  <div className="w-28 shrink-0">
                    <p className="text-sm font-medium text-foreground">{item.employee}</p>
                    <p className="text-xs text-muted-foreground">{item.role || "—"}</p>
                  </div>
                  <div className="flex-1">
                    <KPIProgressBar label={item.skill} current={item.progress} target={item.target} unit="%" />
                  </div>
                  {/* Progress controls + remove */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleProgressUpdate(item.id, item.progress - 5)}
                      className="h-7 w-7 rounded-md bg-muted text-sm font-bold text-muted-foreground hover:bg-border"
                      title="Decrease by 5%"
                    >-</button>
                    <button
                      onClick={() => handleProgressUpdate(item.id, item.progress + 5)}
                      className="h-7 w-7 rounded-md bg-muted text-sm font-bold text-muted-foreground hover:bg-border"
                      title="Increase by 5%"
                    >+</button>
                    <button
                      onClick={() => handleRemove(item.id, item.skill, item.employee)}
                      className="h-7 w-7 rounded-md bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors flex items-center justify-center"
                      title="Remove skill"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Role-based skills */}
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
                    <li key={sk} className="text-xs text-muted-foreground">• {sk}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Assign Skill Modal */}
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
                  <h2 className="text-base font-semibold text-foreground">Assign Skill</h2>
                  <button onClick={() => setShowModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="skill-employee">Employee</Label>
                      <select id="skill-employee" value={form.employee}
                        onChange={(e) => setForm({ ...form, employee: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        {activeEmployees.map((emp) => <option key={emp} value={emp}>{emp}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="skill-role">Role</Label>
                      <Input id="skill-role" placeholder="e.g. Video Editor"
                        value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-9" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="skill-name">Skill Name <span className="text-destructive">*</span></Label>
                    <Input id="skill-name" placeholder="e.g. Color Grading"
                      value={form.skill} onChange={(e) => { setForm({ ...form, skill: e.target.value }); setFormError(""); }}
                      className="h-9" autoFocus />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="skill-progress">Current Progress (%)</Label>
                      <Input id="skill-progress" type="number" min={0} max={100}
                        value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="skill-target">Target (%)</Label>
                      <Input id="skill-target" type="number" min={1} max={100}
                        value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} className="h-9" />
                    </div>
                  </div>
                  {formError && <p className="text-xs text-destructive">{formError}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 h-9 gap-1.5"><Plus className="h-4 w-4" /> Assign</Button>
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
