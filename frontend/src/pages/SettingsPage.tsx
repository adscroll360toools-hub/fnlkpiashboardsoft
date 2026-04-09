import { useState } from "react";
import { motion } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Bell, Shield, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

export default function SettingsPage() {
  const { currentUser, updateUser, changePassword } = useAuth();
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

  const handleNotifToggle = (key: string, val: boolean) => {
    if (key === "notifications") setNotifications(val);
    if (key === "dailyReminder") setDailyReminder(val);
    if (key === "weeklyReport") setWeeklyReport(val);
    toast.success(`${key === "notifications" ? "Push Notifications" : key === "dailyReminder" ? "Daily Reminder" : "Weekly Report"} ${val ? "enabled" : "disabled"}`);
  };

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
