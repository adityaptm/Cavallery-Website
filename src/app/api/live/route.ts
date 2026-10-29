import { NextResponse } from "next/server";
import { API_CACHE_HEADERS, fetchWithCacheAndFallback } from "@/lib/apiCache";
import { hasJkt48ConnectKey, jkt48ConnectGet, pickList } from "@/lib/jkt48connect";

const ERINE_KEYS = ["erine", "catherina", "catherine", "vallencia", "valencia"];

function isErine(name: string) {
  const n = (name ?? "").toLowerCase();
  return ERINE_KEYS.some((k) => n.includes(k));
}

interface LiveStream {
  name?: string;
  member_name?: string;
  username?: string;
  room_name?: string;
  img?: string;
  img_alt?: string;
  image?: string;
  avatar?: string;
  url_key?: string;
  slug?: string;
  type?: string;
  platform?: string;
  started_at?: string;
  live_at?: string;
  streaming_url_list?: { label: string; quality: number; url: string }[];
  streaming_url?: string;
  showId?: string | null;
  room_id?: number;
  /** IDN list items carry the member under `user` */
  user?: { name?: string; username?: string };
  stream_url?: string;
}

export async function GET() {
  try {
    const erineStreams = await fetchWithCacheAndFallback<any[]>({
      key: "erine_live_stream",
      ttlSeconds: 45,
      allowEmptyOverwrite: true,
      fetcher: async () => {
        if (!hasJkt48ConnectKey()) return [];
        // Showroom + IDN sessions (api.jkt48connect.app); IDN list as extra source
        const [nowLive, idnLives] = await Promise.all([
          jkt48ConnectGet("/api/now_live", { group: "jkt48" }, { revalidate: 30, timeoutMs: 5000 }),
          jkt48ConnectGet("/api/idn_lives", {}, { revalidate: 30, timeoutMs: 5000 }),
        ]);
        if (nowLive === null && idnLives === null) throw new Error("JKT48Connect live tidak tersedia");
        const streams: LiveStream[] = [
          ...pickList<LiveStream>(nowLive, "data", "lives"),
          ...pickList<LiveStream>(idnLives, "data", "lives").map((s) => ({ ...s, type: s.type || "idn" })),
        ];

        // Filter ONLY Erine (Catherina Vallencia)
        const seen = new Set<string>();
        const erineLives = streams.filter((s) => {
          if (!isErine([s.name, s.member_name, s.username, s.room_name, s.url_key, s.user?.name, s.user?.username].filter(Boolean).join(" "))) return false;
          const key = `${(s.type ?? s.platform ?? "").toLowerCase()}-${s.slug ?? s.url_key ?? s.user?.username ?? s.room_id ?? ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        return erineLives.map((s) => {
          const name = "Catherina Vallencia (Erine)";
          const img = s.img ?? s.img_alt ?? s.image ?? s.avatar ?? "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg";
          const type = (s.type ?? s.platform ?? "idn").toLowerCase();
          const slug = s.slug ?? "";
          const username = s.url_key ?? s.user?.username ?? "jkt48_erine";

          const url = type.includes("showroom")
            ? (s.url_key ? `https://www.showroom-live.com/r/${s.url_key}` : "https://www.showroom-live.com/r/JKT48_Erine")
            : (slug ? `https://www.idn.app/${username}/live/${slug}` : `https://www.idn.app/${username}`);

          return {
            id: s.slug ?? s.url_key ?? "erine-live",
            name,
            img,
            type,
            platform: type.includes("showroom") ? "SHOWROOM" : "IDN LIVE",
            url_key: username,
            slug,
            started_at: s.started_at ?? s.live_at ?? null,
            streaming_url: s.streaming_url_list?.[0]?.url ?? s.streaming_url ?? s.stream_url ?? null,
            url,
            is_erine: true,
          };
        });
      },
      fallbackData: [],
    });

    return NextResponse.json(
      {
        success: true,
        erine_live: erineStreams.length > 0,
        data: erineStreams,
      },
      { headers: API_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Live API Error:", error);
    return NextResponse.json(
      { success: true, erine_live: false, data: [] },
      { headers: API_CACHE_HEADERS }
    );
  }
}
