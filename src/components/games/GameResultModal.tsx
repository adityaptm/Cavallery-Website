"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./GameResultModal.module.css";

interface GameResultModalProps {
  score: number;
  gameSlug: string;
  playerName: string;
  deviceId: string;
  durationSeconds?: number;
  onPlayAgain: () => void;
  onViewLeaderboard: () => void;
}

export default function GameResultModal({
  score,
  gameSlug,
  playerName,
  deviceId,
  durationSeconds = 0,
  onPlayAgain,
  onViewLeaderboard,
}: GameResultModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [rankInfo, setRankInfo] = useState<{
    rank: number;
    total: number;
  } | null>(null);

  const submitScoreAndFetchRank = useCallback(async () => {
    setSubmitting(true);
    setSubmitError("");

    try {
      // 1. Submit Skor ke API
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_slug: gameSlug,
          player_name: playerName,
          device_id: deviceId,
          score,
          duration_seconds: durationSeconds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan skor.");
      }

      // Update record lokal di browser
      try {
        const localBestKey = `cava_best_${gameSlug}`;
        const prevBest = parseInt(localStorage.getItem(localBestKey) || "0", 10);
        if (score > prevBest) {
          localStorage.setItem(localBestKey, String(score));
        }
      } catch {}

      // 2. Ambil Peringkat Pemain
      const rankRes = await fetch(
        `/api/rank?game=${encodeURIComponent(gameSlug)}&device_id=${encodeURIComponent(deviceId)}`
      );
      const rankData = await rankRes.json();
      if (rankRes.ok && rankData.success && rankData.player_rank > 0) {
        setRankInfo({
          rank: rankData.player_rank,
          total: rankData.total_players,
        });
      }
    } catch (err: any) {
      setSubmitError(err?.message || "Tidak dapat terhubung ke server skor.");
    } finally {
      setSubmitting(false);
    }
  }, [gameSlug, playerName, deviceId, score, durationSeconds]);

  useEffect(() => {
    submitScoreAndFetchRank();
  }, [submitScoreAndFetchRank]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modalCard}>
        <div className={styles.trophyBadge}>
          <i className="bx bxs-trophy" />
        </div>

        <h2 className={styles.title}>Permainan Selesai!</h2>
        <p className={styles.subtitle}>
          Bagus sekali, <strong style={{ color: "var(--cv-bone)" }}>{playerName}</strong>!
        </p>

        <div className={styles.scoreBox}>
          <span className={styles.scoreLabel}>Skor Akhir Kamu</span>
          <span className={styles.scoreValue}>{score.toLocaleString("id-ID")}</span>

          {submitting ? (
            <div style={{ fontSize: "0.82rem", color: "var(--cv-text-dim)", marginTop: "4px" }}>
              <i className="bx bx-loader-alt bx-spin" /> Menyimpan skor ke Leaderboard...
            </div>
          ) : rankInfo ? (
            <div className={styles.rankStatusLine}>
              <i className="bx bxs-medal" />
              <span>
                Kamu peringkat #{rankInfo.rank} dari {rankInfo.total} pemain!
              </span>
            </div>
          ) : submitError ? (
            <div className={styles.rankErrorLine}>
              <span>{submitError}</span>
              <button
                type="button"
                className={styles.retryBtn}
                onClick={submitScoreAndFetchRank}
              >
                <i className="bx bx-refresh" /> Coba Kirim Lagi
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.btnGroup}>
          <button
            type="button"
            className={styles.playAgainBtn}
            onClick={onPlayAgain}
          >
            <i className="bx bx-rotate-left" style={{ fontSize: "1.2rem" }} />
            <span>Main Lagi</span>
          </button>

          <button
            type="button"
            className={styles.leaderboardBtn}
            onClick={onViewLeaderboard}
          >
            <i className="bx bx-bar-chart-alt-2" style={{ fontSize: "1.2rem" }} />
            <span>Lihat Leaderboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
