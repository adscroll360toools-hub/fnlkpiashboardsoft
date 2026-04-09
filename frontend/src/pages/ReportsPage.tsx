import { useState } from "react";
import { motion } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { StatCard } from "@/components/StatCard";
import { KPIProgressBar } from "@/components/KPIProgressBar";
import {
  FileText, Download, BarChart3, TrendingUp, Users,
  CalendarClock, CheckCircle2, Clock, XCircle, Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import { useKPI } from "@/context/KPIContext";
import { useTask } from "@/context/TaskContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useMemo } from "react";

/* ─── Types ─────────────────────────────────────────────────── */
interface AttendanceRow {
  name: string;
  role: string;
  checkIn: string;
  checkOut: string;
  status: string;
  hours: string;
  tasks: number;
}

const statusMeta: Record<string, { color: string; icon: React.ElementType }> = {
  "Present": { color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400", icon: CheckCircle2 },
  "Late": { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400", icon: Clock },
  "Absent": { color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400", icon: XCircle },
  "On Leave": { color: "bg-muted text-muted-foreground", icon: CalendarClock },
  "Break": { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400", icon: Coffee },
};

/* ─── Excel Export helpers ──────────────────────────────────── */
function toCSV(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly";
type ReportTab = "performance" | "attendance";

export default function ReportsPage() {
  const { users } = useAuth();
  const { kpis, qualityScores } = useKPI();
  const { tasks } = useTask();
  const { records } = useAttendance();

  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [tab, setTab] = useState<ReportTab>("performance");

  const todayStr = new Date().toISOString().split('T')[0];

  const todayAttendance = useMemo<AttendanceRow[]>(() => {
    return users.filter(u => u.role !== 'admin').map(u => {
      const rec = records.find(r => r.userId === u.id && r.date === todayStr);
      const userTasks = tasks.filter(t => t.assigneeId === u.id && 
          new Date(t.createdAt).toISOString().startsWith(todayStr));
      
      return {
          name: u.name,
          role: u.role,
          checkIn: rec?.checkInTime || "—",
          checkOut: rec?.checkOutTime || "—",
          status: rec?.status || "Absent",
          hours: rec?.checkInTime && rec?.checkOutTime ? "8h" : "—",
          tasks: userTasks.length
      };
    });
  }, [users, records, tasks, todayStr]);

  const employeePerf = useMemo(() => {
    return users.filter(u => u.role !== 'admin').map(u => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const score = qualityScores.find(s => s.employeeId === u.id && s.month === currentMonth)?.score || 0;
      return { name: u.name, score };
    });
  }, [users, qualityScores]);

  const departmentData = useMemo(() => {
    const depts = ["Content", "Design", "Marketing", "Video", "Analytics"];
    return depts.map(d => {
      const deptKPIs = kpis.filter(k => k.groupId === d);
      const total = deptKPIs.reduce((acc, k) => acc + k.target, 0) || 100;
      const completed = deptKPIs.reduce((acc, k) => acc + k.current, 0);
      return { dept: d, completed, target: total };
    });
  }, [kpis]);

  const monthlyData = [
    { month: "Jan", tasks: 45, score: 78 },
    { month: "Feb", tasks: 52, score: 82 },
    { month: "Mar", tasks: 48, score: 80 },
    { month: "Apr", tasks: 61, score: 85 },
    { month: "May", tasks: todayAttendance.reduce((a, b) => a + b.tasks, 0) + 50, score: 84 },
  ];

  /* ── Export performance report ─── */
  const handleExportPerformance = () => {
    const headers = ["Employee", "Score", "Tasks Completed", "Status"];
    const rows = employeePerf.map((e) => [e.name, e.score, Math.round(e.score * 0.9), e.score >= 85 ? "Excellent" : e.score >= 75 ? "Good" : "Needs Improvement"]);
    const csv = toCSV(headers, rows);
    downloadCSV(`performance_report_${period}_${new Date().toLocaleDateString("en-US").replace(/\//g, "-")}.csv`, csv);
    toast.success("Performance report downloaded!", { description: `${period} report saved as CSV (opens in Excel).` });
  };

  /* ── Export attendance report ─── */
  const handleExportAttendance = () => {
    const headers = ["Name", "Role", "Check In", "Check Out", "Status", "Hours", "Tasks Completed"];
    const rows = todayAttendance.map((r) => [r.name, r.role, r.checkIn, r.checkOut, r.status, r.hours, r.tasks]);
    const csv = toCSV(headers, rows);
    downloadCSV(`attendance_report_${new Date().toLocaleDateString("en-US").replace(/\//g, "-")}.csv`, csv);
    toast.success("Attendance report downloaded!", { description: "Daily attendance saved as CSV (opens in Excel)." });
  };

  const presentCount = todayAttendance.filter((r) => r.status === "Present" || r.status === "Late" || r.status === "Break").length;
  const absentCount = todayAttendance.filter((r) => r.status === "Absent").length;
  const onLeaveCount = todayAttendance.filter((r) => r.status === "Leave" || r.status === "On Leave").length;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Performance analytics and exportable reports</p>
        </div>
        <Button
          id="export-report-btn"
          className="h-10 gap-2 rounded-lg px-5 text-sm font-medium"
          onClick={tab === "attendance" ? handleExportAttendance : handleExportPerformance}
        >
          <Download className="h-4 w-4" /> Export to Excel
        </Button>
      </motion.div>

      {/* Tab switcher */}
      <motion.div variants={fadeUp} className="flex gap-2 border-b">
        {(["performance", "attendance"] as ReportTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2.5 px-1 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            {t === "performance" ? "📊 Performance" : "🗓️ Daily Attendance"}
          </button>
        ))}
      </motion.div>

      {/* ─── Performance Tab ─────────────────────────────────────── */}
      {tab === "performance" && (
        <>
          {/* Period selector */}
          <motion.div variants={fadeUp} className="flex gap-2">
            {(["daily", "weekly", "monthly", "yearly"] as ReportPeriod[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${period === p ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-border"
                  }`}
              >{p}</button>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard title="Total Tasks" value="155" subtitle="this month" icon={FileText} />
            <StatCard title="Avg Score" value="84" subtitle="team average" icon={TrendingUp} variant="primary" />
            <StatCard title="Completion Rate" value="89%" subtitle="+3% vs last month" icon={BarChart3} trend={{ value: "+3%", positive: true }} />
            <StatCard title="Active Employees" value="6" subtitle="all departments" icon={Users} />
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Trend chart */}
            <motion.div variants={fadeUp} className="lg:col-span-7">
              <div className="rounded-2xl bg-card p-5 shadow-card">
                <h2 className="mb-4 text-base font-semibold text-foreground">Task Completion Trend</h2>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" vertical={false} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(240 4% 46%)" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(240 4% 46%)" }} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,.1)", fontSize: "13px" }} />
                      <Line type="monotone" dataKey="tasks" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ fill: "hsl(217, 91%, 60%)", r: 4 }} />
                      <Line type="monotone" dataKey="score" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ fill: "hsl(142, 71%, 45%)", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
            {/* Dept KPI */}
            <motion.div variants={fadeUp} className="lg:col-span-5">
              <div className="rounded-2xl bg-card p-5 shadow-card h-full">
                <h2 className="mb-5 text-base font-semibold text-foreground">Department Progress</h2>
                <div className="space-y-5">
                  {departmentData.map((dept) => (
                    <KPIProgressBar key={dept.dept} label={dept.dept} current={dept.completed} target={dept.target} />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Employee performance bar chart */}
          <motion.div variants={fadeUp} className="rounded-2xl bg-card p-5 shadow-card">
            <h2 className="mb-4 text-base font-semibold text-foreground">Employee Performance Summary</h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeePerf} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 90%)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(240 4% 46%)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(240 4% 46%)" }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,.1)", fontSize: "13px" }} />
                  <Bar dataKey="score" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </>
      )}

      {/* ─── Daily Attendance Tab ─────────────────────────────────── */}
      {tab === "attendance" && (
        <>
          {/* Summary cards */}
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <div className="mb-2 inline-flex rounded-xl p-2 bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-foreground">{presentCount}</p>
              <p className="text-xs text-muted-foreground">Present today</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <div className="mb-2 inline-flex rounded-xl p-2 bg-red-100 dark:bg-red-900/20">
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-foreground">{absentCount}</p>
              <p className="text-xs text-muted-foreground">Absent</p>
            </div>
            <div className="rounded-2xl bg-card p-4 shadow-card">
              <div className="mb-2 inline-flex rounded-xl p-2 bg-muted">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold text-foreground">{onLeaveCount}</p>
              <p className="text-xs text-muted-foreground">On Leave</p>
            </div>
          </motion.div>

          {/* Attendance date bar */}
          <motion.div variants={fadeUp} className="rounded-2xl bg-primary/5 border border-primary/20 p-4 flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Daily Attendance — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-xs text-muted-foreground">
                All Controllers and Employees · {presentCount} of {todayAttendance.length} present
              </p>
            </div>
          </motion.div>

          {/* Attendance table */}
          <motion.div variants={fadeUp} className="rounded-2xl bg-card shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Team Attendance</h2>
              <button
                onClick={handleExportAttendance}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-muted hover:bg-border transition-colors text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" /> Download Excel
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Role</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Check In</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Check Out</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Hours</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Tasks</th>
                  <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.map((rec) => {
                  const meta = statusMeta[rec.status] || statusMeta["Absent"];
                  const Icon = meta.icon;
                  const isController = rec.role === "controller";
                  return (
                    <tr key={rec.name} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ${isController ? "bg-violet-100 text-violet-700 dark:bg-violet-900/20" : "bg-primary/10 text-primary"}`}>
                            {rec.name.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-foreground">{rec.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isController ? "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400" : "bg-muted text-muted-foreground"}`}>
                          {rec.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-tabular text-foreground hidden md:table-cell">{rec.checkIn}</td>
                      <td className="px-5 py-3 text-sm font-tabular text-muted-foreground hidden md:table-cell">{rec.checkOut}</td>
                      <td className="px-5 py-3 text-sm font-tabular text-muted-foreground hidden lg:table-cell">{rec.hours}</td>
                      <td className="px-5 py-3 text-sm font-tabular text-muted-foreground hidden lg:table-cell">{rec.tasks}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.color}`}>
                          <Icon className="h-3 w-3" />
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
