import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const CHOICES = ["Going great", "Steady", "Challenging"] as const;
const STORAGE_PREFIX = "zaptiz_pulse_week_";

/** Pulse check-in: max 3 fixed choices + optional “Other” (survey guideline). */
export function PulseSurveyCard() {
  const weekKey = useMemo(() => {
    const d = new Date();
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }, []);

  const storageKey = `${STORAGE_PREFIX}${weekKey}`;
  const [already, setAlready] = useState(() => {
    try {
      return !!localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  });
  const [choice, setChoice] = useState<(typeof CHOICES)[number] | "">("");
  const [other, setOther] = useState("");

  const submit = () => {
    if (!choice && !other.trim()) {
      toast.error("Pick one option or write something under Other.");
      return;
    }
    if (other.trim().length > 500) {
      toast.error("Other is too long (max 500 characters).");
      return;
    }
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          choice: choice || "Other",
          other: other.trim() || undefined,
          at: new Date().toISOString(),
        })
      );
    } catch {
      /* ignore */
    }
    setAlready(true);
    toast.success("Thanks — your pulse response was saved on this device.");
  };

  if (already) {
    return (
      <div className="rounded-2xl border bg-card p-4 shadow-card text-sm text-muted-foreground">
        You already shared how this week feels. Next prompt next week.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <h3 className="text-sm font-semibold text-foreground">Quick pulse (this week)</h3>
      <p className="mt-1 text-xs text-muted-foreground">Pick one of three options, or use Other — kept simple on purpose.</p>
      <div className="mt-3 space-y-2">
        {CHOICES.map((c) => (
          <label key={c} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50">
            <input type="radio" name="pulse" checked={choice === c} onChange={() => { setChoice(c); setOther(""); }} />
            {c}
          </label>
        ))}
        <div className="space-y-1.5 rounded-lg border px-3 py-2">
          <Label className="text-xs text-muted-foreground">Other (optional)</Label>
          <input
            value={other}
            onChange={(e) => {
              setOther(e.target.value);
              if (e.target.value.trim()) setChoice("");
            }}
            placeholder="Short note…"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
          />
        </div>
      </div>
      <Button type="button" size="sm" className="mt-3 w-full sm:w-auto" onClick={submit}>
        Submit
      </Button>
    </div>
  );
}
