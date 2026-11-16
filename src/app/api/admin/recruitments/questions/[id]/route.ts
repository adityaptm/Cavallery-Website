import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import { updateQuestion, deleteQuestion } from "@/lib/dynamicRecruitment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminSessionFromReq(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const qId = Number(id);
    if (isNaN(qId)) {
      return NextResponse.json({ success: false, message: "ID tidak valid" }, { status: 400 });
    }

    const body = await request.json();
    const ok = await updateQuestion(qId, body);
    if (!ok) {
      return NextResponse.json({ success: false, message: "Gagal memperbarui pertanyaan." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Pertanyaan berhasil disimpan!" });
  } catch (error: any) {
    console.error("[API question PUT] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminSessionFromReq(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const qId = Number(id);
    if (isNaN(qId)) {
      return NextResponse.json({ success: false, message: "ID tidak valid" }, { status: 400 });
    }

    const res = await deleteQuestion(qId);
    if (!res.success) {
      return NextResponse.json({ success: false, message: "Gagal menghapus pertanyaan." }, { status: 500 });
    }

    const msg = res.softDeleted
      ? "Pertanyaan dinonaktifkan (karena sudah memiliki riwayat jawaban pendaftar)."
      : "Pertanyaan berhasil dihapus.";

    return NextResponse.json({ success: true, message: msg, softDeleted: res.softDeleted });
  } catch (error: any) {
    console.error("[API question DELETE] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
