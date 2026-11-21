import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";
import type { Jkt48ScheduleResponse, Jkt48ScheduleEvent, Jkt48AvailablePeriod } from "@/types/jkt48";

const ERINE_KEYS = ["erine", "catherina", "catherine", "vallencia", "valencia"];

function checkIsErine(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return ERINE_KEYS.some((k) => lower.includes(k));
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

const MONTH_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();

    // Validasi parameter year & month
    let year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    let month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);

    if (isNaN(year) || year < 2020 || year > 2035) {
      year = now.getFullYear();
    }
    if (isNaN(month) || month < 1 || month > 12) {
      month = now.getMonth() + 1;
    }

    const eventsList: Jkt48ScheduleEvent[] = [];
    const periodsSet = new Map<string, Jkt48AvailablePeriod>();

    // 1. Ambil theater shows dari master database (khusus Erine)
    const masterShows = getMasterShows();
    for (const s of masterShows) {
      const dateStr = String(s.date || s.showDate || "").slice(0, 10);
      if (!dateStr) continue;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) continue;

      const sYear = d.getFullYear();
      const sMonth = d.getMonth() + 1;

      // Catat period
      const periodKey = `${sYear}-${sMonth}`;
      if (!periodsSet.has(periodKey)) {
        periodsSet.set(periodKey, {
          year: sYear,
          month: sMonth,
          label: `${MONTH_ID[sMonth - 1]} ${sYear}`,
        });
      }

      // Jika cocok dengan bulan & tahun yang diminta
      if (sYear === year && sMonth === month) {
        const rawMembers: any[] = s.members || s.member || [];
        const hasErine = rawMembers.some((m: any) => checkIsErine(m.name) || checkIsErine(m.url_key) || String(m.id) === "44");

        eventsList.push({
          id: `theater-${s.id || s.schedule_id || dateStr}`,
          title: s.title || "Show Theater JKT48",
          date: dateStr,
          time: (s.startTime || s.start_time || "19:00").slice(0, 5),
          type: "theater",
          description: `${s.team || "JKT48"} · ${s.location || "JKT48 Theater, fX Sudirman"}`,
          is_erine: hasErine,
          members: rawMembers.map((m: any) => ({
            id: String(m.id || ""),
            name: m.name || "",
            url_key: m.url_key || "",
          })),
          link: s.url || "https://jkt48.com/theater/schedule?lang=id",
        });
      }
    }

    // 2. Jika API key terkonfigurasi, coba ambil data tambahan dari JKT48 Connect
    if (isJkt48ApiKeyConfigured()) {
      try {
        const rawData = await jkt48Fetch<any>(
          "/api/jadwal-vc",
          { year, month },
          { revalidate: 300 }
        );

        if (Array.isArray(rawData?.events)) {
          for (const evt of rawData.events) {
            const hasErine =
              checkIsErine(evt.title) ||
              checkIsErine(evt.description) ||
              (Array.isArray(evt.members) && evt.members.some((m: any) => checkIsErine(typeof m === "string" ? m : m?.name)));

            eventsList.push({
              ...evt,
              is_erine: Boolean(evt.is_erine || hasErine),
            });
          }
        }

        if (Array.isArray(rawData?.available_periods)) {
          for (const p of rawData.available_periods) {
            const py = typeof p === "string" ? parseInt(p.split("-")[0], 10) : Number(p.year);
            const pm = typeof p === "string" ? parseInt(p.split("-")[1], 10) : Number(p.month);
            if (py && pm) {
              const k = `${py}-${pm}`;
              if (!periodsSet.has(k)) {
                periodsSet.set(k, {
                  year: py,
                  month: pm,
                  label: `${MONTH_ID[pm - 1] || pm} ${py}`,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("[JKT48 Schedule API] Fetch warning:", err);
      }
    }

    // Pastikan bulan sekarang selalu ada di periods
    const currentKey = `${year}-${month}`;
    if (!periodsSet.has(currentKey)) {
      periodsSet.set(currentKey, {
        year,
        month,
        label: `${MONTH_ID[month - 1]} ${year}`,
      });
    }

    // Urutkan periods dari terbaru ke terlama
    const sortedPeriods = Array.from(periodsSet.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    // Urutkan events berdasarkan tanggal dan jam
    eventsList.sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return da - db;
    });

    return NextResponse.json({
      success: true,
      data: {
        events: eventsList,
        available_periods: sortedPeriods,
      },
    });
  } catch (error: any) {
    const status = error instanceof Jkt48ApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat kalender agenda.",
        data: { events: [], available_periods: [] },
      },
      { status }
    );
  }
}
