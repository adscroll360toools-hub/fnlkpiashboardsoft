/** Resolve stored `/uploads/...` paths to absolute URLs for <img src>. */

function normalizeApiBaseUrl(base: string): string {
  let b = (base || "").trim();
  if (!b) return b;
  b = b.replace(/\/+$/, "");
  if (b.endsWith("/api")) {
    b = b.slice(0, -4).replace(/\/+$/, "");
  }
  return b;
}

const BASE =
  normalizeApiBaseUrl(
    import.meta.env.VITE_API_URL ||
      (import.meta.env.DEV ? "http://localhost:3001" : "https://kpiadscroll360.onrender.com")
  ) || "";

export function publicAssetUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return "";
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${BASE}${p}`;
}
