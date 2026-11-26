import { NextRequest, NextResponse } from "next/server";
import { getGameStats, RANKED_GAMES } from "@/lib/gamesDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const game = searchParams.get("game") || "anterine-ke-theater";

    const gameInfo = RANKED_GAMES[game] || {
      slug: game,
      title: game.replace(/-/g, " ").toUpperCase(),
      category: "Arcade",
      is_ranked: true,
      max_score_limit: 500000,
    };

    const stats = await getGameStats(game);

    return NextResponse.json({
      success: true,
      game: gameInfo.slug,
      title: gameInfo.title,
      stats,
    });
  } catch (error: any) {
    console.error("[GET /api/stats error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal mengambil statistik game." },
      { status: 500 }
    );
  }
}
