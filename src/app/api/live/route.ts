import { NextResponse } from "next/server";
import { fetchWithCacheAndFallback } from "@/lib/apiCache";
import { hasJkt48ConnectKey, jkt48ConnectGet, pickList } from "@/lib/jkt48connect";

export const dynamic = "force-dynamic";

const ERINE_KEYS = ["erine", "catherina", "catherine", "vallencia", "valencia", "jkt48_erine"];

function isErine(name: string) {
  const n = (name ?? "").toLowerCase();
  return ERINE_KEYS.some((k) => n.includes(k));
}

interface LiveStream {
  id?: string | number;
  name?: string;
  member_name?: string;
  username?: string;
  room_name?: string;
  title?: string;
  caption?: string;
  img?: string;
  img_alt?: string;
  image?: string;
  image_url?: string;
  avatar?: string;
  url_key?: string;
  room_url_key?: string;
  slug?: string;
  type?: string;
  platform?: string;
  started_at?: string;
  live_at?: string;
  is_live?: boolean;
  viewers?: number;
  view_count?: number;
  view_num?: number;
  streaming_url_list?: { label: string; quality: number; url: string }[];
  streaming_url?: string;
  showId?: string | null;
  room_id?: number;
  user?: { name?: string; username?: string; avatar?: string };
  creator?: { name?: string; username?: string; avatar?: string };
  stream_url?: string;
  playback_url?: string;
  url?: string;
}

export async function GET() {
  try {
    const erineStreams = await fetchWithCacheAndFallback<any[]>({
      key: "erine_live_stream",
      ttlSeconds: 15,
      allowEmptyOverwrite: true,
      fetcher: async () => {
        if (!hasJkt48ConnectKey()) return [];
        const [nowLive, idnLives, notifLives] = await Promise.all([
          jkt48ConnectGet("/api/now_live", { group: "jkt48" }, { revalidate: 10, timeoutMs: 6000 }),
          jkt48ConnectGet("/api/idn_lives", {}, { revalidate: 10, timeoutMs: 6000 }),
          jkt48ConnectGet("/api/live-notifications", {}, { revalidate: 15, timeoutMs: 6000 }),
        ]);
        if (nowLive === null && idnLives === null && notifLives === null) {
          throw new Error("JKT48Connect live tidak tersedia");
        }

        const nowList = pickList<LiveStream>(nowLive, "data", "lives", "result");
        const idnList = pickList<LiveStream>(idnLives, "data", "lives", "result", "idn").map((s) => ({
          ...s,
          type: s.type || "idn",
          platform: s.platform || "idn",
        }));
        const streams: LiveStream[] = [...nowList, ...idnList];

        const seen = new Set<string>();
        const erineLives = streams.filter((s) => {
          if (s.is_live === false) return false;
          const haystack = [
            s.name,
            s.member_name,
            s.username,
            s.room_name,
            s.room_url_key,
            s.url_key,
            s.slug,
            s.title,
            s.user?.name,
            s.user?.username,
            s.creator?.name,
            s.creator?.username,
          ]
            .filter(Boolean)
            .join(" ");
          if (!isErine(haystack)) return false;

          const isIdn =
            String(s.type ?? s.platform ?? "").toLowerCase().includes("idn") ||
            Boolean(s.slug) ||
            Boolean(s.user) ||
            Boolean(s.creator) ||
            Boolean(s.stream_url);
          const platKey = isIdn ? "idn" : "showroom";
          const idKey = s.slug ?? s.url_key ?? s.room_url_key ?? s.user?.username ?? s.creator?.username ?? s.room_id ?? "";
          const key = `${platKey}-${idKey}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const mapped = erineLives.map((s) => {
          const name = "Catherina Vallencia (Erine)";
          const img =
            s.img ??
            s.img_alt ??
            s.image ??
            s.image_url ??
            s.avatar ??
            s.user?.avatar ??
            s.creator?.avatar ??
            "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg";
          const isIdn =
            String(s.type ?? s.platform ?? "").toLowerCase().includes("idn") ||
            Boolean(s.slug) ||
            Boolean(s.user) ||
            Boolean(s.creator) ||
            Boolean(s.stream_url);
          const type = isIdn ? "idn" : "showroom";
          const slug = s.slug ?? "";
          const username =
            s.user?.username ?? s.creator?.username ?? s.username ?? s.url_key ?? s.room_url_key ?? "jkt48_erine";

          const url = isIdn
            ? slug
              ? `https://www.idn.app/${username}/live/${slug}`
              : `https://www.idn.app/${username}`
            : s.room_url_key || s.url_key
            ? `https://www.showroom-live.com/r/${s.room_url_key ?? s.url_key}`
            : "https://www.showroom-live.com/r/JKT48_Erine";

          return {
            id: String(s.id ?? s.slug ?? s.url_key ?? "erine-live"),
            name,
            img,
            type,
            platform: isIdn ? "IDN LIVE" : "SHOWROOM",
            url_key: username,
            slug,
            viewers: s.view_count ?? s.viewers ?? s.view_num,
            started_at: s.started_at ?? s.live_at ?? null,
            streaming_url: s.streaming_url_list?.[0]?.url ?? s.streaming_url ?? s.stream_url ?? s.playback_url ?? null,
            url,
            is_erine: true,
          };
        });

        // Fallback dari live-notifications jika list utama kosong tapi notif aktif
        if (mapped.length === 0 && notifLives) {
          const notifs = pickList<LiveStream>(notifLives, "lives", "data", "result");
          for (const n of notifs) {
            const haystack = [n.title, n.caption, n.name, n.member_name, n.username, n.user?.name, n.user?.username]
              .filter(Boolean)
              .join(" ");
            if (isErine(haystack) && n.is_live !== false) {
              const isShowroom = String(n.platform ?? n.type ?? "").toLowerCase().includes("showroom");
              mapped.push({
                id: String(n.id ?? n.slug ?? "erine-notif-live"),
                name: "Catherina Vallencia (Erine)",
                img: n.img ?? n.image ?? "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
                type: isShowroom ? "showroom" : "idn",
                platform: isShowroom ? "SHOWROOM" : "IDN LIVE",
                url_key: n.username ?? "jkt48_erine",
                slug: n.slug ?? "",
                viewers: n.view_count ?? n.viewers,
                started_at: n.started_at ?? n.live_at ?? null,
                streaming_url: n.streaming_url ?? n.stream_url ?? null,
                url: n.url ?? (isShowroom ? "https://www.showroom-live.com/r/JKT48_Erine" : "https://www.idn.app/jkt48_erine"),
                is_erine: true,
              });
              break;
            }
          }
        }

        return mapped;
      },
      fallbackData: [],
    });

    return NextResponse.json(
      {
        success: true,
        erine_live: erineStreams.length > 0,
        data: erineStreams,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Live API Error:", error);
    return NextResponse.json(
      { success: true, erine_live: false, data: [] },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
