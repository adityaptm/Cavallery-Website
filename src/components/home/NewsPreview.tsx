/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./NewsPreview.module.css";
import SectionHead from "@/components/chess/SectionHead";
import { useReveal } from "@/hooks/useReveal";

interface NewsItem {
  id: string;
  slug: string;
  title: string;
  label: string;
  description?: string;
  date?: string;
  published_at: string;
  link_url: string;
  url?: string;
  image_url?: string | null;
  is_internal: boolean;
  is_pinned: boolean;
  is_active: boolean;
}

const API_URL = "/api/news";

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Resolve URL: internal pakai Link, eksternal pakai <a>
function hrefOf(item: NewsItem) {
  const target = item.link_url || item.url || (item.slug ? `/news/cavallery-statement/${encodeURIComponent(item.slug)}` : `/news/cavallery-statement/${item.id}`);
  if (!target) return "/news";
  if (item.is_internal) {
    return target.startsWith("/") ? target : `/${target}`;
  }
  return target;
}

function ItemLink({
  item,
  className,
  children,
}: {
  item: NewsItem;
  className: string;
  children: React.ReactNode;
}) {
  const href = hrefOf(item);
  const isInternal = item.is_internal !== false && !href.startsWith("http");
  return isInternal ? (
    <Link href={href} className={className} data-reveal-item>
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className={className} data-reveal-item>
      {children}
    </a>
  );
}

export default function NewsPreview() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    fetch(`${API_URL}?type=cavallery&_t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const list = d?.data?.news || (Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []));
        if (Array.isArray(list) && list.length > 0) {
          const items: NewsItem[] = list
            .filter((n: any) => n.is_active !== false)
            .sort((a: any, b: any) => {
              if (Boolean(b.is_pinned) !== Boolean(a.is_pinned)) {
                return Number(b.is_pinned || 0) - Number(a.is_pinned || 0);
              }
              const dateB = new Date(b.date || b.published_at || 0).getTime();
              const dateA = new Date(a.date || a.published_at || 0).getTime();
              return dateB - dateA;
            })
            .slice(0, 4);
          setNews(items);
        } else {
          setNews([]);
        }
      })
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, []);

  useReveal(rootRef, [loading, news.length]);

  const [lead, ...rest] = news;

  return (
    <section ref={rootRef} className={styles.section} id="news-updates" data-motion>
      <SectionHead
        square="h5"
        eyebrow="Cavallery Statement"
        title="News &"
        accent="Updates"
        layout="split"
        subtitle="Pernyataan resmi, pengumuman proyek, dan informasi terkini dari fanbase Cavallery."
        aside={
          <Link href="/news" className={styles.all} data-reveal="fade">
            Lihat Semua Berita
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </Link>
        }
      />

      {loading ? (
        <div className={styles.loadWrap} aria-hidden="true">
          <div className={`${styles.skeleton} ${styles.skeletonLead}`} />
          <div className={styles.skeletonList}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        </div>
      ) : news.length === 0 ? (
        <div className={styles.empty}>
          <i className="bx bx-news" />
          <p>Berita tidak tersedia saat ini.</p>
        </div>
      ) : (
        <div className={styles.layout} data-reveal="stagger">
          {lead && (
            <ItemLink item={lead} className={styles.lead}>
              <span className={styles.leadMedia}>
                <img
                  src={lead.image_url || "/images/cava-logo.jpg"}
                  alt={lead.title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.includes("/images/cava-logo.jpg")) {
                      img.src = "/images/cava-logo.jpg";
                    }
                  }}
                />
                <span className={styles.leadSq}>Terbaru</span>
              </span>
              <span className={styles.leadBody}>
                <span className={styles.labelRow}>
                  <span className={styles.label}>{lead.label || "Statement"}</span>
                  {lead.is_pinned && <span className={styles.pinned}>Pinned</span>}
                  <span className={styles.date}>{formatDate(lead.published_at || lead.date)}</span>
                </span>
                <span className={styles.leadTitle}>{lead.title}</span>
                {lead.description && <span className={styles.desc}>{lead.description}</span>}
              </span>
            </ItemLink>
          )}

          {rest.length > 0 && (
            <div className={styles.list}>
              {rest.map((item, idx) => (
                <ItemLink key={item.id ?? idx} item={item} className={styles.row}>
                  <span className={styles.rowIndex}>{String(idx + 2).padStart(2, "0")}</span>
                  <span className={styles.rowBody}>
                    <span className={styles.labelRow}>
                      <span className={styles.label}>{item.label || "Statement"}</span>
                      {item.is_pinned && <span className={styles.pinned}>Pinned</span>}
                    </span>
                    <span className={styles.rowTitle}>{item.title}</span>
                    <span className={styles.date}>{formatDate(item.published_at || item.date)}</span>
                  </span>
                  <span className={styles.rowThumb}>
                    <img
                      src={item.image_url || "/images/cava-logo.jpg"}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (!img.src.includes("/images/cava-logo.jpg")) {
                          img.src = "/images/cava-logo.jpg";
                        }
                      }}
                    />
                  </span>
                </ItemLink>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
