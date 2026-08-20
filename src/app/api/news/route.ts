import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";

export async function GET() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `news` ORDER BY `published_at` DESC, `id` DESC");
      if (rows && rows.length > 0) {
        return NextResponse.json({ status: true, success: true, data: rows });
      }
    }
    // Fallback if empty in MySQL
    return NextResponse.json({ status: true, success: true, data: [] });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, slug, summary, description, content, image_url, author, category, label, tags, is_active, published_at } = body;

    const newsSlug = slug || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `news-${Date.now()}`);
    const newsSummary = summary || description || "";
    const newsCategory = category || label || "General";
    const pubDate = published_at ? new Date(published_at) : new Date();

    if (isMySqlConfigured()) {
      const res = await query<any>(
        "INSERT INTO `news` (`title`, `slug`, `summary`, `content`, `image_url`, `author`, `category`, `tags`, `is_active`, `published_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [title || "", newsSlug, newsSummary, content || "", image_url || "", author || "Cavallery", newsCategory, tags || "", is_active !== false ? 1 : 0, pubDate]
      );
      return NextResponse.json({ status: true, success: true, data: { id: res.insertId, ...body } });
    }
    return NextResponse.json({ status: true, success: true, data: body });
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
