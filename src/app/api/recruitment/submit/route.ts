import { NextRequest, NextResponse } from "next/server";
import { submitApplication, getRecruitmentById } from "@/lib/dynamicRecruitment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GOOGLE_SHEETS_WEBHOOK =
  process.env.GOOGLE_SHEETS_RECRUITMENT_WEBHOOK ||
  process.env.NEXT_PUBLIC_GOOGLE_SHEETS_RECRUITMENT_WEBHOOK ||
  "";

async function forwardToGoogleSheets(payload: any) {
  if (!GOOGLE_SHEETS_WEBHOOK) return;
  try {
    await fetch(GOOGLE_SHEETS_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err: any) {
    console.error("Google Sheets Sync Error:", err?.message || err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recruitment_id, answers, _hp_cav } = body;

    // Honeypot check - bot protection
    if (_hp_cav) {
      return NextResponse.json({ success: true, message: "Pendaftaran terkirim!" });
    }

    if (!recruitment_id || !answers || typeof answers !== "object") {
      return NextResponse.json(
        { success: false, message: "ID Rekrutmen dan data formulir wajib diisi." },
        { status: 400 }
      );
    }

    const recId = Number(recruitment_id);
    const rec = await getRecruitmentById(recId);
    if (!rec || !rec.is_active) {
      return NextResponse.json(
        { success: false, message: "Pendaftaran untuk posisi ini sedang ditutup." },
        { status: 400 }
      );
    }

    // Capture IP & User Agent
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "-";

    const result = await submitApplication({
      recruitmentId: recId,
      answers,
      meta: { ip, userAgent },
    });

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    // Forward to Google Sheets in background if configured
    forwardToGoogleSheets({
      id: result.submissionId,
      submitted_at: new Date().toISOString(),
      recruitment_id: recId,
      recruitment_title: rec.title,
      role_id: rec.role_id,
      ...answers,
    });

    return NextResponse.json({
      success: true,
      message: "Pendaftaran berhasil dikirim! Tim Cavallery akan segera memeriksa data kamu.",
      submission_id: result.submissionId,
    });
  } catch (error: any) {
    console.error("[API recruitment/submit] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
