import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp } from "@/lib/animations";
import { useAuth, AppUser, UserRole } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Plus, X, Shield, Users, UserCircle, Trash2, Key,
    Eye, EyeOff, MoreHorizontal, Edit, Search,
} from "lucide-react";
import { toast } from "sonner";
import { useOutsideClick } from "@/hooks/useOutsideClick";

const ROLE_META: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string; badge: string }> = {
    admin: { label: "Core Admin", icon: Shield, color: "text-primary", bg: "bg-primary/10", badge: "bg-primary/10 text-primary" },
    controller: { label: "Controller", icon: Users, color: "text-violet-600", bg: "bg-violet-100 dark:bg-violet-900/20", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400" },
    employee: { label: "Employee", icon: UserCircle, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/20", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" },
};

const DEPARTMENTS = ["Management", "Content", "Design", "Marketing", "Analytics", "Sales", "Other"];
const ROLES_SELECTABLE: ("controller" | "employee")[] = ["controller", "employee"];

type ModalMode = "add-controller" | "add-employee" | "change-password" | "edit" | null;

const emptyUserForm = { name: "", email: "", password: "", confirmPassword: "", department: DEPARTMENTS[0], position: "", score: 80, role: "employee" as "controller" | "employee", companyRoleId: "" };
const emptyPwForm = { newPw: "", confirmPw: "" };

export default function UserManagementPage() {
    const { users, companyRoles, addUser, removeUser, updateUser, changePassword, forceResetPassword } = useAuth();

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [editTarget, setEditTarget] = useState<AppUser | null>(null);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
    const [formError, setFormError] = useState("");
    const [userForm, setUserForm] = useState(emptyUserForm);
    const [pwForm, setPwForm] = useState(emptyPwForm);
    const [showPw, setShowPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [filterRole, setFilterRole] = useState<UserRole | "all">("all");
    const [search, setSearch] = useState("");

    const managed = users.filter((u) => u.role !== "admin");
    const filtered = managed.filter((u) => {
        const matchRole = filterRole === "all" || u.role === filterRole;
        const term = search.toLowerCase();
        const matchSearch = !term || u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || (u.department ?? "").toLowerCase().includes(term) || (u.position ?? "").toLowerCase().includes(term);
        return matchRole && matchSearch;
    });

    const openAdd = (role: "controller" | "employee") => {
        setModalMode(role === "controller" ? "add-controller" : "add-employee");
        setUserForm({ ...emptyUserForm, role, companyRoleId: "" });
        setFormError("");
        setShowPw(false);
    };

    const openEdit = (user: AppUser) => {
        setEditTarget(user);
        setUserForm({ name: user.name, email: user.email, password: "", confirmPassword: "", department: user.department ?? DEPARTMENTS[0], position: user.position ?? "", score: (user as any).score ?? 80, role: user.role as "controller" | "employee", companyRoleId: user.companyRoleId ?? "" });
        setFormError("");
        setModalMode("edit");
        setMenuOpen(null);
    };

    const openChangePw = (user: AppUser) => {
        setEditTarget(user);
        setPwForm(emptyPwForm);
        setFormError("");
        setShowNewPw(false);
        setModalMode("change-password");
        setMenuOpen(null);
    };

    const closeModal = () => { setModalMode(null); setEditTarget(null); setFormError(""); };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userForm.name.trim()) { setFormError("Full name is required."); return; }
        if (!userForm.email.trim()) { setFormError("Email is required."); return; }
        if (userForm.password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
        if (userForm.password !== userForm.confirmPassword) { setFormError("Passwords do not match."); return; }

        const role: UserRole = userForm.role === "controller" ? "controller" : "employee";
        const result = await addUser({
            name: userForm.name.trim(),
            email: userForm.email.trim(),
            password: userForm.password,
            role,
            department: userForm.department,
            position: userForm.position.trim() || (role === "controller" ? "Controller" : "Employee"),
            companyRoleId: userForm.companyRoleId || undefined,
        });

        if (result.success) {
            toast.success(`${ROLE_META[role].label} added!`, { description: `${userForm.name} can now sign in.` });
            closeModal();
        } else {
            setFormError(result.error ?? "Failed to add user.");
        }
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTarget) return;
        if (!userForm.name.trim()) { setFormError("Full name is required."); return; }
        if (!userForm.email.trim()) { setFormError("Email is required."); return; }
        await updateUser(editTarget.id, {
            name: userForm.name.trim(),
            email: userForm.email.trim(),
            department: userForm.department,
            position: userForm.position.trim(),
            role: userForm.role,
            companyRoleId: userForm.companyRoleId || null,
        });
        toast.success("User updated!", { description: userForm.name });
        closeModal();
    };

    const handleChangePw = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTarget) return;
        if (!pwForm.newPw) { setFormError("New password is required."); return; }
        if (pwForm.newPw !== pwForm.confirmPw) { setFormError("Passwords do not match."); return; }
        const result = await forceResetPassword(editTarget.id, pwForm.newPw);
        if (result.success) {
            toast.success("Password reset!", { description: `${editTarget.name}'s password has been updated.` });
            closeModal();
        } else {
            setFormError(result.error ?? "Failed.");
        }
    };

    const handleDelete = async (user: AppUser) => {
        await removeUser(user.id);
        setMenuOpen(null);
        toast.error("User removed", { description: user.name });
    };

    const menuRef = useRef<HTMLDivElement>(null);
    useOutsideClick(menuRef, () => setMenuOpen(null));

    const modalTitle: Record<string, string> = {
        "add-controller": "Add New Controller",
        "add-employee": "Add New Employee",
        "edit": `Edit — ${editTarget?.name ?? ""}`,
        "change-password": `Reset Password — ${editTarget?.name ?? ""}`,
    };

    return (
        <>
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
                <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Users</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage all Controllers and Employees. Assign portal roles and optional custom roles under Roles.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" className="h-10 gap-2 rounded-lg px-4 text-sm font-medium text-violet-600 border-violet-200 hover:bg-violet-50 dark:hover:bg-violet-900/20" onClick={() => openAdd("controller")}>
                            <Plus className="h-4 w-4" /> New Controller
                        </Button>
                        <Button className="h-10 gap-2 rounded-lg px-4 text-sm font-medium" onClick={() => openAdd("employee")}>
                            <Plus className="h-4 w-4" /> New Employee
                        </Button>
                    </div>
                </motion.div>

                <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
                    {(["all", "controller", "employee"] as const).map((role) => {
                        const count = role === "all" ? managed.length : managed.filter((u) => u.role === role).length;
                        const meta = role === "all" ? { label: "Total Users", icon: Shield, color: "text-foreground", bg: "bg-muted" } : ROLE_META[role];
                        const Icon = meta.icon;
                        const isActive = filterRole === role;
                        return (
                            <button key={role} onClick={() => setFilterRole(role)} className={`rounded-2xl bg-card p-4 text-left transition-all shadow-card hover:shadow-card-hover ${isActive ? "ring-2 ring-primary" : ""}`}>
                                <div className={`mb-2 inline-flex rounded-xl p-2 ${meta.bg}`}><Icon className={`h-4 w-4 ${meta.color}`} /></div>
                                <p className="text-2xl font-bold text-foreground">{count}</p>
                                <p className="text-xs text-muted-foreground">{meta.label}</p>
                            </button>
                        );
                    })}
                </motion.div>

                <motion.div variants={fadeUp} className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-lg border-0 bg-muted pl-10 text-sm" />
                </motion.div>

                <motion.div variants={fadeUp} className="rounded-2xl bg-card shadow-card overflow-visible">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">User</th>
                                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Role</th>
                                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Department</th>
                                <th className="px-5 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {filtered.map((user) => {
                                    const meta = ROLE_META[user.role];
                                    const Icon = meta.icon;
                                    return (
                                        <motion.tr key={user.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b last:border-0 transition-colors hover:bg-muted/50">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8"><AvatarFallback className={`text-xs font-medium ${meta.bg} ${meta.color}`}>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                                                    <div><p className="text-sm font-medium text-foreground">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 hidden sm:table-cell"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${meta.badge}`}><Icon className="h-3 w-3" /> {meta.label}</span></td>
                                            <td className="px-5 py-3 text-sm text-muted-foreground hidden md:table-cell">{user.department ?? "—"}</td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="relative inline-block">
                                                    <button onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                                                    <AnimatePresence>
                                                        {menuOpen === user.id && (
                                                            <motion.div ref={menuRef} initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} className="absolute right-0 top-8 z-[200] w-44 rounded-xl border bg-card shadow-xl overflow-hidden py-1">
                                                                <button onClick={() => openEdit(user)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"><Edit className="h-3.5 w-3.5" /> Edit Details</button>
                                                                <button onClick={() => openChangePw(user)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"><Key className="h-3.5 w-3.5" /> Reset Password</button>
                                                                <button onClick={() => handleDelete(user)} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Remove User</button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {modalMode && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="w-full max-w-md rounded-2xl bg-card shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between border-b px-6 py-4">
                                    <h2 className="text-base font-semibold text-foreground">{modalTitle[modalMode]}</h2>
                                    <button onClick={closeModal}><X className="h-5 w-5"/></button>
                                </div>
                                {(modalMode === "add-controller" || modalMode === "add-employee" || modalMode === "edit") && (
                                    <form onSubmit={modalMode === "edit" ? handleEditUser : handleAddUser} className="px-6 py-5 space-y-4">
                                        <div className="space-y-1.5">
                                            <Label>Portal role</Label>
                                            <select
                                                value={userForm.role}
                                                onChange={(e) => {
                                                    const r = e.target.value as "controller" | "employee";
                                                    setUserForm({ ...userForm, role: r, companyRoleId: "" });
                                                }}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                            >
                                                <option value="employee">Employee</option>
                                                <option value="controller">Controller</option>
                                            </select>
                                            <p className="text-[11px] text-muted-foreground">Controls which portal they use after sign-in.</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Company role (optional)</Label>
                                            <select
                                                value={userForm.companyRoleId}
                                                onChange={(e) => setUserForm({ ...userForm, companyRoleId: e.target.value })}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                            >
                                                <option value="">— None —</option>
                                                {companyRoles
                                                    .filter((r) => r.portalBase === userForm.role)
                                                    .map((r) => (
                                                        <option key={r.id} value={r.id}>{r.name}</option>
                                                    ))}
                                            </select>
                                            <p className="text-[11px] text-muted-foreground">Create custom roles under Admin → Roles.</p>
                                        </div>
                                        <div className="space-y-1.5"><Label>Full Name</Label><Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} /></div>
                                        <div className="space-y-1.5"><Label>Email</Label><Input value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
                                        {modalMode !== "edit" && (
                                            <div className="space-y-3">
                                                <Label>Password</Label><Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                                                <Label>Confirm Password</Label><Input type="password" value={userForm.confirmPassword} onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })} />
                                            </div>
                                        )}
                                         {formError && <p className="text-xs font-medium text-destructive bg-destructive/10 p-2 rounded">{formError}</p>}
                                         <Button type="submit" className="w-full">Submit</Button>
                                    </form>
                                )}
                                {modalMode === "change-password" && (
                                    <form onSubmit={handleChangePw} className="px-6 py-5 space-y-4">
                                        <div className="space-y-1.5"><Label>New Password</Label><Input type="password" value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} /></div>
                                        <div className="space-y-1.5"><Label>Confirm New Password</Label><Input type="password" value={pwForm.confirmPw} onChange={(e) => setPwForm({ ...pwForm, confirmPw: e.target.value })} /></div>
                                         {formError && <p className="text-xs font-medium text-destructive bg-destructive/10 p-2 rounded">{formError}</p>}
                                         <Button type="submit" className="w-full">Reset Password</Button>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
