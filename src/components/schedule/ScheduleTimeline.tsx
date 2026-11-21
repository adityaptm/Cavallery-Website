"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./ScheduleTimeline.module.css";
import SpotlightCard from "./SpotlightCard";
import ShowModal from "./ShowModal";
import { TimelineSkeletonList } from "./ScheduleSkeletons";
import type { Jkt48TheaterShow } from "@/types/jkt48";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default function ScheduleTimeline() {
  const [shows, setShows] = useState<Jkt48TheaterShow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Filter mode: "month" | "upcoming" | "completed" | "all"
  const [activeTab, setActiveTab] = useState<"month" | "upcoming" | "completed" | "all">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Modal Detail State
  const [selectedShow, setSelectedShow] = useState<Jkt48TheaterShow | null>(null);

  const fetchShows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/jkt48/theater");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memuat jadwal show teater Erine.");
      }

      setShows(json.data?.shows || []);
    } catch (err: any) {
      setError(err?.message || "Tidak dapat menghubungi server jadwal teater.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  // Counts for each tab
  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYearNum = now.getFullYear();

  const currentMonthShows = useMemo(() => {
    return shows.filter((s) => {
      const d = new Date(s.date || s.showDate || "");
      return !isNaN(d.getTime()) && d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYearNum;
    });
  }, [shows, currentMonthNum, currentYearNum]);

  const upcomingShows = useMemo(() => {
    return shows.filter((s) => s.status === "upcoming" || s.status === "live");
  }, [shows]);

  const completedShows = useMemo(() => {
    return shows.filter((s) => s.status === "completed");
  }, [shows]);

  // Displayed shows based on active tab & optional month filter
  const displayedShows = useMemo(() => {
    let list: Jkt48TheaterShow[] = [];

    if (activeTab === "month") {
      list = currentMonthShows;
    } else if (activeTab === "upcoming") {
      list = upcomingShows;
    } else if (activeTab === "completed") {
      list = completedShows;
    } else {
      list = shows;
    }

    if (selectedMonth !== "all") {
      const mNum = parseInt(selectedMonth, 10);
      list = list.filter((s) => {
        const d = new Date(s.date || s.showDate || "");
        return !isNaN(d.getTime()) && d.getMonth() + 1 === mNum;
      });
    }

    return list;
  }, [shows, activeTab, selectedMonth, currentMonthShows, upcomingShows, completedShows]);

  const currentMonthLabel = MONTH_NAMES[currentMonthNum - 1]?.toUpperCase() || "BULAN INI";

  return (
    <div className={styles.timelineSection}>
      {/* ── Top Header & Pill Filter Group ── */}
      <div className={styles.headerBar}>
        <div className={styles.titleArea}>
          <div className={styles.subLabel}>
            <span className={styles.subLabelLine} />
            <span>DETAIL JADWAL</span>
          </div>
          <h2 className={styles.mainHeading}>
            SHOW <span className={styles.mainHeadingHighlight}>& EVENT</span>
          </h2>
        </div>

        {/* Pill Group (Like Reference Design) */}
        <div className={styles.pillFilterGroup}>
          <button
            type="button"
            className={`${styles.filterPillBtn} ${activeTab === "month" ? styles.filterPillActive : ""}`}
            onClick={() => {
              setActiveTab("month");
              setSelectedMonth("all");
            }}
          >
            <span>{currentMonthLabel}</span>
            <span className={styles.countBadge}>{currentMonthShows.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.filterPillBtn} ${activeTab === "upcoming" ? styles.filterPillActive : ""}`}
            onClick={() => {
              setActiveTab("upcoming");
              setSelectedMonth("all");
            }}
          >
            <span>MENDATANG</span>
            <span className={styles.countBadge}>{upcomingShows.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.filterPillBtn} ${activeTab === "completed" ? styles.filterPillActive : ""}`}
            onClick={() => {
              setActiveTab("completed");
              setSelectedMonth("all");
            }}
          >
            <span>SELESAI</span>
            <span className={styles.countBadge}>{completedShows.length}</span>
          </button>

          <button
            type="button"
            className={`${styles.filterPillBtn} ${activeTab === "all" ? styles.filterPillActive : ""}`}
            onClick={() => {
              setActiveTab("all");
              setSelectedMonth("all");
            }}
          >
            <span>SEMUA</span>
            <span className={styles.countBadge}>{shows.length}</span>
          </button>
        </div>
      </div>

      {/* Month Filter Dropdown (Optional Filter) */}
      {activeTab === "all" && (
        <div className={styles.monthPickerRow}>
          <span style={{ fontSize: "0.8rem", color: "var(--cv-text-dim)" }}>Filter Bulan:</span>
          <select
            className={styles.monthSelect}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            aria-label="Pilih Bulan"
          >
            <option value="all">Semua Bulan</option>
            {MONTH_NAMES.map((mName, idx) => (
              <option key={idx + 1} value={String(idx + 1)}>
                {mName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <TimelineSkeletonList count={3} />
      ) : error ? (
        <div className={styles.errorBox}>
          <i className="bx bx-error-circle" style={{ fontSize: "2rem", color: "#ef4444" }} />
          <div className={styles.errorText}>{error}</div>
          <button type="button" className={styles.retryBtn} onClick={fetchShows}>
            <i className="bx bx-refresh" /> Coba Lagi
          </button>
        </div>
      ) : displayedShows.length === 0 ? (
        <div className={styles.emptyState}>
          <i className={`bx bx-calendar-x ${styles.emptyIcon}`} />
          <h4 className={styles.emptyTitle}>Tidak Ada Show Erine</h4>
          <p className={styles.emptyText}>
            Tidak ditemukan jadwal show teater untuk Erine pada filter kategori yang dipilih.
          </p>
          {(activeTab !== "all" || selectedMonth !== "all") && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => {
                setActiveTab("all");
                setSelectedMonth("all");
              }}
            >
              Tampilkan Semua Show
            </button>
          )}
        </div>
      ) : (
        /* Grid of Tickets */
        <div className={styles.ticketsGrid}>
          {displayedShows.map((show) => (
            <SpotlightCard
              key={show.id}
              show={show}
              onClick={(s) => setSelectedShow(s)}
            />
          ))}
        </div>
      )}

      {/* Modal Detail Show */}
      <ShowModal
        show={selectedShow}
        onClose={() => setSelectedShow(null)}
      />
    </div>
  );
}
