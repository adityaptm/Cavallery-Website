import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { year, date_label, title, description, badge, image_url, sort_order, is_active } = body;

    if (isMySqlConfigured()) {
      await query(
        "UPDATE `timeline` SET `year`=?, `date_label`=?, `title`=?, `description`=?, `badge`=?, `image_url`=?, `sort_order`=?, `is_active`=? WHERE `id`=?",
        [year || "", date_label || "", title || "", description || "", badge || "", image_url || "", sort_order || 0, is_active ? 1 : 0, id]
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
      await query("DELETE FROM `timeline` WHERE `id`=?", [id]);
    }
    return NextResponse.json({ status: true, success: true, message: "Deleted" });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
