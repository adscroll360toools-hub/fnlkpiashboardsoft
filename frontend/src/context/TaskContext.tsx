import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { getEffectivePermissions } from "@/lib/permissions";
import { normalizeAccessControl, type TaskAccessControl } from "@/lib/taskAccess";

export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Approved";
export type TaskKind = "daily" | "one_time" | "deadline_based";
export type TaskPriority = "Low" | "Medium" | "High";

export interface TaskMessageReaction {
    emoji: string;
    userIds: string[];
}

export interface TaskMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    fileUrl?: string;
    timestamp: string;
    reactions?: TaskMessageReaction[];
    readBy?: string[];
}

export interface TaskSubmission {
    textExplanation?: string;
    proofImageUrl?: string;
    urlLink?: string;
    documentUrl?: string;
    submittedAt: string;
}

export interface AppTask {
    id: string;
    title: string;
    category: string;
    assigneeId: string;
    assigneeName: string;
    assigneeIds: string[];
    assignedById: string;
    assignedByName: string;
    kpiRelationId?: string;
    kpiRelationName?: string;
    type: "Individual" | "Group";
    taskKind: TaskKind;
    deadlineAt?: string | null;
    status: TaskStatus;
    deadline: string;
    timeSpent: string;
    priority: TaskPriority;
    tags: string[];
    dependsOnTaskId?: string | null;
    recurring?: { enabled: boolean; rule: string };
    notes?: string;
    /** Optional "HH:MM" (24h) scheduled time for the assignment */
    assignedTime?: string | null;
    createdAt: string;
    /** Last update from server (e.g. status → Approved) when submission.submittedAt is missing */
    updatedAt?: string;
    messages: TaskMessage[];
    submission?: TaskSubmission;
    chatTyping?: { userId: string | null; userName: string; updatedAt?: string | null };
    accessControl?: TaskAccessControl;
}

interface TaskContextType {
    tasks: AppTask[];
    refreshTasks: () => Promise<void>;
    createTask: (task: Omit<AppTask, "id" | "createdAt" | "messages" | "submission">) => Promise<{ success: boolean; error?: string }>;
    updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<{ success: boolean; error?: string }>;
    patchTask: (taskId: string, partial: Partial<AppTask> & Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
    submitTaskProof: (taskId: string, submission: Omit<TaskSubmission, "submittedAt">) => Promise<{ success: boolean; error?: string }>;
    addMessage: (taskId: string, text: string, fileUrl?: string) => Promise<{ success: boolean; error?: string }>;
    markTaskMessagesRead: (taskId: string) => Promise<{ success: boolean; error?: string }>;
    setTaskChatTyping: (taskId: string, active: boolean) => Promise<void>;
    toggleTaskMessageReaction: (taskId: string, messageId: string, emoji: string) => Promise<{ success: boolean; error?: string }>;
    deleteTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
}

const TaskContext = createContext<TaskContextType | null>(null);

function mapTask(t: any): AppTask {
    const assigneeIds =
        Array.isArray(t.assigneeIds) && t.assigneeIds.length > 0
            ? t.assigneeIds
            : t.assigneeId
              ? [t.assigneeId]
              : [];
    return {
        id: t.id || t._id,
        title: t.title,
        category: t.category,
        assigneeId: t.assigneeId,
        assigneeName: t.assigneeName || t.assigneeId,
        assigneeIds,
        assignedById: t.assignedById,
        assignedByName: t.assignedByName || t.assignedById,
        kpiRelationId: t.kpiRelationId,
        kpiRelationName: t.kpiRelationName,
        type: t.type,
        taskKind: t.taskKind || "one_time",
        deadlineAt: t.deadlineAt ? (typeof t.deadlineAt === "string" ? t.deadlineAt : new Date(t.deadlineAt).toISOString()) : null,
        status: t.status,
        deadline: t.deadline,
        timeSpent: t.timeSpent,
        priority: (t.priority as TaskPriority) || "Medium",
        tags: Array.isArray(t.tags) ? t.tags : [],
        dependsOnTaskId: t.dependsOnTaskId ?? null,
        recurring: t.recurring || { enabled: false, rule: "" },
        notes: t.notes,
        assignedTime: t.assignedTime ?? null,
        createdAt: t.created_at || t.createdAt,
        updatedAt: t.updated_at || t.updatedAt,
        messages: (t.messages || []).map((m: any) => ({
            ...m,
            reactions: m.reactions || [],
            readBy: m.readBy || [],
        })),
        submission: t.submission,
        chatTyping: t.chatTyping
            ? {
                  userId: t.chatTyping.userId ?? null,
                  userName: t.chatTyping.userName || "",
                  updatedAt: t.chatTyping.updatedAt
                      ? new Date(t.chatTyping.updatedAt).toISOString()
                      : null,
              }
            : undefined,
        accessControl: normalizeAccessControl(t.accessControl),
    };
}

export function TaskProvider({ children }: { children: ReactNode }) {
    const { currentUser, companyRoles } = useAuth();
    const [tasks, setTasks] = useState<AppTask[]>([]);

    const refreshTasks = useCallback(async () => {
        if (!currentUser?.companyId) return;
        try {
            const { tasks: raw } = await api.tasks.list(currentUser.companyId);
            setTasks(raw.map(mapTask));
        } catch (err) {
            console.error("Error fetching tasks:", err);
        }
    }, [currentUser?.companyId]);

    useEffect(() => {
        refreshTasks();
    }, [currentUser?.id, refreshTasks]);

    const createTask = async (t: Omit<AppTask, "id" | "createdAt" | "messages" | "submission">) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        const perms = getEffectivePermissions(currentUser, companyRoles);
        if (!perms.tasks_create) return { success: false, error: "You do not have permission to create tasks" };
        try {
            const assigneeIds = t.assigneeIds?.length ? t.assigneeIds : t.assigneeId ? [t.assigneeId] : [];
            const { task } = await api.tasks.create({
                ...t,
                assigneeIds,
                assignedById: currentUser.id,
                assignedByName: currentUser.name,
                companyId: currentUser.companyId,
            });
            setTasks((prev) => [mapTask(task), ...prev]);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        try {
            await api.tasks.setStatus(taskId, status, currentUser.id, currentUser.name);
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const patchTask = async (taskId: string, partial: Partial<AppTask>) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        try {
            const { task } = await api.tasks.patch(taskId, {
                ...(partial as Record<string, unknown>),
                actorId: currentUser.id,
                actorName: currentUser.name,
            });
            setTasks((prev) => prev.map((t) => (t.id === taskId ? mapTask(task) : t)));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const submitTaskProof = async (taskId: string, sub: Omit<TaskSubmission, "submittedAt">) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        try {
            const { task } = await api.tasks.submit(taskId, {
                ...sub,
                actorId: currentUser.id,
                actorName: currentUser.name,
            });
            setTasks((prev) => prev.map((t) => (t.id === taskId ? mapTask(task) : t)));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const addMessage = async (taskId: string, text: string, fileUrl?: string) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        try {
            const { task } = await api.tasks.addMessage(taskId, {
                senderId: currentUser.id,
                senderName: currentUser.name,
                text,
                fileUrl,
            });
            setTasks((prev) => prev.map((t) => (t.id === taskId ? mapTask(task) : t)));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const markTaskMessagesRead = async (taskId: string) => {
        if (!currentUser?.companyId) return { success: false, error: "Not logged in" };
        try {
            const { task } = await api.tasks.markMessagesRead(taskId, currentUser.id);
            setTasks((prev) => prev.map((t) => (t.id === taskId ? mapTask(task) : t)));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const setTaskChatTyping = async (taskId: string, active: boolean) => {
        if (!currentUser) return;
        try {
            await api.tasks.chatTyping(taskId, {
                userId: currentUser.id,
                userName: currentUser.name,
                active,
            });
        } catch {
            /* ignore */
        }
    };

    const toggleTaskMessageReaction = async (taskId: string, messageId: string, emoji: string) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        try {
            const { task } = await api.tasks.messageReaction(taskId, messageId, {
                userId: currentUser.id,
                emoji,
            });
            setTasks((prev) => prev.map((t) => (t.id === taskId ? mapTask(task) : t)));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const deleteTask = async (taskId: string) => {
        if (!currentUser?.companyId) return { success: false, error: "Not logged in" };
        const perms = getEffectivePermissions(currentUser, companyRoles);
        if (!perms.tasks_delete) return { success: false, error: "No permission to delete tasks" };
        try {
            await api.tasks.remove(taskId, currentUser.companyId);
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    return (
        <TaskContext.Provider
            value={{
                tasks,
                refreshTasks,
                createTask,
                updateTaskStatus,
                patchTask,
                submitTaskProof,
                addMessage,
                markTaskMessagesRead,
                setTaskChatTyping,
                toggleTaskMessageReaction,
                deleteTask,
            }}
        >
            {children}
        </TaskContext.Provider>
    );
}

export function useTask() {
    const ctx = useContext(TaskContext);
    if (!ctx) throw new Error("useTask must be used within TaskProvider");
    return ctx;
}
