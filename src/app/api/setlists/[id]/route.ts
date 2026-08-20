import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code, title, subtitle, cover_image, image_url, status, release_date, date_range, description, song_count, songs, songs_json, sort_order, is_active } = body;

    const img = cover_image || image_url || "";
    const dateRange = release_date || date_range || "";
    const songsData = typeof songs === "string" ? songs : JSON.stringify(songs_json || songs || []);

    if (isMySqlConfigured()) {
      await query(
        "UPDATE `setlists` SET `code`=?, `title`=?, `subtitle`=?, `cover_image`=?, `status`=?, `release_date`=?, `description`=?, `song_count`=?, `songs_json`=?, `sort_order`=?, `is_active`=? WHERE `id`=?",
        [code || "", title || "", subtitle || "", img, status || "", dateRange, description || "", song_count || 0, songsData, sort_order || 0, is_active ? 1 : 0, id]
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
      await query("DELETE FROM `setlists` WHERE `id`=?", [id]);
    }
    return NextResponse.json({ status: true, success: true, message: "Deleted" });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
