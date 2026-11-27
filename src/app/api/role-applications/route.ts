import { NextRequest, NextResponse } from "next/server";
import { getUserSessionFromReq } from "@/lib/auth";
import { query, isMySqlConfigured } from "@/lib/mysql";
import {
  ensureRoleApplicationsTable,
  type RoleApplication,
  type RoleApplicationType,
} from "@/lib/roleApplicationsDb";

// GET: List role applications for the logged-in member (anggota only)
export async function GET(req: NextRequest) {
  try {
    const session = getUserSessionFromReq(req);
    if (!session || session.type !== "anggota") {
      return NextResponse.json(
        { status: false, message: "Khusus anggota resmi Cavallery yang telah login" },
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

    const rows = await query<RoleApplication[]>(
      `SELECT * FROM \`role_applications\`
       WHERE \`anggota_id\` = ?
       ORDER BY \`created_at\` DESC, \`id\` DESC`,
      [session.id]
    );

    return NextResponse.json({
      status: true,
      data: rows || [],
    });
  } catch (error: any) {
    console.error("GET /api/role-applications error:", error);
    return NextResponse.json(
      { status: false, message: error?.message || "Gagal memuat riwayat pendaftaran" },
      { status: 500 }
    );
  }
}

// POST: Submit new admin or volunteer application (anggota only)
export async function POST(req: NextRequest) {
  try {
    const session = getUserSessionFromReq(req);
    if (!session || session.type !== "anggota") {
      return NextResponse.json(
        { status: false, message: "Hanya anggota resmi yang dapat mendaftar Admin atau Volunteer" },
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
    const roleType = String(body.role_type || "").toLowerCase().trim() as RoleApplicationType;
    const divisi = body.divisi ? String(body.divisi).trim().slice(0, 100) : null;
    const alasan = String(body.alasan || "").trim();
    const pengalaman = body.pengalaman ? String(body.pengalaman).trim() : null;
    const ketersediaan = body.ketersediaan ? String(body.ketersediaan).trim().slice(0, 255) : null;
    const portofolioUrl = body.portofolio_url ? String(body.portofolio_url).trim().slice(0, 500) : null;

    if (roleType !== "admin" && roleType !== "volunteer") {
      return NextResponse.json(
        { status: false, message: "Pilih jenis peran: Admin atau Volunteer" },
        { status: 400 }
      );
    }

    if (alasan.length < 15) {
      return NextResponse.json(
        { status: false, message: "Alasan dan motivasi mendaftar minimal 15 karakter" },
        { status: 400 }
      );
    }

    // Prevent duplicate pending application for the same role_type
    const existingPending = await query<any[]>(
      `SELECT id FROM \`role_applications\`
       WHERE \`anggota_id\` = ? AND \`role_type\` = ? AND \`status\` = 'diproses'
       LIMIT 1`,
      [session.id, roleType]
    );

    if (existingPending && existingPending.length > 0) {
      return NextResponse.json(
        {
          status: false,
          message: `Pendaftaran ${roleType === "admin" ? "Admin" : "Volunteer"} Anda sebelumnya masih dalam status diproses.`,
        },
        { status: 409 }
      );
    }

    // Fetch latest member info from anggota table
    const memberRows = await query<any[]>(
      `SELECT id, no_anggota, nama_lengkap, id_line, discord, kontak_platform, kontak_id
       FROM \`anggota\` WHERE \`id\` = ? LIMIT 1`,
      [session.id]
    );
    const member = memberRows?.[0];

    const noAnggota = member?.no_anggota || session.noAnggota || `ID-${session.id}`;
    const namaAnggota = member?.nama_lengkap || session.nama || "Anggota Cavallery";
    const idLine = member?.id_line || session.idLine || null;
    const discord = member?.discord || null;
    const kontakPlatform = member?.kontak_platform || null;
    const kontakId = member?.kontak_id || session.kontakId || null;

    const result: any = await query(
      `INSERT INTO \`role_applications\`
       (\`anggota_id\`, \`no_anggota\`, \`nama_anggota\`, \`id_line\`, \`discord\`, \`kontak_platform\`, \`kontak_id\`, \`role_type\`, \`divisi\`, \`alasan\`, \`pengalaman\`, \`ketersediaan\`, \`portofolio_url\`, \`status\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'diproses')`,
      [
        session.id,
        noAnggota,
        namaAnggota,
        idLine,
        discord,
        kontakPlatform,
        kontakId,
        roleType,
        divisi,
        alasan,
        pengalaman,
        ketersediaan,
        portofolioUrl,
      ]
    );

    const insertedId = result?.insertId;
    const createdRows = insertedId
      ? await query<RoleApplication[]>("SELECT * FROM `role_applications` WHERE `id` = ? LIMIT 1", [insertedId])
      : [];

    return NextResponse.json({
      status: true,
      message: `Pendaftaran ${roleType === "admin" ? "Admin" : "Volunteer"} berhasil dikirim dan sedang diproses oleh tim admin.`,
      data: createdRows?.[0] || null,
    });
  } catch (error: any) {
    console.error("POST /api/role-applications error:", error);
    return NextResponse.json(
      { status: false, message: error?.message || "Gagal mengirim pendaftaran" },
      { status: 500 }
    );
  }
}
