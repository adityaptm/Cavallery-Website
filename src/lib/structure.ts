// ============================================================
// STRUKTUR ORGANISASI CAVALLERY — Data Access Helper
// Mengelola tabel structure_nodes dan structure_settings di MySQL
// ============================================================
import { query } from "@/lib/mysql";

export type NodeType = "root" | "leader" | "unit" | "group" | "member";
export type Placement = "normal" | "below";

export interface StructureNode {
  id: number;
  parent_id: number | null;
  node_type: NodeType;
  placement: Placement;
  role_label: string;
  person_name: string | null;
  accent_color: string | null;
  avatar_url: string | null;
  sort_order: number;
  is_active: number;
  created_at?: string;
  updated_at?: string;
}

export interface TreeNode extends StructureNode {
  children: TreeNode[];
  belowChildren?: TreeNode[];
  inherited_accent_color: string;
}

export interface StructureSettings {
  chart_title: string;
  logo_url: string;
}

const DEFAULT_SETTINGS: StructureSettings = {
  chart_title: "Cavallery's Castle Structure",
  logo_url: "/uploads/cavallery/images/2026/10/1792248958349_logo_struktur.png",
};

export const DEFAULT_LEADER_ACCENT = "#8c5a43";

// Cache in-memory singkat untuk performa GET
let cachedData: {
  tree: TreeNode | null;
  nodes: StructureNode[];
  settings: StructureSettings;
  timestamp: number;
} | null = null;
const CACHE_TTL_MS = 15000; // 15 detik di server

export function invalidateStructureCache() {
  cachedData = null;
}

/** Ambil seluruh pengaturan bagan dari structure_settings */
export async function getStructureSettings(): Promise<StructureSettings> {
  try {
    const rows = await query<{ setting_key: string; setting_value: string }[]>(
      "SELECT setting_key, setting_value FROM structure_settings"
    );
    if (!rows || !Array.isArray(rows)) return { ...DEFAULT_SETTINGS };

    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.setting_key] = r.setting_value;
    }

    return {
      chart_title: map.chart_title || DEFAULT_SETTINGS.chart_title,
      logo_url: map.logo_url || DEFAULT_SETTINGS.logo_url,
    };
  } catch (error) {
    console.error("Error reading structure_settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

/** Update pengaturan bagan */
export async function updateStructureSettings(
  settings: Partial<StructureSettings>
): Promise<StructureSettings> {
  invalidateStructureCache();
  if (settings.chart_title !== undefined) {
    await query(
      `INSERT INTO structure_settings (setting_key, setting_value) 
       VALUES ('chart_title', ?) 
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [settings.chart_title.trim()]
    );
  }
  if (settings.logo_url !== undefined) {
    await query(
      `INSERT INTO structure_settings (setting_key, setting_value) 
       VALUES ('logo_url', ?) 
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP`,
      [settings.logo_url.trim()]
    );
  }
  return getStructureSettings();
}

let hasEnsuredAvatarCol = false;
export async function ensureAvatarColumn(): Promise<void> {
  if (hasEnsuredAvatarCol) return;
  try {
    const cols = await query<any[]>("SHOW COLUMNS FROM structure_nodes LIKE 'avatar_url'");
    if (cols && cols.length === 0) {
      await query("ALTER TABLE structure_nodes ADD COLUMN avatar_url VARCHAR(500) NULL AFTER accent_color");
    }
    hasEnsuredAvatarCol = true;
  } catch {
    hasEnsuredAvatarCol = true;
  }
}

/** Ambil semua node dari structure_nodes */
export async function getAllNodes(onlyActive = false): Promise<StructureNode[]> {
  await ensureAvatarColumn();
  const sql = onlyActive
    ? "SELECT * FROM structure_nodes WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
    : "SELECT * FROM structure_nodes ORDER BY sort_order ASC, id ASC";

  const rows = await query<any[]>(sql);
  if (!rows || !Array.isArray(rows)) return [];

  return rows.map((r) => ({
    id: Number(r.id),
    parent_id: r.parent_id !== null && r.parent_id !== undefined ? Number(r.parent_id) : null,
    node_type: r.node_type as NodeType,
    placement: (r.placement === "below" ? "below" : "normal") as Placement,
    role_label: String(r.role_label || ""),
    person_name: r.person_name ? String(r.person_name) : null,
    accent_color: r.accent_color ? String(r.accent_color) : null,
    avatar_url: r.avatar_url ? String(r.avatar_url) : (r.photo_url ? String(r.photo_url) : null),
    sort_order: Number(r.sort_order || 0),
    is_active: Number(r.is_active ?? 1),
    created_at: r.created_at ? String(r.created_at) : undefined,
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  }));
}

/**
 * Membangun pohon hierarki lengkap dari daftar node flat (Adjacency List).
 * - Menentukan inherited_accent_color:
 *   Root dan Leader memakai #8c5a43.
 *   Unit menjadi sumber warna aksen dan mewariskan ke semua keturunannya.
 */
export function buildStructureTree(nodes: StructureNode[]): TreeNode | null {
  if (!nodes || nodes.length === 0) return null;

  // Map semua node ke TreeNode
  const nodeMap = new Map<number, TreeNode>();
  let rootNode: TreeNode | null = null;

  for (const n of nodes) {
    const item: TreeNode = {
      ...n,
      children: [],
      belowChildren: [],
      inherited_accent_color: n.accent_color || DEFAULT_LEADER_ACCENT,
    };
    nodeMap.set(n.id, item);
    if (n.node_type === "root" && !rootNode) {
      rootNode = item;
    }
  }

  // Jika tidak ada root eksplisit bertipe 'root', cari node tanpa parent
  if (!rootNode) {
    const candidate = nodes.find((n) => n.parent_id === null);
    if (candidate) {
      rootNode = nodeMap.get(candidate.id) || null;
    }
  }

  if (!rootNode) return null;

  // Sambungkan children ke parent masing-masing
  for (const n of nodes) {
    if (n.parent_id !== null) {
      const parent = nodeMap.get(n.parent_id);
      const child = nodeMap.get(n.id);
      if (parent && child) {
        if (child.placement === "below") {
          child.inherited_accent_color = parent.inherited_accent_color;
          parent.belowChildren!.push(child);
        } else {
          parent.children.push(child);
        }
      }
    }
  }

  // Turunkan warna aksen dari unit ke seluruh keturunannya
  function propagateColors(node: TreeNode, inheritedColor: string) {
    let effectiveColor = inheritedColor;

    if (node.node_type === "root" || node.node_type === "leader") {
      effectiveColor = DEFAULT_LEADER_ACCENT;
    } else if (node.node_type === "unit") {
      effectiveColor = node.accent_color || inheritedColor;
    }

    node.inherited_accent_color = effectiveColor;

    for (const child of node.children) {
      propagateColors(child, effectiveColor);
    }
    if (node.belowChildren) {
      for (const child of node.belowChildren) {
        propagateColors(child, effectiveColor);
      }
    }
  }

  propagateColors(rootNode, DEFAULT_LEADER_ACCENT);

  return rootNode;
}

/** Ambil data bagan lengkap (pohon + settings + flat nodes) */
export async function getFullStructure(onlyActive = true): Promise<{
  tree: TreeNode | null;
  nodes: StructureNode[];
  settings: StructureSettings;
}> {
  const now = Date.now();
  if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS && onlyActive) {
    return {
      tree: cachedData.tree,
      nodes: cachedData.nodes,
      settings: cachedData.settings,
    };
  }

  const [nodes, settings] = await Promise.all([
    getAllNodes(onlyActive),
    getStructureSettings(),
  ]);

  const tree = buildStructureTree(nodes);

  if (onlyActive) {
    cachedData = { tree, nodes, settings, timestamp: now };
  }

  return { tree, nodes, settings };
}

/** Ambil seluruh ID keturunan dari suatu node (rekursif) */
export async function getDescendantIds(nodeId: number): Promise<number[]> {
  const allNodes = await getAllNodes(false);
  const result: number[] = [];
  const queue = [nodeId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = allNodes.filter((n) => n.parent_id === currentId);
    for (const child of children) {
      result.push(child.id);
      queue.push(child.id);
    }
  }

  return result;
}

/** Tambah node baru */
export async function createStructureNode(data: {
  parent_id: number | null;
  node_type: NodeType;
  placement?: Placement;
  role_label: string;
  person_name?: string | null;
  accent_color?: string | null;
  avatar_url?: string | null;
  sort_order?: number;
  is_active?: number;
}): Promise<StructureNode> {
  await ensureAvatarColumn();
  invalidateStructureCache();

  const roleLabel = (data.role_label || "").trim();
  if (!roleLabel) throw new Error("Jabatan atau nama unit wajib diisi");

  const nodeType = data.node_type;
  const validTypes: NodeType[] = ["root", "leader", "unit", "group", "member"];
  if (!validTypes.includes(nodeType)) {
    throw new Error(`Tipe node tidak valid: ${nodeType}`);
  }

  if (nodeType === "root") {
    const existingRoot = await query<any[]>(
      "SELECT id FROM structure_nodes WHERE node_type = 'root' LIMIT 1"
    );
    if (existingRoot && existingRoot.length > 0) {
      throw new Error("Hanya boleh ada satu node root (Cavallery's Princess)");
    }
  } else {
    if (data.parent_id === null || data.parent_id === undefined) {
      throw new Error("Parent node wajib dipilih");
    }
    const parent = await query<any[]>(
      "SELECT id FROM structure_nodes WHERE id = ? LIMIT 1",
      [data.parent_id]
    );
    if (!parent || parent.length === 0) {
      throw new Error("Parent node tidak ditemukan");
    }
  }

  let accentColor: string | null = null;
  if (nodeType === "unit" && data.accent_color) {
    const color = data.accent_color.trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error("Format warna aksen harus hex 6 digit (contoh: #3f7d6e)");
    }
    accentColor = color;
  }

  let sortOrder = data.sort_order;
  if (sortOrder === undefined) {
    const maxSort = await query<any[]>(
      "SELECT MAX(sort_order) as m FROM structure_nodes WHERE parent_id <=> ?",
      [data.parent_id]
    );
    sortOrder = (maxSort?.[0]?.m ?? 0) + 1;
  }

  const placement = data.placement === "below" ? "below" : "normal";
  const personName = data.person_name?.trim() ? data.person_name.trim() : null;
  const avatarUrl = data.avatar_url?.trim() ? data.avatar_url.trim() : null;
  const isActive = data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1;

  const res = await query<any>(
    `INSERT INTO structure_nodes 
     (parent_id, node_type, placement, role_label, person_name, accent_color, avatar_url, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.parent_id,
      nodeType,
      placement,
      roleLabel,
      personName,
      accentColor,
      avatarUrl,
      sortOrder,
      isActive,
    ]
  );

  const insertId = res?.insertId;
  const created = await query<any[]>(
    "SELECT * FROM structure_nodes WHERE id = ?",
    [insertId]
  );
  if (!created || created.length === 0) {
    throw new Error("Gagal mengambil node yang baru dibuat");
  }
  return created[0] as StructureNode;
}

/** Update node yang sudah ada */
export async function updateStructureNode(
  id: number,
  data: {
    parent_id?: number | null;
    role_label?: string;
    person_name?: string | null;
    accent_color?: string | null;
    avatar_url?: string | null;
    placement?: Placement;
    sort_order?: number;
    is_active?: number | boolean;
  }
): Promise<StructureNode> {
  await ensureAvatarColumn();
  invalidateStructureCache();

  const existing = await query<any[]>(
    "SELECT * FROM structure_nodes WHERE id = ?",
    [id]
  );
  if (!existing || existing.length === 0) {
    throw new Error("Node tidak ditemukan");
  }
  const current = existing[0];

  // Cegah siklus bila parent_id diubah
  if (data.parent_id !== undefined && data.parent_id !== current.parent_id) {
    if (data.parent_id === id) {
      throw new Error("Node tidak dapat menjadi parent untuk dirinya sendiri");
    }
    if (data.parent_id !== null) {
      const descendants = await getDescendantIds(id);
      if (descendants.includes(data.parent_id)) {
        throw new Error(
          "Tidak dapat memindahkan node ke dalam cabang keturunannya sendiri (mencegah siklus)"
        );
      }
      const parent = await query<any[]>(
        "SELECT id FROM structure_nodes WHERE id = ?",
        [data.parent_id]
      );
      if (!parent || parent.length === 0) {
        throw new Error("Parent node tujuan tidak ditemukan");
      }
    }
  }

  let accentColor = current.accent_color;
  if (data.accent_color !== undefined) {
    if (data.accent_color) {
      const color = data.accent_color.trim();
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        throw new Error("Format warna aksen harus hex 6 digit (contoh: #3f7d6e)");
      }
      accentColor = color;
    } else {
      accentColor = null;
    }
  }

  const roleLabel =
    data.role_label !== undefined ? data.role_label.trim() : current.role_label;
  if (!roleLabel) throw new Error("Jabatan atau nama unit wajib diisi");

  const personName =
    data.person_name !== undefined
      ? data.person_name?.trim() || null
      : current.person_name;
  const avatarUrl =
    data.avatar_url !== undefined
      ? data.avatar_url?.trim() || null
      : current.avatar_url;
  const placement =
    data.placement !== undefined
      ? data.placement === "below"
        ? "below"
        : "normal"
      : current.placement;
  const sortOrder =
    data.sort_order !== undefined ? Number(data.sort_order) : current.sort_order;
  const isActive =
    data.is_active !== undefined
      ? Boolean(data.is_active)
        ? 1
        : 0
      : current.is_active;
  const parentId =
    data.parent_id !== undefined ? data.parent_id : current.parent_id;

  await query(
    `UPDATE structure_nodes 
     SET parent_id = ?, role_label = ?, person_name = ?, accent_color = ?, avatar_url = ?, 
         placement = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      parentId,
      roleLabel,
      personName,
      accentColor,
      avatarUrl,
      placement,
      sortOrder,
      isActive,
      id,
    ]
  );

  const updated = await query<any[]>(
    "SELECT * FROM structure_nodes WHERE id = ?",
    [id]
  );
  if (!updated || updated.length === 0) {
    throw new Error("Gagal mengambil node yang diperbarui");
  }
  return updated[0] as StructureNode;
}

/** Hapus node beserta keturunannya */
export async function deleteStructureNode(
  id: number
): Promise<{ deletedId: number; affectedCount: number }> {
  invalidateStructureCache();

  const target = await query<any[]>(
    "SELECT * FROM structure_nodes WHERE id = ?",
    [id]
  );
  if (!target || target.length === 0) {
    throw new Error("Node tidak ditemukan");
  }
  if (target[0].node_type === "root") {
    throw new Error("Node root (Cavallery's Princess) tidak boleh dihapus");
  }

  const descendantIds = await getDescendantIds(id);
  const totalCount = descendantIds.length + 1;

  // MySQL foreign key ON DELETE CASCADE akan menangani anak-anaknya,
  // namun kita juga pastikan menghapus secara eksplisit jika cascading tidak aktif
  if (descendantIds.length > 0) {
    const placeholders = descendantIds.map(() => "?").join(",");
    await query(
      `DELETE FROM structure_nodes WHERE id IN (${placeholders})`,
      descendantIds
    );
  }

  await query("DELETE FROM structure_nodes WHERE id = ?", [id]);

  return { deletedId: id, affectedCount: totalCount };
}

/** Reorder nodes under the same parent */
export async function reorderStructureNodes(
  items: { id: number; sort_order: number }[]
): Promise<boolean> {
  invalidateStructureCache();
  if (!items || items.length === 0) return true;

  for (const item of items) {
    await query(
      "UPDATE structure_nodes SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [Number(item.sort_order), Number(item.id)]
    );
  }
  return true;
}
