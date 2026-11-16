import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromReq } from "@/lib/auth";
import {
  getTrashList,
  moveToTrash,
  restoreTrashItem,
  deletePermanentTrash,
  emptyTrash,
} from "@/lib/trash";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminSessionFromReq(req);
    if (!admin) {
      return NextResponse.json({ status: false, message: "Akses ditolak" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";

    const items = await getTrashList(type);
    return NextResponse.json({ status: true, data: items });
  } catch (err: any) {
    console.error("[Admin Trash GET Error]:", err);
    return NextResponse.json({ status: false, message: err?.message || "Gagal memuat data sampah" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminSessionFromReq(req);
    if (!admin) {
      return NextResponse.json({ status: false, message: "Akses ditolak" }, { status: 401 });
    }

    const body = await req.json();
    const action = body.action;
    const operator = admin.username || admin.nama || body.username || "Admin";

    // 1. Move to trash
    if (action === "trash") {
      const { entity_type, entity_id, title, payload } = body;
      if (!entity_type || !entity_id) {
        return NextResponse.json({ status: false, message: "Parameter entity_type dan entity_id wajib diisi" }, { status: 400 });
      }

      await moveToTrash({
        entity_type,
        entity_id,
        title,
        payload,
        deleted_by: operator,
      });

      return NextResponse.json({ status: true, message: "Data berhasil dipindahkan ke Tempat Sampah" });
    }

    // 2. Restore item
    if (action === "restore") {
      const id = Number(body.id);
      if (!id) {
        return NextResponse.json({ status: false, message: "ID item tidak valid" }, { status: 400 });
      }

      const res = await restoreTrashItem(id, operator);

      // Revalidate cache paths
      try {
        revalidatePath("/");
        revalidatePath("/news");
        revalidatePath("/gallery");
        revalidatePath("/about/cavallery");
      } catch {}

      return NextResponse.json({ status: res.success, message: res.message });
    }

    // 3. Delete permanently
    if (action === "delete_permanent") {
      const id = Number(body.id);
      if (!id) {
        return NextResponse.json({ status: false, message: "ID item tidak valid" }, { status: 400 });
      }

      const res = await deletePermanentTrash(id, operator);
      return NextResponse.json({ status: res.success, message: res.message });
    }

    // 4. Empty trash
    if (action === "empty_trash") {
      const res = await emptyTrash(operator);
      return NextResponse.json({ status: res.success, message: res.message });
    }

    return NextResponse.json({ status: false, message: "Aksi tidak dikenal" }, { status: 400 });
  } catch (err: any) {
    console.error("[Admin Trash POST Error]:", err);
    return NextResponse.json({ status: false, message: err?.message || "Gagal memproses aksi trash" }, { status: 500 });
  }
}
