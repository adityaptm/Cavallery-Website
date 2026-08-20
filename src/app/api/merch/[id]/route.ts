import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, slug, price, original_price, discount_percent, description, image_url, gallery_json, category, status, shopee_url, tokopedia_url, is_featured, is_active, sort_order } = body;

    const merchSlug = slug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `merch-${Date.now()}`);

    if (isMySqlConfigured()) {
      await query(
        "UPDATE `merch` SET `title`=?, `slug`=?, `price`=?, `original_price`=?, `discount_percent`=?, `description`=?, `image_url`=?, `gallery_json`=?, `category`=?, `status`=?, `shopee_url`=?, `tokopedia_url`=?, `is_featured`=?, `is_active`=?, `sort_order`=? WHERE `id`=? OR `slug`=?",
        [title || "", merchSlug, price || 0, original_price || 0, discount_percent || 0, description || "", image_url || "", gallery_json || "[]", category || "", status || "available", shopee_url || "", tokopedia_url || "", is_featured ? 1 : 0, is_active !== false ? 1 : 0, sort_order || 0, id, id]
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
      await query("DELETE FROM `merch` WHERE `id`=? OR `slug`=?", [id, id]);
    }
    return NextResponse.json({ status: true, success: true, message: "Deleted" });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
