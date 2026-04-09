import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Search, MoreHorizontal, X, Trash2, Edit, Award, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth, AppUser, UserRole } from "@/context/AuthContext";
import { useKPI } from "@/context/KPIContext";

const DEPARTMENTS = ["CEO", "Management", "Content", "Design", "Marketing", "Video", "Analytics", "Other"];
const ROLES = ["Core Admin", "Project Manager", "Video Editor", "Graphic Designer", "Content Writer", "Marketing Strategist", "Content Strategist", "Senior Graphic Designer", "Business Analyst", "Other"];

const emptyForm = { name: "", email: "", role: "employee" as UserRole, position: ROLES[ ROLES.length - 1], department: DEPARTMENTS[2] };

export default function EmployeesPage() {
  const { users, addUser, removeUser, updateUser, currentUser } = useAuth();
  const { qualityMetrics, addQualityScore, qualityScores } = useKPI();
  
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState<AppUser | null>(null);
  
  const [editTarget, setEditTarget] = useState<AppUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Score modal state
  const [metricScores, setMetricScores] = useState<Record<string, number>>({});

  const filtered = users.filter((e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.position || "").toLowerCase().includes(search.toLowerCase())
  );

  const isAdmin = currentUser?.role === "admin";
  const isController = currentUser?.role === "controller";

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (emp: AppUser) => {
    setEditTarget(emp);
    setForm({ 
      name: emp.name, 
      email: emp.email, 
      role: emp.role, 
      position: emp.position || ROLES[ROLES.length - 1], 
      department: emp.department || DEPARTMENTS[2] 
    });
    setFormError("");
    setShowModal(true);
    setMenuOpen(null);
  };

  const openScoreModal = (emp: AppUser) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const existing = qualityScores.find(s => s.employeeId === emp.id && s.month === currentMonth);
    
    const initial: Record<string, number> = {};
    qualityMetrics.forEach(m => {
        initial[m.id] = existing?.breakdown[m.id] ?? 80; // default 80
    });
    setMetricScores(initial);
    setShowScoreModal(emp);
    setMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    const emp = users.find((e) => e.id === id);
    if (emp?.email === "basith@adscroll360.com") {
        toast.error("Cannot remove super admin");
        setMenuOpen(null);
        return;
    }
    await removeUser(id);
    setMenuOpen(null);
    toast.error("Employee removed", { description: emp?.name });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.email.trim()) { setFormError("Email is required."); return; }

    if (editTarget) {
      await updateUser(editTarget.id, { ...form });
      toast.success("Employee updated!", { description: form.name });
    } else {
      const defaultPw = `${form.name.split(' ')[0]}@123`;
      const res = await addUser({ ...form, password: defaultPw });
      if (res.success) {
        toast.success("Employee added!", { description: `${form.name} (Password: ${defaultPw})` });
      } else {
        setFormError(res.error || "Failed to add user");
        return;
      }
    }
    setShowModal(false);
  };

  const handleScoreSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!showScoreModal) return;

      // Calculate weighted total
      let total = 0;
      qualityMetrics.forEach(m => {
          total += (metricScores[m.id] || 0) * (m.weight / 100);
      });

      const res = await addQualityScore({
          employeeId: showScoreModal.id,
          month: new Date().toISOString().slice(0, 7),
          score: Math.round(total),
          breakdown: metricScores
      });

      if (res.success) {
          toast.success(`Quality Score assigned to ${showScoreModal.name}!`, { description: `Final Score: ${Math.round(total)}/100` });
          setShowScoreModal(null);
      } else {
          toast.error(res.error);
      }
  };

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Employees</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage real team accounts and performance scores</p>
          </div>
          {isAdmin && (
            <Button id="add-employee-btn" className="h-10 gap-2 rounded-lg px-5 text-sm font-medium" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Add Employee
            </Button>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="employee-search"
            placeholder="Search employees by name, role, dept..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-lg border-0 bg-muted pl-10 text-sm"
          />
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-2xl bg-card shadow-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-medium text-foreground">No employees found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Employee</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">App Role</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Department</th>
                  <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Latest Score</th>
                  <th className="px-5 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const currentMonth = new Date().toISOString().slice(0, 7);
                  const latest = qualityScores.find(s => s.employeeId === emp.id && s.month === currentMonth);
                  
                  return (
                    <tr key={emp.id} className="border-b last:border-0 transition-colors hover:bg-muted/50 group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                              {emp.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.position}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground hidden sm:table-cell capitalize font-medium">{emp.role}</td>
                      <td className="px-5 py-3 text-sm text-muted-foreground hidden md:table-cell">{emp.department || "—"}</td>
                      <td className="px-5 py-3 text-right">
                         {latest ? (
                            <div className="inline-flex flex-col items-end">
                               <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${latest.score >= 85 ? 'bg-green-100 text-green-700' : latest.score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                  {latest.score}/100
                               </span>
                               <span className="text-[9px] text-muted-foreground mt-0.5">{new Date(latest.createdAt).toLocaleDateString()}</span>
                            </div>
                         ) : (
                            <span className="text-xs text-muted-foreground italic">No score yet</span>
                         )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={() => setMenuOpen(menuOpen === emp.id ? null : emp.id)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          <AnimatePresence>
                            {menuOpen === emp.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.1 }}
                                className="absolute right-0 top-8 z-10 w-44 rounded-xl border bg-card shadow-lg py-1"
                              >
                                {(isAdmin || isController) && (
                                  <button onClick={() => openScoreModal(emp)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5">
                                    <Award className="h-3.5 w-3.5" /> Quality Score
                                  </button>
                                )}
                                <button onClick={() => openEdit(emp)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">
                                  <Edit className="h-3.5 w-3.5" /> Edit Details
                                </button>
                                {isAdmin && emp.email !== "basith@adscroll360.com" && (
                                  <button onClick={() => handleDelete(emp.id)} className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-3.5 w-3.5" /> Remove Account
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </motion.div>
      </motion.div>

      {/* Quality Score Modal */}
      <AnimatePresence>
          {showScoreModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-card w-full max-w-sm rounded-2xl shadow-2xl border border-border overflow-hidden">
                      <div className="px-6 py-4 border-b bg-primary/5 flex items-center justify-between">
                          <div>
                            <h3 className="font-bold text-foreground">Quality Score Assignment</h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">For {showScoreModal.name}</p>
                          </div>
                          <button onClick={() => setShowScoreModal(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4"/></button>
                      </div>
                      <form onSubmit={handleScoreSubmit} className="p-6 space-y-5">
                          {qualityMetrics.map(m => (
                              <div key={m.id} className="space-y-1.5">
                                  <div className="flex justify-between items-end">
                                      <Label className="text-xs font-bold text-foreground">{m.metric} <span className="text-[10px] font-normal text-muted-foreground">({m.weight}%)</span></Label>
                                      <span className="text-xs font-bold text-primary">{metricScores[m.id] || 0}/100</span>
                                  </div>
                                  <input type="range" min="0" max="100" step="1" value={metricScores[m.id] || 0}
                                      onChange={(e) => setMetricScores({...metricScores, [m.id]: Number(e.target.value)})}
                                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary" />
                              </div>
                          ))}
                          
                          <div className="pt-2 border-t mt-4">
                              <div className="flex justify-between items-center mb-4">
                                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Calculated Score</span>
                                  <span className="text-2xl font-black text-primary">
                                    {Math.round(qualityMetrics.reduce((acc, m) => acc + (metricScores[m.id] || 0) * (m.weight / 100), 0))}/100
                                  </span>
                              </div>
                              <Button type="submit" className="w-full h-10 gap-2 font-bold uppercase tracking-wider text-xs">
                                  <Star className="h-4 w-4" /> Finalize & Post Score
                              </Button>
                          </div>
                      </form>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
            <motion.div key="modal" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <h2 className="text-base font-semibold text-foreground">{editTarget ? "Edit Employee" : "Add Employee"}</h2>
                  <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  <div className="space-y-1.5"><Label>Full Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9" /></div>
                  <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Role</Label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="employee">Employee</option><option value="controller">Controller</option><option value="admin">Admin</option></select></div>
                    <div className="space-y-1.5"><Label>Dept</Label><select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
                  </div>
                  <div className="space-y-1.5"><Label>Position</Label><select value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                  {formError && <p className="text-xs font-semibold text-destructive bg-destructive/10 p-2 rounded">{formError}</p>}
                  <Button type="submit" className="w-full h-9">{editTarget ? "Save Changes" : "Create Account"}</Button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
