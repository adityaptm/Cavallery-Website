import AboutErineSection from "@/components/home/AboutErineSection";
import TimelineSection from "@/components/home/TimelineSection";
import YoutubeSection from "@/components/home/YoutubeSection";
import SectionDivider from "@/components/SectionDivider";
import SocialUpdatesFeed from "@/components/jkt48/SocialUpdatesFeed";
import type { Metadata } from "next";
import styles from "./page.module.css";
import { getTimelineData } from "@/lib/timelineService";

export const metadata: Metadata = {
  title: "Tentang Erine",
  description:
    "Profil lengkap Catherina Vallencia Kurniawan (Erine), anggota JKT48 Team Passion.",
};

// Revalidate data setiap 60 detik agar data milestone dari database selalu up-to-date
export const revalidate = 60;

/*
 * Section notation continues one knight's journey:
 * a1 → b3 → c5 → d7 → e5 → f3 → g5 → h3 → f4 → e6 (videos) → c7 (Knight's Path).
 */
export default async function AboutErinePage() {
  const initialTimeline = await getTimelineData();

  return (
    <div className={styles.page}>
      <AboutErineSection />

      {/* Bagian Update Terbaru (X / Twitter, Instagram, TikTok) */}
      <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px 60px" }}>
        <SocialUpdatesFeed />
      </section>

      <SectionDivider />
      <YoutubeSection square="e6" />
      <SectionDivider />
      <TimelineSection initialData={initialTimeline} />
    </div>
  );
}
