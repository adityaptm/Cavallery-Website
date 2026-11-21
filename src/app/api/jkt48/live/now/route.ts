import { NextRequest, NextResponse } from "next/server";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";
import type { Jkt48LiveItem } from "@/types/jkt48";

const ERINE_KEYS = ["erine", "catherina", "catherine", "vallencia", "valencia"];

function checkIsErine(name?: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return ERINE_KEYS.some((k) => lower.includes(k));
}

export async function GET(req: NextRequest) {
  try {
    if (!isJkt48ApiKeyConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "JKT48CONNECT_API_KEY belum dikonfigurasi.",
          data: { lives: [], erine_live: false, notification: null },
        },
        { status: 503 }
      );
    }

    // Cache live stream: 15-30 detik (20 detik)
    const [showroomData, idnData, notifData] = await Promise.allSettled([
      jkt48Fetch<any>("/api/now_live", { group: "jkt48" }, { revalidate: 20 }),
      jkt48Fetch<any>("/api/idn_lives", {}, { revalidate: 20 }),
      jkt48Fetch<any>("/api/live-notifications", {}, { revalidate: 30 }),
    ]);

    const lives: Jkt48LiveItem[] = [];

    // 1. Process Showroom Lives (Hanya Erine)
    if (showroomData.status === "fulfilled" && showroomData.value) {
      const srList = Array.isArray(showroomData.value)
        ? showroomData.value
        : Array.isArray(showroomData.value?.data)
        ? showroomData.value.data
        : [];

      for (const item of srList) {
        const name = item.name || item.room_name || item.member_name || "JKT48 Member";
        if (checkIsErine(name) || checkIsErine(item.room_url_key)) {
          lives.push({
            id: String(item.room_id || item.id || `sr-${name}`),
            name: "Catherina Vallencia (Erine)",
            member_name: "Catherina Vallencia",
            img: item.image || item.img || item.avatar || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
            type: "showroom",
            platform: "showroom",
            streaming_url: item.streaming_url_list?.[0]?.url || item.streaming_url || "",
            url: item.room_url_key ? `https://www.showroom-live.com/r/${item.room_url_key}` : "https://www.showroom-live.com/r/JKT48_Erine",
            viewers: item.viewers || item.view_num,
            started_at: item.started_at,
            is_erine: true,
          });
        }
      }
    }

    // 2. Process IDN Lives (Hanya Erine)
    if (idnData.status === "fulfilled" && idnData.value) {
      const idnList = Array.isArray(idnData.value)
        ? idnData.value
        : Array.isArray(idnData.value?.data)
        ? idnData.value.data
        : [];

      for (const item of idnList) {
        const name = item.user?.name || item.name || item.username || "JKT48 Member";
        const username = item.user?.username || item.username || "";
        if (checkIsErine(name) || checkIsErine(username)) {
          const slug = item.slug || username || "";
          lives.push({
            id: String(item.id || item.slug || `idn-${name}`),
            name: "Catherina Vallencia (Erine)",
            member_name: "Catherina Vallencia",
            img: item.image || item.img || item.user?.avatar || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
            type: "idn",
            platform: "idn",
            streaming_url: item.stream_url || item.streaming_url || "",
            url: slug ? `https://www.idn.app/${username}/live/${slug}` : `https://www.idn.app/jkt48_erine`,
            viewers: item.view_count || item.viewers,
            started_at: item.live_at || item.started_at,
            is_erine: true,
          });
        }
      }
    }

    // 3. Process Live Notifications (khusus banner Erine jika ada)
    let notification: { banner_url?: string; caption?: string } | null = null;
    if (notifData.status === "fulfilled" && notifData.value) {
      const notifList = Array.isArray(notifData.value?.lives)
        ? notifData.value.lives
        : Array.isArray(notifData.value)
        ? notifData.value
        : [];

      for (const n of notifList) {
        const title = n.title || n.caption || "";
        if (checkIsErine(title) && n.is_live) {
          const banner = n.notification_designs?.jkt48connect?.banner;
          if (banner?.status === "ready" && banner?.url) {
            notification = {
              banner_url: banner.url,
              caption: n.caption || n.title,
            };
            break;
          }
        }
      }
    }

    const erineLive = lives.length > 0;

    return NextResponse.json({
      success: true,
      data: {
        lives,
        erine_live: erineLive,
        notification,
        total: lives.length,
      },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
      },
    });
  } catch (error: any) {
    const status = error instanceof Jkt48ApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat status live stream.",
        data: { lives: [], erine_live: false, notification: null },
      },
      { status }
    );
  }
}
