import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { jkt48Fetch, isJkt48ApiKeyConfigured } from "@/lib/jkt48";
import type { Jkt48Recording } from "@/types/jkt48";

function getMasterShows(): any[] {
  try {
    const masterPath = path.join(process.cwd(), "src", "data", "theater_shows_master.json");
    if (fs.existsSync(masterPath)) {
      const content = fs.readFileSync(masterPath, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {
    console.warn("Could not read master shows:", e);
  }
  return [];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedId = decodeURIComponent(id);

    // 1. Cari data dasar show dari master database
    const masterShows = getMasterShows();
    const show = masterShows.find((s) => {
      const matchId = String(s.id) === decodedId || String(s.schedule_id) === decodedId;
      const matchKey = `${(s.title || "").trim().toLowerCase()}-${String(s.date || "").slice(0, 10)}`;
      return matchId || matchKey === decodedId.toLowerCase();
    }) || null;

    let recordings: Jkt48Recording[] = [];
    let screenshots: string[] = [];
    let leaderboardBanner: { status: string; url?: string } | null = null;
    let liveDetail: any = null;

    // 2. Jika API Key terkonfigurasi, coba ambil data rekaman dan screenshot dari JKT48 Connect
    if (isJkt48ApiKeyConfigured()) {
      try {
        // Ambil rekaman teater
        const recData = await jkt48Fetch<any>("/api/theater/recordings", {}, { revalidate: 600 });
        const list = Array.isArray(recData?.recordings) ? recData.recordings : [];

        recordings = list
          .filter((item: any) => item.status === "uploaded" && (item.youtube_url || item.stream_url))
          .map((item: any) => ({
            id: String(item.id || item.schedule_id || ""),
            title: item.title || show?.title || "Rekaman Show",
            status: item.status,
            youtube_url: item.youtube_url,
            stream_url: item.stream_url,
            date: item.date || item.created_at,
          }));
      } catch (err) {
        console.warn("[JKT48 Detail] Recordings fetch warning:", err);
      }

      // Coba ambil screenshots galeri
      try {
        const screenData = await jkt48Fetch<any>(`/api/screenshots/${encodeURIComponent(decodedId)}`, {}, { revalidate: 600 });
        if (Array.isArray(screenData?.screenshots)) {
          screenshots = screenData.screenshots;
        } else if (screenData?.screenshot?.base_url && Array.isArray(screenData?.screenshot?.list)) {
          const { base_url, list, format = "jpg" } = screenData.screenshot;
          screenshots = list.map((time: any) => `${base_url}/${time}.${format}`);
        }
      } catch {}

      // Coba ambil recent live info jika ada DATA_ID
      try {
        const recentData = await jkt48Fetch<any>(`/api/recent/${encodeURIComponent(decodedId)}`, {}, { revalidate: 600 });
        if (recentData?.leaderboard_designs?.jkt48connect?.banner) {
          leaderboardBanner = recentData.leaderboard_designs.jkt48connect.banner;
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      data: {
        show,
        recordings,
        screenshots,
        leaderboard_banner: leaderboardBanner,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Gagal memuat detail show teater.",
      },
      { status: 500 }
    );
  }
}
