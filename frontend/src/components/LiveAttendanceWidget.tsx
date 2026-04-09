import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import { useMemo } from "react";

const statusBadge: Record<string, string> = {
  Present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Leave: "bg-destructive/15 text-destructive",
  Absent: "bg-destructive/15 text-destructive",
  "On Leave": "bg-muted text-muted-foreground",
  Break: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "—": "bg-muted text-muted-foreground",
};

export function LiveAttendanceWidget() {
    const { users } = useAuth();
    const { records } = useAttendance();

    const today = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }, []);

    const teamMembers = users.filter((u) => u.role === "employee" || u.role === "controller");

    const todayRecords = teamMembers.map(u => {
        const rec = records.find(r => r.userId === u.id && r.date === today);
        return {
            id: u.id,
            name: u.name,
            checkIn: rec?.checkInTime || "—",
            checkOut: rec?.checkOutTime || "—",
            status: rec?.status || "—",
        };
    });

    return (
        <div className="rounded-2xl bg-card shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b">
                <h2 className="text-base font-semibold text-foreground">Live Team Attendance</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b">
                            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Employee</th>
                            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Check In</th>
                            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Check Out</th>
                            <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {todayRecords.map((r) => (
                            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                                <td className="px-5 py-3 text-sm font-medium text-foreground">{r.name}</td>
                                <td className="px-5 py-3 text-sm font-tabular text-muted-foreground">{r.checkIn}</td>
                                <td className="px-5 py-3 text-sm font-tabular text-muted-foreground">{r.checkOut}</td>
                                <td className="px-5 py-3">
                                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadge[r.status]}`}>
                                        {r.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {todayRecords.length === 0 && (
                            <tr><td colSpan={4} className="p-4 text-center text-sm text-muted-foreground">No employees found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
