import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Bell, Shield, Clock, Key, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function PortalSettingsPage() {
    const { currentUser, updateUser, changePassword } = useAuth();

    const [profile, setProfile] = useState({
        name: currentUser?.name ?? "",
        email: currentUser?.email ?? "",
        department: currentUser?.department ?? "",
        position: currentUser?.position ?? "",
    });

    const [notifPush, setNotifPush] = useState(true);
    const [notifEmail, setNotifEmail] = useState(true);

    const [showPwModal, setShowPwModal] = useState(false);
    const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
    const [showCurPw, setShowCurPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [pwError, setPwError] = useState("");

    const accentColor = currentUser?.role === "controller" ? "text-violet-600" : "text-emerald-600";

    const handleSave = () => {
        if (!currentUser) return;
        updateUser(currentUser.id, {
            name: profile.name.trim(),
            email: profile.email.trim(),
            department: profile.department,
            position: profile.position,
        });
        toast.success("Settings saved!", { description: "Your profile has been updated." });
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        if (!pwForm.current) { setPwError("Current password is required."); return; }
        if (pwForm.next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
        if (pwForm.next !== pwForm.confirm) { setPwError("Passwords do not match."); return; }

        const result = changePassword(currentUser.id, pwForm.current, pwForm.next);
        if (result.success) {
            setShowPwModal(false);
            setPwForm({ current: "", next: "", confirm: "" });
            toast.success("Password changed successfully!");
        } else {
            setPwError(result.error ?? "Failed.");
        }
    };

    return (
        <>
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-3xl">
                <motion.div variants={fadeUp}>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Manage your profile and preferences</p>
                </motion.div>

                {/* Profile */}
                <motion.div variants={fadeUp} className="rounded-2xl bg-card p-6 shadow-card space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <h2 className="text-base font-semibold text-foreground">Profile</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                className="h-11 rounded-lg border-0 bg-muted text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                className="h-11 rounded-lg border-0 bg-muted text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Input disabled value={currentUser?.role === "controller" ? "Controller" : "Employee"}
                                className="h-11 rounded-lg border-0 bg-muted text-sm opacity-60" />
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Input value={profile.department} onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                                className="h-11 rounded-lg border-0 bg-muted text-sm" />
                        </div>
                    </div>

                    {/* Change Password trigger */}
                    <div className="pt-2 border-t flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-foreground">Password</p>
                            <p className="text-xs text-muted-foreground">Update your login password securely</p>
                        </div>
                        <Button
                            id="change-pw-btn"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => { setPwError(""); setShowPwModal(true); }}
                        >
                            <Key className="h-3.5 w-3.5" /> Change Password
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
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-foreground">Push Notifications</p>
                                <p className="text-xs text-muted-foreground">Task updates and reminders</p>
                            </div>
                            <Switch id="notif-push" checked={notifPush} onCheckedChange={(v) => { setNotifPush(v); toast.success(`Push Notifications ${v ? "enabled" : "disabled"}`); }} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                                <p className="text-xs text-muted-foreground">Weekly performance digest</p>
                            </div>
                            <Switch id="notif-email" checked={notifEmail} onCheckedChange={(v) => { setNotifEmail(v); toast.success(`Email Notifications ${v ? "enabled" : "disabled"}`); }} />
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={fadeUp}>
                    <Button id="save-portal-settings" className="h-11 gap-2 rounded-lg px-6" onClick={handleSave}>
                        <Save className="h-4 w-4" /> Save Changes
                    </Button>
                </motion.div>
            </motion.div>

            {/* Change Password Modal */}
            <AnimatePresence>
                {showPwModal && (
                    <>
                        <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowPwModal(false)}
                            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
                        <motion.div key="modal"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl border border-border">
                                <div className="flex items-center justify-between border-b px-6 py-4">
                                    <h2 className="text-base font-semibold text-foreground">Change Password</h2>
                                    <button onClick={() => setShowPwModal(false)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                                <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="cur-pw">Current Password</Label>
                                        <div className="relative">
                                            <Input id="cur-pw" type={showCurPw ? "text" : "password"} placeholder="••••••••"
                                                value={pwForm.current}
                                                onChange={(e) => { setPwForm({ ...pwForm, current: e.target.value }); setPwError(""); }}
                                                className="h-9 pr-9" autoFocus
                                            />
                                            <button type="button" onClick={() => setShowCurPw(!showCurPw)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                {showCurPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="new-pw">New Password</Label>
                                        <div className="relative">
                                            <Input id="new-pw" type={showNewPw ? "text" : "password"} placeholder="Min 6 characters"
                                                value={pwForm.next}
                                                onChange={(e) => { setPwForm({ ...pwForm, next: e.target.value }); setPwError(""); }}
                                                className="h-9 pr-9"
                                            />
                                            <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="confirm-new">Confirm New Password</Label>
                                        <Input id="confirm-new" type="password" placeholder="Repeat new password"
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
