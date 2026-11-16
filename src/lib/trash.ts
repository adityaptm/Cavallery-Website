import { query, isMySqlConfigured } from "@/lib/mysql";
import { logActivity } from "@/lib/logger";

export interface TrashItem {
  id: number;
  entity_type: string;
  entity_id: string;
  title: string | null;
  payload: any;
  deleted_by: string;
  deleted_at: string;
}

// In-memory fallback if MySQL is unavailable
const inMemoryTrash: TrashItem[] = [];

let hasEnsuredTrashTable = false;
export async function ensureTrashTable(): Promise<void> {
  if (hasEnsuredTrashTable) return;
  if (!isMySqlConfigured()) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_trash (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL COMMENT 'Modul asal: news, timeline, gallery, setlists, dll',
        entity_id VARCHAR(100) NOT NULL COMMENT 'ID atau primary key asli',
        title VARCHAR(255) NULL COMMENT 'Nama atau judul item',
        payload LONGTEXT NOT NULL COMMENT 'Data utuh format JSON',
        deleted_by VARCHAR(100) NOT NULL DEFAULT 'Admin' COMMENT 'Username admin yang menghapus',
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_entity_type (entity_type),
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    hasEnsuredTrashTable = true;
  } catch (err: any) {
    console.warn("[Trash] Failed to ensure admin_trash table:", err?.message || err);
    hasEnsuredTrashTable = true;
  }
}

/** Pindahkan data yang dihapus ke tempat sampah (Trash) */
export async function moveToTrash(params: {
  entity_type: string;
  entity_id: string | number;
  title?: string | null;
  payload: any;
  deleted_by?: string;
}): Promise<boolean> {
  const { entity_type, entity_id, title = null, payload, deleted_by = "Admin" } = params;
  await ensureTrashTable();

  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  const cleanTitle = (title || "").toString().slice(0, 255) || null;

  if (isMySqlConfigured()) {
    try {
      await query(
        `INSERT INTO admin_trash (entity_type, entity_id, title, payload, deleted_by, deleted_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [entity_type, String(entity_id), cleanTitle, payloadStr, deleted_by || "Admin"]
      );
      return true;
    } catch (err: any) {
      console.error("[Trash] moveToTrash DB error:", err);
    }
  }

  // Memory fallback
  inMemoryTrash.unshift({
    id: Date.now(),
    entity_type,
    entity_id: String(entity_id),
    title: cleanTitle,
    payload,
    deleted_by: deleted_by || "Admin",
    deleted_at: new Date().toISOString(),
  });
  if (inMemoryTrash.length > 300) inMemoryTrash.pop();
  return true;
}

/** Ambil seluruh data di tempat sampah */
export async function getTrashList(entity_type?: string): Promise<TrashItem[]> {
  await ensureTrashTable();

  if (isMySqlConfigured()) {
    try {
      let sql = "SELECT * FROM admin_trash ";
      const params: any[] = [];
      if (entity_type && entity_type !== "all") {
        sql += "WHERE entity_type = ? ";
        params.push(entity_type);
      }
      sql += "ORDER BY id DESC LIMIT 500";
      const rows = await query<any[]>(sql, params);
      if (rows && Array.isArray(rows)) {
        return rows.map((r) => {
          let parsedPayload = r.payload;
          if (typeof r.payload === "string") {
            try {
              parsedPayload = JSON.parse(r.payload);
            } catch {}
          }
          return {
            id: Number(r.id),
            entity_type: r.entity_type,
            entity_id: r.entity_id,
            title: r.title,
            payload: parsedPayload,
            deleted_by: r.deleted_by || "Admin",
            deleted_at: r.deleted_at ? new Date(r.deleted_at).toISOString() : new Date().toISOString(),
          };
        });
      }
    } catch (err: any) {
      console.warn("[Trash] getTrashList DB error:", err);
    }
  }

  return inMemoryTrash.filter((t) => (!entity_type || entity_type === "all" ? true : t.entity_type === entity_type));
}

/** Pulihkan (Restore) item dari tempat sampah kembali ke tabel database aslinya */
export async function restoreTrashItem(id: number, restored_by = "Admin"): Promise<{ success: boolean; message: string }> {
  await ensureTrashTable();

  let item: TrashItem | null = null;
  if (isMySqlConfigured()) {
    const rows = await query<any[]>("SELECT * FROM admin_trash WHERE id = ? LIMIT 1", [id]);
    if (rows && rows.length > 0) {
      const r = rows[0];
      let parsed = r.payload;
      if (typeof r.payload === "string") {
        try { parsed = JSON.parse(r.payload); } catch {}
      }
      item = {
        id: Number(r.id),
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        title: r.title,
        payload: parsed,
        deleted_by: r.deleted_by,
        deleted_at: r.deleted_at,
      };
    }
  } else {
    item = inMemoryTrash.find((t) => t.id === id) || null;
  }

  if (!item) {
    return { success: false, message: "Item di tempat sampah tidak ditemukan" };
  }

  const { entity_type, payload } = item;
  if (!payload || typeof payload !== "object") {
    return { success: false, message: "Data payload item rusak atau tidak valid" };
  }

  // Tentukan target tabel berdasarkan entity_type
  let targetTable = entity_type;
  if (entity_type === "news") targetTable = "news";
  else if (entity_type === "timeline") targetTable = "timeline";
  else if (entity_type === "gallery") targetTable = "gallery";
  else if (entity_type === "setlists") targetTable = "setlists";
  else if (entity_type === "stats") targetTable = "stats";
  else if (entity_type === "funfacts") targetTable = "funfacts";
  else if (entity_type === "kabesha") targetTable = "kabesha";
  else if (entity_type === "youtube") targetTable = "youtube_videos";

  if (isMySqlConfigured()) {
    try {
      // Ambil daftar kolom asli dari tabel target
      const columns = await query<any[]>(`SHOW COLUMNS FROM \`${targetTable}\``);
      if (!columns || columns.length === 0) {
        throw new Error(`Tabel target \`${targetTable}\` tidak ditemukan`);
      }

      const validColNames = new Set(columns.map((c: any) => c.Field));
      const insertData: Record<string, any> = {};

      for (const [k, v] of Object.entries(payload)) {
        if (validColNames.has(k)) {
          // Format objek / array ke string bila perlu
          if (Array.isArray(v) || (typeof v === "object" && v !== null && !(v instanceof Date))) {
            insertData[k] = JSON.stringify(v);
          } else {
            insertData[k] = v;
          }
        }
      }

      const keys = Object.keys(insertData);
      if (keys.length === 0) {
        throw new Error("Tidak ada field yang valid untuk dipulihkan");
      }

      const placeholders = keys.map(() => "?").join(", ");
      const updateClause = keys.map((k) => `\`${k}\` = VALUES(\`${k}\`)`).join(", ");
      const values = keys.map((k) => insertData[k]);

      const restoreSql = `INSERT INTO \`${targetTable}\` (\`${keys.join("`, `")}\`) 
                          VALUES (${placeholders}) 
                          ON DUPLICATE KEY UPDATE ${updateClause}`;

      await query(restoreSql, values);

      // Hapus dari tabel trash
      await query("DELETE FROM admin_trash WHERE id = ?", [id]);

      // Catat log aktivitas restore
      await logActivity({
        username: restored_by || "Admin",
        action: "Pulihkan Data",
        module: "TRASH",
        details: `Memulihkan ${entity_type} "${item.title || item.entity_id}" kembali ke sistem`,
      });

      return { success: true, message: `Data "${item.title || item.entity_id}" berhasil dipulihkan!` };
    } catch (err: any) {
      console.error("[Trash] Restore error:", err);
      return { success: false, message: `Gagal memulihkan: ${err?.message || "Kesalahan database"}` };
    }
  }

  // Fallback memory
  const idx = inMemoryTrash.findIndex((t) => t.id === id);
  if (idx !== -1) inMemoryTrash.splice(idx, 1);

  return { success: true, message: `Data "${item.title || item.entity_id}" berhasil dipulihkan (in-memory)` };
}

/** Hapus permanen satu item dari tempat sampah */
export async function deletePermanentTrash(id: number, deleted_by = "Admin"): Promise<{ success: boolean; message: string }> {
  await ensureTrashTable();

  if (isMySqlConfigured()) {
    try {
      const rows = await query<any[]>("SELECT * FROM admin_trash WHERE id = ? LIMIT 1", [id]);
      const title = rows?.[0]?.title || rows?.[0]?.entity_id || `#${id}`;

      await query("DELETE FROM admin_trash WHERE id = ?", [id]);

      await logActivity({
        username: deleted_by || "Admin",
        action: "Hapus Permanen",
        module: "TRASH",
        details: `Menghapus permanen item trash: ${title}`,
      });

      return { success: true, message: "Item berhasil dihapus permanen" };
    } catch (err: any) {
      return { success: false, message: err?.message || "Gagal menghapus permanen" };
    }
  }

  const idx = inMemoryTrash.findIndex((t) => t.id === id);
  if (idx !== -1) inMemoryTrash.splice(idx, 1);
  return { success: true, message: "Item berhasil dihapus permanen" };
}

/** Kosongkan seluruh tempat sampah */
export async function emptyTrash(deleted_by = "Admin"): Promise<{ success: boolean; message: string }> {
  await ensureTrashTable();

  if (isMySqlConfigured()) {
    try {
      await query("TRUNCATE TABLE admin_trash");

      await logActivity({
        username: deleted_by || "Admin",
        action: "Kosongkan Sampah",
        module: "TRASH",
        details: "Mengosongkan seluruh tabel admin_trash secara permanen",
      });

      return { success: true, message: "Seluruh tempat sampah berhasil dikosongkan" };
    } catch (err: any) {
      return { success: false, message: err?.message || "Gagal mengosongkan tempat sampah" };
    }
  }

  inMemoryTrash.length = 0;
  return { success: true, message: "Seluruh tempat sampah berhasil dikosongkan" };
}
