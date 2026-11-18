import { NextRequest, NextResponse } from "next/server";
import { jkt48Fetch, Jkt48ApiError, isJkt48ApiKeyConfigured } from "@/lib/jkt48";
import type {
  Jkt48ExclusiveRawResponse,
  Jkt48ExclusiveFlattenedResponse,
  ExclusiveFlattenedItem,
} from "@/types/jkt48";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Default Exclusive ID: EX79CB jika tidak disediakan
    const id = (searchParams.get("id") || "EX79CB").trim().replace(/[^a-zA-Z0-9_-]/g, "");

    // Validasi format tanggal (YYYY-MM-DD)
    const dateParam = searchParams.get("date");
    let date = dateParam ? dateParam.trim() : "";
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: "Format tanggal tidak valid. Gunakan format YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (!isJkt48ApiKeyConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "JKT48CONNECT_API_KEY belum dikonfigurasi.",
          data: null,
        },
        { status: 503 }
      );
    }

    // Cache stok eksklusif: 30-60 detik (sesuai spesifikasi)
    const rawData = await jkt48Fetch<Jkt48ExclusiveRawResponse>(
      `/api/exclusives/${id}`,
      date ? { date } : {},
      { revalidate: 45 }
    );

    const sessions = Array.isArray(rawData?.sessions) ? rawData.sessions : [];

    // Flatten logic sesuai petunjuk spesifikasi:
    // sessions.flatMap(s => s.lanes.map(l => ({ session: s.label, startTime: s.start_time, member: l.member_name, status: l.status })))
    const flattened: ExclusiveFlattenedItem[] = sessions.flatMap((s) => {
      const lanes = Array.isArray(s?.lanes) ? s.lanes : [];
      return lanes.map((l) => ({
        session: s.label || "Sesi",
        startTime: s.start_time || "",
        member: l.member_name || "Member",
        status: l.status || "available",
      }));
    });

    const responseData: Jkt48ExclusiveFlattenedResponse = {
      sales_status: rawData?.sales_status || "open",
      summary: rawData?.summary,
      sessions: sessions,
      purchase_url: rawData?.purchase_url || "https://jkt48.com",
      flattened,
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
        error: error.message || "Gagal memuat data stok eksklusif.",
      },
      { status }
    );
  }
}
