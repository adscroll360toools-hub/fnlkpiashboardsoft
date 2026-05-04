import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

export type AppThemeId = "light" | "dark" | "ocean";

const STORAGE_KEY = "kpiad_theme_preference_v1";

function readStoredTheme(): AppThemeId | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "ocean") return v;
  } catch {
    /* ignore */
  }
  return null;
}

function applyDomTheme(theme: AppThemeId) {
  const root = document.documentElement;
  if (theme === "light") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  root.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { currentUser, updateUser } = useAuth();
  const [theme, setThemeState] = useState<AppThemeId>(() => readStoredTheme() || "light");

  useLayoutEffect(() => {
    applyDomTheme(theme);
  }, [theme]);

  useEffect(() => {
    const fromUser = currentUser?.preferences?.theme;
    if (fromUser === "light" || fromUser === "dark" || fromUser === "ocean") {
      setThemeState(fromUser);
      try {
        localStorage.setItem(STORAGE_KEY, fromUser);
      } catch {
        /* ignore */
      }
      return;
    }
    const t = readStoredTheme() ?? "light";
    setThemeState(t);
  }, [currentUser?.id, currentUser?.preferences?.theme]);

  const setTheme = useCallback(
    async (next: AppThemeId) => {
      setThemeState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      if (currentUser?.id && currentUser.companyId) {
        const prev =
          currentUser.preferences && typeof currentUser.preferences === "object" && !Array.isArray(currentUser.preferences)
            ? { ...currentUser.preferences }
            : {};
        await updateUser(currentUser.id, { preferences: { ...prev, theme: next } });
      }
    },
    [currentUser?.id, currentUser?.companyId, currentUser?.preferences, updateUser]
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

const ThemeContext = createContext<{ theme: AppThemeId; setTheme: (t: AppThemeId) => void } | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
