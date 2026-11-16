import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import { reorderQuestions } from "@/lib/dynamicRecruitment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminSessionFromReq(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const recId = Number(id);
    if (isNaN(recId)) {
      return NextResponse.json({ success: false, message: "ID tidak valid" }, { status: 400 });
    }

    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ success: false, message: "orderedIds array is required" }, { status: 400 });
    }

    const ok = await reorderQuestions(recId, orderedIds);
    if (!ok) {
      return NextResponse.json({ success: false, message: "Gagal mengatur urutan pertanyaan." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Urutan pertanyaan berhasil disimpan!" });
  } catch (error: any) {
    console.error("[API reorder-questions POST] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
