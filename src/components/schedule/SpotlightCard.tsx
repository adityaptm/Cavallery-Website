"use client";

import { useMemo } from "react";
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

function getMemberPhoto(m: any): string {
  if (typeof m === "string") {
    const slug = m.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return `https://jkt48.com/api/v1/storages/media/jkt48-member/${slug}.jpg`;
  }
  if (m?.avatar && !m.avatar.includes("cava-logo") && !m.avatar.includes("undefined")) return m.avatar;
  if (m?.img && !m.img.includes("cava-logo") && !m.img.includes("undefined")) return m.img;
  const name = (m?.name || "").trim().toLowerCase();
  if (name) {
    const slug = name.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return `https://jkt48.com/api/v1/storages/media/jkt48-member/${slug}.jpg`;
  }
  if (m?.url_key) {
    return `https://jkt48.com/api/v1/storages/media/jkt48-member/${m.url_key.toLowerCase()}.jpg`;
  }
  return "https://jkt48.com/api/v1/storages/media/jkt48-member/catherina_vallencia.jpg";
}

export default function SpotlightCard({ show, onClick }: SpotlightCardProps) {
  // Parse date into stub components
  const { dayAbbr, dayNum, monthAbbr, yearNum } = useMemo(() => {
    try {
      const d = new Date(show.date || show.showDate || "");
      if (isNaN(d.getTime())) {
        return { dayAbbr: "SHOW", dayNum: "--", monthAbbr: "JKT48", yearNum: "2026" };
      }
      return {
        dayAbbr: DAY_ABBR[d.getDay()] || "SHOW",
        dayNum: String(d.getDate()).padStart(2, "0"),
        monthAbbr: MONTH_ABBR[d.getMonth()] || "EVENT",
        yearNum: String(d.getFullYear()),
      };
    } catch {
      return { dayAbbr: "SHOW", dayNum: "--", monthAbbr: "JKT48", yearNum: "2026" };
    }
  }, [show.date, show.showDate]);

  const cleanTime = (show.startTime || "19:00").slice(0, 5);

  const members = show.members || [];
  const ERINE_PASSION_PHOTO = "/api/jkt48/member-photo/catherina_vallencia";
  const erineMember = members.find((m) => m.is_erine) || {
    id: "44",
    name: "Catherina Vallencia (Erine)",
    avatar: ERINE_PASSION_PHOTO,
    is_erine: true,
  };
  const erinePhotoUrl =
    erineMember.avatar &&
    erineMember.avatar.includes("jkt48-member/catherina_vallencia")
      ? erineMember.avatar
      : ERINE_PASSION_PHOTO;
  const otherMembers = members.filter((m) => !m.is_erine);
  const displayOthers = otherMembers.slice(0, 4);
  const remainingCount = Math.max(0, otherMembers.length - 4);

  const isLive = show.status === "live";
  const isUpcoming = show.status === "upcoming";

  return (
    <div
      className={styles.ticketWrapper}
      onClick={() => onClick && onClick(show)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick && onClick(show);
        }
      }}
      aria-label={`Tiket Show ${show.title}, ${dayAbbr} ${dayNum} ${monthAbbr} ${yearNum}`}
    >
      {/* ── 1. LEFT STUB (Date Column) ── */}
      <div className={styles.stubLeft}>
        <span className={styles.stubDay}>{dayAbbr}</span>
        <span className={styles.stubNumber}>{dayNum}</span>
        <div className={styles.stubMonthYear}>
          <span>{monthAbbr}</span>
          <span>{yearNum}</span>
        </div>
      </div>

      {/* ── 2. NOTCHES ── */}
      <div className={styles.notchDivider}>
        <div className={styles.notchTop} />
        <div className={styles.notchBottom} />
      </div>

      {/* ── 3. RIGHT TICKET BODY ── */}
      <div className={styles.ticketBody}>
        {/* Top Row: Team Badge & Status */}
        <div className={styles.metaRow}>
          <span className={`${styles.teamBadge} ${show.is_special ? styles.specialBadge : ""}`}>
            {show.is_special ? (
              <>
                <i className="bx bxs-star" /> SPESIAL ERINE
              </>
            ) : (
              show.team || "TEAM PASSION"
            )}
          </span>

          <span
            className={`${styles.statusPill} ${
              isLive
                ? styles.statusLive
                : isUpcoming
                ? styles.statusUpcoming
                : ""
            }`}
          >
            <span className={styles.statusDot} />
            {isLive ? "LIVE" : isUpcoming ? "AKAN DATANG" : "SELESAI"}
          </span>
        </div>

        {/* Show Title */}
        <h3 className={styles.showTitle} title={show.title}>
          {show.title}
        </h3>

        {/* Time & Place */}
        <div className={styles.infoRow}>
          <div className={styles.infoItem}>
            <i className="bx bx-time" />
            <span>{cleanTime} WIB</span>
          </div>

          <div className={styles.infoItem}>
            <i className="bx bx-map-pin" />
            <span>{show.location || "JKT48 Theater"}</span>
          </div>
        </div>

        {/* Perforated Divider Line */}
        <div className={styles.perforatedLine} />

        {/* Bottom Lineup: Erine Pill + Member Stack + Arrow */}
        <div className={styles.bottomRow}>
          <div className={styles.lineupGroup}>
            {/* Erine Highlight Pill */}
            <div className={styles.erinePill} title="Catherina Vallencia (Erine)">
              <img
                src={erinePhotoUrl}
                alt="Erine - Team Passion JKT48"
                className={styles.erineAvatar}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    "https://jkt48.com/api/v1/storages/media/jkt48-member/catherina_vallencia.jpg";
                }}
              />
              <span>ERINE</span>
            </div>

            {/* Other Member Avatars */}
            <div className={styles.avatarStack}>
              {displayOthers.map((m, idx) => {
                const memberName = typeof m === "string" ? m : m?.name || `Member ${idx + 1}`;
                const rawName = typeof m === "string" ? m : m?.name || "";
                const slug = rawName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

                return (
                  <img
                    key={m.id || idx}
                    src={getMemberPhoto(m)}
                    alt={memberName}
                    className={styles.otherAvatar}
                    title={memberName}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const imgEl = e.currentTarget as HTMLImageElement;
                      if (slug && !imgEl.src.includes("/api/jkt48/member-photo")) {
                        imgEl.src = `/api/jkt48/member-photo/${slug}`;
                      } else {
                        imgEl.src = "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg";
                      }
                    }}
                  />
                );
              })}

              {remainingCount > 0 && (
                <span className={styles.moreMembersPill}>+{remainingCount}</span>
              )}
            </div>
          </div>

          {/* Action Arrow Button */}
          <div className={styles.arrowBtn}>
            <i className="bx bx-right-arrow-alt" />
          </div>
        </div>
      </div>
    </div>
  );
}
