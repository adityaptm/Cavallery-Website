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
          data: { lives: [], erine_live: false },
        },
        { status: 503 }
      );
    }

    // Cache live stream: 15-30 detik (20 detik)
    const [showroomData, idnData] = await Promise.allSettled([
      jkt48Fetch<any>("/api/now_live", { group: "jkt48" }, { revalidate: 20 }),
      jkt48Fetch<any>("/api/idn_lives", {}, { revalidate: 20 }),
    ]);

    const lives: Jkt48LiveItem[] = [];

    // 1. Process Showroom Lives
    if (showroomData.status === "fulfilled" && showroomData.value) {
      const srList = Array.isArray(showroomData.value)
        ? showroomData.value
        : Array.isArray(showroomData.value?.data)
        ? showroomData.value.data
        : [];

      for (const item of srList) {
        const name = item.name || item.room_name || item.member_name || "JKT48 Member";
        const isErine = checkIsErine(name);
        lives.push({
          id: String(item.room_id || item.id || `sr-${item.room_url_key || name}`),
          name,
          member_name: name,
          img: item.image || item.img || item.avatar || "",
          type: "showroom",
          platform: "showroom",
          streaming_url: item.streaming_url_list?.[0]?.url || item.streaming_url || "",
          url: item.url || (item.room_url_key ? `https://www.showroom-live.com/r/${item.room_url_key}` : "https://www.showroom-live.com"),
          viewers: item.viewers || item.view_num,
          started_at: item.started_at,
          is_erine: isErine,
        });
      }
    }

    // 2. Process IDN Lives
    if (idnData.status === "fulfilled" && idnData.value) {
      const idnList = Array.isArray(idnData.value)
        ? idnData.value
        : Array.isArray(idnData.value?.data)
        ? idnData.value.data
        : [];

      for (const item of idnList) {
        const name = item.user?.name || item.name || item.username || "JKT48 Member";
        const isErine = checkIsErine(name) || checkIsErine(item.user?.username);
        const slug = item.slug || item.user?.username || "";
        lives.push({
          id: String(item.id || item.slug || `idn-${name}`),
          name,
          member_name: name,
          img: item.image || item.img || item.user?.avatar || "",
          type: "idn",
          platform: "idn",
          streaming_url: item.stream_url || item.streaming_url || "",
          url: item.url || (slug ? `https://www.idn.app/${slug}` : "https://www.idn.app"),
          viewers: item.view_count || item.viewers,
          started_at: item.live_at || item.started_at,
          is_erine: isErine,
        });
      }
    }

    const erineLive = lives.some((l) => l.is_erine);

    return NextResponse.json({
      success: true,
      data: {
        lives,
        erine_live: erineLive,
        total: lives.length,
      },
    });
  } catch (error: any) {
    const status = error instanceof Jkt48ApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat status live JKT48.",
      },
      { status }
    );
  }
}
