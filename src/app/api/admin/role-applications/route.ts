import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import { query, isMySqlConfigured } from "@/lib/mysql";
import { logActivity } from "@/lib/logger";
import {
  ensureRoleApplicationsTable,
  type RoleApplication,
  type RoleApplicationStatus,
} from "@/lib/roleApplicationsDb";

// GET: List all role applications for admin review
export async function GET(req: NextRequest) {
  try {
    const admin = getAdminSessionFromReq(req);
    if (!admin) {
      return NextResponse.json(
        { status: false, message: "Unauthorized admin access" },
        { status: 401 }
      );
    }

    if (!isMySqlConfigured()) {
      return NextResponse.json(
        { status: false, message: "Database belum terkonfigurasi" },
        { status: 503 }
      );
    }

    await ensureRoleApplicationsTable();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") || "all";
    const roleFilter = searchParams.get("role_type") || "all";
    const q = (searchParams.get("q") || "").trim();

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (statusFilter !== "all" && ["diproses", "diterima", "ditolak"].includes(statusFilter)) {
      whereClauses.push("`status` = ?");
      params.push(statusFilter);
    }
    if (roleFilter !== "all" && ["admin", "volunteer"].includes(roleFilter)) {
      whereClauses.push("`role_type` = ?");
      params.push(roleFilter);
    }
    if (q) {
      whereClauses.push(
        "(`nama_anggota` LIKE ? OR `no_anggota` LIKE ? OR `id_line` LIKE ? OR `divisi` LIKE ?)"
      );
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const rows = await query<RoleApplication[]>(
      `SELECT * FROM \`role_applications\`
       ${whereSql}
       ORDER BY FIELD(\`status\`, 'diproses', 'diterima', 'ditolak'), \`created_at\` DESC, \`id\` DESC`,
      params
    );

    const statsRows = await query<any[]>(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN \`status\` = 'diproses' THEN 1 ELSE 0 END) AS diproses,
        SUM(CASE WHEN \`status\` = 'diterima' THEN 1 ELSE 0 END) AS diterima,
        SUM(CASE WHEN \`status\` = 'ditolak' THEN 1 ELSE 0 END) AS ditolak
       FROM \`role_applications\``
    );
    const stats = statsRows?.[0] || { total: 0, diproses: 0, diterima: 0, ditolak: 0 };

    return NextResponse.json({
      status: true,
      data: rows || [],
      stats: {
        total: Number(stats.total || 0),
        diproses: Number(stats.diproses || 0),
        diterima: Number(stats.diterima || 0),
        ditolak: Number(stats.ditolak || 0),
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/role-applications error:", error);
    return NextResponse.json(
      { status: false, message: error?.message || "Gagal memuat data pendaftar" },
      { status: 500 }
    );
  }
}

// PATCH: Review application (update status & feedback)
export async function PATCH(req: NextRequest) {
  try {
    const admin = getAdminSessionFromReq(req);
    if (!admin) {
      return NextResponse.json(
        { status: false, message: "Unauthorized admin access" },
        { status: 401 }
      );
    }

    if (!isMySqlConfigured()) {
      return NextResponse.json(
        { status: false, message: "Database belum terkonfigurasi" },
        { status: 503 }
      );
    }

    await ensureRoleApplicationsTable();

    const body = await req.json();
    const id = Number(body.id);
    const status = String(body.status || "").trim() as RoleApplicationStatus;
    const feedback = body.feedback !== undefined ? String(body.feedback || "").trim() : null;

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { status: false, message: "ID pendaftaran tidak valid" },
        { status: 400 }
      );
    }

    if (!["diproses", "diterima", "ditolak"].includes(status)) {
      return NextResponse.json(
        { status: false, message: "Status harus diproses, diterima, atau ditolak" },
        { status: 400 }
      );
    }

    if (status === "ditolak" && (!feedback || feedback.length < 5)) {
      return NextResponse.json(
        { status: false, message: "Alasan penolakan (feedback) wajib diisi minimal 5 karakter" },
        { status: 400 }
      );
    }

    const existing = await query<RoleApplication[]>(
      "SELECT * FROM `role_applications` WHERE `id` = ? LIMIT 1",
      [id]
    );
    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { status: false, message: "Data pendaftaran tidak ditemukan" },
        { status: 404 }
      );
    }

    const reviewer = admin.nama || admin.username || "Admin";

    await query(
      `UPDATE \`role_applications\`
       SET \`status\` = ?,
           \`feedback\` = ?,
           \`reviewed_by\` = ?,
           \`reviewed_at\` = NOW()
       WHERE \`id\` = ?`,
      [status, feedback || null, status === "diproses" ? null : reviewer, id]
    );

    try {
      await logActivity(
        reviewer,
        "UPDATE_ROLE_APPLICATION",
        "role_applications",
        `Mengubah status pendaftaran #${id} (${existing[0].nama_anggota} - ${existing[0].role_type}) menjadi ${status}`
      );
    } catch {}

    return NextResponse.json({
      status: true,
      message: `Status pendaftaran berhasil diubah menjadi "${status}"`,
    });
  } catch (error: any) {
    console.error("PATCH /api/admin/role-applications error:", error);
    return NextResponse.json(
      { status: false, message: error?.message || "Gagal memperbarui status pendaftaran" },
      { status: 500 }
    );
  }
}

// DELETE: Delete role application by id
export async function DELETE(req: NextRequest) {
  try {
    const admin = getAdminSessionFromReq(req);
    if (!admin) {
      return NextResponse.json(
        { status: false, message: "Unauthorized admin access" },
        { status: 401 }
      );
    }

    if (!isMySqlConfigured()) {
      return NextResponse.json(
        { status: false, message: "Database belum terkonfigurasi" },
        { status: 503 }
      );
    }

    await ensureRoleApplicationsTable();

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { status: false, message: "ID pendaftaran tidak valid" },
        { status: 400 }
      );
    }

    await query("DELETE FROM `role_applications` WHERE `id` = ?", [id]);

    return NextResponse.json({
      status: true,
      message: "Data pendaftaran berhasil dihapus",
    });
  } catch (error: any) {
    console.error("DELETE /api/admin/role-applications error:", error);
    return NextResponse.json(
      { status: false, message: error?.message || "Gagal menghapus data" },
      { status: 500 }
    );
  }
}
