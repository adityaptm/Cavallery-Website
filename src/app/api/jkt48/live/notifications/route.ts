import { NextRequest, NextResponse } from "next/server";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";

export async function GET(req: NextRequest) {
  try {
    if (!isJkt48ApiKeyConfigured()) {
      return NextResponse.json(
        { success: false, error: "JKT48CONNECT_API_KEY belum dikonfigurasi.", data: { lives: [] } },
        { status: 503 }
      );
    }

    // Cache: 15-30 detik (20 detik)
    const rawData = await jkt48Fetch<any>(
      "/api/live-notifications",
      {},
      { revalidate: 20 }
    );

    const livesList = Array.isArray(rawData?.lives)
      ? rawData.lives
      : Array.isArray(rawData)
      ? rawData
      : [];

    return NextResponse.json({
      success: true,
      data: {
        lives: livesList,
      },
    });
  } catch (error: any) {
    const status = error instanceof Jkt48ApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat notifikasi live.",
      },
      { status }
    );
  }
}
