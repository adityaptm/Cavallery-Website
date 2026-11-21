"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import styles from "./ScheduleTimeline.module.css";
import SpotlightCard from "./SpotlightCard";
import NextShowHero from "./NextShowHero";
import ShowModal from "./ShowModal";
import { TimelineSkeletonList } from "./ScheduleSkeletons";
import type { Jkt48TheaterShow } from "@/types/jkt48";

const MONTH_OPTIONS = [
  { value: "all", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export default function ScheduleTimeline() {
  const [shows, setShows] = useState<Jkt48TheaterShow[]>([]);
  const [nextShow, setNextShow] = useState<Jkt48TheaterShow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "completed">("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  // Modal Detail State
  const [selectedShow, setSelectedShow] = useState<Jkt48TheaterShow | null>(null);

  const fetchShows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (monthFilter !== "all") params.set("month", monthFilter);
      if (yearFilter !== "all") params.set("year", yearFilter);

      const res = await fetch(`/api/jkt48/theater?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memuat jadwal show teater Erine.");
      }

      setShows(json.data?.shows || []);
      if (json.data?.next_show) {
        setNextShow(json.data.next_show);
      }
    } catch (err: any) {
      setError(err?.message || "Tidak dapat menghubungi server jadwal teater.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, monthFilter, yearFilter]);

  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  // Kelompokkan show berdasarkan Bulan & Tahun untuk timeline
  const groupedShows = useMemo(() => {
    const groups: { [key: string]: Jkt48TheaterShow[] } = {};

    for (const show of shows) {
      let key = "Jadwal Acara";
      try {
        const d = new Date(show.date || show.showDate || "");
        if (!isNaN(d.getTime())) {
          key = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
        }
      } catch {}

      if (!groups[key]) groups[key] = [];
      groups[key].push(show);
    }

    return Object.entries(groups).map(([groupTitle, items]) => ({
      groupTitle,
      items,
    }));
  }, [shows]);

  return (
    <div className={styles.timelineSection}>
      {/* Hero: Show Terdekat Erine */}
      {nextShow && (
        <NextShowHero
          show={nextShow}
          onOpenDetail={(s) => setSelectedShow(s)}
        />
      )}

      {/* Baris Filter & Kontrol */}
      <div className={styles.controlsBar}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Status:</span>
          <div className={styles.statusTabs}>
            <button
              type="button"
              className={`${styles.tabBtn} ${statusFilter === "all" ? styles.tabBtnActive : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              Semua ({shows.length})
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${statusFilter === "upcoming" ? styles.tabBtnActive : ""}`}
              onClick={() => setStatusFilter("upcoming")}
            >
              Akan Datang
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${statusFilter === "completed" ? styles.tabBtnActive : ""}`}
              onClick={() => setStatusFilter("completed")}
            >
              Selesai
            </button>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Pilih Bulan:</span>
          <select
            className={styles.monthSelect}
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Pilih Bulan Jadwal"
          >
            {MONTH_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

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
      ) : shows.length === 0 ? (
        <div className={styles.emptyState}>
          <i className={`bx bx-calendar-x ${styles.emptyIcon}`} />
          <h4 className={styles.emptyTitle}>Tidak Ada Show Erine</h4>
          <p className={styles.emptyText}>
            Tidak ditemukan jadwal show teater untuk Erine pada filter periode yang dipilih.
            Silakan pilih bulan lain atau reset filter untuk melihat seluruh arsip show Erine.
          </p>
          {(statusFilter !== "all" || monthFilter !== "all") && (
            <button
              type="button"
              className={styles.resetBtn}
              onClick={() => {
                setStatusFilter("all");
                setMonthFilter("all");
              }}
            >
              Tampilkan Semua Show
            </button>
          )}
        </div>
      ) : (
        /* Timeline Vertikal dengan Garis Tipis di Sisi Kiri */
        <div className={styles.timelineContainer}>
          <div className={styles.timelineLine} />

          {groupedShows.map((group, gIdx) => (
            <div key={gIdx} className={styles.timelineGroup}>
              {/* Group Header (Bulan / Periode) */}
              <div className={styles.groupHeader}>
                <div className={styles.timelineNode}>
                  <div className={styles.nodeDot} />
                </div>
                <h3 className={styles.groupTitle}>{group.groupTitle}</h3>
              </div>

              {/* Stack Spotlight Cards */}
              <div className={styles.cardsStack}>
                {group.items.map((show) => (
                  <SpotlightCard
                    key={show.id}
                    show={show}
                    onClick={(s) => setSelectedShow(s)}
                  />
                ))}
              </div>
            </div>
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
