"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./ScheduleSocialFeed.module.css";
import type { Jkt48SocialUpdate } from "@/types/jkt48";

type PlatformType = "all" | "x" | "instagram" | "tiktok";

function formatRelativeTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} mnt lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} hari lalu`;

    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

export default function ScheduleSocialFeed() {
  const [platform, setPlatform] = useState<PlatformType>("all");
  const [posts, setPosts] = useState<Jkt48SocialUpdate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSocial = useCallback(async () => {
    setLoading(true);
    try {
      const p = platform !== "all" ? `?platform=${platform}&limit=9` : "?limit=9";
      const res = await fetch(`/api/jkt48/updates${p}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPosts(json.data.updates || []);
      }
    } catch (e) {
      console.warn("Failed to load social feed in schedule:", e);
    } finally {
      setLoading(false);
    }
  }, [platform]);

  useEffect(() => {
    fetchSocial();
  }, [fetchSocial]);

  return (
    <div className={styles.feedSection}>
      <div className={styles.feedHeader}>
        <div className={styles.titleGroup}>
          <i className="bx bx-broadcast" />
          <h3 className={styles.sectionTitle}>Aktivitas Media Sosial Erine</h3>
        </div>

        <div className={styles.tabsRow}>
          <button
            type="button"
            className={`${styles.tabBtn} ${platform === "all" ? styles.tabBtnActive : ""}`}
            onClick={() => setPlatform("all")}
          >
            Semua
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${platform === "x" ? styles.tabBtnActive : ""}`}
            onClick={() => setPlatform("x")}
          >
            <i className="bx bxl-twitter" /> X
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${platform === "instagram" ? styles.tabBtnActive : ""}`}
            onClick={() => setPlatform("instagram")}
          >
            <i className="bx bxl-instagram" /> IG
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${platform === "tiktok" ? styles.tabBtnActive : ""}`}
            onClick={() => setPlatform("tiktok")}
          >
            <i className="bx bxl-tiktok" /> TikTok
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "30px", textAlign: "center", color: "var(--cv-text-dim)" }}>
          <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "1.6rem", color: "var(--cv-orange)" }} />
          <p style={{ marginTop: "8px", fontSize: "0.85rem" }}>Memuat aktivitas Erine...</p>
        </div>
      ) : posts.length === 0 ? (
        <div style={{ padding: "30px", textAlign: "center", color: "var(--cv-text-mute)", fontSize: "0.9rem" }}>
          Belum ada postingan Erine terbaru untuk platform ini.
        </div>
      ) : (
        <div className={styles.postsGrid}>
          {posts.slice(0, 6).map((item) => {
            const relTime = formatRelativeTime(item.created_at);
            const iconClass =
              item.platform === "x"
                ? `bx bxl-twitter ${styles.iconX}`
                : item.platform === "instagram"
                ? `bx bxl-instagram ${styles.iconIg}`
                : `bx bxl-tiktok ${styles.iconTt}`;

            const hasPhoto = item.media_urls && item.media_urls.length > 0 && item.media_urls[0];

            return (
              <a
                key={item.cursor}
                href={item.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.postCard}
              >
                <div className={styles.cardTop}>
                  <div className={styles.userMeta}>
                    <img
                      src={item.member.avatar || "https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg"}
                      alt={item.member.name}
                      className={styles.userAvatar}
                    />
                    <div>
                      <div className={styles.userName}>{item.member.name}</div>
                      <div className={styles.userHandle}>
                        {item.member.username ? `@${item.member.username}` : "Erine JKT48"}
                      </div>
                    </div>
                  </div>

                  <i className={`${iconClass} ${styles.platformIcon}`} />
                </div>

                {hasPhoto && (
                  <div className={styles.postMediaBox}>
                    <img
                      src={item.media_urls![0]}
                      alt="Post Media Erine"
                      className={styles.postMediaImg}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                <div className={styles.cardBody}>
                  <p className={styles.postText}>{item.text || "Lihat postingan Erine selengkapnya..."}</p>

                  <div className={styles.cardBottom}>
                    <span>{relTime}</span>
                    <span className={styles.viewLink}>
                      Buka Post <i className="bx bx-link-external" />
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
