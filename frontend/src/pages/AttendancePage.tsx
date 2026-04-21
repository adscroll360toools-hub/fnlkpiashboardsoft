import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarClock, Clock, Coffee, LogIn, LogOut,
  CheckCircle2, XCircle, AlertTriangle, Users, Check, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { stagger, fadeUp } from "@/lib/animations";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAttendance, AttendanceStatus } from "@/context/AttendanceContext";
import { getEffectivePermissions } from "@/lib/permissions";
import { companyOperationalTeam } from "@/lib/companyTeam";

// Types
type MyAttendanceState = "not-checked-in" | "checked-in" | "on-break" | "checked-out";
type TeamTimeFilter = "Daily" | "Weekly" | "Monthly" | "Yearly";

const statusBadge: Record<string, string> = {
  Present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Leave: "bg-destructive/15 text-destructive",
  Absent: "bg-destructive/15 text-destructive",
  "On Leave": "bg-muted text-muted-foreground",
  Break: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "—": "bg-muted text-muted-foreground",
};

const STATUS_OPTIONS: AttendanceStatus[] = ["Present", "Late", "Absent", "Leave", "Break"];

export default function AttendancePage() {
  const { currentUser, users, companyRoles } = useAuth();
  const perms = getEffectivePermissions(currentUser, companyRoles);
  const { 
    records, 
    breakRequests, 
    checkIn, 
    checkOut, 
    requestBreak, 
    approveBreak, 
    rejectBreak, 
    endBreak, 
    updateMemberAttendance 
  } = useAttendance();

  const isAdmin = currentUser?.role === "admin";
  const isController = currentUser?.role === "controller";
  const canManage = isAdmin || isController;

  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakReason, setBreakReason] = useState("");
  const [breakDuration, setBreakDuration] = useState("");
  const [teamTimeFilter, setTeamTimeFilter] = useState<TeamTimeFilter>("Daily");

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const myTodayRecord = records.find(r => r.userId === currentUser?.id && r.date === today);

  let state: MyAttendanceState = "not-checked-in";
  if (myTodayRecord) {
      if (myTodayRecord.checkOutTime) state = "checked-out";
      else if (myTodayRecord.status === "Break") state = "on-break";
      else state = "checked-in";
  }

  const handleCheckIn = async () => { 
    const res = await checkIn(); 
    if (res.success) toast.success("Checked In!", { description: `Status: ${res.status}` });
    else toast.error(res.error);
  };
  
  const handleCheckOut = async () => { 
    const res = await checkOut(); 
    if (res.success) toast.success("Checked Out!");
    else toast.error(res.error);
  };

  const handleBreakRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await requestBreak(breakReason, breakDuration);
    if (res.success) {
      toast.success("Break request submitted", { description: "Pending controller approval" });
      setShowBreakModal(false);
      setBreakReason("");
      setBreakDuration("");
    } else {
      toast.error(res.error);
    }
  };

  const handleEndBreak = async () => {
    const res = await endBreak();
    if (res.success) toast.success("Break Ended", { description: "Back to work!" });
    else toast.error(res.error);
  };

  const statusLabel: Record<MyAttendanceState, string> = {
    "not-checked-in": "Not Checked In",
    "checked-in": myTodayRecord?.status || "On Time",
    "on-break": "On Break",
    "checked-out": "Checked Out",
  };

  const bannerBg = state === "on-break" ? "bg-amber-500/10 border border-amber-500/20"
    : state === "checked-in" ? "bg-green-500/10 border border-green-500/20"
      : "bg-muted";
  const clockColor = state === "on-break" ? "text-amber-600" : state === "checked-in" ? "text-green-600" : "text-muted-foreground";
  const clockBg = state === "on-break" ? "bg-amber-500/20" : state === "checked-in" ? "bg-green-500/20" : "bg-muted-foreground/10";

  // Team stats: employees + controllers only (not admins)
  const teamMembers = companyOperationalTeam(users);

  const filteredTeamRecords = useMemo(() => {
    return teamMembers.flatMap(u => {
      if (teamTimeFilter === "Daily") {
          const rec = records.find(r => r.userId === u.id && r.date === today);
          return [{
              id: rec?.id || `dummy-${u.id}`,
              userId: u.id,
              name: u.name,
              role: u.role,
              date: today,
              status: rec?.status || "—",
              checkIn: rec?.checkInTime || "—",
              checkOut: rec?.checkOutTime || "—",
          }];
      } else {
          const startDateDate = new Date();
          if (teamTimeFilter === "Weekly") startDateDate.setDate(startDateDate.getDate() - 7);
          if (teamTimeFilter === "Monthly") startDateDate.setMonth(startDateDate.getMonth() - 1);
          if (teamTimeFilter === "Yearly") startDateDate.setFullYear(startDateDate.getFullYear() - 1);
          
          const startDateStr = `${startDateDate.getFullYear()}-${String(startDateDate.getMonth() + 1).padStart(2, '0')}-${String(startDateDate.getDate()).padStart(2, '0')}`;

          return records.filter(r => r.userId === u.id && r.date >= startDateStr && r.date <= today).map(rec => ({
              id: rec.id,
              userId: u.id,
              name: u.name,
              role: u.role,
              date: rec.date,
              status: rec.status,
              checkIn: rec.checkInTime || "—",
              checkOut: rec.checkOutTime || "—",
          }));
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [teamMembers, records, teamTimeFilter, today]);

  const presentCount = filteredTeamRecords.filter(r => r.status === "Present" || r.status === "Break").length;
  const lateCount = filteredTeamRecords.filter(r => r.status === "Late").length;
  const absentCount = filteredTeamRecords.filter(r => r.status === "Absent").length;
  const onLeaveCount = filteredTeamRecords.filter(r => r.status === "Leave").length;

  // Pending Break Requests
  const pendingRequests = breakRequests.filter(r => r.date === today && r.status === "Pending");

  // My weekly log
  const myRecords = records.filter(r => r.userId === currentUser?.id).slice(-5).reverse();

  // Dynamic Month Stats
  const currentMonthWorkingDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      // Mon - Sat are working days (Exclude Sunday = 0)
      if (new Date(year, month, i).getDay() !== 0) workingDays++;
    }
    return workingDays;
  }, []);

  const myMonthRecords = useMemo(() => {
    return records.filter(r => r.userId === currentUser?.id && r.date.startsWith(today.slice(0, 7)));
  }, [records, currentUser, today]);

  const monthPresent = myMonthRecords.filter(r => ["Present", "Break"].includes(r.status)).length;
  const monthLate = myMonthRecords.filter(r => r.status === "Late").length;
  const monthLeave = myMonthRecords.filter(r => r.status === "Leave").length;
  
  const totalAttended = monthPresent + monthLate;
  const onTimePercent = totalAttended > 0 ? Math.round((monthPresent / totalAttended) * 100) : 100;

  if (!perms.attendance_view) {
    return <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">You do not have access to attendance.</div>;
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track daily check-in, breaks, and check-out</p>
      </motion.div>

      {/* My status banner */}
      <motion.div variants={fadeUp} className={`rounded-2xl p-4 flex items-center gap-3 ${bannerBg}`}>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${clockBg}`}>
          <Clock className={`h-5 w-5 ${clockColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{statusLabel[state]}</p>
          <p className="text-xs text-muted-foreground">
            {state === "not-checked-in" && "You haven't checked in yet today."}
            {state === "checked-in" && `Checked in at ${myTodayRecord?.checkInTime}`}
            {state === "on-break" && `On break since ${myTodayRecord?.breakStartTime}`}
            {state === "checked-out" && `Checked out at ${myTodayRecord?.checkOutTime}`}
          </p>
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
        <Button id="check-in-btn" className="h-11 gap-2 rounded-lg px-5 text-sm font-medium"
          disabled={state === "checked-in" || state === "on-break" || state === "checked-out"}
          onClick={handleCheckIn}>
          <LogIn className="h-4 w-4" /> Check In
        </Button>
        <Button id="break-btn" variant="secondary" className="h-11 gap-2 rounded-lg px-5 text-sm font-medium"
          disabled={state === "not-checked-in" || state === "checked-out"}
          onClick={() => state === "on-break" ? handleEndBreak() : setShowBreakModal(true)}>
          <Coffee className="h-4 w-4" />
          {state === "on-break" ? "End Break" : "Request Break"}
        </Button>
        <Button id="check-out-btn" variant="secondary" className="h-11 gap-2 rounded-lg px-5 text-sm font-medium"
          disabled={state === "not-checked-in" || state === "on-break" || state === "checked-out"}
          onClick={handleCheckOut}>
          <LogOut className="h-4 w-4" /> Check Out
        </Button>
      </motion.div>

      {/* My stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="This Month" value={`${totalAttended}/${currentMonthWorkingDays}`} subtitle="days present" icon={CalendarClock} />
        <StatCard title="On Time" value={`${onTimePercent}%`} subtitle="arrival rate" icon={Clock} variant="primary" />
        <StatCard title="Late Days" value={monthLate.toString()} subtitle="this month" icon={CalendarClock} />
        <StatCard title="Leaves" value={monthLeave.toString()} subtitle="this month" icon={CalendarClock} />
      </motion.div>

      {/* Break Request Modal */}
      <AnimatePresence>
        {showBreakModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
             <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card w-full max-w-sm rounded-xl border shadow-xl p-5">
                <h3 className="text-lg font-bold">Request Break</h3>
                <form onSubmit={handleBreakRequestSubmit} className="mt-4 space-y-3">
                   <div>
                       <label className="text-sm font-medium">Reason</label>
                       <input value={breakReason} onChange={e => setBreakReason(e.target.value)} required 
                         className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="Lunch, Coffee, etc." />
                   </div>
                   <div>
                       <label className="text-sm font-medium">Session Time</label>
                       <input value={breakDuration} onChange={e => setBreakDuration(e.target.value)} required 
                         className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="30 mins, 1 hour..." />
                   </div>
                   <div className="flex gap-2 pt-2">
                       <Button type="button" variant="outline" className="flex-1" onClick={() => setShowBreakModal(false)}>Cancel</Button>
                       <Button type="submit" className="flex-1">Submit</Button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* My weekly log */}
      <motion.div variants={fadeUp} className="rounded-2xl bg-card shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="text-base font-semibold text-foreground">Recent Attendance</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Check In</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Check Out</th>
            </tr>
          </thead>
          <tbody>
            {myRecords.map((row) => (
              <tr key={row.id} className="border-b last:border-0 transition-colors hover:bg-muted">
                <td className="px-5 py-3 text-sm font-medium text-foreground">{row.date}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadge[row.status]}`}>{row.status}</span>
                </td>
                <td className="px-5 py-3 font-tabular text-sm text-muted-foreground">{row.checkInTime || "—"}</td>
                <td className="px-5 py-3 font-tabular text-sm text-muted-foreground">{row.checkOutTime || "—"}</td>
              </tr>
            ))}
            {myRecords.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-sm text-muted-foreground">No recent records</td></tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* ─── TEAM ATTENDANCE (Admin / Controller only) ─── */}
      {canManage && (
        <>
          {pendingRequests.length > 0 && (
            <motion.div variants={fadeUp} className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5">
              <h2 className="text-base font-semibold text-amber-700 flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5" /> Pending Break Requests ({pendingRequests.length})
              </h2>
              <div className="space-y-2">
                 {pendingRequests.map(req => {
                     const u = users.find(user => user.id === req.userId);
                     return (
                         <div key={req.id} className="flex items-center justify-between bg-white dark:bg-black/20 p-3 rounded-lg border">
                             <div>
                                 <p className="text-sm font-semibold">{u?.name}</p>
                                 <p className="text-xs text-muted-foreground">Reason: {req.reason} | Time: {req.sessionTime}</p>
                             </div>
                              <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-600" onClick={async () => await rejectBreak(req.id)}><X className="h-4 w-4" /></Button>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-green-600" onClick={async () => await approveBreak(req.id)}><Check className="h-4 w-4" /></Button>
                              </div>
                         </div>
                     )
                 })}
              </div>
            </motion.div>
          )}

          {/* Team summary cards */}
          <motion.div variants={fadeUp}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">
                  Team Attendance Summary
                </h2>
              </div>
              <div className="flex gap-2">
                 {["Daily", "Weekly", "Monthly", "Yearly"].map(filter => (
                     <button 
                       key={filter} 
                       onClick={() => setTeamTimeFilter(filter as TeamTimeFilter)}
                       className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${teamTimeFilter === filter ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-border"}`}
                     >
                        {filter}
                     </button>
                 ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Present/Break", count: presentCount, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20" },
                { label: "Late", count: lateCount, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/20" },
                { label: "Absent", count: absentCount, icon: XCircle, color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/20" },
                { label: "On Leave", count: onLeaveCount, icon: CalendarClock, color: "text-muted-foreground", bg: "bg-muted" },
              ].map(({ label, count, icon: Icon, color, bg }) => (
                <div key={label} className="rounded-2xl bg-card p-4 shadow-card">
                  <div className={`mb-2 inline-flex rounded-lg p-2 ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <p className="text-xl font-bold text-foreground">{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Per-person attendance table */}
          <motion.div variants={fadeUp} className="rounded-2xl bg-card shadow-card overflow-visible">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Attendance Records ({teamTimeFilter})</h2>
              {isController && <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">View Only</span>}
            </div>
            <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Check In</th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Check Out</th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    {isAdmin && teamTimeFilter === "Daily" && (
                        <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Mark Admin</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeamRecords.map((rec, index) => (
                    <tr key={`${rec.id}-${index}`} className="border-b last:border-0 transition-colors hover:bg-muted/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                            {rec.name.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-foreground">{rec.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm font-tabular text-muted-foreground">
                        {rec.date}
                      </td>
                      <td className="px-5 py-3 text-sm font-tabular text-muted-foreground hidden md:table-cell">
                        {rec.checkIn}
                      </td>
                      <td className="px-5 py-3 text-sm font-tabular text-muted-foreground hidden md:table-cell">
                        {rec.checkOut}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusBadge[rec.status]}`}>
                          {rec.status}
                        </span>
                      </td>
                      {isAdmin && teamTimeFilter === "Daily" && (
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {STATUS_OPTIONS.map((s) => (
                              <button
                                key={s}
                                onClick={async () => {
                                  await updateMemberAttendance(rec.userId, rec.date, s);
                                  toast.success(`${rec.name} marked as ${s}`);
                                }}
                                className={`rounded-lg px-2 py-1 text-[10px] font-medium transition-colors border ${rec.status === s
                                    ? "bg-foreground text-background border-foreground"
                                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                                  }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredTeamRecords.length === 0 && (
                      <tr><td colSpan={isAdmin && teamTimeFilter === "Daily" ? 6 : 5} className="p-4 text-center text-sm text-muted-foreground">No records found for this period</td></tr>
                  )}
                </tbody>
              </table>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
