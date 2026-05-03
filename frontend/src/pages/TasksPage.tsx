import { useState, useRef, useEffect, useMemo, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Clock, CheckCircle2, AlertCircle,
  Trash2, X, ChevronDown, Link as LinkIcon, FileText,
  LayoutGrid, List, CalendarDays, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { stagger, fadeUp } from "@/lib/animations";
import { useTask, AppTask, TaskStatus, TaskKind, TaskPriority } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { getEffectivePermissions } from "@/lib/permissions";
import {
  isTaskOverdue,
  endOfToday,
  isTaskAssignedTo,
  isDailyTaskRow,
  DAILY_TASK_SURFACE_CLASS,
  DAILY_TASK_BADGE_CLASS,
} from "@/lib/taskHelpers";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { AssignmentTimeField, formatTimeForTag } from "@/components/AssignmentTimeField";
import { TaskDiscussionPanel } from "@/components/TaskDiscussionPanel";
import { UserAvatar } from "@/components/UserAvatar";
const FALLBACK_CATEGORIES = [
  "Social Media",
  "Video SEO",
  "Thumbnail Design",
  "Shorts Editing",
  "Admin Support",
  "Marketing",
  "Strategy",
];
const STATUSES: TaskStatus[] = ["Pending", "In Progress", "Completed", "Approved"];
const PRIORITIES: TaskPriority[] = ["Low", "Medium", "High"];

const priorityStyle: Record<TaskPriority, string> = {
  Low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  High: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

const statusConfig = {
  "Pending": { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  "In Progress": { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: AlertCircle },
  "Completed": { color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  "Approved": { color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", icon: CheckCircle2 },
};

type FilterTab = "All" | TaskStatus;

// --- Sub-component: ProofSection (Isolated for performance) ---
const ProofSection = memo(({ task, currentUser }: { task: AppTask, currentUser: any }) => {
    const { submitTaskProof } = useTask();
    const [proofText, setProofText] = useState("");
    const [proofUrl, setProofUrl] = useState("");
    const canSubmitProof =
      !!currentUser?.id &&
      (currentUser?.role === "employee" || currentUser?.role === "controller") &&
      isTaskAssignedTo(task, currentUser.id);

    const handleProofSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await submitTaskProof(task.id, { textExplanation: proofText, urlLink: proofUrl });
        if (res.success) {
            toast.success("Proof submitted!");
            setProofText(""); setProofUrl("");
        } else toast.error(res.error);
    };

    return (
        <div className="mt-8">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-3"><FileText className="h-4 w-4 text-primary"/> Submission Proof</h3>
            {task.submission ? (
                <div className="p-4 bg-muted/30 border rounded-lg space-y-2 text-sm">
                    {task.submission.textExplanation && <p><strong>Note:</strong> {task.submission.textExplanation}</p>}
                    {task.submission.urlLink && <a href={task.submission.urlLink} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1"><LinkIcon className="h-3 w-3"/> Link Attachment</a>}
                    <p className="text-xs text-muted-foreground mt-2">Submitted at {new Date(task.submission.submittedAt).toLocaleString()}</p>
                </div>
            ) : (
                <div className="p-4 bg-muted/30 border border-dashed rounded-lg text-sm text-center text-muted-foreground">
                    {canSubmitProof ? "Submit your proof of work below." : "No proof submitted yet."}
                </div>
            )}

            {canSubmitProof && !task.submission && (
                <form onSubmit={handleProofSubmit} className="mt-4 space-y-3">
                    <textarea value={proofText} onChange={e => setProofText(e.target.value)}
                        className="w-full text-sm p-3 border rounded-lg bg-background" rows={2} placeholder="Explain what you did..."></textarea>
                    <Input value={proofUrl} onChange={e => setProofUrl(e.target.value)} type="url" placeholder="Paste URL link to work" className="h-9 text-sm" />
                    <Button type="submit" className="w-full">Submit Work for Review</Button>
                </form>
            )}
        </div>
    );
});

export default function TasksPage() {
  const { currentUser, users, companyRoles } = useAuth();
  const { tasks, createTask, updateTaskStatus, deleteTask, refreshTasks, patchTask } = useTask();
  const [viewMode, setViewMode] = useState<"table" | "board" | "calendar">("table");
  const perms = getEffectivePermissions(currentUser, companyRoles);
  const assignees = useMemo(() => {
    const pool = users.filter((u) => u.role !== "admin");
    if (
      currentUser &&
      currentUser.role !== "admin" &&
      !pool.some((u) => u.id === currentUser.id)
    ) {
      return [currentUser, ...pool];
    }
    return pool;
  }, [users, currentUser]);

  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const selectedTask = useMemo(() => selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null, [selectedTaskId, tasks]);

  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [selectedCalDay, setSelectedCalDay] = useState<Date | undefined>(() => new Date());

  const [formTimeUse12h, setFormTimeUse12h] = useState(false);
  const [editTimeUse12h, setEditTimeUse12h] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: FALLBACK_CATEGORIES[0],
    assignedToId: "",
    assignmentMode: "individual" as "individual" | "group",
    groupAssigneeIds: [] as string[],
    status: "Pending" as TaskStatus,
    assignedTime24: "",
    notes: "",
    taskKind: "one_time" as TaskKind,
    deadlineLocal: "",
    priority: "Medium" as TaskPriority,
    tagsStr: "",
    dependsOnTaskId: "",
  });

  const [editModalTaskId, setEditModalTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: FALLBACK_CATEGORIES[0],
    assignedToId: "",
    assignmentMode: "individual" as "individual" | "group",
    groupAssigneeIds: [] as string[],
    taskKind: "one_time" as TaskKind,
    deadlineLocal: "",
    assignedTime24: "",
    notes: "",
    priority: "Medium" as TaskPriority,
    tagsStr: "",
    dependsOnTaskId: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentUser?.companyId) return;
    let cancelled = false;
    api.tenantCompany
      .get(currentUser.companyId)
      .then(({ company }) => {
        if (cancelled) return;
        const list = Array.isArray(company?.taskCategories) ? company.taskCategories.filter(Boolean) : [];
        if (list.length) setCategories(list);
        else setCategories([...FALLBACK_CATEGORIES]);
      })
      .catch(() => {
        if (!cancelled) setCategories([...FALLBACK_CATEGORIES]);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.companyId]);

  useOutsideClick(statusMenuRef, () => setOpenStatusMenu(null));

  const filtered = (activeFilter === "All" ? tasks : tasks.filter((t) => t.status === activeFilter)).filter((t) =>
    currentUser?.role === "employee" && currentUser.id ? isTaskAssignedTo(t, currentUser.id) : true
  );

  const cat0 = categories[0] || FALLBACK_CATEGORIES[0];

  const handleOpen = () => {
    const first = assignees[0]?.id || "";
    setForm({
      title: "",
      category: cat0,
      assignedToId: first,
      assignmentMode: "individual",
      groupAssigneeIds: first ? [first] : [],
      status: "Pending",
      assignedTime24: "",
      notes: "",
      taskKind: "one_time",
      deadlineLocal: "",
      priority: "Medium",
      tagsStr: "",
      dependsOnTaskId: "",
    });
    setShowNewCategoryInput(false);
    setNewCategoryName("");
    setShowModal(true);
  };

  const persistNewCategory = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    if (!currentUser?.companyId || !currentUser?.id) return;
    setSavingCategory(true);
    try {
      await api.tenantCompany.patch(currentUser.companyId, {
        taskCategories: [...categories, trimmed],
        actorUserId: currentUser.id,
      });
      setCategories((c) => [...c, trimmed]);
      toast.success("Category added");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not add category (admin or controller only).");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Task title is required.");
    if (form.assignmentMode === "group" && form.groupAssigneeIds.filter(Boolean).length === 0) {
      return toast.error("Select at least one person for a group task.");
    }
    let deadlineAt: string | null = null;
    let deadline = "Flexible";
    const kind = form.taskKind;

    if (kind === "daily") {
      const d = endOfToday();
      deadlineAt = d.toISOString();
      deadline = "Daily";
    } else if (kind === "deadline_based") {
      if (!form.deadlineLocal) return toast.error("Pick a deadline date and time.");
      const d = new Date(form.deadlineLocal);
      deadlineAt = d.toISOString();
      deadline = d.toLocaleString();
    } else {
      if (form.deadlineLocal) {
        const d = new Date(form.deadlineLocal);
        deadlineAt = d.toISOString();
        deadline = d.toLocaleString();
      }
    }

    const isGroup = form.assignmentMode === "group";
    const groupIds = isGroup ? form.groupAssigneeIds.filter(Boolean) : [];
    const aid =
      isGroup
        ? groupIds[0] || (currentUser?.role === "employee" ? currentUser.id : "")
        : form.assignedToId || (currentUser?.role === "employee" ? currentUser.id : "");
    const assigneeIds = isGroup && groupIds.length ? groupIds : aid ? [aid] : [];
    const namesForGroup = assigneeIds
      .map((id) => users.find((u) => u.id === id)?.name)
      .filter(Boolean) as string[];
    const assigneeName =
      isGroup && namesForGroup.length
        ? namesForGroup.join(", ")
        : users.find((u) => u.id === aid)?.name || (currentUser?.role === "employee" ? currentUser!.name : "Unassigned");
    const tags = form.tagsStr.split(",").map((s) => s.trim()).filter(Boolean);
    const assignedTime = form.assignedTime24.trim() || null;
    const res = await createTask({
      title: form.title.trim(),
      category: form.category,
      assigneeId: aid,
      assigneeName,
      assigneeIds,
      assignedById: currentUser!.id,
      assignedByName: currentUser!.name,
      type: isGroup ? "Group" : "Individual",
      taskKind: kind,
      deadlineAt,
      status: form.status,
      deadline,
      timeSpent: "0m",
      notes: form.notes,
      assignedTime,
      priority: form.priority,
      tags,
      dependsOnTaskId: form.dependsOnTaskId || null,
      recurring: { enabled: false, rule: "" },
    });
    if (res.success) {
      setShowModal(false);
      toast.success("Task created!");
      await refreshTasks();
    } else toast.error(res.error);
  };

  const canEditTaskRow = (t: AppTask) =>
    !!(perms.tasks_create || (currentUser?.id && isTaskAssignedTo(t, currentUser.id)));

  const openEditModal = (task: AppTask, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!canEditTaskRow(task)) return;
    const primary = task.assigneeId;
    const mode: "individual" | "group" =
      task.type === "Group" && (task.assigneeIds?.length || 0) > 1 ? "group" : "individual";
    let deadlineLocal = "";
    if (task.deadlineAt && task.taskKind !== "daily") {
      const d = new Date(task.deadlineAt);
      const pad = (n: number) => String(n).padStart(2, "0");
      deadlineLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    setEditForm({
      title: task.title,
      category: task.category || cat0,
      assignedToId: primary,
      assignmentMode: mode,
      groupAssigneeIds: mode === "group" && task.assigneeIds?.length ? [...task.assigneeIds] : primary ? [primary] : [],
      taskKind: task.taskKind,
      deadlineLocal,
      assignedTime24: task.assignedTime?.trim() || "",
      notes: task.notes || "",
      priority: task.priority,
      tagsStr: (task.tags || []).join(", "),
      dependsOnTaskId: task.dependsOnTaskId || "",
    });
    setEditErrors({});
    setEditModalTaskId(task.id);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalTaskId || !currentUser) return;
    const errs: Record<string, string> = {};
    if (!editForm.title.trim()) errs.title = "Title is required.";
    if (editForm.taskKind === "deadline_based" && !editForm.deadlineLocal) errs.deadline = "Deadline is required.";
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      return;
    }
    setEditSubmitting(true);
    try {
      let deadlineAt: string | null = null;
      let deadline = "Flexible";
      const kind = editForm.taskKind;
      if (kind === "daily") {
        const d = endOfToday();
        deadlineAt = d.toISOString();
        deadline = "Daily";
      } else if (kind === "deadline_based") {
        const d = new Date(editForm.deadlineLocal);
        deadlineAt = d.toISOString();
        deadline = d.toLocaleString();
      } else if (editForm.deadlineLocal) {
        const d = new Date(editForm.deadlineLocal);
        deadlineAt = d.toISOString();
        deadline = d.toLocaleString();
      }

      const isGroup = editForm.assignmentMode === "group";
      const groupIds = isGroup ? editForm.groupAssigneeIds.filter(Boolean) : [];
      const aid =
        isGroup
          ? groupIds[0] || currentUser.id
          : editForm.assignedToId || currentUser.id;
      const assigneeIds = isGroup && groupIds.length ? groupIds : aid ? [aid] : [];
      const namesForGroup = assigneeIds
        .map((id) => users.find((u) => u.id === id)?.name)
        .filter(Boolean) as string[];
      const assigneeName =
        isGroup && namesForGroup.length
          ? namesForGroup.join(", ")
          : users.find((u) => u.id === aid)?.name || "Unassigned";

      const tags = editForm.tagsStr.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await patchTask(editModalTaskId, {
        title: editForm.title.trim(),
        category: editForm.category,
        assigneeId: aid,
        assigneeName,
        assigneeIds,
        type: isGroup ? "Group" : "Individual",
        taskKind: editForm.taskKind,
        deadlineAt,
        deadline,
        assignedTime: editForm.assignedTime24.trim() || null,
        notes: editForm.notes,
        priority: editForm.priority,
        tags,
        dependsOnTaskId: editForm.dependsOnTaskId || null,
      });
      if (res.success) {
        toast.success("Task updated");
        setEditModalTaskId(null);
        await refreshTasks();
      } else toast.error(res.error || "Update failed");
    } finally {
      setEditSubmitting(false);
    }
  };

  const tasksForCalendarDay = useMemo(() => {
    const map = new Map<string, AppTask[]>();
    for (const t of filtered) {
      const ms = t.deadlineAt ? new Date(t.deadlineAt).getTime() : NaN;
      if (Number.isNaN(ms)) continue;
      const d = new Date(ms);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [filtered]);

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (!perms.tasks_delete) return;
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    const r = await deleteTask(taskId);
    if (r.success) {
      toast.success("Task deleted");
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      await refreshTasks();
    } else toast.error(r.error || "Could not delete task");
  };

  const handleStatusChange = async (taskId: string, s: TaskStatus) => {
    await updateTaskStatus(taskId, s);
    setOpenStatusMenu(null);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/task-id", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnColumn = async (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/task-id");
    if (!taskId) return;
    if (currentUser?.role === "employee" && status === "Approved") return;
    const res = await updateTaskStatus(taskId, status);
    if (!res.success) toast.error(res.error || "Could not update status");
  };

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Task Management</h1>
            <p className="mt-1 text-sm text-muted-foreground">Coordinate, track and discuss production tasks</p>
          </div>
          {perms.tasks_create && (
            <Button className="h-10 gap-2 rounded-lg" onClick={handleOpen}><Plus className="h-4 w-4" /> Create Task</Button>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-2">
          <div className="flex gap-2 overflow-x-auto">
          {(["All", ...STATUSES] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveFilter(tab)}
              className={`pb-2.5 px-4 text-sm font-medium transition-all relative whitespace-nowrap ${activeFilter === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              {tab} {activeFilter === tab && <motion.div layoutId="filter-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
          </div>
          <div className="flex rounded-lg border bg-muted/40 p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${viewMode === "table" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${viewMode === "board" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${viewMode === "calendar" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
        </motion.div>

        {viewMode === "calendar" && (
          <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4 shadow-card">
              <Calendar
                mode="single"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={selectedCalDay}
                onSelect={setSelectedCalDay}
                className="mx-auto"
              />
            </div>
            <div className="space-y-4 rounded-2xl border bg-card p-4 shadow-card">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedCalDay ? selectedCalDay.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) : "Pick a day"}
                </h3>
                <div className="mt-3 space-y-2">
                  {(() => {
                    if (!selectedCalDay) return <p className="text-sm text-muted-foreground">Select a date.</p>;
                    const key = `${selectedCalDay.getFullYear()}-${String(selectedCalDay.getMonth() + 1).padStart(2, "0")}-${String(selectedCalDay.getDate()).padStart(2, "0")}`;
                    const dayTasks = tasksForCalendarDay.get(key) || [];
                    if (!dayTasks.length) {
                      return <p className="text-sm text-muted-foreground">No scheduled deadline tasks on this day.</p>;
                    }
                    return dayTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition hover:bg-muted/60 ${isDailyTaskRow(task) ? DAILY_TASK_SURFACE_CLASS : ""}`}
                      >
                        <span className="font-medium">{task.title}</span>
                        {isDailyTaskRow(task) ? <span className={DAILY_TASK_BADGE_CLASS}>Daily</span> : null}
                      </button>
                    ));
                  })()}
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-foreground">Daily tasks</h3>
                <div className="mt-2 space-y-2">
                  {filtered.filter(isDailyTaskRow).length === 0 ? (
                    <p className="text-sm text-muted-foreground">None</p>
                  ) : (
                    filtered.filter(isDailyTaskRow).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm ${DAILY_TASK_SURFACE_CLASS}`}
                      >
                        <span className="font-medium text-foreground">{task.title}</span>
                        <span className={DAILY_TASK_BADGE_CLASS}>Daily</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {viewMode === "board" && (
          <motion.div variants={fadeUp} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {STATUSES.map((status) => (
              <div
                key={status}
                className="min-h-[280px] rounded-2xl border bg-muted/20 p-3"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnColumn(e, status)}
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{status}</p>
                <div className="space-y-2">
                  {filtered
                    .filter((t) => t.status === status)
                    .map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`cursor-grab active:cursor-grabbing rounded-xl border p-3 shadow-sm transition hover:shadow-md ${
                          isDailyTaskRow(task) ? DAILY_TASK_SURFACE_CLASS + " border-teal-600/30" : "border bg-card"
                        } ${isTaskOverdue(task) ? "border-rose-300 dark:border-rose-800" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          {isDailyTaskRow(task) ? <span className={DAILY_TASK_BADGE_CLASS}>Daily</span> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityStyle[task.priority]}`}>{task.priority}</span>
                          <span className="text-[10px] text-muted-foreground">{task.assigneeName}</span>
                          {task.assignedTime ? (
                            <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                              {formatTimeForTag(task.assignedTime, false)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        <motion.div variants={fadeUp} className={`rounded-2xl bg-card shadow-card overflow-visible ${viewMode !== "table" ? "hidden" : ""}`}>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground rounded-tl-2xl w-10" />
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Task Details</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground hidden md:table-cell">Priority</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Assignee</th>
                <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deadline</th>
                <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-3 py-3 w-12 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Edit</th>
                {perms.tasks_delete ? (
                  <th className="px-5 py-3 w-12 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground rounded-tr-2xl" />
                ) : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const primaryAssignee = users.find((u) => u.id === task.assigneeId);
                const dailyRow = isDailyTaskRow(task);
                return (
                <motion.tr key={task.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className={`border-b last:border-0 transition-colors hover:bg-muted/50 group cursor-pointer ${dailyRow ? DAILY_TASK_SURFACE_CLASS : ""} ${isTaskOverdue(task) ? "bg-rose-50/80 dark:bg-rose-950/20" : ""}`}
                    onClick={() => setSelectedTaskId(task.id)}>
                    <td className="px-4 py-3 align-middle w-10">
                      {isDailyTaskRow(task) ? <span className={DAILY_TASK_BADGE_CLASS}>Daily</span> : <span className="inline-block w-2 shrink-0" />}
                    </td>
                    <td className="px-5 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{task.title}</p>
                          {task.assignedTime ? (
                            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                              {formatTimeForTag(task.assignedTime, false)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-xs">{task.category}</p>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${priorityStyle[task.priority]}`}>{task.priority}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 capitalize text-sm font-medium text-foreground">
                        <UserAvatar name={primaryAssignee?.name || task.assigneeName} photoUrl={primaryAssignee?.profilePhotoUrl} />
                        <span className="truncate">{task.assigneeName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-muted-foreground">{task.deadline}</td>
                    <td className="px-5 py-3 text-right">
                        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setOpenStatusMenu(openStatusMenu === task.id ? null : task.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${statusConfig[task.status].color} border-transparent hover:border-current/20`}>
                            {task.status} <ChevronDown className="h-3 w-3" />
                            </button>
                            {openStatusMenu === task.id && (
                                <div ref={statusMenuRef} className="absolute right-0 top-7 z-[200] w-36 rounded-xl border bg-card shadow-2xl overflow-hidden py-1">
                                {STATUSES.filter(s => currentUser?.role !== "employee" || s !== "Approved").map((s) => (
                                    <button key={s} onClick={() => handleStatusChange(task.id, s)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted text-foreground">
                                    <span className={`h-2 w-2 rounded-full ${statusConfig[s].color.split(" ")[0]}`} /> {s}
                                    </button>
                                ))}
                                </div>
                            )}
                        </div>
                    </td>
                    <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {canEditTaskRow(task) ? (
                        <button
                          type="button"
                          title="Edit task"
                          className="inline-flex rounded-lg p-2 text-muted-foreground opacity-70 transition hover:bg-muted hover:text-foreground"
                          onClick={(e) => openEditModal(task, e)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="inline-block w-8" />
                      )}
                    </td>
                    {perms.tasks_delete ? (
                      <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="Delete task"
                          className="inline-flex rounded-lg p-2 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          onClick={(e) => handleDeleteTask(e, task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    ) : null}
                </motion.tr>
              );
              })}
              {filtered.length === 0 && (
                <tr className="border-none">
                    <td colSpan={perms.tasks_delete ? 8 : 7} className="px-6 py-20 text-center text-muted-foreground italic text-sm">No tasks found in this category.</td>
                </tr>
              )}
            </tbody>
          </table>
        </motion.div>
      </motion.div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border">
                <div className="px-6 py-4 border-b flex justify-between items-center"><h2 className="font-bold">Create New Task</h2><button onClick={() => setShowModal(false)}><X className="h-5 w-5"/></button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5 font-medium"><Label>Task Title</Label><Input value={form.title} onChange={e=>setForm({...form, title: e.target.value})} placeholder="e.g. Design YouTube Thumbnail" /></div>
                    <div className="space-y-1.5"><Label>Task type</Label>
                      <select value={form.taskKind} onChange={e=>setForm({...form, taskKind: e.target.value as TaskKind, deadlineLocal: e.target.value === "daily" ? "" : form.deadlineLocal})} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="daily">Daily task</option>
                        <option value="one_time">One-time task</option>
                        <option value="deadline_based">Deadline-based task</option>
                      </select>
                    </div>
                    {form.taskKind === "daily" ? (
                      <div className="rounded-lg border border-teal-600/40 bg-teal-50/80 px-3 py-2 text-sm text-teal-950 dark:bg-teal-950/40 dark:text-teal-50">
                        Daily task — no specific date
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Label>{form.taskKind === "deadline_based" ? "Deadline (date & time)" : "Deadline (optional)"}</Label>
                        <Input type="datetime-local" value={form.deadlineLocal} onChange={e=>setForm({...form, deadlineLocal: e.target.value})} />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label>Description / notes (optional)</Label>
                      <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Context, links, acceptance criteria…" className="resize-y text-sm" />
                    </div>
                    <AssignmentTimeField
                      value24={form.assignedTime24}
                      onChange24={(v) => setForm({ ...form, assignedTime24: v })}
                      use12h={formTimeUse12h}
                      onToggle12h={setFormTimeUse12h}
                      idPrefix="create-task"
                    />
                    <div className="space-y-1.5">
                      <Label>Assignment</Label>
                      <select
                        value={form.assignmentMode}
                        onChange={(e) => {
                          const mode = e.target.value as "individual" | "group";
                          const first = form.assignedToId || assignees[0]?.id || "";
                          setForm({
                            ...form,
                            assignmentMode: mode,
                            groupAssigneeIds: mode === "group" ? (form.groupAssigneeIds.length ? form.groupAssigneeIds : first ? [first] : []) : form.groupAssigneeIds,
                          });
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="individual">Individual (one owner)</option>
                        <option value="group">Group task (shared)</option>
                      </select>
                    </div>
                    <div className={`grid gap-4 ${form.assignmentMode === "individual" ? "grid-cols-2" : "grid-cols-1"}`}>
                        <div className="space-y-1.5">
                          <Label>Category</Label>
                          <select
                            value={form.category}
                            onChange={async (e) => {
                              const v = e.target.value;
                              if (v === "__add__") {
                                setShowNewCategoryInput(true);
                                return;
                              }
                              setForm({ ...form, category: v });
                            }}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="__add__">+ Add new category</option>
                          </select>
                          {showNewCategoryInput ? (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <Input
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="New category name"
                                className="h-9 flex-1"
                              />
                              <Button
                                type="button"
                                size="sm"
                                disabled={savingCategory || !newCategoryName.trim()}
                                onClick={async () => {
                                  await persistNewCategory(newCategoryName);
                                  setForm((f) => ({ ...f, category: newCategoryName.trim() || f.category }));
                                  setNewCategoryName("");
                                  setShowNewCategoryInput(false);
                                }}
                              >
                                Save
                              </Button>
                            </div>
                          ) : null}
                        </div>
                        {form.assignmentMode === "individual" ? (
                          <div className="space-y-1.5">
                            <Label>Assign to</Label>
                            <select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                              <option value="">Select…</option>
                              {assignees.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name} ({a.role})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                    </div>
                    {form.assignmentMode === "group" ? (
                      <div className="space-y-1.5">
                        <Label>Team members</Label>
                        <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-input bg-background p-2 text-sm">
                          {assignees.length === 0 ? (
                            <p className="text-muted-foreground">No assignees available.</p>
                          ) : (
                            assignees.map((a) => {
                              const checked = form.groupAssigneeIds.includes(a.id);
                              return (
                                <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/60">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setForm((prev) => {
                                        const set = new Set(prev.groupAssigneeIds);
                                        if (set.has(a.id)) set.delete(a.id);
                                        else set.add(a.id);
                                        return { ...prev, groupAssigneeIds: Array.from(set) };
                                      });
                                    }}
                                  />
                                  <span>
                                    {a.name} <span className="text-muted-foreground">({a.role})</span>
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Pick everyone who should see this task. The first selected member is the primary assignee for reporting.
                        </p>
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Priority</Label>
                        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Depends on (optional)</Label>
                        <select value={form.dependsOnTaskId} onChange={(e) => setForm({ ...form, dependsOnTaskId: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                          <option value="">None</option>
                          {tasks.filter((t) => t.id).map((t) => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tags (comma-separated)</Label>
                      <Input value={form.tagsStr} onChange={(e) => setForm({ ...form, tagsStr: e.target.value })} placeholder="urgent, client-a" className="h-9" />
                    </div>
                    <Button type="submit" className="w-full h-10">Create Task & Send Notify</Button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Task Modal */}
      <AnimatePresence>
        {editModalTaskId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditModalTaskId(null)} className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed inset-0 z-[101] flex items-center justify-center p-4">
              <div className="max-h-[min(92vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border bg-card shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4">
                  <h2 className="font-bold">Edit task</h2>
                  <button type="button" onClick={() => setEditModalTaskId(null)}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <form onSubmit={handleEditSave} className="space-y-4 p-6">
                  {editErrors.title ? <p className="text-sm text-destructive">{editErrors.title}</p> : null}
                  {editErrors.deadline ? <p className="text-sm text-destructive">{editErrors.deadline}</p> : null}
                  <div className="space-y-1.5 font-medium">
                    <Label>Task Title</Label>
                    <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Task type</Label>
                    <select
                      value={editForm.taskKind}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          taskKind: e.target.value as TaskKind,
                          deadlineLocal: e.target.value === "daily" ? "" : editForm.deadlineLocal,
                        })
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="daily">Daily task</option>
                      <option value="one_time">One-time task</option>
                      <option value="deadline_based">Deadline-based task</option>
                    </select>
                  </div>
                  {editForm.taskKind === "daily" ? (
                    <div className="rounded-lg border border-teal-600/40 bg-teal-50/80 px-3 py-2 text-sm text-teal-950 dark:bg-teal-950/40 dark:text-teal-50">
                      Daily task — no specific date
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>{editForm.taskKind === "deadline_based" ? "Deadline (date & time)" : "Deadline (optional)"}</Label>
                      <Input type="datetime-local" value={editForm.deadlineLocal} onChange={(e) => setEditForm({ ...editForm, deadlineLocal: e.target.value })} />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label>Description / notes</Label>
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className="resize-y text-sm" />
                  </div>
                  <AssignmentTimeField
                    value24={editForm.assignedTime24}
                    onChange24={(v) => setEditForm({ ...editForm, assignedTime24: v })}
                    use12h={editTimeUse12h}
                    onToggle12h={setEditTimeUse12h}
                    idPrefix="edit-task"
                  />
                  <div className="space-y-1.5">
                    <Label>Assignment</Label>
                    <select
                      value={editForm.assignmentMode}
                      onChange={(e) => {
                        const mode = e.target.value as "individual" | "group";
                        const first = editForm.assignedToId || assignees[0]?.id || "";
                        setEditForm({
                          ...editForm,
                          assignmentMode: mode,
                          groupAssigneeIds:
                            mode === "group" ? (editForm.groupAssigneeIds.length ? editForm.groupAssigneeIds : first ? [first] : []) : editForm.groupAssigneeIds,
                        });
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="individual">Individual (one owner)</option>
                      <option value="group">Group task (shared)</option>
                    </select>
                  </div>
                  <div className={`grid gap-4 ${editForm.assignmentMode === "individual" ? "grid-cols-2" : "grid-cols-1"}`}>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <select
                        value={editForm.category}
                        onChange={(e) => {
                          if (e.target.value === "__add__") {
                            setShowNewCategoryInput(true);
                            return;
                          }
                          setEditForm({ ...editForm, category: e.target.value });
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value="__add__">+ Add new category</option>
                      </select>
                    </div>
                    {editForm.assignmentMode === "individual" ? (
                      <div className="space-y-1.5">
                        <Label>Assign to</Label>
                        <select
                          value={editForm.assignedToId}
                          onChange={(e) => setEditForm({ ...editForm, assignedToId: e.target.value })}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">Select…</option>
                          {assignees.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                  {editForm.assignmentMode === "group" ? (
                    <div className="space-y-1.5">
                      <Label>Team members</Label>
                      <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-input bg-background p-2 text-sm">
                        {assignees.map((a) => {
                          const checked = editForm.groupAssigneeIds.includes(a.id);
                          return (
                            <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted/60">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setEditForm((prev) => {
                                    const set = new Set(prev.groupAssigneeIds);
                                    if (set.has(a.id)) set.delete(a.id);
                                    else set.add(a.id);
                                    return { ...prev, groupAssigneeIds: Array.from(set) };
                                  });
                                }}
                              />
                              <span>
                                {a.name} <span className="text-muted-foreground">({a.role})</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Priority</Label>
                      <select
                        value={editForm.priority}
                        onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as TaskPriority })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Depends on (optional)</Label>
                      <select
                        value={editForm.dependsOnTaskId}
                        onChange={(e) => setEditForm({ ...editForm, dependsOnTaskId: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">None</option>
                        {tasks.filter((t) => t.id && t.id !== editModalTaskId).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tags (comma-separated)</Label>
                    <Input value={editForm.tagsStr} onChange={(e) => setEditForm({ ...editForm, tagsStr: e.target.value })} className="h-9" />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setEditModalTaskId(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={editSubmitting}>
                      {editSubmitting ? "Saving…" : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60">
              <div className="relative flex h-[calc(100vh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl sm:h-[min(92vh,760px)] md:flex-row">
                  <div className="w-full md:w-1/2 p-6 bg-muted/10 overflow-y-auto min-h-0">
                      <div className="flex justify-between items-start mb-4">
                          <h2 className="text-xl font-bold pr-4">{selectedTask.title}</h2>
                          <button onClick={() => setSelectedTaskId(null)} className="inline-flex md:hidden"><X className="h-5 w-5" /></button>
                      </div>
                      <div className="space-y-4 text-sm font-medium">
                          <div><span className="text-muted-foreground mr-2">Status:</span> <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusConfig[selectedTask.status].color}`}>{selectedTask.status}</span></div>
                          <div><span className="text-muted-foreground mr-2">Type:</span> {selectedTask.taskKind === "daily" ? "Daily" : selectedTask.taskKind === "deadline_based" ? "Deadline-based" : "One-time"}</div>
                          <div><span className="text-muted-foreground mr-2">Assignment:</span> {selectedTask.type === "Group" ? "Group (shared status)" : "Individual"}</div>
                          {selectedTask.type === "Group" && (selectedTask.assigneeIds?.length ?? 0) > 0 ? (
                            <div>
                              <span className="text-muted-foreground mr-2 align-top">Team:</span>
                              <ul className="mt-1 inline-block list-inside text-xs font-normal text-muted-foreground">
                                {(selectedTask.assigneeIds || []).map((id) => {
                                  const u = users.find((x) => x.id === id);
                                  return (
                                    <li key={id}>
                                      {u?.name || id}{" "}
                                      <span className="text-muted-foreground/80">({u?.role || "—"})</span>
                                    </li>
                                  );
                                })}
                              </ul>
                              <p className="mt-2 text-[11px] font-normal text-muted-foreground">Progress is tracked together on this single task.</p>
                            </div>
                          ) : (
                            <div><span className="text-muted-foreground mr-2">Assignee:</span> {selectedTask.assigneeName}</div>
                          )}
                          <div><span className="text-muted-foreground mr-2">Category:</span> {selectedTask.category}</div>
                          <div><span className="text-muted-foreground mr-2">Priority:</span> <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${priorityStyle[selectedTask.priority]}`}>{selectedTask.priority}</span></div>
                          {selectedTask.tags?.length ? (
                            <div><span className="text-muted-foreground mr-2">Tags:</span> {selectedTask.tags.join(", ")}</div>
                          ) : null}
                          {selectedTask.dependsOnTaskId ? (
                            <div><span className="text-muted-foreground mr-2">Depends on:</span> {tasks.find((x) => x.id === selectedTask.dependsOnTaskId)?.title || selectedTask.dependsOnTaskId}</div>
                          ) : null}
                          <div><span className="text-muted-foreground mr-2">Deadline:</span> {selectedTask.deadline}</div>
                          {selectedTask.assignedTime ? (
                            <div>
                              <span className="text-muted-foreground mr-2">Scheduled time:</span>
                              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">{formatTimeForTag(selectedTask.assignedTime, false)}</span>
                            </div>
                          ) : null}
                          <div className="pt-4 border-t"><span className="block text-muted-foreground mb-1">Description / notes:</span> <p className="whitespace-pre-wrap text-xs text-muted-foreground">{selectedTask.notes || "None."}</p></div>
                      </div>
                      <ProofSection task={selectedTask} currentUser={currentUser} />
                  </div>
                  <TaskDiscussionPanel
                    taskId={selectedTask.id}
                    messages={selectedTask.messages}
                    users={users}
                    currentUser={currentUser}
                    typing={selectedTask.chatTyping}
                    onClose={() => setSelectedTaskId(null)}
                  />
                  <button onClick={() => setSelectedTaskId(null)} className="absolute top-4 right-4 hidden md:inline-flex h-8 w-8 items-center justify-center rounded-md bg-card/90 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-5 w-5"/></button>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
