import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import { query } from "@/lib/mysql";

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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("q");

    let sql = `
      SELECT s.*, 
        (SELECT COUNT(*) FROM recruitment_answers a WHERE a.submission_id = s.id) AS answer_count
      FROM recruitment_submissions s
      WHERE s.recruitment_id = ?
    `;
    const queryParams: any[] = [recId];

    if (status && status !== "all") {
      sql += " AND s.status = ?";
      queryParams.push(status);
    }

    if (search) {
      sql += " AND (s.full_name LIKE ? OR s.city LIKE ? OR s.whatsapp LIKE ? OR s.email LIKE ? OR s.line_id LIKE ?)";
      const pattern = `%${search}%`;
      queryParams.push(pattern, pattern, pattern, pattern, pattern);
    }

    sql += " ORDER BY s.created_at DESC, s.id DESC";

    const rows = await query<any[]>(sql, queryParams);
    return NextResponse.json({ success: true, data: rows || [] });
  } catch (error: any) {
    console.error("[API admin submissions GET] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
