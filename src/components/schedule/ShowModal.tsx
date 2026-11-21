"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import styles from "./ShowModal.module.css";
import type { Jkt48TheaterShow, Jkt48Recording } from "@/types/jkt48";

interface ShowModalProps {
  show: Jkt48TheaterShow | null;
  onClose: () => void;
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube-nocookie.com/embed/${match[2]}` : null;
  } catch {
    return null;
  }
}

export default function ShowModal({ show, onClose }: ShowModalProps) {
  const [detailData, setDetailData] = useState<{
    recordings: Jkt48Recording[];
    screenshots: string[];
    leaderboard_banner: { status: string; url?: string } | null;
  }>({
    recordings: [],
    screenshots: [],
    leaderboard_banner: null,
  });
  const [loadingDetail, setLoadingDetail] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Scroll lock & Escape key
  useEffect(() => {
    if (!show) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [show, onClose]);

  // Fetch detail info (recordings, screenshots, leaderboard)
  useEffect(() => {
    if (!show?.id) return;

    let isMounted = true;
    setLoadingDetail(true);

    fetch(`/api/jkt48/theater/${encodeURIComponent(show.id)}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data) {
          setDetailData({
            recordings: json.data.recordings || [],
            screenshots: json.data.screenshots || [],
            leaderboard_banner: json.data.leaderboard_banner || null,
          });
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch theater detail:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [show?.id]);

  // HLS Player initialization for stream_url
  const primaryRecording = detailData.recordings[0];
  const hlsStreamUrl = primaryRecording?.stream_url;

  useEffect(() => {
    if (!hlsStreamUrl || !videoRef.current) return;
    const video = videoRef.current;

    // Check Safari native HLS support
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsStreamUrl;
    } else {
      // Dynamic load hls.js from CDN
      const scriptId = "hls-js-cdn";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      const initHls = () => {
        const Hls = (window as any).Hls;
        if (Hls && Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(hlsStreamUrl);
          hls.attachMedia(video);
        }
      };

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
        script.onload = initHls;
        document.body.appendChild(script);
      } else if ((window as any).Hls) {
        initHls();
      }
    }
  }, [hlsStreamUrl]);

  if (!show) return null;

  const formattedDate = show.date
    ? new Date(show.date).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : show.showDate;

  const members = show.members || [];
  const erineMember = members.find((m) => m.is_erine) || {
    id: "44",
    name: "Catherina Vallencia (Erine)",
    avatar: "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
    is_erine: true,
  };
  const otherMembers = members.filter((m) => !m.is_erine);

  const youtubeEmbedUrl = getYouTubeEmbedUrl(primaryRecording?.youtube_url);

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-show-title"
    >
      <div className={styles.modal}>
        {/* Tombol Tutup X */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Tutup Detail Show"
        >
          <i className="bx bx-x" />
        </button>

        {/* Header Poster Foto Erine & Cavallery Gradient */}
        <div className={styles.headerPoster}>
          <img
            src={
              show.banner && show.banner.includes("http")
                ? show.banner
                : "https://images.jkt48connect.com/cavallery/images/2026/09/cf207d2f32384a39.jpg"
            }
            alt={show.title}
            className={styles.posterBg}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "/images/erine-passion.webp";
            }}
          />
          <div className={styles.posterGradient} />

          <div className={styles.headerInfo}>
            <h2 id="modal-show-title" className={styles.title}>
              {show.title}
            </h2>

            <div className={styles.chipsRow}>
              <div className={styles.chip}>
                <i className="bx bx-calendar" />
                <span>{formattedDate}</span>
              </div>
              <div className={styles.chip}>
                <i className="bx bx-time" />
                <span>{(show.startTime || "19:00").slice(0, 5)} WIB</span>
              </div>
              {show.team && (
                <div className={styles.chip}>
                  <i className="bx bxs-flag-alt" />
                  <span>{show.team}</span>
                </div>
              )}
              <div className={styles.chip}>
                <i className="bx bx-map-pin" />
                <span>{show.location || "Theater JKT48"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Isi Konten Modal */}
        <div className={styles.bodyContent}>
          {/* Section: Lineup Member */}
          <div className={styles.sectionBlock}>
            <h3 className={styles.sectionHeading}>
              <i className="bx bx-group" />
              <span>Tampil di Show Ini</span>
            </h3>

            {/* Kartu Sorotan Utama Erine */}
            <div className={styles.erineSpotlightBox}>
              <img
                src={erineMember.avatar || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg"}
                alt="Catherina Vallencia"
                className={styles.erineSpotlightImg}
              />
              <div className={styles.erineSpotlightDetails}>
                <div className={styles.erineName}>
                  {erineMember.name || "Catherina Vallencia (Erine)"}
                </div>
                <div className={styles.erineBadgeRole}>
                  <i className="bx bxs-star" />
                  <span>Member Utama yang Ditampilkan</span>
                </div>
              </div>
            </div>

            {/* Grid Foto Member Lain */}
            {otherMembers.length > 0 && (
              <div className={styles.memberGrid}>
                {otherMembers.map((m, idx) => (
                  <div key={m.id || idx} className={styles.memberCard}>
                    <img
                      src={m.avatar || m.img || "/images/cava-logo-round.png"}
                      alt={m.name}
                      className={styles.memberAvatar}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/images/cava-logo-round.png";
                      }}
                    />
                    <div className={styles.memberName}>{m.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Rekaman Video (Jika show selesai & ada rekaman) */}
          {(youtubeEmbedUrl || hlsStreamUrl) && (
            <div className={styles.sectionBlock}>
              <h3 className={styles.sectionHeading}>
                <i className="bx bx-play-circle" />
                <span>Rekaman Show Teater</span>
              </h3>

              <div className={styles.playerWrapper}>
                {youtubeEmbedUrl ? (
                  <iframe
                    src={youtubeEmbedUrl}
                    title={`Rekaman ${show.title}`}
                    className={styles.playerIframe}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : hlsStreamUrl ? (
                  <video
                    ref={videoRef}
                    controls
                    className={styles.playerVideo}
                    poster={show.banner}
                  />
                ) : null}
              </div>
            </div>
          )}

          {/* Section: Galeri Screenshot */}
          {detailData.screenshots.length > 0 && (
            <div className={styles.sectionBlock}>
              <h3 className={styles.sectionHeading}>
                <i className="bx bx-images" />
                <span>Galeri Cuplikan Show</span>
              </h3>

              <div className={styles.screenshotCarousel}>
                {detailData.screenshots.map((sUrl, idx) => (
                  <div key={idx} className={styles.screenshotItem}>
                    <img src={sUrl} alt={`Cuplikan ${idx + 1}`} loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Rekap Leaderboard */}
          <div className={styles.sectionBlock}>
            <h3 className={styles.sectionHeading}>
              <i className="bx bx-trophy" />
              <span>Rekap Leaderboard Show</span>
            </h3>

            {detailData.leaderboard_banner?.status === "ready" &&
            detailData.leaderboard_banner?.url ? (
              <div className={styles.leaderboardBox}>
                <img
                  src={detailData.leaderboard_banner.url}
                  alt="Rekap Leaderboard JKT48 Connect"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className={styles.emptyStateNotice}>
                <i className="bx bx-info-circle" style={{ marginRight: 6 }} />
                Gambar rekap belum tersedia.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
