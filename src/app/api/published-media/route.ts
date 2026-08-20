import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { query, isMySqlConfigured } from "@/lib/mysql";

const isVercel = process.env.VERCEL === "1";
const dataDir = isVercel ? "/tmp" : path.join(process.cwd(), "src", "data");
const filePath = path.join(dataDir, "published-media.json");
const staticPath = path.join(process.cwd(), "src", "data", "published-media.json");

function readPublishedLocal(): string[] {
  try {
    const target = fs.existsSync(filePath) ? filePath : (fs.existsSync(staticPath) ? staticPath : null);
    if (target) {
      const raw = fs.readFileSync(target, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.publishedIds)) {
        return parsed.publishedIds;
      }
    }
  } catch {}
  return [];
}

function savePublishedLocal(ids: string[]) {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify({ publishedIds: ids }, null, 2), "utf-8");
    if (!isVercel && filePath !== staticPath) {
      fs.writeFileSync(staticPath, JSON.stringify({ publishedIds: ids }, null, 2), "utf-8");
    }
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT `id`, `r2_key`, `file_name` FROM `media` WHERE `is_published`=1");
      if (rows && Array.isArray(rows)) {
        const publishedIds = rows.map((r) => String(r.id || r.r2_key || r.file_name));
        return NextResponse.json({ success: true, publishedIds }, { status: 200 });
      }
    }
    const publishedIds = readPublishedLocal();
    return NextResponse.json({ success: true, publishedIds }, { status: 200 });
  } catch {
    return NextResponse.json({ success: true, publishedIds: readPublishedLocal() }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, ids, isPublished } = body;
    let current = readPublishedLocal();

    if (action === "toggle") {
      if (current.includes(id)) {
        current = current.filter((item) => item !== id);
      } else {
        current.push(id);
      }
      if (isMySqlConfigured()) {
        const willPublish = current.includes(id);
        await query("UPDATE `media` SET `is_published`=? WHERE `id`=? OR `r2_key`=? OR `file_name`=?", [willPublish ? 1 : 0, id, id, id]);
      }
    } else if (action === "set") {
      if (isPublished) {
        if (!current.includes(id)) current.push(id);
      } else {
        current = current.filter((item) => item !== id);
      }
      if (isMySqlConfigured()) {
        await query("UPDATE `media` SET `is_published`=? WHERE `id`=? OR `r2_key`=? OR `file_name`=?", [isPublished ? 1 : 0, id, id, id]);
      }
    } else if (action === "setAll" && Array.isArray(ids)) {
      current = ids;
      if (isMySqlConfigured()) {
        await query("UPDATE `media` SET `is_published`=0");
        for (const singleId of ids) {
          await query("UPDATE `media` SET `is_published`=1 WHERE `id`=? OR `r2_key`=? OR `file_name`=?", [singleId, singleId, singleId]);
        }
      }
    }

    savePublishedLocal(current);
    return NextResponse.json({ success: true, publishedIds: current }, { status: 200 });
  } catch {
    return NextResponse.json({ success: false, message: "Gagal menyimpan status publikasi" }, { status: 500 });
  }
}
