import type { AppUser, CompanyRole } from "@/context/AuthContext";

export interface EffectivePermissions {
  tasks_create: boolean;
  tasks_assign: boolean;
  tasks_delete: boolean;
  users_manage: boolean;
  roles_manage: boolean;
  reports_view: boolean;
  kpi_manage: boolean;
  attendance_view: boolean;
}

const ALL: EffectivePermissions = {
  tasks_create: true,
  tasks_assign: true,
  tasks_delete: true,
  users_manage: true,
  roles_manage: true,
  reports_view: true,
  kpi_manage: true,
  attendance_view: true,
};

const CTRL: EffectivePermissions = {
  tasks_create: true,
  tasks_assign: true,
  tasks_delete: true,
  users_manage: false,
  roles_manage: true,
  reports_view: true,
  kpi_manage: true,
  attendance_view: true,
};

const EMP: EffectivePermissions = {
  tasks_create: false,
  tasks_assign: false,
  tasks_delete: false,
  users_manage: false,
  roles_manage: false,
  reports_view: true,
  kpi_manage: false,
  attendance_view: true,
};

function fromRecord(p: Record<string, boolean> | undefined): Partial<EffectivePermissions> {
  if (!p) return {};
  return {
    tasks_create: p.tasks_create,
    tasks_assign: p.tasks_assign,
    tasks_delete: p.tasks_delete,
    users_manage: p.users_manage,
    roles_manage: p.roles_manage,
    reports_view: p.reports_view,
    kpi_manage: p.kpi_manage,
    attendance_view: p.attendance_view,
  };
}

export function getEffectivePermissions(
  user: AppUser | null,
  companyRoles: CompanyRole[]
): EffectivePermissions {
  if (!user) {
    return { ...EMP, tasks_create: false };
  }
  if (user.role === "super_admin") return ALL;
  if (user.role === "admin") return ALL;

  const custom = companyRoles.find((r) => r.id === user.companyRoleId);
  const merged = fromRecord(custom?.permissions as Record<string, boolean>);

  if (user.role === "controller") {
    return { ...CTRL, ...merged };
  }
  if (user.role === "employee") {
    return { ...EMP, ...merged };
  }
  return EMP;
}

export function canAccessRoleManagement(user: AppUser | null, perms: EffectivePermissions): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "super_admin") return true;
  return user.role === "controller" && perms.roles_manage;
}
