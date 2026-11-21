import type { Metadata } from "next";
import styles from "./page.module.css";
import LiveBanner from "@/components/schedule/LiveBanner";
import ScheduleTimeline from "@/components/schedule/ScheduleTimeline";
import ScheduleSocialFeed from "@/components/schedule/ScheduleSocialFeed";
import { VideoCallSection } from "@/components/schedule/ScheduleSections";
import ScheduleCalendarView from "@/components/jkt48/ScheduleCalendarView";
import ExclusiveStockView from "@/components/jkt48/ExclusiveStockView";

export const metadata: Metadata = {
  title: "Jadwal Show & Event Erine JKT48",
  description:
    "Jadwal lengkap show theater, live streaming, dan kegiatan resmi Catherina Vallencia (Erine) JKT48.",
};

export default function SchedulePage() {
  return (
    <div className={styles.page}>
      {/* Header Hero */}
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className="badge">
            <i className="bx bx-time-five" /> #ErineSchedule
          </div>
          <h1 className={styles.heroTitle}>
            Erine <span className="textGold">Schedule</span>
          </h1>
          <p className={styles.heroSub}>
            Pusat jadwal resmi seluruh aktivitas show theater, siaran live streaming,
            dan tiket eksklusif Catherina Vallencia (Erine JKT48).
          </p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Panel Notifikasi Siaran Langsung (Muncul jika Erine sedang Live) */}
        <LiveBanner />

        {/* Section Utama: Jadwal Show Teater Erine (Spotlight Card & Timeline) */}
        <section id="theater-erine">
          <div style={{ marginBottom: "1.2rem" }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--cv-bone)", marginBottom: "0.4rem" }}>
              Jadwal Show <span style={{ color: "var(--cv-orange)" }}>Theater Erine</span>
            </h2>
            <p style={{ color: "var(--cv-text-dim)", fontSize: "0.95rem" }}>
              Daftar seluruh show teater resmi JKT48 yang menampilkan Erine dalam lineup panggung.
            </p>
          </div>

          <ScheduleTimeline />
        </section>

        {/* Section: Stok Tiket Eksklusif Erine */}
        <section id="exclusive-stock">
          <div style={{ marginBottom: "1.2rem" }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--cv-bone)", marginBottom: "0.4rem" }}>
              Status Tiket <span style={{ color: "var(--cv-orange)" }}>Eksklusif Erine</span>
            </h2>
            <p style={{ color: "var(--cv-text-dim)", fontSize: "0.95rem" }}>
              Pantau ketersediaan slot sesi eksklusif dan 2-Shot Erine secara langsung.
            </p>
          </div>
          <ExclusiveStockView exclusiveId="EX79CB" />
        </section>

        {/* Section: Kalender Kegiatan Erine & JKT48 */}
        <section id="calendar-view">
          <div style={{ marginBottom: "1.2rem" }}>
            <h2 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--cv-bone)", marginBottom: "0.4rem" }}>
              Kalender <span style={{ color: "var(--cv-orange)" }}>Kegiatan Theater & Agenda</span>
            </h2>
            <p style={{ color: "var(--cv-text-dim)", fontSize: "0.95rem" }}>
              Kalender bulanan seluruh jadwal show theater dan kegiatan Erine bersama JKT48.
            </p>
          </div>
          <ScheduleCalendarView />
        </section>

        {/* Section: Update Sosmed Erine */}
        <section id="social-feed">
          <ScheduleSocialFeed />
        </section>

        {/* Section: Jadwal Video Call */}
        <VideoCallSection />
      </div>
    </div>
  );
}
