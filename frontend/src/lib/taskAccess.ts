export type TaskAccessLevel = "Admin" | "Editor" | "Viewer";

export interface TaskAccessControl {
  roleGrants: TaskAccessLevel[];
  userGrants: { userId: string; access: TaskAccessLevel }[];
}

export const TASK_ACCESS_LEVELS: TaskAccessLevel[] = ["Admin", "Editor", "Viewer"];

export function normalizeAccessControl(raw: unknown): TaskAccessControl {
  if (!raw || typeof raw !== "object") return { roleGrants: [], userGrants: [] };
  const o = raw as Record<string, unknown>;
  const roleGrants = (Array.isArray(o.roleGrants) ? o.roleGrants : [])
    .filter((r): r is TaskAccessLevel => TASK_ACCESS_LEVELS.includes(r as TaskAccessLevel));
  const userGrants = (Array.isArray(o.userGrants) ? o.userGrants : [])
    .map((u: unknown) => {
      if (!u || typeof u !== "object") return null;
      const ug = u as { userId?: string; access?: string };
      const access = TASK_ACCESS_LEVELS.includes(ug.access as TaskAccessLevel) ? (ug.access as TaskAccessLevel) : "Viewer";
      if (!ug.userId) return null;
      return { userId: String(ug.userId), access };
    })
    .filter(Boolean) as TaskAccessControl["userGrants"];
  return { roleGrants, userGrants };
}
