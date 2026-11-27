import { NextResponse } from "next/server";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";
import type { Jkt48LiveItem } from "@/types/jkt48";

export const dynamic = "force-dynamic";

const ERINE_KEYS = ["erine", "catherina", "catherine", "vallencia", "valencia", "jkt48_erine"];

function checkIsErine(...values: Array<string | undefined | null>): boolean {
  const combined = values.filter(Boolean).join(" ").toLowerCase();
  if (!combined) return false;
  return ERINE_KEYS.some((k) => combined.includes(k));
}

function extractList(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload === "object") {
    for (const key of ["data", "lives", "result", "idn", "items"]) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    if (payload.data && typeof payload.data === "object") {
      for (const key of ["lives", "data", "items"]) {
        if (Array.isArray(payload.data[key])) return payload.data[key];
      }
    }
  }
  return [];
}

export async function GET() {
  try {
    if (!isJkt48ApiKeyConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "JKT48CONNECT_API_KEY belum dikonfigurasi.",
          data: { lives: [], erine_live: false, notification: null },
        },
        { status: 503 }
      );
    }

    // Cache singkat 10 detik agar live IDN/Showroom cepat terdeteksi
    const [nowLiveData, idnData, notifData] = await Promise.allSettled([
      jkt48Fetch<any>("/api/now_live", { group: "jkt48" }, { revalidate: 10, timeoutMs: 6000 }),
      jkt48Fetch<any>("/api/idn_lives", {}, { revalidate: 10, timeoutMs: 6000 }),
      jkt48Fetch<any>("/api/live-notifications", {}, { revalidate: 15, timeoutMs: 6000 }),
    ]);

    const lives: Jkt48LiveItem[] = [];
    const seen = new Set<string>();

    // 1. Process /api/now_live (bisa berisi Showroom maupun IDN Live)
    if (nowLiveData.status === "fulfilled" && nowLiveData.value) {
      const list = extractList(nowLiveData.value);

      for (const item of list) {
        const isMatched = checkIsErine(
          item.name,
          item.room_name,
          item.member_name,
          item.room_url_key,
          item.url_key,
          item.slug,
          item.username,
          item.title,
          item.user?.name,
          item.user?.username,
          item.creator?.name,
          item.creator?.username
        );
        if (!isMatched) continue;

        const rawType = String(item.type || item.platform || "").toLowerCase();
        const isIdn =
          rawType.includes("idn") ||
          Boolean(item.slug) ||
          Boolean(item.user) ||
          Boolean(item.creator) ||
          Boolean(item.stream_url);
        const platform: "idn" | "showroom" = isIdn ? "idn" : "showroom";
        const slug = item.slug || item.url_key || item.room_url_key || "";
        const username = item.user?.username || item.creator?.username || item.username || item.url_key || "jkt48_erine";
        const dedupeKey = `${platform}-${slug || username}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        lives.push({
          id: String(item.room_id || item.id || item.slug || `${platform}-erine`),
          name: "Catherina Vallencia (Erine)",
          member_name: "Catherina Vallencia",
          img:
            item.image ||
            item.img ||
            item.img_alt ||
            item.avatar ||
            item.user?.avatar ||
            "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
          type: platform,
          platform,
          streaming_url: item.streaming_url_list?.[0]?.url || item.stream_url || item.streaming_url || "",
          url: isIdn
            ? slug
              ? `https://www.idn.app/${username}/live/${slug}`
              : `https://www.idn.app/${username}`
            : item.room_url_key
            ? `https://www.showroom-live.com/r/${item.room_url_key}`
            : "https://www.showroom-live.com/r/JKT48_Erine",
          viewers: item.view_count || item.viewers || item.view_num,
          started_at: item.live_at || item.started_at,
          is_erine: true,
        });
      }
    }

    // 2. Process /api/idn_lives (Khusus IDN Live)
    if (idnData.status === "fulfilled" && idnData.value) {
      const idnList = extractList(idnData.value);

      for (const item of idnList) {
        if (item.is_live === false) continue;
        const isMatched = checkIsErine(
          item.user?.name,
          item.user?.username,
          item.creator?.name,
          item.creator?.username,
          item.name,
          item.member_name,
          item.username,
          item.slug,
          item.url_key,
          item.title
        );
        if (!isMatched) continue;

        const username = item.user?.username || item.creator?.username || item.username || item.url_key || "jkt48_erine";
        const slug = item.slug || "";
        const dedupeKey = `idn-${slug || username}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        lives.push({
          id: String(item.id || item.slug || `idn-${username}`),
          name: "Catherina Vallencia (Erine)",
          member_name: "Catherina Vallencia",
          img:
            item.image ||
            item.img ||
            item.image_url ||
            item.user?.avatar ||
            item.creator?.avatar ||
            "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
          type: "idn",
          platform: "idn",
          streaming_url: item.stream_url || item.streaming_url || item.playback_url || "",
          url: slug ? `https://www.idn.app/${username}/live/${slug}` : `https://www.idn.app/${username}`,
          viewers: item.view_count || item.viewers,
          started_at: item.live_at || item.started_at,
          is_erine: true,
        });
      }
    }

    // 3. Process /api/live-notifications (Fallback jika IDN belum masuk list utama tapi notif aktif)
    let notification: { banner_url?: string; caption?: string } | null = null;
    if (notifData.status === "fulfilled" && notifData.value) {
      const notifList = extractList(notifData.value);

      for (const n of notifList) {
        const isMatched = checkIsErine(
          n.title,
          n.caption,
          n.member,
          n.member_name,
          n.name,
          n.username,
          n.user?.name,
          n.user?.username
        );
        if (isMatched && n.is_live !== false) {
          const banner = n.notification_designs?.jkt48connect?.banner;
          if (banner?.status === "ready" && banner?.url) {
            notification = {
              banner_url: banner.url,
              caption: n.caption || n.title,
            };
          }
          // Jika lives masih kosong padahal notifikasi menandakan live aktif
          if (lives.length === 0) {
            const isShowroom = String(n.platform || n.type || "").toLowerCase().includes("showroom");
            lives.push({
              id: String(n.id || n.slug || "notif-erine-live"),
              name: "Catherina Vallencia (Erine)",
              member_name: "Catherina Vallencia",
              img: n.image || n.img || banner?.url || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
              type: isShowroom ? "showroom" : "idn",
              platform: isShowroom ? "showroom" : "idn",
              streaming_url: n.stream_url || n.streaming_url || "",
              url: n.url || (isShowroom ? "https://www.showroom-live.com/r/JKT48_Erine" : "https://www.idn.app/jkt48_erine"),
              viewers: n.view_count || n.viewers,
              started_at: n.started_at || n.live_at,
              is_erine: true,
            });
          }
          break;
        }
      }
    }

    const erineLive = lives.length > 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          lives,
          erine_live: erineLive,
          notification,
        },
        cached_at: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err: any) {
    if (err instanceof Jkt48ApiError) {
      return NextResponse.json(
        {
          success: false,
          error: err.message,
          isRateLimit: err.isRateLimit,
          data: { lives: [], erine_live: false, notification: null },
        },
        { status: err.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan saat memeriksa status siaran langsung.",
        data: { lives: [], erine_live: false, notification: null },
      },
      { status: 500 }
    );
  }
}
