"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import styles from "./YoutubeSection.module.css";
import SectionHead from "@/components/chess/SectionHead";
import { useReveal } from "@/hooks/useReveal";

interface YtVideo {
  id: string;
  video_id: string;
  title: string;
  url: string;
  category: string;
  sort_order: string;
  is_active: boolean;
}


const API_URL = "/api/youtube";

export default function YoutubeSection({
  variant = "carousel",
  square = "g7",
}: {
  variant?: "carousel" | "grid";
  square?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement | null>(null);
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
        let videoList: YtVideo[] = [];

        try {
          const res = await fetch(API_URL);
          if (res.ok) {
            const json = await res.json();
            const list = json.data?.videos || (Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []));
            if (Array.isArray(list) && list.length > 0) {
              videoList = list;
            }
          }
        } catch {}

        const activeVideos = videoList
          .filter((v) => v.is_active !== false && (v.is_active as any) !== 0)
          .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

        setVideos(activeVideos);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  useReveal(rootRef, [loading, videos.length]);

  const checkScroll = () => {
    if (viewportRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = viewportRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
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
  }, [videos]);

  const handleScroll = (direction: "left" | "right") => {
    if (viewportRef.current) {
      const scrollAmount = direction === "left" ? -360 : 360;
      viewportRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section ref={rootRef} className={styles.section} id="featured-videos" data-motion>
      <div className={styles.inner}>
        <SectionHead
          square={square}
          eyebrow="YouTube JKT48"
          title="Featured"
          accent="Videos"
          layout="split"
          subtitle="Ikuti keseruan, vlog, show practice, serta momen terbaik Erine JKT48."
          aside={
            variant === "carousel" ? (
              <div className={styles.navButtons}>
                <button
                  className={styles.navBtn}
                  onClick={() => handleScroll("left")}
                  disabled={!canScrollLeft}
                  aria-label="Geser ke kiri"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <path d="M13 8H4M7.5 4l-4 4 4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
                <button
                  className={styles.navBtn}
                  onClick={() => handleScroll("right")}
                  disabled={!canScrollRight}
                  aria-label="Geser ke kanan"
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                    <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
              </div>
            ) : null
          }
        />

        <div className={styles.container}>
          {/* Loading state */}
          {loading && (
            <div className={styles.carouselViewport}>
              <div className={styles.carouselTrack}>
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className={styles.skeletonCard}>
                    <div className={styles.skeletonThumb} />
                    <div className={styles.skeletonBody} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className={styles.stateWrapper}>
              <i className="bx bx-error-circle" style={{ fontSize: 32, color: "#ff8f44" }} />
              <p className={styles.stateText}>{error}</p>
              <button
                className={styles.retryBtn}
                onClick={() => window.location.reload()}
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Video Carousel */}
          {!loading && !error && videos.length > 0 && (
            <div className={styles.carouselViewport} ref={viewportRef}>
              <div className={styles.carouselTrack} data-reveal="stagger">
                {videos.map((video, vIdx) => (
                  <a
                    key={video.id}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.card} cv-flame-hover`}
                    data-reveal-item
                  >
                    <div className={styles.thumbnailWrapper}>
                      <img
                        src={`https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`}
                        alt={video.title}
                        className={styles.thumbnail}
                        loading="lazy"
                      />
                      <span className={styles.frameNo}>{String(vIdx + 1).padStart(2, "0")}</span>
                      <div className={styles.playOverlay}>
                        <div className={styles.playBtnCircle}>
                          <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
                            <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.metaRow}>
                        <span className={styles.badge}>{video.category || "Video"}</span>
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
