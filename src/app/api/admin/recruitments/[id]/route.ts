import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import {
  getRecruitmentById,
  updateRecruitment,
  deleteRecruitment,
  getQuestionsByRecruitment,
} from "@/lib/dynamicRecruitment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
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

    const rec = await getRecruitmentById(recId);
    if (!rec) {
      return NextResponse.json({ success: false, message: "Rekrutmen tidak ditemukan" }, { status: 404 });
    }

    const questions = await getQuestionsByRecruitment(recId, false);

    return NextResponse.json({
      success: true,
      data: {
        recruitment: rec,
        questions,
      },
    });
  } catch (error: any) {
    console.error("[API admin/recruitments/[id] GET] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

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
    const recId = Number(id);
    if (isNaN(recId)) {
      return NextResponse.json({ success: false, message: "ID tidak valid" }, { status: 400 });
    }

    const body = await request.json();
    const ok = await updateRecruitment(recId, body);
    if (!ok) {
      return NextResponse.json({ success: false, message: "Gagal memperbarui rekrutmen." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Rekrutmen berhasil diperbarui!" });
  } catch (error: any) {
    console.error("[API admin/recruitments/[id] PUT] Error:", error);
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
    const recId = Number(id);
    if (isNaN(recId)) {
      return NextResponse.json({ success: false, message: "ID tidak valid" }, { status: 400 });
    }

    const ok = await deleteRecruitment(recId);
    if (!ok) {
      return NextResponse.json({ success: false, message: "Gagal menghapus rekrutmen." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Rekrutmen berhasil dihapus (disimpan ke arsip trash)!" });
  } catch (error: any) {
    console.error("[API admin/recruitments/[id] DELETE] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
