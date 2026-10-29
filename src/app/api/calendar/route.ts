import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { query, isMySqlConfigured } from "@/lib/mysql";

const isVercel = process.env.VERCEL === "1";
const DATA_DIR = isVercel ? "/tmp" : path.join(process.cwd(), "src", "data");
const CALENDAR_PATH = path.join(DATA_DIR, "calendar.json");

function ensureDataDirectory() {
  const dir = path.dirname(CALENDAR_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---------- LOCAL JSON FALLBACK ----------
function readCalendarLocal(): any[] {
  ensureDataDirectory();
  if (fs.existsSync(CALENDAR_PATH)) {
    try {
      const content = fs.readFileSync(CALENDAR_PATH, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Error reading calendar.json:", e);
    }
  }
  const defaultCalendar: any[] = [];
  fs.writeFileSync(CALENDAR_PATH, JSON.stringify(defaultCalendar, null, 2), "utf-8");
  return defaultCalendar;
}

function writeCalendarLocal(data: any[]) {
  ensureDataDirectory();
  fs.writeFileSync(CALENDAR_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ---------- MySQL → JSON row mapper ----------
function rowToEvent(row: any) {
  let members: any[] = [];
  try {
    members = typeof row.members_json === "string" ? JSON.parse(row.members_json) : row.members_json || [];
  } catch { members = []; }

  return {
    id: row.id,
    title: row.title,
    date: row.date instanceof Date
      ? row.date.toISOString().slice(0, 10)
      : String(row.date).slice(0, 10),
    startTime: row.start_time || "00:00",
    members,
    url: row.url || "",
    imageUrl: row.image_url || "",
  };
}

import { API_CACHE_HEADERS, fetchWithCacheAndFallback } from "@/lib/apiCache";
import { getMasterShows } from "../theater/route";

import { jkt48ConnectGet, pickList, toWib, type JkcTheaterItem } from "@/lib/jkt48connect";

async function fetchJkt48OfficialEvents(): Promise<any[]> {
  return fetchWithCacheAndFallback<any[]>({
    key: "jkt48_official_events",
    ttlSeconds: 300,
    fetcher: async () => {
      try {
        // JKT48Connect (api.jkt48connect.app): theater shows + other official events
        const [theaterJson, eventJson] = await Promise.all([
          jkt48ConnectGet("/api/theater", { page: 1, perpage: 100, type: "show" }, { revalidate: 300 }),
          jkt48ConnectGet("/api/jkt48event", { page: 1, perpage: 50 }, { revalidate: 300 }),
        ]);
        type Item = JkcTheaterItem & { _kind: "show" | "event" };
        const shows: Item[] = pickList<JkcTheaterItem>(theaterJson, "theater", "data").map((item) => ({ ...item, _kind: "show" }));
        const events: Item[] = pickList<JkcTheaterItem>(eventJson, "events", "data").map((item) => ({ ...item, _kind: "event" }));
        const list = [...shows, ...events];
        if (list.length > 0) {
          return list.map((item, idx) => {
            const wib = toWib(item.start_date || item.date);
            const code = String(item.id || item.url || idx);
            return {
              id: `jkt48-${code}`,
              title: item.title || (item._kind === "show" ? "Theater JKT48" : "Event JKT48"),
              date: wib?.date || String(item.date || "").slice(0, 10),
              startTime: wib?.time || "19:00",
              members: item.team ? [{ name: `Team ${item.team}` }] : [{ name: "JKT48" }],
              url:
                item._kind === "show"
                  ? `https://jkt48.com/purchase/schedule/show?code=${encodeURIComponent(code)}`
                  : "https://jkt48.com/calendar/list?lang=id",
              imageUrl: "",
              isOfficial: true,
            };
          });
        }
      } catch (err) {
        console.warn("[Calendar API] Remote fetch failed, using fallback:", err);
      }

      // Fallback ke theater_res.json jika API remote kosong/gagal
      try {
        const fallbackPath = path.join(process.cwd(), "theater_res.json");
        if (fs.existsSync(fallbackPath)) {
          const raw = fs.readFileSync(fallbackPath, "utf-8");
          const parsed = JSON.parse(raw);
          const list = Array.isArray(parsed.data) ? parsed.data : [];
          return list.map((item: any, idx: number) => ({
            id: `jkt48-${item.id || item.schedule_id || idx}`,
            title: item.title || item.name || "Theater JKT48",
            date: item.date instanceof Date ? item.date.toISOString().slice(0, 10) : String(item.date || item.showDate || "").slice(0, 10),
            startTime: (item.startTime || item.start_time || "19:00").slice(0, 5),
            members: item.members || item.member || item.lineup || [{ name: "JKT48" }],
            url: item.url || (item.link ? `https://jkt48.com/theater/schedule/id/${item.schedule_id || item.link}?lang=id` : "#"),
            imageUrl: item.image_url || item.poster || item.banner || "",
            isOfficial: true,
          }));
        }
      } catch {}

      return [];
    },
    fallbackData: [],
  });
}

// ---------- READ ----------
export async function readCalendar(): Promise<any[]> {
  if (isMySqlConfigured()) {
    const rows = await query<any[]>("SELECT * FROM `calendar_events` WHERE `is_active`=1 ORDER BY `date` ASC");
    if (rows && rows.length >= 0) {
      return rows.map(rowToEvent);
    }
  }
  return readCalendarLocal();
}

// ---------- GET ----------
export async function GET() {
  const localData = await readCalendar();
  const officialEvents = await fetchJkt48OfficialEvents();
  
  // Ambil semua master show teater (termasuk show Erine 2026 dan masa Trainee 2024)
  const masterShows = getMasterShows().map((s) => ({
    id: `theater-${s.id || s.schedule_id}`,
    title: s.title || "Theater JKT48",
    date: (s.date || s.showDate || "").slice(0, 10),
    startTime: (s.startTime || s.start_time || "19:00").slice(0, 5),
    members: s.members || [{ name: "JKT48" }],
    url: s.url || "#",
    imageUrl: s.poster || s.banner || "",
    isOfficial: true,
    isTheater: true,
  }));

  // master shows go before the API list so a show keeps its full lineup
  // (the JKT48Connect list has no members) when both describe the same show
  const merged = [...localData, ...masterShows, ...officialEvents];
  const seen = new Set<string>();
  const unique = merged.filter((item: any) => {
    const key = `${(item.title || "").trim().toLowerCase()}-${(item.date || "").slice(0, 10)}-${(item.startTime || "").slice(0, 5)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Urutkan tanggal menaik
  unique.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json({ success: true, data: unique }, { headers: API_CACHE_HEADERS });
}

// ---------- POST ----------
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Bulk save (array body)
    if (Array.isArray(body)) {
      if (isMySqlConfigured()) {
        await query("DELETE FROM `calendar_events`");
        for (const item of body) {
          await query(
            "INSERT INTO `calendar_events` (`id`,`title`,`date`,`start_time`,`members_json`,`url`,`image_url`) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE `title`=VALUES(`title`),`date`=VALUES(`date`),`start_time`=VALUES(`start_time`),`members_json`=VALUES(`members_json`),`url`=VALUES(`url`),`image_url`=VALUES(`image_url`)",
            [item.id || Date.now().toString(), item.title, item.date, item.startTime || "00:00", JSON.stringify(item.members || []), item.url || "", item.imageUrl || ""]
          );
        }
      }
      writeCalendarLocal(body);
      return NextResponse.json({ success: true, data: body });
    }

    // ---------- ADD ----------
    if (body.action === "add") {
      const newItem = {
        id: body.id || Date.now().toString(),
        title: body.title,
        date: body.date,
        startTime: body.startTime || "00:00",
        members: body.members || [{ name: "Cavallery" }],
        url: body.url || "",
        imageUrl: body.imageUrl || "",
      };

      if (isMySqlConfigured()) {
        await query(
          "INSERT INTO `calendar_events` (`id`,`title`,`date`,`start_time`,`members_json`,`url`,`image_url`) VALUES (?,?,?,?,?,?,?)",
          [newItem.id, newItem.title, newItem.date, newItem.startTime, JSON.stringify(newItem.members), newItem.url, newItem.imageUrl]
        );
      }

      const data = readCalendarLocal();
      data.push(newItem);
      writeCalendarLocal(data);
      return NextResponse.json({ success: true, data });

    // ---------- DELETE ----------
    } else if (body.action === "delete") {
      if (isMySqlConfigured()) {
        await query("DELETE FROM `calendar_events` WHERE `id`=?", [body.id]);
      }

      let data = readCalendarLocal();
      data = data.filter((item: any) => item.id !== body.id);
      writeCalendarLocal(data);
      return NextResponse.json({ success: true, data });

    // ---------- UPDATE ----------
    } else if (body.action === "update") {
      if (isMySqlConfigured() && body.item) {
        const i = body.item;
        await query(
          "UPDATE `calendar_events` SET `title`=?,`date`=?,`start_time`=?,`members_json`=?,`url`=?,`image_url`=? WHERE `id`=?",
          [i.title, i.date, i.startTime || "00:00", JSON.stringify(i.members || []), i.url || "", i.imageUrl || "", body.id]
        );
      }

      let data = readCalendarLocal();
      const index = data.findIndex((item: any) => item.id === body.id);
      if (index !== -1) {
        data[index] = { ...data[index], ...body.item };
        writeCalendarLocal(data);
      }
      return NextResponse.json({ success: true, data });

    // ---------- SAVE ALL ----------
    } else if (body.action === "saveAll") {
      if (isMySqlConfigured()) {
        await query("DELETE FROM `calendar_events`");
        for (const item of (body.data || [])) {
          await query(
            "INSERT INTO `calendar_events` (`id`,`title`,`date`,`start_time`,`members_json`,`url`,`image_url`) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE `title`=VALUES(`title`),`date`=VALUES(`date`),`start_time`=VALUES(`start_time`),`members_json`=VALUES(`members_json`),`url`=VALUES(`url`),`image_url`=VALUES(`image_url`)",
            [item.id || Date.now().toString(), item.title, item.date, item.startTime || "00:00", JSON.stringify(item.members || []), item.url || "", item.imageUrl || ""]
          );
        }
      }
      writeCalendarLocal(body.data);
      return NextResponse.json({ success: true, data: body.data });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
