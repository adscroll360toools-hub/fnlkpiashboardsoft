import { motion } from "framer-motion";

interface KPIProgressBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
}

export function KPIProgressBar({ label, current, target, unit = "" }: KPIProgressBarProps) {
  const percent = Math.min((current / target) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="font-tabular text-sm text-muted-foreground">
          {current}/{target} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
          className="h-full rounded-full gradient-progress"
        />
      </div>
      <p className="font-tabular text-xs text-muted-foreground">{percent.toFixed(0)}% complete</p>
    </div>
  );
}
