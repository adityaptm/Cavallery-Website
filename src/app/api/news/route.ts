import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";
import { API_CACHE_HEADERS, fetchWithCacheAndFallback } from "@/lib/apiCache";

import { jkt48ConnectGet, pickList } from "@/lib/jkt48connect";
const CAVA_NEWS_URL = "https://v5.jkt48connect.com/api/cavallery/news?apikey=JKTCONNECT";

// Judul berita JKT48 official yang disembunyikan dari tampilan (dikelola admin)
const BLOCKED_NEWS_TITLE_KEYWORDS = [
  "Birthday 2-Shot Online bulan Agustus",
  "Graduation 2-Shot Online Cathleen Nixie",
  "JKT48 Vocal Project",
  "REVOICE",
  "Pertunjukan Teater Kelulusan",
  "Pengunduran Diri Gendis Mayrannisa",
  "Berakhirnya Operasional Proyek JKT48 Virtual",
  "Birthday 2-Shot Online dengan Chekicha",
  "Pre-Order JKT48 Digital Photobook",
  "Birthday 2-Shot Online bulan Juli",
  "FUN ON BOARD #3",
];

function isBlockedNews(title: string): boolean {
  const t = title.toLowerCase();
  return BLOCKED_NEWS_TITLE_KEYWORDS.some((kw) => t.includes(kw.toLowerCase()));
}

async function fetchJkt48OfficialNews(): Promise<any[]> {
  return fetchWithCacheAndFallback<any[]>({
    key: "jkt48_official_news",
    ttlSeconds: 120,
    fetcher: async () => {
      // Official JKT48 news (api.jkt48connect.app)
      const json = await jkt48ConnectGet("/api/news", { page: 1, perpage: 30 }, { revalidate: 180, timeoutMs: 5000 });
      const list = pickList(json, "news", "data");
      return list
        .filter((n: any) => !isBlockedNews(n.title || ""))
        .map((n: any) => ({
          id: String(n.id || n._id || Math.random()),
          title: n.title || "",
          label: n.category || "Official JKT48",
          category: n.category || "Official JKT48",
          date: n.date || n.published_at || new Date().toISOString(),
          published_at: n.date || n.published_at || new Date().toISOString(),
          link_url: n.url || (n.id ? `https://jkt48.com/news/detail/id/${n.id}?lang=id` : "#"),
          url: n.url || (n.id ? `https://jkt48.com/news/detail/id/${n.id}?lang=id` : "#"),
          image_url: n.background_image || n.image_url || "/images/cava-logo.jpg",
          background_image: n.background_image || n.image_url || "/images/cava-logo.jpg",
          description: n.summary || n.description || "",
          is_pinned: false,
          is_active: true,
          is_internal: false,
        }));
    },
    fallbackData: [],
  });
}

async function fetchCavalleryFanbaseNews(): Promise<any[]> {
  return fetchWithCacheAndFallback<any[]>({
    key: "cavallery_fanbase_news",
    ttlSeconds: 120,
    fetcher: async () => {
      const res = await fetch(CAVA_NEWS_URL, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 CavalleryApp/1.0",
        },
        next: { revalidate: 180 },
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status && Array.isArray(json.data?.news)) {
          return json.data.news;
        }
      }
      return [];
    },
    fallbackData: [],
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || searchParams.get("category");

    let dbNews: any[] = [];
    if (type !== "jkt48") {
      if (isMySqlConfigured()) {
        try {
          const rows = await query<any[]>("SELECT * FROM `news` ORDER BY `published_at` DESC, `id` DESC");
          if (rows && Array.isArray(rows) && rows.length > 0) {
            dbNews = rows.map((r) => ({
              id: String(r.id),
              slug: r.slug || `statement-${r.id}`,
              title: r.title || "",
              label: r.category || r.label || "Statement",
              category: r.category || r.label || "Statement",
              date: r.published_at ? new Date(r.published_at).toISOString() : new Date().toISOString(),
              published_at: r.published_at ? new Date(r.published_at).toISOString() : new Date().toISOString(),
              description: r.summary || r.description || r.content?.slice(0, 140) || "",
              content: r.content || "",
              image_url: r.image_url || "/images/cava-logo.jpg",
              background_image: r.image_url || "/images/cava-logo.jpg",
              link_url: `/news/cavallery-statement/${r.slug || r.id}`,
              url: `/news/cavallery-statement/${r.slug || r.id}`,
              is_pinned: Boolean(r.is_pinned),
              is_active: r.is_active !== undefined ? Boolean(r.is_active) : true,
              is_internal: true,
            }));
          }
        } catch (e) {
          console.error("DB news fetch error:", e);
        }
      }

      // If dbNews is empty, try external Cavallery news
      if (dbNews.length === 0) {
        const extCava = await fetchCavalleryFanbaseNews();
        if (extCava.length > 0) {
          dbNews = extCava.map((n: any) => ({
            ...n,
            label: n.label || n.category || "Statement",
            category: n.category || n.label || "Statement",
            date: n.published_at || n.date || new Date().toISOString(),
            published_at: n.published_at || n.date || new Date().toISOString(),
            link_url: n.link_url || `/news/cavallery-statement/${n.slug || n.id}`,
            url: n.link_url || `/news/cavallery-statement/${n.slug || n.id}`,
            image_url: n.image_url || "/images/cava-logo.jpg",
            background_image: n.image_url || "/images/cava-logo.jpg",
            is_internal: true,
          }));
        }
      }
    }

    if (type === "cavallery") {
      return NextResponse.json(
        {
          status: true,
          success: true,
          data: { news: dbNews },
        },
        { headers: API_CACHE_HEADERS }
      );
    }

    const officialNews = await fetchJkt48OfficialNews();

    if (type === "jkt48") {
      return NextResponse.json(
        {
          status: true,
          success: true,
          data: { news: officialNews },
        },
        { headers: API_CACHE_HEADERS }
      );
    }

    // Merge: Pinned Cavallery news first, then official JKT48 news, sorted by date
    const merged = [...dbNews, ...officialNews];

    return NextResponse.json(
      {
        status: true,
        success: true,
        data: { news: merged },
      },
      { headers: API_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("News API Error:", error);
    const officialNews = await fetchJkt48OfficialNews();
    return NextResponse.json(
      {
        status: true,
        success: true,
        data: { news: officialNews },
      },
      { headers: API_CACHE_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isMySqlConfigured()) return NextResponse.json({ status: false, message: "MySQL not configured" }, { status: 500 });

    const result: any = await query(
      "INSERT INTO `news` (`title`, `slug`, `summary`, `content`, `image_url`, `author`, `category`, `published_at`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        body.title || "",
        body.slug || `news-${Date.now()}`,
        body.description || body.summary || "",
        body.content || body.description || "",
        body.image_url || "",
        body.author || "Cavallery",
        body.label || body.category || "Statement",
        body.published_at || new Date().toISOString(),
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
      ]
    );
    return NextResponse.json({ status: true, success: true, id: result.insertId, message: "News berhasil ditambahkan" });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
