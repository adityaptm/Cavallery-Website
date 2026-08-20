import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function GET() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `youtube` ORDER BY `sort_order` ASC, `id` DESC");
      return NextResponse.json({ status: true, success: true, data: rows || [] });
    }
    return NextResponse.json({ status: true, success: true, data: [] });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { title, video_id, url, thumbnail, published_at, is_active, sort_order } = body;

    if (!video_id && url) {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (match) video_id = match[1];
    }
    if (!thumbnail && video_id) {
      thumbnail = `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`;
    }

    if (isMySqlConfigured()) {
      const res = await query<any>(
        "INSERT INTO `youtube` (`title`, `video_id`, `url`, `thumbnail`, `published_at`, `is_active`, `sort_order`) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [title || "", video_id || "", url || "", thumbnail || "", published_at || "", is_active ? 1 : 0, sort_order || 0]
      );
      return NextResponse.json({ status: true, success: true, data: { id: res.insertId, ...body } });
    }
    return NextResponse.json({ status: true, success: true, data: body });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
