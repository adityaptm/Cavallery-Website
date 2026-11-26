import { NextRequest, NextResponse } from "next/server";
import {
  getGameLeaderboard,
  getGameStats,
  savePlayerScore,
  validatePlayerName,
  checkRateLimit,
} from "@/lib/gamesDb";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const stats = await getGameStats(slug);
    const rawLeaderboard = await getGameLeaderboard(slug, 10);

    // Map agar cocok dengan format frontend lama & baru
    const leaderboard = rawLeaderboard.map((item) => ({
      rank: item.rank,
      username: item.player_name,
      player_name: item.player_name,
      score: item.score,
      played_at: item.created_at,
      created_at: item.created_at,
      device_id: item.device_id,
    }));

    return NextResponse.json({
      status: true,
      success: true,
      slug,
      stats,
      leaderboard,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: false, message: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown-ip";

    const body = await req.json().catch(() => ({}));
    const rawName = (body.username || body.name || body.playerName || body.player_name || "Pemain").trim();
    const score = parseInt(String(body.score), 10);
    const duration = parseInt(String(body.duration_seconds || body.duration || "0"), 10) || 0;
    const deviceId = String(body.device_id || body.playerId || body.player_id || "web-player").trim();

    // Rate limiting
    if (!checkRateLimit(`${ip}_${deviceId}_${slug}`, 10, 60000)) {
      return NextResponse.json(
        { status: false, message: "Terlalu banyak permintaan submit skor. Tunggu sebentar." },
        { status: 429 }
      );
    }

    const nameValidation = validatePlayerName(rawName);
    const finalName = nameValidation.valid ? nameValidation.cleanName : "Pemain";

    if (isNaN(score) || score < 0) {
      return NextResponse.json(
        { status: false, message: "Score harus berupa angka positif" },
        { status: 400 }
      );
    }

    const saveResult = await savePlayerScore({
      game_slug: slug,
      player_name: finalName,
      device_id: deviceId,
      score,
      duration_seconds: duration,
    });

    return NextResponse.json({
      status: true,
      success: true,
      message: `Skor ${score} untuk "${finalName}" berhasil disimpan!`,
      data: {
        id: saveResult.id,
        game_id: slug,
        username: finalName,
        score,
        played_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: false, message: error?.message || "Internal error" },
      { status: 500 }
    );
  }
}
