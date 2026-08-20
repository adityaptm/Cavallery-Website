/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import styles from "./AboutErineSection.module.css";

function parseSongs(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return raw
    .replace(/^\{/, "").replace(/\}$/, "")
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((s) => s.replace(/^"|"$/g, "").trim())
    .filter(Boolean);
}

function calculateAge() {
  const birthDate = new Date("2007-08-21");
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}


interface SetlistData {
  title: string;
  date: string;
  badge: string;
  img: string;
  songs: string[];
}

function FlipCard({ set, idx }: { set: SetlistData; idx: number }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={styles.stickyCard}
      onClick={() => setIsFlipped(!isFlipped)}
      style={{ zIndex: isFlipped ? 10 : 1 }}
    >
      <motion.div
        className={styles.flipInner}
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className={styles.flipFront}>
          <div className={styles.tapeStrip} />
          <div className={styles.polaroidFrame}>
            <img src={set.img} alt={set.title} />
          </div>
          <div className={styles.cardTitle}>{set.title}</div>
          <div className={styles.cardDates}>{set.date}</div>
          <span className={styles.showBadge}>{set.badge}</span>
        </div>

        <div className={styles.flipBack}>
          <div className={styles.tapeStrip} style={{ top: "-15px" }} />
          <div className={styles.cardTitle} style={{ marginBottom: "15px", fontSize: "1.2rem" }}>
            Unit Songs
          </div>
          <ul className={styles.unitSongs}>
            {set.songs.map((song: string, i: number) => (
              <li key={song} className={styles.songRow}>
                <span className={styles.songNum}>{i + 1}.</span> {song}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

export default function AboutErineSection() {
  const age = calculateAge();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPlayingJiko, setIsPlayingJiko] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ image: "", date: "", desc: "" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pmStats, setPmStats] = useState<any>(null);
  const [pmLoading, setPmLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [setlists, setSetlists] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [statsData, setStatsData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updates, setUpdates] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [slides, setSlides] = useState<string[]>([]);

  useEffect(() => {
    // Fetch slides from API
    fetch("/api/about-erine")
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && json.data) {
          setSlides(json.data);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const slideTimer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 8000);

    return () => clearInterval(slideTimer);
  }, [slides]);

  useEffect(() => {
    fetch("/api/pm-statistik")
      .then((r) => r.json())
      .then((json) => { if (json.success) setPmStats(json.data); })
      .catch(() => {})
      .finally(() => setPmLoading(false));

    fetch("/api/setlists")
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        setSetlists(data);
      })
      .catch(console.error);

    fetch("/api/stats")
      .then((r) => r.json())
      .then((json) => {
        const data = Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
        setStatsData(data);
      })
      .catch(console.error);

    fetch("/api/updates")
      .then((r) => r.json())
      .then((json) => { if (json?.success) setUpdates(json.data); })
      .catch(console.error);

    const twScript = document.createElement("script");
    twScript.src = "https://platform.twitter.com/widgets.js";
    twScript.async = true;
    document.body.appendChild(twScript);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (updates.length > 0) {
      if (typeof window !== "undefined") {
        if ((window as any).twttr) {
          (window as any).twttr.widgets.load();
        }
        
        // Delay to ensure React has rendered the blockquotes into the DOM
        const timer = setTimeout(() => {
          // Remove old tiktok script to force full re-init
          const oldScript = document.getElementById("tiktok-embed-script");
          if (oldScript) oldScript.remove();
          
          // Also remove TikTok's internal state so it re-processes blockquotes
          delete (window as any).__tiktokEmbed;
          
          const tkScript = document.createElement("script");
          tkScript.id = "tiktok-embed-script";
          tkScript.src = "https://www.tiktok.com/embed.js";
          tkScript.async = true;
          document.body.appendChild(tkScript);
        }, 500);
        
        return () => clearTimeout(timer);
      }
    }
  }, [updates]);

  const toggleJiko = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/audio/jikorine1.mp4");
      audioRef.current.onended = () => setIsPlayingJiko(false);
    }
    if (audioRef.current.paused) {
      audioRef.current.play().catch((e) => { console.error("Audio error:", e); setIsPlayingJiko(false); });
      setIsPlayingJiko(true);
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingJiko(false);
    }
  };

  const openModal = (image: string, date: string, desc: string) => {
    setModalData({ image, date, desc });
    setIsModalOpen(true);
  };

  return (
    <section className={styles.wrapper}>
      {/* 1. Wiki Style Profile Card */}
      <div className={`glassCard ${styles.profileContainer}`}>
        <div className={styles.leftCol}>
          <div className={styles.headerSection}>
            <div className={styles.titleBox}>
              <h1 className={styles.wikiName}>Erine</h1>
              <a
               href="https://www.idn.app/jkt48_erine"
  target="_blank"
  rel="noopener noreferrer"
  className={styles.followBtn}
>
  &#43; Follow
</a>
            </div>
            <span className={styles.jpName}>Japan : エリーヌ</span>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.bioTable}>
              <tbody>
                <tr>
                  <td className={styles.labelCell}>Nama Asli</td>
                  <td className={styles.valueCell}>Catherina Vallencia Kurniawan</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>Nama Panggilan</td>
                  <td className={styles.valueCell}>Erine</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>Tanggal Lahir</td>
                  <td className={styles.valueCell}>
                    21 Agustus 2007{" "}
                    <span className={styles.ageDim}>(Usia {age})</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>Kota Asal</td>
                  <td className={styles.valueCell}>
                    <div className={styles.hometownContainer}>
                      <span>Bekasi, Jawa Barat, Indonesia</span>
                      <div className={styles.mapIcon}>
                        <img src="/images/bekasi.png" alt="Bekasi" />
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>Golongan Darah</td>
                  <td className={styles.valueCell}>B</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>Zodiak</td>
                  <td className={styles.valueCell}>♌︎ Leo</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>Tinggi Badan</td>
                  <td className={styles.valueCell}>162 cm</td>
                </tr>
                <tr>
                  <td className={styles.labelCell}>Tim</td>
                  <td className={styles.valueCell}>Passion</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.jikoBar}>
            <div className={styles.jikoLeft}>
              <div className={styles.jikoLabel}>Jikoshoukai</div>
              <button className={styles.audioBtn} onClick={toggleJiko}>
                <i className={`bx ${isPlayingJiko ? "bx-pause" : "bx-play"}`} />
              </button>
            </div>
            <div className={styles.jikoQuoteBox}>
              Hadir dengan seribu kejutan,
              <br />
              <span className={styles.checkmateAnim}>Checkmate!</span>
              <br />
              Siap memenangkan hatimu.
            </div>
          </div>

          <div className={styles.socialSection} id="sosmed">
            <div className={styles.socialTitle}>{"Erine's Social Media"}</div>
            <div className={styles.socialIcons}>
              <a href="https://x.com/CErine_JKT48" target="_blank" rel="noopener noreferrer" className={styles.socIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/jkt48.erine/" target="_blank" rel="noopener noreferrer" className={styles.socIcon}>
                <i className="bx bxl-instagram" />
              </a>
              <a href="https://www.threads.com/@jkt48.erine" target="_blank" rel="noopener noreferrer" className={styles.socIcon}>
                <i className="bx bxl-facebook-circle" />
              </a>
              <a href="https://www.tiktok.com/@jkt48.erine_" target="_blank" rel="noopener noreferrer" className={styles.socIcon}>
                <i className="bx bxl-tiktok" />
              </a>
              <a href="https://www.showroom-live.com/r/JKT48_Erine" target="_blank" rel="noopener noreferrer" className={styles.socIcon}>
                <img src="/images/showroom.png" alt="Showroom" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              </a>
              <a href="https://www.idn.app/jkt48_erine" target="_blank" rel="noopener noreferrer" className={styles.socIcon}>
                <img src="/images/idn.png" alt="IDN" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              </a>
            </div>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.mainPhotoFrame}>
            {slides.map((src, idx) => (
              <img
                key={src}
                src={src}
                className={`${styles.mainPhoto} ${idx === activeSlide ? styles.active : ""}`}
                alt="Erine"
              />
            ))}
          </div>
          <div className={styles.galleryStrip}>
            <div className={styles.thumbsGrid}>
              {slides.slice(1, 4).map((src) => (
                <div key={src} className={`glassCard ${styles.thumbItem}`}>
                  <img src={src} alt="Thumb" />
                </div>
              ))}
            </div>
            <div className={styles.galleryLink}>
              See{" "}
              <a href="/gallery"><strong>gallerine</strong></a>{" "}
              for more!
            </div>
          </div>
        </div>
      </div>

      {/* 2. Intro & Hashtags Section */}
      <div className={styles.ewContainer}>
        <div className={styles.ewIntro}>
          <h3>Introduction</h3>
          <p>
            Erine adalah member JKT48 generasi ke-12. Erine dikenal sebagai
            {" "}&quot;Putri Bebek&quot; oleh fans karena kepribadiannya yang unik dan menggemaskan.
          </p>
        </div>

        <div className={styles.ewSplit}>
          <div className={styles.ewBio}>
            <table>
              <tbody>
                <tr><td className={styles.lbl}>Debut</td><td>18 November 2023</td></tr>
                <tr><td className={styles.lbl}>Tahun Aktif</td><td>Member JKT48 Gen 12</td></tr>
                <tr>
                  <td className={styles.lbl}>Member Favorit</td>
                  <td>
                    <a href="https://x.com/I_KathrinaJKT48" target="_blank" rel="noopener noreferrer">
                      Kathrina Irene
                    </a>
                  </td>
                </tr>
                <tr><td className={styles.lbl}>MBTI</td><td>ISFP / INFP</td></tr>
                <tr><td className={styles.lbl}>Shio</td><td>Babi</td></tr>
                <tr><td className={styles.lbl}>Hobi</td><td>Bermain Piano, Menari</td></tr>
                <tr><td className={styles.lbl}>Angka Favorit</td><td>7</td></tr>
                <tr><td className={styles.lbl}>Warna Favorit</td><td>Pink, Blue, Tosca</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.ewHt}>
            <p className={styles.ewHtTitle}># Official Hashtags</p>
            <ul>
              <li>
                <span className={styles.lbl2}>Setiap Hari Jumat</span>
                <span className={styles.tag}>#DiesVenErine</span>
              </li>
              <li><span className={styles.lbl2}>Setiap Jurnal</span><span className={styles.tag}>#MemoRine</span></li>
              <li><span className={styles.lbl2}>Setiap Sahur</span><span className={styles.tag}>#SahuRine</span></li>
              <li><span className={styles.lbl2}>Sebelum Berbuka</span><span className={styles.tag}>#Ngabuburine</span></li>
              <li><span className={styles.lbl2}>Setiap Berbuka</span><span className={styles.tag}>#BukbeRine</span></li>
              <li><span className={styles.lbl2}>Setiap Game</span><span className={styles.tag}>#GameRine</span></li>
            </ul>
            <div className={styles.ewPm}>
              <img src="/images/pm.png" alt="PM" />
              <span className={styles.tag}>#NgabaRine</span>
            </div>
          </div>
        </div>

        <div className={styles.ewFf}>
          <h3>Funfact Erine</h3>
          <ol>
            <li>Penampilan pertamanya sebagai penari latar di JKT48 Stage ke-5 untuk lagu Glory Days adalah pada tanggal 1 Februari 2025.</li>
            <li>Suka aespa, terutama member bernama Ningning.</li>
            <li>Cita-cita pengen bawa bendera saat upacara.</li>
            <li>Erine Waktu SMA ada dijurusan IPS.</li>
            <li>Bisa memainkan Kalimba.</li>
            <li>Mata sehat, tidak silinder atau minus.</li>
            <li>Mendaftar JKT48 di hari terakhir pendaftaran.</li>
            <li>Tidak bisa maen catur, &quot;Checkmate&quot; cuman spontan kepikiran.</li>
          </ol>
        </div>
      </div>

      {/* 3. Showcase Section */}
      <div className={styles.showcaseContainer}>
        <div className={styles.videoDebut}>
          <div className={styles.nailedFrame} />
          <h3 className={styles.erineTitle}>{"Erine's Video Debut"}</h3>
          <div className={styles.videoFrameWrapper}>
            <div className={styles.responsiveVideo}>
              <iframe src="https://www.youtube.com/embed/Obxn7knXq38" title="Debut" allowFullScreen />
            </div>
          </div>
        </div>

        <div className={styles.nailedFrame} />
        <h3 className={styles.erineTitle}>{"Erine's Kabesha"}</h3>
        <div className={styles.galleryGrid}>
          {[
            { img: "/images/trainee.jpg", year: "2023", title: "First Kabesha", desc: "Bergabung dengan JKT48 sebagai Trainee di Jak Japan Matsuri." },
            { img: "/images/regular.webp", year: "2026", title: "Regular Member", desc: "Dipromosikan menjadi Member reguler JKT48." },
            { img: "/images/erine-passion.webp", year: "2026", title: "Team Passion", desc: "Dipromosikan menjadi Member Passion JKT48." },
          ].map((item) => (
            <div
              key={`${item.year}-${item.title}`}
              className={styles.frameCard}
              onClick={() => openModal(item.img, item.year, item.desc)}
            >
              <div className={styles.imageContainer}>
                <img src={item.img} alt={item.year} />
              </div>
              <div className={styles.captionBox}>
                <span className={styles.captionYear}>{item.year}</span>
                {item.title}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.electionSection}>
          <div className={styles.nailedFrame} />
          <h3 className={styles.erineTitle}>7th JKT48 Senbatsu Election</h3>
          <div className={styles.frameCardWide}>
            <div className={styles.responsiveVideo}>
              <iframe src="https://www.youtube.com/embed/XbAqE7iBJAw" title="SSK" allowFullScreen />
            </div>
            <div className={styles.electionGrid}>
              <div
                className={styles.electionItem}
                onClick={() => openModal("/images/chapter.jpg", "Campaign 2024", "Erine mengusung Project SSK dengan #Dongeng & #Chapter.")}
              >
                <div className={styles.electionImg}><img src="/images/chapter.jpg" alt="Poster" /></div>
                <div className={styles.captionBox}>{"Poster Erine's Sousenkyo"}</div>
              </div>
              <div
                className={styles.electionItem}
                onClick={() => openModal("https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg", "Result Rank #18", "Erine berhasil mendapatkan posisi ke 18.")}
              >
                <div className={styles.electionImg}>
                  <img src="https://cava.jkt48connect.com/IMG-20260525-WA0211.jpg" alt="Rank" />
                </div>
                <div className={styles.captionBox}>Erine di posisi #18 (Undergirls)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Journal & Stats Section */}
      <div className={styles.journalWrapper}>
        <div className={styles.statsBoard}>
          <div className={styles.pinTack} />
          <div className={styles.statsGrid}>
            {statsData.length === 0 ? (
              <div style={{ color: "var(--gold)", padding: "1rem" }}>
                <i className="bx bx-loader-alt bx-spin" /> Memuat statistik...
              </div>
            ) : (
              statsData.map((s) => (
                <div key={s.id} className={styles.statItem}>
                  <div className={styles.statIcon}>
                    <i className={`bx ${s.icon}`} />
                  </div>
                  <div className={styles.statNumber}>{s.value}</div>
                  <div className={styles.statLabel}>{s.label}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.cardsGrid}>
          {setlists.length === 0 ? (
            <div style={{ color: "var(--gold)", padding: "1rem" }}>
              <i className="bx bx-loader-alt bx-spin" /> Memuat setlist...
            </div>
          ) : (
            setlists.map((set, idx) => (
              <FlipCard
                key={set.id || idx}
                set={{
                  title: set.title,
                  date: set.date_range || set.release_date || "",
                  badge: set.badge || set.status || "",
                  img: set.image_url || set.cover_image || "",
                  songs: parseSongs(set.songs || set.songs_json),
                }}
                idx={idx}
              />
            ))
          )}
        </div>
      </div>

      {/* 4.5 PM Weekly Stats */}
      <div className={styles.pmStatsSection}>
        <div className={styles.nailedFrame} />
        <h3 className={styles.erineTitle}>Statistik PM Mingguan</h3>
        {pmLoading ? (
          <div className={styles.pmLoading}>
            <i className="bx bx-loader-alt bx-spin" /> Memuat data...
          </div>
        ) : pmStats ? (
          <div className={styles.pmStatsCard}>
            <div className={styles.pmCardHeader}>
              <img src={pmStats.profile_image} alt={pmStats.member_name} className={styles.pmAvatar} />
              <div className={styles.pmHeaderInfo}>
                <span className={styles.pmName}>{pmStats.member_name}</span>
                <span className={styles.pmId}>{pmStats.idol_id}</span>
                <div className={styles.pmBadges}>
                  {pmStats.is_active && <span className={styles.badgeActive}>● Aktif</span>}
                  {pmStats.is_popular && <span className={styles.badgePopular}>★ Popular</span>}
                </div>
              </div>
            </div>
            <div className={styles.pmStatsGrid}>
              <div className={styles.pmStatBox}>
                <i className="bx bx-medal" />
                <span className={styles.pmStatVal}>#{pmStats.current_rank}</span>
                <span className={styles.pmStatLbl}>Rank Saat Ini</span>
              </div>
              <div className={styles.pmStatBox}>
                <i className="bx bx-message-dots" />
                <span className={styles.pmStatVal}>{pmStats.messages_per_week}</span>
                <span className={styles.pmStatLbl}>Pesan / Minggu</span>
              </div>
              <div className={styles.pmStatBox}>
                <i className="bx bx-group" />
                <span className={styles.pmStatVal}>{pmStats.group_name}</span>
                <span className={styles.pmStatLbl}>Grup</span>
              </div>
            </div>
            <div className={styles.pmBarWrapper}>
              <div className={styles.pmBarLabel}>
                <span>Aktivitas Mingguan</span>
                <span>{pmStats.messages_per_week} pesan</span>
              </div>
              <div className={styles.pmBarTrack}>
                <div
                  className={styles.pmBarFill}
                  style={{ width: `${Math.min((parseInt(pmStats.messages_per_week) / 100) * 100, 100)}%` }}
                />
              </div>
              <div className={styles.pmBarHint}>Skala: 0 – 100 pesan/minggu</div>
            </div>
          </div>
        ) : (
          <p className={styles.pmError}>Data statistik tidak tersedia.</p>
        )}
      </div>

      {/* 5. Social Media Embeds */}
      <div className={styles.embedsSection}>
        <div className={styles.nailedFrame} />
        <h3 className={styles.erineTitle}>Latest Updates</h3>
        {updates.length === 0 ? (
          <div style={{ color: "var(--gold)", padding: "1rem", textAlign: "center" }}>
            <i className="bx bx-loader-alt bx-spin" /> Memuat updates...
          </div>
        ) : (
          <div className={styles.embedsGrid}>
            {updates.map((update) => {
              if (update.platform === "twitter") {
                return (
                  <div key={update.id} className={styles.embedCard}>
                    <blockquote className="twitter-tweet" data-theme="dark">
                      <a href={update.url}></a>
                    </blockquote>
                  </div>
                );
              }
              if (update.platform === "tiktok") {
                // Extract video ID from URL like https://www.tiktok.com/@user/video/123456
                const urlParts = update.url.split("/");
                const videoId = urlParts[urlParts.length - 1].split("?")[0];
                const username = urlParts.find((p: string) => p.startsWith("@")) || "@jkt48.erine_";
                const isNumericId = /^\d+$/.test(videoId);

                return (
                  <div key={update.id} className={styles.embedCard}>
                    <blockquote
                      className="tiktok-embed"
                      cite={update.url}
                      data-video-id={isNumericId ? videoId : undefined}
                      style={{ maxWidth: 605, minWidth: 325 }}
                    >
                      <section>
                        <a
                          target="_blank"
                          title={username}
                          href={`https://www.tiktok.com/${username}?refer=embed`}
                          rel="noopener noreferrer"
                        >
                          {username}
                        </a>
                      </section>
                    </blockquote>
                  </div>
                );
              }
              if (update.platform === "instagram") {
                // URL should be the base URL without trailing slash, e.g. https://www.instagram.com/p/DXt1vRJEpuf
                const igUrl = update.url.endsWith("/") ? update.url : `${update.url}/`;
                return (
                  <div key={update.id} className={styles.embedCard}>
                    <iframe
                      src={`${igUrl}embed`}
                      width="100%"
                      height="480"
                      frameBorder="0"
                      scrolling="no"
                    />
                  </div>
                );
              }
              if (update.platform === "threads") {
                // URL e.g. https://www.threads.net/@jkt48.erine/post/DXt1wb4EjK2
                const threadsUrl = update.url.endsWith("/") ? update.url : `${update.url}/`;
                return (
                  <div key={update.id} className={styles.embedCard}>
                    <iframe
                      src={`${threadsUrl}embed`}
                      width="100%"
                      height="480"
                      frameBorder="0"
                      scrolling="no"
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className={`${styles.modalOverlay} ${styles.active}`}
          onClick={() => setIsModalOpen(false)}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
              &times;
            </button>
            <div className={styles.modalImgWrapper}>
              <img src={modalData.image} alt="Detail" />
            </div>
            <div className={styles.modalDetails}>
              <span className={styles.modalDate}>{modalData.date}</span>
              <p className={styles.modalDesc} dangerouslySetInnerHTML={{ __html: modalData.desc }} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
