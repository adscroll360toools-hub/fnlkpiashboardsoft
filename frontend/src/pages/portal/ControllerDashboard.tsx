import { motion } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { useAuth } from "@/context/AuthContext";
import { useTask } from "@/context/TaskContext";
import { useKPI } from "@/context/KPIContext";
import { StatCard } from "@/components/StatCard";
import { ClipboardCheck, Users, Trophy, Target } from "lucide-react";
import { LiveAttendanceWidget } from "@/components/LiveAttendanceWidget";
import { LeaderboardWidget } from "@/components/LeaderboardWidget";
import { KPIProgressBar } from "@/components/KPIProgressBar";
import { SendNotificationDialog } from "@/components/SendNotificationDialog";
import { TaskDashboard } from "@/components/TaskDashboard";

export default function ControllerDashboard() {
    const { currentUser, users } = useAuth();
    const { tasks } = useTask();
    const { kpis } = useKPI();

    const teamMembers = users.filter(u => u.role === "employee");
    const groupKpis = kpis.filter(k => k.type === "Group");

    const avgGroupProgress = groupKpis.length > 0 ? 
        groupKpis.reduce((acc, k) => acc + Math.min(100, Math.floor((k.current / k.target) * 100)), 0) / groupKpis.length 
        : 0;

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={fadeUp} className="flex items-end justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Good morning, <span className="text-violet-600">{currentUser?.name}</span> 👋
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · Controller Overview
                    </p>
                </div>
                <div className="flex gap-3 hidden sm:flex">
                    <SendNotificationDialog />
                </div>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard title="Team Size" value={teamMembers.length.toString()} subtitle="employees" icon={Users} />
                <StatCard title="Total Tasks" value={tasks.length.toString()} subtitle="for whole group" icon={ClipboardCheck} variant="primary" />
                <StatCard title="Group KPI Score" value={`${Math.floor(avgGroupProgress)}%`} subtitle="Target progress" icon={Trophy} trend={{ value: "+3% vs last week", positive: true }} />
                <StatCard title="Group Targets" value={groupKpis.length.toString()} subtitle="Active targets" icon={Target} />
            </motion.div>

            <TaskDashboard scope="company" title="Task dashboard" />

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Team Status */}
                <motion.div variants={fadeUp} className="lg:col-span-12 xl:col-span-7">
                    <LiveAttendanceWidget />
                </motion.div>

                {/* Leaderboard */}
                <motion.div variants={fadeUp} className="lg:col-span-12 xl:col-span-5 flex flex-col">
                    <LeaderboardWidget />
                </motion.div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* KPI Progresses */}
                <motion.div variants={fadeUp} className="lg:col-span-12">
                <div className="rounded-2xl bg-card p-5 shadow-card">
                    <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">Group KPI Targets</h2>
                    </div>
                    <div className="space-y-5 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groupKpis.length > 0 ? groupKpis.map(kpi => (
                            <div key={kpi.id} className="w-full">
                                <KPIProgressBar label={kpi.title} current={kpi.current} target={kpi.target} unit={kpi.unit} />
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-sm py-4">No Group KPIs created yet.</p>
                        )}
                    </div>
                </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
