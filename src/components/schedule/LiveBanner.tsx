"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./LiveBanner.module.css";
import type { Jkt48LiveItem } from "@/types/jkt48";

export default function LiveBanner() {
  const [liveStream, setLiveStream] = useState<Jkt48LiveItem | null>(null);
  const [notification, setNotification] = useState<{
    banner_url?: string;
    caption?: string;
  } | null>(null);

  const checkLive = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      const res = await fetch("/api/jkt48/live/now");
      const json = await res.json();
      if (json.success && json.data) {
        const lives: Jkt48LiveItem[] = json.data.lives || [];
        const erine = lives.find((l) => l.is_erine) || null;
        setLiveStream(erine);
        setNotification(json.data.notification || null);
      }
    } catch (err) {
      // Ignore polling errors
    }
  }, []);

  useEffect(() => {
    checkLive();
    const interval = setInterval(checkLive, 20000);
    return () => clearInterval(interval);
  }, [checkLive]);

  if (!liveStream) {
    return null;
  }

  const platformLabel = (liveStream.platform || liveStream.type || "LIVE").toUpperCase();

  return (
    <div className={styles.liveBanner}>
      <div className={styles.leftInfo}>
        <div className={styles.avatarRing}>
          <img
            src={liveStream.img || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg"}
            alt="Erine Live"
            className={styles.avatarImg}
          />
          <span className={styles.liveDotBadge}>
            <i className="bx bx-broadcast" /> LIVE
          </span>
        </div>

        <div className={styles.textGroup}>
          <div className={styles.tagLive}>
            <i className="bx bx-broadcast bx-flashing" />
            <span>Erine Sedang LIVE di {platformLabel}!</span>
          </div>
          <h4 className={styles.titleLive}>
            {notification?.caption || liveStream.name}
          </h4>
          <span className={styles.captionLive}>
            {liveStream.viewers ? `${liveStream.viewers.toLocaleString("id-ID")} penonton sedang menyaksikan` : "Tonton sekarang sebelum siaran selesai!"}
          </span>
        </div>
      </div>

      {notification?.banner_url && (
        <img
          src={notification.banner_url}
          alt="Live Banner"
          className={styles.notifBannerImg}
          loading="lazy"
        />
      )}

      <a
        href={liveStream.url || (platformLabel.includes("SHOWROOM") ? "https://www.showroom-live.com/r/JKT48_Erine" : "https://www.idn.app/jkt48_erine")}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.watchBtn}
      >
        <i className="bx bx-play" />
        <span>Tonton Siaran</span>
      </a>
    </div>
  );
}
