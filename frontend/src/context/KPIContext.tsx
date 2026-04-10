import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";

export type KPIType = "Company" | "Group" | "Individual";

export interface AppKPI {
    id: string;
    title: string;
    description?: string;
    type: KPIType;
    target: number;
    current: number;
    unit: string;
    dailyMin?: number;
    dailyMax?: number;
    assignedToId?: string;
    assignedToName?: string;
    groupId?: string;
    createdAt: string;
}

export interface QualityMetric {
    id: string;
    metric: string;
    weight: number;
    description: string;
}

export interface AppQualityScore {
    id: string;
    employeeId: string;
    score: number;
    breakdown: Record<string, number>;
    month: string;
    createdAt: string;
}

interface KPIContextType {
    kpis: AppKPI[];
    qualityMetrics: QualityMetric[];
    qualityScores: AppQualityScore[];
    createKPI: (kpi: Omit<AppKPI, "id" | "createdAt" | "current">) => Promise<{ success: boolean; error?: string }>;
    updateKPIProgress: (kpiId: string, progress: number) => Promise<{ success: boolean; error?: string }>;
    deleteKPI: (kpiId: string) => Promise<{ success: boolean; error?: string }>;
    updateQualityMetrics: (metrics: QualityMetric[]) => Promise<{ success: boolean; error?: string }>;
    addQualityScore: (score: Omit<AppQualityScore, "id" | "createdAt">) => Promise<{ success: boolean; error?: string }>;
}

const KPIContext = createContext<KPIContextType | null>(null);

const METRICS_KEY = "zaptiz_metrics_v1";
const SCORES_KEY  = "zaptiz_scores_v1";
const METRICS_LEGACY = "adscroll360_metrics_v4";
const SCORES_LEGACY  = "adscroll360_scores_v4";

const DEFAULT_METRICS: QualityMetric[] = [
    { id: "1", metric: "Quality",          weight: 40, description: "Accuracy, detail, and polish" },
    { id: "2", metric: "Creativity",        weight: 30, description: "Originality and innovation" },
    { id: "3", metric: "Communication",     weight: 15, description: "Clarity and responsiveness" },
    { id: "4", metric: "Task Completion",   weight: 15, description: "On-time delivery rate" },
];

function loadLocal<T>(key: string, fallback: T): T {
    try { const d = localStorage.getItem(key); if (d) return JSON.parse(d); } catch {}
    return fallback;
}

function loadMetricsInit(): QualityMetric[] {
    try {
        const n = localStorage.getItem(METRICS_KEY);
        if (n) return JSON.parse(n);
        const o = localStorage.getItem(METRICS_LEGACY);
        if (o) return JSON.parse(o);
    } catch {}
    return DEFAULT_METRICS;
}

function loadScoresInit(): AppQualityScore[] {
    try {
        const n = localStorage.getItem(SCORES_KEY);
        if (n) return JSON.parse(n);
        const o = localStorage.getItem(SCORES_LEGACY);
        if (o) return JSON.parse(o);
    } catch {}
    return [];
}

function mapKPI(k: any): AppKPI {
    return {
        id: k.id || k._id,
        title: k.title,
        description: k.description,
        type: k.type,
        target: k.target,
        current: k.current ?? 0,
        unit: k.unit,
        dailyMin: k.dailyMin,
        dailyMax: k.dailyMax,
        assignedToId: k.assignedToId,
        assignedToName: k.assignedToName,
        groupId: k.groupId,
        createdAt: k.created_at || k.createdAt,
    };
}

export function KPIProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();
    const [kpis, setKPIs] = useState<AppKPI[]>([]);
    // Quality metrics & scores still use localStorage (no backend endpoint needed yet)
    const [qualityMetrics, setQualityMetrics] = useState<QualityMetric[]>(() => loadMetricsInit());
    const [qualityScores, setQualityScores]   = useState<AppQualityScore[]>(() => loadScoresInit());

    useEffect(() => {
        localStorage.setItem(METRICS_KEY, JSON.stringify(qualityMetrics));
    }, [qualityMetrics]);

    useEffect(() => {
        localStorage.setItem(SCORES_KEY, JSON.stringify(qualityScores));
    }, [qualityScores]);

    useEffect(() => {
        if (!currentUser || !currentUser.companyId) return;
        api.kpis.list(currentUser.companyId)
            .then(({ kpis }) => setKPIs(kpis.map(mapKPI)))
            .catch(err => console.error("Error fetching KPIs:", err));
    }, [currentUser?.id, currentUser?.companyId]);

    const createKPI = async (k: Omit<AppKPI, "id" | "createdAt" | "current">) => {
        if (!currentUser?.companyId) return { success: false, error: "Missing company context" };
        try {
            const { kpi } = await api.kpis.create({ ...k, companyId: currentUser.companyId } as any);
            setKPIs(prev => [...prev, mapKPI(kpi)]);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateKPIProgress = async (kpiId: string, currentVal: number) => {
        try {
            await api.kpis.updateProgress(kpiId, currentVal);
            setKPIs(prev => prev.map(k => k.id === kpiId ? { ...k, current: currentVal } : k));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const deleteKPI = async (kpiId: string) => {
        try {
            await api.kpis.remove(kpiId);
            setKPIs(prev => prev.filter(k => k.id !== kpiId));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateQualityMetrics = async (metrics: QualityMetric[]) => {
        setQualityMetrics(metrics);
        return { success: true };
    };

    const addQualityScore = async (s: Omit<AppQualityScore, "id" | "createdAt">) => {
        const newScore: AppQualityScore = { ...s, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        setQualityScores(prev => [newScore, ...prev.filter(x => !(x.employeeId === s.employeeId && x.month === s.month))]);
        return { success: true };
    };

    return (
        <KPIContext.Provider value={{ kpis, qualityMetrics, qualityScores, createKPI, updateKPIProgress, deleteKPI, updateQualityMetrics, addQualityScore }}>
            {children}
        </KPIContext.Provider>
    );
}

export function useKPI() {
    const ctx = useContext(KPIContext);
    if (!ctx) throw new Error("useKPI must be used within KPIProvider");
    return ctx;
}
