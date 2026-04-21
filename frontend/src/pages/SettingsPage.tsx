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
    present: { start: "00:00", end: "09:15" },
    late: { start: "09:16", end: "10:29" },
    absent: { start: "10:30", end: "23:59" },
    leave: { start: "00:00", end: "23:59" },
    break: { start: "00:00", end: "23:59" },
  },
};

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
        if (a && typeof a === "object") {
          setAttendanceSettings({ ...defaultAttendanceSettings, ...a });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.role, currentUser?.companyId]);

  const [hours, setHours] = useState({
    start: "09:00 AM",
    end: "06:00 PM",
    workingDays: "21",
    standup: "09:35 AM",
  });

  // Password change modal
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");

  const handleSave = async () => {
    if (!currentUser) return;
    await updateUser(currentUser.id, profile);
    toast.success("Settings saved!", { description: "Your profile and preferences have been updated." });
  };

  const handleSaveAttendanceRules = async () => {
    if (!currentUser?.companyId || currentUser.role !== "admin") return;
    try {
      await api.tenantCompany.patch(currentUser.companyId, { attendanceSettings, actorUserId: currentUser.id });
      toast.success("Attendance rules saved", { description: "Used for dashboards and future check-in logic." });
    } catch (e: any) {
      toast.error(e?.message || "Could not save attendance rules");
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
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Company attendance rules</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Define expected work window and cut-offs. These values are stored on the company record for reporting and upcoming attendance automation.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Workday start</Label>
                <Input
                  type="time"
                  value={attendanceSettings.workStart}
                  onChange={(e) => setAttendanceSettings((s) => ({ ...s, workStart: e.target.value }))}
                  className="h-11 rounded-lg border-0 bg-muted text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Workday end</Label>
                <Input
                  type="time"
                  value={attendanceSettings.workEnd}
                  onChange={(e) => setAttendanceSettings((s) => ({ ...s, workEnd: e.target.value }))}
                  className="h-11 rounded-lg border-0 bg-muted text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Late after (minutes past start)</Label>
                <Input
                  type="number"
                  min={0}
                  value={attendanceSettings.lateAfterMinutes}
                  onChange={(e) =>
                    setAttendanceSettings((s) => ({ ...s, lateAfterMinutes: Math.max(0, Number(e.target.value) || 0) }))
                  }
                  className="h-11 rounded-lg border-0 bg-muted text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Mark absent if no check-in by</Label>
                <Input
                  type="time"
                  value={attendanceSettings.absentIfNoCheckInBy}
                  onChange={(e) => setAttendanceSettings((s) => ({ ...s, absentIfNoCheckInBy: e.target.value }))}
                  className="h-11 rounded-lg border-0 bg-muted text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Leaderboard reset day</Label>
                <select
                  value={attendanceSettings.resetDay}
                  onChange={(e) => setAttendanceSettings((s) => ({ ...s, resetDay: e.target.value }))}
                  className="h-11 w-full rounded-lg border-0 bg-muted px-3 text-sm"
                >
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(["present", "late", "absent", "leave", "break"] as const).map((k) => (
                <div key={k} className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k} window</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="time"
                      value={attendanceSettings.statusWindows?.[k]?.start || "00:00"}
                      onChange={(e) =>
                        setAttendanceSettings((s) => ({
                          ...s,
                          statusWindows: {
                            ...(s.statusWindows || defaultAttendanceSettings.statusWindows),
                            [k]: { ...(s.statusWindows?.[k] || { start: "00:00", end: "23:59" }), start: e.target.value },
                          },
                        }))
                      }
                      className="h-9 rounded-md border-input bg-background text-xs"
                    />
                    <Input
                      type="time"
                      value={attendanceSettings.statusWindows?.[k]?.end || "23:59"}
                      onChange={(e) =>
                        setAttendanceSettings((s) => ({
                          ...s,
                          statusWindows: {
                            ...(s.statusWindows || defaultAttendanceSettings.statusWindows),
                            [k]: { ...(s.statusWindows?.[k] || { start: "00:00", end: "23:59" }), end: e.target.value },
                          },
                        }))
                      }
                      className="h-9 rounded-md border-input bg-background text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" className="mt-4 h-10 gap-2" onClick={handleSaveAttendanceRules}>
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
        <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Working Hours</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Start Time</Label>
              <Input
                value={hours.start}
                onChange={(e) => setHours({ ...hours, start: e.target.value })}
                className="h-11 rounded-lg border-0 bg-muted text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">End Time</Label>
              <Input
                value={hours.end}
                onChange={(e) => setHours({ ...hours, end: e.target.value })}
                className="h-11 rounded-lg border-0 bg-muted text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Working Days/Month</Label>
              <Input
                value={hours.workingDays}
                onChange={(e) => setHours({ ...hours, workingDays: e.target.value })}
                className="h-11 rounded-lg border-0 bg-muted text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Standup Time</Label>
              <Input
                value={hours.standup}
                onChange={(e) => setHours({ ...hours, standup: e.target.value })}
                className="h-11 rounded-lg border-0 bg-muted text-sm"
              />
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
