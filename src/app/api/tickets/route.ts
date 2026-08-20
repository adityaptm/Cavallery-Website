import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { query, isMySqlConfigured } from "@/lib/mysql";

const isVercel = process.env.VERCEL === "1";
const DATA_DIR = isVercel ? "/tmp" : path.join(process.cwd(), "src", "data");
const TICKETS_PATH = path.join(DATA_DIR, "tickets.json");

function ensureDataDirectory() {
  const dir = path.dirname(TICKETS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readTicketsLocal(): any[] {
  ensureDataDirectory();
  if (fs.existsSync(TICKETS_PATH)) {
    try {
      const content = fs.readFileSync(TICKETS_PATH, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Error reading tickets.json:", e);
    }
  }
  return [];
}

function writeTicketsLocal(data: any[]) {
  ensureDataDirectory();
  fs.writeFileSync(TICKETS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `tickets` ORDER BY `id` DESC");
      if (rows && Array.isArray(rows)) {
        const formatted = rows.map((r) => ({
          id: r.id,
          date: r.date_label || r.created_at,
          name: r.name,
          no_anggota: r.no_anggota || "-",
          kategori: r.kategori || "Lainnya",
          pesan: r.pesan,
          divisi: r.divisi || "-",
          status: r.status || "Pending",
        }));
        return NextResponse.json(formatted);
      }
    }

    const localData = readTicketsLocal();
    return NextResponse.json(localData);
  } catch (e) {
    console.error("Error fetching tickets:", e);
    return NextResponse.json(readTicketsLocal());
  }
}

export async function POST(request: Request) {
  try {
    let name = "";
    let no_anggota = "";
    let kategori = "";
    let pesan = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("form-data") || contentType.includes("multipart")) {
      const formData = await request.formData();
      name = (formData.get("Nama") as string) || (formData.get("name") as string) || "Anonymous";
      no_anggota = (formData.get("no_anggota") as string) || "-";
      kategori = (formData.get("kategori") as string) || "Lainnya";
      pesan = (formData.get("pesan") as string) || "";
    } else {
      const json = await request.json();
      name = json.Nama || json.name || "Anonymous";
      no_anggota = json.no_anggota || "-";
      kategori = json.kategori || "Lainnya";
      pesan = json.pesan || "";
    }

    if (!pesan.trim()) {
      return NextResponse.json({ status: false, message: "Pesan tidak boleh kosong" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const dateLabel = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    if (isMySqlConfigured()) {
      await query(
        "INSERT INTO `tickets` (`date_label`, `name`, `no_anggota`, `kategori`, `pesan`, `is_active`) VALUES (?, ?, ?, ?, ?, 1)",
        [dateLabel, name.trim(), no_anggota.trim(), kategori.trim(), pesan.trim()]
      );
    }

    // Also update local JSON
    const data = readTicketsLocal();
    const newEntry = {
      id: data.length > 0 ? Math.max(...data.map((d: any) => d.id || 0)) + 1 : 1,
      date: now,
      name: name.trim(),
      no_anggota: no_anggota.trim(),
      kategori: kategori.trim(),
      pesan: pesan.trim(),
    };
    data.unshift(newEntry);
    writeTicketsLocal(data);

    return NextResponse.json({ status: true, message: "Ticket saved successfully", data: newEntry });
  } catch (error: any) {
    console.error("POST Ticket Error:", error);
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const json = await request.json();
    const { id, divisi, status, name, pesan, kategori, no_anggota } = json;

    if (!id) return NextResponse.json({ status: false, message: "ID required" }, { status: 400 });

    if (isMySqlConfigured()) {
      const sets: string[] = [];
      const vals: any[] = [];
      if (name !== undefined)       { sets.push("`name`=?");       vals.push(name); }
      if (no_anggota !== undefined)  { sets.push("`no_anggota`=?"); vals.push(no_anggota); }
      if (kategori !== undefined)    { sets.push("`kategori`=?");   vals.push(kategori); }
      if (pesan !== undefined)       { sets.push("`pesan`=?");      vals.push(pesan); }
      if (divisi !== undefined)      { sets.push("`divisi`=?");     vals.push(divisi); }
      if (status !== undefined)      { sets.push("`status`=?");     vals.push(status); }
      if (sets.length > 0) {
        vals.push(id);
        await query(`UPDATE \`tickets\` SET ${sets.join(", ")} WHERE \`id\`=?`, vals);
      }
    }

    const data = readTicketsLocal();
    const index = data.findIndex((item: any) => item.id === Number(id));
    if (index !== -1) {
      data[index] = { ...data[index], ...json };
      writeTicketsLocal(data);
    }

    return NextResponse.json({ status: true, message: "Updated" });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ status: false, message: "ID required" }, { status: 400 });

    if (isMySqlConfigured()) {
      await query("DELETE FROM `tickets` WHERE `id`=?", [id]);
    }

    const data = readTicketsLocal();
    const filtered = data.filter((item: any) => item.id !== Number(id));
    writeTicketsLocal(filtered);

    return NextResponse.json({ status: true, message: "Deleted" });
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error.message }, { status: 500 });
  }
}
