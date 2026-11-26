import { NextRequest, NextResponse } from "next/server";
import { getPlayerRank } from "@/lib/gamesDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const game = searchParams.get("game") || "anterine-ke-theater";
    const deviceId = searchParams.get("device_id") || "";

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: "Parameter device_id diperlukan." },
        { status: 400 }
      );
    }

    const rankResult = await getPlayerRank(game, deviceId);

    return NextResponse.json({
      success: true,
      game,
      device_id: deviceId,
      ...rankResult,
    });
  } catch (error: any) {
    console.error("[GET /api/rank error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal menghitung peringkat pemain." },
      { status: 500 }
    );
  }
}
