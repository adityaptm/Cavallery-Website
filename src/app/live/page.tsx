"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import styles from "./page.module.css";
import {
  LiveNowList,
  LiveOfflineCard,
  mapApiToLiveCardProps,
} from "@/components/LiveNowCard";
import LiveSectionEnhanced from "@/components/jkt48/LiveSectionEnhanced";

const ERINE_IDN_URL = "https://www.idn.app/jkt48_erine";
const ERINE_SHOWROOM_URL = "https://www.showroom-live.com/r/JKT48_Erine";

interface LiveItem {
  id?: string;
  name?: string;
  img?: string;
  type?: string;
  platform?: string;
  url_key?: string;
  slug?: string;
  started_at?: string;
  streaming_url?: string;
  url?: string;
  is_erine?: boolean;
}

export default function LivePage() {
  const [lives, setLives] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [erineLive, setErineLive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/live", { cache: "no-store" });
      const json = await res.json();
      const list: LiveItem[] = Array.isArray(json.data) ? json.data : [];
      setLives(list);
      setErineLive(Boolean(json.erine_live) || list.some((l) => l.is_erine));
      setLastUpdate(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const liveMembers = useMemo(() => mapApiToLiveCardProps(lives), [lives]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className="badge">
            <span className={styles.livePulse} />
            LIVE ERINE
          </div>
          <h1 className={styles.heroTitle}>
            Live Streaming <span className="textGold">Erine</span>
          </h1>
          <p className={styles.heroSub}>
            {erineLive && liveMembers.length > 0
              ? "Catherina Vallencia (Erine) sedang live sekarang! Tonton siarannya langsung melalui tombol di bawah."
              : "Pantau siaran langsung Catherina Vallencia (Erine) di IDN Live dan Showroom secara real-time."}
          </p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.topBar}>
          <span className={styles.updateTime}>
            <i className="bx bx-time-five" />
            {lastUpdate ? `Update: ${lastUpdate.toLocaleTimeString("id-ID")}` : "Memuat..."}
          </span>
          <button className={styles.refreshBtn} onClick={load}>
            <i className="bx bx-refresh" /> Refresh
          </button>
        </div>

        {/* Priority Card for Erine */}
        {loading ? (
          <div className={styles.skeletons}>
            {[0, 1].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <i className="bx bx-error-circle" /> {error}
          </div>
        ) : liveMembers.length > 0 ? (
          /* Erine is Currently Live */
          <div style={{ maxWidth: 680, margin: "0 auto 3rem" }}>
            <LiveNowList members={liveMembers} />
          </div>
        ) : (
          /* Erine is Currently Offline */
          <div style={{ maxWidth: 680, margin: "0 auto 3rem" }}>
            <LiveOfflineCard
              name="Catherina Vallencia"
              nickname="Erine"
              idnUrl={ERINE_IDN_URL}
              showroomUrl={ERINE_SHOWROOM_URL}
            />
          </div>
        )}

        {/* JKT48 Connect Live Hub & Room Viewer */}
        <section style={{ marginTop: "2rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--cv-bone)", marginBottom: "0.4rem" }}>
              Live Hub <span style={{ color: "var(--cv-orange)" }}>Erine & JKT48</span>
            </h2>
            <p style={{ color: "var(--cv-text-dim)", fontSize: "0.95rem" }}>
              Siaran langsung seluruh member JKT48, notifikasi live, komentar real-time, dan galeri siaran.
            </p>
          </div>
          <LiveSectionEnhanced />
        </section>
      </div>
    </div>
  );
}
