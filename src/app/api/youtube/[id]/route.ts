import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
      await query(
        "UPDATE `youtube` SET `title`=?, `video_id`=?, `url`=?, `thumbnail`=?, `published_at`=?, `is_active`=?, `sort_order`=? WHERE `id`=? OR `video_id`=?",
        [title || "", video_id || "", url || "", thumbnail || "", published_at || "", is_active ? 1 : 0, sort_order || 0, id, id]
      );
    }
    return NextResponse.json({ status: true, success: true, data: { id, ...body } });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (isMySqlConfigured()) {
      await query("DELETE FROM `youtube` WHERE `id`=? OR `video_id`=?", [id, id]);
    }
    return NextResponse.json({ status: true, success: true, message: "Deleted" });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
