import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "./page.module.css";
import Link from "next/link";
import GameFrame from "./GameFrame";

const gameData: Record<string, { title: string; url: string; description: string; externalUrl?: string }> = {
  "anterine-ke-theater": {
    title: "Game Anterine Ke Theater",
    url: "/play/anterine-ke-theater/index.html",
    externalUrl: "https://adityaptm.github.io/Game-2d-Anterine_ke_theater/",
    description: "Bantu dan anterin Erine menuju Theater JKT48 tepat waktu sebelum pertunjukan show theater dimulai!",
  },
  "grasshopper-collector": {
    title: "Game Belalang Yang Membangkang",
    url: "/play/grasshopper-collector.html",
    description: "Kumpulkan belalang sebanyak mungkin sebelum waktu habis! Hindari rintangan dan raih rekor tertinggi.",
  },
  "jumping-adventure": {
    title: "Game Bibir Yang Telah Dicuri",
    url: "/play/jumping-adventure.html",
    description: "Lompati rintangan dan raih skor tertinggi dalam petualangan merebut kembali bibir yang dicuri!",
  },
  "zombie-escape": {
    title: "Game Erine In Etherland",
    url: "/play/zombie-escape.html",
    description: "Bantu Ratu Erine melarikan diri dari kejaran zombie dan bawa ia selamat menuju Istana Cavallery!",
  },
  "dress-up-erine": {
    title: "Dress Up Erine Outfit",
    url: "/play/dressuperine.html",
    description: "Ayo dress up Erine sesukamu! Ganti busana panggung, pilih ekspresi wajah, dan tentukan lokasinya.",
  },
  "love-erine-meter": {
    title: "Love Erine Meter",
    url: "/play/love-tester.html",
    description: "Seberapa besar rasa cintamu untuk Erine? Ukur sekarang dan bagikan hasilnya ke sesama Cavallery!",
  },
  "knight-passion": {
    title: "Game Anterine Ke Theater",
    url: "/play/anterine-ke-theater/index.html",
    externalUrl: "https://adityaptm.github.io/Game-2d-Anterine_ke_theater/",
    description: "Bantu dan anterin Erine menuju Theater JKT48 sebelum show dimulai!",
  },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return Object.keys(gameData).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const game = gameData[resolvedParams.slug];
  if (!game) return { title: "Game Not Found | Cavallery" };

  const pageTitle = `${game.title} — Mini Games Cavallery`;
  const pageDesc = game.description;
  const pageUrl = `https://cavallery.id/games/${resolvedParams.slug}`;
  const ogImage = "https://cavallery.id/images/cava-logo-round.png";

  return {
    title: pageTitle,
    description: pageDesc,
    metadataBase: new URL("https://cavallery.id"),
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: pageTitle,
      description: pageDesc,
      url: pageUrl,
      siteName: "Cavallery - Fanbase Catherina Vallencia Erine JKT48",
      images: [
        {
          url: ogImage,
          width: 512,
          height: 512,
          alt: game.title,
        },
      ],
      type: "website",
      locale: "id_ID",
    },
    twitter: {
      card: "summary",
      title: pageTitle,
      description: pageDesc,
      images: [ogImage],
    },
  };
}

export default async function GamePlayPage({ params }: Props) {
  const resolvedParams = await params;
  const game = gameData[resolvedParams.slug];
  if (!game) notFound();

  const externalLink = game.externalUrl || (game.url.startsWith("http") ? game.url : undefined);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/games" className={styles.backBtn} aria-label="Kembali ke Daftar Games">
            <i className="bx bx-left-arrow-alt" /> Kembali
          </Link>
          <h1 className={styles.title}>{game.title}</h1>
          {externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--cv-orange, #ff6b1a)",
                textDecoration: "none",
                minHeight: "44px",
                padding: "4px 8px",
              }}
              aria-label="Buka Game di Tab Baru"
            >
              <span>Buka di Tab Baru</span>
              <i className="bx bx-external-link" />
            </a>
          )}
        </div>
      </div>
      <div className={styles.frameWrapper}>
        <GameFrame
          src={game.url}
          title={game.title}
          slug={resolvedParams.slug}
          showMusicToggle={true}
        />
      </div>
    </div>
  );
}
