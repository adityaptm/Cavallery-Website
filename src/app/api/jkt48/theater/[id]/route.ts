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
    let topGifters: any[] = [];
    let stagelist: any[] = [];

    // 2. Jika API Key terkonfigurasi, coba ambil data rekaman, screenshot, gifts, stagelist
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
          const { base_url, list: sList, format = "jpg" } = screenData.screenshot;
          screenshots = sList.map((time: any) => `${base_url}/${time}.${format}`);
        }
      } catch {}

      // Coba ambil recent live info
      try {
        const recentData = await jkt48Fetch<any>(`/api/recent/${encodeURIComponent(decodedId)}`, {}, { revalidate: 600 });
        if (recentData?.leaderboard_designs?.jkt48connect?.banner) {
          leaderboardBanner = recentData.leaderboard_designs.jkt48connect.banner;
        }
      } catch {}

      // Coba ambil top gifters
      try {
        const giftsData = await jkt48Fetch<any>(`/api/recent/${encodeURIComponent(decodedId)}/gifts`, {}, { revalidate: 600 });
        if (Array.isArray(giftsData?.gifts)) {
          topGifters = giftsData.gifts.slice(0, 10).map((g: any) => ({
            name: g.name || g.user?.name || "Fans",
            avatar: g.avatar || g.user?.avatar_url || "",
            total: g.total || g.amount || 0,
            count: g.count || 1,
          }));
        } else if (Array.isArray(giftsData)) {
          topGifters = giftsData.slice(0, 10).map((g: any) => ({
            name: g.name || g.user?.name || "Fans",
            avatar: g.avatar || g.user?.avatar_url || "",
            total: g.total || g.amount || 0,
            count: g.count || 1,
          }));
        }
      } catch {}

      // Coba ambil stagelist / setlist
      try {
        const stageData = await jkt48Fetch<any>(`/api/recent/${encodeURIComponent(decodedId)}/stagelist`, {}, { revalidate: 600 });
        if (Array.isArray(stageData?.stagelist)) {
          stagelist = stageData.stagelist;
        } else if (Array.isArray(stageData?.songs)) {
          stagelist = stageData.songs;
        } else if (Array.isArray(stageData)) {
          stagelist = stageData;
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
        top_gifters: topGifters,
        stagelist,
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
