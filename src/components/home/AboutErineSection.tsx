/* eslint-disable @next/next/no-img-element */
"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import styles from "./AboutErineSection.module.css";
import { VIDEO_URLS } from "@/lib/videoAssets";
import ChessEyebrow from "@/components/chess/ChessEyebrow";
import KnightSvg from "@/components/chess/KnightSvg";
import EmberField from "@/components/chess/EmberField";
import FlameLayer from "@/components/chess/FlameLayer";
import { gsap, useGSAP, MQ } from "@/lib/gsap";
import { useReveal } from "@/hooks/useReveal";

function parseSongs(raw: any): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((s) => String(s).replace(/^[\["'\s]+|[\]"'\s]+$/g, "").replace(/\\"/g, '"').trim())
      .filter(Boolean);
  }

  const s = String(raw).trim();
  if (s.startsWith("[") || s.startsWith("{")) {
    try {
      const parsed = JSON.parse(s.replace(/^\{/, "[").replace(/\}$/, "]"));
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).replace(/^[\["'\s]+|[\]"'\s]+$/g, "").replace(/\\"/g, '"').trim())
          .filter(Boolean);
      }
    } catch {}
  }

  return s
    .replace(/^[\[\{]+|[\]\}]+$/g, "")
    .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((item) => item.replace(/^[\["'\s]+|[\]"'\s]+$/g, "").replace(/\\"/g, '"').trim())
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

function SafetyPin() {
  return (
    <div className={styles.safetyPin} aria-hidden="true">
      <svg
        viewBox="0 0 32 60"
        className={styles.safetyPinSvg}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="cavaPinMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="25%" stopColor="#eab308" />
            <stop offset="60%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#713f12" />
          </linearGradient>
          <linearGradient id="cavaPinCap" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a16207" />
          </linearGradient>
        </defs>
        {/* Spring loop at the bottom */}
        <circle cx="16" cy="48" r="5.5" stroke="url(#cavaPinMetal)" strokeWidth="2.4" />
        <circle cx="16" cy="48" r="2.8" stroke="#854d0e" strokeWidth="1" fill="#1c1917" />

        {/* Back arm wire */}
        <path d="M20 18 L20 45" stroke="url(#cavaPinMetal)" strokeWidth="2.5" strokeLinecap="round" />

        {/* Front pin / needle piercing through poster */}
        <path d="M12 18 L12 45" stroke="url(#cavaPinMetal)" strokeWidth="2.2" strokeLinecap="round" />

        {/* Head / clasp sheath at top */}
        <rect x="8" y="4" width="16" height="16" rx="4" fill="url(#cavaPinCap)" stroke="#78350f" strokeWidth="0.8" />
        {/* Head slot cutout */}
        <path d="M12 8 L12 16" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
        {/* Metallic highlight bevel */}
        <path d="M10 6 L22 6" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
      </svg>
    </div>
  );
}

function FlipCard({ set }: { set: SetlistData; idx: number }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={styles.stickyCard}
      onClick={() => setIsFlipped(!isFlipped)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsFlipped(!isFlipped);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label={`${set.title} — balik kartu untuk melihat unit songs`}
      data-flipped={isFlipped ? "true" : "false"}
      style={{ zIndex: isFlipped ? 10 : 1 }}
    >
      <div className={styles.flipInner}>
        <div className={styles.flipFront}>
          <SafetyPin />
          <div className={styles.polaroidFrame}>
            <img src={set.img} alt={set.title} />
          </div>
          <div className={styles.cardTitle}>{set.title}</div>
          <div className={styles.cardDates}>{set.date}</div>
          <span className={styles.showBadge}>{set.badge}</span>
        </div>

        <div className={styles.flipBack}>
          <SafetyPin />
          <div className={styles.cardTitle} style={{ marginBottom: "15px", fontSize: "1.2rem" }}>
            Unit Songs
          </div>
          <ul className={styles.unitSongs}>
            {set.songs.map((song: string, i: number) => {
              const cleanSong = String(song).replace(/^[\["'\s]+|[\]"'\s]+$/g, "").trim();
              return (
                <li key={`${cleanSong}-${i}`} className={styles.songRow}>
                  <span className={styles.songNum}>{i + 1}.</span> {cleanSong}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

interface TriviaItem {
  id: number;
  q: string;
  options: string[];
  correctIndex: number;
  a: string;
  tag: string;
}

const DEFAULT_TRIVIA_LIST: TriviaItem[] = [
  {
    id: 1,
    q: "Kapan penampilan pertama Erine sebagai penari latar (zenza girl) di panggung theater JKT48?",
    options: [
      "1 Februari 2025 (Zenza Girl - Glory Days)",
      "18 November 2023 (Trainee Debut)",
      "25 Oktober 2025 (Promosi Team Passion)"
    ],
    correctIndex: 0,
    a: "Penampilan pertama Erine sebagai penari latar (zenza girl) di JKT48 Stage ke-5 untuk lagu 'Glory Days' adalah pada tanggal 1 Februari 2025.",
    tag: "Panggung Theater",
  },
  {
    id: 2,
    q: "Siapa girlgroup dan idol K-Pop yang paling diidolakan oleh Erine?",
    options: [
      "NewJeans — Haerin",
      "aespa — Ningning",
      "IVE — Wonyoung"
    ],
    correctIndex: 1,
    a: "Erine sangat mengidolakan girlgroup aespa, dengan bias utama Erine yaitu Ningning.",
    tag: "Favorit",
  },
  {
    id: 3,
    q: "Apa cita-cita unik yang pernah diimpikan Erine semasa upacara bendera di sekolah?",
    options: [
      "Pemimpin paduan suara (Dirigen)",
      "Petugas pembawa bendera upacara",
      "Pembaca naskah Pembukaan UUD 1945"
    ],
    correctIndex: 1,
    a: "Erine punya cita-cita unik ingin menjadi petugas pembawa bendera saat Erine upacara bendera di sekolah.",
    tag: "Masa Sekolah",
  },
  {
    id: 4,
    q: "Saat menempuh pendidikan di bangku SMA, jurusan apa yang dipilih oleh Erine?",
    options: [
      "IPA (Ilmu Pengetahuan Alam)",
      "Bahasa dan Budaya",
      "IPS (Ilmu Pengetahuan Sosial)"
    ],
    correctIndex: 2,
    a: "Erine mengambil jurusan IPS saat Erine menempuh pendidikan di SMA.",
    tag: "Pendidikan",
  },
  {
    id: 5,
    q: "Alat musik petik khas apa yang mahir dimainkan oleh Erine?",
    options: [
      "Kalimba (alat musik petik jempol)",
      "Ukulele akustik",
      "Harpa mini"
    ],
    correctIndex: 0,
    a: "Erine mahir memainkan alat musik Kalimba (alat musik petik jempol khas Afrika).",
    tag: "Bakat Musik",
  },
  {
    id: 6,
    q: "Bagaimana kondisi kesehatan mata Erine yang sering dipuji sangat jernih?",
    options: [
      "Minus 1.5 pada mata kiri",
      "Silinder ringan 0.75",
      "Mata sangat sehat, tanpa minus maupun silinder"
    ],
    correctIndex: 2,
    a: "Mata Erine sangat sehat dan jernih, Erine sama sekali tidak memiliki kelainan minus ataupun silinder.",
    tag: "Kesehatan",
  },
  {
    id: 7,
    q: "Kapan Erine resmi mengirimkan formulir pendaftaran audisi JKT48 Generasi 12?",
    options: [
      "Hari pertama pembukaan pendaftaran",
      "Tepat di hari terakhir penutupan pendaftaran!",
      "Satu minggu sebelum batas waktu"
    ],
    correctIndex: 1,
    a: "Erine mendaftarkan diri pada audisi JKT48 tepat di hari terakhir penutupan pendaftaran!",
    tag: "Audisi JKT48",
  },
  {
    id: 8,
    q: "Apakah Erine benar-benar jago bermain catur sesuai jikoshoukai 'Checkmate' miliknya?",
    options: [
      "Sebenarnya tidak bisa, jiko Checkmate murni ide spontan!",
      "Juara catur tingkat sekolah",
      "Menguasai taktik pembuka grandmaster catur"
    ],
    correctIndex: 0,
    a: "Sebenarnya Erine tidak bisa main catur! Jikoshoukai 'Checkmate' Erine itu murni ide spontan yang terlintas begitu saja di pikiran Erine.",
    tag: "Jikoshoukai",
  },
  {
    id: 9,
    q: "Di team manakah Erine resmi dipromosikan sebagai member inti JKT48?",
    options: [
      "Team Love",
      "Team Passion",
      "Team Dream"
    ],
    correctIndex: 1,
    a: "Erine resmi dipromosikan ke Team Passion JKT48 dan membakar panggung bersama semangat Cavallery.",
    tag: "Team JKT48",
  },
  {
    id: 10,
    q: "Berapa nomor generasi (Gen) Erine saat pertama kali diperkenalkan di JKT48?",
    options: [
      "Generasi 11",
      "Generasi 12",
      "Generasi 13"
    ],
    correctIndex: 1,
    a: "Catherina Vallencia (Erine) diperkenalkan secara resmi sebagai member JKT48 Generasi ke-12 pada November 2023.",
    tag: "Generasi",
  },
  {
    id: 11,
    q: "Bagaimana bunyi salam perkenalan (Jikoshoukai) khas Erine yang selalu diteriakkan fans?",
    options: [
      "Hadir dengan seribu kejutan, Checkmate!",
      "Langkah kuda tak tertebak, Skakmat!",
      "Membakar panggung dengan senyuman, Halo semuanya!"
    ],
    correctIndex: 0,
    a: "Jikoshoukai khas Erine adalah 'Hadir dengan seribu kejutan, Checkmate!' yang selalu membakar semangat panggung.",
    tag: "Jikoshoukai",
  },
  {
    id: 12,
    q: "Apa filosofi di balik nama fanbase resmi pendukung Erine, 'Cavallery'?",
    options: [
      "Singkatan dari Catherina dan kota kelahirannya",
      "Nama judul lagu teater favorit Erine",
      "Perpaduan ksatria berkuda (Cavalry/Knight) dan nama Catherina Vallencia"
    ],
    correctIndex: 2,
    a: "Cavallery terinspirasi dari ksatria berkuda (Cavalry/Knight) dan nama Catherina Vallencia, melambangkan pelindung setia yang mendampingi langkah Erine.",
    tag: "Fanbase",
  },
];

function buildTriviaList(apiFunfacts: any[]): TriviaItem[] {
  if (!apiFunfacts || apiFunfacts.length === 0) {
    return DEFAULT_TRIVIA_LIST;
  }

  return DEFAULT_TRIVIA_LIST.map((defItem) => {
    const dbMatch = apiFunfacts.find((f: any) => {
      if (f.id === defItem.id) return true;
      const txt = (f.fact || f.content || "").toLowerCase();
      if (defItem.id === 1 && (txt.includes("glory days") || txt.includes("penari latar") || txt.includes("zenza"))) return true;
      if (defItem.id === 2 && (txt.includes("aespa") || txt.includes("ningning"))) return true;
      if (defItem.id === 3 && (txt.includes("bendera") || txt.includes("upacara"))) return true;
      if (defItem.id === 4 && (txt.includes("ips") || txt.includes("sma") || txt.includes("jurusan"))) return true;
      if (defItem.id === 5 && (txt.includes("kalimba") || txt.includes("alat musik"))) return true;
      if (defItem.id === 6 && (txt.includes("mata") || txt.includes("silinder") || txt.includes("minus"))) return true;
      if (defItem.id === 7 && (txt.includes("daftar") || txt.includes("audisi") || txt.includes("terakhir"))) return true;
      if (defItem.id === 8 && (txt.includes("catur") || txt.includes("checkmate"))) return true;
      return false;
    });

    if (dbMatch) {
      return {
        ...defItem,
        a: dbMatch.fact || dbMatch.content || defItem.a,
        tag: dbMatch.category && dbMatch.category !== "General" ? dbMatch.category : defItem.tag,
      };
    }
    return defItem;
  });
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
  const [kabeshas, setKabeshas] = useState<any[]>([]);
  const [funfacts, setFunfacts] = useState<any[]>([]);
  const [triviaGuesses, setTriviaGuesses] = useState<Record<number, number>>({});
  const [debutVideoId, setDebutVideoId] = useState<string>("Obxn7knXq38");
  const [sskVideoId, setSskVideoId] = useState<string>("_Qn9B9mD2bI");
  const [updatesLoaded, setUpdatesLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);

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
        if (json?.status && Array.isArray(json.data) && json.data.length > 0) {
          setSetlists(json.data);
        }
      })
      .catch(() => {});

    fetch("/api/stats")
      .then((r) => r.json())
      .then((json) => {
        if (json?.status && Array.isArray(json.data) && json.data.length > 0) {
          const seen = new Set<string>();
          const uniqueList: any[] = [];
          for (const s of json.data) {
            const normKey = s.stat_key === "total_show" ? "total_shows" : (s.stat_key === "total_setlist" ? "setlists" : s.stat_key);
            if (!seen.has(normKey) && (normKey === "total_shows" || normKey === "setlists" || normKey === "unit_songs")) {
              seen.add(normKey);
              uniqueList.push({ ...s, stat_key: normKey });
            }
          }
          uniqueList.sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
          setStatsData(uniqueList.length > 0 ? uniqueList : json.data);
        }
      })
      .catch(() => {});

    // Fetch kabeshas from API
    fetch("/api/kabesha")
      .then((r) => r.json())
      .then((json) => {
        const list = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(list) && list.length > 0) {
          setKabeshas(list.filter((k: any) => k.is_active !== false && k.is_active !== 0));
        }
      })
      .catch(() => {});

    // Fetch funfacts from API
    fetch("/api/funfacts")
      .then((r) => r.json())
      .then((json) => {
        const list = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(list) && list.length > 0) {
          setFunfacts(list.filter((f: any) => f.is_active !== false && f.is_active !== 0));
        }
      })
      .catch(() => {});

    // Fetch youtube videos to dynamically assign showcase video
    fetch("/api/youtube")
      .then((r) => r.json())
      .then((json) => {
        const list = json.data?.videos || (Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []));
        if (Array.isArray(list) && list.length > 0) {
          const debut = list.find((v: any) => {
            const t = (v.title || "").toLowerCase();
            const c = (v.category || "").toLowerCase();
            return t.includes("debut") || c.includes("debut");
          });
          if (debut?.video_id) setDebutVideoId(debut.video_id);

          const ssk = list.find((v: any) => {
            const t = (v.title || "").toLowerCase();
            return t.includes("pemilihan") || t.includes("sousenkyo") || t.includes("ssk");
          });
          if (ssk?.video_id) setSskVideoId(ssk.video_id);
        }
      })
      .catch(() => {});

    fetch("/api/updates")
      .then((r) => r.json())
      .then((json) => { if (json?.success) setUpdates(json.data); })
      .catch(console.error)
      .finally(() => setUpdatesLoaded(true));

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
      const audio = new Audio(VIDEO_URLS.jikorineAudio);
      audio.onerror = () => {
        setIsPlayingJiko(false);
      };
      audio.onended = () => setIsPlayingJiko(false);
      audioRef.current = audio;
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
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  };

  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, []);

  const handleSelectTriviaOption = (itemId: number, optionIdx: number) => {
    if (triviaGuesses[itemId] !== undefined) return;
    setTriviaGuesses((prev) => ({ ...prev, [itemId]: optionIdx }));
  };

  const handleResetTriviaGame = () => {
    setTriviaGuesses({});
  };

  const triviaList = useMemo(() => {
    return buildTriviaList(funfacts);
  }, [funfacts]);

  useReveal(rootRef, [kabeshas.length, setlists.length, statsData.length, updates.length, pmLoading]);

  // Kabesha Journey: the line between the three stages draws itself on scroll.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ desktop: MQ.desktop, mobile: MQ.mobile }, (ctx) => {
        const isDesktop = Boolean(ctx.conditions?.desktop);
        const fill = rootRef.current?.querySelector("[data-kabesha-fill]");
        const steps = rootRef.current?.querySelectorAll<HTMLElement>("[data-kabesha-step]");
        const board = rootRef.current?.querySelector("[data-kabesha-board]");
        if (!fill || !board || !steps) return;
        gsap.fromTo(
          fill,
          isDesktop ? { scaleX: 0 } : { scaleY: 0 },
          {
            ...(isDesktop ? { scaleX: 1 } : { scaleY: 1 }),
            ease: "none",
            scrollTrigger: {
              trigger: board,
              start: "top 75%",
              end: "bottom 70%",
              scrub: 0.6,
              onUpdate(self) {
                steps.forEach((st, i) => {
                  const at = steps.length > 1 ? i / (steps.length - 1) : 0;
                  st.dataset.lit = self.progress >= at - 0.02 ? "true" : "false";
                });
              },
            },
          }
        );
      });
      mm.add(MQ.reduce, () => {
        rootRef.current
          ?.querySelectorAll<HTMLElement>("[data-kabesha-step]")
          .forEach((st) => (st.dataset.lit = "true"));
      });
      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [kabeshas.length], revertOnUpdate: true }
  );

  const totalTrivia = triviaList.length;
  const answeredCount = Object.keys(triviaGuesses).length;
  const correctCount = triviaList.filter((item) => triviaGuesses[item.id] === item.correctIndex).length;

  return (
    <section ref={rootRef} className={styles.wrapper} data-motion>
      {/* 1. Wiki Style Profile Card */}
      <div className={styles.profileContainer}>
        <div className={styles.leftCol}>
          <div className={styles.headerSection} data-reveal="up">
            <ChessEyebrow square="a1" label="Profil · Gen 12 · Team Passion" />
            <div className={styles.titleBox}>
              <h1 className={styles.wikiName}>Erine</h1>
              <a
               href="https://www.idn.app/jkt48_erine"
  target="_blank"
  rel="noopener noreferrer"
  className={`${styles.followBtn} cv-flame-hover`}
>
  &#43; Follow
</a>
            </div>
            <span className={styles.jpName}>Japan : エリーヌ</span>
          </div>

          <div className={styles.tableContainer} data-reveal="up">
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
              <button
                className={styles.audioBtn}
                onClick={toggleJiko}
                aria-label={isPlayingJiko ? "Hentikan jikoshoukai" : "Putar jikoshoukai"}
                aria-pressed={isPlayingJiko}
              >
                <i className={`bx ${isPlayingJiko ? "bx-pause" : "bx-play"}`} />
              </button>
            </div>
            <div className={styles.jikoQuoteBox}>
              Hadir dengan seribu kejutan,
              <br />
              <span className={`${styles.checkmateAnim} cv-fire-text`}>Checkmate!</span>
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
                <div key={src} className={styles.thumbItem}>
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
        {/* Introduction */}
        <div className={styles.ewIntro} data-reveal="up">
          <div className={styles.ewIntroBadge}>
            <ChessEyebrow square="b3" label="Introduction" />
          </div>
          <p>
            Erine adalah member JKT48 generasi ke-12. Erine dikenal sebagai{" "}
            <strong className={styles.ewHighlight}>&quot;Putri Bebek&quot;</strong>{" "}
            oleh fans karena kepribadiannya yang unik dan menggemaskan.
          </p>
        </div>

        <div className={styles.ewSplit} data-reveal="stagger">
          {/* Bio Cards */}
          <div className={styles.ewBio}>
            <div className={styles.ewBioHeader}>
              <i className="bx bx-id-card" />
              <span>Profil Erine</span>
            </div>
            <div className={styles.ewBioGrid}>
              {[
                { icon: "bx-calendar-star", label: "Debut", value: "18 November 2023" },
                { icon: "bx-group", label: "Tahun Aktif", value: "Member JKT48 Gen 12" },
                { icon: "bx-heart", label: "Member Favorit", value: <a href="https://x.com/I_KathrinaJKT48" target="_blank" rel="noopener noreferrer" className={styles.ewBioLink}>Kathrina Irene</a> },
                { icon: "bx-brain", label: "MBTI", value: "ISFP / INFP" },
                { icon: "bx-meteor", label: "Shio", value: "🐷 Babi" },
                { icon: "bx-music", label: "Hobi", value: "Bermain Piano, Menari" },
                { icon: "bx-hash", label: "Angka Favorit", value: "7" },
                { icon: "bx-palette", label: "Warna Favorit", value: <span className={styles.ewColors}><span className={styles.colorDotPink} />Pink<span className={styles.colorDotBlue} />Blue<span className={styles.colorDotGreen} />Hijau</span> },
              ].map((row, i) => (
                <div key={i} className={styles.ewBioRow}>
                  <div className={styles.ewBioIcon}>
                    <i className={`bx ${row.icon}`} />
                  </div>
                  <div className={styles.ewBioContent}>
                    <span className={styles.ewBioLabel}>{row.label}</span>
                    <span className={styles.ewBioValue}>{row.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hashtags */}
          <div className={styles.ewHt}>
            <div className={styles.ewHtHeader}>
              <i className="bx bx-hash" />
              <span>Official Hashtags</span>
            </div>
            <div className={styles.ewHtList}>
              {[
                { when: "Setiap Hari Jumat", tag: "#DiesVenErine" },
                { when: "Setiap Jurnal", tag: "#MemoRine" },
                { when: "Setiap Sahur", tag: "#SahuRine" },
                { when: "Sebelum Berbuka", tag: "#Ngabuburine" },
                { when: "Setiap Berbuka", tag: "#BukbeRine" },
                { when: "Setiap Game", tag: "#GameRine" },
              ].map((h, i) => (
                <div key={i} className={styles.ewHtRow}>
                  <span className={styles.lbl2}>{h.when}</span>
                  <a
                    href={`https://x.com/search?q=${encodeURIComponent(h.tag)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.tag}
                  >
                    {h.tag}
                  </a>
                </div>
              ))}
            </div>
            <div className={styles.ewPm}>
              <img src="/images/pm.png" alt="PM" />
              <div className={styles.ewPmContent}>
                <span className={styles.lbl2}>Personal Massage</span>
                <a
                  href="https://x.com/search?q=%23NgabaRine"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.tag}
                >
                  #NgabaRine
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.ewFf} data-reveal="up">
          <div className={styles.ffHeader}>
            <div>
              <div className={styles.ffGameBadge}>
                <ChessEyebrow square="c5" label="Mini Game Trivia" />
              </div>
              <h3 data-ghost="TRIVIA" className={styles.ffTitle}>
                Tebak Trivia &amp; <span className={styles.ffTitleAccent}>Fakta Erine</span>
              </h3>
              <p className={styles.ffSubtitle}>
                Uji seberapa kenal kamu dengan Erine! Pilih tebakanmu di tiap pertanyaan untuk mengungkap rahasia dan fakta aslinya. 🐣✨
              </p>
            </div>

            <div className={styles.ffGameStatsBar}>
              <div className={styles.ffStatItem}>
                <span className={styles.ffStatLabel}>Telah Ditebak</span>
                <span className={styles.ffStatVal}>{answeredCount} / {totalTrivia}</span>
              </div>
              <div className={styles.ffStatItem}>
                <span className={styles.ffStatLabel}>Skor Benar</span>
                <span className={`${styles.ffStatVal} ${styles.ffStatValGold}`}>{correctCount}</span>
              </div>
              {answeredCount > 0 && (
                <button
                  type="button"
                  className={styles.ffResetGameBtn}
                  onClick={handleResetTriviaGame}
                  title="Mulai Ulang Game"
                >
                  <i className="bx bx-refresh" /> Reset Game
                </button>
              )}
            </div>
          </div>

          {answeredCount === totalTrivia && totalTrivia > 0 && (
            <div className={styles.gameCompletionBanner}>
              <div className={styles.gameCompletionEmoji} aria-hidden="true">
                <KnightSvg size={40} />
              </div>
              <div className={styles.gameCompletionContent}>
                <h4>
                  {correctCount === totalTrivia
                    ? "Sempurna! Kamu Jenius Cavallery Sejati! ♟️💙"
                    : correctCount >= 5
                    ? "Keren Banget! Kamu Tahu Banyak Soal Erine! 🐣✨"
                    : "Permainan Bagus! Terus dukung dan kenali Erine ya! 💙"}
                </h4>
                <p>
                  Kamu berhasil menjawab <strong>{correctCount} dari {totalTrivia}</strong> pertanyaan trivia dengan tepat!
                </p>
              </div>
              <button
                type="button"
                className={styles.playAgainBtn}
                onClick={handleResetTriviaGame}
              >
                <i className="bx bx-rotate-left" /> Main Lagi
              </button>
            </div>
          )}

          <div className={styles.ffGrid}>
            {triviaList.map((item) => {
              const selectedOpt = triviaGuesses[item.id];
              const isAnswered = selectedOpt !== undefined;
              const isCorrect = selectedOpt === item.correctIndex;

              return (
                <div
                  key={item.id}
                  className={`${styles.ffCard} ${
                    isAnswered ? (isCorrect ? styles.ffCardCorrect : styles.ffCardWrong) : ""
                  }`}
                >
                  <div className={styles.ffQuestionRow}>
                    <div className={styles.ffQuestionLeft}>
                      <span className={styles.ffNumberBadge}>Q{item.id}</span>
                      <span className={styles.ffQuestionText}>{item.q}</span>
                    </div>
                    {item.tag && <span className={styles.ffTagBadge}>{item.tag}</span>}
                  </div>

                  {/* Multiple Choice Game Options */}
                  <div className={styles.triviaOptionsList}>
                    {item.options.map((opt: string, optIdx: number) => {
                      const letter = ["A", "B", "C", "D"][optIdx] || `${optIdx + 1}`;
                      const isThisSelected = selectedOpt === optIdx;
                      const isThisCorrect = optIdx === item.correctIndex;

                      let optClass = styles.triviaOptionBtn;
                      if (isAnswered) {
                        if (isThisCorrect) {
                          optClass = `${styles.triviaOptionBtn} ${styles.triviaOptionCorrect}`;
                        } else if (isThisSelected) {
                          optClass = `${styles.triviaOptionBtn} ${styles.triviaOptionWrong}`;
                        } else {
                          optClass = `${styles.triviaOptionBtn} ${styles.triviaOptionDimmed}`;
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          className={optClass}
                          onClick={() => handleSelectTriviaOption(item.id, optIdx)}
                          disabled={isAnswered}
                        >
                          <span className={styles.triviaLetter}>{letter}</span>
                          <span className={styles.triviaOptText}>{opt}</span>
                          {isAnswered && isThisCorrect && (
                            <i className={`bx bx-check-circle ${styles.optResultIcon}`} />
                          )}
                          {isAnswered && isThisSelected && !isThisCorrect && (
                            <i className={`bx bx-x-circle ${styles.optResultIcon}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Before Answered Hint */}
                  {!isAnswered && (
                    <div className={styles.ffGuessPrompt}>
                      <i className="bx bx-help-circle" /> Pilih salah satu opsi di atas untuk menebak &amp; membuka rahasianya!
                    </div>
                  )}

                  {/* After Answered: Unlocked Fact */}
                  {isAnswered && (
                    <div className={styles.ffAnswerBox}>
                      <div className={styles.ffAnswerHeader}>
                        <span
                          className={
                            isCorrect ? styles.ffAnswerBadgeCorrect : styles.ffAnswerBadgeWrong
                          }
                        >
                          <i
                            className={`bx ${
                              isCorrect ? "bx-check-circle" : "bx-info-circle"
                            }`}
                          />
                          {isCorrect ? "Tebakanmu Tepat Sekali! 🎉" : "Kurang Tepat, Ini Jawabannya:"}
                        </span>
                      </div>
                      <p className={styles.ffAnswerText}>{item.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Showcase Section */}
      <div className={styles.showcaseContainer}>
        <div className={styles.videoDebut} data-reveal="up">
          <div className={styles.nailedFrame}>
            <ChessEyebrow square="d7" label="Debut" />
          </div>
          <h3 data-ghost="DEBUT" className={styles.erineTitle}>{"Erine's Video Debut"}</h3>
          <div className={styles.videoFrameWrapper}>
            <div className={styles.responsiveVideo}>
              <iframe src={`https://www.youtube.com/embed/${debutVideoId}`} title="Debut" allowFullScreen />
            </div>
          </div>
        </div>

        {/* ── ERINE'S KABESHA JOURNEY: Trainee → Regular → Team Passion ── */}
        <div className={styles.kabeshaBoardWrapper}>
          <div className={styles.kabeshaBoardHeader} data-reveal="up">
            <div className={styles.nailedFrame}>
              <ChessEyebrow square="e5" label="Kabesha Journey" />
            </div>
            <h3 data-ghost="KABESHA" className={styles.erineTitle}>
              {"Erine's Kabesha"} <span className={styles.erineTitleAccent}>Journey</span>
            </h3>
            <p className={styles.kabeshaSubtitle}>
              Alur jejak visual &amp; evolusi kabesha Erine dari generasi ke generasi di JKT48
            </p>
          </div>

          <div className={styles.kabeshaParchmentBoard} data-kabesha-board>
            <div className={styles.kabeshaAlurContainer}>
              {/* Connecting line (drawn on scroll: cold → Passion fire) */}
              <div className={styles.kabeshaAlurSpine} aria-hidden="true">
                <span className={styles.kabeshaSpineFill} data-kabesha-fill />
              </div>

              {(kabeshas.length > 0 ? kabeshas : [
                { image_url: "/images/trainee.jpg", era: "2024", title: "Trainee Member", description: "Langkah awal perjalanan Erine di JKT48 diperkenalkan sebagai Trainee pada Jak Japan Matsuri (18 November 2023)." },
                { image_url: "/images/regular.webp", era: "2025", title: "Regular Member", description: "Berkat dedikasi dan kerja keras, Erine resmi dipromosikan menjadi Member reguler JKT48 (1 Mei 2025)." },
                { image_url: "/images/erine-passion.webp", era: "2026", title: "Team Passion", description: "Membuka babak baru yang membanggakan sebagai bagian dari formasi resmi Team Passion JKT48." },
              ]).map((item: any, idx: number, arr: any[]) => {
                const img = item.image_url || item.img || "/images/cava-logo.jpg";
                const year = item.era || item.year_label || item.year || (idx === 0 ? "2024" : idx === 1 ? "2025" : "2026");
                const title = item.title || item.era_name || "Kabesha";
                const desc = item.description || item.desc || title;

                // Sticker badge text determination
                let stickerTop = "JKT48";
                let stickerBottom = "Member";
                if (/trainee/i.test(title)) {
                  stickerTop = "JKT48";
                  stickerBottom = "Trainee";
                } else if (/passion/i.test(title)) {
                  stickerTop = "JKT48";
                  stickerBottom = "Passion";
                } else if (/regular/i.test(title) || /member/i.test(title)) {
                  stickerTop = "JKT48";
                  stickerBottom = "Member";
                }

                const isPassion = /passion/i.test(title) || (idx === arr.length - 1 && arr.length > 1 && !arr.some((k: any) => /passion/i.test(k.title || "")));
                const isLeft = idx % 2 === 0;

                return (
                  <div
                    key={item.id || `${year}-${title}-${idx}`}
                    className={`${styles.kabeshaAlurStep} ${isLeft ? styles.stepLeft : styles.stepRight}`}
                    data-kabesha-step
                    data-lit="false"
                    data-passion={isPassion ? "true" : "false"}
                  >
                    {/* Checkpoint node with stage number & year */}
                    <div className={styles.kabeshaTitikJalan}>
                      <div className={styles.titikNode}>
                        <span className={styles.titikNumber}>0{idx + 1}</span>
                        <div className={styles.titikPulse} />
                      </div>
                      <div className={styles.titikYearPill}>{year}</div>
                    </div>

                    <div className={styles.kabeshaStepContent}>
                      <div
                        className={`${styles.kabeshaPinnedCard} ${isPassion ? "cv-dark" : ""}`}
                        onClick={() => openModal(img, `${year} • ${title}`, desc)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openModal(img, `${year} • ${title}`, desc);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        title={`Klik untuk melihat foto Kabesha ${year} (${title})`}
                      >
                        {isPassion && (
                          <div className={styles.kabeshaEmbers} aria-hidden="true">
                            <EmberField desktop={16} mobile={8} intensity={1} />
                          </div>
                        )}

                        <div className={styles.kabeshaStickerBadge}>
                          <span className={styles.stickerLine1}>{stickerTop}</span>
                          <span className={styles.stickerLine2}>{stickerBottom}</span>
                        </div>

                        <div className={styles.kabeshaPhotoWrap}>
                          <img src={img} alt={`${title} (${year})`} className={styles.kabeshaImg} loading="lazy" decoding="async" />
                          {isPassion && (
                            <FlameLayer id={`kabesha-flames-${idx}`} className={styles.kabeshaFlames} density={6} intensity={0.85} />
                          )}
                          <div className={styles.photoZoomOverlay}>
                            <i className="bx bx-zoom-in" />
                            <span>Lihat Foto Pas</span>
                          </div>
                        </div>

                        <div className={styles.kabeshaCardInfo}>
                          <div className={styles.kabeshaMarkerYear}>{year}</div>
                          <div className={`${styles.kabeshaEraTitle} ${isPassion ? "cv-fire-text" : ""}`}>{title}</div>
                          <p className={styles.kabeshaDescSnippet}>{desc}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.electionSection} data-reveal="up">
          <div className={styles.nailedFrame}>
            <ChessEyebrow square="f3" label="Sousenkyo" />
          </div>
          <h3 data-ghost="SENBATSU" className={styles.erineTitle}>7th JKT48 Senbatsu Election</h3>
          <div className={styles.frameCardWide}>
            <div className={styles.responsiveVideo}>
              <iframe
                src="https://www.youtube.com/embed/_Qn9B9mD2bI"
                title="7th JKT48 Senbatsu Election Erine"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className={styles.electionGrid}>
              <div
                className={styles.electionItem}
                role="button"
                tabIndex={0}
                onClick={() => openModal("/images/chapter.jpg", "Campaign 2024", "Erine mengusung Project SSK dengan #Dongeng & #Chapter.")}
              >
                <div className={styles.electionImg}><img src="/images/chapter.jpg" alt="Poster" /></div>
                <div className={styles.captionBox}>{"Poster Erine's Sousenkyo"}</div>
              </div>
              <div
                className={styles.electionItem}
                role="button"
                tabIndex={0}
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
        <div className={styles.journalHead} data-reveal="up">
          <ChessEyebrow square="g5" label="Setlist & Statistik" />
          <h3 data-ghost="PANGGUNG" className={styles.erineTitle}>
            Jejak <span className={styles.erineTitleAccent}>Panggung</span>
          </h3>
        </div>
        <div className={styles.statsBoard} data-reveal="up">
          <div className={styles.pinTack} />
          <div className={styles.statsGrid}>
            {statsData.length === 0 ? (
              <div className={styles.loadingNote}>
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

        <div className={styles.cardsGrid} data-reveal="stagger">
          {setlists.length === 0 ? (
            <div className={styles.loadingNote}>
              <i className="bx bx-loader-alt bx-spin" /> Memuat setlist...
            </div>
          ) : (
            setlists.map((set, idx) => (
              <FlipCard
                key={set.id}
                set={{
                  title: set.title,
                  date: set.date_range,
                  badge: set.badge,
                  img: set.image_url,
                  songs: parseSongs(set.songs),
                }}
                idx={idx}
              />
            ))
          )}
        </div>
      </div>

      {/* 4.5 PM Weekly Stats */}
      <div className={styles.pmStatsSection} data-reveal="up">
        <div className={styles.nailedFrame}>
          <ChessEyebrow square="h3" label="Personal Message" />
        </div>
        <h3 data-ghost="PESAN" className={styles.erineTitle}>Statistik PM Mingguan</h3>
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
                  style={{ transform: `scaleX(${Math.min((parseInt(pmStats.messages_per_week) || 0) / 100, 1)})` }}
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
        <div className={styles.nailedFrame} data-reveal="fade">
          <ChessEyebrow square="f4" label="Sosial Media" />
        </div>
        <h3 data-ghost="UPDATES" className={styles.erineTitle} data-reveal="up">Latest Updates</h3>
        {updates.length === 0 ? (
          <div className={styles.loadingNote}>
            {updatesLoaded ? (
              <><i className="bx bx-info-circle" /> Belum ada updates terbaru.</>
            ) : (
              <><i className="bx bx-loader-alt bx-spin" /> Memuat updates...</>
            )}
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

      {/* Lightbox Modal (Centered & Screen-Fitted) */}
      {isModalOpen && (
        <div
          className={`${styles.modalOverlay} ${styles.active}`}
          onClick={closeModal}
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={closeModal} aria-label="Tutup Modal">
              &times;
            </button>
            <div className={styles.modalImgWrapper}>
              <img src={modalData.image} alt={modalData.date} />
            </div>
            <div className={styles.modalDetails}>
              <div className={styles.modalBadge}>
                <i className="bx bx-photo-album" /> Detail Kabesha
              </div>
              <span className={styles.modalDate}>{modalData.date}</span>
              <p className={styles.modalDesc} dangerouslySetInnerHTML={{ __html: modalData.desc }} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
