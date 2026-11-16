// ============================================================
// GSAP — single registration point (client-only).
// Plugins are imported per-file to keep the bundle small.
// Never touches window/document at module scope on the server.
// ============================================================
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { useGSAP } from "@gsap/react";

let registered = false;

export function registerGSAP() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, useGSAP);
  gsap.defaults({ ease: "power3.out", duration: 0.8 });
  ScrollTrigger.config({ ignoreMobileResize: true });
  registered = true;
  watchLayoutShifts();
}

/**
 * Keeps every ScrollTrigger in sync with the real page height.
 * CMS data, social embeds (X/TikTok/IG), web fonts and lazy images all grow
 * the document *after* triggers were measured; without a refresh, every
 * trigger below the change fires late (content stays hidden, the knight lags).
 * One ResizeObserver on <body>, debounced, and it ignores the height changes
 * caused by ScrollTrigger's own pin spacers (no refresh loop).
 */
function watchLayoutShifts() {
  if (typeof ResizeObserver === "undefined") return;
  const doc = document.documentElement;
  let measured = doc.scrollHeight;
  ScrollTrigger.addEventListener("refresh", () => {
    measured = doc.scrollHeight;
  });
  const check = () => {
    if (Math.abs(doc.scrollHeight - measured) > 2) scheduleRefresh(220);
  };
  const start = () => {
    if (!document.body) return;
    new ResizeObserver(check).observe(document.body);
    document.fonts?.ready.then(check).catch(() => {});
    window.addEventListener("load", check, { once: true });
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}

registerGSAP();

/** Shared media queries for gsap.matchMedia(). */
export const MQ = {
  desktop: "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 899.98px) and (prefers-reduced-motion: no-preference)",
  motion: "(prefers-reduced-motion: no-preference)",
  reduce: "(prefers-reduced-motion: reduce)",
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(MQ.reduce).matches;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced ScrollTrigger.refresh() — safe to call many times. */
export function scheduleRefresh(delay = 120) {
  if (typeof window === "undefined") return;
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    ScrollTrigger.refresh();
  }, delay);
}

/**
 * Calls ScrollTrigger.refresh() once images inside `root` finish loading
 * (prevents stale trigger positions → keeps CLS ~0 for pinned/scrubbed parts).
 * Returns a cleanup function.
 */
export function refreshOnImages(root: ParentNode | null | undefined): () => void {
  if (!root || typeof window === "undefined") return () => {};
  const imgs = Array.from(root.querySelectorAll("img")).filter((img) => !img.complete);
  if (imgs.length === 0) return () => {};
  const onDone = () => scheduleRefresh();
  imgs.forEach((img) => {
    img.addEventListener("load", onDone, { once: true });
    img.addEventListener("error", onDone, { once: true });
  });
  return () => {
    imgs.forEach((img) => {
      img.removeEventListener("load", onDone);
      img.removeEventListener("error", onDone);
    });
  };
}

export { gsap, ScrollTrigger, MotionPathPlugin, useGSAP };
