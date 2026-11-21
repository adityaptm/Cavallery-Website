"use client";

import { useMemo, useState } from "react";
import styles from "./NextShowHero.module.css";
import type { Jkt48TheaterShow } from "@/types/jkt48";

interface NextShowHeroProps {
  show: Jkt48TheaterShow | null;
  onOpenDetail?: (show: Jkt48TheaterShow) => void;
}

export default function NextShowHero({ show, onOpenDetail }: NextShowHeroProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    show?.banner && show.banner.includes("http")
      ? show.banner
      : "https://images.jkt48connect.com/cavallery/images/2026/09/cf207d2f32384a39.jpg"
  );

  const formattedDate = useMemo(() => {
    if (!show?.date) return "";
    try {
      const d = new Date(show.date);
      return d.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return show.date;
    }
  }, [show?.date]);

  if (!show) {
    return null;
  }

  const isLive = show.status === "live";

  return (
    <div className={styles.heroContainer}>
      <div className={styles.heroContent}>
        <div className={styles.heroHeaderTag}>
          <i className={isLive ? "bx bx-broadcast bx-flashing" : "bx bxs-star"} />
          {isLive ? "Erine Sedang Tampil di Teater!" : "Show Berikutnya Erine"}
        </div>

        <h2 className={styles.heroTitle} title={show.title}>
          {show.title}
        </h2>

        <div className={styles.heroMetaChips}>
          <div className={styles.heroChip}>
            <i className="bx bx-calendar" />
            <span>{formattedDate}</span>
          </div>

          <div className={styles.heroChip}>
            <i className="bx bx-time" />
            <span>{(show.startTime || "19:00").slice(0, 5)} WIB</span>
          </div>

          {show.team && (
            <div className={styles.heroChip}>
              <i className="bx bxs-flag-alt" />
              <span>{show.team}</span>
            </div>
          )}

          <div className={styles.heroChip}>
            <i className="bx bx-map-pin" />
            <span>{show.location || "Theater JKT48"}</span>
          </div>
        </div>

        {show.countdownText && (
          <div className={styles.heroCountdown}>
            <i className={isLive ? "bx bx-broadcast" : "bx bx-alarm"} />
            <span>{show.countdownText}</span>
          </div>
        )}

        <div className={styles.heroActions}>
          {show.url && show.url !== "#" && (
            <a
              href={show.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnPrimaryTicket}
            >
              <i className="bx bx-ticket" />
              <span>{isLive ? "Tonton Live Streaming" : "Tiket di Official JKT48"}</span>
            </a>
          )}

          <button
            type="button"
            className={styles.btnSecondaryDetail}
            onClick={() => onOpenDetail && onOpenDetail(show)}
          >
            <i className="bx bx-info-circle" />
            <span>Detail Lineup & Rekaman</span>
          </button>
        </div>
      </div>

      <div className={styles.heroVisual}>
        <div className={styles.heroStageGlow} />
        <div className={styles.heroPortrait}>
          <img
            src={imgSrc}
            alt={show.title}
            onError={() => {
              setImgSrc("/images/erine-passion.webp");
            }}
          />
        </div>
      </div>
    </div>
  );
}
