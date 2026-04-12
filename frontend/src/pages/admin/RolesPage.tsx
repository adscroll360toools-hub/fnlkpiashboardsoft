import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Plus, Trash2, Pencil, X } from "lucide-react";
import { stagger, fadeUp } from "@/lib/animations";
import { useAuth, type CompanyRole } from "@/context/AuthContext";
import { getEffectivePermissions, canAccessRoleManagement } from "@/lib/permissions";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const PERM_KEYS = [
  { key: "tasks_create", label: "Create tasks" },
  { key: "tasks_assign", label: "Assign tasks" },
  { key: "tasks_delete", label: "Delete tasks" },
  { key: "users_manage", label: "Manage users" },
  { key: "roles_manage", label: "Manage roles" },
  { key: "reports_view", label: "View reports" },
  { key: "kpi_manage", label: "Manage KPIs" },
  { key: "attendance_view", label: "View attendance" },
] as const;

export default function RolesPage() {
  const { currentUser, companyRoles, refreshCompanyRoles } = useAuth();
  const perms = getEffectivePermissions(currentUser, companyRoles);
  const allowed = canAccessRoleManagement(currentUser, perms);

  const [name, setName] = useState("");
  const [portalBase, setPortalBase] = useState<"controller" | "employee">("employee");
  const [permState, setPermState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PERM_KEYS.map((p) => [p.key, false]))
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const togglePerm = (k: string, v: boolean) => setPermState((s) => ({ ...s, [k]: v }));

  const resetForm = () => {
    setName("");
    setPortalBase("employee");
    setPermState(Object.fromEntries(PERM_KEYS.map((p) => [p.key, false])));
    setEditingId(null);
  };

  const startEdit = (r: CompanyRole) => {
    setEditingId(r.id);
    setName(r.name);
    setPortalBase(r.portalBase);
    const next: Record<string, boolean> = Object.fromEntries(PERM_KEYS.map((p) => [p.key, false]));
    for (const p of PERM_KEYS) {
      if (r.permissions && typeof r.permissions[p.key] === "boolean") {
        next[p.key] = r.permissions[p.key] as boolean;
      }
    }
    setPermState(next);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.companyId || !name.trim()) return;
    try {
      if (editingId) {
        await api.roles.update(editingId, {
          companyId: currentUser.companyId,
          name: name.trim(),
          permissions: permState,
        });
        toast.success("Role updated");
      } else {
        await api.roles.create({
          companyId: currentUser.companyId,
          name: name.trim(),
          portalBase,
          permissions: permState,
        });
        toast.success("Role created");
      }
      resetForm();
      await refreshCompanyRoles();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save role");
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser?.companyId) return;
    try {
      await api.roles.remove(id);
      toast.success("Role removed");
      await refreshCompanyRoles();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  if (!allowed) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
        You do not have access to role management.
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Roles & permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create roles for Controllers and Employees and define what they can access in Zaptiz.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">{editingId ? "Edit role" : "Create role"}</h2>
            </div>
            {editingId ? (
              <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={resetForm}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            ) : null}
          </div>
          <form onSubmit={handleSaveRole} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Role name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Senior Controller" required />
            </div>
            <div className="space-y-1.5">
              <Label>Portal base</Label>
              <select
                value={portalBase}
                disabled={!!editingId}
                onChange={(e) => setPortalBase(e.target.value as "controller" | "employee")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
              >
                <option value="employee">Employee</option>
                <option value="controller">Controller</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                {editingId ? "Portal base cannot be changed after the role is created." : "Must match the user type when assigning this role."}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid gap-2 rounded-lg border p-3">
                {PERM_KEYS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!!permState[p.key]}
                      onCheckedChange={(c) => togglePerm(p.key, c === true)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full gap-2">
              {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Update role" : "Save role"}
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h2 className="mb-4 text-base font-semibold">Existing roles</h2>
          <div className="space-y-2">
            {companyRoles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom roles yet.</p>
            ) : (
              companyRoles.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{r.portalBase}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(r)} title="Edit role">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)} title="Delete role">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
