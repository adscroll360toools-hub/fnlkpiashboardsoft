import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const ROLE_REDIRECT: Record<string, string> = {
  super_admin: "/super-admin/dashboard",
  admin: "/dashboard",
  controller: "/controller/dashboard",
  employee: "/employee/dashboard",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password) { setError("Password is required."); return; }
    setLoading(true);
    
    try {
      const result = await login(email.trim(), password);
      if (result.success && result.role) {
        navigate(ROLE_REDIRECT[result.role], { replace: true });
      } else {
        setError(result.error ?? "Login failed.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-md space-y-6"
      >
        {/* Brand */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <span className="text-lg font-bold text-primary-foreground">Z</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Zaptiz</h1>
          <p className="mt-1 text-sm text-muted-foreground">Performance & KPI Management</p>
        </div>

        {/* Login form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="rounded-2xl bg-card p-6 shadow-card space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                className="h-11 rounded-lg border-0 bg-muted text-sm focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="h-11 rounded-lg border-0 bg-muted pr-10 text-sm focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
              >
                {error}
              </motion.div>
            )}
          </div>

          <Button
            id="login-submit-btn"
            type="submit"
            className="h-11 w-full rounded-lg text-sm font-medium"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Zaptiz © {new Date().getFullYear()} · Internal Use Only
        </p>
      </motion.div>
    </div>
  );
}
