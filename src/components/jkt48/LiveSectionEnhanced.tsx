"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import styles from "./LiveSectionEnhanced.module.css";
import type {
  Jkt48LiveItem,
  Jkt48LiveNotification,
  Jkt48LiveComment,
  Jkt48LiveGift,
  Jkt48LiveRecent,
} from "@/types/jkt48";

export default function LiveSectionEnhanced() {
  const [lives, setLives] = useState<Jkt48LiveItem[]>([]);
  const [notifications, setNotifications] = useState<Jkt48LiveNotification[]>([]);
  const [selectedLive, setSelectedLive] = useState<Jkt48LiveItem | null>(null);
  const [comments, setComments] = useState<Jkt48LiveComment[]>([]);
  const [gifts, setGifts] = useState<Jkt48LiveGift[]>([]);
  const [recentData, setRecentData] = useState<Jkt48LiveRecent | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Live Streams
  const fetchLives = useCallback(async () => {
    try {
      const res = await fetch("/api/jkt48/live/now");
      const json = await res.json();
      if (res.ok && json.success) {
        const list: Jkt48LiveItem[] = json.data.lives || [];
        setLives(list);

        // Prioritize Erine or select first live
        if (!selectedLive && list.length > 0) {
          const erine = list.find((l) => l.is_erine);
          setSelectedLive(erine || list[0]);
        }
      }
    } catch (err: any) {
      console.warn("Live fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedLive]);

  // 2. Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/jkt48/live/notifications");
      const json = await res.json();
      if (res.ok && json.success) {
        setNotifications(json.data.lives || []);
      }
    } catch {}
  }, []);

  // 3. Fetch Comments for active selected live
  const fetchComments = useCallback(async () => {
    if (!selectedLive || document.hidden) return;
    try {
      const platform = selectedLive.platform || "showroom";
      const res = await fetch(
        `/api/jkt48/live/comments?platform=${encodeURIComponent(platform)}&id=${encodeURIComponent(
          selectedLive.id
        )}`
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setComments(Array.isArray(json.data) ? json.data.slice(-50) : []);
      }
    } catch {}
  }, [selectedLive]);

  // 4. Initial load & polling interval
  useEffect(() => {
    fetchLives();
    fetchNotifications();

    const liveInterval = setInterval(() => {
      if (!document.hidden) {
        fetchLives();
      }
    }, 20000);

    return () => clearInterval(liveInterval);
  }, [fetchLives, fetchNotifications]);

  // 5. Comments polling (12s) - Paused when tab is hidden
  useEffect(() => {
    if (!selectedLive) return;

    fetchComments();
    const commentsInterval = setInterval(() => {
      if (!document.hidden) {
        fetchComments();
      }
    }, 12000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchComments();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(commentsInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedLive, fetchComments]);

  // Auto-scroll comments
  useEffect(() => {
    if (autoScroll && commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments, autoScroll]);

  const erineIsLive = lives.some((l) => l.is_erine);

  // Check ready notification banner
  const readyBanner = notifications.find(
    (n) =>
      n.is_live &&
      n.notification_designs?.jkt48connect?.banner?.status === "ready" &&
      n.notification_designs?.jkt48connect?.banner?.url
  );

  return (
    <div className={styles.container}>
      {/* Status Bar */}
      <div className={styles.statusBar}>
        <div className={styles.statusLeft}>
          <div className={lives.length > 0 ? styles.liveIndicatorDot : styles.offlineIndicatorDot} />
          <div>
            <div className={styles.statusTitle}>
              {erineIsLive
                ? "✨ Erine Sedang Melangsungkan Live!"
                : lives.length > 0
                ? `${lives.length} Siaran Langsung JKT48 Aktif`
                : "Saat Ini Belum Ada Siaran Langsung"}
            </div>
            <div className={styles.statusSub}>
              {erineIsLive
                ? "Saksikan live streaming Erine sekarang di platform resminya."
                : "Data siaran diperbarui otomatis secara real-time."}
            </div>
          </div>
        </div>

        <button className={styles.refreshBtn} onClick={() => { setLoading(true); fetchLives(); }}>
          <i className="bx bx-refresh" /> Segarkan
        </button>
      </div>

      {/* Ready Notification Banner (if any) */}
      {readyBanner && readyBanner.notification_designs?.jkt48connect?.banner?.url && (
        <div className={styles.bannerCard}>
          <img
            src={readyBanner.notification_designs.jkt48connect.banner.url}
            alt={readyBanner.title || "Live Notification Banner"}
            className={styles.bannerImg}
            loading="lazy"
          />
          {readyBanner.caption && (
            <div className={styles.bannerCaption}>{readyBanner.caption}</div>
          )}
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className={styles.skeletonGrid}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : lives.length === 0 ? (
        <div className={styles.stateBox}>
          <i className={`bx bx-broadcast ${styles.stateIcon}`} />
          <div className={styles.stateText}>
            Tidak ada member JKT48 yang sedang siaran langsung saat ini. Kamu dapat mengunjungi
            showroom atau IDN App resmi Erine secara berkala.
          </div>
        </div>
      ) : (
        <div className={styles.liveGrid}>
          {lives.map((item) => {
            const isSelected = selectedLive?.id === item.id;
            return (
              <div
                key={item.id}
                className={`${styles.liveCard} ${item.is_erine ? styles.liveCardErine : ""}`}
                style={isSelected ? { borderColor: "var(--cv-orange)" } : undefined}
                onClick={() => setSelectedLive(item)}
              >
                <div className={styles.liveThumbWrapper}>
                  {item.img ? (
                    <img
                      src={item.img}
                      alt={item.name}
                      className={styles.liveThumb}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "#1c140e" }} />
                  )}
                  <div className={styles.liveBadgeTop}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#fff" }} />
                    LIVE
                  </div>
                  <div className={styles.livePlatformBadge}>
                    {item.platform}
                  </div>
                  {item.viewers !== undefined && (
                    <div className={styles.liveViewersBadge}>
                      <i className="bx bx-user" /> {Number(item.viewers).toLocaleString("id-ID")}
                    </div>
                  )}
                </div>

                <div className={styles.liveCardBody}>
                  <div className={styles.liveMemberName}>
                    {item.name}
                    {item.is_erine && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          background: "var(--cv-orange-soft)",
                          color: "var(--cv-orange)",
                          border: "1px solid var(--cv-orange-line)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        Erine
                      </span>
                    )}
                  </div>

                  <a
                    href={item.url || item.streaming_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.watchBtn}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <i className="bx bx-play-circle" /> Tonton di {item.platform === "idn" ? "IDN Live" : "Showroom"}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Room Section (Comments & Activity) */}
      {selectedLive && (
        <div className={styles.roomSection}>
          {/* Comments Column */}
          <div>
            <div className={styles.roomColumnHeader}>
              <div className={styles.roomColumnTitle}>
                <i className="bx bx-message-rounded-dots" /> Live Komentar ({selectedLive.name})
              </div>
              <label style={{ fontSize: "0.8rem", color: "var(--cv-text-dim)", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                Auto Scroll
              </label>
            </div>

            <div className={styles.commentsStream}>
              {comments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--cv-text-dim)", fontSize: "0.85rem" }}>
                  Belum ada komentar baru atau siaran baru saja dimulai.
                </div>
              ) : (
                comments.map((c, idx) => (
                  <div key={c.id || idx} className={styles.commentBubble}>
                    <div className={styles.commentUser}>{c.name || c.username || "Fans"}</div>
                    <div className={styles.commentText}>{c.comment}</div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>
          </div>

          {/* Info & Recap Column */}
          <div>
            <div className={styles.roomColumnHeader}>
              <div className={styles.roomColumnTitle}>
                <i className="bx bx-gift" /> Rekap & Info Siaran
              </div>
            </div>

            <div className={styles.rekapSection}>
              <div style={{ fontSize: "0.85rem", color: "var(--cv-text-dim)", lineHeight: 1.5 }}>
                Sedang memantau room <strong>{selectedLive.name}</strong> di platform{" "}
                <span style={{ textTransform: "capitalize", color: "var(--cv-orange)" }}>{selectedLive.platform}</span>.
              </div>

              <div className={styles.rekapBannerWrapper}>
                {recentData?.leaderboard_designs?.jkt48connect?.banner?.status === "ready" &&
                recentData.leaderboard_designs.jkt48connect.banner.url ? (
                  <img
                    src={recentData.leaderboard_designs.jkt48connect.banner.url}
                    alt="Banner Rekap Live"
                    loading="lazy"
                    style={{ width: "100%", height: "auto", display: "block" }}
                  />
                ) : (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--cv-text-mute)", fontSize: "0.85rem" }}>
                    <i className="bx bx-image-alt" style={{ fontSize: "1.8rem", marginBottom: "6px", display: "block" }} />
                    Gambar rekap belum tersedia.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
