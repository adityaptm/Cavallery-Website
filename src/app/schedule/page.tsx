import type { Metadata } from "next";
import styles from "./page.module.css";
import LiveBanner from "@/components/schedule/LiveBanner";
import ScheduleTimeline from "@/components/schedule/ScheduleTimeline";
import ScheduleSocialFeed from "@/components/schedule/ScheduleSocialFeed";
import { VideoCallSection } from "@/components/schedule/ScheduleSections";
import ScheduleCalendarView from "@/components/jkt48/ScheduleCalendarView";
import ExclusiveStockView from "@/components/jkt48/ExclusiveStockView";

export const metadata: Metadata = {
  title: "Jadwal Show & Event Erine JKT48 | Cavallery",
  description:
    "Pusat jadwal lengkap show theater, siaran live IDN & Showroom, kalender kegiatan, dan tiket eksklusif Catherina Vallencia (Erine) JKT48.",
  alternates: {
    canonical: "https://cavallery.id/schedule",
  },
  openGraph: {
    title: "Jadwal Show & Event Erine JKT48 | Cavallery",
    description:
      "Pantau jadwal show theater, live streaming, kalender event, dan video call Erine JKT48 secara real-time.",
    url: "https://cavallery.id/schedule",
    images: ["https://cavallery.id/images/cava-logo-round.png"],
  },
};

const QUICK_LINKS = [
  { href: "#live-status", label: "Live Streaming", icon: "bx-broadcast" },
  { href: "#theater-erine", label: "Show Theater", icon: "bx-film" },
  { href: "#calendar-view", label: "Kalender", icon: "bx-calendar" },
  { href: "#exclusive-stock", label: "Tiket Eksklusif", icon: "bxs-coupon" },
  { href: "#social-feed", label: "Sosmed", icon: "bx-news" },
  { href: "#vc-schedule", label: "Video Call", icon: "bx-video" },
];

export default function SchedulePage() {
  return (
    <div className={styles.page}>
      {/* Compact Dashboard Header (Gaya JKT48Connect dengan Tema Cavallery) */}
      <header className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className={styles.heroTopRow}>
            <div className="badge">
              <i className="bx bx-time-five" /> #ErineSchedule
            </div>
            <span className={styles.poweredPill}>
              <i className="bx bx-bolt-circle" /> Live Sync · JKT48Connect API
            </span>
          </div>

          <h1 className={styles.heroTitle}>
            Erine <span className={styles.accent}>Schedule</span> Hub
          </h1>
          <p className={styles.heroSub}>
            Pusat informasi jadwal show theater, status live streaming IDN &amp; Showroom,
            kalender agenda, hingga ketersediaan tiket eksklusif Catherina Vallencia (Erine JKT48).
          </p>

          {/* Quick Jump Navigation Bar */}
          <nav className={styles.quickNav} aria-label="Navigasi Cepat Jadwal">
            {QUICK_LINKS.map((item) => (
              <a key={item.href} href={item.href} className={styles.quickNavBtn}>
                <i className={`bx ${item.icon}`} aria-hidden="true" />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className={styles.content}>
        {/* 1. Live Streaming Hub */}
        <section id="live-status" className={styles.panelSection}>
          <LiveBanner />
        </section>

        {/* 2. Jadwal Show Theater Erine */}
        <section id="theater-erine" className={styles.panelSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionIcon}>
              <i className="bx bx-film" aria-hidden="true" />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>
                Jadwal Show <span className={styles.accent}>Theater Erine</span>
              </h2>
              <p className={styles.sectionDesc}>
                Daftar seluruh show teater resmi JKT48 yang menampilkan Erine dalam lineup panggung.
              </p>
            </div>
          </div>
          <ScheduleTimeline />
        </section>

        {/* 3. Kalender Kegiatan & Agenda */}
        <section id="calendar-view" className={styles.panelSection}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionIcon}>
              <i className="bx bx-calendar-event" aria-hidden="true" />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>
                Kalender <span className={styles.accent}>Kegiatan &amp; Event</span>
              </h2>
              <p className={styles.sectionDesc}>
                Kalender bulanan seluruh jadwal show theater dan agenda Erine bersama JKT48.
              </p>
            </div>
          </div>
          <ScheduleCalendarView />
        </section>

        {/* 4. Grid 2 Kolom: Tiket Eksklusif & Video Call */}
        <div className={styles.twoColGrid}>
          <section id="exclusive-stock" className={styles.panelSection}>
            <div className={styles.sectionHead}>
              <div className={styles.sectionIcon}>
                <i className="bx bxs-coupon" aria-hidden="true" />
              </div>
              <div>
                <h2 className={styles.sectionTitle}>
                  Tiket <span className={styles.accent}>Eksklusif Erine</span>
                </h2>
                <p className={styles.sectionDesc}>
                  Pantau ketersediaan slot sesi eksklusif dan 2-Shot secara langsung.
                </p>
              </div>
            </div>
            <ExclusiveStockView exclusiveId="EX79CB" />
          </section>

          <section id="vc-schedule" className={styles.panelSection}>
            <VideoCallSection />
          </section>
        </div>

        {/* 5. Update Sosmed Erine */}
        <section id="social-feed" className={styles.panelSection}>
          <ScheduleSocialFeed />
        </section>
      </main>
    </div>
  );
}
