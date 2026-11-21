import { NextRequest, NextResponse } from "next/server";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";
import type { Jkt48ScheduleResponse } from "@/types/jkt48";

const ERINE_KEYS = ["erine", "catherina", "catherine", "vallencia", "valencia"];

function checkIsErine(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return ERINE_KEYS.some((k) => lower.includes(k));
}

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

    if (!isJkt48ApiKeyConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "JKT48CONNECT_API_KEY belum diisi di environment variable.",
          data: { events: [], available_periods: [] },
        },
        { status: 503 }
      );
    }

    // Cache jadwal: 5-10 menit (300 detik)
    const rawData = await jkt48Fetch<any>(
      "/api/jadwal-vc",
      { year, month },
      { revalidate: 300 }
    );

    const eventsList = Array.isArray(rawData?.events) ? rawData.events : [];
    const MONTH_ID = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const rawPeriods = Array.isArray(rawData?.available_periods)
      ? rawData.available_periods
      : [];

    const availablePeriods = rawPeriods.map((p: any) => {
      if (typeof p === "string") {
        const parts = p.split("-").map(Number);
        const y = parts[0] || year;
        const m = parts[1] || month;
        return { year: y, month: m, label: `${MONTH_ID[m - 1] || m} ${y}` };
      }
      const y = Number(p.year) || year;
      const m = Number(p.month) || month;
      return {
        year: y,
        month: m,
        label: p.label || `${MONTH_ID[m - 1] || m} ${y}`,
      };
    });

    // Tagging Erine events
    const processedEvents = eventsList.map((evt: any) => {
      const hasErineInTitle = checkIsErine(evt.title);
      const hasErineInDesc = checkIsErine(evt.description);
      const hasErineInMembers = Array.isArray(evt.members)
        ? evt.members.some((m: any) => checkIsErine(typeof m === "string" ? m : m?.name))
        : false;

      return {
        ...evt,
        is_erine: Boolean(evt.is_erine || hasErineInTitle || hasErineInDesc || hasErineInMembers),
      };
    });

    const responseData: Jkt48ScheduleResponse = {
      events: processedEvents,
      available_periods: availablePeriods,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    const status = error instanceof Jkt48ApiError ? error.status : 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat jadwal dari JKT48 Connect.",
      },
      { status }
    );
  }
}
