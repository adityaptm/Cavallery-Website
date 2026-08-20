import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function GET() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `merch` ORDER BY `sort_order` ASC, `id` DESC");
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
    const { title, slug, price, original_price, discount_percent, description, image_url, gallery_json, category, status, shopee_url, tokopedia_url, is_featured, is_active, sort_order } = body;

    const merchSlug = slug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `merch-${Date.now()}`);

    if (isMySqlConfigured()) {
      const res = await query<any>(
        "INSERT INTO `merch` (`title`, `slug`, `price`, `original_price`, `discount_percent`, `description`, `image_url`, `gallery_json`, `category`, `status`, `shopee_url`, `tokopedia_url`, `is_featured`, `is_active`, `sort_order`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [title || "", merchSlug, price || 0, original_price || 0, discount_percent || 0, description || "", image_url || "", gallery_json || "[]", category || "", status || "available", shopee_url || "", tokopedia_url || "", is_featured ? 1 : 0, is_active !== false ? 1 : 0, sort_order || 0]
      );
      return NextResponse.json({ status: true, success: true, data: { id: res.insertId, ...body } });
    }
    return NextResponse.json({ status: true, success: true, data: body });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
