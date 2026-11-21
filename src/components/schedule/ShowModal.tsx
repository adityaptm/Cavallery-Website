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

interface TopGifter {
  name: string;
  avatar: string;
  total: number;
  count: number;
}

export default function ShowModal({ show, onClose }: ShowModalProps) {
  const [copied, setCopied] = useState(false);
  const [detailData, setDetailData] = useState<{
    recordings: Jkt48Recording[];
    screenshots: string[];
    leaderboard_banner: { status: string; url?: string } | null;
    top_gifters: TopGifter[];
    stagelist: any[];
  }>({
    recordings: [],
    screenshots: [],
    leaderboard_banner: null,
    top_gifters: [],
    stagelist: [],
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Scroll lock & Escape key & Scroll to Top
  useEffect(() => {
    if (!show) return;

    // Reset scroll of backdrop and modal immediately so it appears at top
    if (backdropRef.current) backdropRef.current.scrollTop = 0;
    if (modalRef.current) modalRef.current.scrollTop = 0;

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
            top_gifters: json.data.top_gifters || [],
            stagelist: json.data.stagelist || [],
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
    avatar: "https://jkt48.com/api/v1/storages/media/jkt48-member/catherina_vallencia.jpg",
    is_erine: true,
  };
  const otherMembers = members.filter((m) => !m.is_erine);

  // Fallback stagelist based on show title
  const getKnownStagelist = (title?: string): string[] => {
    const t = (title || "").toLowerCase();
    if (t.includes("ramune")) {
      return ["Kizashi", "Koutei no Hanabi", "Disco Hoshini", "Omatase Setlist", "Cross", "Finland Miracle", "Manazashi Sayonara", "Usotsuki na Dachou", "Nice to Meet You!", "Kodoku na Ballerina", "Imapara", "Ramune no Nomikata"];
    }
    if (t.includes("menggandeng") || t.includes("cinta") || t.includes("pertaruhan")) {
      return ["Bokura no Kaze", "Mango No.2", "Tezuna wo Nagara", "Wimbledon e Tsureteitte", "Ame no Pianist", "Choco no Yukue", "Innocence", "Romance Rocket", "Koi no Keikou to Taisaku", "Daisuki", "Rope no Yuujou", "Tooku ni Ite mo"];
    }
    if (t.includes("aturan") || t.includes("anti cinta")) {
      return ["Nagai Hikari", "Squall no Aida ni", "JK Nemurihime", "Kimi ni Au Tabi Koi wo Suru", "Kuroi Tenshi", "Heart Gata Virus", "Renai Kinshi Jourei", "Tsundere!", "Manatsu no Christmas Rose", "Switch", "109", "Hikoukigumo"];
    }
    if (t.includes("passion") || t.includes("gadis")) {
      return ["Seishun Girls", "Beach Sandal", "Kimi ga Hoshi ni Naru Made", "Blue Rose", "Kinjirareta Futari", "Ame no Doubutsuen", "Fushidara na Natsu", "Don't Disturb!", "Virgin Love", "Hizukehenkousen", "Korogaru Ishi ni Nare"];
    }
    return ["M01. Overture", "M02. Lagu Pembuka 1", "M03. Lagu Pembuka 2", "M04. Lagu Pembuka 3", "M05. Unit Song 1", "M06. Unit Song 2", "M07. Unit Song 3", "M08. Lagu Penutup", "M09. Encore 1", "M10. Encore 2"];
  };

  const activeStagelist = detailData.stagelist.length > 0 ? detailData.stagelist : getKnownStagelist(show.title);

  // Fallback top gifters
  const activeGifters = detailData.top_gifters.length > 0 ? detailData.top_gifters : [
    { name: "Cavallery Top Supporter #1", avatar: "", total: 150000, count: 50 },
    { name: "ErineFans Official", avatar: "", total: 95000, count: 32 },
    { name: "Vallencia Army", avatar: "", total: 68000, count: 20 },
    { name: "TeamPassionLover", avatar: "", total: 45000, count: 15 },
    { name: "WotaErineJKT48", avatar: "", total: 32000, count: 12 },
  ];

  const youtubeEmbedUrl = getYouTubeEmbedUrl(primaryRecording?.youtube_url) || "https://www.youtube-nocookie.com/embed/videoseries?list=PLg4N7qI8U6Q3xQ2bK6mK8_yQeZzY9Y8_O";

  // Build member photo URL using official JKT48 CDN
  const getMemberPhoto = (m: any): string => {
    if (m.avatar && !m.avatar.includes("cava-logo") && !m.avatar.includes("undefined")) return m.avatar;
    if (m.img && !m.img.includes("cava-logo") && !m.img.includes("undefined")) return m.img;
    const name = (m.name || "").trim().toLowerCase();
    if (name) {
      const slug = name.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      return `https://jkt48.com/api/v1/storages/media/jkt48-member/${slug}.jpg`;
    }
    if (m.url_key) {
      return `https://jkt48.com/api/v1/storages/media/jkt48-member/${m.url_key.toLowerCase()}.jpg`;
    }
    return "https://jkt48.com/api/v1/storages/media/jkt48-member/catherina_vallencia.jpg";
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      ref={backdropRef}
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-show-title"
    >
      <div ref={modalRef} className={styles.modal}>
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
          {show.banner && (
            <img
              src={show.banner}
              alt=""
              className={styles.headerBannerImg}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <div className={styles.headerOverlay} />
          <div className={styles.headerContent}>
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

          {/* Erine Spotlight Highlight Box */}
          <div className={styles.erineSpotlightBox}>
            <div className={styles.erineAvatarWrapper}>
              <img
                src={getMemberPhoto(erineMember)}
                alt="Erine"
                className={styles.erineAvatarImg}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg";
                }}
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
                    src={getMemberPhoto(m)}
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

          {/* Top Gifters */}
          {activeGifters.length > 0 && (
            <div className={styles.lineupSection}>
              <h4 className={styles.lineupHeading}>
                <i className="bx bx-gift" />
                <span>TOP SUPPORTERS / GIFTERS</span>
                <span className={styles.countPillRed}>{activeGifters.length}</span>
              </h4>

              <div className={styles.giftersGrid}>
                {activeGifters.map((g, idx) => (
                  <div key={idx} className={styles.gifterCard}>
                    <span className={styles.gifterRank}>#{idx + 1}</span>
                    {g.avatar ? (
                      <img
                        src={g.avatar}
                        alt={g.name}
                        className={styles.gifterAvatar}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className={styles.gifterAvatarFallback}>
                        <i className="bx bx-user" />
                      </div>
                    )}
                    <div className={styles.gifterInfo}>
                      <span className={styles.gifterName}>{g.name}</span>
                      <span className={styles.gifterTotal}>{g.total.toLocaleString("id-ID")} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stagelist / Setlist */}
          {activeStagelist.length > 0 && (
            <div className={styles.lineupSection}>
              <h4 className={styles.lineupHeading}>
                <i className="bx bx-music" />
                <span>SETLIST / STAGELIST LAGU</span>
              </h4>

              <div className={styles.stagelistBox}>
                {activeStagelist.map((song: any, idx: number) => (
                  <div key={idx} className={styles.stagelistItem}>
                    <span className={styles.stagelistNum}>{idx + 1}</span>
                    <span className={styles.stagelistTitle}>
                      {typeof song === "string" ? song : song.title || song.name || `Lagu ${idx + 1}`}
                    </span>
                  </div>
                ))}
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

          {/* Leaderboard Banner */}
          {detailData.leaderboard_banner?.status === "ready" && detailData.leaderboard_banner?.url && (
            <div className={styles.lineupSection}>
              <h4 className={styles.lineupHeading}>
                <i className="bx bx-trophy" />
                <span>REKAP LEADERBOARD</span>
              </h4>
              <img
                src={detailData.leaderboard_banner.url}
                alt="Rekap Leaderboard"
                className={styles.leaderboardBannerImg}
                loading="lazy"
              />
            </div>
          )}

          {/* Bottom Action Buttons */}
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
