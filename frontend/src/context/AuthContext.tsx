import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";

export type UserRole = "super_admin" | "admin" | "controller" | "employee";

export interface AppUser {
    id: string;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    department?: string;
    position?: string;
    createdAt: string;
    companyId?: string;
}

interface AuthContextType {
    currentUser: AppUser | null;
    users: AppUser[];
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
    logout: () => void;
    addUser: (user: Omit<AppUser, "id" | "createdAt">) => Promise<{ success: boolean; error?: string }>;
    updateUser: (id: string, updates: Partial<AppUser>) => Promise<void>;
    removeUser: (id: string) => Promise<void>;
    changePassword: (id: string, currentPw: string, newPw: string) => Promise<{ success: boolean; error?: string }>;
    forceResetPassword: (id: string, newPw: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "adscroll360_session_v4";

function mapUser(u: any): AppUser {
    return {
        id: u.id || u._id,
        name: u.name,
        email: u.email,
        password: u.password || "",
        role: u.role,
        department: u.department,
        position: u.position,
        createdAt: u.created_at || u.createdAt || new Date().toISOString(),
        companyId: u.companyId,
    };
}

function loadSession(): AppUser | null {
    try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) return JSON.parse(saved);
    } catch { }
    return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [currentUser, setCurrentUser] = useState<AppUser | null>(loadSession);

    // Fetch all users from the MongoDB backend (only for non-super-admin)
    useEffect(() => {
        if (!currentUser || currentUser.role === 'super_admin') return;
        if (!currentUser.companyId) return;
        
        api.users.list(currentUser.companyId)
            .then(({ users }) => setUsers(users.map(mapUser)))
            .catch(err => console.error("Failed to load users:", err));
    }, [currentUser?.role, currentUser?.companyId]);

    // Keep session in localStorage
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
    }, [currentUser]);

    const login = async (email: string, password: string) => {
        try {
            // First try super admin login
            if (email.toLowerCase() === 'admin@adscroll360.com') {
                const { user } = await api.superAdmin.login(email, password);
                const found = mapUser(user);
                setCurrentUser(found);
                return { success: true, role: found.role };
            }

            // Regular user login
            const { user } = await api.users.login(email, password);
            const found = mapUser(user);
            setCurrentUser(found);
            return { success: true, role: found.role };
        } catch (err: any) {
            return { success: false, error: err.message || "Invalid email or password." };
        }
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem(SESSION_KEY);
    };

    const addUser = async (user: Omit<AppUser, "id" | "createdAt">) => {
        try {
            const { user: created } = await api.users.create(user as any);
            const mapped = mapUser(created);
            setUsers(prev => [...prev, mapped]);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    };

    const updateUser = async (id: string, updates: Partial<AppUser>) => {
        try {
            await api.users.update(id, updates as any);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
            if (currentUser?.id === id) {
                setCurrentUser(prev => prev ? { ...prev, ...updates } : prev);
            }
        } catch (err) {
            console.error("Error updating user:", err);
        }
    };

    const removeUser = async (id: string) => {
        try {
            await api.users.remove(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (err) {
            console.error("Error removing user:", err);
        }
    };

    const changePassword = async (id: string, currentPw: string, newPw: string) => {
        const user = users.find(u => u.id === id);
        if (!user) return { success: false, error: "User not found." };
        if (user.password !== currentPw) return { success: false, error: "Current password is incorrect." };
        if (newPw.length < 6) return { success: false, error: "New password must be at least 6 characters." };
        await updateUser(id, { password: newPw });
        return { success: true };
    };

    const forceResetPassword = async (id: string, newPw: string) => {
        const user = users.find(u => u.id === id);
        if (!user) return { success: false, error: "User not found." };
        if (newPw.length < 6) return { success: false, error: "Password must be at least 6 characters." };
        await updateUser(id, { password: newPw });
        return { success: true };
    };

    return (
        <AuthContext.Provider value={{ currentUser, users, login, logout, addUser, updateUser, removeUser, changePassword, forceResetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
