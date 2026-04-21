import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KPIProgressBar } from "@/components/KPIProgressBar";
import { Target, Plus, Edit, X, Save, Users, Building, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useKPI, KPIType, QualityMetric, type AppKPI } from "@/context/KPIContext";
import { useAuth } from "@/context/AuthContext";
import { getEffectivePermissions } from "@/lib/permissions";

const DEPARTMENTS = ["Content", "Design", "Management", "Marketing", "Video", "Analytics"];

/** Same rules as backend: controller KPI page only lists rows scoped to them. */
function kpiVisibleToControllerRow(k: AppKPI, controllerId: string): boolean {
  if (!k.managedByControllerId || k.managedByControllerId !== controllerId) return false;
  if (k.type !== "Individual") return true;
  const ids = (k.managedEmployeeIds ?? []).map(String);
  if (ids.length === 0) return true;
  return !!k.assignedToId && ids.includes(String(k.assignedToId));
}

const emptyForm = { 
  title: "", 
  type: "Company" as KPIType, 
  dailyMin: 1, 
  dailyMax: 2, 
  target: 20, 
  unit: "pieces",
  assignedToId: "",
  groupId: "",
  controllerScopeId: "",
};

export default function KPITargetsPage() {
  const { kpis, qualityMetrics, createKPI, deleteKPI, updateKPIProgress, updateQualityMetrics } = useKPI();
  const { users, currentUser, companyRoles } = useAuth();
  const perms = getEffectivePermissions(currentUser, companyRoles);
  
  const [activeTab, setActiveTab] = useState<KPIType | "Scoring">("Company");
  const [showModal, setShowModal] = useState(false);
  const [editingProgressId, setEditingProgressId] = useState<string | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(0);
  const [form, setForm] = useState(emptyForm);
  const [selectedManagedEmployeeIds, setSelectedManagedEmployeeIds] = useState<string[]>([]);
  const [formError, setFormError] = useState("");

  // Scoring management state
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [tempMetrics, setTempMetrics] = useState<QualityMetric[]>([]);

  const isAdmin = currentUser?.role === "admin";
  const isController = currentUser?.role === "controller";
  const canCreate = isAdmin || (isController && perms.kpi_manage);
  const canDeleteKpi = isAdmin || (isController && perms.kpi_manage);
  const teamForKpi = users.filter(u => u.role === "employee" || u.role === "controller");

  const kpisForRole = useMemo(() => {
    if (currentUser?.role === "controller" && currentUser.id) {
      return kpis.filter((k) => kpiVisibleToControllerRow(k, currentUser.id));
    }
    return kpis;
  }, [kpis, currentUser?.role, currentUser?.id]);

  const filteredKpis = useMemo(() => {
    if (activeTab === "Scoring") return [];
    return kpisForRole.filter((k) => k.type === activeTab);
  }, [kpisForRole, activeTab]);

  const openAdd = () => {
    setForm({ ...emptyForm, type: activeTab === "Scoring" ? "Company" : (activeTab as KPIType) });
    setSelectedManagedEmployeeIds([]);
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    if (form.type === "Individual" && !form.assignedToId) { setFormError("Employee assignment is required."); return; }
    if (form.type === "Group" && !form.groupId) { setFormError("Group/Department is required."); return; }

    const assignedUser = teamForKpi.find(u => u.id === form.assignedToId);
    
    const managedByControllerId = isAdmin
      ? form.controllerScopeId || undefined
      : currentUser?.id;

    const res = await createKPI({
      ...form,
      managedByControllerId,
      managedEmployeeIds: selectedManagedEmployeeIds,
      assignedToName: assignedUser?.name
    });

    if (res.success) {
      toast.success("KPI Target created!", { description: form.title });
      setShowModal(false);
    } else {
      setFormError(res.error || "Failed to create KPI");
    }
  };

  const startEditProgress = (kpi: any) => {
    setEditingProgressId(kpi.id);
    setTempProgress(kpi.current);
  };

  const saveProgress = async (id: string) => {
    const res = await updateKPIProgress(id, tempProgress);
    if (res.success) {
      toast.success("Progress updated!");
      setEditingProgressId(null);
    } else {
      toast.error(res.error || "Update failed");
    }
  };

  // Metrics Management
  const handleStartEditMetrics = () => {
    setTempMetrics([...qualityMetrics]);
    setIsEditingMetrics(true);
  };

  const handleUpdateMetric = (id: string, field: keyof QualityMetric, value: any) => {
    setTempMetrics(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleAddMetric = () => {
    const newMetric: QualityMetric = {
      id: crypto.randomUUID(),
      metric: "New Metric",
      weight: 0,
      description: "Description here"
    };
    setTempMetrics([...tempMetrics, newMetric]);
  };

  const handleRemoveMetric = (id: string) => {
    setTempMetrics(prev => prev.filter(m => m.id !== id));
  };

  const handleSaveMetrics = async () => {
    const totalWeight = tempMetrics.reduce((sum, m) => sum + m.weight, 0);
    if (totalWeight !== 100) {
      toast.error(`Total weight must be 100% (Current: ${totalWeight}%)`);
      return;
    }
    const res = await updateQualityMetrics(tempMetrics);
    if (res.success) {
      toast.success("Quality Scoring System updated!");
      setIsEditingMetrics(false);
    } else {
      toast.error(res.error);
    }
  };

  if (!isAdmin && !perms.kpi_manage) {
    return <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">You do not have access to manage KPIs.</div>;
  }

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">KPI Configuration</h1>
            <p className="mt-1 text-sm text-muted-foreground">Set targets for Company, Groups, and individuals</p>
          </div>
          {canCreate && (
            <Button id="add-kpi-btn" className="h-10 gap-2 rounded-lg px-5 text-sm font-medium" onClick={openAdd}>
              <Plus className="h-4 w-4" /> Create KPI
            </Button>
          )}
        </motion.div>

        {/* Level Tabs */}
        <motion.div variants={fadeUp} className="flex gap-2 border-b">
          {(["Company", "Group", "Individual", "Scoring"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 px-4 text-sm font-medium transition-all relative ${
                activeTab === tab
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "Scoring" ? "Quality Scoring" : tab}
              {activeTab === tab && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </motion.div>

        {activeTab !== "Scoring" ? (
          <motion.div variants={fadeUp} className="grid gap-4">
            {filteredKpis.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed p-12 text-center">
                <Target className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm font-medium text-foreground">No {activeTab} KPIs configured</p>
                <p className="text-xs text-muted-foreground">Click "Create KPI" to add target parameters.</p>
              </div>
            ) : (
              filteredKpis.map((kpi) => (
                <div key={kpi.id} className="rounded-2xl bg-card p-5 shadow-card border border-transparent hover:border-primary/20 transition-all group">
                   <div className="flex items-start justify-between mb-4">
                      <div>
                         <div className="flex items-center gap-2">
                           <h3 className="font-bold text-foreground">{kpi.title}</h3>
                           <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase font-bold tracking-wider">
                             {kpi.unit}
                           </span>
                         </div>
                         <p className="text-xs text-muted-foreground mt-1">
                            {kpi.type === "Individual" && `Assigned to: ${kpi.assignedToName}`}
                            {kpi.type === "Group" && `Group: ${kpi.groupId}`}
                            {kpi.type === "Company" && "Company Wide Objective"}
                         </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Daily Range</p>
                          <p className="text-sm font-semibold text-foreground">{kpi.dailyMin} – {kpi.dailyMax}</p>
                        </div>
                        {canDeleteKpi && (
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm("Delete this KPI target?")) return;
                              const r = await deleteKPI(kpi.id);
                              if (r.success) toast.success("KPI deleted");
                              else toast.error(r.error || "Delete failed");
                            }}
                            className="p-1.5 text-muted-foreground opacity-0 transition-colors hover:text-destructive group-hover:opacity-100"
                            title="Delete KPI"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                   </div>
                   {editingProgressId === kpi.id ? (
                      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl border border-primary/20">
                          <div className="flex-1">
                             <Label className="text-[10px] uppercase font-bold text-primary mb-1 block">New Value ({kpi.unit})</Label>
                             <Input type="number" value={tempProgress} onChange={(e) => setTempProgress(Number(e.target.value))} className="h-8 bg-background" />
                          </div>
                          <div className="flex gap-1 pt-4">
                            <Button size="sm" onClick={() => saveProgress(kpi.id)} className="h-8 w-8 p-0"><Save className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingProgressId(null)} className="h-8 w-8 p-0"><X className="h-3 w-3" /></Button>
                          </div>
                      </div>
                   ) : (
                      <div className="flex flex-col gap-2">
                        <KPIProgressBar label="Current Progress" current={kpi.current} target={kpi.target} unit={kpi.unit} />
                        <button onClick={() => startEditProgress(kpi)} className="text-[10px] font-bold text-primary hover:underline self-end">Update Progress</button>
                      </div>
                   )}
                </div>
              ))
            )}
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Quality scoring */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-card shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground text-primary">Quality Scoring System (Out of 100)</h2>
                {canCreate && !isEditingMetrics && (
                  <Button variant="ghost" size="sm" onClick={handleStartEditMetrics} className="h-8 gap-2 text-xs font-bold text-primary">
                    <Edit className="h-3 w-3" /> Manage Metrics
                  </Button>
                )}
                {isEditingMetrics && (
                  <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={() => setIsEditingMetrics(false)} className="h-8 text-xs font-bold text-muted-foreground">CANCEL</Button>
                     <Button size="sm" onClick={handleSaveMetrics} className="h-8 gap-2 text-xs font-bold"><Save className="h-3 w-3" /> SAVE CHANGES</Button>
                  </div>
                )}
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Metric</th>
                    <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Description</th>
                    <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Weight (%)</th>
                    {isEditingMetrics && <th className="px-6 py-3 w-10"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(isEditingMetrics ? tempMetrics : qualityMetrics).map((item) => (
                    <tr key={item.id} className="border-b last:border-0 transition-colors hover:bg-muted">
                      <td className="px-6 py-3">
                         {isEditingMetrics ? (
                            <Input className="h-8 text-xs font-medium" value={item.metric} onChange={(e) => handleUpdateMetric(item.id, 'metric', e.target.value)} />
                         ) : (
                            <span className="text-sm font-medium text-foreground">{item.metric}</span>
                         )}
                      </td>
                      <td className="px-6 py-3">
                         {isEditingMetrics ? (
                            <Input className="h-8 text-xs" value={item.description} onChange={(e) => handleUpdateMetric(item.id, 'description', e.target.value)} />
                         ) : (
                            <span className="text-sm text-muted-foreground">{item.description}</span>
                         )}
                      </td>
                      <td className="px-6 py-3 text-right">
                         {isEditingMetrics ? (
                            <div className="flex justify-end">
                               <Input type="number" className="h-8 w-20 text-right text-xs font-semibold" value={item.weight} onChange={(e) => handleUpdateMetric(item.id, 'weight', Number(e.target.value))} />
                            </div>
                         ) : (
                            <span className="font-tabular text-sm font-semibold text-foreground">{item.weight}%</span>
                         )}
                      </td>
                      {isEditingMetrics && (
                        <td className="px-6 py-3">
                           <button onClick={() => handleRemoveMetric(item.id)} className="p-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                           </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {isEditingMetrics && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4">
                         <Button variant="outline" onClick={handleAddMetric} className="w-full h-9 border-dashed text-xs text-muted-foreground">
                            <Plus className="h-3 w-3 mr-1" /> Add New Metric
                         </Button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {!isEditingMetrics && (
                <div className="px-6 py-3 bg-muted/30 border-t flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Distribution</span>
                    <span className="text-sm font-bold text-foreground">100%</span>
                </div>
              )}
            </motion.div>

            {/* Performance tiers */}
            <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card">
              <h2 className="mb-4 text-base font-semibold text-foreground">Performance Badge Tiers</h2>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-green-50 dark:bg-green-950/20 px-4 py-4 border border-green-100 dark:border-green-900/30">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">Elite</span>
                    <span className="text-xs font-bold text-green-700 bg-white dark:bg-green-900 rounded px-1.5">85-100</span>
                  </div>
                  <h4 className="font-bold text-foreground">Top Performer</h4>
                </div>
                <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 px-4 py-4 border border-violet-100 dark:border-violet-900/30">
                   <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest">Steady</span>
                    <span className="text-xs font-bold text-violet-700 bg-white dark:bg-violet-900 rounded px-1.5">70-84</span>
                  </div>
                  <h4 className="font-bold text-foreground">Consistent</h4>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 px-4 py-4 border border-amber-100 dark:border-amber-900/30">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Critical</span>
                    <span className="text-xs font-bold text-amber-700 bg-white dark:bg-amber-900 rounded px-1.5">&lt; 70</span>
                  </div>
                  <h4 className="font-bold text-foreground">Review Needed</h4>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <h2 className="text-base font-semibold text-foreground">Set New {form.type} Target</h2>
                  <button onClick={() => setShowModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-xl">
                      {(["Company", "Group", "Individual"] as const)
                        .filter(t => t !== "Company" || isAdmin)
                        .map(t => (
                        <button key={t} type="button" onClick={() => setForm({...form, type: t, assignedToId: "", groupId: ""})}
                          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${form.type === t ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                          {t === "Company" && <Building className="h-3 w-3" />}
                          {t === "Group" && <Users className="h-3 w-3" />}
                          {t === "Individual" && <User className="h-3 w-3" />}
                          {t}
                        </button>
                      ))}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="kpi-title">Objective Title <span className="text-destructive">*</span></Label>
                    <Input id="kpi-title" placeholder="e.g. Social Content Production" value={form.title}
                      onChange={(e) => { setForm({ ...form, title: e.target.value }); setFormError(""); }}
                      className="h-9" autoFocus />
                  </div>

                  {form.type === "Individual" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="kpi-assign">Assign to Employee <span className="text-destructive">*</span></Label>
                      <select id="kpi-assign" value={form.assignedToId} onChange={(e) => setForm({...form, assignedToId: e.target.value})}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                        <option value="">Select Employee...</option>
                        {teamForKpi.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="space-y-1.5">
                      <Label htmlFor="kpi-controller">Controller Scope</Label>
                      <select
                        id="kpi-controller"
                        value={form.controllerScopeId}
                        onChange={(e) => setForm({ ...form, controllerScopeId: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                      >
                        <option value="">No controller restriction</option>
                        {users.filter((u) => u.role === "controller").map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="space-y-1.5">
                      <Label>Controller Team Members</Label>
                      <div className="max-h-32 space-y-1 overflow-auto rounded-md border p-2">
                        {users.filter((u) => u.role === "employee").map((u) => (
                          <label key={u.id} className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={selectedManagedEmployeeIds.includes(u.id)}
                              onChange={(e) =>
                                setSelectedManagedEmployeeIds((prev) =>
                                  e.target.checked ? [...prev, u.id] : prev.filter((id) => id !== u.id)
                                )
                              }
                            />
                            {u.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.type === "Group" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="kpi-group">Assign to Department <span className="text-destructive">*</span></Label>
                      <select id="kpi-group" value={form.groupId} onChange={(e) => setForm({...form, groupId: e.target.value})}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                        <option value="">Select Group...</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d} Team</option>)}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="kpi-daily-min">Min Daily</Label>
                      <Input id="kpi-daily-min" type="number" step={0.25} value={form.dailyMin}
                        onChange={(e) => setForm({ ...form, dailyMin: Number(e.target.value) })} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="kpi-daily-max">Max Daily</Label>
                      <Input id="kpi-daily-max" type="number" step={0.25} value={form.dailyMax}
                        onChange={(e) => setForm({ ...form, dailyMax: Number(e.target.value) })} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="kpi-target">Monthly Goal</Label>
                      <Input id="kpi-target" type="number" value={form.target}
                        onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="kpi-unit">Unit</Label>
                      <Input id="kpi-unit" placeholder="pieces, hrs, etc." value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })} className="h-9" />
                    </div>
                  </div>

                  {formError && <p className="text-xs text-destructive">{formError}</p>}
                  
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="flex-1 h-9 font-bold text-xs" onClick={() => setShowModal(false)}>CANCEL</Button>
                    <Button type="submit" className="flex-1 h-9 gap-1.5 font-bold text-xs uppercase">
                        CREATE TARGET
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
