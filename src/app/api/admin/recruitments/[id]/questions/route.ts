import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import { getQuestionsByRecruitment, createQuestion } from "@/lib/dynamicRecruitment";

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

    const questions = await getQuestionsByRecruitment(recId, false);
    return NextResponse.json({ success: true, data: questions });
  } catch (error: any) {
    console.error("[API questions GET] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

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
    const { label, field_key, type, placeholder, help_text, is_required, options, validation, is_active } = body;

    if (!label || !label.trim() || !type) {
      return NextResponse.json(
        { success: false, message: "Label pertanyaan dan jenis tipe input wajib diisi." },
        { status: 400 }
      );
    }

    const qId = await createQuestion({
      recruitment_id: recId,
      label,
      field_key,
      type,
      placeholder,
      help_text,
      is_required,
      options,
      validation,
      is_active,
    });

    if (!qId) {
      return NextResponse.json({ success: false, message: "Gagal menambahkan pertanyaan." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Pertanyaan berhasil ditambahkan!",
      id: qId,
    });
  } catch (error: any) {
    console.error("[API questions POST] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
