import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import { cloneQuestions } from "@/lib/dynamicRecruitment";

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
    const targetRecId = Number(id);
    if (isNaN(targetRecId)) {
      return NextResponse.json({ success: false, message: "ID tidak valid" }, { status: 400 });
    }

    const body = await request.json();
    const sourceRecId = Number(body.sourceRecruitmentId);

    if (!sourceRecId || isNaN(sourceRecId)) {
      return NextResponse.json(
        { success: false, message: "sourceRecruitmentId is required" },
        { status: 400 }
      );
    }

    if (sourceRecId === targetRecId) {
      return NextResponse.json(
        { success: false, message: "Tidak dapat mengklon dari rekrutmen yang sama" },
        { status: 400 }
      );
    }

    const count = await cloneQuestions(sourceRecId, targetRecId);

    return NextResponse.json({
      success: true,
      message: `Berhasil menduplikasi ${count} pertanyaan ke rekrutmen ini!`,
      clonedCount: count,
    });
  } catch (error: any) {
    console.error("[API clone-questions POST] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
