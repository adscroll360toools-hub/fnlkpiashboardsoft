import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./AuthContext";
import {
  DEFAULT_ATTENDANCE_RULES,
  statusFromCheckInTime,
  type AttendanceRules,
} from "@/lib/attendanceRules";

export type AttendanceStatus = "Present" | "Late" | "Absent" | "Leave" | "Break" | "—";

export interface AttendanceRecord {
    id: string;
    userId: string;
    date: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    status: AttendanceStatus;
    breakStartTime: string | null;
    breakEndTime: string | null;
}

export interface BreakRequest {
    id: string;
    userId: string;
    date: string;
    reason: string;
    sessionTime: string;
    status: "Pending" | "Approved" | "Rejected";
    requestedAt: string;
}

interface AttendanceContextType {
    records: AttendanceRecord[];
    breakRequests: BreakRequest[];
    checkIn: () => Promise<{ success: boolean; error?: string; status?: AttendanceStatus }>;
    checkOut: () => Promise<{ success: boolean; error?: string }>;
    requestBreak: (reason: string, sessionTime: string) => Promise<{ success: boolean; error?: string }>;
    approveBreak: (requestId: string) => Promise<void>;
    rejectBreak: (requestId: string) => Promise<void>;
    endBreak: () => Promise<{ success: boolean; error?: string }>;
    updateMemberAttendance: (userId: string, date: string, status: AttendanceStatus) => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | null>(null);

function mapRecord(r: any): AttendanceRecord {
    return {
        id: r.id || r._id,
        userId: r.userId,
        date: r.date,
        status: r.status,
        checkInTime: r.checkInTime ?? null,
        checkOutTime: r.checkOutTime ?? null,
        breakStartTime: r.breakStartTime ?? null,
        breakEndTime: r.breakEndTime ?? null,
    };
}

function refineStatus(r: AttendanceRecord, rules: AttendanceRules): AttendanceRecord {
  if (r.status === "Leave" || r.status === "Break") return r;
  if (r.checkInTime) return { ...r, status: statusFromCheckInTime(r.checkInTime, rules) };
  return r;
}

function mapBreakRequest(r: any): BreakRequest {
    return {
        id: r.id || r._id,
        userId: r.userId,
        date: r.date,
        reason: r.reason,
        sessionTime: r.sessionTime,
        status: r.status,
        requestedAt: r.requestedAt,
    };
}

export function AttendanceProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useAuth();
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [breakRequests, setBreakRequests] = useState<BreakRequest[]>([]);
    const [attendanceRules, setAttendanceRules] = useState<AttendanceRules>(DEFAULT_ATTENDANCE_RULES);

    const loadAttendance = useCallback(async () => {
        if (!currentUser?.companyId) return;
        let rules = DEFAULT_ATTENDANCE_RULES;
        try {
            const { company } = await api.tenantCompany.get(currentUser.companyId);
            if (company?.attendanceSettings && typeof company.attendanceSettings === "object") {
                rules = { ...DEFAULT_ATTENDANCE_RULES, ...company.attendanceSettings };
            }
        } catch {
            /* defaults */
        }
        setAttendanceRules(rules);
        try {
            const [{ records: rawRecs }, { breakRequests: rawBr }] = await Promise.all([
                api.attendance.list(currentUser.companyId),
                api.attendance.breaks.list(currentUser.companyId),
            ]);
            setRecords((rawRecs || []).map(mapRecord).map((r) => refineStatus(r, rules)));
            setBreakRequests((rawBr || []).map(mapBreakRequest));
        } catch (err) {
            console.error("Error loading attendance data:", err);
        }
    }, [currentUser?.companyId]);

    useEffect(() => {
        loadAttendance();
    }, [currentUser?.id, loadAttendance]);

    useEffect(() => {
        if (!currentUser?.companyId) return;
        const tick = window.setInterval(() => loadAttendance(), 60000);
        return () => window.clearInterval(tick);
    }, [currentUser?.companyId, loadAttendance]);

    const getCurrentDateStr = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    };

    const checkIn = async () => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        const date = getCurrentDateStr();
        const existing = records.find(r => r.userId === currentUser.id && r.date === date);
        if (existing?.checkInTime) return { success: false, error: "Already checked in today" };

        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        const status = statusFromCheckInTime(timeStr, attendanceRules);

        try {
            const { record } = await api.attendance.checkin({ 
                userId: currentUser.id, 
                date, 
                checkInTime: timeStr, 
                status,
                companyId: currentUser.companyId
            });
            const mapped = refineStatus(mapRecord(record), attendanceRules);
            setRecords(prev => {
                const idx = prev.findIndex(r => r.userId === currentUser.id && r.date === date);
                if (idx !== -1) { const updated = [...prev]; updated[idx] = mapped; return updated; }
                return [...prev, mapped];
            });
            return { success: true, status };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const checkOut = async () => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        const date = getCurrentDateStr();
        const record = records.find(r => r.userId === currentUser.id && r.date === date);
        if (!record?.checkInTime) return { success: false, error: "Not checked in yet" };
        if (record.checkOutTime) return { success: false, error: "Already checked out" };

        const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        try {
            await api.attendance.checkout(record.id, timeStr);
            setRecords(prev => prev.map(r => r.id === record.id ? { ...r, checkOutTime: timeStr } : r));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const requestBreak = async (reason: string, sessionTime: string) => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        const date = getCurrentDateStr();
        const record = records.find(r => r.userId === currentUser.id && r.date === date);
        if (!record?.checkInTime) return { success: false, error: "Must check in first before requesting a break." };
        if (record.checkOutTime) return { success: false, error: "Already checked out." };
        if (record.status === "Break") return { success: false, error: "Already on break." };
        const pending = breakRequests.find(r => r.userId === currentUser.id && r.date === date && r.status === "Pending");
        if (pending) return { success: false, error: "You already have a pending break request." };

        try {
            const { breakRequest } = await api.attendance.breaks.create({ 
                userId: currentUser.id, 
                date, 
                reason, 
                sessionTime,
                companyId: currentUser.companyId
            });
            setBreakRequests(prev => [...prev, mapBreakRequest(breakRequest)]);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const approveBreak = async (requestId: string) => {
        try {
            await api.attendance.breaks.update(requestId, "Approved");
            setBreakRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "Approved" } : r));
            const req = breakRequests.find(r => r.id === requestId);
            if (req) {
                const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
                const attRecord = records.find(r => r.userId === req.userId && r.date === req.date);
                if (attRecord) {
                    await api.attendance.update(attRecord.id, { status: "Break", breakStartTime: timeStr });
                    setRecords(prev => prev.map(r => r.id === attRecord.id ? { ...r, status: "Break", breakStartTime: timeStr } : r));
                }
            }
        } catch (err) { console.error("Error approving break:", err); }
    };

    const rejectBreak = async (requestId: string) => {
        try {
            await api.attendance.breaks.update(requestId, "Rejected");
            setBreakRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: "Rejected" } : r));
        } catch (err) { console.error("Error rejecting break:", err); }
    };

    const endBreak = async () => {
        if (!currentUser) return { success: false, error: "Not logged in" };
        const date = getCurrentDateStr();
        const record = records.find(r => r.userId === currentUser.id && r.date === date);
        if (!record || record.status !== "Break") return { success: false, error: "Not currently on break." };

        const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        const restoredStatus: AttendanceStatus = record.checkInTime
            ? statusFromCheckInTime(record.checkInTime, attendanceRules)
            : "Present";
        try {
            await api.attendance.update(record.id, { status: restoredStatus, breakEndTime: timeStr });
            setRecords(prev => prev.map(r => r.id === record.id ? { ...r, status: restoredStatus, breakEndTime: timeStr } : r));
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateMemberAttendance = async (userId: string, date: string, status: AttendanceStatus) => {
        if (!currentUser?.companyId) return;
        try {
            const { record } = await api.attendance.upsert({ 
                userId, 
                date, 
                status,
                companyId: currentUser.companyId
            });
            const mapped = refineStatus(mapRecord(record), attendanceRules);
            setRecords(prev => {
                const existing = prev.find(r => r.userId === userId && r.date === date);
                if (existing) return prev.map(r => r.id === existing.id ? mapped : r);
                return [...prev, mapped];
            });
        } catch (err) { console.error("Error updating member attendance:", err); }
    };

    return (
        <AttendanceContext.Provider value={{ records, breakRequests, checkIn, checkOut, requestBreak, approveBreak, rejectBreak, endBreak, updateMemberAttendance }}>
            {children}
        </AttendanceContext.Provider>
    );
}

export function useAttendance() {
    const ctx = useContext(AttendanceContext);
    if (!ctx) throw new Error("useAttendance must be used within AttendanceProvider");
    return ctx;
}
