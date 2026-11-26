import type { Metadata } from "next";
import GamesCatalog from "@/components/games/GamesCatalog";

export const metadata: Metadata = {
  title: "Mini Games Cavallery | Main Game Erine JKT48",
  description:
    "Koleksi mini game eksklusif Cavallery untuk Catherina Vallencia (Erine JKT48). Mainkan Anterine Ke Theater, Belalang Yang Membangkang, raih skor tertinggi di papan peringkat!",
  alternates: {
    canonical: "https://cavallery.id/games",
  },
  openGraph: {
    title: "Mini Games Cavallery | Main Game Erine JKT48",
    description:
      "Koleksi mini game interaktif bertema Erine JKT48. Mainkan game serunya, kumpulkan skor terbaikmu, dan jadilah nomor satu di leaderboard!",
    url: "https://cavallery.id/games",
    siteName: "Cavallery",
    images: [
      {
        url: "https://cavallery.id/images/cava-logo-round.png",
        width: 800,
        height: 800,
        alt: "Mini Games Cavallery - Erine JKT48",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mini Games Cavallery | Main Game Erine JKT48",
    description:
      "Koleksi mini game interaktif bertema Erine JKT48. Mainkan game serunya dan raih skor tertinggi di leaderboard!",
    images: ["https://cavallery.id/images/cava-logo-round.png"],
  },
};

export default function GamesPage() {
  return (
    <main style={{ minHeight: "100vh", paddingTop: "var(--nav-h, 72px)" }}>
      <GamesCatalog />
    </main>
  );
}
