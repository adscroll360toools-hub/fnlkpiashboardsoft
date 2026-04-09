import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth, UserRole } from "./AuthContext";

export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Approved";

export interface TaskMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    fileUrl?: string;
    timestamp: string;
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
    assignedById: string;
    assignedByName: string;
    kpiRelationId?: string;
    kpiRelationName?: string;
    type: "Individual" | "Group";
    status: TaskStatus;
    deadline: string;
    timeSpent: string;
    notes?: string;
    createdAt: string;
    messages: TaskMessage[];
    submission?: TaskSubmission;
}

interface TaskContextType {
    tasks: AppTask[];
    createTask: (task: Omit<AppTask, "id" | "createdAt" | "messages" | "submission">) => Promise<{ success: boolean; error?: string }>;
    updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<{ success: boolean; error?: string }>;
    submitTaskProof: (taskId: string, submission: Omit<TaskSubmission, "submittedAt">) => Promise<{ success: boolean; error?: string }>;
    addMessage: (taskId: string, text: string, fileUrl?: string) => Promise<{ success: boolean; error?: string }>;
    deleteTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
}

const TaskContext = createContext<TaskContextType | null>(null);

function mapTask(t: any): AppTask {
    return {
        id: t.id || t._id,
        title: t.title,
        category: t.category,
        assigneeId: t.assigneeId,
        assigneeName: t.assigneeName || t.assigneeId,
        assignedById: t.assignedById,
        assignedByName: t.assignedByName || t.assignedById,
        kpiRelationId: t.kpiRelationId,
        kpiRelationName: t.kpiRelationName,
        type: t.type,
        status: t.status,
        deadline: t.deadline,
        timeSpent: t.timeSpent,
        notes: t.notes,
        createdAt: t.created_at || t.createdAt,
        messages: t.messages || [],
        submission: t.submission,
    };
}

export function TaskProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();
    const [tasks, setTasks] = useState<AppTask[]>([]);

    useEffect(() => {
        if (!currentUser || !currentUser.companyId) return;
        api.tasks.list(currentUser.companyId)
            .then(({ tasks }) => setTasks(tasks.map(mapTask)))
            .catch(err => console.error("Error fetching tasks:", err));
    }, [currentUser?.id, currentUser?.companyId]);

    const createTask = async (t: Omit<AppTask, "id" | "createdAt" | "messages" | "submission">) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        if (currentUser.role === "employee") return { success: false, error: "Employees cannot create tasks" };
        try {
            const { task } = await api.tasks.create({
                ...t,
                assignedById: currentUser.id,
                assignedByName: currentUser.name,
                companyId: currentUser.companyId,
            });
            setTasks(prev => [mapTask(task), ...prev]);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        try {
            await api.tasks.setStatus(taskId, status);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const submitTaskProof = async (taskId: string, sub: Omit<TaskSubmission, "submittedAt">) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        try {
            const { task } = await api.tasks.submit(taskId, sub);
            setTasks(prev => prev.map(t => t.id === taskId ? mapTask(task) : t));
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
            setTasks(prev => prev.map(t => t.id === taskId ? mapTask(task) : t));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const deleteTask = async (taskId: string) => {
        if (currentUser?.role !== "admin" && currentUser?.role !== "controller") {
            return { success: false, error: "No permission to delete" };
        }
        try {
            await api.tasks.remove(taskId);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    return (
        <TaskContext.Provider value={{ tasks, createTask, updateTaskStatus, submitTaskProof, addMessage, deleteTask }}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTask() {
    const ctx = useContext(TaskContext);
    if (!ctx) throw new Error("useTask must be used within TaskProvider");
    return ctx;
}
