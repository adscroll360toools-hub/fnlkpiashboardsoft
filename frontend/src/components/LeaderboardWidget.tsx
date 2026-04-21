import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useKPI } from "@/context/KPIContext";
import { useTask } from "@/context/TaskContext";
import type { AppTask } from "@/context/TaskContext";
import { isTaskAssignedTo } from "@/lib/taskHelpers";
import { companyOperationalTeam } from "@/lib/companyTeam";
import { motion, AnimatePresence } from "framer-motion";

function taskResolvedAtMs(t: AppTask): number {
    if (t.submission?.submittedAt) return new Date(t.submission.submittedAt).getTime();
    if (t.updatedAt) return new Date(t.updatedAt).getTime();
    return new Date(t.createdAt).getTime();
}

type LeaderboardPeriod = "Weekly" | "Monthly" | "Yearly";

export function LeaderboardWidget() {
    const { users } = useAuth();
    const { kpis } = useKPI();
    const { tasks } = useTask();
    
    const [period, setPeriod] = useState<LeaderboardPeriod>("Weekly");

    const teamMembers = useMemo(() => companyOperationalTeam(users), [users]);

    const leaderboard = useMemo(() => {
        let startPeriodDate = new Date();
        
        if (period === "Weekly") {
            // Monday to Saturday. (Actually just 7 days dynamically or week start)
            const day = startPeriodDate.getDay();
            const diff = startPeriodDate.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
            startPeriodDate.setDate(diff);
            startPeriodDate.setHours(0,0,0,0);
        } else if (period === "Monthly") {
            startPeriodDate.setDate(1);
            startPeriodDate.setHours(0,0,0,0);
        } else if (period === "Yearly") {
            startPeriodDate.setMonth(0, 1);
            startPeriodDate.setHours(0,0,0,0);
        }

        const data = teamMembers.map((emp) => {
            // Individual KPIs assigned to this person (current progress vs target)
            const myKPIs = kpis.filter((k) => k.type === "Individual" && k.assignedToId === emp.id);
            
            // Calculate average KPI %
            let totalKPIPercent = 0;
            if (myKPIs.length > 0) {
                const kpiScores = myKPIs.map(k => Math.min((k.current / (k.target || 1)) * 100, 100));
                totalKPIPercent = kpiScores.reduce((a,b) => a+b, 0) / myKPIs.length;
            } else {
                totalKPIPercent = 0;
            }

            // Find Tasks completed in period
            const myCompletedTasks = tasks.filter(
                (t) =>
                    isTaskAssignedTo(t, emp.id) &&
                    (t.status === "Completed" || t.status === "Approved") &&
                    taskResolvedAtMs(t) >= startPeriodDate.getTime()
            );

            // Productivity Score: 70% KPI + 30% tasks logic (Assuming 5 tasks is 100% productivity for weekly to mock it, or just use tasks counted)
            // Or just a raw score calculation: KPI % average
            const kpiScore = Math.floor(totalKPIPercent);
            
            // We just use KPI Score as primary, Task count secondary
            return {
                id: emp.id,
                name: emp.name,
                kpiScore: kpiScore,
                tasksCompleted: myCompletedTasks.length,
                sortScore: (kpiScore * 100) + myCompletedTasks.length // Weighted for sorting
            };
        });

        // Sort by rank score descending
        return data.sort((a, b) => b.sortScore - a.sortScore).map((d, i) => ({ ...d, rank: i + 1 }));
    }, [teamMembers, kpis, tasks, period]);

    const getBadge = (rank: number) => {
        if (rank === 1) return { icon: "🥇", class: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200" };
        if (rank === 2) return { icon: "🥈", class: "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300 border-slate-200" };
        if (rank === 3) return { icon: "🥉", class: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 border-amber-200/50" };
        return { icon: rank.toString(), class: "bg-muted text-muted-foreground" };
    };

    return (
        <div className="rounded-2xl bg-card shadow-card overflow-hidden h-full flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Top Performers</h2>
                <div className="flex gap-1 bg-muted p-1 rounded-lg">
                    {["Weekly", "Monthly", "Yearly"].map(p => (
                        <button key={p} onClick={() => setPeriod(p as LeaderboardPeriod)}
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-muted/20">
                            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground w-16">Rank</th>
                            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Team member</th>
                            <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">KPI Score</th>
                            <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Tasks</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {leaderboard.map((emp) => {
                                const badge = getBadge(emp.rank);
                                return (
                                    <motion.tr layout key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-5 py-3 font-semibold">
                                            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs border ${badge.class}`}>
                                                {badge.icon}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-sm font-medium text-foreground">{emp.name}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${emp.kpiScore >= 90 ? "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400" : emp.kpiScore >= 60 ? "text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400" : "text-muted-foreground bg-muted"}`}>
                                                {emp.kpiScore}%
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right text-sm font-tabular text-muted-foreground hidden sm:table-cell">{emp.tasksCompleted}</td>
                                    </motion.tr>
                                );
                            })}
                            {leaderboard.length === 0 && (
                                <tr><td colSpan={4} className="p-4 text-center text-sm text-muted-foreground">No leaderboard data found</td></tr>
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
