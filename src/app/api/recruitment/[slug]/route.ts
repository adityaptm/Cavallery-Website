import { NextRequest, NextResponse } from "next/server";
import { getRecruitmentBySlug, getRecruitmentById, getQuestionsByRecruitment } from "@/lib/dynamicRecruitment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, message: "Slug is required" }, { status: 400 });
    }

    let recruitment = await getRecruitmentBySlug(slug);
    if (!recruitment && /^\d+$/.test(slug)) {
      recruitment = await getRecruitmentById(Number(slug));
    }

    if (!recruitment) {
      return NextResponse.json({ success: false, message: "Pendaftaran tidak ditemukan" }, { status: 404 });
    }

    const questions = await getQuestionsByRecruitment(recruitment.id, true);

    return NextResponse.json({
      success: true,
      data: {
        recruitment,
        questions,
      },
    });
  } catch (error: any) {
    console.error("[API recruitment/[slug]] Error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Gagal memuat form." }, { status: 500 });
  }
}
