import Link from "next/link";
import styles from "../page.module.css";

import { query, isMySqlConfigured } from "@/lib/mysql";

interface NewsItem {
  id: string;
  slug: string;
  title: string;
  label: string;
  description: string;
  image_url: string;
  link_url: string;
  is_internal: boolean;
  published_at: string;
}

async function getCavalleryNews(): Promise<NewsItem[]> {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `news` ORDER BY `published_at` DESC, `id` DESC");
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          id: String(r.id),
          slug: r.slug || String(r.id),
          title: r.title || "",
          label: r.label || r.category || "Cavallery",
          description: r.description || r.summary || "",
          image_url: r.image_url || "",
          link_url: r.link_url || `/news/cavallery-statement/${r.slug || r.id}`,
          is_internal: r.is_internal !== undefined ? Boolean(r.is_internal) : true,
          published_at: r.published_at ? new Date(r.published_at).toISOString() : new Date().toISOString(),
        }));
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(`${baseUrl}/api/news`, {
      cache: "no-store",
      headers: {
        "Accept": "application/json",
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : json?.data?.news || []);
    return list.map((r: any) => ({
      id: String(r.id),
      slug: r.slug || String(r.id),
      title: r.title || "",
      label: r.label || r.category || "Cavallery",
      description: r.description || r.summary || "",
      image_url: r.image_url || "",
      link_url: r.link_url || `/news/cavallery-statement/${r.slug || r.id}`,
      is_internal: r.is_internal !== undefined ? Boolean(r.is_internal) : true,
      published_at: r.published_at ? new Date(r.published_at).toISOString() : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export const metadata = {
  title: "News Cavallery",
  description: "Berita dan pernyataan resmi dari Cavallery, fanbase Erine JKT48.",
};

export default async function CavalleryNewsPage() {
  const news = await getCavalleryNews();

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className="badge">
            <i className="bx bx-shield-quarter" /> Berita Cavallery
          </div>
          <h1 className={styles.heroTitle}>
            News <span className="textGold">Cavallery</span>
          </h1>
          <p className={styles.heroSub}>
            Pernyataan resmi dan berita dari fanbase Cavallery.
          </p>
        </div>
      </div>

      <div className={styles.content}>
        {news.length === 0 ? (
          <div className={styles.empty}>
            <i className="bx bx-news" />
            <p>Belum ada berita yang tersedia.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {news.map((item) => (
              <Link
  key={item.id}
  href={`/news/cavallery-statement/${item.slug}`}  // ← pakai slug
  className={`glassCard ${styles.card}`}
>
                <div className={styles.imgWrap}>
                  <img src={item.image_url} alt={item.title} loading="lazy" />
                  <div className={styles.labelBadge}>{item.label}</div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.date}>
                    <i className="bx bx-calendar" />
                    {new Date(item.published_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <h2 className={styles.cardTitle}>{item.title}</h2>
                  <p className={styles.cardDesc}>{item.description}</p>
                  <div className={styles.readMore}>
                    Baca Selengkapnya <i className="bx bx-right-arrow-alt" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
