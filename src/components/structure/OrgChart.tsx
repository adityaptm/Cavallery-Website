"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import styles from "./OrgChart.module.css";
import {
  StructureNode,
  StructureSettings,
  TreeNode,
} from "@/lib/structure";

// Font serif untuk judul & sans-serif untuk kartu
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cormorant",
  display: "swap",
  fallback: ["Playfair Display", "Georgia", "serif"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
  fallback: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
});

export interface OrgChartProps {
  initialData?: {
    tree: TreeNode | null;
    nodes: StructureNode[];
    settings: StructureSettings;
  };
  refreshKey?: number;
}

// Dimensi standar
const CARD_W = 182;
const CARD_H = 56;
const ROOT_W = 250;
const ROOT_H = 68;
const GAP_X = 14;
const LEVEL_GAP = 92;

interface LayoutCard {
  id: number;
  node: StructureNode;
  x: number;
  y: number;
  w: number;
  h: number;
  accentColor: string;
  isRoot?: boolean;
}

interface ConnectorLine {
  id: string;
  fromId: number;
  toId: number;
  path: string;
  color: string;
}

function getInitials(name: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function splitLabel(label: string): [string, string] | [string] {
  if (label.length <= 18) return [label];
  const words = label.split(" ");
  if (words.length === 1) return [label];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export default function OrgChart({ initialData, refreshKey = 0 }: OrgChartProps) {
  const [data, setData] = useState<{
    tree: TreeNode | null;
    nodes: StructureNode[];
    settings: StructureSettings;
  } | null>(initialData || null);

  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  // Interaktivitas
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Ambil data dari API publik
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/structure", { cache: "no-store" });
      const json = await res.json();
      if (json.status && json.tree) {
        setData({
          tree: json.tree,
          nodes: json.nodes || [],
          settings: json.settings || {
            chart_title: "Cavallery's Castle Structure",
            logo_url: "/uploads/cavallery/images/2026/10/1792248958349_logo_struktur.png",
          },
        });
      } else {
        setError(json.message || "Bagan belum memiliki data");
      }
    } catch (e: any) {
      setError("Gagal memuat struktur organisasi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Kalkulasi Pohon & Layout SVG
  const layout = useMemo(() => {
    if (!data || !data.tree) return null;

    const cards: LayoutCard[] = [];
    const lines: ConnectorLine[] = [];
    const parentMap = new Map<number, number>();
    const childrenMap = new Map<number, number[]>();

    for (const n of data.nodes) {
      if (n.parent_id !== null) {
        parentMap.set(n.id, n.parent_id);
        const arr = childrenMap.get(n.parent_id) || [];
        arr.push(n.id);
        childrenMap.set(n.parent_id, arr);
      }
    }

    const root = data.tree;

    // Pisahkan anak-anak langsung root menjadi Leader vs Unit
    const rootLeaders: TreeNode[] = [];
    const rootUnits: TreeNode[] = [];

    for (const child of root.children) {
      if (child.node_type === "leader") {
        rootLeaders.push(child);
      } else {
        rootUnits.push(child);
      }
    }
    // Urutkan leaders dan units berdasarkan sort_order
    rootLeaders.sort((a, b) => a.sort_order - b.sort_order);
    rootUnits.sort((a, b) => a.sort_order - b.sort_order);

    // Fungsi rekursif menghitung lebar subtree untuk unit dan anaknya
    function computeSubtreeWidth(node: TreeNode): number {
      const normalChildren = node.children || [];
      const belowChildren = node.belowChildren || [];

      let normalW = 0;
      if (normalChildren.length > 0) {
        const sum = normalChildren.reduce((acc, c) => acc + computeSubtreeWidth(c), 0);
        normalW = sum + (normalChildren.length - 1) * GAP_X;
      }

      let belowW = 0;
      if (belowChildren.length > 0) {
        const sum = belowChildren.reduce((acc, c) => acc + computeSubtreeWidth(c), 0);
        belowW = sum + (belowChildren.length - 1) * GAP_X;
      }

      return Math.max(CARD_W, normalW, belowW);
    }

    // Hitung alokasi lebar untuk setiap unit di baris utama
    const unitWidths = rootUnits.map((u) => computeSubtreeWidth(u));
    const totalUnitsWidth =
      unitWidths.reduce((a, b) => a + b, 0) + Math.max(0, rootUnits.length - 1) * GAP_X;

    // Lebar bagian leader
    const leadersWidth =
      rootLeaders.length > 0
        ? rootLeaders.length * CARD_W + (rootLeaders.length - 1) * GAP_X
        : 0;

    const totalWidth = Math.max(totalUnitsWidth + 80, leadersWidth + 80, ROOT_W + 80);
    const centerX = totalWidth / 2;

    // 1. Letakkan Root Card
    const rootY = 24;
    cards.push({
      id: root.id,
      node: root,
      x: centerX - ROOT_W / 2,
      y: rootY,
      w: ROOT_W,
      h: ROOT_H,
      accentColor: "#8c5a43",
      isRoot: true,
    });

    // 2. Letakkan Leaders (Ketua & Wakil Ketua) tepat di bawah root
    let leadersBottomY = rootY + ROOT_H;
    let leaderMidX = centerX;

    if (rootLeaders.length > 0) {
      const leadersY = rootY + ROOT_H + 46;
      const startX = centerX - leadersWidth / 2;

      rootLeaders.forEach((leader, idx) => {
        const lx = startX + idx * (CARD_W + GAP_X);
        cards.push({
          id: leader.id,
          node: leader,
          x: lx,
          y: leadersY,
          w: CARD_W,
          h: CARD_H,
          accentColor: "#8c5a43",
        });

        // Garis dari root ke leader
        const rootBottomX = centerX;
        const rootBottomY = rootY + ROOT_H;
        const leaderTopX = lx + CARD_W / 2;
        const leaderTopY = leadersY;

        lines.push({
          id: `line-root-${leader.id}`,
          fromId: root.id,
          toId: leader.id,
          path: `M ${rootBottomX} ${rootBottomY} L ${rootBottomX} ${leadersY - 20} L ${leaderTopX} ${leadersY - 20} L ${leaderTopX} ${leaderTopY}`,
          color: "#8c5a43",
        });
      });

      leadersBottomY = leadersY + CARD_H;
      leaderMidX = centerX;
    }

    // 3. Letakkan baris Unit
    const unitsRowY = leadersBottomY + 70;
    let currentUnitX = (totalWidth - totalUnitsWidth) / 2;
    let maxOverallY = unitsRowY + CARD_H;

    // Rekursif layout anak-anak di bawah sebuah unit
    function layoutSubtree(
      node: TreeNode,
      allocatedX: number,
      allocatedW: number,
      currentY: number,
      inheritedAccent: string
    ): number {
      const nodeCenterX = allocatedX + allocatedW / 2;
      const nodeX = nodeCenterX - CARD_W / 2;
      const effectiveAccent = node.node_type === "unit" ? (node.accent_color || inheritedAccent) : inheritedAccent;

      cards.push({
        id: node.id,
        node,
        x: nodeX,
        y: currentY,
        w: CARD_W,
        h: CARD_H,
        accentColor: effectiveAccent,
      });

      let localMaxY = currentY + CARD_H;

      const normalChildren = node.children || [];
      const belowChildren = node.belowChildren || [];

      // Layout Normal Children
      if (normalChildren.length > 0) {
        const childY = currentY + LEVEL_GAP;
        const widths = normalChildren.map((c) => computeSubtreeWidth(c));
        const totalChildW =
          widths.reduce((a, b) => a + b, 0) + (normalChildren.length - 1) * GAP_X;
        let startChildX = nodeCenterX - totalChildW / 2;

        const childCenterXs: number[] = [];

        normalChildren.forEach((child, idx) => {
          const w = widths[idx];
          const cCenterX = startChildX + w / 2;
          childCenterXs.push(cCenterX);

          const childBottomY = layoutSubtree(child, startChildX, w, childY, effectiveAccent);
          localMaxY = Math.max(localMaxY, childBottomY);

          startChildX += w + GAP_X;
        });

        // Bus connector line dari parent ke semua normal children
        const busY = currentY + CARD_H + 26;
        const minChildX = Math.min(...childCenterXs);
        const maxChildX = Math.max(...childCenterXs);

        // Garis turun dari parent ke bus
        lines.push({
          id: `bus-stem-${node.id}`,
          fromId: node.id,
          toId: normalChildren[0].id,
          path: `M ${nodeCenterX} ${currentY + CARD_H} L ${nodeCenterX} ${busY}`,
          color: effectiveAccent,
        });

        // Garis horizontal bus
        if (normalChildren.length > 1) {
          lines.push({
            id: `bus-bar-${node.id}`,
            fromId: node.id,
            toId: normalChildren[0].id,
            path: `M ${minChildX} ${busY} L ${maxChildX} ${busY}`,
            color: effectiveAccent,
          });
        }

        // Garis turun dari bus ke setiap child
        normalChildren.forEach((child, idx) => {
          const cX = childCenterXs[idx];
          lines.push({
            id: `line-${node.id}-${child.id}`,
            fromId: node.id,
            toId: child.id,
            path: `M ${cX} ${busY} L ${cX} ${childY}`,
            color: effectiveAccent,
          });
        });
      }

      // Layout Below Children (Diletakkan di bawah semua normal descendants)
      if (belowChildren.length > 0) {
        const belowY = localMaxY + 36;
        const widths = belowChildren.map((c) => computeSubtreeWidth(c));
        const totalBelowW =
          widths.reduce((a, b) => a + b, 0) + (belowChildren.length - 1) * GAP_X;
        let startBelowX = nodeCenterX - totalBelowW / 2;

        const belowCenterXs: number[] = [];

        belowChildren.forEach((child, idx) => {
          const w = widths[idx];
          const bCenterX = startBelowX + w / 2;
          belowCenterXs.push(bCenterX);

          const childBottomY = layoutSubtree(child, startBelowX, w, belowY, effectiveAccent);
          localMaxY = Math.max(localMaxY, childBottomY);

          startBelowX += w + GAP_X;
        });

        // Bus connector untuk below children
        const belowBusY = belowY - 20;
        const minBelowX = Math.min(...belowCenterXs);
        const maxBelowX = Math.max(...belowCenterXs);

        // Garis turun dari bagian tengah parent/normal descendants ke below bus
        lines.push({
          id: `below-stem-${node.id}`,
          fromId: node.id,
          toId: belowChildren[0].id,
          path: `M ${nodeCenterX} ${localMaxY - CARD_H - 10} L ${nodeCenterX} ${belowBusY}`,
          color: effectiveAccent,
        });

        if (belowChildren.length > 1) {
          lines.push({
            id: `below-bar-${node.id}`,
            fromId: node.id,
            toId: belowChildren[0].id,
            path: `M ${minBelowX} ${belowBusY} L ${maxBelowX} ${belowBusY}`,
            color: effectiveAccent,
          });
        }

        belowChildren.forEach((child, idx) => {
          const bX = belowCenterXs[idx];
          lines.push({
            id: `line-${node.id}-${child.id}`,
            fromId: node.id,
            toId: child.id,
            path: `M ${bX} ${belowBusY} L ${bX} ${belowY}`,
            color: effectiveAccent,
          });
        });
      }

      return localMaxY;
    }

    // Eksekusi layout tiap unit
    rootUnits.forEach((unit, idx) => {
      const w = unitWidths[idx];
      const unitCenterX = currentUnitX + w / 2;
      const unitAccent = unit.accent_color || "#3f7d6e";

      const unitMaxY = layoutSubtree(unit, currentUnitX, w, unitsRowY, unitAccent);
      maxOverallY = Math.max(maxOverallY, unitMaxY);

      // Garis kurva vertikal cubic bezier dari titik tengah leader ke unit
      const startX = leaderMidX;
      const startY = leadersBottomY;
      const endX = unitCenterX;
      const endY = unitsRowY;
      const cp1X = startX;
      const cp1Y = startY + (endY - startY) * 0.45;
      const cp2X = endX;
      const cp2Y = endY - (endY - startY) * 0.45;

      lines.push({
        id: `curve-leader-unit-${unit.id}`,
        fromId: rootLeaders[0]?.id || root.id,
        toId: unit.id,
        path: `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`,
        color: unitAccent,
      });

      currentUnitX += w + GAP_X;
    });

    const totalHeight = maxOverallY + 60;

    return {
      cards,
      lines,
      totalWidth,
      totalHeight,
      parentMap,
      childrenMap,
    };
  }, [data]);

  // Sorot Jalur (Highlighting Ancestors + Descendants)
  const highlightedIds = useMemo(() => {
    const activeId = hoveredId ?? selectedId;
    if (!activeId || !layout) return null;

    const ids = new Set<number>();
    ids.add(activeId);

    // Keturunan (descendants)
    const queue = [activeId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const kids = layout.childrenMap.get(cur) || [];
      for (const k of kids) {
        ids.add(k);
        queue.push(k);
      }
    }

    // Leluhur ke arah root (ancestors)
    let p = layout.parentMap.get(activeId);
    while (p !== undefined) {
      ids.add(p);
      p = layout.parentMap.get(p);
    }

    return ids;
  }, [hoveredId, selectedId, layout]);

  // Skala awal responsif & auto center
  useEffect(() => {
    if (!layout || !viewportRef.current) return;

    const vpWidth = viewportRef.current.clientWidth;
    const initialScale = vpWidth < 700 ? 0.7 : 1;
    setScale(initialScale);

    // Pusatkan tepat di bawah Princess root
    const centerX = layout.totalWidth / 2;
    const offsetX = vpWidth / 2 - centerX * initialScale;
    const offsetY = 16;
    setPan({ x: offsetX, y: offsetY });
  }, [layout]);

  // Zoom handlers (menjaga titik tengah tampilan)
  const handleZoom = (factor: number) => {
    if (!viewportRef.current || !layout) return;
    const vp = viewportRef.current;
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;

    setScale((prevScale) => {
      const nextScale = Math.min(2.0, Math.max(0.2, prevScale * factor));
      // Pertahankan pusat
      setPan((prevPan) => {
        const centerCoordX = (vpW / 2 - prevPan.x) / prevScale;
        const centerCoordY = (vpH / 2 - prevPan.y) / prevScale;
        return {
          x: vpW / 2 - centerCoordX * nextScale,
          y: vpH / 2 - centerCoordY * nextScale,
        };
      });
      return nextScale;
    });
  };

  const handleFitScreen = () => {
    if (!viewportRef.current || !layout) return;
    const vp = viewportRef.current;
    const scaleX = (vp.clientWidth - 40) / layout.totalWidth;
    const scaleY = (vp.clientHeight - 40) / layout.totalHeight;
    const nextScale = Math.min(1.2, Math.max(0.25, Math.min(scaleX, scaleY)));
    setScale(nextScale);
    setPan({
      x: (vp.clientWidth - layout.totalWidth * nextScale) / 2,
      y: 20,
    });
  };

  // Drag to pan
  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const onMouseUp = () => setIsDragging(false);

  // Touch pan
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setTouchStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - touchStart.x,
        y: e.touches[0].clientY - touchStart.y,
      });
    }
  };

  if (loading) {
    return (
      <div className={`${styles.container} ${cormorant.variable} ${dmSans.variable}`}>
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <span>Memuat bagan struktur kepengurusan…</span>
        </div>
      </div>
    );
  }

  if (error || !data || !layout) {
    return (
      <div className={`${styles.container} ${cormorant.variable} ${dmSans.variable}`}>
        <div className={styles.errorOverlay}>
          <i className="bx bx-error-circle" style={{ fontSize: "2.5rem", color: "#e06c75" }} />
          <span>{error || "Tidak ada data struktur"}</span>
        </div>
      </div>
    );
  }

  const logoSrc = data.settings.logo_url || "/uploads/cavallery/images/2026/10/1792248958349_logo_struktur.png";

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${cormorant.variable} ${dmSans.variable}`}
      role="region"
      aria-label="Bagan Struktur Organisasi Cavallery"
    >
      {/* Header: Logo & Title di atas bagan */}
      <header className={styles.header}>
        {!logoError && logoSrc && (
          <div className={styles.logoWrapper}>
            <Image
              src={logoSrc}
              alt="Logo Cavallery"
              width={200}
              height={140}
              unoptimized
              className={styles.logoImg}
              onError={() => setLogoError(true)}
              priority
            />
          </div>
        )}
        <h2 className={styles.title}>{data.settings.chart_title || "Cavallery's Castle Structure"}</h2>
      </header>

      {/* Viewport SVG Interaktif */}
      <div
        ref={viewportRef}
        className={styles.chartViewport}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onClick={(e) => {
          // Klik di background mereset seleksi
          if (e.target === viewportRef.current || (e.target as HTMLElement).tagName === "svg") {
            setSelectedId(null);
          }
        }}
      >
        <svg
          width="100%"
          height="100%"
          aria-label="Diagram pohon struktur kepengurusan"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Pola titik halus (dot pattern) */}
            <pattern id="org-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.1" fill="var(--chart-dot)" />
            </pattern>
            {/* Filter bayangan halus kartu */}
            <filter id="card-shadow" x="-8%" y="-12%" width="120%" height="130%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.06" />
            </filter>
            <filter id="root-shadow" x="-10%" y="-15%" width="125%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* Background dots yang bergerak saat pan */}
          <rect width="100%" height="100%" fill="url(#org-dots)" pointerEvents="none" />

          {/* Group Transform Utama: Skala & Pan */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            {/* 1. Gambar Semua Garis Penghubung */}
            <g className="connector-lines">
              {layout.lines.map((l) => {
                const isLineActive =
                  highlightedIds &&
                  highlightedIds.has(l.fromId) &&
                  highlightedIds.has(l.toId);
                const isDimmed = highlightedIds && !isLineActive;

                return (
                  <path
                    key={l.id}
                    d={l.path}
                    fill="none"
                    stroke={l.color}
                    strokeWidth={isLineActive ? 2.8 : 1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isDimmed ? 0.1 : isLineActive ? 1 : 0.45}
                    style={{
                      transition: "opacity 0.25s ease, stroke-width 0.25s ease",
                    }}
                  />
                );
              })}
            </g>

            {/* 2. Gambar Semua Kartu Node */}
            <g className="node-cards">
              {layout.cards.map((c) => {
                const isNodeActive = highlightedIds ? highlightedIds.has(c.id) : true;
                const isSelected = selectedId === c.id;
                const isHovered = hoveredId === c.id;
                const opacity = highlightedIds && !isNodeActive ? 0.22 : 1;

                if (c.isRoot) {
                  // KARTU ROOT (Cavallery's Princess)
                  return (
                    <g
                      key={c.id}
                      transform={`translate(${c.x}, ${c.y})`}
                      opacity={opacity}
                      tabIndex={0}
                      role="button"
                      aria-label={`${c.node.role_label}: ${c.node.person_name}`}
                      style={{
                        cursor: "pointer",
                        transition: "opacity 0.25s ease, transform 0.2s ease",
                        outline: "none",
                      }}
                      onMouseEnter={() => setHoveredId(c.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId((prev) => (prev === c.id ? null : c.id));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId((prev) => (prev === c.id ? null : c.id));
                        }
                      }}
                    >
                      <rect
                        width={c.w}
                        height={c.h}
                        rx="10"
                        ry="10"
                        fill="var(--chart-card-bg)"
                        stroke={isSelected ? "#8c5a43" : "var(--chart-border)"}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        filter="url(#root-shadow)"
                      />
                      {/* Banner aksen tipis atas */}
                      <path
                        d={`M 10 0 L ${c.w - 10} 0 Q ${c.w} 0 ${c.w} 10 L ${c.w} 4 L 0 4 L 0 10 Q 0 0 10 0 Z`}
                        fill="#8c5a43"
                      />
                      {c.node.avatar_url ? (
                        <>
                          <clipPath id={`avatar-clip-${c.id}`}>
                            <circle cx="36" cy={c.h / 2} r="18" />
                          </clipPath>
                          <image
                            href={c.node.avatar_url}
                            x="18"
                            y={c.h / 2 - 18}
                            width="36"
                            height="36"
                            clipPath={`url(#avatar-clip-${c.id})`}
                            preserveAspectRatio="xMidYMid slice"
                          />
                          <circle
                            cx="36"
                            cy={c.h / 2}
                            r="18"
                            fill="none"
                            stroke="#8c5a43"
                            strokeWidth="2"
                          />
                          {/* Role Label */}
                          <text
                            x="66"
                            y={27}
                            fontFamily="var(--font-dm-sans), sans-serif"
                            fontSize="10px"
                            fontWeight="700"
                            letterSpacing="1.5px"
                            fill="#8c5a43"
                          >
                            {c.node.role_label.toUpperCase()}
                          </text>
                          {/* Person Name */}
                          <text
                            x="66"
                            y={49}
                            fontFamily="var(--font-cormorant), 'Playfair Display', serif"
                            fontSize="16px"
                            fontWeight="700"
                            fill="var(--chart-text)"
                          >
                            {c.node.person_name || ""}
                          </text>
                        </>
                      ) : (
                        <>
                          {/* Role Label */}
                          <text
                            x={c.w / 2}
                            y={24}
                            textAnchor="middle"
                            fontFamily="var(--font-dm-sans), sans-serif"
                            fontSize="10.5px"
                            fontWeight="700"
                            letterSpacing="1.8px"
                            fill="#8c5a43"
                          >
                            {c.node.role_label.toUpperCase()}
                          </text>
                          {/* Person Name */}
                          <text
                            x={c.w / 2}
                            y={48}
                            textAnchor="middle"
                            fontFamily="var(--font-cormorant), 'Playfair Display', serif"
                            fontSize="16.5px"
                            fontWeight="700"
                            fill="var(--chart-text)"
                          >
                            {c.node.person_name || ""}
                          </text>
                        </>
                      )}
                    </g>
                  );
                }

                if (c.node.node_type === "unit" || (c.node.node_type === "group" && !c.node.person_name)) {
                  // KARTU UNIT / GROUP (Kategori tanpa nama orang)
                  const [line1, line2] = splitLabel(c.node.role_label);

                  return (
                    <g
                      key={c.id}
                      transform={`translate(${c.x}, ${c.y})`}
                      opacity={opacity}
                      tabIndex={0}
                      role="button"
                      aria-label={c.node.role_label}
                      style={{
                        cursor: "pointer",
                        transition: "opacity 0.25s ease, transform 0.2s ease",
                        outline: "none",
                      }}
                      onMouseEnter={() => setHoveredId(c.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId((prev) => (prev === c.id ? null : c.id));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId((prev) => (prev === c.id ? null : c.id));
                        }
                      }}
                    >
                      <rect
                        width={c.w}
                        height={c.h}
                        rx="8"
                        ry="8"
                        fill={`color-mix(in srgb, ${c.accentColor} 9%, var(--chart-card-bg))`}
                        stroke={isSelected || isHovered ? c.accentColor : "var(--chart-border)"}
                        strokeWidth={isSelected ? 2.2 : 1.2}
                        filter="url(#card-shadow)"
                      />
                      {/* Bar aksen atas untuk unit */}
                      <rect
                        x="0"
                        y="0"
                        width={c.w}
                        height="3.5"
                        rx="1"
                        fill={c.accentColor}
                      />
                      {line2 ? (
                        <>
                          <text
                            x={c.w / 2}
                            y={24}
                            textAnchor="middle"
                            fontFamily="var(--font-dm-sans), sans-serif"
                            fontSize="12.5px"
                            fontWeight="700"
                            fill="var(--chart-text)"
                          >
                            {line1}
                          </text>
                          <text
                            x={c.w / 2}
                            y={40}
                            textAnchor="middle"
                            fontFamily="var(--font-dm-sans), sans-serif"
                            fontSize="12.5px"
                            fontWeight="700"
                            fill="var(--chart-text)"
                          >
                            {line2}
                          </text>
                        </>
                      ) : (
                        <text
                          x={c.w / 2}
                          y={33}
                          textAnchor="middle"
                          fontFamily="var(--font-dm-sans), sans-serif"
                          fontSize="13px"
                          fontWeight="700"
                          fill="var(--chart-text)"
                        >
                          {line1}
                        </text>
                      )}
                    </g>
                  );
                }

                // KARTU MEMBER / LEADER
                const initials = getInitials(c.node.person_name);
                const hasPerson = Boolean(c.node.person_name);

                return (
                  <g
                    key={c.id}
                    transform={`translate(${c.x}, ${c.y})`}
                    opacity={opacity}
                    tabIndex={0}
                    role="button"
                    aria-label={`${c.node.role_label}${c.node.person_name ? `: ${c.node.person_name}` : ""}`}
                    style={{
                      cursor: "pointer",
                      transition: "opacity 0.25s ease, transform 0.2s ease",
                      outline: "none",
                    }}
                    onMouseEnter={() => setHoveredId(c.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId((prev) => (prev === c.id ? null : c.id));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId((prev) => (prev === c.id ? null : c.id));
                      }
                    }}
                  >
                    {/* Background card */}
                    <rect
                      width={c.w}
                      height={c.h}
                      rx="8"
                      ry="8"
                      fill="var(--chart-card-bg)"
                      stroke={isSelected || isHovered ? c.accentColor : "var(--chart-border)"}
                      strokeWidth={isSelected ? 2 : 1}
                      filter="url(#card-shadow)"
                    />
                    {/* Bar warna aksen 4px di sisi kiri */}
                    <rect
                      x="0"
                      y="0"
                      width="4"
                      height={c.h}
                      rx="2"
                      fill={c.accentColor}
                    />

                    {/* Lingkaran inisial atau Foto Profil */}
                    {c.node.avatar_url ? (
                      <g>
                        <clipPath id={`avatar-clip-${c.id}`}>
                          <circle cx="25" cy={c.h / 2} r="13" />
                        </clipPath>
                        <image
                          href={c.node.avatar_url}
                          x="12"
                          y={c.h / 2 - 13}
                          width="26"
                          height="26"
                          clipPath={`url(#avatar-clip-${c.id})`}
                          preserveAspectRatio="xMidYMid slice"
                        />
                        <circle
                          cx="25"
                          cy={c.h / 2}
                          r="13"
                          fill="none"
                          stroke={c.accentColor}
                          strokeWidth="1.5"
                        />
                      </g>
                    ) : (
                      <>
                        <circle
                          cx="25"
                          cy={c.h / 2}
                          r="13"
                          fill={`color-mix(in srgb, ${c.accentColor} 16%, transparent)`}
                        />
                        <text
                          x="25"
                          y={c.h / 2 + 4}
                          textAnchor="middle"
                          fontFamily="var(--font-dm-sans), sans-serif"
                          fontSize="10px"
                          fontWeight="700"
                          fill={c.accentColor}
                        >
                          {initials || "•"}
                        </text>
                      </>
                    )}

                    {/* Teks Jabatan & Nama */}
                    {hasPerson ? (
                      <>
                        <text
                          x="46"
                          y="22"
                          fontFamily="var(--font-dm-sans), sans-serif"
                          fontSize="10px"
                          fontWeight="600"
                          letterSpacing="0.4px"
                          fill="var(--chart-muted)"
                        >
                          {c.node.role_label.length > 20
                            ? c.node.role_label.substring(0, 19) + "…"
                            : c.node.role_label}
                        </text>
                        <text
                          x="46"
                          y="40"
                          fontFamily="var(--font-dm-sans), sans-serif"
                          fontSize="13.5px"
                          fontWeight="700"
                          fill="var(--chart-text)"
                        >
                          {c.node.person_name!.length > 17
                            ? c.node.person_name!.substring(0, 16) + "…"
                            : c.node.person_name}
                        </text>
                      </>
                    ) : (
                      <text
                        x="46"
                        y="33"
                        fontFamily="var(--font-dm-sans), sans-serif"
                        fontSize="12.5px"
                        fontWeight="600"
                        fill="var(--chart-text)"
                      >
                        {c.node.role_label.length > 20
                          ? c.node.role_label.substring(0, 19) + "…"
                          : c.node.role_label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Toolbar Zoom & Fit */}
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => handleZoom(1.2)}
            title="Zoom In"
            aria-label="Perbesar"
          >
            +
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => handleZoom(0.8)}
            title="Zoom Out"
            aria-label="Perkecil"
          >
            −
          </button>
          <button
            type="button"
            className={styles.fitBtn}
            onClick={handleFitScreen}
            title="Pas Layar"
            aria-label="Sesuaikan ke Layar"
          >
            Pas layar
          </button>
        </div>
      </div>
    </div>
  );
}
