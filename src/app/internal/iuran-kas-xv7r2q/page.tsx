"use client";

import { useEffect, useState } from "react";
import styles from "@/app/internal/dashboard-admin-xv7r2q/keanggotaan/page.module.css";
import ThemeToggle from "@/components/ThemeToggle";

function normalizeProofUrl(url?: string | null): string {
  if (!url) return "";
  let u = url.trim();
  // Google Drive → direct image
  const driveMatch = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/);
  if (driveMatch) return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
  // Strip origin
  try {
    const parsed = new URL(u);
    if (parsed.hostname === "localhost" || parsed.hostname === "cavallery.id") {
      u = parsed.pathname + parsed.search;
    }
  } catch {}
  if (!u.startsWith("http") && !u.startsWith("data:") && !u.startsWith("/")) u = "/" + u;
  return u;
}

function parseNotaList(urlOrUrls: any): string[] {
  if (!urlOrUrls) return [];
  if (Array.isArray(urlOrUrls)) return urlOrUrls.map(String).filter(Boolean);
  const s = String(urlOrUrls).trim();
  if (s.startsWith("[")) {
    try { return JSON.parse(s).map(String).filter(Boolean); } catch {}
  }
  if (s.includes(",")) return s.split(",").map((x: string) => x.trim()).filter(Boolean);
  return s ? [s] : [];
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const MONTH_NAMES_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const SUPPORTED_YEARS = [2024, 2025, 2026, 2027, 2028, 2029];

function formatRupiah(amount: number) {
  return `Rp ${Number(amount || 0).toLocaleString("id-ID")}`;
}

export default function PublicKasMatrixPage() {
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [matrixData, setMatrixData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"matriks" | "pengeluaran" | "pemasukan">("matriks");
  const [pengeluaranKategori, setPengeluaranKategori] = useState<string>("semua");
  const [pemasukanKategori, setPemasukanKategori] = useState<string>("semua");
  const [selectedNotaUrl, setSelectedNotaUrl] = useState<string | null>(null);
  const [selectedNotaList, setSelectedNotaList] = useState<string[]>([]);

  const fetchMatrix = async (yr: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/internal/kas-matrix?tahun=${yr}`);
      const json = await res.json();
      if (json.status) setMatrixData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix(tahun);
  }, [tahun]);

  // Filter Matriks Anggota
  const filteredRows = (matrixData?.matrixRows || []).filter((r: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.noAnggota || "").toLowerCase().includes(q) ||
      (r.nama || "").toLowerCase().includes(q)
    );
  });

  const totalLunasTahun = filteredRows.reduce((sum: number, r: any) => sum + (Number(r.totalKas) || 0), 0);
  const totalBelumLunasTahun = filteredRows.reduce((sum: number, r: any) => sum + (Number(r.totalBelumLunas) || 0), 0);

  // Filter Pengeluaran Kas
  const pengeluaranList: any[] = matrixData?.pengeluaranList || [];
  const filteredPengeluaran = pengeluaranList.filter((p: any) => {
    const matchCat = pengeluaranKategori === "semua" || p.kategori === pengeluaranKategori;
    if (!matchCat) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.keperluan || "").toLowerCase().includes(q) ||
      (p.pj_nama || "").toLowerCase().includes(q) ||
      (p.catatan || "").toLowerCase().includes(q) ||
      (p.kategori || "").toLowerCase().includes(q)
    );
  });

  // Filter Pemasukan Eksternal Kas
  const pemasukanList: any[] = matrixData?.pemasukanList || [];
  const filteredPemasukan = pemasukanList.filter((p: any) => {
    const matchCat = pemasukanKategori === "semua" || p.kategori === pemasukanKategori;
    if (!matchCat) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.sumber || "").toLowerCase().includes(q) ||
      (p.pj_nama || "").toLowerCase().includes(q) ||
      (p.catatan || "").toLowerCase().includes(q) ||
      (p.kategori || "").toLowerCase().includes(q)
    );
  });

  // ── Kalkulasi Keuangan (selalu keseluruhan tahun — All Time)
  const allTimeIuranKas           = Number(matrixData?.allTimeIuranKas ?? matrixData?.grandTotalPemasukan ?? 0);
  const allTimePemasukanEksternal = Number(matrixData?.allTimePemasukanEksternal ?? 0);
  const allTimePengeluaran        = Number(matrixData?.allTimePengeluaran ?? matrixData?.totalPengeluaran ?? 0);
  const saldoKasSaatIni           = allTimeIuranKas + allTimePemasukanEksternal - allTimePengeluaran;

  // Total pengeluaran per-tahun yang dipilih (untuk label di tab pengeluaran)
  const totalPengeluaranTercatat  = Number(matrixData?.totalPengeluaran ?? 0);
  // Total pemasukan eksternal per-tahun yang dipilih
  const totalPemasukanEksternalTercatat = Number(matrixData?.totalPemasukanEksternal ?? 0);

  // Daftar Kategori Unik untuk Filter
  const uniqueCategories = Array.from(new Set(pengeluaranList.map((p) => p.kategori).filter(Boolean)));
  const uniquePemasukanCategories = Array.from(new Set(pemasukanList.map((p) => p.kategori).filter(Boolean)));

  return (
    <div className={styles.page} style={{ paddingTop: "calc(var(--nav-h, 72px) + 24px)" }}>
      <div className={styles.container}>
        {/* ── TOP HEADER ── */}
        <div className={styles.topHeader}>
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--gold)",
                background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                padding: "4px 12px",
                borderRadius: 8,
                border: "1px solid var(--border-gold)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <i className="bx bx-shield-quarter" />
              Internal Dokumen · Cavallery Fanbase
            </div>
            <h1 className={styles.pageTitle} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <i className="bx bx-spreadsheet" style={{ color: "var(--gold)", fontSize: "2rem" }} />
              Transparansi &amp; Laporan Kas Cavallery {tahun}
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--fg-muted)" }}>
              Halaman ini bersifat <strong style={{ color: "var(--gold)" }}>read-only</strong>. 
              Menampilkan matriks iuran bulanan dan laporan penggunaan belanja kas secara transparan dari pencatatan admin.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
          </div>
        </div>

        {/* ── RINGKASAN KEUANGAN KAS ── */}
        {matrixData && (
          <div style={{ marginBottom: 20 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, padding: "8px 14px", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <i className="bx bx-pie-chart-alt-2" style={{ color: "var(--gold)", fontSize: "1.1rem" }} />
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>Ringkasan Keuangan Kas — Keseluruhan</span>
              <span style={{ marginLeft: "auto", fontSize: "0.74rem", color: "var(--gold)", background: "color-mix(in srgb, var(--cv-orange) 10%, transparent)", padding: "4px 10px", borderRadius: 20, border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <i className="bx bx-infinite" /> Akumulasi Semua Tahun
              </span>
            </div>

            {/* Grid 5 Kartu */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>

              {/* 1. Anggota Aktif */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "18px 20px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--cv-orange)", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bx bx-user-check" style={{ fontSize: "1.1rem" }} />
                  Total Anggota Aktif
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--fg)" }}>
                  {matrixData.totalAnggota} <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--fg-muted)" }}>orang</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)", marginTop: 4 }}>Terdaftar di database fanbase</div>
              </div>

              {/* 2. Total Iuran Kas */}
              <div
                onClick={() => { setActiveTab("matriks"); setSearch(""); }}
                style={{ background: "rgba(16,185,129,0.08)", border: "1.5px solid rgba(16,185,129,0.3)", borderRadius: 16, padding: "18px 20px", cursor: "pointer", transition: "all 0.2s" }}
                title="Klik untuk melihat matriks iuran kas"
              >
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bx bx-trending-up" style={{ fontSize: "1.1rem" }} />
                  Total Iuran Kas
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "#10b981" }}>{formatRupiah(allTimeIuranKas)}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)", marginTop: 4 }}>Akumulasi seluruh iuran kas terverifikasi ↗</div>
              </div>

              {/* 3. Pemasukan Eksternal */}
              <div
                onClick={() => { setActiveTab("pemasukan"); setSearch(""); }}
                style={{ background: "color-mix(in srgb, var(--cv-orange) 8%, transparent)", border: "1.5px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)", borderRadius: 16, padding: "18px 20px", cursor: "pointer", transition: "all 0.2s" }}
                title="Klik untuk melihat rincian pemasukan eksternal"
              >
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--cv-orange)", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bx bx-log-in-circle" style={{ fontSize: "1.1rem" }} />
                  Pemasukan Eksternal
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--cv-orange)" }}>{formatRupiah(allTimePemasukanEksternal)}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)", marginTop: 4 }}>Donasi, sponsorship, penjualan merchandise ↗</div>
              </div>

              {/* 4. Total Pengeluaran */}
              <div
                onClick={() => { setActiveTab("pengeluaran"); setSearch(""); }}
                style={{ background: "color-mix(in srgb, var(--cv-orange) 8%, transparent)", border: "1.5px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)", borderRadius: 16, padding: "18px 20px", cursor: "pointer", transition: "all 0.2s" }}
                title="Klik untuk melihat rincian pengeluaran kas"
              >
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--cv-orange)", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bx bx-receipt" style={{ fontSize: "1.1rem" }} />
                  Total Pengeluaran Kas
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--cv-orange)" }}>{formatRupiah(allTimePengeluaran)}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)", marginTop: 4 }}>Total belanja operasional &amp; proyek fanbase ↗</div>
              </div>

              {/* 5. Saldo Kas Saat Ini */}
              <div style={{
                background: saldoKasSaatIni >= 0 ? "color-mix(in srgb, var(--cv-orange) 10%, transparent)" : "rgba(239,68,68,0.1)",
                border: saldoKasSaatIni >= 0 ? "1.5px solid var(--border-gold)" : "1.5px solid #ef4444",
                borderRadius: 16,
                padding: "18px 20px",
              }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--gold)", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bx bx-wallet-alt" style={{ fontSize: "1.1rem" }} />
                  Saldo Kas Saat Ini
                </div>
                <div style={{ fontSize: "1.7rem", fontWeight: 900, color: saldoKasSaatIni >= 0 ? "var(--primary)" : "#ef4444" }}>
                  {formatRupiah(saldoKasSaatIni)}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)", marginTop: 4 }}>Saldo kas bersih siap pakai untuk operasional fanbase</div>
              </div>

            </div>
          </div>
        )}


        {/* ── TAB SWITCHER UTAMA (MATRIKS vs PEMASUKAN vs PENGELUARAN) ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, borderBottom: "2px solid var(--border)", paddingBottom: 0, overflowX: "auto" }}>
          <button
            type="button"
            onClick={() => { setActiveTab("matriks"); setSearch(""); }}
            style={{
              padding: "10px 18px",
              border: "none",
              borderBottom: activeTab === "matriks" ? "3px solid var(--gold)" : "3px solid transparent",
              background: "transparent",
              color: activeTab === "matriks" ? "var(--primary)" : "var(--fg-muted)",
              fontWeight: activeTab === "matriks" ? 800 : 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
              marginBottom: -2,
              whiteSpace: "nowrap",
            }}
          >
            <i className="bx bx-grid-alt" style={{ fontSize: "1.1rem" }} />
            Matriks Iuran Kas Bulanan
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("pemasukan"); setSearch(""); }}
            style={{
              padding: "10px 18px",
              border: "none",
              borderBottom: activeTab === "pemasukan" ? "3px solid var(--cv-orange)" : "3px solid transparent",
              background: "transparent",
              color: activeTab === "pemasukan" ? "var(--cv-orange)" : "var(--fg-muted)",
              fontWeight: activeTab === "pemasukan" ? 800 : 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
              marginBottom: -2,
              whiteSpace: "nowrap",
            }}
          >
            <i className="bx bx-log-in-circle" style={{ fontSize: "1.1rem" }} />
            Pemasukan Eksternal ({pemasukanList.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab("pengeluaran"); setSearch(""); }}
            style={{
              padding: "10px 18px",
              border: "none",
              borderBottom: activeTab === "pengeluaran" ? "3px solid var(--cv-orange)" : "3px solid transparent",
              background: "transparent",
              color: activeTab === "pengeluaran" ? "var(--cv-orange)" : "var(--fg-muted)",
              fontWeight: activeTab === "pengeluaran" ? 800 : 600,
              fontSize: "0.9rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s",
              marginBottom: -2,
              whiteSpace: "nowrap",
            }}
          >
            <i className="bx bx-receipt" style={{ fontSize: "1.1rem" }} />
            Laporan Pengeluaran Kas ({pengeluaranList.length})
          </button>
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* TAB 1: MATRIKS IURAN KAS BULANAN (TABEL CENTANG) */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === "matriks" && (
          <div className={styles.sectionCard} style={{ padding: 22 }}>
            {/* Toolbar: Pemilih Tahun & Pencarian */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
                  <i className="bx bx-calendar" style={{ marginRight: 4, color: "var(--gold)" }} />
                  Tahun:
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    background: "var(--surface)",
                    borderRadius: 10,
                    padding: 4,
                    border: "1px solid var(--border)",
                    overflowX: "auto",
                    maxWidth: "calc(100vw - 100px)",
                    WebkitOverflowScrolling: "touch" as any,
                  }}
                >
                  {SUPPORTED_YEARS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setTahun(y)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: tahun === y ? "var(--gold)" : "transparent",
                        color: tahun === y ? "var(--cv-on-orange)" : "var(--fg-muted)",
                        fontWeight: tahun === y ? 900 : 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ position: "relative", flex: 1, minWidth: 180, maxWidth: 280 }}>
                <i
                  className="bx bx-search"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--fg-muted)",
                    fontSize: "1rem",
                  }}
                />
                <input
                  type="text"
                  placeholder="Cari anggota / CAVA-xxxx..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: "8px 14px 8px 36px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--fg)",
                    fontSize: "0.82rem",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Total Terbayar vs Belum Lunas Ringkas */}
            {matrixData && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 14, fontSize: "0.82rem" }}>
                <span style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <i className="bx bx-check-circle" style={{ fontSize: "1.1rem" }} />
                  Total Terbayar ({tahun}): {formatRupiah(totalLunasTahun)}
                </span>
                <span style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <i className="bx bx-error-circle" style={{ fontSize: "1.1rem" }} />
                  Total Belum Lunas ({tahun}): {formatRupiah(totalBelumLunasTahun)}
                </span>
              </div>
            )}

            {/* Subtotal Bulan Per-Kolom */}
            {matrixData && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: 6,
                  marginBottom: 16,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const count = matrixData.monthlyPaidCounts?.[m] || 0;
                  const total = matrixData.totalAnggota || 1;
                  const pct = Math.round((count / total) * 100);
                  const isCurrentMonth = m === new Date().getMonth() + 1 && tahun === new Date().getFullYear();

                  return (
                    <div
                      key={m}
                      style={{
                        padding: "8px 4px",
                        borderRadius: 8,
                        background: isCurrentMonth
                          ? "color-mix(in srgb, var(--cv-orange) 15%, transparent)"
                          : "var(--surface)",
                        border: isCurrentMonth
                          ? "1.5px solid var(--border-gold)"
                          : "1px solid var(--border)",
                        textAlign: "center",
                        minWidth: 50,
                      }}
                      title={`${MONTH_NAMES_FULL[m - 1]} ${tahun}: ${count} lunas (${pct}%)`}
                    >
                      <div
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: isCurrentMonth ? 900 : 700,
                          color: isCurrentMonth ? "var(--gold)" : "var(--fg-muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {MONTH_NAMES[m - 1]}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 900,
                          color: count > 0 ? "#10b981" : "var(--fg-muted)",
                          marginTop: 2,
                        }}
                      >
                        {count}
                      </div>
                      <div
                        style={{
                          fontSize: "0.6rem",
                          color: "var(--fg-muted)",
                          marginTop: 1,
                        }}
                      >
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tabel Matriks */}
            {loading ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem", color: "var(--gold)" }} />
                <p>Memuat data matriks kas...</p>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-search" style={{ fontSize: "2rem", color: "var(--fg-muted)" }} />
                <p>Tidak ada anggota yang cocok dengan pencarian.</p>
              </div>
            ) : (
              <div className={styles.tableWrap} style={{ maxHeight: "68vh", overflow: "auto" }}>
                <table className={styles.matrixTable}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr>
                      <th className={styles.colStickyNo} style={{ width: 44, textAlign: "center", background: "var(--surface)", color: "var(--primary)" }}>No</th>
                      <th className={styles.colStickyNoAnggota} style={{ width: 140, minWidth: 130, background: "var(--surface)", color: "var(--primary)" }}>No. Anggota</th>
                      <th className={styles.colStickyNama} style={{ minWidth: 160, background: "var(--surface)", color: "var(--primary)", borderRight: "2px solid var(--border)" }}>Nama Anggota</th>
                      {MONTH_NAMES.map((m, idx) => {
                        const mNum = idx + 1;
                        const isCurrentMonth = mNum === new Date().getMonth() + 1 && tahun === new Date().getFullYear();
                        return (
                          <th
                            key={m}
                            style={{
                              textAlign: "center",
                              width: 48,
                              minWidth: 46,
                              background: isCurrentMonth ? "color-mix(in srgb, var(--cv-orange) 15%, transparent)" : undefined,
                              color: isCurrentMonth ? "var(--gold)" : undefined,
                              fontWeight: 800,
                            }}
                          >
                            {m}
                          </th>
                        );
                      })}
                      <th style={{ textAlign: "right", minWidth: 100 }}>Total Lunas</th>
                      <th style={{ textAlign: "right", minWidth: 105, color: "#f87171" }}>Belum Lunas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r: any, idx: number) => {
                      return (
                        <tr key={r.noAnggota || idx}>
                          <td className={styles.colStickyNo} style={{ textAlign: "center", color: "var(--fg-muted)", fontSize: "0.8rem" }}>
                            {idx + 1}
                          </td>
                          <td className={styles.colStickyNoAnggota}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              {r.fotoProfil ? (
                                <img
                                  src={r.fotoProfil}
                                  alt=""
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    border: "1px solid var(--border)",
                                    flexShrink: 0,
                                  }}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                                    color: "var(--primary)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    flexShrink: 0,
                                  }}
                                >
                                  <i className="bx bx-user" />
                                </div>
                              )}
                              <span className={styles.noAnggota} style={{ fontSize: "0.78rem" }}>
                                {r.noAnggota}
                              </span>
                            </div>
                          </td>
                          <td className={`${styles.nameCol} ${styles.colStickyNama}`} style={{ borderRight: "2px solid var(--border)" }}>
                            <div style={{ fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                              <span>{r.nama}</span>
                              {r.isAdminRole && (
                                <span
                                  style={{
                                    fontSize: "0.62rem",
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                                    color: "var(--cv-orange-hi)",
                                    border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)",
                                  }}
                                >
                                  {r.jabatan}
                                </span>
                              )}
                            </div>
                          </td>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                            const status = r.months?.[m];
                            const isCurrentMonth = m === new Date().getMonth() + 1 && tahun === new Date().getFullYear();

                            return (
                              <td
                                key={m}
                                style={{
                                  textAlign: "center",
                                  padding: "6px 2px",
                                  background: isCurrentMonth ? "color-mix(in srgb, var(--cv-orange) 4%, transparent)" : undefined,
                                }}
                              >
                                {status === "not_joined" ? (
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "var(--fg-muted)",
                                      opacity: 0.4,
                                    }}
                                    title={`Belum bergabung (${r.noAnggota})`}
                                  >
                                    -
                                  </span>
                                ) : status === true ? (
                                  <span
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: 6,
                                      background: "#10b981",
                                      color: "#fff",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "0.85rem",
                                      boxShadow: "0 2px 4px rgba(16, 185, 129, 0.3)",
                                    }}
                                    title={`Lunas (${MONTH_NAMES_FULL[m - 1]} ${tahun})`}
                                  >
                                    <i className="bx bx-check" />
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 4,
                                      border: "1.5px solid rgba(156, 163, 175, 0.35)",
                                      display: "inline-block",
                                    }}
                                    title={`Belum bayar (${MONTH_NAMES_FULL[m - 1]} ${tahun})`}
                                  />
                                )}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: "right", fontWeight: 800, color: "#10b981", fontSize: "0.85rem" }}>
                            {r.totalKas !== null ? formatRupiah(r.totalKas) : "-"}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800, fontSize: "0.85rem" }}>
                            {r.isAdminRole ? (
                              <span style={{ color: "var(--fg-muted)", fontSize: "0.75rem" }}>-</span>
                            ) : (r.totalBelumLunas ?? 0) > 0 ? (
                              <span
                                style={{
                                  color: "#ef4444",
                                  background: "rgba(239, 68, 68, 0.1)",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  display: "inline-block",
                                }}
                                title={`${r.unpaidCount || 0} bulan belum lunas`}
                              >
                                {formatRupiah(r.totalBelumLunas)}
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: "#10b981",
                                  fontSize: "0.75rem",
                                  background: "rgba(16, 185, 129, 0.1)",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  display: "inline-block",
                                }}
                              >
                                Lunas
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Legend Penjelasan Warna */}
            <div
              style={{
                marginTop: 18,
                padding: "12px 16px",
                borderRadius: 10,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                display: "flex",
                gap: 18,
                flexWrap: "wrap",
                alignItems: "center",
                fontSize: "0.78rem",
              }}
            >
              <span style={{ fontWeight: 800, color: "var(--fg-muted)" }}>Keterangan:</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    background: "#10b981",
                    borderRadius: 4,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: "0.75rem",
                  }}
                >
                  <i className="bx bx-check" />
                </span>{" "}
                Lunas
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: "1.5px solid rgba(156, 163, 175, 0.4)",
                    borderRadius: 3,
                    display: "inline-block",
                  }}
                />{" "}
                Belum Bayar
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <strong style={{ color: "var(--fg-muted)", fontSize: "1rem" }}>-</strong> Belum Bergabung / Admin
              </span>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB 2: LAPORAN PEMASUKAN EKSTERNAL & SPONSORSHIP */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === "pemasukan" && (
          <div className={styles.sectionCard} style={{ padding: 22 }}>
            {/* Header Laporan Pemasukan Eksternal */}
            <div className={styles.sectionHeader} style={{ flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <h2 className={styles.sectionTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="bx bx-log-in-circle" style={{ color: "var(--cv-orange)", fontSize: "1.4rem" }} />
                  Laporan Pemasukan Eksternal &amp; Sponsorship Fanbase
                  <span className={styles.countBadge} style={{ background: "color-mix(in srgb, var(--cv-orange) 15%, transparent)", color: "var(--cv-orange)" }}>
                    {filteredPemasukan.length} Transaksi
                  </span>
                </h2>
                <div style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 4 }}>
                  Menampilkan seluruh rincian dana masuk eksternal, donasi, sponsorship proyek, hasil merchandise, dan dana pendukung tahun {tahun}.
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>Total Pemasukan Eksternal {tahun}:</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--cv-orange)" }}>
                  {formatRupiah(totalPemasukanEksternalTercatat)}
                </div>
              </div>
            </div>

            {/* Toolbar Filter Kategori, Search Sumber, & Tahun */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* Pemilih Tahun */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fg-muted)" }}>Tahun:</span>
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      background: "var(--surface)",
                      borderRadius: 10,
                      padding: 4,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {SUPPORTED_YEARS.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setTahun(y)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 8,
                          border: "none",
                          background: tahun === y ? "var(--cv-orange)" : "transparent",
                          color: tahun === y ? "var(--cv-on-orange)" : "var(--fg-muted)",
                          fontWeight: tahun === y ? 900 : 600,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Kategori */}
                {uniquePemasukanCategories.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fg-muted)" }}>Kategori:</span>
                    <select
                      value={pemasukanKategori}
                      onChange={(e) => setPemasukanKategori(e.target.value)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--fg)",
                        fontSize: "0.82rem",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="semua">Semua Kategori</option>
                      {uniquePemasukanCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Input Pencarian */}
              <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
                <i
                  className="bx bx-search"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--fg-muted)",
                    fontSize: "1rem",
                  }}
                />
                <input
                  type="text"
                  placeholder="Cari sumber pemasukan, PJ, catatan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 36px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--fg)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* TABEL PEMASUKAN EKSTERNAL */}
            {filteredPemasukan.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 20px",
                  color: "var(--fg-muted)",
                  background: "var(--surface)",
                  borderRadius: 12,
                  border: "1px dashed var(--border)",
                }}
              >
                <i className="bx bx-folder-open" style={{ fontSize: "2.4rem", opacity: 0.5, marginBottom: 8, display: "block" }} />
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Belum Ada Data Pemasukan Eksternal</div>
                <div style={{ fontSize: "0.8rem", marginTop: 4 }}>
                  Tidak ada catatan pemasukan eksternal pada tahun {tahun} atau tidak cocok dengan filter pencarian.
                </div>
              </div>
            ) : (
              <div className={styles.tableWrapper} style={{ maxHeight: 600, overflowY: "auto" }}>
                <table className={styles.matrixTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 44, textAlign: "center" }}>No</th>
                      <th style={{ width: 110 }}>Tanggal</th>
                      <th style={{ width: 150 }}>Kategori</th>
                      <th>Sumber / Keterangan Pemasukan</th>
                      <th style={{ width: 140, textAlign: "right" }}>Nominal</th>
                      <th style={{ width: 140 }}>Penanggung Jawab</th>
                      <th style={{ width: 110, textAlign: "center" }}>Bukti Transaksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPemasukan.map((p: any, idx: number) => {
                      const tglStr = p.tanggal
                        ? new Date(p.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-";

                      return (
                        <tr key={p.id || idx}>
                          <td style={{ textAlign: "center", color: "var(--fg-muted)", fontSize: "0.8rem" }}>
                            {idx + 1}
                          </td>
                          <td style={{ fontSize: "0.82rem", color: "var(--fg)", whiteSpace: "nowrap" }}>
                            <i className="bx bx-calendar" style={{ marginRight: 4, opacity: 0.6 }} />
                            {tglStr}
                          </td>
                          <td>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 6,
                                background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                                color: "var(--cv-orange)",
                                border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {p.kategori || "Pemasukan Eksternal"}
                            </span>
                          </td>
                          <td className={styles.nameCol}>
                            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--fg)" }}>
                              {p.sumber}
                            </div>
                            {p.catatan && (
                              <div style={{ fontSize: "0.74rem", color: "var(--fg-muted)", marginTop: 3, lineHeight: 1.4 }}>
                                <i className="bx bx-note" style={{ marginRight: 3, verticalAlign: "middle" }} />
                                {p.catatan}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 900, color: "#10b981", fontSize: "0.92rem", whiteSpace: "nowrap" }}>
                            +{formatRupiah(p.nominal)}
                          </td>
                          <td style={{ fontSize: "0.82rem", color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
                            <i className="bx bx-user" style={{ marginRight: 4 }} />
                            {p.pj_nama || "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {(() => {
                              const notaUrls = parseNotaList(p.bukti_nota_url);
                              if (notaUrls.length === 0) return <span style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>-</span>;
                              return (
                                <button
                                  type="button"
                                  onClick={() => { setSelectedNotaUrl(normalizeProofUrl(notaUrls[0])); setSelectedNotaList(notaUrls); }}
                                  className={styles.backBtn}
                                  style={{
                                    fontSize: "0.72rem",
                                    padding: "4px 10px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    color: "var(--cv-orange)",
                                    borderColor: "color-mix(in srgb, var(--cv-orange) 40%, transparent)",
                                    borderRadius: 8,
                                  }}
                                  title="Lihat foto bukti nota / mutasi / kuitansi"
                                >
                                  <i className={`bx ${notaUrls.length > 1 ? "bx-images" : "bx-image"}`} style={{ fontSize: "0.9rem" }} />
                                  {notaUrls.length > 1 ? `${notaUrls.length} Bukti` : "Lihat Bukti"}
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB 3: LAPORAN PENGELUARAN KAS (TRANSPARANSI BELANJA) */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === "pengeluaran" && (
          <div className={styles.sectionCard} style={{ padding: 22 }}>
            {/* Header Laporan Pengeluaran */}
            <div className={styles.sectionHeader} style={{ flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <h2 className={styles.sectionTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="bx bx-receipt" style={{ color: "var(--cv-orange)", fontSize: "1.4rem" }} />
                  Laporan Pengeluaran &amp; Penggunaan Kas Fanbase
                  <span className={styles.countBadge} style={{ background: "color-mix(in srgb, var(--cv-orange) 15%, transparent)", color: "var(--cv-orange)" }}>
                    {filteredPengeluaran.length} Transaksi
                  </span>
                </h2>
                <div style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 4 }}>
                  Menampilkan seluruh rincian belanja operasional fanbase, keperluan uang kas, dan bukti nota tahun {tahun}.
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>Total Pengeluaran {tahun}:</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--cv-orange)" }}>
                  {formatRupiah(totalPengeluaranTercatat)}
                </div>
              </div>
            </div>

            {/* Toolbar Filter Kategori, Search Keperluan, & Tahun */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* Pemilih Tahun */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fg-muted)" }}>Tahun:</span>
                  <div
                    style={{
                      display: "flex",
                      gap: 4,
                      background: "var(--surface)",
                      borderRadius: 10,
                      padding: 4,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {SUPPORTED_YEARS.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setTahun(y)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 8,
                          border: "none",
                          background: tahun === y ? "var(--cv-orange)" : "transparent",
                          color: tahun === y ? "var(--cv-on-orange)" : "var(--fg-muted)",
                          fontWeight: tahun === y ? 900 : 600,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter Kategori */}
                {uniqueCategories.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fg-muted)" }}>Kategori:</span>
                    <select
                      value={pengeluaranKategori}
                      onChange={(e) => setPengeluaranKategori(e.target.value)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--fg)",
                        fontSize: "0.82rem",
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      <option value="semua">Semua Kategori</option>
                      {uniqueCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Search Keperluan Belanja */}
              <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
                <i
                  className="bx bx-search"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--fg-muted)",
                    fontSize: "1rem",
                  }}
                />
                <input
                  type="text"
                  placeholder="Cari keperluan / untuk apa kas dipakai..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: "8px 14px 8px 36px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--fg)",
                    fontSize: "0.82rem",
                    outline: "none",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Tabel Rincian Pengeluaran */}
            {loading ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem", color: "var(--cv-orange)" }} />
                <p>Memuat catatan pengeluaran kas...</p>
              </div>
            ) : filteredPengeluaran.length === 0 ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-receipt" style={{ fontSize: "2.2rem", color: "var(--fg-muted)" }} />
                <p>Belum ada catatan pengeluaran kas tercatat pada tahun {tahun}.</p>
              </div>
            ) : (
              <div className={styles.tableWrap} style={{ maxHeight: "68vh", overflowY: "auto" }}>
                <table className={styles.table}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ width: 44, textAlign: "center" }}>No</th>
                      <th style={{ minWidth: 105 }}>Tanggal</th>
                      <th style={{ minWidth: 120 }}>Kategori</th>
                      <th style={{ minWidth: 220 }}>Keperluan Belanja (Untuk Apa)</th>
                      <th style={{ minWidth: 120, textAlign: "right" }}>Nominal</th>
                      <th style={{ minWidth: 130 }}>Penanggung Jawab (PJ)</th>
                      <th style={{ minWidth: 100, textAlign: "center" }}>Bukti Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPengeluaran.map((p: any, idx: number) => {
                      const tglStr = p.tanggal
                        ? new Date(p.tanggal).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-";

                      return (
                        <tr key={p.id || idx}>
                          <td style={{ textAlign: "center", color: "var(--fg-muted)", fontSize: "0.8rem" }}>
                            {idx + 1}
                          </td>
                          <td style={{ fontSize: "0.82rem", color: "var(--fg)", whiteSpace: "nowrap" }}>
                            <i className="bx bx-calendar" style={{ marginRight: 4, opacity: 0.6 }} />
                            {tglStr}
                          </td>
                          <td>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: 6,
                                background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                                color: "var(--gold)",
                                border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {p.kategori || "Operasional"}
                            </span>
                          </td>
                          <td className={styles.nameCol}>
                            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--fg)" }}>
                              {p.keperluan}
                            </div>
                            {p.catatan && (
                              <div style={{ fontSize: "0.74rem", color: "var(--fg-muted)", marginTop: 3, lineHeight: 1.4 }}>
                                <i className="bx bx-note" style={{ marginRight: 3, verticalAlign: "middle" }} />
                                {p.catatan}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 900, color: "var(--cv-orange)", fontSize: "0.92rem", whiteSpace: "nowrap" }}>
                            {formatRupiah(p.nominal)}
                          </td>
                          <td style={{ fontSize: "0.82rem", color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
                            <i className="bx bx-user" style={{ marginRight: 4 }} />
                            {p.pj_nama || "-"}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {(() => {
                              const notaUrls = parseNotaList(p.bukti_nota_url);
                              if (notaUrls.length === 0) return <span style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>-</span>;
                              return (
                                <button
                                  type="button"
                                  onClick={() => { setSelectedNotaUrl(normalizeProofUrl(notaUrls[0])); setSelectedNotaList(notaUrls); }}
                                  className={styles.backBtn}
                                  style={{
                                    fontSize: "0.72rem",
                                    padding: "4px 10px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    color: "var(--gold)",
                                    borderColor: "var(--border-gold)",
                                    borderRadius: 8,
                                  }}
                                  title="Lihat foto bukti nota / kuitansi"
                                >
                                  <i className={`bx ${notaUrls.length > 1 ? "bx-images" : "bx-image"}`} style={{ fontSize: "0.9rem" }} />
                                  {notaUrls.length > 1 ? `${notaUrls.length} Foto Nota` : "Lihat Nota"}
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer info note */}
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            background: "var(--surface)",
            borderRadius: 12,
            border: "1px solid var(--border)",
            fontSize: "0.75rem",
            color: "var(--fg-muted)",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <i className="bx bx-shield" />
          <span>Halaman ini hanya untuk penggunaan internal Cavallery Fanbase · Transparansi Pemasukan &amp; Pengeluaran Kas</span>
        </div>
      </div>

      {/* ── MODAL LIGHTBOX: LIHAT BUKTI NOTA BELANJA ── */}
      {selectedNotaUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: 20,
            backdropFilter: "blur(6px)",
          }}
          onClick={() => setSelectedNotaUrl(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: 640,
              width: "100%",
              background: "var(--surface)",
              borderRadius: 16,
              border: "1px solid var(--border)",
              padding: 20,
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="bx bx-receipt" style={{ color: "var(--gold)", fontSize: "1.3rem" }} />
                <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--fg)" }}>
                  Bukti Nota / Kuitansi Transaksi
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotaUrl(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--fg-muted)",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Tutup"
              >
                <i className="bx bx-x" />
              </button>
            </div>

            <div
              style={{
                width: "100%",
                maxHeight: "70vh",
                overflow: "auto",
                borderRadius: 10,
                background: "color-mix(in srgb, var(--cv-ink) 60%, transparent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 8,
              }}
            >
              <img
                src={normalizeProofUrl(selectedNotaUrl)}
                alt="Bukti Nota Transaksi"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes("bukti-1788285192192-ypyr5p.jpg")) {
                    target.src = "/uploads/bukti/bukti-1788285192192-ypyr5p.jpg";
                  }
                }}
                style={{
                  maxWidth: "100%",
                  maxHeight: "65vh",
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            </div>

            {/* Navigasi & Thumbnail jika ada lebih dari 1 nota */}
            {selectedNotaList.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = selectedNotaList.findIndex(u => normalizeProofUrl(u) === selectedNotaUrl);
                      const prev = idx > 0 ? idx - 1 : selectedNotaList.length - 1;
                      setSelectedNotaUrl(normalizeProofUrl(selectedNotaList[prev]));
                    }}
                    style={{ background: "color-mix(in srgb, var(--cv-bone) 10%, transparent)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", color: "var(--fg)", cursor: "pointer", fontSize: "0.85rem" }}
                  >
                    <i className="bx bx-chevron-left" /> Sebelumnya
                  </button>
                  <span style={{ color: "var(--fg-muted)", fontSize: "0.8rem", display: "flex", alignItems: "center" }}>
                    {selectedNotaList.findIndex(u => normalizeProofUrl(u) === selectedNotaUrl) + 1} / {selectedNotaList.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const idx = selectedNotaList.findIndex(u => normalizeProofUrl(u) === selectedNotaUrl);
                      const next = idx < selectedNotaList.length - 1 ? idx + 1 : 0;
                      setSelectedNotaUrl(normalizeProofUrl(selectedNotaList[next]));
                    }}
                    style={{ background: "color-mix(in srgb, var(--cv-bone) 10%, transparent)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 14px", color: "var(--fg)", cursor: "pointer", fontSize: "0.85rem" }}
                  >
                    Selanjutnya <i className="bx bx-chevron-right" />
                  </button>
                </div>
                <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                  {selectedNotaList.map((url, ti) => (
                    <button
                      key={ti}
                      type="button"
                      onClick={() => setSelectedNotaUrl(normalizeProofUrl(url))}
                      style={{
                        width: 48, height: 48, borderRadius: 6, overflow: "hidden", cursor: "pointer",
                        border: normalizeProofUrl(url) === selectedNotaUrl ? "2px solid var(--gold)" : "1px solid var(--border)",
                        opacity: normalizeProofUrl(url) === selectedNotaUrl ? 1 : 0.6,
                        background: "color-mix(in srgb, var(--cv-ink) 60%, transparent)", padding: 0,
                      }}
                    >
                      <img src={normalizeProofUrl(url)} alt={`Nota ${ti + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <a
                href={normalizeProofUrl(selectedNotaUrl)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.8rem",
                  color: "var(--gold)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontWeight: 700,
                }}
              >
                <i className="bx bx-link-external" /> Buka Gambar Ukuran Penuh
              </a>
              <button
                type="button"
                className={styles.btnCreate}
                onClick={() => setSelectedNotaUrl(null)}
                style={{ padding: "6px 16px", fontSize: "0.82rem" }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
