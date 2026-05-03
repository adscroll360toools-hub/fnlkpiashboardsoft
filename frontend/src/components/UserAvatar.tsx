import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { publicAssetUrl } from "@/lib/assetUrl";

const FALLBACK_PALETTES = [
  "bg-teal-600 text-white",
  "bg-violet-600 text-white",
  "bg-sky-600 text-white",
  "bg-amber-600 text-white",
  "bg-rose-600 text-white",
  "bg-emerald-600 text-white",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

function paletteIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997;
  return h % FALLBACK_PALETTES.length;
}

type Props = {
  name: string;
  photoUrl?: string | null;
  className?: string;
  size?: "sm" | "md";
};

export function UserAvatar({ name, photoUrl, className, size = "sm" }: Props) {
  const dim = size === "md" ? "h-9 w-9 text-sm" : "h-[34px] w-[34px] text-[11px]";
  const src = publicAssetUrl(photoUrl || "");
  const ini = initials(name || "?");
  const pal = FALLBACK_PALETTES[paletteIndex(name || "user")];

  return (
    <Avatar className={cn(dim, "shrink-0 ring-1 ring-border/60", className)}>
      {src ? (
        <AvatarImage src={src} alt="" className="object-cover" />
      ) : null}
      <AvatarFallback className={cn("font-semibold", pal)}>{ini}</AvatarFallback>
    </Avatar>
  );
}
