import { NextRequest, NextResponse } from "next/server";
import { query, isMySqlConfigured } from "@/lib/mysql";
import { getFallbackActivityLogs, getFallbackLoginLogs, logActivity } from "@/lib/logger";
import { getAdminSessionFromReq } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "activity";

  if (isMySqlConfigured()) {
    try {
      if (type === "login") {
        const rows = await query<any[]>(
          `SELECT l.id, l.username, COALESCE(u.name, a.nama, l.username) AS name, l.status, l.ip_address, l.user_agent, l.created_at 
           FROM login_logs l
           LEFT JOIN admin_users u ON LOWER(TRIM(u.username)) = LOWER(TRIM(l.username))
           LEFT JOIN admin a ON LOWER(TRIM(a.username)) = LOWER(TRIM(l.username))
           ORDER BY l.id DESC LIMIT 500`
        );
        return NextResponse.json({ success: true, data: rows || [] });
      } else {
        const rows = await query<any[]>(
          `SELECT l.id, l.username, COALESCE(u.name, a.nama, l.username) AS name, l.action, l.module, l.details, l.ip_address, l.created_at 
           FROM activity_logs l
           LEFT JOIN admin_users u ON LOWER(TRIM(u.username)) = LOWER(TRIM(l.username))
           LEFT JOIN admin a ON LOWER(TRIM(a.username)) = LOWER(TRIM(l.username))
           ORDER BY l.id DESC LIMIT 500`
        );
        return NextResponse.json({ success: true, data: rows || [] });
      }
    } catch (e: any) {
      console.warn(`MySQL fetch ${type} logs failed:`, e.message);
    }
  }

  // Memory fallback
  const fallbackData = type === "login" ? getFallbackLoginLogs() : getFallbackActivityLogs();
  return NextResponse.json({ success: true, data: fallbackData });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = getAdminSessionFromReq(req);
    const { action, type = "activity", ids, module = "Dashboard", details, actionName = "Edit Data" } = body;
    const resolvedUsername =
      (body.username && body.username !== "unknown" ? String(body.username).trim() : "") ||
      session?.username ||
      session?.nama ||
      "Admin";

    // 0. LOG ACTIVITY FROM DASHBOARD
    if (action === "log_activity") {
      await logActivity({
        username: resolvedUsername,
        action: actionName,
        module,
        details,
        ip_address: req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip")?.trim() || "127.0.0.1",
      });
      return NextResponse.json({ success: true, message: "Aktivitas berhasil dicatat" });
    }

    // 1. DELETE SELECTED LOGS (PILIH SEMUA / BEBERAPA)
    if (action === "delete") {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ success: false, message: "Pilih setidaknya satu log untuk dihapus" }, { status: 400 });
      }

      if (isMySqlConfigured()) {
        try {
          const tableName = type === "login" ? "login_logs" : "activity_logs";
          const placeholders = ids.map(() => "?").join(",");
          await query(`DELETE FROM ${tableName} WHERE id IN (${placeholders})`, ids);

          await logActivity({
            username: resolvedUsername,
            action: "Hapus Log",
            module: type === "login" ? "Riwayat Login" : "Riwayat Aktivitas",
            details: `Menghapus ${ids.length} entri log`,
          });

          return NextResponse.json({ success: true, message: `${ids.length} log berhasil dihapus` });
        } catch (e: any) {
          console.error("MySQL delete logs error:", e.message);
        }
      }

      // Memory fallback
      const list: any[] = type === "login" ? getFallbackLoginLogs() : getFallbackActivityLogs();
      const idSet = new Set(ids);
      for (let i = list.length - 1; i >= 0; i--) {
        if (idSet.has(list[i].id)) list.splice(i, 1);
      }

      return NextResponse.json({ success: true, message: `${ids.length} log berhasil dihapus` });
    }

    // 2. CLEAR ALL LOGS (HAPUS SEMUA)
    if (action === "clear_all") {
      if (isMySqlConfigured()) {
        try {
          const tableName = type === "login" ? "login_logs" : "activity_logs";
          await query(`TRUNCATE TABLE ${tableName}`);

          await logActivity({
            username: resolvedUsername,
            action: "Bersihkan Semua Log",
            module: type === "login" ? "Riwayat Login" : "Riwayat Aktivitas",
            details: `Membersihkan seluruh tabel log ${tableName}`,
          });

          return NextResponse.json({ success: true, message: "Semua riwayat log berhasil dibersihkan" });
        } catch (e: any) {
          console.error("MySQL clear all logs error:", e.message);
        }
      }

      // Memory fallback
      const list: any[] = type === "login" ? getFallbackLoginLogs() : getFallbackActivityLogs();
      list.length = 0;

      return NextResponse.json({ success: true, message: "Semua riwayat log berhasil dibersihkan" });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenal" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
