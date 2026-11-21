"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./ExclusiveStockView.module.css";
import type { Jkt48ExclusiveFlattenedResponse } from "@/types/jkt48";

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
    if (s.includes("sold") || s.includes("habis")) {
      return (
        <span className={styles.badgeHabis}>
          <i className="bx bx-lock-alt" /> Habis
        </span>
      );
    }
    return (
      <span className={styles.badgeTersedia}>
        <i className="bx bx-check-circle" /> Tersedia
      </span>
    );
  };

  const totalAvailable = data?.summary?.total_available ?? 0;
  const totalSoldOut = data?.summary?.total_sold_out ?? 0;
  const totalSessions = data?.summary?.total_sessions ?? (data?.sessions?.length || 0);

  return (
    <div className={styles.container}>
      <div className={styles.mainCard}>
        {/* Top Header & Date Picker */}
        <div className={styles.topBar}>
          <div className={styles.titleArea}>
            <div className={styles.tagExclusive}>
              <i className="bx bx-purchase-tag-alt" />
              <span>EXCLUSIVE 2-SHOT & VC</span>
            </div>
            <h3 className={styles.cardTitle}>Status Stok Tiket Eksklusif Erine</h3>
            <span className={styles.eventSub}>
              Event ID: {exclusiveId} · Khusus Catherina Vallencia
            </span>
          </div>

          <div className={styles.dateControlBox}>
            <span className={styles.dateLabel}>Pilih Tanggal:</span>
            <input
              type="date"
              className={styles.dateInput}
              value={selectedDate}
              onChange={handleDateChange}
              aria-label="Pilih Tanggal Sesi"
            />
            {selectedDate && (
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => setSelectedDate("")}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div className={styles.metricsStrip}>
          <div className={styles.pillsRow}>
            <span className={`${styles.metricPill} ${styles.pillOpen}`}>
              <span className={styles.pillOpenDot} />
              Status Penjualan: {data?.sales_status || "OPEN"}
            </span>

            <span className={`${styles.metricPill} ${styles.pillAvailable}`}>
              Tersedia: {totalAvailable}
            </span>

            <span className={`${styles.metricPill} ${styles.pillSoldOut}`}>
              Habis: {totalSoldOut}
            </span>

            <span className={`${styles.metricPill} ${styles.pillTotal}`}>
              Sesi Erine: {totalSessions}
            </span>
          </div>

          <a
            href={data?.purchase_url || `https://jkt48.com/purchase/exclusive?code=${exclusiveId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.buyOfficialBtn}
          >
            <span>Beli di Official JKT48</span>
            <i className="bx bx-link-external" />
          </a>
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#78716c" }}>
            <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem", color: "#dc2626" }} />
            <p style={{ marginTop: "10px", fontSize: "0.9rem" }}>Memeriksa slot tiket Erine...</p>
          </div>
        ) : error ? (
          <div style={{ padding: "30px", textAlign: "center", color: "#b91c1c" }}>
            <p>{error}</p>
            <button
              type="button"
              className={styles.buyOfficialBtn}
              onClick={() => fetchData(selectedDate)}
              style={{ marginTop: "10px" }}
            >
              Coba Lagi
            </button>
          </div>
        ) : !data || data.sessions.length === 0 ? (
          <div className={styles.emptyNotice}>
            <i className="bx bx-calendar-x" style={{ fontSize: "2rem", color: "#a8a29e", marginBottom: "8px", display: "block" }} />
            Tidak ada jadwal sesi eksklusif untuk Erine pada tanggal ini.
          </div>
        ) : (
          <div className={styles.sessionsGrid}>
            {data.sessions.map((session, sIdx) => {
              const cleanTime = (session.start_time || "").slice(0, 5);

              return (
                <div key={sIdx} className={styles.sessionTicket}>
                  <div className={styles.sessionTopRow}>
                    <span className={styles.sessionLabelTag}>
                      {session.label || `Sesi ${sIdx + 1}`}
                    </span>
                    <span className={styles.sessionTimeChip}>
                      <i className="bx bx-time" /> {cleanTime} WIB
                    </span>
                  </div>

                  {session.lanes.map((lane, lIdx) => (
                    <div key={lIdx} className={styles.memberLaneBox}>
                      <div className={styles.memberMetaLeft}>
                        <img
                          src="https://jkt48.com/api/v1/storages/media/jkt48-member/catherina_vallencia.jpg"
                          alt="Catherina Vallencia"
                          className={styles.memberThumb}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg";
                          }}
                        />
                        <div className={styles.memberNameCol}>
                          <span className={styles.memberRealName}>
                            {lane.member_name || "Catherina Vallencia"}
                          </span>
                          <span className={styles.memberSpecialStar}>
                            <i className="bx bxs-star" /> Member Slot
                          </span>
                        </div>
                      </div>

                      {getStatusBadge(lane.status)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
