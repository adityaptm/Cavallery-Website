import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../page.module.css";
import { query, isMySqlConfigured } from "@/lib/mysql";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface NewsDetail {
  id: string;
  slug: string;
  title: string;
  label: string;
  description: string;
  content: string;
  image_url: string;
  images: string;
  author?: string;
  published_at: string;
}

async function getNewsDetail(slug: string): Promise<NewsDetail | null> {
  try {
    const cleanSlug = decodeURIComponent(slug).trim();
    if (isMySqlConfigured()) {
      const rows = await query<any[]>(
        "SELECT * FROM `news` WHERE LOWER(`slug`)=LOWER(?) OR `slug`=? OR `id`=? LIMIT 1",
        [cleanSlug, cleanSlug, cleanSlug]
      );
      if (rows && rows.length > 0) {
        const r = rows[0];
        return {
          id: String(r.id),
          slug: r.slug || `statement-${r.id}`,
          title: r.title || "",
          label: r.category || r.label || "Statement",
          description: r.summary || r.description || "",
          content: r.content || r.description || r.summary || "",
          image_url: r.image_url || "/images/cava-logo.jpg",
          images: r.images || "",
          author: r.author || "Cavallery Staff",
          published_at: r.published_at
            ? new Date(r.published_at).toISOString()
            : new Date().toISOString(),
        };
      }
    }

    const res = await fetch(
      `https://v5.jkt48connect.com/api/cavallery/news/${slug}?apikey=JKTCONNECT`,
      {
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(5000),
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CavalleryApp/1.0",
        },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

// Parse "{url1,url2}" or "url1, url2" or JSON array → ["url1", "url2"]
function parseImageArray(raw: string): string[] {
  if (!raw) return [];
  try {
    if (raw.startsWith("[")) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    }
  } catch {}

  return raw
    .replace(/^\{/, "")
    .replace(/\}$/, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Render content dengan multi-paragraph handling yang rapi
function renderParagraphs(content: string) {
  if (!content) return <p>Tidak ada konten yang tersedia.</p>;

  // Split by double newline or single newline
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return <p>{content}</p>;
  }

  return paragraphs.map((para, i) => {
    // If paragraph contains single newlines within itself, render with line breaks
    const lines = para.split("\n");
    return (
      <p key={i}>
        {lines.map((line, lineIdx) => (
          <span key={lineIdx}>
            {line}
            {lineIdx < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const news = await getNewsDetail(slug);
  if (!news) return { title: "Berita Tidak Ditemukan — Cavallery" };
  return {
    title: `${news.title} — Cavallery Statement`,
    description: news.description || news.content?.slice(0, 160),
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const news = await getNewsDetail(slug);

  if (!news) notFound();

  const galleryImages = parseImageArray(news.images);

  const formattedDate = new Date(news.published_at).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className={styles.page}>
      <article className={styles.detailContainer}>
        {/* Back button */}
        <Link href="/news" className={styles.backBtn}>
          <i className="bx bx-arrow-back" /> Kembali ke News
        </Link>

        {/* Header Section */}
        <header className={styles.articleHeader}>
          <div className={styles.badgeWrap}>
            <span className={styles.labelBadge}>
              <i className="bx bx-file-blank" /> {news.label || "Cavallery Statement"}
            </span>
          </div>

          <h1 className={styles.detailTitle}>{news.title}</h1>

          {/* Meta Author / Date Bar */}
          <div className={styles.metaBar}>
            <div className={styles.metaAuthor}>
              <img
                src="/images/cava-logo.jpg"
                alt="Cavallery"
                className={styles.authorAvatar}
              />
              <div className={styles.authorInfo}>
                <span className={styles.authorName}>
                  {news.author || "Cavallery Staff"}
                </span>
                <span className={styles.authorRole}>Official Fanbase Erine JKT48</span>
              </div>
            </div>

            <div className={styles.metaDate}>
              <i className="bx bx-calendar-event" style={{ color: "var(--gold)" }} />
              <time dateTime={news.published_at}>{formattedDate}</time>
            </div>
          </div>
        </header>

        {/* Featured Main Image */}
        {news.image_url && (
          <div className={styles.detailMainImg}>
            <img
              src={news.image_url}
              alt={news.title}
              loading="eager"
            />
          </div>
        )}

        {/* Article Body Content */}
        <section className={styles.detailContent}>
          <div className={styles.contentBody}>
            {renderParagraphs(news.content)}
          </div>

          {/* Signature & Official Stamp */}
          <footer className={styles.signatureBox}>
            <div className={styles.signatureText}>
              <span className={styles.sigSalute}>Hormat Kami,</span>
              <span className={styles.sigName}>Cavallery</span>
              <span className={styles.sigOrg}>
                Official Fanbase of Catherina Vallencia (Erine JKT48)
              </span>
            </div>
            <div className={styles.officialStamp}>
              <i className="bx bx-check-shield" /> Official Statement
            </div>
          </footer>
        </section>

        {/* Image Gallery / Lampiran jika ada */}
        {galleryImages.length > 0 && (
          <section className={styles.detailGallery}>
            <h2 className={styles.galleryTitle}>
              <i className="bx bx-images" /> Dokumentasi & Lampiran
            </h2>
            <div className={styles.detailGalleryGrid}>
              {galleryImages.map((url, i) => (
                <div key={i} className={styles.galleryImgWrap}>
                  <img
                    src={url}
                    alt={`Dokumentasi ${i + 1}`}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
