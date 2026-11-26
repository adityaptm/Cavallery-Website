import { NextRequest, NextResponse } from "next/server";
import {
  savePlayerScore,
  validatePlayerName,
  checkRateLimit,
  RANKED_GAMES,
} from "@/lib/gamesDb";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown-ip";

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Format request body tidak valid." },
        { status: 400 }
      );
    }

    const { game_slug, player_name, device_id, score, duration_seconds } = body;

    // 1. Validasi Game Slug
    const game = RANKED_GAMES[game_slug];
    if (!game || !game.is_ranked) {
      return NextResponse.json(
        { success: false, error: `Game "${game_slug}" tidak terdaftar atau tidak memiliki mode ranking.` },
        { status: 400 }
      );
    }

    // 2. Validasi Device ID
    const cleanDeviceId = String(device_id || "").trim();
    if (!cleanDeviceId || cleanDeviceId.length < 8) {
      return NextResponse.json(
        { success: false, error: "Device ID tidak valid." },
        { status: 400 }
      );
    }

    // Rate Limiting: 10 submit / menit per IP & Device
    const rateLimitKey = `${ip}_${cleanDeviceId}_${game_slug}`;
    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      return NextResponse.json(
        { success: false, error: "Terlalu banyak permintaan submit skor. Tunggu sebentar sebelum mencoba lagi." },
        { status: 429 }
      );
    }

    // 3. Validasi Player Name
    const nameValidation = validatePlayerName(player_name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { success: false, error: nameValidation.error },
        { status: 400 }
      );
    }

    // 4. Validasi Skor & Durasi
    const numScore = parseInt(String(score), 10);
    const numDuration = Math.max(0, parseInt(String(duration_seconds || 0), 10));

    if (isNaN(numScore) || numScore < 0) {
      return NextResponse.json(
        { success: false, error: "Skor harus berupa angka positif." },
        { status: 400 }
      );
    }

    if (numScore > game.max_score_limit) {
      return NextResponse.json(
        { success: false, error: `Skor melebihi batas wajar (${game.max_score_limit}).` },
        { status: 400 }
      );
    }

    // Deteksi skor mustahil: misalnya skor > 2000 tapi durasi < 3 detik
    if (numScore > 2000 && numDuration < 3) {
      return NextResponse.json(
        { success: false, error: "Durasi permainan tidak wajar untuk perolehan skor ini." },
        { status: 400 }
      );
    }

    // 5. Simpan ke Database
    const result = await savePlayerScore({
      game_slug,
      player_name: nameValidation.cleanName,
      device_id: cleanDeviceId,
      score: numScore,
      duration_seconds: numDuration,
    });

    return NextResponse.json({
      success: true,
      message: `Skor ${numScore} untuk ${nameValidation.cleanName} berhasil disimpan!`,
      data: {
        id: result.id,
        game_slug,
        player_name: nameValidation.cleanName,
        score: numScore,
      },
    });
  } catch (error: any) {
    console.error("[POST /api/scores error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Terjadi kesalahan internal server." },
      { status: 500 }
    );
  }
}
