"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./ShowModal.module.css";
import type { Jkt48TheaterShow } from "@/types/jkt48";

interface ShowModalProps {
  show: Jkt48TheaterShow | null;
  onClose: () => void;
}

export default function ShowModal({ show, onClose }: ShowModalProps) {
  const [copied, setCopied] = useState(false);
  const [detailData, setDetailData] = useState<{
    screenshots: string[];
    leaderboard_banner: { status: string; url?: string } | null;
  }>({
    screenshots: [],
    leaderboard_banner: null,
  });

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

  // Fetch detail info (screenshots & leaderboard)
  useEffect(() => {
    if (!show?.id) return;

    let isMounted = true;
    fetch(`/api/jkt48/theater/${encodeURIComponent(show.id)}`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.data) {
          setDetailData({
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
    avatar: "/api/jkt48/member-photo/catherina_vallencia",
    is_erine: true,
  };
  const otherMembers = members.filter((m) => !m.is_erine);

  // Helper resolusi foto member JKT48
  const getMemberPhoto = (m: any): string => {
    if (typeof m === "string") {
      const slug = m.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      return `/api/jkt48/member-photo/${slug}`;
    }
    if (m?.is_erine || (m?.name || "").toLowerCase().includes("catherina") || (m?.name || "").toLowerCase().includes("erine")) {
      return "/api/jkt48/member-photo/catherina_vallencia";
    }
    if (m?.avatar && !m.avatar.includes("cava-logo") && !m.avatar.includes("undefined")) return m.avatar;
    if (m?.img && !m.img.includes("cava-logo") && !m.img.includes("undefined")) return m.img;
    const name = (m?.name || "").trim().toLowerCase();
    if (name) {
      const slug = name.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      return `/api/jkt48/member-photo/${slug}`;
    }
    if (m?.url_key) {
      return `/api/jkt48/member-photo/${m.url_key.toLowerCase()}`;
    }
    return "/api/jkt48/member-photo/catherina_vallencia";
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
              referrerPolicy="no-referrer"
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
                referrerPolicy="no-referrer"
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
              {otherMembers.map((m, idx) => {
                const memberName = typeof m === "string" ? m : m?.name || `Member ${idx + 1}`;
                const rawName = typeof m === "string" ? m : m?.name || "";
                const slug = rawName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
                const nickname = memberName.split(" ")[0];

                return (
                  <div key={m.id || idx} className={styles.memberCard}>
                    <img
                      src={getMemberPhoto(m)}
                      alt={memberName}
                      className={styles.memberImg}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const imgEl = e.currentTarget as HTMLImageElement;
                        if (slug && !imgEl.src.includes("/api/jkt48/member-photo")) {
                          imgEl.src = `/api/jkt48/member-photo/${slug}`;
                        } else {
                          imgEl.src = "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg";
                        }
                      }}
                    />
                    <span className={styles.memberNickname}>
                      {nickname}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Galeri Screenshot */}
          {detailData.screenshots.length > 0 && (
            <div className={styles.lineupSection}>
              <h4 className={styles.lineupHeading}>
                <i className="bx bx-images" />
                <span>CUPLIKAN SHOW</span>
              </h4>

              <div className={styles.screenshotCarousel}>
                {detailData.screenshots.map((s, idx) => (
                  <img
                    key={idx}
                    src={s}
                    alt={`Cuplikan ${idx}`}
                    className={styles.screenshotThumb}
                    referrerPolicy="no-referrer"
                  />
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
                referrerPolicy="no-referrer"
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
