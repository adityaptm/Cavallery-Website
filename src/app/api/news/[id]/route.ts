import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `news` WHERE `id`=? OR `slug`=? LIMIT 1", [id, id]);
      if (rows && rows.length > 0) {
        return NextResponse.json({ status: true, success: true, data: rows[0] });
      }
    }
    return NextResponse.json({ status: false, success: false, message: "News not found" }, { status: 404 });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, slug, summary, description, content, image_url, author, category, label, tags, is_active, published_at } = body;

    const newsSlug = slug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `news-${Date.now()}`);
    const newsSummary = summary || description || "";
    const newsCategory = category || label || "General";
    const pubDate = published_at ? new Date(published_at) : new Date();

    if (isMySqlConfigured()) {
      await query(
        "UPDATE `news` SET `title`=?, `slug`=?, `summary`=?, `content`=?, `image_url`=?, `author`=?, `category`=?, `tags`=?, `is_active`=?, `published_at`=? WHERE `id`=? OR `slug`=?",
        [title || "", newsSlug, newsSummary, content || "", image_url || "", author || "Cavallery", newsCategory, tags || "", is_active !== false ? 1 : 0, pubDate, id, id]
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
      await query("DELETE FROM `news` WHERE `id`=? OR `slug`=?", [id, id]);
    }
    return NextResponse.json({ status: true, success: true, message: "Deleted" });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
