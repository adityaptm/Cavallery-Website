import { NextRequest, NextResponse } from "next/server";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim() || "";

    if (!id || !/^[a-zA-Z0-9_\-\.]+$/.test(id)) {
      return NextResponse.json(
        { success: false, error: "Parameter ID siaran (DATA_ID) tidak valid." },
        { status: 400 }
      );
    }

    if (!isJkt48ApiKeyConfigured()) {
      return NextResponse.json(
        { success: false, error: "JKT48CONNECT_API_KEY belum dikonfigurasi.", data: null },
        { status: 503 }
      );
    }

    // Ambil recent gifts & stagelist secara paralel
    const [giftsRes, stagelistRes] = await Promise.allSettled([
      jkt48Fetch<any>(`/api/recent/${encodeURIComponent(id)}/gifts`, {}, { revalidate: 60 }),
      jkt48Fetch<any>(`/api/recent/${encodeURIComponent(id)}/stagelist`, {}, { revalidate: 60 }),
    ]);

    const giftsData = giftsRes.status === "fulfilled" ? giftsRes.value : null;
    const stagelistData = stagelistRes.status === "fulfilled" ? stagelistRes.value : null;

    return NextResponse.json({
      success: true,
      data: {
        id,
        gifts: giftsData?.gifts || giftsData || [],
        stagelist: stagelistData?.stagelist || stagelistData || [],
        leaderboard_designs: giftsData?.leaderboard_designs || stagelistData?.leaderboard_designs,
        live_info: giftsData?.live_info || stagelistData?.live_info,
      },
    });
  } catch (error: any) {
    const status = error instanceof Jkt48ApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat rekap live.",
      },
      { status }
    );
  }
}
