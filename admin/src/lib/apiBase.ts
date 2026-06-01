const origin = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim().replace(/\/$/, "") ?? "";

export const API_ORIGIN = origin;
export const API = origin ? `${origin}/api` : "/api";

export function apiFetchUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return origin ? `${origin}${p}` : p;
}
