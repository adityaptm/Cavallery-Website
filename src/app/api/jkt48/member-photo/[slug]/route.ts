import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (!cleanSlug) {
      return new NextResponse("Invalid member slug", { status: 400 });
    }

    const targetUrl = `https://jkt48.com/api/v1/storages/media/jkt48-member/${cleanSlug}.jpg`;
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      next: { revalidate: 86400 * 7 }, // Cache 7 days
    });

    if (!res.ok) {
      // Fallback: jika tidak ada dengan full name, coba cari avatar Erine
      const fallbackRes = await fetch("https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg");
      const fallbackBuf = await fallbackRes.arrayBuffer();
      return new NextResponse(fallbackBuf, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const imageBuf = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new NextResponse(imageBuf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    return new NextResponse("Image not found", { status: 404 });
  }
}
