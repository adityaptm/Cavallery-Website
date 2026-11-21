"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./ScheduleCalendarView.module.css";
import type { Jkt48ScheduleEvent, Jkt48AvailablePeriod } from "@/types/jkt48";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function getShowBanner(title?: string): string {
  const t = (title || "").toLowerCase();
  if (t.includes("ramune")) return "https://img.jkt48connect.com/jkt48/theater/uploads/enw9vf2j9cnszyqv0ej81ykt.jpg";
  if (t.includes("aturan") || t.includes("anti cinta")) return "https://img.jkt48connect.com/jkt48/theater/uploads/cq0m6aj6ajj3efolbqtlur0d.jpg";
  if (t.includes("menggandeng") || t.includes("pertaruhan") || t.includes("cinta")) return "https://img.jkt48connect.com/jkt48/theater/uploads/vtkqhjbmjch7dzr29rd1ju4u.jpg";
  if (t.includes("tunas") || t.includes("matahari")) return "https://img.jkt48connect.com/jkt48/theater/uploads/xspjxcs9wwm9jxwhiy5q.jpg";
  if (t.includes("passion") || t.includes("gadis")) return "https://img.jkt48connect.com/jkt48/theater/uploads/shqp2lqsxwef05lguvaw.jpg";
  return "https://img.jkt48connect.com/jkt48/theater/uploads/y2g3dgukgk8ohxghfxv8lyju.jpg";
}

export default function ScheduleCalendarView() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [events, setEvents] = useState<Jkt48ScheduleEvent[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<Jkt48AvailablePeriod[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const fetchSchedule = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/jkt48/schedule?year=${year}&month=${month}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memuat jadwal acara JKT48.");
      }
      setEvents(json.data.events || []);
      if (Array.isArray(json.data.available_periods) && json.data.available_periods.length > 0) {
        setAvailablePeriods(json.data.available_periods);
      }
    } catch (err: any) {
      setError(err?.message || "Tidak dapat menghubungi server jadwal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchSchedule]);

  // Kalender calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    const days: { day: number | null; dateStr: string; events: Jkt48ScheduleEvent[] }[] = [];

    // Padding empty cells before day 1
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, dateStr: "", events: [] });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const padM = String(selectedMonth).padStart(2, "0");
      const padD = String(d).padStart(2, "0");
      const dateStr = `${selectedYear}-${padM}-${padD}`;
      const dayEvents = events.filter((e) => e.date === dateStr);
      days.push({ day: d, dateStr, events: dayEvents });
    }

    return days;
  }, [selectedYear, selectedMonth, events]);

  // Selected date events or all month events
  const displayedAgenda = useMemo(() => {
    if (selectedDate) {
      return events.filter((e) => e.date === selectedDate);
    }
    return events;
  }, [events, selectedDate]);

  // Filter shows only for monthly showcase
  const monthlyShows = useMemo(() => {
    return events.filter((e) => e.type === "theater" || (e.title && e.title.toLowerCase().includes("show")));
  }, [events]);

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [y, m] = e.target.value.split("-").map(Number);
    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDate("");
  };

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div className={styles.titleArea}>
          <i className="bx bx-calendar-event" />
          <h3>Kalender Kegiatan Erine & JKT48</h3>
        </div>

        <div className={styles.periodControls}>
          <label htmlFor="period-select" style={{ fontSize: "0.85rem", color: "var(--cv-text-dim)" }}>
            Bulan:
          </label>
          <select
            id="period-select"
            className={styles.selectPeriod}
            value={`${selectedYear}-${selectedMonth}`}
            onChange={handlePeriodChange}
          >
            {availablePeriods.length > 0 ? (
              availablePeriods.map((p: any, idx: number) => {
                const y = typeof p === "string" ? parseInt(p.split("-")[0], 10) : p.year;
                const m = typeof p === "string" ? parseInt(p.split("-")[1], 10) : p.month;
                const validY = !isNaN(y) ? y : selectedYear;
                const validM = !isNaN(m) && m >= 1 && m <= 12 ? m : selectedMonth;
                const label = p.label && !p.label.includes("undefined")
                  ? p.label
                  : `${MONTH_NAMES[validM - 1]} ${validY}`;

                return (
                  <option key={`${validY}-${validM}-${idx}`} value={`${validY}-${validM}`}>
                    {label}
                  </option>
                );
              })
            ) : (
              <option value={`${selectedYear}-${selectedMonth}`}>
                {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </option>
            )}
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className={styles.skeletonContainer}>
          <div className={styles.skeletonBox} />
          <div className={styles.skeletonBox} style={{ height: "180px" }} />
          <div className={styles.skeletonBox} style={{ height: "120px" }} />
        </div>
      ) : error ? (
        <div className={styles.stateBox}>
          <i className={`bx bx-error-circle ${styles.stateIcon}`} />
          <div className={styles.stateText}>{error}</div>
          <button
            className={styles.retryBtn}
            onClick={() => fetchSchedule(selectedYear, selectedMonth)}
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <>
          <div className={styles.calendarGridWrapper}>
            {/* Calendar Grid View */}
            <div className={styles.calendarCard}>
              <div className={styles.monthHeader}>
                <div className={styles.monthTitle}>
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </div>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate("")}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--cv-orange)",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Tampilkan Semua Tanggal
                  </button>
                )}
              </div>

              <div className={styles.weekDaysRow}>
                {DAY_NAMES.map((name) => (
                  <div key={name}>{name}</div>
                ))}
              </div>

              <div className={styles.daysGrid}>
                {calendarDays.map((item, idx) => {
                  if (!item.day) {
                    return <div key={idx} className={`${styles.dayCell} ${styles.dayCellEmpty}`} />;
                  }

                  const isToday =
                    now.getFullYear() === selectedYear &&
                    now.getMonth() + 1 === selectedMonth &&
                    now.getDate() === item.day;

                  const isSelected = selectedDate === item.dateStr;
                  const hasShow = item.events.some((e) => e.type === "theater" || (e.title && e.title.toLowerCase().includes("show")));

                  return (
                    <div
                      key={idx}
                      className={`${styles.dayCell} ${isSelected ? styles.dayCellSelected : ""}`}
                      onClick={() => setSelectedDate(isSelected ? "" : item.dateStr)}
                    >
                      <span className={`${styles.dayNum} ${isToday ? styles.dayToday : ""}`}>
                        {item.day}
                      </span>

                      {hasShow && (
                        <div className={styles.showCellBadge}>Show</div>
                      )}

                      {item.events.length > 0 && (
                        <div className={styles.dotsWrapper}>
                          {item.events.slice(0, 3).map((e, eIdx) => {
                            const isEventShow = e.type === "theater" || (e.title && e.title.toLowerCase().includes("show"));
                            return (
                              <span
                                key={eIdx}
                                className={`${styles.eventDot} ${
                                  isEventShow
                                    ? styles.eventDotShow
                                    : e.is_erine
                                    ? styles.eventDotErine
                                    : ""
                                }`}
                                title={e.title}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agenda List */}
            <div className={styles.agendaCard}>
              <div className={styles.agendaHeader}>
                <div className={styles.agendaTitle}>
                  {selectedDate
                    ? `Agenda Tanggal ${selectedDate.split("-").reverse().join("/")}`
                    : `Daftar Agenda (${displayedAgenda.length})`}
                </div>
              </div>

              {displayedAgenda.length === 0 ? (
                <div className={styles.stateBox} style={{ border: "none", padding: "2rem 1rem" }}>
                  <i className={`bx bx-calendar-x ${styles.stateIcon}`} style={{ fontSize: "2rem" }} />
                  <p className={styles.stateText}>
                    {selectedDate
                      ? "Tidak ada agenda kegiatan pada tanggal ini."
                      : "Belum ada agenda jadwal untuk bulan ini."}
                  </p>
                </div>
              ) : (
                <div className={styles.agendaList}>
                  {displayedAgenda.map((evt, idx) => {
                    const isShow = evt.type === "theater" || (evt.title && evt.title.toLowerCase().includes("show"));
                    const bannerUrl = getShowBanner(evt.title);

                    return (
                      <div
                        key={evt.id || idx}
                        className={`${styles.eventItem} ${
                          evt.is_erine ? styles.eventItemErine : ""
                        }`}
                      >
                        {isShow && (
                          <div className={styles.eventBannerWrapper}>
                            <img
                              src={bannerUrl}
                              alt={evt.title}
                              className={styles.eventBannerImg}
                              loading="lazy"
                            />
                            <div className={styles.eventBannerOverlay} />
                            <span className={styles.eventBannerTag}>SHOW THEATER</span>
                          </div>
                        )}

                        <div className={styles.eventMeta}>
                          <span>
                            <i className="bx bx-calendar" /> {evt.date}{" "}
                            {evt.time ? `· ${evt.time} WIB` : ""}
                          </span>
                          {evt.is_erine && (
                            <span className={styles.badgeErine}>
                              <i className="bx bxs-star" /> Erine
                            </span>
                          )}
                        </div>

                        <div className={styles.eventName}>{evt.title}</div>

                        {evt.description && (
                          <div className={styles.eventDesc}>{evt.description}</div>
                        )}

                        {Array.isArray(evt.members) && evt.members.length > 0 && (
                          <div className={styles.eventMembers}>
                            {evt.members.slice(0, 8).map((m, mIdx) => (
                              <span
                                key={mIdx}
                                className={`${styles.memberPill} ${
                                  typeof m !== "string" && m.name?.toLowerCase().includes("erine")
                                    ? styles.memberPillErine
                                    : ""
                                }`}
                              >
                                {typeof m === "string" ? m : m.name}
                              </span>
                            ))}
                            {evt.members.length > 8 && (
                              <span className={styles.memberPill}>
                                +{evt.members.length - 8} lainnya
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Showcase List for Shows of the Month */}
          {monthlyShows.length > 0 && (
            <div className={styles.showsShowcase}>
              <div className={styles.showcaseHeader}>
                <h4 className={styles.showcaseTitle}>
                  <i className="bx bx-film" style={{ color: "#d4af37" }} />
                  <span>Jadwal Show Theater Bulan Ini ({monthlyShows.length})</span>
                </h4>
              </div>

              <div className={styles.showcaseGrid}>
                {monthlyShows.map((s, idx) => (
                  <div key={s.id || idx} className={styles.showcaseCard}>
                    <img
                      src={getShowBanner(s.title)}
                      alt={s.title}
                      className={styles.showcaseBanner}
                      loading="lazy"
                    />
                    <div className={styles.showcaseBody}>
                      <div className={styles.showcaseMeta}>
                        <span className={styles.showcaseDate}>
                          <i className="bx bx-calendar" /> {s.date}
                        </span>
                        <span>{s.time || "19:00"} WIB</span>
                      </div>
                      <h5 className={styles.showcaseShowTitle}>{s.title}</h5>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--cv-text-dim)" }}>
                        {s.description || "Theater JKT48, fX Sudirman"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
