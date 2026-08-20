"use client";
import React, { useState, useEffect } from "react";
import styles from "./page.module.css";

interface GalleryItem {
  id: string;
  title: string;
  image_url: string;
  date_label: string;
  alt_text: string;
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json) ? json : (json?.data?.items || json?.data || []);
        if (Array.isArray(list)) setItems(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className="badge">
          <i className="bx bx-image" /> Gallery
        </div>
        <h1 className={styles.heroTitle}>
          Erine <span className="textGold">Gallery</span>
        </h1>
        <p className={styles.heroSub}>
          Kumpulan foto terindah catherina vallencia.
        </p>
      </div>

      {loading ? (
        <div className={styles.loadingWrap}>
          <i className="bx bx-loader-alt bx-spin" />
          <p>Memuat galeri...</p>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <i className="bx bx-image-alt" />
          <p>Belum ada foto tersedia.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <div
              key={item.id}
              className={`${styles.card} glassCard`}
              onClick={() => setSelectedItem(item)}
            >
              <img src={item.image_url} alt={item.alt_text} className={styles.cardImg} />
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardDate}>{item.date_label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedItem && (
        <div className={styles.lightbox} onClick={() => setSelectedItem(null)}>
          <button
            className={styles.lightboxClose}
            onClick={() => setSelectedItem(null)}
          >
            <i className="bx bx-x" />
          </button>
          <img
            src={selectedItem.image_url}
            alt={selectedItem.alt_text}
            className={styles.lightboxImg}
          />
          <div className={styles.lightboxCaption}>
            <h3>{selectedItem.title}</h3>
            <p>{selectedItem.date_label}</p>
          </div>
        </div>
      )}
    </div>
  );
}
