/** Production (Railway): set VITE_API_BASE_URL=https://your-api.up.railway.app (no trailing slash) */
const origin = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

export const API_ORIGIN = origin;
export const API = origin ? `${origin}/api` : "/api";

/** Full URL for fetch (uploads, absolute paths). */
export function apiFetchUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${p}` : p;
}

/** Banner/promo paths like /uploads/... need API host on Railway. */
export function resolveMediaUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return origin ? `${origin}${path}` : path;
}
