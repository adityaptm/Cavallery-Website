import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../page.module.css";

import { query, isMySqlConfigured } from "@/lib/mysql";

interface NewsDetail {
  id: string;
  slug: string;
  title: string;
  label: string;
  description: string;
  content: string;
  image_url: string;
  images: string;
  published_at: string;
}

async function getNewsDetail(slug: string): Promise<NewsDetail | null> {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT * FROM `news` WHERE `slug`=? OR `id`=? LIMIT 1", [slug, slug]);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: String(r.id),
          slug: r.slug || String(r.id),
          title: r.title || "",
          label: r.label || r.category || "Cavallery",
          description: r.description || r.summary || "",
          content: r.content || "",
          image_url: r.image_url || "",
          images: r.images || "",
          published_at: r.published_at ? new Date(r.published_at).toISOString() : new Date().toISOString(),
        };
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(
      `${baseUrl}/api/news/${slug}`,
      {
        cache: "no-store",
        headers: {
          "Accept": "application/json",
        }
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data ?? (json?.id ? json : null);
    if (!data) return null;
    return {
      id: String(data.id),
      slug: data.slug || String(data.id),
      title: data.title || "",
      label: data.label || data.category || "Cavallery",
      description: data.description || data.summary || "",
      content: data.content || "",
      image_url: data.image_url || "",
      images: data.images || "",
      published_at: data.published_at ? new Date(data.published_at).toISOString() : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// Parse "{url1,url2}" → ["url1", "url2"]
function parseImageArray(raw: string): string[] {
  if (!raw) return [];
  return raw
    .replace(/^\{/, "")
    .replace(/\}$/, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Render content dengan \n\n sebagai paragraf terpisah
function renderContent(content: string) {
  return content.split("\n\n").map((para, i) => (
    <p key={i}>{para}</p>
  ));
}

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    if (isMySqlConfigured()) {
      const rows = await query<any[]>("SELECT `id`, `slug` FROM `news`");
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          slug: String(r.slug || r.id),
        }));
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(
      `${baseUrl}/api/news`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );
    if (!res.ok) return [{ slug: "detail" }];
    const json = await res.json();
    const list = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : json?.data?.news || []);
    const slugs = list.map((item: any) => ({
      slug: String(item.slug || item.id),
    }));
    return slugs.length > 0 ? slugs : [{ slug: "detail" }];
  } catch {
    return [{ slug: "detail" }];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const news = await getNewsDetail(slug);
  return {
    title: news?.title ?? "Berita Cavallery",
    description: news?.description ?? "",
  };
}

export default async function CavalleryStatementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const news = await getNewsDetail(slug);

  if (!news) notFound();

  const extraImages = parseImageArray(news.images);

  return (
    <div className={styles.page}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className="badge">
            <i className="bx bx-shield-quarter" /> {news.label}
          </div>
          <h1 className={styles.heroTitle}>
            {news.title.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="textGold">{news.title.split(" ").at(-1)}</span>
          </h1>
          <p className={styles.heroDate}>
            <i className="bx bx-calendar" />{" "}
            {new Date(news.published_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Content */}
      <article className={styles.content}>
        <div className={styles.statementCard}>
          <div className={styles.statementHeader}>
            <i
              className="bx bxs-shield-alt-2"
              style={{ fontSize: "1.4rem", color: "var(--gold)" }}
            />
            <h2 className={styles.statementTitle}>{news.title}</h2>
          </div>

          <div className={styles.statementBody}>
            {renderContent(news.content)}
            <p className={styles.signature}>Cavallery</p>
          </div>
        </div>

        {/* Evidence */}
        {extraImages.length > 0 && (
          <div className={styles.evidenceSection}>
            <h3 className={styles.evidenceTitle}>
              <i className="bx bx-image-alt" /> Bukti Dokumentasi
            </h3>
            <div className={styles.evidenceGrid}>
              {extraImages.map((url, i) => (
  <div key={i} className={styles.evidenceFrame}>
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt={`Bukti dokumentasi ${i + 1}`}
        style={{ width: "100%", height: "auto" }}
        loading="lazy"
      />
    </a>
  </div>
))}
            </div>
          </div>
        )}

        {/* Back */}
        <div className={styles.backWrap}>
          <Link href="/news/cavallery-statement" className={styles.backLink}>
            <i className="bx bx-arrow-back" /> Kembali ke News Cavallery
          </Link>
        </div>
      </article>
    </div>
  );
}
