import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function GET() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `kabesha` ORDER BY `sort_order` ASC, `id` DESC");
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
    const { title, era, year_label, image_url, is_current, sort_order, is_active } = body;
    const eraLabel = era || year_label || "";

    if (isMySqlConfigured()) {
      const res = await query<any>(
        "INSERT INTO `kabesha` (`title`, `era`, `image_url`, `is_current`, `sort_order`, `is_active`) VALUES (?, ?, ?, ?, ?, ?)",
        [title || "", eraLabel, image_url || "", is_current ? 1 : 0, sort_order || 0, is_active ? 1 : 0]
      );
      return NextResponse.json({ status: true, success: true, data: { id: res.insertId, ...body } });
    }
    return NextResponse.json({ status: true, success: true, data: body });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
