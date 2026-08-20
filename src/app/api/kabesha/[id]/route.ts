import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, era, year_label, image_url, is_current, sort_order, is_active } = body;
    const eraLabel = era || year_label || "";

    if (isMySqlConfigured()) {
      await query(
        "UPDATE `kabesha` SET `title`=?, `era`=?, `image_url`=?, `is_current`=?, `sort_order`=?, `is_active`=? WHERE `id`=?",
        [title || "", eraLabel, image_url || "", is_current ? 1 : 0, sort_order || 0, is_active ? 1 : 0, id]
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
      await query("DELETE FROM `kabesha` WHERE `id`=?", [id]);
    }
    return NextResponse.json({ status: true, success: true, message: "Deleted" });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
