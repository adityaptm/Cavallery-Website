"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./LiveBanner.module.css";
import type { Jkt48LiveItem } from "@/types/jkt48";

const IDN_PROFILE_URL = "https://www.idn.app/jkt48_erine";
const SHOWROOM_PROFILE_URL = "https://www.showroom-live.com/r/JKT48_Erine";

export default function LiveBanner() {
  const [liveStream, setLiveStream] = useState<Jkt48LiveItem | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  // Live WIB Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timePart = now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
      });
      const datePart = now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      });
      setCurrentTimeStr(`${timePart} WIB · ${datePart}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll live status
  const checkLive = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      const res = await fetch("/api/jkt48/live/now");
      const json = await res.json();
      if (json.success && json.data) {
        const lives: Jkt48LiveItem[] = json.data.lives || [];
        const erine = lives.find((l) => l.is_erine) || null;
        setLiveStream(erine);
      }
    } catch (err) {}
  }, []);

  useEffect(() => {
    checkLive();
    const interval = setInterval(checkLive, 25000);
    return () => clearInterval(interval);
  }, [checkLive]);

  const isLive = Boolean(liveStream);
  const isIdnLive = isLive && (liveStream?.platform?.toLowerCase().includes("idn") || liveStream?.type === "idn");
  const isShowroomLive = isLive && (liveStream?.platform?.toLowerCase().includes("showroom") || liveStream?.type === "showroom");

  return (
    <div className={styles.liveHub}>
      {/* ── Section Header ── */}
      <div className={styles.sectionHeader}>
        <div className={styles.subLabel}>
          <span className={styles.subLabelLine} />
          <span>STREAMING · ERINE</span>
        </div>
        <h2 className={styles.mainHeading}>
          LIVE STREAMING
        </h2>
      </div>

      {/* ── 1. TOP MAIN MEMBER CARD ── */}
      <div className={styles.topCard}>
        <img
          src="/api/jkt48/member-photo/catherina_vallencia"
          alt="Catherina Vallencia Team Passion JKT48"
          className={styles.memberPortrait}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "https://jkt48.com/api/v1/storages/media/jkt48-member/catherina_vallencia.jpg";
          }}
        />

        <div className={styles.memberMetaCol}>
          <div>
            <div className={styles.memberTag}>JKT48 MEMBER</div>
            <h3 className={styles.memberName}>CATHERINA VALLENCIA</h3>

            <div className={styles.liveStatusLine}>
              <span className={isLive ? styles.dotLiveRed : styles.dotGray} />
              <span>
                {isLive
                  ? `Sedang melangsungkan siaran langsung di ${liveStream?.platform || "LIVE"}!`
                  : "Belum ada siaran saat ini"}
              </span>
            </div>
          </div>

          {/* Stat Boxes (IDN LIVE & SHOWROOM) */}
          <div className={styles.statsRow}>
            {/* IDN Stat Box */}
            <a
              href={IDN_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.statBox}
            >
              <div className={styles.statHeader}>
                <span style={{ color: "#dc2626" }}>IDN LIVE</span>
                <i className="bx bx-link-external" />
              </div>
              <div className={styles.statValues}>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>166.2rb</span>
                  <span className={styles.statLabel}>Followers</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>45</span>
                  <span className={styles.statLabel}>Following</span>
                </div>
              </div>
            </a>

            {/* SHOWROOM Stat Box */}
            <a
              href={SHOWROOM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.statBox}
            >
              <div className={styles.statHeader}>
                <span style={{ color: "#1c140e" }}>SHOWROOM</span>
                <i className="bx bx-link-external" />
              </div>
              <div className={styles.statValues}>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>316rb</span>
                  <span className={styles.statLabel}>Followers</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNum}>50</span>
                  <span className={styles.statLabel}>Room Level</span>
                </div>
              </div>
            </a>
          </div>

          {/* Live WIB Clock */}
          <div className={styles.liveClockRow}>
            <i className="bx bx-time" />
            <span>{currentTimeStr || "Waktu Indonesia Barat (WIB)"}</span>
          </div>
        </div>
      </div>

      {/* ── 2. BOTTOM DUAL CARDS (IDN LIVE & SHOWROOM) ── */}
      <div className={styles.platformCardsGrid}>
        {/* Card 1: IDN LIVE */}
        <div className={styles.platformCard}>
          <div className={styles.platformCardHeader}>
            <div className={styles.platformPillGroup}>
              <span className={styles.platformLogoBadge}>IDN</span>
              <div className={styles.platformNameCol}>
                <span className={styles.platformLabelSmall}>PLATFORM</span>
                <span className={styles.platformNameBig}>IDN LIVE</span>
              </div>
            </div>

            <span className={isIdnLive ? styles.statusPillLive : styles.statusPillOffline}>
              <span className={isIdnLive ? styles.dotLiveRed : styles.dotGray} />
              {isIdnLive ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          <div className={styles.soundwaveBox}>
            <div className={styles.soundwaveLeft}>
              <div className={styles.broadcastCircle}>
                <i className="bx bx-broadcast" />
              </div>
              <div className={styles.soundwaveTextCol}>
                <h4 className={styles.soundwaveTitle}>
                  {isIdnLive ? "SEDANG LIVE" : "BELUM LIVE"}
                </h4>
                <span className={styles.soundwaveCaption}>
                  {isIdnLive ? "Tonton siaran IDN Live Erine sekarang!" : "Erine sedang tidak siaran"}
                </span>
              </div>
            </div>

            {/* Equalizer Soundwave Animation */}
            <div className={styles.equalizerWave}>
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={styles.equalizerBar} />
              ))}
            </div>
          </div>

          <a
            href={liveStream?.url || IDN_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.visitBtn}
          >
            <span>{isIdnLive ? "TONTON SIARAN SEKARANG" : "KUNJUNGI PROFIL IDN LIVE"}</span>
            <i className="bx bx-right-arrow-alt" style={{ fontSize: "1.1rem" }} />
          </a>
        </div>

        {/* Card 2: SHOWROOM */}
        <div className={styles.platformCard}>
          <div className={styles.platformCardHeader}>
            <div className={styles.platformPillGroup}>
              <span className={styles.platformLogoBadge} style={{ background: "#221c18" }}>SHOW</span>
              <div className={styles.platformNameCol}>
                <span className={styles.platformLabelSmall}>PLATFORM</span>
                <span className={styles.platformNameBig}>SHOWROOM</span>
              </div>
            </div>

            <span className={isShowroomLive ? styles.statusPillLive : styles.statusPillOffline}>
              <span className={isShowroomLive ? styles.dotLiveRed : styles.dotGray} />
              {isShowroomLive ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          <div className={styles.soundwaveBox}>
            <div className={styles.soundwaveLeft}>
              <div className={styles.broadcastCircle}>
                <i className="bx bx-broadcast" />
              </div>
              <div className={styles.soundwaveTextCol}>
                <h4 className={styles.soundwaveTitle}>
                  {isShowroomLive ? "SEDANG LIVE" : "BELUM LIVE"}
                </h4>
                <span className={styles.soundwaveCaption}>
                  {isShowroomLive ? "Tonton Showroom Erine sekarang!" : "Erine sedang tidak siaran"}
                </span>
              </div>
            </div>

            {/* Equalizer Soundwave Animation */}
            <div className={styles.equalizerWave}>
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={styles.equalizerBar} />
              ))}
            </div>
          </div>

          <a
            href={liveStream?.url || SHOWROOM_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.visitBtn}
          >
            <span>{isShowroomLive ? "TONTON SIARAN SEKARANG" : "KUNJUNGI PROFIL SHOWROOM"}</span>
            <i className="bx bx-right-arrow-alt" style={{ fontSize: "1.1rem" }} />
          </a>
        </div>
      </div>
    </div>
  );
}
