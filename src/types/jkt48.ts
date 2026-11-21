// ============================================================
// TypeScript Type Definitions for JKT48 Connect API
// Base: https://api.jkt48connect.app
// ============================================================

// --- 1. JADWAL (Schedule) ---
export interface Jkt48TheaterMember {
  id: string | number;
  name: string;
  url_key?: string;
  img?: string;
  avatar?: string;
  is_erine?: boolean;
}

export interface Jkt48Recording {
  id?: string;
  title?: string;
  status?: "uploaded" | "processing" | "pending" | string;
  youtube_url?: string;
  stream_url?: string; // HLS (.m3u8)
  date?: string;
}

export interface Jkt48TheaterShow {
  id: string;
  schedule_id?: string;
  title: string;
  date: string; // ISO string
  showDate?: string;
  startTime: string; // HH:mm
  endTime?: string;
  team?: string;
  location?: string;
  poster?: string;
  banner?: string;
  url?: string;
  is_erine: boolean;
  is_special?: boolean; // seitansai / birthday / spotlight
  status: "live" | "upcoming" | "completed";
  countdownText?: string;
  members: Jkt48TheaterMember[];
  recordings?: Jkt48Recording[];
  screenshots?: string[];
  leaderboard_banner?: {
    status: string;
    url?: string;
  };
}

export interface Jkt48ScheduleEvent {
  id?: string | number;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type?: string; // 'theater' | 'event' | 'vc' | 'other'
  description?: string;
  member_ids?: (string | number)[];
  members?: { id: string | number; name: string; url_key?: string }[];
  is_erine?: boolean;
  link?: string;
}

export interface Jkt48AvailablePeriod {
  year: number;
  month: number;
  label?: string; // e.g. "November 2026"
}

export interface Jkt48ScheduleResponse {
  events: Jkt48ScheduleEvent[];
  available_periods: Jkt48AvailablePeriod[];
}

// --- 2. STOK EKSKLUSIF ---
export interface ExclusiveLane {
  member_name: string;
  member_id?: string | number;
  status: "available" | "limited" | "sold_out" | string;
  quota?: number;
  price?: number | string;
}

export interface ExclusiveSession {
  label: string; // e.g. "Sesi 1 (11:00 - 12:00)"
  start_time: string;
  end_time?: string;
  lanes: ExclusiveLane[];
}

export interface Jkt48ExclusiveRawResponse {
  id?: string;
  title?: string;
  sales_status: string;
  summary?: {
    total_available?: number;
    total_sold_out?: number;
    total_sessions?: number;
  };
  sessions: ExclusiveSession[];
  purchase_url: string;
}

export interface ExclusiveFlattenedItem {
  session: string;
  startTime: string;
  member: string;
  status: "available" | "limited" | "sold_out" | string;
}

export interface Jkt48ExclusiveFlattenedResponse {
  sales_status: string;
  summary?: Jkt48ExclusiveRawResponse["summary"];
  sessions: ExclusiveSession[];
  purchase_url: string;
  flattened: ExclusiveFlattenedItem[];
}

// --- 3. LIVE & NOTIFICATIONS ---
export interface Jkt48LiveItem {
  id: string;
  name: string;
  member_name?: string;
  img: string;
  avatar?: string;
  type?: string;
  platform: "showroom" | "idn" | string;
  streaming_url?: string;
  url?: string;
  viewers?: number;
  started_at?: string;
  is_erine: boolean;
}

export interface Jkt48LiveNotification {
  id: string | number;
  title?: string;
  caption?: string;
  is_live: boolean;
  notification_designs?: {
    jkt48connect?: {
      banner?: {
        status: "ready" | "pending" | "none" | string;
        url?: string;
      };
    };
  };
}

export interface Jkt48LiveComment {
  id?: string | number;
  username: string;
  name?: string;
  comment: string;
  avatar?: string;
  created_at?: string;
}

export interface Jkt48LiveGift {
  id?: string | number;
  name: string;
  username?: string;
  gift_name: string;
  count?: number;
  img?: string;
  created_at?: string;
}

export interface Jkt48LiveRecent {
  data_id: string;
  leaderboard_designs?: {
    jkt48connect?: {
      banner?: {
        status: "ready" | "pending" | "none" | string;
        url?: string;
      };
    };
  };
  live_info?: {
    duration?: number;
    viewers?: number;
    screenshot?: {
      base_url: string;
      time: number | string;
      format?: string;
      list?: (number | string)[];
    };
  };
  gifts?: Jkt48LiveGift[];
  stagelist?: any[];
}

// --- 4. SOCIAL MEDIA UPDATES ---
export interface Jkt48SocialUpdate {
  cursor: string;
  platform: "x" | "instagram" | "tiktok";
  member: {
    name: string;
    username?: string;
    avatar?: string;
    slug?: string;
  };
  text: string;
  url: string;
  media_urls?: string[];
  created_at: string;
}

export interface Jkt48UpdatesResponse {
  updates: Jkt48SocialUpdate[];
  next_cursor: string | null;
  has_more: boolean;
}
