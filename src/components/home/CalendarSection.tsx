"use client";

import React, { useState, useEffect, useMemo } from "react";
import styles from "./CalendarSection.module.css";

interface ShowMember {
  name: string;
}

interface Show {
  id?: string;
  title?: string;
  date?: string;
  showDate?: string;
  startTime?: string;
  members?: ShowMember[];
  member?: ShowMember[];
  lineup?: ShowMember[];
  url?: string;
  isLiveHistory?: boolean;
  isManual?: boolean;
  liveType?: string;
  thumbnail?: string;
  totalGift?: string;
  duration?: number;
}

const ERINE_KEYS = ["erine", "catherina", "vallencia"];
function isErine(name: string) {
  const n = (name ?? "").toLowerCase();
  return ERINE_KEYS.some((k) => n.includes(k));
}

function msToReadable(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}

export default function CalendarSection() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [apiShows, setApiShows] = useState<Show[]>([]);
  const [apiLives, setApiLives] = useState<Show[]>([]);
  const [apiRiwayat, setApiRiwayat] = useState<Show[]>([]);
  const [apiBirthdays, setApiBirthdays] = useState<Show[]>([]);
  const [apiManualEvents, setApiManualEvents] = useState<Show[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch theater schedule
  useEffect(() => {
    async function fetchTheater() {
      try {
        const formattedMonth = String(month + 1).padStart(2, "0");
        const res = await fetch(`/api/theater?month=${formattedMonth}&year=${year}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setApiShows(json.data);
        } else {
          setApiShows([]);
        }
      } catch (err) {
        console.error("Failed to load theater schedule:", err);
      }
    }
    fetchTheater();
  }, [month, year]);

  // Fetch active live streams (Showroom / IDN)
  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch("/api/live");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const now = new Date();
          const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`;
          const lives: Show[] = json.data.map((stream: any, idx: number) => {
            const type = (stream.type || stream.platform || "").toLowerCase();
            let liveUrl = "https://www.showroom-live.com/r/JKT48_Erine";
            if (type.includes("idn") || stream.url?.includes("idn.app") || stream.idn_url) {
              liveUrl = "https://www.idn.app/jkt48_erine";
            } else if (stream.url_key) {
              liveUrl = `https://www.showroom-live.com/r/${stream.url_key}`;
            } else if (stream.url) {
              liveUrl = stream.url;
            }

            return {
              id: `live-${idx}`,
              title: `LIVE: ${stream.room_name || stream.name || "Showroom / IDN"}`,
              date: todayStr,
              startTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
              members: [{ name: stream.member_name || "Catherina Vallencia (Erine)" }],
              url: liveUrl,
            };
          });
          setApiLives(lives);
        }
      } catch (err) {
        console.error("Failed to load live data:", err);
      }
    }
    fetchLive();
  }, []);

  // Fetch riwayat live Erine
  useEffect(() => {
    async function fetchRiwayat() {
      try {
        const res = await fetch("/api/riwayat");
        const json = await res.json();
        const raw: any[] = Array.isArray(json) ? json : json.data ?? [];
        const mapped: Show[] = raw.map((item: any) => {
          const startRaw = item.live_info?.date?.start;
          const startDate = startRaw ? new Date(startRaw) : null;
          const startTimeStr = startDate
            ? `${String(startDate.getUTCHours() + 7).padStart(2, "0")}:${String(startDate.getUTCMinutes()).padStart(2, "0")}`
            : undefined;
          const liveTitle = item.idn?.title
            ? item.idn.title
            : item.type === "showroom"
            ? "Showroom Live"
            : "IDN Live";
          return {
            id: item.data_id,
            title: `Live ${liveTitle}`,
            date: startRaw ?? undefined,
            startTime: startTimeStr,
            members: [{ name: item.member?.name ?? "Erine JKT48" }],
            isLiveHistory: true,
            liveType: item.type ?? "idn",
            thumbnail: item.idn?.image ?? item.member?.img,
            totalGift: item.total_gift,
            duration: item.live_info?.duration,
          };
        });
        setApiRiwayat(mapped);
      } catch (err) {
        console.error("Failed to load riwayat:", err);
      }
    }
    fetchRiwayat();
  }, []);

  // Fetch birthdays
  useEffect(() => {
    async function fetchBirthdays() {
      try {
        const res = await fetch("/api/birthday");
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped: Show[] = json.data.map((item: any, idx: number) => {
            const dateStr = item.date;
            const dateObj = new Date(dateStr);
            dateObj.setFullYear(year); 
            const todayStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}T00:00:00`;
            return {
              id: `birthday-${idx}`,
              title: `🎂 Ulang Tahun: ${item.name}`,
              date: todayStr,
              startTime: "00:00",
              members: [{ name: item.name }],
              isLiveHistory: false,
            };
          });
          setApiBirthdays(mapped);
        }
      } catch (err) {
        console.error("Failed to load birthdays:", err);
      }
    }
    fetchBirthdays();
  }, [year]);

  // Fetch manual calendar events
  useEffect(() => {
    async function fetchManual() {
      try {
        const res = await fetch("/api/calendar", { cache: "no-store" });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const manual: Show[] = json.data.map((item: any) => {
            const rawDate = item.date ? String(item.date).slice(0, 10) : "";
            return {
              id: `manual-${item.id}`,
              title: `${item.title}`,
              date: `${rawDate}T00:00:00`, // To avoid timezone issues when checking year/month
              startTime: item.startTime,
              url: item.url,
              members: item.members || [{ name: "Cavallery" }],
              thumbnail: item.imageUrl || "/images/cava-logo.jpg",
              isManual: true,
            };
          });
          setApiManualEvents(manual);
        }
      } catch (err) {
        console.error("Failed to load manual events:", err);
      }
    }
    fetchManual();
  }, []);

  const shows = useMemo(() => {
    const filteredShows = apiShows.filter((s) => {
      const members = s.members ?? s.member ?? s.lineup ?? [];
      return members.some((m) => isErine(m.name));
    });

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

    const filteredRiwayat = apiRiwayat.filter((s) => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).filter((s) => {
      const members = s.members ?? s.member ?? s.lineup ?? [];
      return members.some((m) => isErine(m.name));
    });

    const filteredLives = apiLives.filter((s) => {
      const members = s.members ?? s.member ?? s.lineup ?? [];
      return members.some((m) => isErine(m.name));
    });

    const filteredBirthdays = apiBirthdays.filter((s) => {
      const members = s.members ?? s.member ?? s.lineup ?? [];
      return members.some((m) => isErine(m.name));
    }).filter((s) => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const filteredManual = apiManualEvents.filter((s) => {
      if (!s.date) return false;
      const d = new Date(s.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    return [
      ...filteredShows,
      ...(isCurrentMonth ? filteredLives : []),
      ...filteredRiwayat,
      ...filteredBirthdays,
      ...filteredManual,
    ];
  }, [apiShows, apiLives, apiRiwayat, apiBirthdays, apiManualEvents, year, month]);

  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const firstDayIndex = useMemo(() => new Date(year, month, 1).getDay(), [year, month]);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const handlePrevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const handleNextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  const getShowsForDay = (day: number) => {
    return shows.filter((show) => {
      const showDateStr = show.date ?? show.showDate;
      if (!showDateStr) return false;
      const d = new Date(showDateStr);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const daysOfWeek = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const today = new Date();

  const cells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(<div key={`empty-${i}`} className={`${styles.cell} ${styles.emptyCell}`} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayShows = getShowsForDay(day);
    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
    cells.push(
      <div
        key={day}
        className={`${styles.cell} ${isToday ? styles.today : ""}`}
        onClick={() => setSelectedDay(day)}
        style={{ cursor: "pointer" }}
      >
        <span className={styles.dateNum}>{day}</span>
        <div className={styles.eventInfoList}>
          {dayShows.slice(0, 2).map((show, idx) => {
            const hasErine = (show.members ?? show.member ?? show.lineup ?? []).some((m) => isErine(m.name));
            return (
              <div
                key={show.id ?? idx}
                className={`${styles.eventBadge} ${hasErine ? styles.eventErine : ""}`}
                title={show.title}
              >
                {show.isLiveHistory
                  ? <><i className="bx bx-video-recording" style={{ fontSize: ".7rem" }} />{" "}</>
                  : hasErine
                  ? <><i className="bx bxs-flame" style={{ fontSize: ".7rem" }} />{" "}</>
                  : ""}
                {show.title}
              </div>
            );
          })}
          {dayShows.length > 2 && (
            <div className={styles.eventBadge} style={{ background: "var(--fg-dim)" }}>
              +{dayShows.length - 2} Lainnya
            </div>
          )}
        </div>
      </div>
    );
  }

  const selectedDayShows = selectedDay ? getShowsForDay(selectedDay) : [];

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div className="badge">
            <i className="bx bx-calendar-event" /> Event Calendar
          </div>
          <h2 className={`sectionTitle textGold ${styles.title}`}>Kalender Kegiatan</h2>
          <p className={styles.subtitle}>
            Pantau jadwal konser, pertunjukan theater, live streaming, dan kegiatan Erine JKT48.
          </p>
        </div>

        <div className={`${styles.calendarCard} glassCard`}>
          <div className={styles.calendarHeader}>
            <span className={styles.monthTitle}>
              {monthNames[month]} {year}
            </span>
            <div className={styles.monthNav}>
              <button className={styles.navBtn} onClick={handlePrevMonth}>
                <i className="bx bx-chevron-left" /> Prev
              </button>
              <button className={styles.navBtn} onClick={handleNextMonth}>
                Next <i className="bx bx-chevron-right" />
              </button>
            </div>
          </div>

          <div className={styles.grid}>
            {daysOfWeek.map((day) => (
              <div key={day} className={styles.dayOfWeek}>
                {day.slice(0, 3)}
              </div>
            ))}
            {cells}
          </div>

          {selectedDay !== null && (
            <div className={styles.activeDayPanel}>
              <h3 className={styles.activeDayTitle}>
                Jadwal Tanggal {selectedDay} {monthNames[month]} {year}
              </h3>
              {selectedDayShows.length === 0 ? (
                <p style={{ color: "var(--fg-dim)" }}>Tidak ada kegiatan untuk hari ini.</p>
              ) : (
                selectedDayShows.map((show, idx) => {
                  const members = show.members ?? show.member ?? show.lineup ?? [];
                  const CardComponent = show.url ? "a" : "div";
                  return (
                    <CardComponent 
                      key={show.id ?? idx} 
                      className={styles.eventCard}
                      {...(show.url ? { href: show.url, target: "_blank", rel: "noreferrer" } : {})}
                      style={show.url ? { textDecoration: "none", display: "flex", flexDirection: "column" } : {}}
                    >
                      {(show.isLiveHistory || show.isManual) && show.thumbnail && (
                        <div className={styles.eventThumb}>
                          <img
                            src={show.thumbnail}
                            alt={show.title}
                          />
                        </div>
                      )}
                      <div className={styles.eventContent}>
                        <div className={styles.eventTitle}>
                          {show.isLiveHistory && (
                            <span style={{
                              fontSize: "0.7rem",
                              background: "var(--gold)",
                              color: "#fff",
                              borderRadius: 4,
                              padding: "2px 8px",
                              marginRight: 6,
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}>
                              {show.liveType === "showroom" ? "Showroom" : "IDN"}
                            </span>
                          )}
                          {show.isManual && (
                            <span style={{
                              fontSize: "0.7rem",
                              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                              color: "#fff",
                              borderRadius: 4,
                              padding: "2px 8px",
                              marginRight: 6,
                              fontWeight: 700,
                              textTransform: "uppercase",
                            }}>
                              🐴 Cavallery
                            </span>
                          )}
                          {show.title}
                        </div>
                        <div className={styles.eventMeta}>
                          <span className={styles.metaItem}>
                            <i className="bx bx-time" /> {show.startTime ?? "19:00"} WIB
                          </span>
                          {show.duration && (
                            <span className={styles.metaItem}>
                              <i className="bx bx-stopwatch" /> {msToReadable(show.duration)}
                            </span>
                          )}
                          {show.totalGift && (
                            <span className={styles.metaItem}>
                              <i className="bx bx-gift" /> {show.totalGift}
                            </span>
                          )}
                        </div>
                        {members.length > 0 && (
                          <div className={styles.membersList}>
                            {members.map((m, mi) => {
                              const match = isErine(m.name);
                              return (
                                <span
                                  key={mi}
                                  className={`${styles.memberTag} ${match ? styles.memberErine : ""}`}
                                >
                                  {match ? <><i className="bx bxs-flame" style={{ fontSize: ".75rem" }} />{" "}</> : ""}{m.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </CardComponent>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
