"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./GamesVideoTeaser.module.css";

const SESSION_STORAGE_KEY = "cava_games_video_dismissed";

export default function GamesVideoTeaser() {
  const [videoError, setVideoError] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true); // default true to prevent flash
  const [shouldAutoPlay, setShouldAutoPlay] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 1. Cek sessionStorage apakah sudah pernah ditutup / dilihat di sesi ini
    const dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (dismissed === "true") {
      setIsDismissed(true);
      return;
    }

    // 2. Cek prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setShouldAutoPlay(false);
    }

    setIsDismissed(false);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    } catch {
      // Ignore sessionStorage errors
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className={styles.videoWrap} aria-label="Video Pengantar Mini Games">
      <div className={styles.videoCard}>
        {/* Tombol Lewati / Tutup Video */}
        <button
          type="button"
          onClick={handleDismiss}
          className={styles.skipButton}
          aria-label="Lewati dan tutup video pengantar"
          title="Lewati Video"
        >
          <i className="bx bx-x" aria-hidden="true" />
          <span>Lewati Video</span>
        </button>

        {!videoError ? (
          <div className={styles.videoContainer}>
            <video
              ref={videoRef}
              src="https://cava.jkt48connect.com/erine-game.mp4"
              autoPlay={shouldAutoPlay}
              muted
              loop
              playsInline
              controls
              preload="metadata"
              className={styles.video}
              onError={() => setVideoError(true)}
              aria-label="Keseruan mini game Erine JKT48"
            />
            <div className={styles.videoOverlay}>
              <span className={styles.videoBadge}>
                <i className="bx bxs-video" aria-hidden="true" /> Teaser Spesial
              </span>
              <p className={styles.videoTitle}>
                Intip keseruan Erine saat mencoba memainkan mini game buatan Cavallery!
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.fallbackTeaser}>
            <div className={styles.fallbackGlow} />
            <i
              className="bx bxs-joystick-alt"
              style={{
                fontSize: "3rem",
                color: "var(--gold)",
                zIndex: 2,
              }}
              aria-hidden="true"
            />
            <p style={{ color: "var(--fg-muted)", fontSize: "0.9rem", zIndex: 2, margin: 0 }}>
              Video game teaser sedang tidak dapat dimuat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
