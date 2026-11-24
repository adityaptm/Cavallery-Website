import type { Metadata } from "next";
import styles from "./page.module.css";
import GamesVideoTeaser from "@/components/games/GamesVideoTeaser";

export const metadata: Metadata = {
  title: "Mini Games & Interaktif",
  description: "Koleksi mini games eksklusif yang pernah dimainkan oleh Erine JKT48. Play now!",
};

const games = [
  {
    title: "Game Anterine Ke Theater",
    desc: "Bantu dan anterin Erine menuju Theater JKT48 sebelum pertunjukan show dimulai!",
    href: "/games/anterine-ke-theater",
    icon: "bxs-navigation",
    tag: "Adventure · Baru",
    color: "var(--cv-orange)",
    longDesc:
      "Game petualangan 2D seru! Misi kamu adalah mengantarkan Erine menuju Theater JKT48 tepat waktu sebelum pertunjukan show theater dimulai. Lewati berbagai rintangan seru di perjalanan dan pastikan Erine sampai di panggung dengan selamat!",
  },
  {
    title: "Game DressUp Erine",
    desc: "Ayo dress up Erine sesukamu! Ganti baju, pilih wajah, dan tentukan lokasinya. Ciptakan look favoritmu dan bagikan ke semua orang!",
    href: "/games/dress-up-erine",
    icon: "bx-closet",
    tag: "Fashion",
    color: "var(--cv-orange)",
    longDesc:
      "Jadilah stylist pribadi Erine! Pilih busana dari berbagai koleksi kostum, atur ekspresi wajahnya, dan tentukan lokasi pemotretan impianmu. Setiap kombinasi menghasilkan tampilan unik — simpan hasilnya dan tunjukkan ke seluruh Cavallery siapa yang paling kreatif!",
  },
  {
    title: "Game Erine In Etherland",
    desc: "Bantu Ratu Erine melarikan diri dari para zombie dan bawa ia kembali ke Istana Cavallery!",
    href: "/games/zombie-escape",
    icon: "bx-run",
    tag: "Survival",
    color: "var(--cv-orange)",
    longDesc:
      "Game survival menegangkan! Misi utama kamu adalah membawa Ratu Erine ke Istana Cavallery dengan selamat sambil menghindari kejaran zombie yang tiada henti. Seberapa jauh kamu bisa memandu sang Ratu? Buktikan ketangkasanmu sekarang!",
  },
  {
    title: "Game Belalang Yang Membangkang",
    desc: "Bantu Erine mengumpulkan belalang sebanyak mungkin sebelum waktu habis!",
    href: "/games/grasshopper-collector",
    icon: "bx-bug",
    tag: "Arcade",
    color: "var(--cv-orange)",
    longDesc:
      "Tantang dirimu membantu Erine mengumpulkan sebanyak mungkin belalang dalam waktu terbatas. Gerakkan karakter Erine ke kiri dan kanan, hindari rintangan, dan raih skor tertinggi di leaderboard Cavallery!",
  },
  {
    title: "Game Bibir Yang Telah Dicuri",
    desc: "Bantu Erine melompati rintangan dan raih skor tertinggi dalam petualangan seru untuk merebut kembali bibir yang dicuri!",
    href: "/games/jumping-adventure",
    icon: "bx-up-arrow-circle",
    tag: "Adventure",
    color: "var(--cv-orange)",
    longDesc:
      "Sebuah petualangan tanpa akhir bersama Erine! Uji refleks dan ketangkasanmu memandu Erine melompati semua rintangan. Jadilah yang terbaik di papan skor Cavallery dan bantu Erine menyelesaikan misinya!",
  },
  {
    title: "Love Erine Meter",
    desc: "Seberapa besar cintamu untuk Erine? Ukur sekarang dan bagikan hasilnya!",
    href: "/games/love-erine-meter",
    icon: "bxs-heart",
    tag: "Fun",
    color: "var(--cv-orange)",
    longDesc:
      "Game spesial untuk seluruh Cavallery! Masukkan namamu dan ukur seberapa besar cintamu untuk Erine. Bagikan hasilnya dan tag @cavallery.id!",
  },
];

import Link from "next/link";
import GameLeaderboard from "@/components/games/GameLeaderboard";

export default function GamesPage() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className="badge"><i className="bx bx-joystick" /> #GameRine</div>
          <h1 className={styles.heroTitle}>
            Mini Games <span className="textGold">Cavallery</span>
          </h1>
          <p className={styles.heroSub}>
            Game-game eksklusif yang dibuat oleh tim Cavallery dan pernah dimainkan langsung oleh Erine!
          </p>
        </div>
      </div>

      {/* Game video teaser */}
      <GamesVideoTeaser />

      {/* Games Grid */}
      <div className={styles.grid}>
        {games.map((g) => (
          <div
            key={g.title}
            className={`glassCard ${styles.card}`}
            style={{ "--card-color": g.color } as React.CSSProperties}
          >
            <div className={styles.cardTop}>
              <div className={styles.cardTag}>{g.tag}</div>
              <div className={styles.cardIcon}><i className={`bx ${g.icon}`} /></div>
            </div>
            <h2 className={styles.cardTitle}>{g.title}</h2>
            <p className={styles.cardDesc}>{g.longDesc}</p>
            <Link
              href={g.href}
              className={styles.playBtn}
            >
              <i className="bx bxs-joystick" /> Play Now
              <i className="bx bx-right-arrow-alt" />
            </Link>
          </div>
        ))}
      </div>

      {/* Leaderboard & Stats for games with name input (Belalang & Bibir) */}
      <GameLeaderboard />
    </div>
  );
}
