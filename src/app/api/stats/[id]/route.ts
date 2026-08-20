import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { stat_key, label, value, icon, sort_order } = body;

    if (isMySqlConfigured()) {
      await query(
        "UPDATE `stats` SET `label`=?, `value`=?, `icon`=?, `sort_order`=? WHERE `id`=? OR `stat_key`=?",
        [label || "", String(value || "0"), icon || "", sort_order || 0, id, id]
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
      await query("DELETE FROM `stats` WHERE `id`=? OR `stat_key`=?", [id, id]);
    }
    return NextResponse.json({ status: true, success: true, message: "Deleted" });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
