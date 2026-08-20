import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function GET() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `stats` ORDER BY `sort_order` ASC, `id` ASC");
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
    const { stat_key, label, value, icon, sort_order } = body;

    if (isMySqlConfigured()) {
      const res = await query<any>(
        "INSERT INTO `stats` (`stat_key`, `label`, `value`, `icon`, `sort_order`) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `label`=VALUES(`label`), `value`=VALUES(`value`), `icon`=VALUES(`icon`), `sort_order`=VALUES(`sort_order`)",
        [stat_key || "", label || "", String(value || "0"), icon || "", sort_order || 0]
      );
      return NextResponse.json({ status: true, success: true, data: { id: res.insertId, ...body } });
    }
    return NextResponse.json({ status: true, success: true, data: body });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
