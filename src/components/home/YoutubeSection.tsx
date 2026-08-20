"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./YoutubeSection.module.css";

interface YtVideo {
  id: string;
  video_id: string;
  title: string;
  url: string;
  category: string;
  sort_order: string;
  is_active: boolean;
}

interface ApiResponse {
  status: boolean;
  message: string;
  data: {
    total: number;
    limit: number;
    offset: number;
    categories: string[];
    videos: YtVideo[];
  };
}

const API_URL = "/api/youtube";

export default function YoutubeSection() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [videos, setVideos] = useState<YtVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch videos from API
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json: any = await res.json();
        const rawVideos = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : json?.data?.videos;
        if (Array.isArray(rawVideos)) {
          // Only show active videos, sorted by sort_order
          const activeVideos = rawVideos
            .filter((v: YtVideo) => v.is_active !== false)
            .sort((a: YtVideo, b: YtVideo) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
          setVideos(activeVideos);
        } else {
          throw new Error(json?.message || "Gagal mengambil data video");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const checkScroll = () => {
    if (viewportRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = viewportRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll);
      checkScroll();
      window.addEventListener("resize", checkScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [videos]); // re-attach after videos load

  const handleScroll = (direction: "left" | "right") => {
    if (viewportRef.current) {
      const scrollAmount = direction === "left" ? -344 : 344;
      viewportRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.headerWrapper}>
          <div className={styles.header}>
            <div className="badge">
              <i className="bx bxl-youtube" style={{ color: "#ff0000" }} />{" "}
              YouTube JKT48
            </div>
            <h2 className={`sectionTitle textGold ${styles.title}`}>
              Featured Videos
            </h2>
            <p className={styles.subtitle}>
              Ikuti keseruan, vlog, show practice, serta momen terbaik Erine
              JKT48.
            </p>
          </div>

          <div className={styles.navButtons}>
            <button
              className={styles.navBtn}
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
            >
              <i className="bx bx-chevron-left" />
            </button>
            <button
              className={styles.navBtn}
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll right"
            >
              <i className="bx bx-chevron-right" />
            </button>
          </div>
        </div>

        <div className={styles.carouselContainer}>
          {/* Loading state */}
          {loading && (
            <div className={styles.stateWrapper}>
              <div className={styles.loadingSpinner} />
              <p className={styles.stateText}>Memuat video...</p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className={styles.stateWrapper}>
              <i className="bx bx-error-circle" style={{ fontSize: 32, color: "#ff4444" }} />
              <p className={styles.stateText}>{error}</p>
              <button
                className={styles.retryBtn}
                onClick={() => window.location.reload()}
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Video carousel */}
          {!loading && !error && videos.length > 0 && (
            <div className={styles.carouselViewport} ref={viewportRef}>
              <div className={styles.carouselTrack}>
                {videos.map((video) => (
                  <a
                    key={video.id}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`glassCard ${styles.card}`}
                  >
                    <div className={styles.thumbnailWrapper}>
                      <img
                        src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
                        alt={video.title}
                        className={styles.thumbnail}
                        loading="lazy"
                      />
                      <div className={styles.playOverlay}>
                        <div className={styles.playBtnCircle}>
                          <i className="bx bx-play" />
                        </div>
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.metaRow}>
                        <span className={styles.badge}>{video.category}</span>
                        <span className={styles.ytTag}>
                          <i className="bx bxl-youtube" /> YouTube
                        </span>
                      </div>
                      <h3 className={styles.cardTitle}>{video.title}</h3>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && videos.length === 0 && (
            <div className={styles.stateWrapper}>
              <i className="bx bx-video-off" style={{ fontSize: 32 }} />
              <p className={styles.stateText}>Tidak ada video tersedia.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
