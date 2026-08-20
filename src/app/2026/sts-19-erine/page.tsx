import React from "react";
import styles from "./page.module.css";
import type { Metadata } from "next";
import Link from "next/link";
import WayfinderMessages from "@/components/wayfinder/WayfinderMessages";

export const metadata: Metadata = {
  title: "#ErineTheWayfinder | Seitansai Erine 2026 — Cavallery",
  description: "Perayaan ulang tahun Catherina Vallencia Kurniawan — #ErineTheWayfinder.",
  openGraph: {
    title: "#ErineTheWayfinder — Seitansai Erine 2026",
    description: "Perayaan ulang tahun Catherina Vallencia Kurniawan oleh CAVALLERY.",
  },
};

interface GifterGroup {
  tierId: "pathfinder" | "navigator" | "explorer";
  title: string;
  badge: string;
  rows: { name: string; rot: number; offset?: number; isLead?: boolean }[][];
}

const GIFTER_BOARD_GROUPS: GifterGroup[] = [
  {
    tierId: "pathfinder",
    title: "PATHFINDER",
    badge: "👑 PATHFINDER",
    rows: [
      // Baris 1 (Paling Atas & Paling Menonjol): MPK & William Santoso
      [
        { name: "MPK", rot: -1.8, offset: 4, isLead: true },
        { name: "William Santoso", rot: 1.5, offset: -4, isLead: true },
      ],
      // Baris 2: Rifqi Annafi, Firstarisa, Ucing Erine, iCaa
      [
        { name: "Rifqi Annafi", rot: -1.5, offset: 6 },
        { name: "Firstarisa", rot: 1.2, offset: -4 },
        { name: "Ucing Erine", rot: -1.6, offset: 5 },
        { name: "iCaa", rot: 1.4, offset: -5 },
      ],
    ],
  },
  {
    tierId: "navigator",
    title: "NAVIGATOR",
    badge: "💎 NAVIGATOR",
    rows: [
      [
        { name: "Lucky Arasyah", rot: 1.2, offset: 4 },
        { name: "Indyraaa", rot: -1.4, offset: -4 },
      ],
      [
        { name: "NabilRasyaaaa", rot: 1.6, offset: 5 },
        { name: "Salma Nada", rot: -1.1, offset: -3 },
        { name: "R_Syaa (Aisyah_adl)", rot: 1.3, offset: 4 },
      ],
    ],
  },
  {
    tierId: "explorer",
    title: "EXPLORER",
    badge: "⭐ EXPLORER",
    rows: [
      [
        { name: "Cipuyyy", rot: -1.2, offset: 2 },
        { name: "Angga", rot: 1.5, offset: -3 },
        { name: "RFDorable", rot: -0.9, offset: 4 },
        { name: "Vend.", rot: 1.3, offset: -2 },
      ],
      [
        { name: "Roni Eriyanto", rot: -1.6, offset: 3 },
        { name: "🐝🐥", rot: 1.1, offset: -4 },
        { name: "Nugo", rot: -1.4, offset: 3 },
      ],
    ],
  },
];

const STORYLINE_CHAPTERS = [
  {
    chapterNumber: "PROLOG",
    title: "The End of The Path",
    quote: "Kadang jalan berakhir, untuk membawa kita ke jalan yang baru.",
    paragraphs: [
      "Hari itu, Erine mengikuti seekor kucing.",
      "Sebuah pertanda membawanya ke tempat yang telah lama terlupakan.",
    ],
    image: "https://pbs.twimg.com/media/HQFkSnFaIAEAEAe?format=jpg&name=4096x4096",
  },
  {
    chapterNumber: "CHAPTER I",
    title: "The Forgotten Observatory",
    quote: "Tempat yang lama ditinggalkan, masih menyimpan cerita.",
    paragraphs: [
      "Di dalam observatorium, Erine menemukan berbagai benda.",
      "Salah satunya, sebuah jurnal bertuliskan—",
      "A World Beyond The Horizon.",
    ],
    image: "https://pbs.twimg.com/media/HQFkTaHbEAAC1Vs?format=jpg&name=medium",
  },
  {
    chapterNumber: "CHAPTER II",
    title: "The Hidden Horizon",
    quote: "Di balik kabut, ada sesuatu yang menunggu.",
    paragraphs: [
      "Erine melihat sebuah kapal di kejauhan, perlahan muncul dari balik kabut.",
      "Apa yang ada di balik sana?",
    ],
    image: "https://pbs.twimg.com/media/HQFkUVwbEAAGnUj?format=jpg&name=medium",
  },
  {
    chapterNumber: "CHAPTER III",
    title: "The Legacy",
    quote: "Membayangkan apa yang menunggu di balik tembok, menjadi kekuatan 'tuk mau mencoba.",
    paragraphs: [
      "Erine melangkah lebih jauh, melewati kabut dan awan.",
      "Di hadapannya, pulau-pulau terapung terlihat.",
      "Kini, ia memilih mengejar horizon.",
    ],
    image: "https://pbs.twimg.com/media/HQJitRqbAAAq2cT?format=jpg&name=medium",
  },
  {
    chapterNumber: "EPILOGUE",
    title: "Captain's Log",
    quote: "Life is short, the world is wide. I want to make some memories.",
    paragraphs: [
      "Captain's Log — Day One.",
      "Erine akhirnya memulai perjalanan menuju dunia yang belum pernah ia kenal.",
      "Dan untuk pertama kalinya, halaman itu menjadi miliknya untuk ditulis.",
    ],
    image: "https://pbs.twimg.com/media/HQJjBEpbsAAHhUU?format=jpg&name=medium",
  },
];

// Reusable Sunrise / Horizon SVG Icon
function SunriseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v6" />
      <path d="m4.93 10.93 4.24-4.24" />
      <path d="m19.07 10.93-4.24-4.24" />
      <path d="M2 18h20" />
      <path d="M20 22H4" />
      <path d="M8 18a4 4 0 0 1 8 0" />
    </svg>
  );
}

// Reusable Book / Story Icon
function BookStoryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 6h10" />
      <path d="M6 10h10" />
    </svg>
  );
}

// Reusable Trophy / Award Icon
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
      <path d="M18 4H6v7a6 6 0 0 0 12 0V4Z" />
    </svg>
  );
}

// Reusable Camera Icon
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  );
}

// Reusable Sparkles Icon
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
    </svg>
  );
}

// Reusable Compass Icon
function CompassIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

export default function ErineTheWayfinderPage() {
  return (
    <main className={styles.page}>
      {/* Hero Header */}
      <div className={styles.hero}>
        <div className={styles.badge}>
          <SparklesIcon className={styles.badgeIcon} />
          <span>Seitansai Project 2026</span>
        </div>
        <h1 className={styles.title}>#ErineTheWayfinder</h1>
        <p className={styles.subtitle}>
          Perayaan hari ulang tahun Catherina Vallencia Kurniawan. Terima kasih atas dedikasi dan cinta dari seluruh Cavallers!
        </p>
        <div className={styles.heroActionWrap}>
          <Link href="/2026/the-wayfinder" className={styles.philosophyBtn}>
            <CompassIcon className={styles.btnIcon} />
            <span>Lihat Asal-Usul & Filosofi The Wayfinder</span>
            <span className={styles.btnArrow}>→</span>
          </Link>
        </div>
      </div>

      {/* Storyline Section — The Wayfinder Journey */}
      <section className={styles.storylineSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>
            <BookStoryIcon className={styles.tagIcon} />
            Official Storyline
          </span>
          <h2 className={styles.sectionTitle}>The Wayfinder Journey</h2>
          <p className={styles.sectionDesc}>
            Kisah perjalanan Erine dalam mencari jejak dan membuka cakrawala baru di luar batas horizon.
          </p>
        </div>

        <div className={styles.storylineTimeline}>
          {STORYLINE_CHAPTERS.map((item, index) => (
            <article
              key={index}
              className={`${styles.storyCard} ${index % 2 === 1 ? styles.storyCardReverse : ""}`}
            >
              {/* Image Frame */}
              <div className={styles.storyImageWrap}>
                <div className={styles.storyImageGlow}></div>
                <img
                  src={item.image}
                  alt={item.title}
                  className={styles.storyImage}
                  loading="lazy"
                />
                <div className={styles.imageOverlayBadge}>
                  <SunriseIcon className={styles.badgeIcon} />
                  <span>{item.chapterNumber}</span>
                </div>
              </div>

              {/* Story Content */}
              <div className={styles.storyContent}>
                <div className={styles.storyBadge}>
                  <SunriseIcon className={styles.badgeIcon} />
                  <span>{item.chapterNumber}</span>
                </div>
                <h3 className={styles.storyTitle}>{item.title}</h3>
                <blockquote className={styles.storyQuote}>
                  <span className={styles.quoteMark}>“</span>
                  {item.quote}
                  <span className={styles.quoteMark}>”</span>
                </blockquote>
                <div className={styles.storyParagraphs}>
                  {item.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Top Gifters Appreciation Board (Sticker Collage Style) */}
      <section className={styles.gifterSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>
            <TrophyIcon className={styles.tagIcon} />
            Special Appreciation
          </span>
          <h2 className={styles.sectionTitle}>Top Gifter #ErineTheWayfinder</h2>
          <p className={styles.sectionDesc}>
            Apresiasi dan terima kasih setinggi-tingginya kepada para Top Gifter atas kontribusi luar biasa untuk menyukseskan Seitansai Project Erine 2026.
          </p>
        </div>

        {/* The Exhibition Appreciation Board */}
        <div className={styles.appreciationBoard}>
          {GIFTER_BOARD_GROUPS.map((group) => (
            <div key={group.tierId} className={`${styles.boardTierSection} ${styles[group.tierId]}`}>
              {/* Category Ribbon / Strip */}
              <div className={styles.tierRibbon}>
                <span className={styles.tierRibbonText}>{group.title}</span>
              </div>

              {/* Rows Formation with Staggered Sticker Tags */}
              <div className={styles.stickersFlow}>
                {group.rows.map((row, rIdx) => (
                  <div key={rIdx} className={styles.stickersRow}>
                    {row.map((item, idx) => (
                      <span
                        key={idx}
                        className={`${styles.stickerTag} ${styles[`${group.tierId}Tag`]} ${item.isLead ? styles.leadTag : ""}`}
                        style={{
                          transform: `rotate(${item.rot}deg) translateY(${item.offset || 0}px)`,
                        }}
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Bottom Footer Note Strip */}
          <div className={styles.boardFooterStrip}>
            <span>
              serta seluruh warga Cavallery yang telah berpartisipasi dalam seluruh rangkaian penggalangan dana & kegiatan Seitansai Erine 2026
            </span>
          </div>
        </div>
      </section>

      {/* Birthday Cake Visualization (Bagian Ucapan Ulang Tahun) */}
      <section className={styles.cakeSection} aria-label="Birthday Cake">
        <div className={styles.cakeWrapper}>
          <div className={styles.plate}></div>
          <div className={`${styles.cakeLayer} ${styles.layerBottom}`}></div>
          <div className={`${styles.cakeLayer} ${styles.layerMiddle}`}></div>
          <div className={`${styles.cakeLayer} ${styles.layerTop}`}></div>
          <div className={styles.icing}></div>
          <div className={`${styles.drip} ${styles.drip1}`}></div>
          <div className={`${styles.drip} ${styles.drip2}`}></div>
          <div className={`${styles.drip} ${styles.drip3}`}></div>
          <div className={styles.candles}>
            <div className={`${styles.digit} ${styles.digit1}`}>
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <text x="62" y="80" fontFamily="Arial, Helvetica, sans-serif" fontSize="80" fontWeight="900" textAnchor="middle" fill="#7B020B">1</text>
              </svg>
              <div className={`${styles.flame} ${styles.digit1Flame}`}></div>
            </div>
            <div className={`${styles.digit} ${styles.digit9}`}>
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <text x="38" y="80" fontFamily="Arial, Helvetica, sans-serif" fontSize="80" fontWeight="900" textAnchor="middle" fill="#7B020B">9</text>
              </svg>
              <div className={`${styles.flame} ${styles.digit9Flame}`}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Birthday Wishes Board Form */}
      <WayfinderMessages />

      {/* Photobooth Cheki Section */}
      <section className={styles.photoboothSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>
            <CameraIcon className={styles.tagIcon} />
            Interactive Cheki
          </span>
          <h2 className={styles.sectionTitle}>Photobooth Cheki #ErineTheWayfinder</h2>
          <p className={styles.sectionDesc}>
            Ambil foto dan buat Cheki eksklusif Seitansai Erine langsung di bawah ini atau buka halaman penuh di{" "}
            <Link href="/photobooth" style={{ color: "#ffd778", textDecoration: "underline", fontWeight: 600 }}>
              cavallery.id/photobooth
            </Link>
            .
          </p>
        </div>

        <div className={styles.photoboothWrap}>
          <iframe
            src="https://photobooth-cheki-19.netlify.app/"
            title="Photobooth Cheki #ErineTheWayfinder"
            className={styles.photoboothIframe}
            allow="camera; microphone; fullscreen; clipboard-write; display-capture"
            allowFullScreen
          />
        </div>
      </section>
    </main>
  );
}
