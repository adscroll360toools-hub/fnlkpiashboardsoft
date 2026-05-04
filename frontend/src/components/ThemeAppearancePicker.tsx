import { Check } from "lucide-react";
import { useTheme, type AppThemeId } from "@/context/ThemeContext";

const OPTIONS: { id: AppThemeId; label: string; hint: string; swatch: string }[] = [
  { id: "light", label: "Light", hint: "Clean default workspace", swatch: "bg-white border border-border" },
  { id: "dark", label: "Dark", hint: "Low glare for night work", swatch: "bg-zinc-900 border border-zinc-700" },
  { id: "ocean", label: "Ocean", hint: "Warm accent with coral highlights", swatch: "bg-gradient-to-br from-amber-50 to-orange-100 border border-orange-200/80" },
];

export function ThemeAppearancePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Applies instantly across the app. Saved on your account when logged in.</p>
      <div className="flex flex-wrap gap-3">
        {OPTIONS.map((opt) => {
          const selected = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => void setTheme(opt.id)}
              className={`group flex flex-col items-center gap-2 rounded-xl p-3 transition-all outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring ${
                selected ? "ring-2 ring-primary shadow-md" : "ring-1 ring-border hover:ring-primary/40"
              }`}
            >
              <span className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-inner ${opt.swatch}`}>
                {selected ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                    <Check className="h-4 w-4" />
                  </span>
                ) : null}
              </span>
              <span className="text-sm font-medium text-foreground">{opt.label}</span>
              <span className="max-w-[7rem] text-center text-[11px] text-muted-foreground leading-snug">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
