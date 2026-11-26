import { NextRequest, NextResponse } from "next/server";
import { getGameLeaderboard, RANKED_GAMES } from "@/lib/gamesDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const game = searchParams.get("game") || "anterine-ke-theater";
    const limitParam = parseInt(searchParams.get("limit") || "10", 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 10 : limitParam), 50);

    const gameInfo = RANKED_GAMES[game] || {
      slug: game,
      title: game.replace(/-/g, " ").toUpperCase(),
      category: "Arcade",
      is_ranked: true,
      max_score_limit: 500000,
    };

    const leaderboard = await getGameLeaderboard(game, limit);

    return NextResponse.json({
      success: true,
      game: gameInfo.slug,
      title: gameInfo.title,
      leaderboard,
    });
  } catch (error: any) {
    console.error("[GET /api/leaderboard error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal mengambil data leaderboard." },
      { status: 500 }
    );
  }
}
