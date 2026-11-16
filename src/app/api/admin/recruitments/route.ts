import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import { getAllRecruitments, createRecruitment } from "@/lib/dynamicRecruitment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const admin = getAdminSessionFromReq(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await getAllRecruitments(false);
    return NextResponse.json({ success: true, data: list });
  } catch (error: any) {
    console.error("[API admin/recruitments GET] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = getAdminSessionFromReq(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, role_id, description, banner_url, start_date, end_date, is_active } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, message: "Judul rekrutmen wajib diisi." }, { status: 400 });
    }

    const newId = await createRecruitment({
      title,
      slug,
      role_id,
      description,
      banner_url,
      start_date,
      end_date,
      is_active,
    });

    if (!newId) {
      return NextResponse.json({ success: false, message: "Gagal membuat rekrutmen baru." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Rekrutmen berhasil dibuat!",
      id: newId,
    });
  } catch (error: any) {
    console.error("[API admin/recruitments POST] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
