import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";
import type { Jkt48TheaterShow, Jkt48TheaterMember } from "@/types/jkt48";

const ERINE_IDENTIFIERS = [
  "erine",
  "catherina",
  "catherine",
  "vallencia",
  "valencia",
  "44",
];

function isErineMember(m: { id?: string | number; name?: string; url_key?: string }): boolean {
  if (!m) return false;
  if (String(m.id) === "44") return true;
  const name = (m.name || "").toLowerCase();
  const urlKey = (m.url_key || "").toLowerCase();
  return ERINE_IDENTIFIERS.some((key) => name.includes(key) || urlKey.includes(key));
}

function isSpecialErineShow(title?: string): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  return (
    lower.includes("ulang tahun") ||
    lower.includes("birthday") ||
    lower.includes("seitansai") ||
    lower.includes("erine") ||
    lower.includes("special") ||
    lower.includes("spesial")
  );
}

function getMemberAvatar(m: any): string {
  if (m.img && !m.img.includes("cava-logo")) return m.img;
  if (m.avatar && !m.avatar.includes("cava-logo")) return m.avatar;
  const name = (m.name || "").trim().toLowerCase();
  if (name) {
    const slug = name.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return `https://jkt48.com/api/v1/storages/media/jkt48-member/${slug}.jpg`;
  }
  if (m.url_key) {
    return `https://jkt48.com/api/v1/storages/media/jkt48-member/${m.url_key.toLowerCase()}.jpg`;
  }
  return "https://jkt48.com/api/v1/storages/media/jkt48-member/catherina_vallencia.jpg";
}

function calculateShowStatus(dateStr: string, timeStr: string): {
  status: "live" | "upcoming" | "completed";
  countdownText: string;
} {
  try {
    const showDate = new Date(dateStr);
    if (isNaN(showDate.getTime())) {
      return { status: "completed", countdownText: "" };
    }

    const [hours, mins] = (timeStr || "19:00").split(":").map((v) => parseInt(v, 10) || 0);
    showDate.setHours(hours, mins, 0, 0);

    const now = new Date();
    const diffMs = showDate.getTime() - now.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);

    // Sedang LIVE jika dalam rentang 30 menit sebelum show hingga 2.5 jam setelah show
    if (diffMs <= 30 * 60 * 1000 && diffMs >= -2.5 * 60 * 60 * 1000) {
      return { status: "live", countdownText: "Sedang Berlangsung!" };
    }

    if (diffMs > 0) {
      // Akan Datang
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isToday =
        now.getFullYear() === showDate.getFullYear() &&
        now.getMonth() === showDate.getMonth() &&
        now.getDate() === showDate.getDate();

      if (isToday) {
        return { status: "upcoming", countdownText: `Hari ini · ${timeStr} WIB` };
      }

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isTomorrow =
        tomorrow.getFullYear() === showDate.getFullYear() &&
        tomorrow.getMonth() === showDate.getMonth() &&
        tomorrow.getDate() === showDate.getDate();

      if (isTomorrow) {
        return { status: "upcoming", countdownText: `Besok · ${timeStr} WIB` };
      }

      if (diffDays <= 30) {
        return { status: "upcoming", countdownText: `${diffDays} hari lagi` };
      }

      return { status: "upcoming", countdownText: `${timeStr} WIB` };
    }

    // Selesai
    return { status: "completed", countdownText: "Selesai" };
  } catch {
    return { status: "completed", countdownText: "" };
  }
}

function getMasterShows(): any[] {
  try {
    const masterPath = path.join(process.cwd(), "src", "data", "theater_shows_master.json");
    if (fs.existsSync(masterPath)) {
      const content = fs.readFileSync(masterPath, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) return list;
    }
  } catch (e) {
    console.warn("Could not read theater_shows_master.json:", e);
  }
  return [];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g. "11"
    const year = searchParams.get("year");   // e.g. "2026"
    const statusParam = searchParams.get("status"); // "all" | "upcoming" | "completed"

    // 1. Ambil data master
    const masterShows = getMasterShows();

    // 2. Jika API key terkonfigurasi, coba fetch data live theater dari JKT48 Connect
    let liveShows: any[] = [];
    if (isJkt48ApiKeyConfigured()) {
      try {
        const jkcRes = await jkt48Fetch<any>(
          "/api/theater",
          { page: 1, perpage: 50, type: "show" },
          { revalidate: 300 }
        );
        const fetchedList = Array.isArray(jkcRes?.theater)
          ? jkcRes.theater
          : Array.isArray(jkcRes?.data)
          ? jkcRes.data
          : [];

        // Ambil detail lineup untuk show yang belum ada di master (max 10 untuk menghemat quota)
        for (const item of fetchedList.slice(0, 10)) {
          if (!item.id) continue;
          try {
            const detailRes = await jkt48Fetch<any>(
              `/api/theater/${encodeURIComponent(item.id)}`,
              {},
              { revalidate: 600 }
            );
            const showsDetail = detailRes?.shows?.[0];
            if (showsDetail) {
              liveShows.push({
                id: String(item.id),
                schedule_id: String(item.id),
                title: item.title,
                team: item.team,
                date: item.start_date || item.date,
                startTime: item.start_date ? new Date(item.start_date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "19:00",
                members: showsDetail.members || [],
                poster: item.poster || "https://img.jkt48connect.com/jkt48/theater/uploads/cu0wq736nhcstg0epmiieumc.jpg",
                banner: item.banner || "https://img.jkt48connect.com/jkt48/theater/uploads/y2g3dgukgk8ohxghfxv8lyju.jpg",
                url: `https://jkt48.com/theater/schedule/id/${item.id}?lang=id`,
              });
            }
          } catch {}
        }
      } catch (err) {
        console.warn("[JKT48 Theater] Live theater fetch warning:", err);
      }
    }

    // 3. Gabungkan live shows dan master shows dengan dedup
    const seen = new Set<string>();
    const combined: any[] = [];

    for (const s of [...liveShows, ...masterShows]) {
      const key = `${(s.title || "").trim().toLowerCase()}-${String(s.date || s.showDate || "").slice(0, 10)}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(s);
      }
    }

    // 4. FILTER SERVER-SIDE KETAT: HANYA SHOW YANG MEMILIKI ERINE DI LINEUP!
    const erineOnlyShows: Jkt48TheaterShow[] = [];

    for (const show of combined) {
      const rawMembers: any[] = show.members || show.member || show.lineup || [];
      const hasErine = rawMembers.some(isErineMember);

      // Jika show TIDAK memuat Erine, lewati sama sekali!
      if (!hasErine) continue;

      const dateStr = show.date || show.showDate || "";
      const timeStr = (show.startTime || show.start_time || "19:00").slice(0, 5);
      const { status, countdownText } = calculateShowStatus(dateStr, timeStr);

      // Pastikan Erine berada di posisi pertama dalam deretan members
      const formattedMembers: Jkt48TheaterMember[] = rawMembers.map((m: any) => {
        const photoUrl = getMemberAvatar(m);
        return {
          id: String(m.id || ""),
          name: m.name || "",
          url_key: m.url_key || "",
          img: photoUrl,
          avatar: photoUrl,
          is_erine: isErineMember(m),
        };
      });

      // Urutkan Erine paling depan, lalu member lainnya
      formattedMembers.sort((a, b) => (b.is_erine ? 1 : 0) - (a.is_erine ? 1 : 0));

      const isSpecial = isSpecialErineShow(show.title);

      erineOnlyShows.push({
        id: String(show.id || show.schedule_id || `${show.title}-${dateStr}`),
        schedule_id: String(show.schedule_id || show.id || ""),
        title: show.title || "JKT48 Theater Show",
        date: dateStr,
        showDate: dateStr,
        startTime: timeStr,
        endTime: show.endTime || "",
        team: show.team || (show.title?.toLowerCase().includes("passion") ? "Team Passion" : "JKT48"),
        location: show.location || "Theater JKT48, fX Sudirman",
        poster: show.poster || "https://img.jkt48connect.com/jkt48/theater/uploads/cu0wq736nhcstg0epmiieumc.jpg",
        banner: show.banner || "https://img.jkt48connect.com/jkt48/theater/uploads/y2g3dgukgk8ohxghfxv8lyju.jpg",
        url: show.url || `https://jkt48.com/theater/schedule?lang=id`,
        is_erine: true,
        is_special: isSpecial,
        status,
        countdownText,
        members: formattedMembers,
      });
    }

    // 5. Filter opsional berdasarkan status atau tanggal jika diminta
    let filtered = erineOnlyShows;

    if (year) {
      const yNum = parseInt(year, 10);
      filtered = filtered.filter((s) => {
        const d = new Date(s.date);
        return !isNaN(d.getTime()) && d.getFullYear() === yNum;
      });
    }

    if (month) {
      const mNum = parseInt(month, 10);
      filtered = filtered.filter((s) => {
        const d = new Date(s.date);
        return !isNaN(d.getTime()) && d.getMonth() + 1 === mNum;
      });
    }

    if (statusParam && statusParam !== "all") {
      filtered = filtered.filter((s) => s.status === statusParam);
    }

    // 6. Urutkan:
    // Show yang live / upcoming paling awal (terdekat), lalu show selesai (terbaru ke terlama)
    filtered.sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      // Jika salah satu live
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;

      // Jika keduanya upcoming
      if (a.status === "upcoming" && b.status === "upcoming") return ta - tb;
      // Jika salah satu upcoming
      if (a.status === "upcoming" && b.status !== "upcoming") return -1;
      if (b.status === "upcoming" && a.status !== "upcoming") return 1;

      // Keduanya completed -> urutkan terbaru ke terlama
      return tb - ta;
    });

    // Cari hero next show (show Erine terdekat yang belum selesai)
    const nextShow = erineOnlyShows.find((s) => s.status === "live" || s.status === "upcoming") || null;

    return NextResponse.json({
      success: true,
      data: {
        shows: filtered,
        next_show: nextShow,
        total_erine_shows: erineOnlyShows.length,
      },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: any) {
    console.error("[JKT48 Theater Route Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Gagal memuat jadwal teater Erine.",
        data: { shows: [], next_show: null, total_erine_shows: 0 },
      },
      { status: 500 }
    );
  }
}
