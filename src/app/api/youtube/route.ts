import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";
import { fetchWithCacheAndFallback } from "@/lib/apiCache";
import { jkt48ConnectGet, pickList, type JkcYoutubeVideo } from "@/lib/jkt48connect";

/** Latest videos from the official JKT48 channels (api.jkt48connect.app). */
interface YoutubeRow {
  id: string;
  title: string;
  video_id: string;
  url: string;
  thumbnail: string;
  published_at: string | null;
  sort_order: number;
  is_active: number;
}

async function fetchOfficialYoutube(): Promise<YoutubeRow[]> {
  return fetchWithCacheAndFallback<YoutubeRow[]>({
    key: "jkc_jkt48_youtube",
    ttlSeconds: 1800,
    fetcher: async () => {
      const json = await jkt48ConnectGet("/api/jkt48_youtube", {}, { revalidate: 1800 });
      return pickList<JkcYoutubeVideo>(json, "videos", "data")
        .filter((v) => v?.id)
        .slice(0, 12)
        .map((v, i) => ({
          id: `yt-${v.id}`,
          title: v.title || "",
          video_id: String(v.id),
          url: v.url || `https://www.youtube.com/watch?v=${v.id}`,
          thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
          published_at: v.date || null,
          sort_order: i,
          is_active: 1,
        }));
    },
    fallbackData: [],
  });
}

export async function GET() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `youtube` ORDER BY `sort_order` ASC, `id` DESC");
      if (rows && rows.length > 0) {
        return NextResponse.json({ status: true, success: true, data: { videos: rows } });
      }
    }
    // No curated videos yet → latest official JKT48 uploads
    const videos = await fetchOfficialYoutube();
    return NextResponse.json({ status: true, success: true, data: { videos } });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message, data: { videos: [] } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isMySqlConfigured()) return NextResponse.json({ status: false, message: "MySQL not configured" }, { status: 500 });

    let videoId = body.video_id || "";
    if (!videoId && body.url) {
      const match = body.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match) videoId = match[1];
    }
    const thumbnail = body.thumbnail || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");

    const result: any = await query(
      "INSERT INTO `youtube` (`title`, `video_id`, `url`, `thumbnail`, `published_at`, `sort_order`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        body.title || "",
        videoId,
        body.url || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ""),
        thumbnail,
        body.published_at || new Date().toISOString(),
        Number(body.sort_order) || 0,
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1
      ]
    );
    return NextResponse.json({ status: true, success: true, id: result.insertId, message: "Video YouTube berhasil ditambahkan" });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
