import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import {
  deleteStructureNode,
  getDescendantIds,
  updateStructureNode,
  Placement,
} from "@/lib/structure";
import { query } from "@/lib/mysql";

export const dynamic = "force-dynamic";

const denied = () =>
  NextResponse.json(
    { status: false, message: "Akses ditolak. Silakan login sebagai admin." },
    { status: 401 }
  );

// GET /api/admin/structure/nodes/[id]: Detail node & jumlah keturunan yang akan terpengaruh jika dihapus
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!getAdminSessionFromReq(req)) return denied();

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      return NextResponse.json({ status: false, message: "ID tidak valid" }, { status: 400 });
    }

    const rows = await query<any[]>("SELECT * FROM structure_nodes WHERE id = ?", [id]);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ status: false, message: "Node tidak ditemukan" }, { status: 404 });
    }

    const descendantIds = await getDescendantIds(id);

    return NextResponse.json({
      status: true,
      node: rows[0],
      descendantCount: descendantIds.length,
      descendantIds,
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error?.message || "Gagal memuat detail node" }, { status: 500 });
  }
}

// PATCH /api/admin/structure/nodes/[id]: Ubah data node
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!getAdminSessionFromReq(req)) return denied();

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      return NextResponse.json({ status: false, message: "ID tidak valid" }, { status: 400 });
    }

    const body = await req.json();

    const updated = await updateStructureNode(id, {
      role_label: body.role_label,
      person_name: body.person_name,
      accent_color: body.accent_color,
      avatar_url: body.avatar_url !== undefined ? (body.avatar_url ? String(body.avatar_url).trim() : null) : undefined,
      placement: body.placement as Placement,
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
      is_active: body.is_active,
      parent_id: body.parent_id !== undefined ? (body.parent_id === null ? null : Number(body.parent_id)) : undefined,
    });

    return NextResponse.json({
      status: true,
      message: `Node "${updated.role_label}" berhasil diperbarui.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("[Admin Structure Node PATCH Error]:", error);
    return NextResponse.json(
      { status: false, message: error?.message || "Gagal memperbarui node" },
      { status: 400 }
    );
  }
}

// DELETE /api/admin/structure/nodes/[id]: Hapus node beserta seluruh keturunannya
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!getAdminSessionFromReq(req)) return denied();

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!id || isNaN(id)) {
      return NextResponse.json({ status: false, message: "ID tidak valid" }, { status: 400 });
    }

    const { deletedId, affectedCount } = await deleteStructureNode(id);

    return NextResponse.json({
      status: true,
      message: `Berhasil menghapus node (${affectedCount} item dihapus).`,
      deletedId,
      affectedCount,
    });
  } catch (error: any) {
    console.error("[Admin Structure Node DELETE Error]:", error);
    return NextResponse.json(
      { status: false, message: error?.message || "Gagal menghapus node" },
      { status: 400 }
    );
  }
}
