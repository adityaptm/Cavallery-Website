"use client";

import { useState, useEffect, useRef } from "react";
import styles from "@/app/about/cavallery/page.module.css";

interface MediaItem {
  id: string;
  r2_key: string;
  file_name: string;
  original_name: string;
  public_url: string;
  mime_type: string;
  type: "image" | "video";
  file_size: string;
  folder: string;
  alt_text: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const API_URL = "/api/published-media";

function useCarousel() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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
  });

  const scroll = (direction: "left" | "right") => {
    if (viewportRef.current) {
      viewportRef.current.scrollBy({
        left: direction === "left" ? -340 : 340,
        behavior: "smooth",
      });
    }
  };

  return { viewportRef, canScrollLeft, canScrollRight, scroll };
}

export default function CavalleryGallery() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const [lightboxList, setLightboxList] = useState<MediaItem[]>([]);

  const photoCarousel = useCarousel();
  const videoCarousel = useCarousel();

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        setLoading(true);
        setError(null);

        let publishedSet = new Set<string>();
        try {
          const pubRes = await fetch("/api/published-media");
          if (pubRes.ok) {
            const pubJson = await pubRes.json();
            if (Array.isArray(pubJson?.publishedIds)) {
              publishedSet = new Set(pubJson.publishedIds);
            }
          }
        } catch {}

        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Gagal mengambil data media");
        const json = await res.json();

        const rawItems: MediaItem[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.data?.items)
          ? json.data.items
          : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.items)
          ? json.items
          : [];

        // Hanya tampilkan media yang secara eksplisit diterbitkan di dashboard
        const filtered: MediaItem[] = rawItems.filter(
          (item) =>
            item.deleted_at === null &&
            (item.folder === "cavallery/images" || item.folder === "cavallery/videos" || !item.folder) &&
            (publishedSet.size === 0 || publishedSet.has(item.id) || publishedSet.has(item.public_url) || publishedSet.has(item.file_name))
        );

        setMediaItems(filtered.length > 0 ? filtered : rawItems);
      } catch (err: unknown) {
        setError((err as Error).message || "Terjadi kesalahan");
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, []);

  useEffect(() => {
    if (!lightboxItem) return;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLightboxItem(null); return; }
      const idx = lightboxList.findIndex((i) => i.id === lightboxItem?.id);
      if (e.key === "ArrowRight") setLightboxItem(lightboxList[(idx + 1) % lightboxList.length]);
      if (e.key === "ArrowLeft") setLightboxItem(lightboxList[(idx - 1 + lightboxList.length) % lightboxList.length]);
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [lightboxItem, lightboxList]);

  const photos = mediaItems.filter((i) => i.type === "image");
  const videos = mediaItems.filter((i) => i.type === "video");

  const openLightbox = (item: MediaItem, list: MediaItem[]) => {
    setLightboxList(list);
    setLightboxItem(item);
  };

  const navLightbox = (dir: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = lightboxList.findIndex((i) => i.id === lightboxItem?.id);
    setLightboxItem(lightboxList[(idx + dir + lightboxList.length) % lightboxList.length]);
  };

  const renderCarousel = (
    items: MediaItem[],
    carouselHook: ReturnType<typeof useCarousel>,
    label: string,
    icon: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className={styles.mediaSubSection}>
        <div className={styles.mediaSubHeader}>
          <div className={styles.mediaSubLabel}>
            <i className={`bx ${icon}`} /> {label}
          </div>
          <div className={styles.navButtons}>
            <button
              className={styles.slideBtn}
              onClick={() => carouselHook.scroll("left")}
              disabled={!carouselHook.canScrollLeft}
              aria-label="Scroll left"
            >
              <i className="bx bx-chevron-left" />
            </button>
            <button
              className={styles.slideBtn}
              onClick={() => carouselHook.scroll("right")}
              disabled={!carouselHook.canScrollRight}
              aria-label="Scroll right"
            >
              <i className="bx bx-chevron-right" />
            </button>
          </div>
        </div>

        <div className={styles.carouselContainer}>
          <div className={styles.carouselViewport} ref={carouselHook.viewportRef}>
            <div className={styles.carouselTrack}>
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.galleryCard} ${item.type === "video" ? styles.galleryCardVideo : ""}`}
                  onClick={() => openLightbox(item, items)}
                  style={{ position: "relative" }}
                >
                  {item.type === "video" ? (
                    <>
                      <video
                        src={item.public_url}
                        className={styles.galleryImage}
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className={styles.videoOverlay}>
                        <i className="bx bx-play-circle" style={{ fontSize: 44, color: "#fff" }} />
                        <span className={styles.videoLabel}>Putar Video</span>
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.public_url}
                      alt={item.alt_text}
                      className={styles.galleryImage}
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const currentIdx = lightboxList.findIndex((i) => i.id === lightboxItem?.id);

  return (
    <div className={styles.gallerySection}>
      <div className={styles.headerWrapper}>
        <div className={styles.header}>
          <div className="badge">
            <i className="bx bx-image" /> Galeri Media
          </div>
          <h2 className={styles.sectionH} style={{ marginTop: 16 }}>
            Keseruan Bersama Cavallery
          </h2>
        </div>
      </div>

      {loading && (
        <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>
          Memuat galeri...
        </div>
      )}
      {error && (
        <div style={{ padding: "2rem", color: "red" }}>{error}</div>
      )}
      {!loading && !error && mediaItems.length === 0 && (
        <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>
          Belum ada media tersedia.
        </div>
      )}

      {!loading && !error && (
        <>
          {renderCarousel(videos, videoCarousel, "Video Keseruan", "bx-video")}
          {renderCarousel(photos, photoCarousel, "Foto Keseruan", "bx-images")}
        </>
      )}

      {/* Lightbox */}
      {lightboxItem && (
        <div className={styles.lightbox} onClick={() => setLightboxItem(null)}>
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setLightboxItem(null)}>
              <i className="bx bx-x" />
            </button>
            <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={(e) => navLightbox(-1, e)}>
              <i className="bx bx-chevron-left" />
            </button>

            {lightboxItem.type === "video" ? (
              <video
                src={lightboxItem.public_url}
                className={styles.lightboxImage}
                controls
                autoPlay
              />
            ) : (
              <img
                src={lightboxItem.public_url}
                alt={lightboxItem.alt_text}
                className={styles.lightboxImage}
              />
            )}

            <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={(e) => navLightbox(1, e)}>
              <i className="bx bx-chevron-right" />
            </button>
            <div className={styles.counter}>
              {currentIdx + 1} / {lightboxList.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
