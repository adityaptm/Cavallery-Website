import { NextRequest, NextResponse } from "next/server";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platform = (searchParams.get("platform") || "showroom").toLowerCase();
    const id = searchParams.get("id")?.trim() || "";

    if (!id || !/^[a-zA-Z0-9_\-\.]+$/.test(id)) {
      return NextResponse.json(
        { success: false, error: "Parameter ID room / live tidak valid." },
        { status: 400 }
      );
    }

    if (!isJkt48ApiKeyConfigured()) {
      return NextResponse.json(
        { success: false, error: "JKT48CONNECT_API_KEY belum dikonfigurasi.", data: [] },
        { status: 503 }
      );
    }

    const endpoint =
      platform === "idn"
        ? `/api/idn-comments/${encodeURIComponent(id)}`
        : `/api/showroom-comments/${encodeURIComponent(id)}`;

    // Revalidate 10-15 detik
    const data = await jkt48Fetch<any>(endpoint, {}, { revalidate: 10, timeoutMs: 6000 });
    const comments = Array.isArray(data) ? data : Array.isArray(data?.comments) ? data.comments : [];

    return NextResponse.json({
      success: true,
      data: comments,
    });
  } catch (error: any) {
    const status = error instanceof Jkt48ApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat komentar live.",
      },
      { status }
    );
  }
}
