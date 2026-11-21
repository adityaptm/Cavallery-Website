"use client";

import { useMemo, useState } from "react";
import styles from "./SpotlightCard.module.css";
import type { Jkt48TheaterShow } from "@/types/jkt48";

interface SpotlightCardProps {
  show: Jkt48TheaterShow;
  onClick?: (show: Jkt48TheaterShow) => void;
}

const DAY_ABBR = ["MIN", "SEN", "SEL", "RAB", "KAM", "JUM", "SAB"];
const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MEI", "JUN",
  "JUL", "AGU", "SEP", "OKT", "NOV", "DES",
];

function formatHorizontalPill(dateStr: string, timeStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return `${dateStr} · ${timeStr} WIB`;
    const day = DAY_ABBR[d.getDay()] || "";
    const dateNum = d.getDate();
    const month = MONTH_ABBR[d.getMonth()] || "";
    const cleanTime = (timeStr || "19:00").slice(0, 5);
    return `${day} · ${dateNum} ${month} · ${cleanTime} WIB`;
  } catch {
    return `${dateStr} · ${timeStr} WIB`;
  }
}

const DEFAULT_ERINE_PORTRAIT = "https://images.jkt48connect.com/cavallery/images/2026/09/cf207d2f32384a39.jpg";
const FALLBACK_ERINE_PORTRAIT = "/images/erine-passion.webp";

export default function SpotlightCard({ show, onClick }: SpotlightCardProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    show.banner && show.banner.includes("http") ? show.banner : DEFAULT_ERINE_PORTRAIT
  );

  const datePill = useMemo(
    () => formatHorizontalPill(show.date || show.showDate || "", show.startTime || "19:00"),
    [show.date, show.showDate, show.startTime]
  );

  const members = show.members || [];
  const erineMember = members.find((m) => m.is_erine) || {
    id: "44",
    name: "Catherina Vallencia",
    url_key: "erine",
    avatar: "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
    is_erine: true,
  };
  const otherMembers = members.filter((m) => !m.is_erine);
  const displayOthers = otherMembers.slice(0, 4);
  const remainingCount = Math.max(0, otherMembers.length - 4);

  const statusClass =
    show.status === "live"
      ? styles.cardLive
      : show.status === "completed"
      ? styles.cardCompleted
      : "";

  return (
    <div
      className={`${styles.card} ${show.is_special ? styles.cardSpecial : ""} ${statusClass}`}
      onClick={() => onClick && onClick(show)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick(show);
        }
      }}
      aria-label={`Show ${show.title}, tanggal ${datePill}`}
    >
      {/* Sisi Kiri: Detail Informasi & Lineup */}
      <div className={styles.contentArea}>
        {/* Baris Chip Horizontal */}
        <div className={styles.metaRow}>
          <div className={styles.chipDate}>
            <i className="bx bx-time" style={{ color: "var(--cv-orange)" }} />
            {datePill}
          </div>

          {show.team && (
            <div className={styles.chipTeam}>
              {show.team}
            </div>
          )}

          {show.is_special && (
            <div className={styles.chipSpecial}>
              <i className="bx bxs-star" />
              Spesial Erine
            </div>
          )}

          <div
            className={`${styles.chipStatus} ${
              show.status === "live"
                ? styles.statusLive
                : show.status === "upcoming"
                ? styles.statusUpcoming
                : styles.statusCompleted
            }`}
          >
            <span className={styles.statusDot} />
            {show.status === "live"
              ? "LIVE SEKARANG"
              : show.status === "upcoming"
              ? "Akan Datang"
              : "Selesai"}
          </div>
        </div>

        {/* Judul Show - Font Display Condensed Tebal */}
        <h3 className={styles.title} title={show.title}>
          {show.title}
        </h3>

        {/* Lokasi */}
        <div className={styles.locationRow}>
          <i className="bx bx-map-pin" />
          <span>{show.location || "Theater JKT48, fX Sudirman"}</span>
        </div>

        {/* Countdown / Status Hint */}
        {show.countdownText && (
          <div className={styles.countdownBadge}>
            <i className={show.status === "live" ? "bx bx-broadcast" : "bx bx-alarm"} />
            <span>{show.countdownText}</span>
          </div>
        )}

        {/* Stack Avatar Lineup */}
        <div className={styles.membersRow}>
          <div className={styles.avatarStack}>
            {/* Foto Erine selalu paling depan */}
            <div className={`${styles.avatarItem} ${styles.avatarErine}`} title="Catherina Vallencia (Erine)">
              <img
                src={erineMember.avatar || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg"}
                alt="Erine JKT48"
                className={styles.avatarImg}
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg";
                }}
              />
              <span className={styles.starBadge}><i className="bx bxs-star" /></span>
            </div>

            {/* Member Lain Ukuran Lebih Kecil */}
            {displayOthers.map((m, idx) => (
              <div
                key={m.id || idx}
                className={styles.avatarItem}
                title={m.name}
              >
                <img
                  src={m.avatar || m.img || "/images/cava-logo-round.png"}
                  alt={m.name}
                  className={styles.avatarImg}
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/images/cava-logo-round.png";
                  }}
                />
              </div>
            ))}

            {remainingCount > 0 && (
              <div className={styles.avatarMore}>
                +{remainingCount}
              </div>
            )}
          </div>

          <div className={styles.lineupHint}>
            Erine & {otherMembers.length} member lainnya
          </div>
        </div>

        {/* Action Callout */}
        <button type="button" className={styles.actionBtn}>
          <span>{show.status === "completed" ? "Lihat Rekaman & Detail" : "Detail Show & Tiket"}</span>
          <i className="bx bx-right-arrow-alt" />
        </button>
      </div>

      {/* Sisi Kanan: Spotlight + Foto Erine Menonjol */}
      <div className={styles.spotlightArea}>
        <div className={styles.spotlightGlow} />
        <div className={styles.portraitWrapper}>
          <img
            src={imgSrc}
            alt={`Erine - ${show.title}`}
            className={styles.portraitImg}
            loading="lazy"
            onError={() => {
              if (imgSrc !== FALLBACK_ERINE_PORTRAIT) {
                setImgSrc(FALLBACK_ERINE_PORTRAIT);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
