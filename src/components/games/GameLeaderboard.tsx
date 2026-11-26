"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./GameLeaderboard.module.css";

interface GameStats {
  rekor_teratas: number;
  total_pemain: number;
  sesi_dimainkan: number;
  rata_rata_skor: number;
}

interface LeaderboardEntry {
  rank: number;
  player_name: string;
  device_id?: string;
  score: number;
  duration_seconds?: number;
  played_at: string;
}

export const RANKED_GAMES = [
  {
    slug: "anterine-ke-theater",
    title: "Anterine Ke Theater",
    shortTitle: "Anterine Ke Theater",
    tag: "Adventure",
    icon: "bxs-navigation",
    badge: "Baru",
  },
  {
    slug: "grasshopper-collector",
    title: "Belalang Yang Membangkang",
    shortTitle: "Belalang Membangkang",
    tag: "Arcade",
    icon: "bx-bug",
    badge: null,
  },
  {
    slug: "jumping-adventure",
    title: "Bibir Yang Telah Dicuri",
    shortTitle: "Bibir Dicuri",
    tag: "Adventure",
    icon: "bx-up-arrow-circle",
    badge: null,
  },
];

export default function GameLeaderboard() {
  const [selectedGame, setSelectedGame] = useState(RANKED_GAMES[0].slug);
  const [stats, setStats] = useState<GameStats>({
    rekor_teratas: 0,
    total_pemain: 0,
    sesi_dimainkan: 0,
    rata_rata_skor: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myDeviceId, setMyDeviceId] = useState<string>("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("cava_device_id");
      if (stored) setMyDeviceId(stored);
    } catch {
      // Ignore localStorage access restrictions
    }
  }, []);

  const currentGame = RANKED_GAMES.find((g) => g.slug === selectedGame) || RANKED_GAMES[0];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Menggunakan endpoint /api/stats dan /api/leaderboard secara paralel
      const [resStats, resLeaderboard] = await Promise.all([
        fetch(`/api/stats?game=${selectedGame}`, { cache: "no-store" }),
        fetch(`/api/leaderboard?game=${selectedGame}&limit=10`, { cache: "no-store" }),
      ]);

      if (!resStats.ok || !resLeaderboard.ok) {
        throw new Error("Gagal mengambil data dari server");
      }

      const dataStats = await resStats.json();
      const dataLeaderboard = await resLeaderboard.json();

      if (dataStats.status && dataStats.stats) {
        setStats(dataStats.stats);
      }
      if (dataLeaderboard.status && Array.isArray(dataLeaderboard.data)) {
        setLeaderboard(dataLeaderboard.data);
      }
    } catch (err: unknown) {
      console.error("Gagal memuat data leaderboard:", err);
      setError("Gagal memuat papan peringkat. Silakan periksa koneksi internetmu.");
    } finally {
      setLoading(false);
    }
  }, [selectedGame]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  return (
    <section className={styles.container} aria-label="Leaderboard dan Statistik Game">
      {/* SECTION HEADER & TABS */}
      <div className={styles.sectionHeaderWrap}>
        <div className={styles.titleAreaMain}>
          <div className="badge">
            <i className="bx bx-trophy" aria-hidden="true" /> Leaderboard & Statistik
          </div>
          <h2 className={styles.mainTitle}>
            Papan Peringkat <span className="textGold">#GameRine</span>
          </h2>
          <p className={styles.mainSubtitle}>
            Catatan rekor skor teratas dan statistik pemain dari mini game resmi Cavallery.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className={styles.tabsContainer} role="tablist" aria-label="Pilih Game Peringkat">
          {RANKED_GAMES.map((game) => {
            const isActive = selectedGame === game.slug;
            return (
              <button
                key={game.slug}
                role="tab"
                id={`tab-${game.slug}`}
                aria-selected={isActive}
                aria-controls={`panel-${game.slug}`}
                className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ""}`}
                onClick={() => setSelectedGame(game.slug)}
                type="button"
              >
                <i className={`bx ${game.icon}`} aria-hidden="true" />
                <span>{game.shortTitle}</span>
                {game.badge && <span className={styles.tabBadge}>{game.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4 STAT KARTU STATISTIK DENGAN SKELETON */}
      <div className={styles.statsGrid}>
        {/* 1. Rekor Teratas */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: "rgba(228, 115, 39, 0.15)", color: "var(--cv-orange, #ff6b1a)" }}>
            <i className="bx bxs-trophy" aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Rekor Teratas</span>
            {loading ? (
              <div className={styles.skeletonStat} aria-hidden="true" />
            ) : (
              <span className={styles.statValue}>
                {stats.rekor_teratas.toLocaleString("id-ID")}
              </span>
            )}
          </div>
        </div>

        {/* 2. Total Pemain */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
            <i className="bx bxs-user-detail" aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Pemain</span>
            {loading ? (
              <div className={styles.skeletonStat} aria-hidden="true" />
            ) : (
              <span className={styles.statValue}>
                {stats.total_pemain.toLocaleString("id-ID")}
              </span>
            )}
          </div>
        </div>

        {/* 3. Sesi Dimainkan */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
            <i className="bx bxs-joystick-button" aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Sesi Dimainkan</span>
            {loading ? (
              <div className={styles.skeletonStat} aria-hidden="true" />
            ) : (
              <span className={styles.statValue}>
                {stats.sesi_dimainkan.toLocaleString("id-ID")}
              </span>
            )}
          </div>
        </div>

        {/* 4. Rata-rata Skor */}
        <div className={styles.statCard}>
          <div className={styles.statIconWrap} style={{ background: "rgba(34, 197, 94, 0.15)", color: "#4ade80" }}>
            <i className="bx bxs-bar-chart-alt-2" aria-hidden="true" />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Rata-rata Skor</span>
            {loading ? (
              <div className={styles.skeletonStat} aria-hidden="true" />
            ) : (
              <span className={styles.statValue}>
                {stats.rata_rata_skor.toLocaleString("id-ID")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* LEADERBOARD TABLE SECTION */}
      <div
        className={styles.leaderboardSection}
        id={`panel-${currentGame.slug}`}
        role="tabpanel"
        aria-labelledby={`tab-${currentGame.slug}`}
      >
        <div className={styles.sectionHeader}>
          <div className={styles.titleArea}>
            <i className="bx bxs-crown" aria-hidden="true" style={{ color: "var(--gold, #ff6b1a)", fontSize: "1.3rem" }} />
            <h3 className={styles.sectionTitle}>
              Top 10 — {currentGame.title}
            </h3>
          </div>
          <button
            onClick={fetchData}
            className={styles.refreshBtn}
            title="Segarkan data peringkat"
            aria-label="Segarkan data papan peringkat"
            disabled={loading}
          >
            <i className={`bx bx-refresh ${loading ? "bx-spin" : ""}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        {/* ERROR STATE */}
        {error && !loading && (
          <div className={styles.errorState} role="alert">
            <i className="bx bx-error-circle" aria-hidden="true" />
            <p className={styles.errorMessage}>{error}</p>
            <button type="button" onClick={fetchData} className={styles.retryBtn}>
              <i className="bx bx-redo" aria-hidden="true" /> Coba Lagi
            </button>
          </div>
        )}

        {/* SKELETON TABLE LOADING */}
        {loading && (
          <div className={styles.tableWrap} aria-busy="true" aria-label="Memuat data papan peringkat">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ width: "76px" }}>Rank</th>
                  <th className={styles.th}>Pemain</th>
                  <th className={styles.th} style={{ textAlign: "right" }}>Skor</th>
                  <th className={styles.th} style={{ textAlign: "right" }}>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, idx) => (
                  <tr key={idx} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.skeletonRank} />
                    </td>
                    <td className={styles.td}>
                      <div className={styles.skeletonPlayer}>
                        <div className={styles.skeletonAvatar} />
                        <div className={styles.skeletonText} />
                      </div>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <div className={styles.skeletonScore} />
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <div className={styles.skeletonDate} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && !error && leaderboard.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconCircle}>
              <i className="bx bx-ghost" aria-hidden="true" />
            </div>
            <h4 className={styles.emptyTitle}>Belum ada skor, jadilah yang pertama!</h4>
            <p className={styles.emptySubtitle}>
              Mainkan permainannya sekarang, selesaikan misi, dan raih nama di urutan teratas leaderboard Cavallery.
            </p>
          </div>
        )}

        {/* DATA TABLE */}
        {!loading && !error && leaderboard.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ width: "76px" }}>Rank</th>
                  <th className={styles.th}>Pemain</th>
                  <th className={styles.th} style={{ textAlign: "right" }}>Skor</th>
                  <th className={styles.th} style={{ textAlign: "right" }}>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => {
                  const isMe = Boolean(myDeviceId && entry.device_id && entry.device_id === myDeviceId);
                  let badgeContent: React.ReactNode = entry.rank;
                  let badgeClass = styles.rankOther;

                  if (entry.rank === 1) {
                    badgeContent = "🥇";
                    badgeClass = styles.rank1;
                  } else if (entry.rank === 2) {
                    badgeContent = "🥈";
                    badgeClass = styles.rank2;
                  } else if (entry.rank === 3) {
                    badgeContent = "🥉";
                    badgeClass = styles.rank3;
                  }

                  return (
                    <tr
                      key={`${entry.rank}-${entry.player_name}-${entry.score}`}
                      className={`${styles.tr} ${isMe ? styles.myRow : ""}`}
                    >
                      <td className={styles.td}>
                        <span className={`${styles.rankBadge} ${badgeClass}`}>
                          {badgeContent}
                        </span>
                      </td>
                      <td className={styles.td}>
                        <div className={styles.playerCell}>
                          <div className={styles.avatar}>
                            {entry.player_name.charAt(0).toUpperCase()}
                          </div>
                          <span className={styles.playerNameText}>{entry.player_name}</span>
                          {isMe && <span className={styles.myTag}>Kamu</span>}
                        </div>
                      </td>
                      <td className={styles.td} style={{ textAlign: "right" }}>
                        <span className={styles.scoreVal}>
                          {entry.score.toLocaleString("id-ID")}
                        </span>
                      </td>
                      <td className={styles.td} style={{ textAlign: "right", color: "var(--fg-muted, #a8a29e)", fontSize: "0.85rem" }}>
                        {formatDate(entry.played_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={styles.submitBanner}>
          <i className="bx bx-info-circle" aria-hidden="true" style={{ color: "var(--gold, #ff6b1a)", fontSize: "1.1rem" }} />
          <span>
            Skor kamu otomatis dicatat dan diurutkan secara adil. Pastikan memasukkan namamu sebelum mulai bermain!
          </span>
        </div>
      </div>
    </section>
  );
}
