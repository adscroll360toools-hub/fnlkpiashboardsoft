import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Internal storage: "" or "HH:MM" 24-hour. */

function parseTo24(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function formatTimeForTag(t24: string | null | undefined, use12h: boolean): string {
  const p = parseTo24(t24 || "");
  if (!p) return "";
  const [hs, ms] = p.split(":");
  const h = parseInt(hs, 10);
  const min = ms;
  if (!use12h) return `${String(h).padStart(2, "0")}:${min}`;
  const suf = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${suf}`;
}

type Props = {
  label?: string;
  value24: string;
  onChange24: (v: string) => void;
  use12h: boolean;
  onToggle12h: (v: boolean) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export function AssignmentTimeField({
  label = "Scheduled time (optional)",
  value24,
  onChange24,
  use12h,
  onToggle12h,
  disabled,
  idPrefix = "task-time",
}: Props) {
  const safe = parseTo24(value24) ?? "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={`${idPrefix}-input`} className="text-sm font-medium">
          {label}
        </Label>
        <div className="flex items-center gap-1 rounded-md border border-input bg-muted/30 p-0.5 text-[11px]">
          <Button
            type="button"
            variant={!use12h ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => onToggle12h(false)}
            disabled={disabled}
          >
            24h
          </Button>
          <Button
            type="button"
            variant={use12h ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2"
            onClick={() => onToggle12h(true)}
            disabled={disabled}
          >
            12h
          </Button>
        </div>
      </div>
      <input
        id={`${idPrefix}-input`}
        type="time"
        disabled={disabled}
        value={safe}
        onChange={(e) => onChange24(e.target.value)}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-tabular-nums ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
      />
      {safe ? (
        <p className="text-[11px] text-muted-foreground tabular-nums">
          Saved as <span className="font-medium text-foreground">{formatTimeForTag(safe, use12h)}</span>
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">Leave empty for no specific time.</p>
      )}
    </div>
  );
}
