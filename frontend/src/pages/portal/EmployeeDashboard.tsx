import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { useAuth } from "@/context/AuthContext";
import { useTask } from "@/context/TaskContext";
import { useKPI, AppKPI } from "@/context/KPIContext";
import { useAttendance } from "@/context/AttendanceContext";
import { StatCard } from "@/components/StatCard";
import { ClipboardCheck, CalendarClock, Trophy, Target, Edit2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { KPIProgressBar } from "@/components/KPIProgressBar";
import { LeaderboardWidget } from "@/components/LeaderboardWidget";
import { TaskDashboard } from "@/components/TaskDashboard";
import { isTaskAssignedTo } from "@/lib/taskHelpers";

export default function EmployeeDashboard() {
    const { currentUser } = useAuth();
    const { tasks } = useTask();
    const { kpis, updateKPIProgress } = useKPI();
    const { records } = useAttendance();

    const [editKpi, setEditKpi] = useState<AppKPI | null>(null);
    const [kpiUpdateVal, setKpiUpdateVal] = useState("");

    const handleKpiUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editKpi) return;
        const val = Number(kpiUpdateVal);
        if (isNaN(val) || val < 0) return toast.error("Invalid progress value");
        const res = updateKPIProgress(editKpi.id, val);
        if (res.success) {
            toast.success("KPI Progress updated!");
            setEditKpi(null);
        } else {
            toast.error(res.error);
        }
    };

    const myTasks = tasks.filter((t) => currentUser?.id && isTaskAssignedTo(t, currentUser.id));

    const weeklyCompleted = useMemo(() => {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return myTasks.filter(
            (t) =>
                (t.status === "Completed" || t.status === "Approved") &&
                t.createdAt &&
                new Date(t.createdAt) >= start
        ).length;
    }, [myTasks]);
    
    const myKpis = kpis.filter(k => k.type === "Individual" && k.assignedToId === currentUser?.id);
    const avgMyProgress = myKpis.length > 0 ? 
        myKpis.reduce((acc, k) => acc + Math.min(100, Math.floor((k.current / k.target) * 100)), 0) / myKpis.length 
        : 0;

    const todayDateStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const todayRecord = records.find(r => r.userId === currentUser?.id && r.date === todayDateStr);

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={fadeUp}>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Hello, <span className="text-emerald-600">{currentUser?.name}</span> 👋
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · Keep up the great work!
                </p>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard title="Tasks Assign" value={myTasks.length.toString()} subtitle={`${myTasks.filter(t=>t.status === "Completed" || t.status === "Approved").length} completed`} icon={ClipboardCheck} />
                <StatCard title="Attendance" value={todayRecord?.status || "Not Checked In"} subtitle={todayRecord?.checkInTime ? `Checked in ${todayRecord.checkInTime}` : "No check-in yet"} icon={CalendarClock} variant="primary" />
                <StatCard title="Overall Score" value={`${Math.floor(avgMyProgress)}%`} subtitle="Target progress" icon={Trophy} trend={{ value: "Rank evaluation active", positive: true }} />
                <StatCard title="My Targets" value={myKpis.length.toString()} subtitle="Active targets" icon={Target} />
            </motion.div>

            <motion.div variants={fadeUp} className="rounded-2xl border bg-card p-4 shadow-card">
                <h3 className="text-sm font-semibold text-foreground">Weekly performance snapshot</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    Tasks marked completed or approved in the last 7 days (by created date):{" "}
                    <span className="font-semibold text-foreground">{weeklyCompleted}</span>
                    {" · "}Attendance today feeds future performance scoring.
                </p>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-12">
                <motion.div variants={fadeUp} className="lg:col-span-7">
                    <div className="rounded-2xl bg-card p-5 shadow-card h-full">
                        <TaskDashboard scope="self" title="My task dashboard" />
                    </div>
                </motion.div>

                {/* KPI Progress */}
                <motion.div variants={fadeUp} className="lg:col-span-5">
                    <div className="rounded-2xl bg-card p-5 shadow-card h-full">
                        <h2 className="mb-5 text-base font-semibold text-foreground">My Personal KPIs</h2>
                        <div className="space-y-5">
                            {myKpis.map(kpi => (
                                <div key={kpi.id} className="relative group">
                                    <div className="flex justify-between items-center mb-1">
                                        <button onClick={() => { setEditKpi(kpi); setKpiUpdateVal(kpi.current.toString()); }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-0 text-xs flex items-center gap-1 text-primary hover:underline bg-background/80 px-1 rounded z-10">
                                            <Edit2 className="h-3 w-3"/> Update Progress
                                        </button>
                                    </div>
                                    <KPIProgressBar label={kpi.title} current={kpi.current} target={kpi.target} unit={kpi.unit} />
                                </div>
                            ))}
                            {myKpis.length === 0 && (
                                <p className="text-muted-foreground text-sm py-4">No Personal KPIs have been assigned to you yet.</p>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Leaderboard */}
                <motion.div variants={fadeUp} className="lg:col-span-12 xl:col-span-12">
                    <LeaderboardWidget />
                </motion.div>
            </div>

            <AnimatePresence>
                {editKpi && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-card w-full max-w-sm rounded-xl shadow-2xl p-6 border border-border relative">
                            <button onClick={() => setEditKpi(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                            <h3 className="font-bold text-lg leading-tight w-11/12">{editKpi.title}</h3>
                            <p className="text-xs text-muted-foreground mb-4">Target: {editKpi.target} {editKpi.unit}</p>

                            <form onSubmit={handleKpiUpdateSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Current Progress</label>
                                    <Input type="number" value={kpiUpdateVal} onChange={e => setKpiUpdateVal(e.target.value)} required min={0} />
                                </div>
                                <Button type="submit" className="w-full">Save Updates</Button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
