import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { API_CACHE_HEADERS, fetchWithCacheAndFallback } from "@/lib/apiCache";
import { jkt48ConnectGet, pickList, toWib, type JkcMember, type JkcTheaterDetail, type JkcTheaterItem } from "@/lib/jkt48connect";

const ERINE_KEYS = ["erine", "catherina", "vallencia"];
function isErine(name: string) {
  const n = (name ?? "").toLowerCase();
  return ERINE_KEYS.some((k) => n.includes(k));
}

function normalizeShow(s: any) {
  const members = s.members || s.member || s.lineup || [];
  const id = String(s.id || s.schedule_id || s.link || "");
  return {
    ...s,
    id: id || s.title + (s.date || ""),
    schedule_id: s.schedule_id || id,
    title: s.title || s.name || "JKT48 Show",
    date: s.date || s.showDate || "",
    showDate: s.date || s.showDate || "",
    startTime: (s.startTime || s.start_time || "19:00").slice(0, 5),
    start_time: s.startTime || s.start_time || "19:00:00",
    members: members.map((m: any) => ({ id: String(m.id || ""), name: m.name, url_key: m.url_key || "" })),
    member: members.map((m: any) => ({ id: String(m.id || ""), name: m.name, url_key: m.url_key || "" })),
    lineup: members.map((m: any) => ({ id: String(m.id || ""), name: m.name, url_key: m.url_key || "" })),
    poster: s.poster || s.banner || s.poster_url || "https://img.jkt48connect.com/jkt48/theater/uploads/cu0wq736nhcstg0epmiieumc.jpg",
    banner: s.banner || s.poster || "https://img.jkt48connect.com/jkt48/theater/uploads/y2g3dgukgk8ohxghfxv8lyju.jpg",
    url: s.url || (s.link ? `https://jkt48.com/theater/schedule/id/${s.schedule_id || s.link}?lang=id` : "https://jkt48.com/theater/schedule?lang=id"),
  };
}

export function getMasterShows(): any[] {
  try {
    const masterPath = path.join(process.cwd(), "src", "data", "theater_shows_master.json");
    if (fs.existsSync(masterPath)) {
      const content = fs.readFileSync(masterPath, "utf-8");
      const list = JSON.parse(content);
      if (Array.isArray(list)) return list.map(normalizeShow);
    }
  } catch (e) {
    console.warn("Could not read theater_shows_master.json:", e);
  }

  // Secondary fallback to theater_res.json
  try {
    const fallbackPath = path.join(process.cwd(), "theater_res.json");
    if (fs.existsSync(fallbackPath)) {
      const content = fs.readFileSync(fallbackPath, "utf-8");
      const parsed = JSON.parse(content);
      const list = Array.isArray(parsed.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);
      return list.map(normalizeShow);
    }
  } catch {}

  return [];
}

/** Theater list from api.jkt48connect.app (no lineup in the list). */
async function fetchJkcTheaterList(): Promise<JkcTheaterItem[]> {
  return fetchWithCacheAndFallback<JkcTheaterItem[]>({
    key: "jkc_theater_list",
    ttlSeconds: 600,
    fetcher: async () => {
      const json = await jkt48ConnectGet("/api/theater", { page: 1, perpage: 100, type: "show" }, { revalidate: 600 });
      return pickList<JkcTheaterItem>(json, "theater", "data");
    },
    fallbackData: [],
  });
}

/** Lineup for one show (`/api/theater/:id`), cached so the monthly quota is spared. */
interface ShowMember {
  id: string;
  name?: string;
  url_key: string;
  img?: string;
}

async function fetchJkcShowMembers(id: string): Promise<ShowMember[]> {
  return fetchWithCacheAndFallback<ShowMember[]>({
    key: `jkc_theater_detail_${id}`,
    ttlSeconds: 1800,
    fetcher: async () => {
      const json = await jkt48ConnectGet<JkcTheaterDetail>(`/api/theater/${encodeURIComponent(id)}`, {}, { revalidate: 1800 });
      const members: JkcMember[] = json?.shows?.[0]?.members || [];
      return members.map((m) => ({ id: String(m.id ?? ""), name: m.name, url_key: m.url_key || "", img: m.img }));
    },
    fallbackData: [],
  });
}

async function fetchMonthTheater(monthStr: string, yearStr: string): Promise<any[]> {
  const cacheKey = `theater_${monthStr}_${yearStr}`;
  return fetchWithCacheAndFallback<any[]>({
    key: cacheKey,
    ttlSeconds: 600,
    fetcher: async () => {
      // 1. JKT48Connect (api.jkt48connect.app)
      try {
        const list = (await fetchJkcTheaterList()).filter((s) => {
          const wib = toWib(s.start_date || s.date);
          return wib && wib.date.slice(0, 7) === `${yearStr}-${monthStr}`;
        });
        if (list.length > 0) {
          const masterMembers = new Map<string, ShowMember[]>(
            getMasterShows().map((m) => [`${(m.title || "").trim().toLowerCase()}-${(m.date || "").slice(0, 10)}`, m.members || []])
          );
          // lineup only for the shows of this month, max 40 detail calls per refresh
          const shows = await Promise.all(
            list.slice(0, 40).map(async (s) => {
              const id = String(s.id || s.url || "");
              const start = s.start_date || s.date || "";
              const wib = toWib(start);
              let members = id ? await fetchJkcShowMembers(id) : [];
              if (!members.length) {
                members = masterMembers.get(`${(s.title || "").trim().toLowerCase()}-${String(start).slice(0, 10)}`) || [];
              }
              return normalizeShow({
                id,
                schedule_id: id,
                title: s.title,
                team: s.team,
                date: start,
                showDate: start,
                startTime: wib?.time || "19:00",
                start_time: `${wib?.time || "19:00"}:00`,
                members,
                url: id ? `https://jkt48.com/purchase/schedule/show?code=${encodeURIComponent(id)}` : undefined,
              });
            })
          );
          return shows;
        }
      } catch {}

      // 2. Mirror Fallback Live Real-Time (crstlnz API)
      try {
        const resMirror = await fetch("https://api.crstlnz.my.id/api/theater", {
          headers: { Accept: "application/json" },
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(5000),
        });
        if (resMirror.ok) {
          const jsonMirror = await resMirror.json();
          const shows = Array.isArray(jsonMirror) ? jsonMirror : (Array.isArray(jsonMirror.shows) ? jsonMirror.shows : []);
          const mNum = parseInt(monthStr, 10);
          const yNum = parseInt(yearStr, 10);
          const filtered = shows.filter((s: any) => {
            const d = new Date(s.date || s.start_date || "");
            return !isNaN(d.getTime()) && d.getMonth() + 1 === mNum && d.getFullYear() === yNum;
          });
          if (filtered.length > 0) {
            return filtered.map((s: any) => {
              const members = s.members || [];
              const rawDate = s.date || s.start_date || "";
              const dObj = new Date(rawDate);
              const hrs = !isNaN(dObj.getTime()) ? String(dObj.getHours()).padStart(2, "0") : "19";
              const mins = !isNaN(dObj.getTime()) ? String(dObj.getMinutes()).padStart(2, "0") : "00";
              const timeFormatted = `${hrs}:${mins}`;

              return normalizeShow({
                id: s.id || `crstlnz-${s.url || rawDate}`,
                schedule_id: s.url || s.id,
                title: s.title || "JKT48 Theater Show",
                date: rawDate,
                showDate: rawDate,
                startTime: timeFormatted,
                start_time: `${timeFormatted}:00`,
                members,
                poster: s.poster || "https://img.jkt48connect.com/jkt48/theater/uploads/cu0wq736nhcstg0epmiieumc.jpg",
                banner: s.banner || "https://img.jkt48connect.com/jkt48/theater/uploads/y2g3dgukgk8ohxghfxv8lyju.jpg",
                url: s.url ? `https://jkt48.com/theater/schedule/id/${s.url}?lang=id` : "https://jkt48.com/theater/schedule?lang=id",
              });
            });
          }
        }
      } catch {}

      return [];
    },
    fallbackData: [],
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const erineOnly = searchParams.get("erine") === "true";

    const masterShows = getMasterShows();

    // 1. Jika requested spesifik month & year
    if (month && year) {
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);

      // Coba fetch live dari remote
      let remoteShows: any[] = [];
      try {
        remoteShows = await fetchMonthTheater(month.padStart(2, "0"), year);
      } catch {}

      // Filter dari master database
      const filteredMaster = masterShows.filter((s) => {
        const d = new Date(s.date || s.showDate || "");
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === yearNum && d.getMonth() + 1 === monthNum;
      });

      // Gabungkan dengan dedup
      const seen = new Set<string>();
      const combined: any[] = [];
      for (const s of [...remoteShows, ...filteredMaster]) {
        const key = `${(s.title || "").trim().toLowerCase()}-${(s.date || "").slice(0, 10)}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(s);
        }
      }

      let result = combined;
      if (erineOnly) {
        result = result.filter((s) => (s.members || []).some((m: any) => isErine(m.name)));
      }

      // Urutkan tanggal menaik
      result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return NextResponse.json({ success: true, data: result }, { headers: API_CACHE_HEADERS });
    }

    // 2. Jika requested hanya year (misal ?year=2026 atau ?year=2024)
    if (year) {
      const yearNum = parseInt(year, 10);
      let result = masterShows.filter((s) => {
        const d = new Date(s.date || s.showDate || "");
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === yearNum;
      });

      if (erineOnly) {
        result = result.filter((s) => (s.members || []).some((m: any) => isErine(m.name)));
      }

      // Urutkan tanggal menaik
      result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return NextResponse.json({ success: true, data: result }, { headers: API_CACHE_HEADERS });
    }

    // 3. Tanpa parameter: ambil live update 3 bulan aktif + gabung seluruh master database
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const monthsToFetch = [
      { m: currentMonth, y: currentYear },
      { m: currentMonth === 12 ? 1 : currentMonth + 1, y: currentMonth === 12 ? currentYear + 1 : currentYear },
    ];

    let liveResults: any[] = [];
    try {
      const fetched = await Promise.all(
        monthsToFetch.map(({ m, y }) => fetchMonthTheater(String(m).padStart(2, "0"), String(y)))
      );
      liveResults = fetched.flat();
    } catch {}

    const seenKeys = new Set<string>();
    const allMerged: any[] = [];

    // Prioritaskan data live jika ada, lalu fallback ke master
    for (const s of [...liveResults, ...masterShows]) {
      const key = `${(s.title || "").trim().toLowerCase()}-${(s.date || "").slice(0, 10)}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        allMerged.push(s);
      }
    }

    let result = allMerged;
    if (erineOnly) {
      result = result.filter((s) => (s.members || []).some((m: any) => isErine(m.name)));
    }

    // Urutkan tanggal menaik (kronologis)
    result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ success: true, data: result }, { headers: API_CACHE_HEADERS });
  } catch (error) {
    console.error("Theater API Error:", error);
    const masterShows = getMasterShows();
    return NextResponse.json({ success: true, data: masterShows }, { headers: API_CACHE_HEADERS });
  }
}
