// ============================================================
// JKT48 Connect API Server Helper
// Base URL: https://api.jkt48connect.app
//
// ATURAN KEAMANAN:
// - API key HANYA dibaca dari process.env.JKT48CONNECT_API_KEY
// - Server-side only (tidak boleh dieksekusi di browser)
// ============================================================

export const JKT48_API_BASE_URL = (
  process.env.JKT48CONNECT_API_BASE_URL || "https://api.jkt48connect.app"
).replace(/\/+$/, "");

export class Jkt48ApiError extends Error {
  status: number;
  isRateLimit: boolean;

  constructor(status: number, message: string) {
    super(message);
    this.name = "Jkt48ApiError";
    this.status = status;
    this.isRateLimit = status === 429;
  }
}

interface FetchOptions {
  revalidate?: number; // Caching Next.js dalam detik
  timeoutMs?: number;  // Timeout dalam milidetik (default 8000ms)
}

/**
 * Server-only helper untuk request ke api.jkt48connect.app.
 * Menginjeksi X-API-Key secara aman dari environment variable.
 */
export async function jkt48Fetch<T = any>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  options: FetchOptions = {}
): Promise<T> {
  // Pastikan hanya berjalan di server
  if (typeof window !== "undefined") {
    throw new Error("jkt48Fetch hanya dapat dijalankan di server (API route / Server Action).");
  }

  const apiKey = process.env.JKT48CONNECT_API_KEY;
  if (!apiKey) {
    throw new Jkt48ApiError(
      401,
      "JKT48CONNECT_API_KEY belum dikonfigurasi di environment variable."
    );
  }

  // Bangun URL dengan query params
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${JKT48_API_BASE_URL}${normalizedPath}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const { revalidate = 60, timeoutMs = 8000 } = options;

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
        "User-Agent": "Cavallery-Fanbase/2.0 (+https://cavallery.id)",
      },
      next: { revalidate },
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Jkt48ApiError(
          429,
          "Batas permintaan JKT48 Connect API tercapai (Rate Limit). Silakan tunggu beberapa saat sebelum mencoba lagi."
        );
      }
      if (res.status === 401 || res.status === 403) {
        throw new Jkt48ApiError(
          res.status,
          "Autentikasi JKT48 Connect gagal. Periksa kembali JKT48CONNECT_API_KEY."
        );
      }
      throw new Jkt48ApiError(
        res.status,
        `Gagal memuat data dari JKT48 Connect (HTTP ${res.status}).`
      );
    }

    const data = await res.json();
    return data as T;
  } catch (error: any) {
    if (error instanceof Jkt48ApiError) {
      throw error;
    }
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Jkt48ApiError(
        504,
        "Permintaan ke server JKT48 Connect melebihi batas waktu (Timeout)."
      );
    }
    throw new Jkt48ApiError(
      500,
      error?.message || "Terjadi kesalahan internal saat menghubungi JKT48 Connect."
    );
  }
}

/**
 * Cek apakah API Key sudah tersedia di environment variable
 */
export function isJkt48ApiKeyConfigured(): boolean {
  return Boolean(process.env.JKT48CONNECT_API_KEY && process.env.JKT48CONNECT_API_KEY.trim().length > 0);
}
