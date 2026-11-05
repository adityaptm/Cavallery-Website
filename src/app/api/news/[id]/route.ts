import { NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";
import { revalidatePath } from "next/cache";
import { invalidateApiCache } from "@/lib/apiCache";
import { formatSlug, formatSqlDatetime } from "../route";

const NO_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
};

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();

    if (isMySqlConfigured()) {
      const rows = await query<any[]>(
        "SELECT * FROM `news` WHERE `id`=? OR LOWER(`slug`)=LOWER(?) OR `slug`=? LIMIT 1",
        [cleanId, cleanId, cleanId]
      );
      if (rows && rows.length > 0) {
        return NextResponse.json(
          { status: true, success: true, data: rows[0] },
          { headers: NO_CACHE_HEADERS }
        );
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
    const cleanId = decodeURIComponent(id).trim();
    const body = await request.json();

    if (!isMySqlConfigured()) return NextResponse.json({ status: false, message: "MySQL not configured" }, { status: 500 });

    const slug = formatSlug(body.slug, body.title || `news-${cleanId}`);
    const pubDate = formatSqlDatetime(body.published_at);

    await query(
      "UPDATE `news` SET `title`=?, `slug`=?, `summary`=?, `content`=?, `image_url`=?, `author`=?, `category`=?, `published_at`=?, `is_active`=? WHERE `id`=? OR LOWER(`slug`)=LOWER(?) OR `slug`=?",
      [
        body.title || "",
        slug,
        body.description || body.summary || "",
        body.content || body.description || "",
        body.image_url || "",
        body.author || "Cavallery Staff",
        body.label || body.category || "Statement",
        pubDate,
        body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
        cleanId,
        cleanId,
        cleanId
      ]
    );

    // Invalidate caches immediately for realtime updates
    invalidateApiCache("cavallery_fanbase_news");
    invalidateApiCache("jkt48_official_news");

    try {
      revalidatePath("/news");
      revalidatePath(`/news/cavallery-statement/${slug}`);
      revalidatePath("/news/cavallery-statement/[slug]", "page");
    } catch {}

    return NextResponse.json(
      { status: true, success: true, slug, message: "News berhasil diupdate" },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id).trim();

    if (!isMySqlConfigured()) return NextResponse.json({ status: false, message: "MySQL not configured" }, { status: 500 });

    await query("DELETE FROM `news` WHERE `id`=? OR LOWER(`slug`)=LOWER(?) OR `slug`=?", [cleanId, cleanId, cleanId]);

    // Invalidate caches immediately
    invalidateApiCache("cavallery_fanbase_news");
    invalidateApiCache("jkt48_official_news");

    try {
      revalidatePath("/news");
      revalidatePath("/news/cavallery-statement/[slug]", "page");
    } catch {}

    return NextResponse.json(
      { status: true, success: true, message: "News berhasil dihapus" },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json({ status: false, success: false, message: error.message }, { status: 500 });
  }
}
