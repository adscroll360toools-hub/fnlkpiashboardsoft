import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Bell, Shield, Clock, X, UserCheck, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useAttendance } from "@/context/AttendanceContext";
import { api } from "@/lib/api";

const defaultAttendanceSettings = {
  workStart: "09:00",
  workEnd: "18:00",
  lateAfterMinutes: 15,
  absentIfNoCheckInBy: "10:30",
  resetDay: "Sunday",
  statusWindows: {
    present: { start: "09:00", end: "11:30" },
    late: { start: "11:31", end: "13:00" },
    absent: { start: "13:01", end: "14:00" },
    leave: { start: "14:01", end: "08:59" },
    break: { start: "09:00", end: "17:30" },
  },
};

const defaultWorkingHours = {
  start: "09:00",
  end: "18:00",
  workingDaysPerMonth: 8,
  standupTime: "09:35",
};

const STATUS_WINDOW_ORDER = ["present", "late", "absent", "leave", "break"] as const;
type StatusWindowKey = (typeof STATUS_WINDOW_ORDER)[number];

const WINDOW_TITLE: Record<StatusWindowKey, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  leave: "Leave",
  break: "Break",
};

function minutesToHHMM(total: number): string {
  const m = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Minutes from end time to start time (next occurrence of start after end on the clock). */
function gapMinutesBetween(endHHMM: string, startHHMM: string): number | null {
  const e = parseMinutes(endHHMM);
  const s = parseMinutes(startHHMM);
  if (e == null || s == null) return null;
  if (s >= e) return s - e;
  return s + 1440 - e;
}

function formatGapLabel(endHHMM: string, startHHMM: string): string {
  const g = gapMinutesBetween(endHHMM, startHHMM);
  if (g == null) return "—";
  if (g === 0) return "Same time";
  if (g === 1) return "1 min";
  const h = Math.floor(g / 60);
  const m = g % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function parseMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

function formatDuration(start: string, end: string): string {
  const s = parseMinutes(start);
  const e = parseMinutes(end);
  if (s == null || e == null) return "Invalid time";
  const total = (e - s + 1440) % 1440 || 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function toMeridiemLabel(hhmm: string): string {
  const mins = parseMinutes(hhmm);
  if (mins == null) return hhmm;
  const hour24 = Math.floor(mins / 60);
  const minute = mins % 60;
  const isPm = hour24 >= 12;
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${isPm ? "PM" : "AM"}`;
}

export default function SettingsPage() {
  const { currentUser, users, updateUser, changePassword } = useAuth();
  const [attendanceSettings, setAttendanceSettings] = useState(defaultAttendanceSettings);
  const { records } = useAttendance();
  const [notifications, setNotifications] = useState(true);
  const [dailyReminder, setDailyReminder] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    department: "",
  });

  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name,
        email: currentUser.email,
        department: currentUser.department || "",
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role !== "admin" || !currentUser.companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const { company } = await api.tenantCompany.get(currentUser.companyId!);
        if (cancelled || !company) return;
        const a = company.attendanceSettings;
        const w = company.workingHours;
        if (a && typeof a === "object") {
          setAttendanceSettings({
            ...defaultAttendanceSettings,
            ...a,
            statusWindows: {
              ...defaultAttendanceSettings.statusWindows,
              ...(a.statusWindows || {}),
            },
          });
        }
        if (w && typeof w === "object") {
          setHours({
            start: typeof w.start === "string" ? w.start : defaultWorkingHours.start,
            end: typeof w.end === "string" ? w.end : defaultWorkingHours.end,
            workingDaysPerMonth: Math.max(1, Number(w.workingDaysPerMonth) || defaultWorkingHours.workingDaysPerMonth),
            standupTime: typeof w.standupTime === "string" ? w.standupTime : defaultWorkingHours.standupTime,
          });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.role, currentUser?.companyId]);

  const [hours, setHours] = useState(defaultWorkingHours);

  // Password change modal
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  const handleSave = async () => {
    if (!currentUser) return;
    await updateUser(currentUser.id, profile);
    if (currentUser.role === "admin" && currentUser.companyId) {
      await api.tenantCompany.patch(currentUser.companyId, {
        workingHours: hours,
        actorUserId: currentUser.id,
      });
    }
    toast.success("Settings saved!", { description: "Profile and working hours have been updated." });
  };

  const handleSaveAttendanceRules = async () => {
    if (!currentUser?.companyId || currentUser.role !== "admin") return;
    try {
      await api.tenantCompany.patch(currentUser.companyId, { attendanceSettings, actorUserId: currentUser.id });
      toast.success("Attendance rules saved", { description: "Used for dashboards and future check-in logic." });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save attendance rules";
      toast.error(msg);
    }
  };

  const handleNotifToggle = (key: string, val: boolean) => {
    if (key === "notifications") setNotifications(val);
    if (key === "dailyReminder") setDailyReminder(val);
    if (key === "weeklyReport") setWeeklyReport(val);
    toast.success(`${key === "notifications" ? "Push Notifications" : key === "dailyReminder" ? "Daily Reminder" : "Weekly Report"} ${val ? "enabled" : "disabled"}`);
  };

  const todayYmd = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const attendanceSnapshot = useMemo(() => {
    if (currentUser?.role !== "admin") return null;
    const team = users.filter((u) => u.role !== "admin");
    const rows = team.map((u) => {
      const rec = records.find((r) => r.userId === u.id && r.date === todayYmd);
      return rec?.status || "—";
    });
    return {
      present: rows.filter((s) => s === "Present").length,
      brk: rows.filter((s) => s === "Break").length,
      late: rows.filter((s) => s === "Late").length,
      absent: rows.filter((s) => s === "Absent").length,
      leave: rows.filter((s) => s === "Leave").length,
      none: rows.filter((s) => s === "—").length,
      total: team.length,
    };
  }, [currentUser?.role, users, records, todayYmd]);

  /** Mirrors `statusFromCheckInTime` so admins see the same cutoffs as employees/controllers. */
  const checkInStatusGuide = useMemo(() => {
    const ws = parseMinutes(attendanceSettings.workStart) ?? 9 * 60;
    const graceEnd = ws + Math.max(0, Number(attendanceSettings.lateAfterMinutes) || 0);
    const absentStart = parseMinutes(attendanceSettings.absentIfNoCheckInBy) ?? graceEnd + 60;
    const presentEnd = Math.min(graceEnd, Math.max(0, absentStart - 1));
    const hasLateBand = presentEnd + 1 < absentStart;
    const graceWasClamped = graceEnd > presentEnd;
    return {
      presentEndLabel: toMeridiemLabel(minutesToHHMM(presentEnd)),
      absentStartLabel: toMeridiemLabel(minutesToHHMM(absentStart)),
      hasLateBand,
      rawGraceLabel: toMeridiemLabel(minutesToHHMM(graceEnd)),
      graceWasClamped,
    };
  }, [attendanceSettings]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!pwForm.current) { setPwError("Current password is required."); return; }
    if (pwForm.next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords do not match."); return; }
    
    const res = await changePassword(currentUser.id, pwForm.current, pwForm.next);
    if (res.success) {
        setShowPwModal(false);
        setPwForm({ current: "", next: "", confirm: "" });
        toast.success("Password changed successfully!");
    } else {
        setPwError(res.error || "Failed to change password.");
    }
  };

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-3xl">
        <motion.div variants={fadeUp}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account and preferences</p>
        </motion.div>

        {/* Profile */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Profile</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Full Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="h-11 rounded-lg border-0 bg-muted text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Email</Label>
              <Input
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="h-11 rounded-lg border-0 bg-muted text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Role</Label>
              <Input defaultValue="Core Admin" disabled className="h-11 rounded-lg border-0 bg-muted text-sm opacity-60" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Department</Label>
              <Input
                value={profile.department}
                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                className="h-11 rounded-lg border-0 bg-muted text-sm"
              />
            </div>
          </div>
          <div className="pt-1">
            <Button
              id="change-password-btn"
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => { setPwError(""); setShowPwModal(true); }}
            >
              Change Password
            </Button>
          </div>
        </motion.div>

        {currentUser?.role === "admin" && attendanceSnapshot && (
          <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card border border-border">
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Company attendance (today)</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Admin-only summary. Employees see attendance on their own pages; editing is restricted to attendance control.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 text-center">
              {[
                { label: "Present", v: attendanceSnapshot.present, c: "text-green-600" },
                { label: "Break", v: attendanceSnapshot.brk, c: "text-blue-600" },
                { label: "Late", v: attendanceSnapshot.late, c: "text-amber-600" },
                { label: "Absent", v: attendanceSnapshot.absent, c: "text-red-600" },
                { label: "On leave", v: attendanceSnapshot.leave, c: "text-slate-600" },
                { label: "No record", v: attendanceSnapshot.none, c: "text-muted-foreground" },
              ].map((x) => (
                <div key={x.label} className="rounded-xl bg-muted/40 py-3">
                  <p className={`text-xl font-bold ${x.c}`}>{x.v}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{x.label}</p>
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-4 w-full sm:w-auto gap-2">
              <Link to="/admin/attendance-control">
                Open attendance control <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        )}

        {currentUser?.role === "admin" && currentUser.companyId && (
          <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card border border-border">
            <div className="flex flex-col gap-1 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-tight text-foreground">Company attendance rules</h2>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                    Define expected work window and cut-offs. These values are stored on the company record for reporting and upcoming attendance automation.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workday & cut-offs</h3>
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-1">
                    <Label className="text-sm font-medium text-foreground">Workday start</Label>
                    <Input
                      type="time"
                      value={attendanceSettings.workStart}
                      onChange={(e) => setAttendanceSettings((s) => ({ ...s, workStart: e.target.value }))}
                      className="h-11 rounded-lg border border-border/60 bg-muted/50 text-sm font-tabular-nums"
                    />
                    <p className="text-[11px] tabular-nums text-muted-foreground">{toMeridiemLabel(attendanceSettings.workStart)}</p>
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <Label className="text-sm font-medium text-foreground">Workday end</Label>
                    <Input
                      type="time"
                      value={attendanceSettings.workEnd}
                      onChange={(e) => setAttendanceSettings((s) => ({ ...s, workEnd: e.target.value }))}
                      className="h-11 rounded-lg border border-border/60 bg-muted/50 text-sm font-tabular-nums"
                    />
                    <p className="text-[11px] tabular-nums text-muted-foreground">{toMeridiemLabel(attendanceSettings.workEnd)}</p>
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <Label className="text-sm font-medium text-foreground">Late after (minutes past start)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1440}
                      value={attendanceSettings.lateAfterMinutes}
                      onChange={(e) =>
                        setAttendanceSettings((s) => ({
                          ...s,
                          lateAfterMinutes: Math.min(1440, Math.max(0, Number(e.target.value) || 0)),
                        }))
                      }
                      className="h-11 rounded-lg border border-border/60 bg-muted/50 text-sm font-tabular-nums"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-1">
                    <Label className="text-sm font-medium text-foreground">Mark absent if no check-in by</Label>
                    <Input
                      type="time"
                      value={attendanceSettings.absentIfNoCheckInBy}
                      onChange={(e) => setAttendanceSettings((s) => ({ ...s, absentIfNoCheckInBy: e.target.value }))}
                      className="h-11 rounded-lg border border-border/60 bg-muted/50 text-sm font-tabular-nums"
                    />
                    <p className="text-[11px] tabular-nums text-muted-foreground">{toMeridiemLabel(attendanceSettings.absentIfNoCheckInBy)}</p>
                  </div>
                  <div className="space-y-2 sm:col-span-2 sm:max-w-md">
                    <Label className="text-sm font-medium text-foreground">Leaderboard reset day</Label>
                    <select
                      value={attendanceSettings.resetDay}
                      onChange={(e) => setAttendanceSettings((s) => ({ ...s, resetDay: e.target.value }))}
                      className="h-11 w-full rounded-lg border border-border/60 bg-muted/50 px-3 text-sm"
                    >
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                <p className="text-xs font-semibold text-foreground">Check-in status (used for employees & controllers)</p>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">Present</span> — check-in at or before{" "}
                    <span className="font-tabular-nums text-foreground">{checkInStatusGuide.presentEndLabel}</span>
                    {checkInStatusGuide.graceWasClamped ? (
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        Late-after would allow arrivals until {checkInStatusGuide.rawGraceLabel}; the absent cutoff caps
                        on-time arrivals to {checkInStatusGuide.presentEndLabel}.
                      </span>
                    ) : null}
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Late</span> — after that, before{" "}
                    <span className="font-tabular-nums text-foreground">{checkInStatusGuide.absentStartLabel}</span>
                    {!checkInStatusGuide.hasLateBand ? (
                      <span className="text-amber-700 dark:text-amber-400">
                        {" "}
                        (no minutes left between on-time end and absent time — raise absent cutoff or lower late-after.)
                      </span>
                    ) : null}
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Absent</span> — at or after{" "}
                    <span className="font-tabular-nums text-foreground">{checkInStatusGuide.absentStartLabel}</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status windows</h3>
                <p className="mb-4 text-[11px] text-muted-foreground">
                  Reporting windows (may cross midnight). Duration and gaps update as you edit.
                </p>
                <div className="relative space-y-0 pl-3 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-12px)] before:w-px before:bg-border">
                  {STATUS_WINDOW_ORDER.map((k, idx) => {
                    const win = attendanceSettings.statusWindows?.[k] || defaultAttendanceSettings.statusWindows[k];
                    const nextKey = STATUS_WINDOW_ORDER[idx + 1];
                    const nextWin = nextKey
                      ? attendanceSettings.statusWindows?.[nextKey] || defaultAttendanceSettings.statusWindows[nextKey]
                      : null;
                    return (
                      <div key={k}>
                        <div className="rounded-xl border border-border/80 bg-background/80 p-4 shadow-sm">
                          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{WINDOW_TITLE[k]} window</p>
                            <p className="text-[11px] font-tabular-nums text-muted-foreground">
                              {toMeridiemLabel(win.start)} → {toMeridiemLabel(win.end)} ·{" "}
                              <span className="text-foreground">{formatDuration(win.start, win.end)}</span>
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Start</Label>
                              <Input
                                type="time"
                                value={win.start}
                                onChange={(e) =>
                                  setAttendanceSettings((s) => ({
                                    ...s,
                                    statusWindows: {
                                      ...(s.statusWindows || defaultAttendanceSettings.statusWindows),
                                      [k]: { ...win, start: e.target.value },
                                    },
                                  }))
                                }
                                className="h-10 rounded-lg border border-border/60 bg-muted/40 text-sm font-tabular-nums"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">End</Label>
                              <Input
                                type="time"
                                value={win.end}
                                onChange={(e) =>
                                  setAttendanceSettings((s) => ({
                                    ...s,
                                    statusWindows: {
                                      ...(s.statusWindows || defaultAttendanceSettings.statusWindows),
                                      [k]: { ...win, end: e.target.value },
                                    },
                                  }))
                                }
                                className="h-10 rounded-lg border border-border/60 bg-muted/40 text-sm font-tabular-nums"
                              />
                            </div>
                          </div>
                        </div>
                        {nextWin ? (
                          <div className="flex items-stretch py-2 pl-1">
                            <div className="w-4 shrink-0" />
                            <div className="flex flex-1 items-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gap</span>
                              <span className="text-xs text-muted-foreground">
                                {toMeridiemLabel(win.end)} → {toMeridiemLabel(nextWin.start)} ·{" "}
                                <span className="font-medium text-foreground">{formatGapLabel(win.end, nextWin.start)}</span>
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <Button type="button" className="mt-6 h-10 w-full gap-2 sm:w-auto" onClick={handleSaveAttendanceRules}>
              <Save className="h-4 w-4" /> Save attendance rules
            </Button>
          </motion.div>
        )}

        {/* Notifications */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Notifications</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "notifications", label: "Push Notifications", desc: "Receive alerts for task updates", value: notifications },
              { key: "dailyReminder", label: "Daily Task Reminder", desc: "Get reminded at 9:00 AM", value: dailyReminder },
              { key: "weeklyReport", label: "Weekly Report Email", desc: "Summary every Friday", value: weeklyReport },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  id={`toggle-${item.key}`}
                  checked={item.value}
                  onCheckedChange={(v) => handleNotifToggle(item.key, v)}
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Working Hours */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card border border-border space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="text-base font-semibold text-foreground">Working Hours</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Saved with your profile. Working days/month is used on the attendance page for all employees and controllers.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Start Time</Label>
              <Input
                type="time"
                value={hours.start}
                onChange={(e) => setHours({ ...hours, start: e.target.value })}
                className="h-11 rounded-lg border border-border/60 bg-muted/50 text-sm font-tabular-nums"
              />
              <p className="text-[11px] tabular-nums text-muted-foreground">{toMeridiemLabel(hours.start)}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">End Time</Label>
              <Input
                type="time"
                value={hours.end}
                onChange={(e) => setHours({ ...hours, end: e.target.value })}
                className="h-11 rounded-lg border border-border/60 bg-muted/50 text-sm font-tabular-nums"
              />
              <p className="text-[11px] tabular-nums text-muted-foreground">{toMeridiemLabel(hours.end)}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Working Days/Month</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={hours.workingDaysPerMonth}
                onChange={(e) =>
                  setHours({ ...hours, workingDaysPerMonth: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })
                }
                className="h-11 rounded-lg border border-border/60 bg-muted/50 text-sm font-tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Standup Time</Label>
              <Input
                type="time"
                value={hours.standupTime}
                onChange={(e) => setHours({ ...hours, standupTime: e.target.value })}
                className="h-11 rounded-lg border border-border/60 bg-muted/50 text-sm font-tabular-nums"
              />
              <p className="text-[11px] tabular-nums text-muted-foreground">{toMeridiemLabel(hours.standupTime)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Button
            id="save-settings-btn"
            className="h-11 gap-2 rounded-lg px-6 text-sm font-medium"
            onClick={handleSave}
          >
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </motion.div>
      </motion.div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPwModal && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPwModal(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl border border-border">
                <div className="flex items-center justify-between border-b px-6 py-4">
                  <h2 className="text-base font-semibold text-foreground">Change Password</h2>
                  <button
                    onClick={() => setShowPwModal(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-current">Current Password</Label>
                    <Input
                      id="pw-current"
                      type="password"
                      placeholder="••••••••"
                      value={pwForm.current}
                      onChange={(e) => { setPwForm({ ...pwForm, current: e.target.value }); setPwError(""); }}
                      className="h-9"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-new">New Password</Label>
                    <Input
                      id="pw-new"
                      type="password"
                      placeholder="Min 6 characters"
                      value={pwForm.next}
                      onChange={(e) => { setPwForm({ ...pwForm, next: e.target.value }); setPwError(""); }}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pw-confirm">Confirm New Password</Label>
                    <Input
                      id="pw-confirm"
                      type="password"
                      placeholder="Repeat new password"
                      value={pwForm.confirm}
                      onChange={(e) => { setPwForm({ ...pwForm, confirm: e.target.value }); setPwError(""); }}
                      className="h-9"
                    />
                  </div>
                  {pwError && <p className="text-xs text-destructive">{pwError}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setShowPwModal(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1 h-9">Update Password</Button>
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
