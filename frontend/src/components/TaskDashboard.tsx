import { useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, AlertTriangle, ListTodo } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTask, AppTask } from "@/context/TaskContext";
import { fadeUp } from "@/lib/animations";
import { bucketForTask, isTaskCompleted, formatDelayLabel } from "@/lib/taskHelpers";

type Scope = "self" | "company";

const sectionStyles = {
  pending: {
    border: "border-l-4 border-l-sky-500",
    header: "bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    icon: ListTodo,
  },
  daily: {
    border: "border-l-4 border-l-violet-500",
    header: "bg-violet-50 dark:bg-violet-950/40 text-violet-900 dark:text-violet-100",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
    icon: Calendar,
  },
  expired: {
    border: "border-l-4 border-l-rose-500",
    header: "bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-100",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    icon: AlertTriangle,
  },
};

function TaskRow({ task, showAssignee }: { task: AppTask; showAssignee: boolean }) {
  const overdue = bucketForTask(task) === "expired";
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm transition-colors ${
        overdue ? "ring-1 ring-rose-300/80 dark:ring-rose-800" : "hover:bg-muted/50"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{task.title}</p>
        <p className="text-xs text-muted-foreground">
          {showAssignee && <span className="font-medium text-foreground/80">{task.assigneeName} · </span>}
          {task.category}
          {task.deadline && <span className="ml-1">· Due {task.deadline}</span>}
        </p>
      </div>
      {overdue && (
        <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
          {formatDelayLabel(task)}
        </span>
      )}
    </div>
  );
}

export function TaskDashboard({ scope, title = "Task dashboard" }: { scope: Scope; title?: string }) {
  const { currentUser } = useAuth();
  const { tasks } = useTask();

  const { pending, daily, expired } = useMemo(() => {
    const subset =
      scope === "self"
        ? tasks.filter((t) => t.assigneeId === currentUser?.id)
        : tasks;
    const active = subset.filter((t) => !isTaskCompleted(t));

    const expiredList: AppTask[] = [];
    const dailyList: AppTask[] = [];
    const pendingList: AppTask[] = [];

    for (const t of active) {
      const b = bucketForTask(t);
      if (b === "expired") expiredList.push(t);
      else if (b === "daily") dailyList.push(t);
      else pendingList.push(t);
    }

    return { pending: pendingList, daily: dailyList, expired: expiredList };
  }, [tasks, scope, currentUser?.id]);

  const showAssignee = scope === "company";

  const sections: { key: keyof typeof sectionStyles; label: string; items: AppTask[]; hint: string }[] = [
    { key: "pending", label: "Pending tasks", items: pending, hint: "One-time & deadline work not yet overdue" },
    { key: "daily", label: "Daily tasks", items: daily, hint: "Recurring daily assignments" },
    { key: "expired", label: "Expired / overdue", items: expired, hint: "Past deadline — needs attention" },
  ];

  return (
    <motion.div variants={fadeUp} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">Color-coded: sky = pending, violet = daily, rose = overdue</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map(({ key, label, items, hint }) => {
          const meta = sectionStyles[key];
          const Icon = meta.icon;
          return (
            <div
              key={key}
              className={`overflow-hidden rounded-2xl border bg-card shadow-card ${meta.border}`}
            >
              <div className={`flex items-center justify-between gap-2 px-4 py-3 ${meta.header}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 shrink-0 opacity-80" />
                  <span className="text-sm font-semibold truncate">{label}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.badge}`}>{items.length}</span>
              </div>
              <p className="px-4 pb-2 text-[11px] text-muted-foreground">{hint}</p>
              <div className="max-h-64 space-y-1.5 overflow-y-auto px-3 pb-3">
                {items.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted-foreground">None in this category</p>
                ) : (
                  items.map((task) => (
                    <TaskRow key={task.id} task={task} showAssignee={showAssignee} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
