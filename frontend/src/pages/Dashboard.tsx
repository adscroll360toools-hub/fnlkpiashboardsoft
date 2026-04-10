import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { KPIProgressBar } from "@/components/KPIProgressBar";
import {
  ClipboardCheck,
  CalendarClock,
  Trophy,
  Target,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { stagger, fadeUp } from "@/lib/animations";
import { SendNotificationDialog } from "@/components/SendNotificationDialog";
import { LiveAttendanceWidget } from "@/components/LiveAttendanceWidget";
import { LeaderboardWidget } from "@/components/LeaderboardWidget";
import { useTask } from "@/context/TaskContext";
import { useKPI } from "@/context/KPIContext";
import { useAuth } from "@/context/AuthContext";
import { TaskDashboard } from "@/components/TaskDashboard";

export default function Dashboard() {
  const navigate = useNavigate();
  const { tasks } = useTask();
  const { kpis } = useKPI();
  const { currentUser } = useAuth();
  
  const compKpis = kpis.filter(k => k.type === "Company");
  
  const avgMonthlyProgress = compKpis.length > 0 ? 
      compKpis.reduce((acc, k) => acc + Math.min(100, Math.floor((k.current / k.target) * 100)), 0) / compKpis.length 
      : 0;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            Welcome back, <span className="text-primary">{currentUser?.name}</span>.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · System Overview</p>
        </div>
        <div className="flex gap-3">
          <SendNotificationDialog />
          <Button
            id="new-task-btn"
            className="hidden h-10 gap-2 rounded-lg px-5 text-sm font-medium sm:flex"
            onClick={() => navigate("/tasks")}
          >
            Assign Tasks <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Company Tasks" value={tasks.length.toString()} subtitle={`${tasks.filter(t=>t.status === "Completed").length} completed`} icon={ClipboardCheck} />
        <StatCard title="Company KPIs" value={compKpis.length.toString()} subtitle="Active targets" icon={Target} variant="primary" />
        <StatCard title="Overall Score" value={`${Math.floor(avgMonthlyProgress)}%`} subtitle="Target progress" icon={Trophy} />
        <StatCard title="Online Team" value="Live" subtitle="Check attendance below" icon={CalendarClock} />
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl bg-card p-5 shadow-card">
        <TaskDashboard scope="company" title="Task dashboard" />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Attendance (Left half) */}
        <motion.div variants={fadeUp} className="lg:col-span-7">
            <LiveAttendanceWidget />
        </motion.div>

        {/* Leaderboard (Right half) */}
        <motion.div variants={fadeUp} className="lg:col-span-5 flex flex-col">
            <LeaderboardWidget />
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* KPI Progresses */}
        <motion.div variants={fadeUp} className="lg:col-span-12">
          <div className="rounded-2xl bg-card p-5 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Company KPI Targets</h2>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/kpi")}>Manage</Button>
            </div>
            <div className="space-y-5 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {compKpis.length > 0 ? compKpis.map(kpi => (
                    <div key={kpi.id} className="w-full">
                        <KPIProgressBar label={kpi.title} current={kpi.current} target={kpi.target} unit={kpi.unit} />
                    </div>
                )) : (
                    <p className="text-muted-foreground text-sm py-4">No Company KPIs created yet.</p>
                )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
