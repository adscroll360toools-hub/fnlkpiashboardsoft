import { useEffect, useMemo, useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useTask } from "@/context/TaskContext";
import { isTaskCompleted, isTaskOverdue, formatDelayLabel } from "@/lib/taskHelpers";

const SESSION_DISMISS_KEY = "zaptiz_overdue_task_banner_dismissed";

type Scope = "self" | "company";

export function DelayedTaskNotificationBar({ scope }: { scope: Scope }) {
  const { currentUser } = useAuth();
  const { tasks } = useTask();
  const [show, setShow] = useState(false);

  const overdueTasks = useMemo(() => {
    let list = tasks.filter((t) => !isTaskCompleted(t) && isTaskOverdue(t));
    if (scope === "self") list = list.filter((t) => t.assigneeId === currentUser?.id);
    return list;
  }, [tasks, scope, currentUser?.id]);

  useEffect(() => {
    if (overdueTasks.length === 0) return;
    if (sessionStorage.getItem(SESSION_DISMISS_KEY)) return;
    setShow(true);
  }, [overdueTasks.length]);

  if (!show || overdueTasks.length === 0) return null;

  const dismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setShow(false);
  };

  const headline =
    scope === "self"
      ? `You have ${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"}`
      : `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"} in your organization`;

  return (
    <div
      role="alert"
      className="flex flex-col gap-2 border-b border-rose-200 bg-gradient-to-r from-rose-50 to-amber-50 px-4 py-3 dark:border-rose-900/50 dark:from-rose-950/50 dark:to-amber-950/30 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-900 dark:text-rose-100">{headline}</p>
          <ul className="mt-1 max-h-20 overflow-y-auto text-xs text-rose-800/90 dark:text-rose-200/90">
            {overdueTasks.slice(0, 5).map((t) => (
              <li key={t.id} className="truncate">
                <span className="font-medium">{t.title}</span>
                {scope === "company" && <span className="text-rose-700/80"> — {t.assigneeName}</span>}
                <span className="text-rose-600 dark:text-rose-300"> · {formatDelayLabel(t)}</span>
              </li>
            ))}
            {overdueTasks.length > 5 && (
              <li className="text-rose-700 dark:text-rose-300">+{overdueTasks.length - 5} more…</li>
            )}
          </ul>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 border-rose-300 bg-white/80 text-rose-900 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
        onClick={dismiss}
      >
        <X className="mr-1 h-4 w-4" />
        Dismiss
      </Button>
    </div>
  );
}
