"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./GamesCatalog.module.css";
import GamesVideoTeaser from "./GamesVideoTeaser";
import GameLeaderboard from "./GameLeaderboard";

export interface GameItem {
  slug: string;
  title: string;
  desc: string;
  category: "Arcade" | "Adventure" | "Survival" | "Fun" | "Fashion";
  isRanked: boolean;
  isNew?: boolean;
  duration: string;
  controls: string;
  thumbnail: string;
  accentColor: string;
  icon: string;
}

const GAMES_DATA: GameItem[] = [
  {
    slug: "anterine-ke-theater",
    title: "Game Anterine Ke Theater",
    desc: "Bantu dan anterin Erine menuju Theater JKT48 sebelum pertunjukan show dimulai! Lewati berbagai rintangan seru di perjalanan.",
    category: "Adventure",
    isRanked: true,
    isNew: true,
    duration: "~3-5 Menit",
    controls: "Sentuh / Keyboard",
    thumbnail: "/play/anterine-ke-theater/assets/images/Logo.png",
    accentColor: "#ff6b1a",
    icon: "bxs-navigation",
  },
  {
    slug: "grasshopper-collector",
    title: "Game Belalang Yang Membangkang",
    desc: "Bantu Erine mengumpulkan belalang sebanyak mungkin sebelum waktu habis! Hindari rintangan dan raih rekor skor tertinggi.",
    category: "Arcade",
    isRanked: true,
    isNew: false,
    duration: "~2 Menit",
    controls: "Sentuh / Keyboard",
    thumbnail: "/play/assets/grasshopper-collector_belalang.png",
    accentColor: "#e78341",
    icon: "bx-bug",
  },
  {
    slug: "jumping-adventure",
    title: "Game Bibir Yang Telah Dicuri",
    desc: "Bantu Erine melompati rintangan dan raih skor tertinggi dalam petualangan merebut kembali bibir yang dicuri!",
    category: "Adventure",
    isRanked: true,
    isNew: false,
    duration: "~2-3 Menit",
    controls: "Sentuh / Spasi",
    thumbnail: "/play/assets/jumping-adventure-github_bibir_1.png",
    accentColor: "#fa9e60",
    icon: "bx-up-arrow-circle",
  },
  {
    slug: "zombie-escape",
    title: "Game Erine In Etherland",
    desc: "Bantu Ratu Erine melarikan diri dari serbuan para zombie dan bawa ia kembali pulang ke Istana Cavallery dengan selamat!",
    category: "Survival",
    isRanked: false,
    isNew: false,
    duration: "~3 Menit",
    controls: "Sentuh / Keyboard",
    thumbnail: "/play/assets/zombie-escape_castle.png",
    accentColor: "#10b981",
    icon: "bx-run",
  },
  {
    slug: "dress-up-erine",
    title: "Game DressUp Erine",
    desc: "Jadilah stylist pribadi Erine! Ganti busana panggung, pilih ekspresi wajah, dan tentukan lokasi pemotretan favoritmu.",
    category: "Fashion",
    isRanked: false,
    isNew: false,
    duration: "Santai",
    controls: "Sentuh / Mouse",
    thumbnail: "/games/dress-up-erine/asset/outfit-(1).png",
    accentColor: "#ec4899",
    icon: "bx-closet",
  },
  {
    slug: "love-erine-meter",
    title: "Love Erine Meter",
    desc: "Seberapa besar rasa cinta dan dukunganmu untuk Erine? Masukkan namamu, ukur persentasenya, dan bagikan hasilnya!",
    category: "Fun",
    isRanked: false,
    isNew: false,
    duration: "~1 Menit",
    controls: "Sentuh / Ketik",
    thumbnail: "/images/cava-logo-round.png",
    accentColor: "#f43f5e",
    icon: "bxs-heart",
  },
];

const CATEGORIES = ["Semua", "Arcade", "Adventure", "Survival", "Fun", "Fashion"] as const;

export default function GamesCatalog() {
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [personalBests, setPersonalBests] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const records: Record<string, number> = {};
      GAMES_DATA.forEach((g) => {
        // Cek localStorage cava_best_{slug} atau riwayat skor
        const val = localStorage.getItem(`cava_best_${g.slug}`);
        if (val) {
          const parsed = parseInt(val, 10);
          if (!isNaN(parsed) && parsed > 0) {
            records[g.slug] = parsed;
          }
        }
      });
      setPersonalBests(records);
    } catch {
      // Ignore localStorage access restrictions
    }
  }, []);

  const filteredGames =
    selectedCategory === "Semua"
      ? GAMES_DATA
      : GAMES_DATA.filter((g) => g.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className={styles.catalogWrap}>
      {/* HERO SECTION */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className="badge">
            <i className="bx bx-joystick" aria-hidden="true" /> #GameRine
          </div>
          <h1 id="hero-title" className={styles.heroTitle}>
            Mini Games <span className="textGold">Cavallery</span>
          </h1>
          <p className={styles.heroSub}>
            Koleksi mini game eksklusif yang dibuat penuh cinta oleh fanbase Cavallery untuk Catherina Vallencia (Erine JKT48). Mainkan, kumpulkan skor, dan raih posisi teratas!
          </p>
          <div className={styles.heroCtaWrap}>
            <Link
              href="/games/anterine-ke-theater"
              className={styles.heroCta}
              aria-label="Main game terbaru: Anterine Ke Theater"
            >
              <i className="bx bxs-hot" aria-hidden="true" />
              <span>Main Game Terbaru</span>
              <i className="bx bx-right-arrow-alt" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* VIDEO TEASER SECTION (SessionStorage & Skip Support) */}
      <GamesVideoTeaser />

      {/* GAMES SECTION WITH FILTER */}
      <section className={styles.gamesSection} aria-label="Daftar Mini Games">
        <div className={styles.sectionHeaderBar}>
          <div className={styles.sectionHeaderLeft}>
            <h2 className={styles.sectionHeading}>
              Koleksi Game <span className={styles.gameCount}>({filteredGames.length})</span>
            </h2>
            <p className={styles.sectionSub}>Pilih game favoritmu dan mulai petualangan bersama Erine!</p>
          </div>

          {/* Filter Chips */}
          <div className={styles.filterChips} role="tablist" aria-label="Filter Kategori Game">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(cat)}
                  className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* RESPONSIVE 1/2/3 COLUMN GRID */}
        <div className={styles.gamesGrid}>
          {filteredGames.map((game) => {
            const myRecord = personalBests[game.slug];

            return (
              <article
                key={game.slug}
                className={styles.gameCard}
                style={{ "--accent": game.accentColor } as React.CSSProperties}
              >
                {/* 16:9 Thumbnail Poster Container */}
                <div className={styles.posterContainer}>
                  <Image
                    src={game.thumbnail}
                    alt={game.title}
                    width={480}
                    height={270}
                    loading="lazy"
                    className={styles.posterImg}
                    style={{
                      objectFit: game.slug === "love-erine-meter" ? "contain" : "cover",
                      padding: game.slug === "love-erine-meter" ? "20px" : "0",
                    }}
                  />
                  <div className={styles.posterOverlay} />

                  {/* Badges Overlay */}
                  <div className={styles.badgesTop}>
                    <span className={styles.categoryBadge}>{game.category}</span>
                    {game.isNew && <span className={styles.newBadge}>Baru</span>}
                    {game.isRanked && (
                      <span className={styles.rankedBadge} title="Tersedia sistem papan peringkat">
                        <i className="bx bxs-trophy" aria-hidden="true" /> Ranked
                      </span>
                    )}
                  </div>

                  {/* Icon floating */}
                  <div className={styles.floatingIcon}>
                    <i className={`bx ${game.icon}`} aria-hidden="true" />
                  </div>
                </div>

                {/* Card Body */}
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{game.title}</h3>
                  <p className={styles.cardDesc} title={game.desc}>
                    {game.desc}
                  </p>

                  {/* Meta Durasi & Kontrol */}
                  <div className={styles.metaRow}>
                    <span className={styles.metaItem}>
                      <i className="bx bx-time" aria-hidden="true" />
                      {game.duration}
                    </span>
                    <span className={styles.metaDivider} aria-hidden="true">•</span>
                    <span className={styles.metaItem}>
                      <i className="bx bx-joystick" aria-hidden="true" />
                      {game.controls}
                    </span>
                  </div>

                  {/* Personal Best if available */}
                  {myRecord !== undefined && (
                    <div className={styles.myRecordBar}>
                      <i className="bx bxs-medal" aria-hidden="true" style={{ color: "var(--gold, #ff6b1a)" }} />
                      <span>Rekor kamu: <strong>{myRecord.toLocaleString("id-ID")}</strong></span>
                    </div>
                  )}

                  {/* Play CTA Button (Tap Target >= 44px) */}
                  <div className={styles.cardFooter}>
                    <Link
                      href={`/games/${game.slug}`}
                      className={styles.playBtn}
                      aria-label={`Mainkan ${game.title}`}
                    >
                      <span>Main Sekarang</span>
                      <i className="bx bx-right-arrow-alt" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* LEADERBOARD & STATISTIK SECTION */}
      <GameLeaderboard />
    </div>
  );
}
