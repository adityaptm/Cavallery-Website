import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import {
  createStructureNode,
  getAllNodes,
  getFullStructure,
  NodeType,
  Placement,
} from "@/lib/structure";

export const dynamic = "force-dynamic";

const denied = () =>
  NextResponse.json(
    { status: false, message: "Akses ditolak. Silakan login sebagai admin." },
    { status: 401 }
  );

// GET /api/admin/structure/nodes: Ambil semua node (termasuk non-aktif) untuk dashboard admin
export async function GET(req: NextRequest) {
  if (!getAdminSessionFromReq(req)) return denied();

  try {
    const full = await getFullStructure(false);
    return NextResponse.json({
      status: true,
      tree: full.tree,
      nodes: full.nodes,
      settings: full.settings,
    });
  } catch (error: any) {
    console.error("[Admin Structure GET Error]:", error);
    return NextResponse.json(
      { status: false, message: error?.message || "Gagal memuat data" },
      { status: 500 }
    );
  }
}

// POST /api/admin/structure/nodes: Tambah node baru
export async function POST(req: NextRequest) {
  if (!getAdminSessionFromReq(req)) return denied();

  try {
    const body = await req.json();

    const role_label = (body.role_label || "").trim();
    if (!role_label) {
      return NextResponse.json(
        { status: false, message: "Jabatan atau nama unit wajib diisi" },
        { status: 400 }
      );
    }

    const node_type = body.node_type as NodeType;
    const validTypes: NodeType[] = ["root", "leader", "unit", "group", "member"];
    if (!validTypes.includes(node_type)) {
      return NextResponse.json(
        { status: false, message: "Tipe node tidak valid" },
        { status: 400 }
      );
    }

    let parent_id = body.parent_id !== undefined && body.parent_id !== null && body.parent_id !== ""
      ? Number(body.parent_id)
      : null;

    if (node_type === "root") {
      parent_id = null;
    } else if (parent_id === null || isNaN(parent_id)) {
      return NextResponse.json(
        { status: false, message: "Parent node wajib dipilih" },
        { status: 400 }
      );
    }

    let accent_color: string | null = null;
    if (node_type === "unit" && body.accent_color) {
      const color = String(body.accent_color).trim();
      if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return NextResponse.json(
          { status: false, message: "Format warna aksen harus hex 6 digit (contoh: #3f7d6e)" },
          { status: 400 }
        );
      }
      accent_color = color;
    }

    const placement: Placement = body.placement === "below" ? "below" : "normal";
    const person_name = body.person_name ? String(body.person_name).trim() : null;
    const avatar_url = body.avatar_url ? String(body.avatar_url).trim() : null;
    const is_active = body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1;
    const sort_order = body.sort_order !== undefined ? Number(body.sort_order) : undefined;

    const newNode = await createStructureNode({
      parent_id,
      node_type,
      placement,
      role_label,
      person_name,
      accent_color,
      avatar_url,
      sort_order,
      is_active,
    });

    return NextResponse.json({
      status: true,
      message: `Node "${role_label}" berhasil ditambahkan.`,
      data: newNode,
    });
  } catch (error: any) {
    console.error("[Admin Structure Node POST Error]:", error);
    return NextResponse.json(
      { status: false, message: error?.message || "Gagal menambahkan node" },
      { status: 400 }
    );
  }
}
