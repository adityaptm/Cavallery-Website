"use client";

import { useEffect, useState, useRef } from "react";
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
  const [copied, setCopied] = useState(false);
  const [detailData, setDetailData] = useState<{
    recordings: Jkt48Recording[];
    screenshots: string[];
    leaderboard_banner: { status: string; url?: string } | null;
  }>({
    recordings: [],
    screenshots: [],
    leaderboard_banner: null,
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  // Scroll lock & Escape key
  useEffect(() => {
    if (!show) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [show, onClose]);

  // Fetch detail info
  useEffect(() => {
    if (!show?.id) return;

    let isMounted = true;
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
      .catch((err) => console.warn(err));

    return () => {
      isMounted = false;
    };
  }, [show?.id]);

  // HLS stream
  const primaryRecording = detailData.recordings[0];
  const hlsStreamUrl = primaryRecording?.stream_url;

  useEffect(() => {
    if (!hlsStreamUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsStreamUrl;
    } else {
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

  const cleanTime = (show.startTime || "19:00").slice(0, 5);

  const members = show.members || [];
  const erineMember = members.find((m) => m.is_erine) || {
    id: "44",
    name: "Catherina Vallencia",
    url_key: "erine",
    avatar: "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg",
    is_erine: true,
  };
  const otherMembers = members.filter((m) => !m.is_erine);

  const youtubeEmbedUrl = getYouTubeEmbedUrl(primaryRecording?.youtube_url);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
        {/* Tombol Close X */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Tutup"
        >
          <i className="bx bx-x" />
        </button>

        {/* ── 1. HEADER (Dark Charcoal Banner) ── */}
        <div className={styles.modalHeader}>
          <div className={styles.teamTag}>{show.team || "TEAM JKT48"}</div>

          <h2 id="modal-show-title" className={styles.modalTitle}>
            {show.title}
          </h2>

          <div className={styles.modalSubRow}>
            <span>
              {formattedDate} · {cleanTime} WIB
            </span>

            <span className={styles.headerStatusDot}>
              <span className={styles.dotCircle} />
              {show.status === "live"
                ? "LIVE"
                : show.status === "upcoming"
                ? "AKAN DATANG"
                : "SELESAI"}
            </span>
          </div>
        </div>

        {/* ── 2. MODAL BODY (Warm Cream Content) ── */}
        <div className={styles.modalBody}>
          {/* 4 Info Cards (Tanggal, Tim, Waktu, Tempat) */}
          <div className={styles.infoCardsRow}>
            <div className={styles.infoCard}>
              <div className={styles.infoCardLabel}>
                <i className="bx bx-calendar" /> TANGGAL
              </div>
              <div className={styles.infoCardValue}>
                {show.date ? new Date(show.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-"}
              </div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoCardLabel}>
                <i className="bx bx-group" /> TIM
              </div>
              <div className={styles.infoCardValue}>{show.team || "Team JKT48"}</div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoCardLabel}>
                <i className="bx bx-time" /> WAKTU
              </div>
              <div className={styles.infoCardValue}>{cleanTime} WIB</div>
            </div>

            <div className={styles.infoCard}>
              <div className={styles.infoCardLabel}>
                <i className="bx bx-map-pin" /> TEMPAT
              </div>
              <div className={styles.infoCardValue}>{show.location || "JKT48 Theater"}</div>
            </div>
          </div>

          {/* Erine Spotlight Highlight Box (Like Reference) */}
          <div className={styles.erineSpotlightBox}>
            <div className={styles.erineAvatarWrapper}>
              <img
                src={erineMember.avatar || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg"}
                alt="Erine"
                className={styles.erineAvatarImg}
              />
              <span className={styles.erineStarBadge}>
                <i className="bx bxs-star" />
              </span>
            </div>

            <div className={styles.erineInfoCol}>
              <span className={styles.erineRoleTag}>TAMPIL DI SHOW INI</span>
              <h3 className={styles.erineBigName}>CATHERINA VALLENCIA</h3>
              <span className={styles.erineSubCount}>
                Erine · bersama {otherMembers.length} member lain
              </span>
            </div>
          </div>

          {/* Member Lineup Grid */}
          <div className={styles.lineupSection}>
            <h4 className={styles.lineupHeading}>
              <i className="bx bx-group" />
              <span>TAMPIL BERSAMA ERINE</span>
              <span className={styles.countPillRed}>{otherMembers.length}</span>
            </h4>

            <div className={styles.membersGrid}>
              {otherMembers.map((m, idx) => (
                <div key={m.id || idx} className={styles.memberCard}>
                  <img
                    src={m.avatar || m.img || "/images/cava-logo-round.png"}
                    alt={m.name}
                    className={styles.memberImg}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/images/cava-logo-round.png";
                    }}
                  />
                  <span className={styles.memberNickname}>
                    {m.name.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rekaman Show (Jika Ada) */}
          {(youtubeEmbedUrl || hlsStreamUrl) && (
            <div className={styles.lineupSection}>
              <h4 className={styles.lineupHeading}>
                <i className="bx bx-play-circle" />
                <span>REKAMAN SHOW TEATER</span>
              </h4>

              <div className={styles.playerBox}>
                {youtubeEmbedUrl ? (
                  <iframe
                    src={youtubeEmbedUrl}
                    title={show.title}
                    className={styles.playerIframe}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : hlsStreamUrl ? (
                  <video ref={videoRef} controls className={styles.playerVideo} />
                ) : null}
              </div>
            </div>
          )}

          {/* Galeri Screenshot */}
          {detailData.screenshots.length > 0 && (
            <div className={styles.lineupSection}>
              <h4 className={styles.lineupHeading}>
                <i className="bx bx-images" />
                <span>CUPLIKAN SHOW</span>
              </h4>

              <div className={styles.screenshotCarousel}>
                {detailData.screenshots.map((s, idx) => (
                  <img key={idx} src={s} alt={`Cuplikan ${idx}`} className={styles.screenshotThumb} />
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action Buttons (Like Reference: LIHAT DI JKT48.COM + SALIN TAUTAN) */}
          <div className={styles.actionButtonsRow}>
            <a
              href={show.url || "https://jkt48.com/theater/schedule?lang=id"}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnRedAction}
            >
              <span>LIHAT DI JKT48.COM</span>
              <i className="bx bx-ticket" style={{ fontSize: "1.2rem" }} />
            </a>

            <button
              type="button"
              className={styles.btnWhiteAction}
              onClick={handleCopyLink}
            >
              <span>{copied ? "TAUTAN DISALIN!" : "SALIN TAUTAN"}</span>
              <i className={copied ? "bx bx-check" : "bx bx-link"} style={{ fontSize: "1.2rem" }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
