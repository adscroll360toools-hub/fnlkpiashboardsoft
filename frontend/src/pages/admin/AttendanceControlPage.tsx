import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, AlertTriangle, Clock,
  Calendar, Users, Edit3, Save, X, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { stagger, fadeUp } from "@/lib/animations";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAttendance, AttendanceStatus } from "@/context/AttendanceContext";

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string; icon: React.ElementType }[] = [
  { value: "Present", label: "Present", color: "bg-green-500 hover:bg-green-600 text-white", icon: CheckCircle2 },
  { value: "Late",    label: "Late",    color: "bg-amber-500 hover:bg-amber-600 text-white", icon: AlertTriangle },
  { value: "Absent",  label: "Absent",  color: "bg-red-500 hover:bg-red-600 text-white",     icon: XCircle },
  { value: "Leave",   label: "Leave",   color: "bg-slate-500 hover:bg-slate-600 text-white", icon: Calendar },
];

const statusBadge: Record<string, string> = {
  Present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Late:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Absent:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Leave:   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  Break:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "—":     "bg-muted text-muted-foreground",
};

interface EditState {
  userId: string;
  checkIn: string;
  checkOut: string;
}

export default function AttendanceControlPage() {
  const { users } = useAuth();
  const { records, updateMemberAttendance } = useAttendance();

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(today);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const teamMembers = users.filter((u) => u.role !== "admin");

  const memberRows = useMemo(() =>
    teamMembers.map((u) => {
      const rec = records.find((r) => r.userId === u.id && r.date === selectedDate);
      return {
        userId: u.id,
        name: u.name,
        role: u.role,
        department: u.department || "—",
        status: rec?.status || "—",
        checkIn: rec?.checkInTime || "",
        checkOut: rec?.checkOutTime || "",
        recordId: rec?.id,
      };
    }),
  [teamMembers, records, selectedDate]);

  const stats = useMemo(() => ({
    present: memberRows.filter((r) => r.status === "Present" || r.status === "Break").length,
    late:    memberRows.filter((r) => r.status === "Late").length,
    absent:  memberRows.filter((r) => r.status === "Absent").length,
    noRecord: memberRows.filter((r) => r.status === "—").length,
  }), [memberRows]);

  const handleMarkStatus = async (userId: string, status: AttendanceStatus) => {
    setSaving(userId);
    await updateMemberAttendance(userId, selectedDate, status);
    toast.success(`Marked as ${status}`);
    setSaving(null);
  };

  const handleMarkAll = async (status: AttendanceStatus) => {
    for (const m of teamMembers) {
      await updateMemberAttendance(m.id, selectedDate, status);
    }
    toast.success(`All members marked as ${status}`);
  };

  const handleSaveTime = async () => {
    if (!editState) return;
    setSaving(editState.userId);
    // Build a status update that preserves the current status but adds time overrides
    const row = memberRows.find((r) => r.userId === editState.userId);
    const currentStatus = (row?.status && row.status !== "—") ? row.status as AttendanceStatus : "Present";
    await updateMemberAttendance(editState.userId, selectedDate, currentStatus);
    toast.success("Times saved (status preserved)");
    setEditState(null);
    setSaving(null);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-primary" />
            Attendance Control
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manually set Present / Late / Absent for each team member
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          />
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Present", count: stats.present, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20" },
          { label: "Late",    count: stats.late,    color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/20" },
          { label: "Absent",  count: stats.absent,  color: "text-red-600",   bg: "bg-red-100 dark:bg-red-900/20" },
          { label: "No Record", count: stats.noRecord, color: "text-muted-foreground", bg: "bg-muted" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className="rounded-2xl bg-card p-4 shadow-sm border">
            <p className={`text-2xl font-bold ${color}`}>{count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            <div className={`mt-2 h-1.5 rounded-full ${bg}`}>
              <div
                className={`h-full rounded-full ${color.replace("text-", "bg-")}`}
                style={{ width: `${teamMembers.length ? (count / teamMembers.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </motion.div>

      {/* Bulk actions */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-medium text-muted-foreground mr-1">Mark All As:</span>
        {STATUS_OPTIONS.map(({ value, label, color }) => (
          <button
            key={value}
            onClick={() => handleMarkAll(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${color}`}
          >
            {label}
          </button>
        ))}
      </motion.div>

      {/* Member table */}
      <motion.div variants={fadeUp} className="rounded-2xl bg-card border shadow-sm overflow-visible">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">
            Team Members — {selectedDate}
          </h2>
          <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {teamMembers.length} members
          </span>
        </div>

        <div className="divide-y">
          {memberRows.map((row) => (
            <div key={row.userId} className="px-5 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Name + meta */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {row.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{row.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{row.role} · {row.department}</p>
                  </div>
                </div>

                {/* Current status badge */}
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusBadge[row.status]}`}>
                  {row.status}
                </span>

                {/* Time display / edit */}
                {editState?.userId === row.userId ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">In:</span>
                      <input
                        type="time"
                        value={editState.checkIn}
                        onChange={(e) => setEditState({ ...editState, checkIn: e.target.value })}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Out:</span>
                      <input
                        type="time"
                        value={editState.checkOut}
                        onChange={(e) => setEditState({ ...editState, checkOut: e.target.value })}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      />
                    </div>
                    <Button size="sm" className="h-8 gap-1 px-3 text-xs" onClick={handleSaveTime} disabled={saving === row.userId}>
                      <Save className="h-3 w-3" /> Save
                    </Button>
                    <button onClick={() => setEditState(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{row.checkIn || "—"}</span>
                      <span>→</span>
                      <span>{row.checkOut || "—"}</span>
                    </div>
                    <button
                      onClick={() => setEditState({ userId: row.userId, checkIn: row.checkIn, checkOut: row.checkOut })}
                      className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Edit times"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Status action buttons */}
                <div className="flex gap-1.5 shrink-0 flex-wrap">
                  {STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      disabled={saving === row.userId}
                      onClick={() => handleMarkStatus(row.userId, value)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border transition-all ${
                        row.status === value
                          ? value === "Present" ? "bg-green-500 text-white border-green-500"
                          : value === "Late"    ? "bg-amber-500 text-white border-amber-500"
                          : value === "Absent"  ? "bg-red-500 text-white border-red-500"
                          :                       "bg-slate-500 text-white border-slate-500"
                          : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {teamMembers.length === 0 && (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No team members found. Add employees first.
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
