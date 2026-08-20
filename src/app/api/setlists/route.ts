import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function GET() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `setlists` ORDER BY `sort_order` ASC, `id` DESC");
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
    const { code, title, subtitle, cover_image, image_url, status, release_date, date_range, description, song_count, songs, songs_json, sort_order, is_active } = body;

    const img = cover_image || image_url || "";
    const dateRange = release_date || date_range || "";
    const songsData = typeof songs === "string" ? songs : JSON.stringify(songs_json || songs || []);

    if (isMySqlConfigured()) {
      const res = await query<any>(
        "INSERT INTO `setlists` (`code`, `title`, `subtitle`, `cover_image`, `status`, `release_date`, `description`, `song_count`, `songs_json`, `sort_order`, `is_active`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [code || "", title || "", subtitle || "", img, status || "", dateRange, description || "", song_count || 0, songsData, sort_order || 0, is_active ? 1 : 0]
      );
      return NextResponse.json({ status: true, success: true, data: { id: res.insertId, ...body } });
    }
    return NextResponse.json({ status: true, success: true, data: body });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
