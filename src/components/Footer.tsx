/* eslint-disable @next/next/no-img-element */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useRef, useState } from "react";
import styles from "./Footer.module.css";
import KnightSvg from "./chess/KnightSvg";
import EmberField from "./chess/EmberField";
import FlameLayer from "./chess/FlameLayer";
import { SOCIAL_LINKS } from "./chess/SocialIcons";
import { gsap, useGSAP, MQ, prefersReducedMotion } from "@/lib/gsap";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterCol {
  square: string;
  title: string;
  links: FooterLink[];
}

const COLUMNS: FooterCol[] = [
  {
    square: "a1",
    title: "About",
    links: [
      { label: "About Erine", href: "/about/erine" },
      { label: "About Cavallery", href: "/about/cavallery" },
    ],
  },
  {
    square: "c3",
    title: "Info",
    links: [
      { label: "Show Theater", href: "/show-theater" },
      { label: "Live Status", href: "https://www.showroom-live.com/r/JKT48_Erine", external: true },
      { label: "News JKT48", href: "/news" },
      { label: "News Cavallery", href: "/news/cavallery-statement" },
    ],
  },
  {
    square: "e5",
    title: "Project",
    links: [
      { label: "Request Hour 2026", href: "/request-hour-2026" },
      { label: "#CatErine17th", href: "/caterine17th" },
      { label: "Erine in Etherland", href: "/erine-in-etherland" },
      { label: "Erine 100 Show", href: "/erine100show" },
      { label: "SSK JKT48 2024", href: "/ssk" },
    ],
  },
  {
    square: "g7",
    title: "#GameRine",
    links: [
      { label: "Anterine Ke Theater", href: "/games/anterine-ke-theater" },
      { label: "Game Belalang Yang Membangkang", href: "/games/grasshopper-collector" },
      { label: "Game Erine In Etherland", href: "/games/zombie-escape" },
      { label: "Game Bibir Yang Telah Dicuri", href: "/games/jumping-adventure" },
      { label: "Love Erine Meter", href: "/games/love-erine-meter" },
      { label: "Dress Up Erine", href: "/games/dress-up-erine" },
    ],
  },
];

const GIANT = ["Hadir", "dengan", "seribu", "kejutan,", "Checkmate!"];

/**
 * Knight's Path finale on an 8×8 board (viewBox 800, square = 100):
 * b1 → c3 → e4 → g5 → f7 → h8 — every hop an "L", ending on the last square.
 */
const BOARD_PATH = "M150 750 L150 550 L250 550 L450 550 L450 450 L650 450 L650 350 L650 150 L550 150 L550 50 L750 50";
const WAYPOINTS = [
  { sq: "b1", x: 150, y: 750 },
  { sq: "c3", x: 250, y: 550 },
  { sq: "e4", x: 450, y: 450 },
  { sq: "g5", x: 650, y: 350 },
  { sq: "f7", x: 550, y: 150 },
  { sq: "h8", x: 750, y: 50 },
];

export default function Footer() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLElement | null>(null);
  const [openCol, setOpenCol] = useState<string | null>(null);
  const hidden = pathname?.startsWith("/admin") || pathname?.startsWith("/internal/dashboard-admin-xv7r2q");

  const { contextSafe } = useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const lit = root.querySelector<SVGPathElement>("[data-trail-lit]");
      const knight = root.querySelector<HTMLElement>("[data-board-knight]");
      const words = root.querySelectorAll<HTMLElement>("[data-giant-word]");
      const ignite = root.querySelector<HTMLElement>("[data-ignite]");
      const giant = root.querySelector<HTMLElement>("[data-giant]");
      const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-waypoint]"));
      const board = root.querySelector<HTMLElement>("[data-board]");
      const trail = Array.from(root.querySelectorAll<HTMLElement>("[data-trail-ember]"));
      const mateSparks = Array.from(root.querySelectorAll<HTMLElement>("[data-mate-spark]"));
      const mateWord = root.querySelector<HTMLElement>("[data-mate]");
      if (!lit || !knight || !giant) return;
      const len = lit.getTotalLength();

      // ember trail behind the walking knight (board coordinates)
      let ti = 0;
      let lastTrail = 0;
      const trailAt = (p: number) => {
        if (!board || !trail.length) return;
        const now = performance.now();
        if (now - lastTrail < 45) return;
        lastTrail = now;
        const k = board.clientWidth / 800;
        const pt = lit.getPointAtLength(p * len);
        const e = trail[ti++ % trail.length];
        gsap.killTweensOf(e);
        gsap.fromTo(
          e,
          { x: pt.x * k, y: pt.y * k, autoAlpha: 1, scale: 0.7 + Math.random() * 0.8 },
          { x: pt.x * k + (Math.random() - 0.5) * 24, y: pt.y * k - 30 - Math.random() * 30, autoAlpha: 0, scale: 0.15, duration: 0.8, ease: "power1.out" }
        );
      };

      // checkmate burst: sparks around h8 and around the burning word
      const burst = () => {
        if (!mateSparks.length) return;
        const fr = root.getBoundingClientRect();
        const anchors: DOMRect[] = [];
        const goal = root.querySelector<HTMLElement>("[data-goal]");
        if (goal) anchors.push(goal.getBoundingClientRect());
        if (mateWord) anchors.push(mateWord.getBoundingClientRect());
        mateSparks.forEach((sp, i) => {
          const a = anchors[i % anchors.length];
          if (!a) return;
          const cx = a.left - fr.left + a.width * (0.15 + Math.random() * 0.7);
          const cy = a.top - fr.top + a.height * (0.3 + Math.random() * 0.5);
          const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
          const r = 50 + Math.random() * 90;
          gsap.killTweensOf(sp);
          gsap.fromTo(
            sp,
            { x: cx, y: cy, autoAlpha: 1, scale: 1 + Math.random() },
            { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r, autoAlpha: 0, scale: 0.1, duration: 0.9 + Math.random() * 0.5, ease: "power2.out", delay: Math.random() * 0.25 }
          );
        });
      };

      const mm = gsap.matchMedia();

      mm.add(MQ.reduce, () => {
        gsap.set(lit, { strokeDasharray: len, strokeDashoffset: 0 });
        gsap.set(knight, { motionPath: { path: lit, align: lit, alignOrigin: [0.5, 0.5], start: 1, end: 1 } });
        if (ignite) gsap.set(ignite, { opacity: 1 });
        root.dataset.checkmate = "true";
        stops.forEach((s) => (s.dataset.on = "true"));
      });

      mm.add(MQ.motion, () => {
        gsap.set(lit, { strokeDasharray: len, strokeDashoffset: len });

        // ♞ walks the last moves of the Knight's Path as the footer scrolls in.
        const walk = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root,
            start: "top 85%",
            end: "bottom bottom",
            scrub: 1,
            onUpdate(self) {
              const p = self.progress;
              const mate = p > 0.985;
              if (mate && root.dataset.checkmate !== "true") burst();
              root.dataset.checkmate = mate ? "true" : "false";
              if (p > 0.001 && p < 0.999) trailAt(p);
              stops.forEach((s, i) => (s.dataset.on = p >= i / (stops.length - 1) - 0.01 ? "true" : "false"));
            },
          },
        });
        walk.to(lit, { strokeDashoffset: 0, duration: 1 }, 0);
        walk.to(knight, { motionPath: { path: lit, align: lit, alignOrigin: [0.5, 0.5] }, duration: 1 }, 0);

        // Giant line revealed word by word, "Checkmate!" ignites at the end.
        const reveal = gsap.timeline({
          scrollTrigger: { trigger: giant, start: "top 88%", end: "bottom 62%", scrub: 0.8 },
        });
        reveal.fromTo(words, { yPercent: 105 }, { yPercent: 0, ease: "power2.out", stagger: 0.18, duration: 0.6 });
        if (ignite) reveal.fromTo(ignite, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.in" }, ">-0.1");
      });

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [hidden], revertOnUpdate: true }
  );

  const safe = (fn: () => void) => (contextSafe ? contextSafe(fn)() : fn());

  const backToTop = () => safe(() => {
    const k = rootRef.current?.querySelector<HTMLElement>("[data-top-knight]");
    const smooth = !prefersReducedMotion();
    if (k && smooth) {
      gsap.fromTo(k, { y: 0 }, { y: -26, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1 });
    }
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
  });

  if (hidden) return null;

  return (
    <footer ref={rootRef} className={`${styles.footer} cv-dark`} data-motion data-checkmate="false">
      {/* ── Endgame board ─────────────────────────────────────────── */}
      <FlameLayer id="footer-flames" className={styles.flames} density={12} intensity={0.55} />

      <div className={styles.board} aria-hidden="true" data-board>
        <div className={styles.squares} />
        <svg className={styles.trail} viewBox="0 0 800 800" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="cv-endgame-fire" x1="0" y1="800" x2="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ff954f" />
              <stop offset="0.45" stopColor="#d8671b" />
              <stop offset="0.75" stopColor="#f26a1b" />
              <stop offset="1" stopColor="#ff924a" />
            </linearGradient>
          </defs>
          <path className={styles.trailBase} d={BOARD_PATH} />
          <path className={styles.trailLit} d={BOARD_PATH} data-trail-lit stroke="url(#cv-endgame-fire)" />
          {WAYPOINTS.map((w) => (
            <g key={w.sq} className={styles.waypoint} data-waypoint data-on="false">
              <rect x={w.x - 50} y={w.y - 50} width="100" height="100" />
            </g>
          ))}
        </svg>
        <span className={styles.goal} data-goal />
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className={styles.trailEmber} data-trail-ember />
        ))}
        <span className={styles.boardKnight} data-board-knight>
          <KnightSvg size="100%" />
        </span>
      </div>

      <div className={styles.embers} aria-hidden="true">
        <EmberField desktop={30} mobile={12} intensity={0.9} />
      </div>

      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brandBlock}>
            <Link href="/" className={styles.logo}>
              <img src="/images/cava-logo-round.png" alt="" width={44} height={44} />
              <span>
                cavallery<span className={styles.logoDot}>.id</span>
              </span>
            </Link>
            <p className={styles.tagline}>
              Fanbase resmi Catherina Vallencia Kurniawan. Hadir untuk mendukung, merayakan, dan berbagi setiap
              langkah perjalanan Erine bersama Cavallery.
            </p>
          </div>
        </div>

        {/* Giant endgame line */}
        <p className={`${styles.giant} cv-display`} data-giant>
          {GIANT.map((w, i) => {
            const isMate = i === GIANT.length - 1;
            return (
              <Fragment key={w}>
                <span className={styles.gMask}>
                  <span className={`${styles.gWord} ${isMate ? styles.mate : ""}`} data-giant-word data-mate={isMate ? "" : undefined}>
                    {isMate ? (
                      <>
                        <span className={styles.mateBase}>{w}</span>
                        <span className={`${styles.mateFire} cv-fire-text`} data-ignite aria-hidden="true">
                          {w}
                        </span>
                      </>
                    ) : (
                      w
                    )}
                  </span>
                </span>
                {i < GIANT.length - 1 ? " " : null}
              </Fragment>
            );
          })}
        </p>

        <div className={styles.lower}>
          <nav
            className={styles.cols}
            aria-label="Tautan footer"
          >
            {COLUMNS.map((col) => {
              const open = openCol === col.title;
              return (
                <div key={col.title} className={styles.col} data-open={open ? "true" : "false"}>
                  <button
                    type="button"
                    className={styles.colHead}
                    aria-expanded={open}
                    onClick={() => setOpenCol(open ? null : col.title)}
                  >
                    <span className={styles.colTitle}>{col.title}</span>
                    <span className={styles.colPlus} aria-hidden="true" />
                  </button>
                  <ul className={styles.colBody}>
                    {col.links.map((l) => (
                      <li key={l.href}>
                        {l.external ? (
                          <a
                            href={l.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {l.label}
                          </a>
                        ) : (
                          <Link href={l.href}>
                            {l.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>

          <div className={styles.socials}>
            <span className={styles.socialsLabel}>Ikuti Erine</span>
            <div className={styles.socialRow}>
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.key}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className={styles.social}
                >
                  <span className={styles.socialInner}>
                    <span className={styles.socialFront}>{s.icon}</span>
                    <span className={styles.socialBack}>{s.icon}</span>
                  </span>
                </a>
              ))}
            </div>
            <button type="button" className={styles.toTop} onClick={backToTop} aria-label="Back to top">
            <span className={styles.toTopTrack} aria-hidden="true">
              <span className={styles.toTopKnight} data-top-knight>
                <KnightSvg size={22} />
              </span>
            </span>
            <span className={styles.toTopLabel}>Back to top</span>
          </button>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>&copy; 2026 Cavallery. All Rights Reserved.</p>
          <div className={styles.bottomLinks}>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>

      {Array.from({ length: 22 }).map((_, i) => (
        <span key={i} className={styles.mateSpark} data-mate-spark aria-hidden="true" />
      ))}

    </footer>
  );
}
