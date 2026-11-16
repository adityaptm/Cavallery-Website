import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import { getSubmissionDetail, updateSubmissionStatus } from "@/lib/dynamicRecruitment";
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
    const subId = Number(id);
    if (isNaN(subId)) {
      return NextResponse.json({ success: false, message: "ID tidak valid" }, { status: 400 });
    }

    const detail = await getSubmissionDetail(subId);
    if (!detail) {
      return NextResponse.json({ success: false, message: "Data pendaftar tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: detail });
  } catch (error: any) {
    console.error("[API submission detail GET] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = getAdminSessionFromReq(request);
  if (!admin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const subId = Number(id);
    if (isNaN(subId)) {
      return NextResponse.json({ success: false, message: "ID tidak valid" }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes } = body;

    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, message: "Status tidak valid" }, { status: 400 });
    }

    const ok = await updateSubmissionStatus(subId, status, notes);
    if (!ok) {
      return NextResponse.json({ success: false, message: "Gagal memperbarui status pendaftar." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Status pendaftar berhasil diperbarui!" });
  } catch (error: any) {
    console.error("[API submission status PATCH] Error:", error);
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
    const subId = Number(id);
    if (isNaN(subId)) {
      return NextResponse.json({ success: false, message: "ID tidak valid" }, { status: 400 });
    }

    // Backup to trash before deleting
    const detail = await getSubmissionDetail(subId);
    if (detail) {
      try {
        await query(
          `INSERT INTO \`trash_records\` 
            (\`source_table\`, \`record_id\`, \`title\`, \`data_payload\`, \`deleted_by\`, \`deleted_at\`)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            "recruitment_submissions",
            subId,
            `Pendaftar: ${detail.full_name} (${detail.role_id})`,
            JSON.stringify(detail),
            admin.username || "admin",
          ]
        );
      } catch {
        // Ignore trash error
      }
    }

    const res: any = await query("DELETE FROM recruitment_submissions WHERE id = ?", [subId]);
    const ok = Boolean(res && res.affectedRows > 0);

    if (!ok) {
      return NextResponse.json({ success: false, message: "Gagal menghapus pendaftar." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Pendaftar berhasil dihapus (tersimpan di trash)!" });
  } catch (error: any) {
    console.error("[API submission DELETE] Error:", error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
