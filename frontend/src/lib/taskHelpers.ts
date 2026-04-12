import type { AppTask } from "@/context/TaskContext";

export function isTaskCompleted(t: AppTask): boolean {
  return t.status === "Completed" || t.status === "Approved";
}

export function getDeadlineMs(t: AppTask): number | null {
  if (t.deadlineAt) {
    const ms = new Date(t.deadlineAt).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (t.deadline) {
    const parsed = Date.parse(t.deadline);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

/** Overdue: past deadline and not finished */
export function isTaskOverdue(t: AppTask): boolean {
  if (isTaskCompleted(t)) return false;
  const ms = getDeadlineMs(t);
  if (ms == null) return false;
  return ms < Date.now();
}

export function formatDelayLabel(t: AppTask): string {
  const ms = getDeadlineMs(t);
  if (ms == null) return "Past due";
  const diff = Date.now() - ms;
  if (diff <= 0) return "";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  if (days > 0) return `${days}d ${h}h overdue`;
  if (hours > 0) return `${hours}h ${mins}m overdue`;
  return `${mins}m overdue`;
}

export type TaskBucket = "pending" | "daily" | "expired";

export function bucketForTask(t: AppTask): TaskBucket {
  if (isTaskCompleted(t)) return "pending"; // completed tasks not shown in buckets (filtered out by UI)
  if (isTaskOverdue(t)) return "expired";
  if (t.taskKind === "daily") return "daily";
  return "pending";
}

export function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d;
}

export function isTaskAssignedTo(t: AppTask, userId: string): boolean {
  if (t.assigneeId === userId) return true;
  return Array.isArray(t.assigneeIds) && t.assigneeIds.includes(userId);
}

export function visibleTasksForUser(tasks: AppTask[], userId: string | undefined, scope: "self" | "company"): AppTask[] {
  if (!userId) return [];
  if (scope === "company") return tasks;
  return tasks.filter((t) => isTaskAssignedTo(t, userId));
}
