import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import { getRecruitmentById, getQuestionsByRecruitment } from "@/lib/dynamicRecruitment";
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

    const rec = await getRecruitmentById(recId);
    if (!rec) {
      return NextResponse.json({ success: false, message: "Rekrutmen tidak ditemukan" }, { status: 404 });
    }

    const questions = await getQuestionsByRecruitment(recId, false);

    const submissions = await query<any[]>(
      `SELECT * FROM \`recruitment_submissions\` WHERE \`recruitment_id\` = ? ORDER BY \`created_at\` ASC, \`id\` ASC`,
      [recId]
    );

    // Fetch all answers for these submissions
    const subIds = (submissions || []).map((s) => s.id);
    const answersMap = new Map<number, Record<string, string>>();

    if (subIds.length > 0) {
      const placeholders = subIds.map(() => "?").join(",");
      const answers = await query<any[]>(
        `SELECT submission_id, field_key, answer_value FROM \`recruitment_answers\` WHERE \`submission_id\` IN (${placeholders})`,
        subIds
      );

      if (answers) {
        for (const a of answers) {
          if (!answersMap.has(a.submission_id)) {
            answersMap.set(a.submission_id, {});
          }
          answersMap.get(a.submission_id)![a.field_key] = a.answer_value ?? "";
        }
      }
    }

    // Build CSV Headers
    const headers = [
      "No",
      "Tanggal Submit",
      "Status",
      "Catatan Admin",
      ...questions.map((q) => `"${q.label.replace(/"/g, '""')}"`),
    ];

    // Build CSV Rows
    const rows = (submissions || []).map((s, idx) => {
      const subAnswers = answersMap.get(s.id) || {};

      const questionCols = questions.map((q) => {
        let val = subAnswers[q.field_key];

        // Fallback to submission standard columns if not in recruitment_answers
        if (val === undefined || val === null) {
          val = s[q.field_key] ?? "";
        }

        // Clean arrays if stored as JSON
        if (typeof val === "string" && val.startsWith("[") && val.endsWith("]")) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) {
              val = parsed.join(", ");
            }
          } catch {}
        }

        const safeStr = String(val ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ");
        return `"${safeStr}"`;
      });

      const dateStr = s.created_at ? new Date(s.created_at).toLocaleString("id-ID") : "-";
      const statusLabel = s.status === "approved" ? "Diterima" : s.status === "rejected" ? "Ditolak" : "Pending";
      const notes = (s.notes || "").replace(/"/g, '""');

      return [idx + 1, `"${dateStr}"`, `"${statusLabel}"`, `"${notes}"`, ...questionCols].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    const safeSlug = rec.slug.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Pendaftar_${safeSlug}_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[API export-csv] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
