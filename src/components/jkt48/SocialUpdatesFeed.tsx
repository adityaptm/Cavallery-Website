"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./SocialUpdatesFeed.module.css";
import type { Jkt48SocialUpdate } from "@/types/jkt48";

type PlatformFilter = "all" | "x" | "instagram" | "tiktok";

function formatRelativeTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return "Baru saja";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} menit yang lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam yang lalu`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} hari yang lalu`;

    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  } catch {
    return isoString;
  }
}

export default function SocialUpdatesFeed() {
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [updates, setUpdates] = useState<Jkt48SocialUpdate[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Local storage cursor key
  const storageKey = `cv_last_cursor_${platform}`;

  // Fetch updates
  const fetchFeed = useCallback(
    async (cursorVal = "", isLoadMore = false) => {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const params = new URLSearchParams();
        if (platform !== "all") params.set("platform", platform);
        if (cursorVal) params.set("cursor", cursorVal);
        params.set("limit", "18");

        const res = await fetch(`/api/jkt48/updates?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error || "Gagal memuat pembaruan media sosial.");
        }

        const newItems: Jkt48SocialUpdate[] = json.data?.updates || [];

        setUpdates((prev) => {
          if (isLoadMore) {
            // Deduplikasi menggunakan item.cursor
            const existingCursors = new Set(prev.map((item) => item.cursor));
            const filteredNew = newItems.filter((item) => !existingCursors.has(item.cursor));
            return [...prev, ...filteredNew];
          }
          return newItems;
        });

        const newCursor = json.data?.next_cursor || null;
        setNextCursor(newCursor);
        setHasMore(Boolean(json.data?.has_more));

        // Simpan cursor terakhir hanya setelah render berhasil
        if (newCursor && typeof window !== "undefined") {
          try {
            localStorage.setItem(storageKey, newCursor);
          } catch {}
        }
      } catch (err: any) {
        setError(err?.message || "Terjadi kendala saat memuat feed.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [platform, storageKey]
  );

  useEffect(() => {
    // Saat platform tab berganti, ambil cursor tersimpan opsional atau ambil dari awal
    fetchFeed("");
  }, [platform, fetchFeed]);

  const toggleExpand = (cursor: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [cursor]: !prev[cursor],
    }));
  };

  const getPlatformIcon = (plat: string) => {
    switch (plat) {
      case "x":
        return <i className={`bx bxl-twitter ${styles.platformIcon}`} title="Twitter / X" />;
      case "instagram":
        return <i className={`bx bxl-instagram ${styles.platformIcon}`} title="Instagram" />;
      case "tiktok":
        return <i className={`bx bxl-tiktok ${styles.platformIcon}`} title="TikTok" />;
      default:
        return <i className={`bx bx-news ${styles.platformIcon}`} />;
    }
  };

  return (
    <div className={styles.container}>
      {/* Header Area */}
      <div className={styles.headerArea}>
        <div className={styles.titleArea}>
          <i className="bx bx-broadcast" />
          <h3>Update Media Sosial Erine</h3>
        </div>

        {/* Tabs Filter */}
        <div className={styles.tabsList}>
          <button
            className={`${styles.tabBtn} ${platform === "all" ? styles.tabBtnActive : ""}`}
            onClick={() => setPlatform("all")}
          >
            <i className="bx bx-grid-alt" /> Semua
          </button>
          <button
            className={`${styles.tabBtn} ${platform === "x" ? styles.tabBtnActive : ""}`}
            onClick={() => setPlatform("x")}
          >
            <i className="bx bxl-twitter" /> X (Twitter)
          </button>
          <button
            className={`${styles.tabBtn} ${platform === "instagram" ? styles.tabBtnActive : ""}`}
            onClick={() => setPlatform("instagram")}
          >
            <i className="bx bxl-instagram" /> Instagram
          </button>
          <button
            className={`${styles.tabBtn} ${platform === "tiktok" ? styles.tabBtnActive : ""}`}
            onClick={() => setPlatform("tiktok")}
          >
            <i className="bx bxl-tiktok" /> TikTok
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className={styles.skeletonGrid}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.stateBox}>
          <i className={`bx bx-error-circle ${styles.stateIcon}`} />
          <div className={styles.stateText}>{error}</div>
          <button className={styles.retryBtn} onClick={() => fetchFeed("")}>
            Coba Lagi
          </button>
        </div>
      ) : updates.length === 0 ? (
        <div className={styles.stateBox}>
          <i className={`bx bx-message-square-dots ${styles.stateIcon}`} />
          <div className={styles.stateText}>
            Belum ada pembaruan media sosial Erine untuk platform ini.
          </div>
        </div>
      ) : (
        <>
          <div className={styles.feedGrid}>
            {updates.map((item) => {
              const isExpanded = Boolean(expandedCards[item.cursor]);
              const needsClamp = (item.text || "").length > 180;

              return (
                <div key={item.cursor} className={styles.postCard}>
                  <div className={styles.cardTop}>
                    <div className={styles.memberMeta}>
                      {item.member.avatar ? (
                        <img
                          src={item.member.avatar}
                          alt={item.member.name}
                          className={styles.avatar}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.avatarFallback}>
                          {item.member.name.charAt(0)}
                        </div>
                      )}
                      <div className={styles.nameBlock}>
                        <div className={styles.memberName}>{item.member.name}</div>
                        {item.member.username && (
                          <div className={styles.username}>@{item.member.username}</div>
                        )}
                      </div>
                    </div>

                    {getPlatformIcon(item.platform)}
                  </div>

                  <div className={styles.postContent}>
                    <div
                      className={`${styles.postText} ${
                        needsClamp && !isExpanded ? styles.postTextClamped : ""
                      }`}
                    >
                      {item.text || "Pembaruan media baru."}
                    </div>

                    {needsClamp && (
                      <button
                        className={styles.clampToggleBtn}
                        onClick={() => toggleExpand(item.cursor)}
                      >
                        {isExpanded ? "Sembunyikan" : "Selengkapnya..."}
                      </button>
                    )}

                    {item.media_urls && item.media_urls.length > 0 && item.media_urls[0] && (
                      <img
                        src={item.media_urls[0]}
                        alt="Media Preview"
                        className={styles.mediaThumb}
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className={styles.cardBottom}>
                    <span className={styles.relTime}>
                      {formatRelativeTime(item.created_at)}
                    </span>

                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.postLink}
                      >
                        Lihat Post <i className="bx bx-link-external" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className={styles.loadMoreWrapper}>
              <button
                className={styles.loadMoreBtn}
                onClick={() => fetchFeed(nextCursor || "", true)}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" /> Memuat...
                  </>
                ) : (
                  <>
                    <i className="bx bx-chevron-down" /> Muat Lebih Banyak
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
