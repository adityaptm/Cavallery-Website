import { NextResponse } from "next/server";
import { API_CACHE_HEADERS, fetchWithCacheAndFallback } from "@/lib/apiCache";
import { jkt48ConnectGet, pickList } from "@/lib/jkt48connect";

const DEFAULT_ERINE_LIVES: any[] = [
  {
    _id: "diroriiiii-260907005337",
    data_id: "diroriiiii-260907005337",
    total_gift: "Rp 5.550.000",
    type: "idn",
    room_id: 0,
    points: 2220,
    member: {
      name: "Erine JKT48",
      nickname: "Erine JKT48",
      url: "erine",
      is_graduate: false,
      is_official: true,
      img: "https://images.jkt48connect.com/jkt48/live/2807abf04c55becef674.webp",
      img_alt: "https://images.jkt48connect.com/jkt48/idnplus/bcd725b845e06c4e48bd.webp",
    },
    idn: {
      id: "65ce68ed1dd7aa2c8c0ca774",
      username: "jkt48_erine",
      slug: "diroriiiii-260907005337",
      title: "diroriiiii",
      image: "https://images.jkt48connect.com/jkt48/live/2807abf04c55becef674.webp",
    },
    live_info: {
      duration: 3623629,
      viewers: { num: 3874, is_excitement: false },
      date: {
        start: "2026-09-06T17:53:42.000Z",
        end: "2026-09-06T18:54:05.629Z",
      },
    },
  },
  {
    _id: "diroriiiii-260905214717",
    data_id: "diroriiiii-260905214717",
    total_gift: "Rp 7.750.000",
    type: "idn",
    room_id: 0,
    points: 3100,
    member: {
      name: "Erine JKT48",
      nickname: "Erine JKT48",
      url: "erine",
      is_graduate: false,
      is_official: true,
      img: "https://images.jkt48connect.com/jkt48/live/f6842309aab5ce610e25.webp",
      img_alt: "https://images.jkt48connect.com/jkt48/idnplus/bcd725b845e06c4e48bd.webp",
    },
    idn: {
      id: "65ce68ed1dd7aa2c8c0ca774",
      username: "jkt48_erine",
      slug: "diroriiiii-260905214717",
      title: "diroriiiii",
      image: "https://images.jkt48connect.com/jkt48/live/f6842309aab5ce610e25.webp",
    },
    live_info: {
      duration: 4052585,
      viewers: { num: 13158, is_excitement: false },
      date: {
        start: "2026-09-05T14:47:23.000Z",
        end: "2026-09-05T15:54:55.585Z",
      },
    },
  },
  {
    _id: "showroom-erine-260830",
    data_id: "showroom-erine-260830",
    total_gift: "Rp 3.850.000",
    type: "showroom",
    room_id: 512401,
    points: 1540,
    member: {
      name: "Catherina Vallencia",
      nickname: "Erine",
      url: "erine",
      is_graduate: false,
      is_official: true,
      img: "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
    },
    idn: {
      id: "showroom_erine",
      username: "jkt48_erine",
      slug: "showroom-live",
      title: "Live Showroom Erine",
      image: "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
    },
    live_info: {
      duration: 3720000,
      viewers: { num: 6520, is_excitement: false },
      date: {
        start: "2026-08-30T13:30:00.000Z",
        end: "2026-08-30T14:32:00.000Z",
      },
    },
  },
];

function isErine(item: any): boolean {
  const n = (
    item.member?.name ||
    item.member?.nickname ||
    item.idn?.username ||
    item.title ||
    ""
  ).toLowerCase();
  return (
    n.includes("erine") ||
    n.includes("catherina") ||
    n.includes("vallencia") ||
    item.member?.url === "erine"
  );
}

export async function GET() {
  try {
    const data = await fetchWithCacheAndFallback<any[]>({
      key: "erine_riwayat_live",
      ttlSeconds: 600, // Cache 10 menit
      fetcher: async () => {
        // Recent sessions (api.jkt48connect.app), newest first; Erine filtered locally
        const json = await jkt48ConnectGet(
          "/api/recent",
          { page: 1, perpage: 100, group: "jkt48", type: "all", sort: "date", order: -1, search: "Erine" },
          { revalidate: 600, timeoutMs: 8000 }
        );
        if (json === null) throw new Error("JKT48Connect recent tidak tersedia");
        const rawList = pickList(json, "recents", "data");
        const erineItems = rawList.filter(isErine);

        return erineItems.length > 0 ? erineItems : DEFAULT_ERINE_LIVES;
      },
      fallbackData: DEFAULT_ERINE_LIVES,
    });

    return NextResponse.json({ success: true, data: data || DEFAULT_ERINE_LIVES }, { headers: API_CACHE_HEADERS });
  } catch (error) {
    console.error("Recent API Error:", error);
    return NextResponse.json({ success: true, data: DEFAULT_ERINE_LIVES }, { headers: API_CACHE_HEADERS });
  }
}
