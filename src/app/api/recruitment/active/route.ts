import { NextResponse } from "next/server";
import { getAllRecruitments } from "@/lib/dynamicRecruitment";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const recruitments = await getAllRecruitments(true);
    return NextResponse.json({
      success: true,
      data: recruitments,
    });
  } catch (error: any) {
    console.error("[API recruitment/active] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Gagal memuat rekrutmen aktif.", data: [] },
      { status: 500 }
    );
  }
}
