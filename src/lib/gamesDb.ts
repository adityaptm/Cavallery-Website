import fs from "fs";
import path from "path";
import { query, isMySqlConfigured } from "@/lib/mysql";

export interface GameInfo {
  slug: string;
  title: string;
  category: string;
  is_ranked: boolean;
  max_score_limit: number;
}

export interface ScoreSubmission {
  game_slug: string;
  player_name: string;
  device_id: string;
  score: number;
  duration_seconds: number;
}

export interface LeaderboardEntry {
  rank: number;
  player_name: string;
  device_id?: string;
  score: number;
  duration_seconds: number;
  created_at: string;
}

export interface GameStats {
  rekor_teratas: number;
  total_pemain: number;
  sesi_dimainkan: number;
  rata_rata_skor: number;
}

export interface PlayerRankResult {
  player_rank: number;
  total_players: number;
  best_score: number;
}

// Data Directory for JSON Fallback
const DATA_DIR = path.join(process.cwd(), "src", "data");
const SESSIONS_FILE = path.join(DATA_DIR, "game-sessions.json");

export const RANKED_GAMES: Record<string, GameInfo> = {
  "anterine-ke-theater": {
    slug: "anterine-ke-theater",
    title: "Game Anterine Ke Theater",
    category: "Adventure",
    is_ranked: true,
    max_score_limit: 500000,
  },
  "grasshopper-collector": {
    slug: "grasshopper-collector",
    title: "Game Belalang Yang Membangkang",
    category: "Arcade",
    is_ranked: true,
    max_score_limit: 100000,
  },
  "jumping-adventure": {
    slug: "jumping-adventure",
    title: "Game Bibir Yang Telah Dicuri",
    category: "Adventure",
    is_ranked: true,
    max_score_limit: 100000,
  },
};

// Indonesian Simple Bad Words Filter
const BAD_WORDS = [
  "anjing", "babi", "bangsat", "kontol", "memek", "jembut", "pantek", "itil",
  "perek", "lonte", "pepek", "ngentot", "tai", "bajingan", "asu", "kampang",
  "kimak", "puki", "bocil", "tolol", "goblok", "idiot", "bego", "fak", "fuck",
  "bitch", "shit", "asshole", "cunt", "dick", "pussy"
];

export function validatePlayerName(name: string): { valid: boolean; error?: string; cleanName: string } {
  const trimmed = (name || "").trim();
  if (trimmed.length < 3) {
    return { valid: false, error: "Nama minimal 3 karakter.", cleanName: trimmed };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: "Nama maksimal 20 karakter.", cleanName: trimmed };
  }
  // Only letters, numbers, underscore, space
  const nameRegex = /^[a-zA-Z0-9_ ]+$/;
  if (!nameRegex.test(trimmed)) {
    return { valid: false, error: "Nama hanya boleh berisi huruf, angka, spasi, dan underscore.", cleanName: trimmed };
  }

  // Check bad words
  const lower = trimmed.toLowerCase();
  for (const word of BAD_WORDS) {
    if (lower.includes(word)) {
      return { valid: false, error: "Nama mengandung kata yang tidak pantas. Gunakan nama lain ya!", cleanName: trimmed };
    }
  }

  return { valid: true, cleanName: trimmed };
}

// In-Memory Rate Limiter (Max 10 submissions per minute per IP / Device ID)
interface RateLimitRecord {
  count: number;
  resetTime: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(key: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

// Local JSON File Helper
function readLocalScores(): any[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SESSIONS_FILE)) {
      const content = fs.readFileSync(SESSIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Could not read local game-sessions.json:", err);
  }
  return [];
}

function writeLocalScore(scoreObj: any): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = readLocalScores();
    current.push(scoreObj);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(current, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save to local game-sessions.json:", err);
  }
}

/**
 * Save player score into database (with fallback to local JSON)
 */
export async function savePlayerScore(sub: ScoreSubmission): Promise<{ success: boolean; id?: number | string }> {
  const { game_slug, player_name, device_id, score, duration_seconds } = sub;

  // 1. Coba simpan ke MySQL Hostinger
  if (isMySqlConfigured()) {
    try {
      const res = await query<any>(
        `INSERT INTO game_scores (game_slug, player_name, device_id, score, duration_seconds) 
         VALUES (?, ?, ?, ?, ?)`,
        [game_slug, player_name, device_id, score, duration_seconds]
      );
      if (res && res.insertId) {
        return { success: true, id: res.insertId };
      }
    } catch (e: any) {
      console.error("[MySQL] savePlayerScore error:", e?.message);
    }
  }

  // 2. Fallback simpan ke local JSON
  const newId = Date.now();
  writeLocalScore({
    id: newId,
    game_id: game_slug,
    game_slug: game_slug,
    player_id: device_id,
    device_id: device_id,
    username: player_name,
    player_name: player_name,
    score,
    duration_seconds,
    played_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });

  return { success: true, id: newId };
}

/**
 * Get Leaderboard (Top N unique players)
 */
export async function getGameLeaderboard(game_slug: string, limit = 10): Promise<LeaderboardEntry[]> {
  // 1. MySQL View / Query
  if (isMySqlConfigured()) {
    try {
      const rows = await query<any[]>(
        `SELECT id, game_slug, player_name, device_id, score, duration_seconds, created_at 
         FROM v_best_scores 
         WHERE game_slug = ? 
         ORDER BY score DESC, created_at ASC 
         LIMIT ?`,
        [game_slug, limit]
      );

      if (rows && Array.isArray(rows)) {
        return rows.map((r, idx) => ({
          rank: idx + 1,
          player_name: r.player_name || "Pemain",
          device_id: r.device_id,
          score: Number(r.score) || 0,
          duration_seconds: Number(r.duration_seconds) || 0,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn("[MySQL] getGameLeaderboard error, using fallback:", err);
    }
  }

  // 2. Fallback JSON
  const all = readLocalScores();
  const matches = all.filter((s) => (s.game_slug === game_slug || s.game_id === game_slug));

  // Map 1 best score per device_id or player_name
  const bestMap = new Map<string, any>();
  for (const s of matches) {
    const key = (s.device_id || s.player_id || s.player_name || s.username || "").toLowerCase();
    const sc = Number(s.score) || 0;
    if (!bestMap.has(key) || sc > bestMap.get(key).score) {
      bestMap.set(key, s);
    }
  }

  const sorted = Array.from(bestMap.values())
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
    .slice(0, limit);

  return sorted.map((s, idx) => ({
    rank: idx + 1,
    player_name: s.player_name || s.username || "Pemain",
    device_id: s.device_id || s.player_id,
    score: Number(s.score) || 0,
    duration_seconds: Number(s.duration_seconds) || 0,
    created_at: s.created_at || s.played_at || new Date().toISOString(),
  }));
}

/**
 * Get Aggregated Game Statistics
 */
export async function getGameStats(game_slug: string): Promise<GameStats> {
  // 1. MySQL View / Query
  if (isMySqlConfigured()) {
    try {
      const rows = await query<any[]>(
        `SELECT rekor_teratas, total_pemain, sesi_dimainkan, rata_rata_skor 
         FROM v_game_stats 
         WHERE game_slug = ?`,
        [game_slug]
      );

      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          rekor_teratas: Number(r.rekor_teratas) || 0,
          total_pemain: Number(r.total_pemain) || 0,
          sesi_dimainkan: Number(r.sesi_dimainkan) || 0,
          rata_rata_skor: Number(r.rata_rata_skor) || 0,
        };
      }
    } catch (err) {
      console.warn("[MySQL] getGameStats error, using fallback:", err);
    }
  }

  // 2. Fallback JSON
  const all = readLocalScores();
  const matches = all.filter((s) => (s.game_slug === game_slug || s.game_id === game_slug));

  if (matches.length === 0) {
    return {
      rekor_teratas: 0,
      total_pemain: 0,
      sesi_dimainkan: 0,
      rata_rata_skor: 0,
    };
  }

  const scores = matches.map((m) => Number(m.score) || 0);
  const players = new Set(matches.map((m) => (m.device_id || m.player_id || m.player_name || m.username || "").toLowerCase()));
  const totalScore = scores.reduce((a, b) => a + b, 0);

  return {
    rekor_teratas: Math.max(...scores, 0),
    total_pemain: players.size,
    sesi_dimainkan: matches.length,
    rata_rata_skor: Math.round((totalScore / matches.length) * 10) / 10,
  };
}

/**
 * Get Rank of a specific player (device_id)
 */
export async function getPlayerRank(game_slug: string, device_id: string): Promise<PlayerRankResult> {
  if (!device_id) {
    return { player_rank: 0, total_players: 0, best_score: 0 };
  }

  // 1. MySQL
  if (isMySqlConfigured()) {
    try {
      // Dapatkan skor terbaik pemain ini
      const myRows = await query<any[]>(
        `SELECT score FROM v_best_scores WHERE game_slug = ? AND device_id = ? LIMIT 1`,
        [game_slug, device_id]
      );

      if (myRows && myRows.length > 0) {
        const myScore = Number(myRows[0].score) || 0;

        const countBetterRows = await query<any[]>(
          `SELECT COUNT(*) as rank_above FROM v_best_scores WHERE game_slug = ? AND score > ?`,
          [game_slug, myScore]
        );
        const totalRows = await query<any[]>(
          `SELECT COUNT(*) as total FROM v_best_scores WHERE game_slug = ?`,
          [game_slug]
        );

        const rankAbove = countBetterRows && countBetterRows.length > 0 ? Number(countBetterRows[0].rank_above) || 0 : 0;
        const total = totalRows && totalRows.length > 0 ? Number(totalRows[0].total) || 1 : 1;

        return {
          player_rank: rankAbove + 1,
          total_players: total,
          best_score: myScore,
        };
      }
    } catch (err) {
      console.warn("[MySQL] getPlayerRank error, using fallback:", err);
    }
  }

  // 2. Fallback JSON
  const all = readLocalScores();
  const matches = all.filter((s) => (s.game_slug === game_slug || s.game_id === game_slug));

  const bestMap = new Map<string, any>();
  for (const s of matches) {
    const key = (s.device_id || s.player_id || s.player_name || s.username || "").toLowerCase();
    const sc = Number(s.score) || 0;
    if (!bestMap.has(key) || sc > bestMap.get(key).score) {
      bestMap.set(key, s);
    }
  }

  const targetKey = device_id.toLowerCase();
  if (!bestMap.has(targetKey)) {
    return { player_rank: 0, total_players: bestMap.size, best_score: 0 };
  }

  const myScore = Number(bestMap.get(targetKey).score) || 0;
  const allScores = Array.from(bestMap.values()).map((v) => Number(v.score) || 0);
  const higherCount = allScores.filter((sc) => sc > myScore).length;

  return {
    player_rank: higherCount + 1,
    total_players: bestMap.size,
    best_score: myScore,
  };
}
