// ============================================================
// JKT48CONNECT PUBLIC API CLIENT (api.jkt48connect.app)
// Server-side only: the API key is read from the environment and sent as
// `X-API-Key`, so it never reaches the browser.
//
//   JKT48CONNECT_API_KEY       jkc_… key from https://api.jkt48connect.app/dashboard/keys
//   JKT48CONNECT_API_BASE_URL  optional override (default https://api.jkt48connect.app)
//
// Admin & merch still use their own (v5) backends and do not go through here.
// ============================================================

export const JKT48CONNECT_BASE = (process.env.JKT48CONNECT_API_BASE_URL || "https://api.jkt48connect.app").replace(/\/+$/, "");

export function hasJkt48ConnectKey(): boolean {
  return Boolean(process.env.JKT48CONNECT_API_KEY);
}

let warnedMissingKey = false;

/**
 * GET a JKT48Connect endpoint. Returns the parsed JSON, or `null` when the key
 * is missing or the request fails (callers fall back to their cached/local data).
 */
export async function jkt48ConnectGet<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  { revalidate = 60, timeoutMs = 6000 }: { revalidate?: number; timeoutMs?: number } = {}
): Promise<T | null> {
  const key = process.env.JKT48CONNECT_API_KEY;
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn("[JKT48Connect] JKT48CONNECT_API_KEY belum di-set; memakai data fallback.");
    }
    return null;
  }

  const url = new URL(path, `${JKT48CONNECT_BASE}/`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  try {
    const res = await fetch(url, {
      headers: { "X-API-Key": key, Accept: "application/json" },
      next: { revalidate },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`[JKT48Connect] ${url.pathname} → HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[JKT48Connect] ${url.pathname} gagal:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/** Pick the first array found at the given keys (or the value itself if it is an array). */
export function pickList<T = Record<string, unknown>>(json: unknown, ...keys: string[]): T[] {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object") {
    for (const k of keys) {
      const v = (json as Record<string, unknown>)[k];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

/** ISO timestamp → { date: "YYYY-MM-DD", time: "HH:MM" } in WIB (UTC+7). */
export function toWib(iso: string | undefined | null): { date: string; time: string } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return { date: wib.toISOString().slice(0, 10), time: wib.toISOString().slice(11, 16) };
}

// ── Response shapes used by this site (see https://api.jkt48connect.app/docs/reference) ──
export interface JkcTheaterItem {
  id?: string;
  title?: string;
  team?: string;
  start_date?: string;
  end_date?: string;
  date?: string;
  url?: string;
}

export interface JkcMember {
  id?: string | number;
  name?: string;
  img?: string;
  url_key?: string;
}

export interface JkcTheaterDetail {
  shows?: { id?: string; members?: JkcMember[] }[];
}

export interface JkcYoutubeVideo {
  id?: string;
  title?: string;
  url?: string;
  date?: string;
}
