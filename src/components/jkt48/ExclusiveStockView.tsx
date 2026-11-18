"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./ExclusiveStockView.module.css";
import type { Jkt48ExclusiveFlattenedResponse, ExclusiveSession } from "@/types/jkt48";

interface ExclusiveStockViewProps {
  exclusiveId?: string;
}

export default function ExclusiveStockView({ exclusiveId = "EX79CB" }: ExclusiveStockViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [data, setData] = useState<Jkt48ExclusiveFlattenedResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const fetchData = useCallback(async (date: string) => {
    setLoading(true);
    setError("");
    try {
      const url = `/api/jkt48/exclusives?id=${encodeURIComponent(exclusiveId)}${
        date ? `&date=${encodeURIComponent(date)}` : ""
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Gagal memuat status ketersediaan tiket eksklusif.");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err?.message || "Tidak dapat memuat stok eksklusif.");
    } finally {
      setLoading(false);
    }
  }, [exclusiveId]);

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate, fetchData]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("available") || s.includes("tersedia") || s.includes("ready") || s.includes("open")) {
      return <span className={`${styles.badgeStatus} ${styles.statusAvailable}`}>Tersedia</span>;
    }
    if (s.includes("limited") || s.includes("hampir") || s.includes("sisa")) {
      return <span className={`${styles.badgeStatus} ${styles.statusLimited}`}>Hampir Habis</span>;
    }
    return <span className={`${styles.badgeStatus} ${styles.statusSoldOut}`}>Habis</span>;
  };

  return (
    <div className={styles.container}>
      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div className={styles.titleArea}>
          <i className="bx bx-purchase-tag-alt" />
          <div>
            <h3>Status Stok Tiket Eksklusif</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--cv-text-dim)" }}>
              ID Event: {exclusiveId}
            </span>
          </div>
        </div>

        <div className={styles.dateControls}>
          <label htmlFor="exclusive-date" style={{ fontSize: "0.85rem", color: "var(--cv-text-dim)" }}>
            Pilih Tanggal:
          </label>
          <input
            id="exclusive-date"
            type="date"
            className={styles.dateInput}
            value={selectedDate}
            onChange={handleDateChange}
          />
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
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Purchase Bar if data available */}
      {data && (
        <div className={styles.purchaseBar}>
          <div className={styles.purchaseInfo}>
            <div className={styles.purchaseTitle}>
              Status Penjualan: <span style={{ textTransform: "uppercase", color: "var(--cv-orange)" }}>{data.sales_status}</span>
            </div>
            {data.summary && (
              <div className={styles.purchaseSub}>
                Tersedia: {data.summary.total_available ?? "-"} · Habis: {data.summary.total_sold_out ?? "-"} · Total Sesi: {data.summary.total_sessions ?? data.sessions.length}
              </div>
            )}
          </div>
          <a
            href={data.purchase_url || "https://jkt48.com"}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.buyBtn}
          >
            <i className="bx bx-cart" /> Beli di Official JKT48
          </a>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className={styles.skeletonContainer}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonBox} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.stateBox}>
          <i className={`bx bx-error-circle ${styles.stateIcon}`} />
          <div className={styles.stateText}>{error}</div>
          <button className={styles.retryBtn} onClick={() => fetchData(selectedDate)}>
            Coba Lagi
          </button>
        </div>
      ) : !data || data.sessions.length === 0 ? (
        <div className={styles.stateBox}>
          <i className={`bx bx-calendar-x ${styles.stateIcon}`} />
          <div className={styles.stateText}>
            Tidak ada jadwal sesi eksklusif yang ditemukan untuk tanggal ini.
          </div>
        </div>
      ) : (
        <div className={styles.sessionsGrid}>
          {data.sessions.map((session, sIdx) => {
            return (
              <div key={sIdx} className={styles.sessionCard}>
                <div className={styles.sessionHeader}>
                  <div className={styles.sessionLabel}>{session.label}</div>
                  <div className={styles.sessionTime}>
                    <i className="bx bx-time" /> {session.start_time} WIB
                  </div>
                </div>

                <div className={styles.lanesList}>
                  {session.lanes.map((lane, lIdx) => {
                    const isErine = lane.member_name?.toLowerCase().includes("erine") ||
                                    lane.member_name?.toLowerCase().includes("catherina");
                    return (
                      <div key={lIdx} className={styles.laneItem}>
                        <div className={`${styles.laneMember} ${isErine ? styles.laneMemberErine : ""}`}>
                          {isErine && <i className="bx bxs-star" style={{ marginRight: "4px" }} />}
                          {lane.member_name}
                        </div>
                        {getStatusBadge(lane.status)}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
