"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const DEFAULT_IMG =
  "https://res.cloudinary.com/haymzm4wp/image/upload/v1760105848/bi5ej2hgh0cc2uowu5xr.jpg";

function proxyImg(url: string): string {
  if (!url) return DEFAULT_IMG;
  if (!url.includes("jkt48.com")) return url;
  return `https://autumn-limit-898f.aslannarnia806.workers.dev/?url=${encodeURIComponent(url)}`;
}

interface NewsItem {
  id: string;
  slug?: string;
  title: string;
  label: string;
  date: string;
  link_url: string;
  image_url?: string;
  description?: string;
  is_internal?: boolean;
}

type Tab = "all" | "cavallery" | "jkt48";

export default function NewsPage() {
  const [cavNews, setCavNews] = useState<NewsItem[]>([]);
  const [jktNews, setJktNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/news?type=cavallery&v=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ data: { news: [] } })),
      fetch(`/api/news?type=jkt48&v=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => ({ data: { news: [] } })),
    ]).then(([cavData, jktData]) => {
      const mapItem = (n: any, isCav: boolean): NewsItem => ({
        id: String(n.id || Math.random()),
        slug: n.slug || "",
        title: n.title || "",
        label: n.label || n.category || (isCav ? "Statement" : "Official JKT48"),
        date: n.date || n.published_at || new Date().toISOString(),
        link_url: n.link_url || (n.slug ? `/news/cavallery-statement/${encodeURIComponent(n.slug)}` : n.url || "#"),
        image_url: n.image_url || n.background_image || DEFAULT_IMG,
        description: n.description || n.summary || undefined,
        is_internal: isCav,
      });

      setCavNews((cavData?.data?.news ?? []).map((n: any) => mapItem(n, true)));
      setJktNews((jktData?.data?.news ?? []).map((n: any) => mapItem(n, false)));
      setLoading(false);
    });
  }, []);

  const allNews: NewsItem[] = [...cavNews, ...jktNews].sort((a, b) => {
    const timeA = new Date(a.date).getTime() || 0;
    const timeB = new Date(b.date).getTime() || 0;
    return timeB - timeA;
  });

  const displayed = tab === "cavallery" ? cavNews : tab === "jkt48" ? jktNews : allNews;

  const CardImage = ({ item }: { item: NewsItem }) => {
    const [imgError, setImgError] = useState(false);
    const imgSrc = imgError || !item.image_url ? DEFAULT_IMG : proxyImg(item.image_url);
    return (
      <div className={styles.imgWrap}>
        <img
          src={imgSrc}
          alt={item.title}
          loading="lazy"
          onError={() => setImgError(true)}
        />
        <div className={styles.labelBadge}>{item.label || "Statement"}</div>
      </div>
    );
  };

  const cardContent = (item: NewsItem) => (
    <>
      <CardImage item={item} />
      <div className={styles.cardBody}>
        <div className={styles.date}>
          <i className="bx bx-calendar" />
          {new Date(item.date).toLocaleDateString("id-ID", {
            day: "numeric", month: "long", year: "numeric",
          })}
        </div>
        <h2 className={styles.cardTitle}>{item.title}</h2>
        {item.description && <p className={styles.cardDesc}>{item.description}</p>}
        <div className={styles.readMore}>
          Baca Selengkapnya <i className={`bx ${item.is_internal ? "bx-right-arrow-alt" : "bx-link-external"}`} />
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className="badge">
            <i className="bx bx-news" /> Berita Terbaru
          </div>
          <h1 className={styles.heroTitle}>
            News <span className="textGold">JKT48</span>
          </h1>
          <p className={styles.heroSub}>Informasi terkini seputar JKT48 & Cavallery.</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className={styles.tabsWrap}>
        {(["all", "cavallery", "jkt48"] as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tabBtn} ${tab === t ? styles.tabBtnActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "all" ? (
              <><i className="bx bx-globe" /> Semua ({allNews.length})</>
            ) : t === "cavallery" ? (
              <><i className="bx bx-star" /> Cavallery ({cavNews.length})</>
            ) : (
              <><i className="bx bx-news" /> JKT48 ({jktNews.length})</>
            )}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.skeletons}>
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-news" />
            <p>Belum ada berita yang tersedia.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {displayed.map((item, idx) =>
              item.link_url?.startsWith("/") ? (
                <Link
                  key={item.id || String(idx)}
                  href={item.link_url}
                  className={`glassCard ${styles.card}`}
                >
                  {cardContent(item)}
                </Link>
              ) : (
                <a
                  key={item.id || String(idx)}
                  href={item.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className={`glassCard ${styles.card}`}
                >
                  {cardContent(item)}
                </a>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
