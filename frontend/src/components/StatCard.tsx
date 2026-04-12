import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "primary" | "accent";
}

/** Explicit text colors so cards stay readable when a parent uses e.g. `text-white` (super-admin layout). */
const variantStyles = {
  default: "bg-card text-card-foreground shadow-card",
  primary: "bg-primary text-primary-foreground",
  accent: "bg-accent text-accent-foreground",
};

const iconStyles = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary-foreground/20 text-primary-foreground",
  accent: "bg-accent-foreground/20 text-accent-foreground",
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`rounded-2xl p-5 ${variantStyles[variant]} transition-shadow hover:shadow-card-hover`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p
            className={`text-xs font-medium uppercase tracking-wider ${
              variant === "default" ? "text-muted-foreground" : "text-inherit opacity-80"
            }`}
          >
            {title}
          </p>
          <p
            className={`font-tabular text-3xl font-bold tracking-tight ${
              variant === "default"
                ? "text-foreground"
                : variant === "primary"
                  ? "text-primary-foreground"
                  : "text-accent-foreground"
            }`}
          >
            {value}
          </p>
          {subtitle && (
            <p
              className={`text-sm ${
                variant === "default" ? "text-muted-foreground" : "text-inherit opacity-70"
              }`}
            >
              {subtitle}
            </p>
          )}
          {trend && (
            <p className={`text-xs font-medium ${trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
