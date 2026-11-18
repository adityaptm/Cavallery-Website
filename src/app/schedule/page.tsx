import type { Metadata } from "next";
import styles from "./page.module.css";
import { TheaterSection, LiveSection, VideoCallSection } from "@/components/schedule/ScheduleSections";
import ScheduleCalendarView from "@/components/jkt48/ScheduleCalendarView";
import ExclusiveStockView from "@/components/jkt48/ExclusiveStockView";

export const metadata: Metadata = {
  title: "Jadwal Show & Event",
  description: "Jadwal lengkap Erine JKT48: Theater, Live, dan Video Call dalam satu halaman.",
};

export default function SchedulePage() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className="badge"><i className="bx bx-time-five" /> #ErineSchedule</div>
          <h1 className={styles.heroTitle}>Erine <span className="textGold">Schedule</span></h1>
          <p className={styles.heroSub}>
            Semua jadwal kegiatan Erine JKT48 dalam satu tempat. 
            Mulai dari agenda bulanan, show theater, sesi live, hingga ketersediaan tiket eksklusif.
          </p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Kalender Bulanan & Agenda JKT48 Connect */}
        <section>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--cv-bone)", marginBottom: "0.4rem" }}>
              Kalender <span style={{ color: "var(--cv-orange)" }}>Kegiatan JKT48</span>
            </h2>
            <p style={{ color: "var(--cv-text-dim)", fontSize: "0.95rem" }}>
              Agenda jadwal resmi dari JKT48 Connect yang disinkronisasikan secara otomatis.
            </p>
          </div>
          <ScheduleCalendarView />
        </section>

        {/* Live Section (Priority if active) */}
        <LiveSection />

        {/* Video Call Section */}
        <VideoCallSection />

        {/* Stok Eksklusif JKT48 Connect */}
        <section>
          <div style={{ marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--cv-bone)", marginBottom: "0.4rem" }}>
              Status Tiket <span style={{ color: "var(--cv-orange)" }}>Eksklusif</span>
            </h2>
            <p style={{ color: "var(--cv-text-dim)", fontSize: "0.95rem" }}>
              Pantau ketersediaan slot sesi eksklusif dan 2-Shot/VC secara langsung.
            </p>
          </div>
          <ExclusiveStockView exclusiveId="EX79CB" />
        </section>

        {/* Theater Section */}
        <TheaterSection />
      </div>
    </div>
  );
}
