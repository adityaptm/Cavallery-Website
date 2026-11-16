"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import styles from "../keanggotaan/page.module.css";
import ThemeToggle from "@/components/ThemeToggle";
import AdminSubNav from "@/components/admin/AdminSubNav";

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

function normalizeProofUrl(url?: string | null): string {
  if (!url) return "";
  let clean = url.trim();
  // Jika URL Google Drive biasa, konversi ke URL direct image lh3.googleusercontent.com/d/ID agar tag <img> dapat me-render langsung
  if (clean.includes("drive.google.com")) {
    const fileIdMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
  }

  if (clean.includes("localhost:") || clean.includes("cavallery.id")) {
    try {
      const parsed = new URL(clean);
      clean = parsed.pathname;
    } catch {}
  }

  if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("data:")) {
    return clean;
  }

  if (!clean.startsWith("/")) {
    clean = "/" + clean;
  }

  return clean;
}

function parseNotaList(urlOrUrls: any): string[] {
  if (!urlOrUrls) return [];
  if (Array.isArray(urlOrUrls)) return urlOrUrls.filter(Boolean);
  const str = String(urlOrUrls).trim();
  if (!str || str === "-" || str === "null") return [];
  if (str.startsWith("[") && str.endsWith("]")) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    } catch {}
  }
  return str.split(",").map((s: string) => s.trim()).filter(Boolean);
}

export default function AdminKasPage() {
  // ── STATE: Konfirmasi Kas ──
  const [kasList, setKasList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [selectedProofList, setSelectedProofList] = useState<string[]>([]);
  const [editKas, setEditKas] = useState<any | null>(null);

  // ── STATE: Tab Utama ──
  const [activeTab, setActiveTab] = useState<"matriks" | "tagihan" | "pemasukan" | "pengeluaran" | "kupon" | "konfirmasi" | "war">("matriks");
  const [matrixYear, setMatrixYear] = useState(new Date().getFullYear());
  const [matrixData, setMatrixData] = useState<any | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixToggling, setMatrixToggling] = useState<string | null>(null);
  const [reSyncing, setReSyncing] = useState(false);
  const [exportingToSheets, setExportingToSheets] = useState(false);
  const [matrixSearch, setMatrixSearch] = useState("");

  // ── STATE: Tagihan & Kewajiban Kas ──
  const [tagihanList, setTagihanList] = useState<any[]>([]);
  const [loadingTagihan, setLoadingTagihan] = useState(false);
  const [tagihanSearch, setTagihanSearch] = useState("");

  // ── STATE: Pengeluaran Kas ──
  const [pengeluaranList, setPengeluaranList] = useState<any[]>([]);
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);
  const [loadingPengeluaran, setLoadingPengeluaran] = useState(false);
  const [showPengeluaranModal, setShowPengeluaranModal] = useState(false);
  const [submittingPengeluaran, setSubmittingPengeluaran] = useState(false);
  const [uploadingNota, setUploadingNota] = useState(false);
  const [newPengeluaran, setNewPengeluaran] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    kategori: "Operasional",
    keperluan: "",
    nominal: "",
    buktiNotaUrls: [] as string[],
    catatan: "",
  });
  const [showEditPengeluaranModal, setShowEditPengeluaranModal] = useState(false);
  const [submittingEditPengeluaran, setSubmittingEditPengeluaran] = useState(false);
  const [uploadingEditNota, setUploadingEditNota] = useState(false);
  const [editPengeluaran, setEditPengeluaran] = useState<{
    id: number | null;
    tanggal: string;
    kategori: string;
    keperluan: string;
    nominal: string;
    buktiNotaUrls: string[];
    catatan: string;
  }>({
    id: null,
    tanggal: "",
    kategori: "Operasional",
    keperluan: "",
    nominal: "",
    buktiNotaUrls: [],
    catatan: "",
  });

  // ── STATE: Pemasukan Kas (Eksternal Income) ──
  const [pemasukanList, setPemasukanList] = useState<any[]>([]);
  const [totalPemasukanEksternal, setTotalPemasukanEksternal] = useState(0);
  const [loadingPemasukan, setLoadingPemasukan] = useState(false);
  const [showPemasukanModal, setShowPemasukanModal] = useState(false);
  const [submittingPemasukan, setSubmittingPemasukan] = useState(false);
  const [uploadingPemasukanNota, setUploadingPemasukanNota] = useState(false);
  const [newPemasukan, setNewPemasukan] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    kategori: "Pemasukan Eksternal",
    sumber: "",
    nominal: "",
    buktiNotaUrls: [] as string[],
    catatan: "",
  });
  const [showEditPemasukanModal, setShowEditPemasukanModal] = useState(false);
  const [submittingEditPemasukan, setSubmittingEditPemasukan] = useState(false);
  const [uploadingEditPemasukanNota, setUploadingEditPemasukanNota] = useState(false);
  const [editPemasukan, setEditPemasukan] = useState<{
    id: number | null;
    tanggal: string;
    kategori: string;
    sumber: string;
    nominal: string;
    buktiNotaUrls: string[];
    catatan: string;
  }>({
    id: null,
    tanggal: "",
    kategori: "Pemasukan Eksternal",
    sumber: "",
    nominal: "",
    buktiNotaUrls: [],
    catatan: "",
  });
  const [pemasukanSearch, setPemasukanSearch] = useState("");
  const [pemasukanKategoriFilter, setPemasukanKategoriFilter] = useState("semua");

  // ── STATE: Kupon Kas Reward ──
  const [kuponList, setKuponList] = useState<any[]>([]);
  const [loadingKupon, setLoadingKupon] = useState(false);
  const [showKuponModal, setShowKuponModal] = useState(false);
  const [submittingKupon, setSubmittingKupon] = useState(false);
  const [newKupon, setNewKupon] = useState({
    kodeKupon: "",
    judul: "",
    deskripsi: "",
    tipeReward: "Diskon Merch",
    nilaiReward: "1 Bulan",
    minBulanKas: 1,
    tahunKas: new Date().getFullYear(),
    kadaluarsaPada: "",
  });
  const [selectedKuponDetail, setSelectedKuponDetail] = useState<any | null>(null);
  const [penerimaList, setPenerimaList] = useState<any[]>([]);
  const [loadingPenerima, setLoadingPenerima] = useState(false);
  // Mode privat: kirim kupon ke 1 anggota tertentu
  const [kuponMode, setKuponMode] = useState<"semua" | "privat">("semua");
  const [targetAnggotaId, setTargetAnggotaId] = useState<string>("");
  const [generatedKodeUnik, setGeneratedKodeUnik] = useState<string>("");

  // ── STATE: Modal Input Kas Manual ──
  const [showInputModal, setShowInputModal] = useState(false);
  const [anggotaList, setAnggotaList] = useState<any[]>([]);
  const [manualNoAnggota, setManualNoAnggota] = useState("");
  const [manualTahun, setManualTahun] = useState(new Date().getFullYear());
  const [manualBulan, setManualBulan] = useState(new Date().getMonth() + 1);
  const [manualNominal, setManualNominal] = useState("15.000");
  const [submittingManual, setSubmittingManual] = useState(false);
  // ── STATE: War Tiket STS Erine ──
  const [adminWarEvent, setAdminWarEvent] = useState<any | null>(null);
  const [adminWarPeserta, setAdminWarPeserta] = useState<any[]>([]);
  const [loadingAdminWar, setLoadingAdminWar] = useState(false);
  const [showWarModal, setShowWarModal] = useState(false);
  const [savingWarEvent, setSavingWarEvent] = useState(false);
  const [warForm, setWarForm] = useState({
    id: 0,
    judul: "War Tiket Project STS Erine 20th",
    deskripsi: "Akses khusus project perayaan Seitansai Catherina Vallencia (Erine) ke-20 bersama Cavallery Team Passion.",
    kuotaTotal: 50,
    waktuBuka: "",
    waktuTutup: "",
    status: "buka",
    syaratKetentuan: "1. Wajib memiliki akun anggota Cavallery aktif.\n2. 1 Akun anggota hanya dapat mengklaim maksimal 1 tiket.\n3. Tiket tidak dapat dipindahtangankan tanpa konfirmasi admin.",
  });

  const fetchAdminWarData = async () => {
    setLoadingAdminWar(true);
    try {
      const res = await fetch("/api/admin/war-tiket");
      const json = await res.json();
      if (json.status && json.data) {
        setAdminWarEvent(json.data.event);
        setAdminWarPeserta(json.data.peserta || []);
        if (json.data.event) {
          const ev = json.data.event;
          const toLocalInput = (dStr: string) => {
            if (!dStr) return "";
            const iso = dStr.includes(" ") ? dStr.replace(" ", "T") : dStr;
            const d = new Date(iso);
            if (isNaN(d.getTime())) return "";
            const pad = (n: number) => String(n).padStart(2, "0");
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          };
          setWarForm({
            id: ev.id,
            judul: ev.judul || "",
            deskripsi: ev.deskripsi || "",
            kuotaTotal: Number(ev.kuota_total) || 50,
            waktuBuka: toLocalInput(ev.waktu_buka),
            waktuTutup: toLocalInput(ev.waktu_tutup),
            status: ev.status || "buka",
            syaratKetentuan: ev.syarat_ketentuan || "",
          });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdminWar(false);
    }
  };

  const handleSaveWarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWarEvent(true);
    try {
      const payload: any = { ...warForm };
      if (payload.status === "buka") {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const pastLocal = `${fiveMinAgo.getFullYear()}-${pad(fiveMinAgo.getMonth() + 1)}-${pad(fiveMinAgo.getDate())}T${pad(fiveMinAgo.getHours())}:${pad(fiveMinAgo.getMinutes())}`;
        if (!payload.waktuBuka) {
          payload.waktuBuka = pastLocal;
        }
        if (!payload.waktuTutup) {
          const defaultClose = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          payload.waktuTutup = `${defaultClose.getFullYear()}-${pad(defaultClose.getMonth() + 1)}-${pad(defaultClose.getDate())}T${pad(defaultClose.getHours())}:${pad(defaultClose.getMinutes())}`;
        }
      }
      const res = await fetch("/api/admin/war-tiket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.status) {
        setMsg("Pengaturan War Tiket STS Erine berhasil disimpan!");
        setShowWarModal(false);
        fetchAdminWarData();
        setTimeout(() => setMsg(""), 4000);
      } else {
        alert(json.message || "Gagal menyimpan pengaturan");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setSavingWarEvent(false);
    }
  };

  const handleDeleteWarPeserta = async (pesertaId: number, nama: string) => {
    if (!confirm(`Yakin ingin membatalkan/mencabut tiket milik "${nama}"? Kuota tiket akan otomatis bertambah 1.`)) return;
    try {
      const res = await fetch(`/api/admin/war-tiket?pesertaId=${pesertaId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status) {
        setMsg(`Tiket milik "${nama}" berhasil dicabut.`);
        fetchAdminWarData();
        setTimeout(() => setMsg(""), 4000);
      } else {
        alert(json.message || "Gagal mencabut tiket");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    }
  };

  const handleToggleWarStatus = async (newStatus: "buka" | "tutup") => {
    if (!adminWarEvent) return;
    try {
      const payload: any = {
        ...warForm,
        id: adminWarEvent.id,
        status: newStatus,
      };

      if (newStatus === "buka") {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const pastLocal = `${fiveMinAgo.getFullYear()}-${pad(fiveMinAgo.getMonth() + 1)}-${pad(fiveMinAgo.getDate())}T${pad(fiveMinAgo.getHours())}:${pad(fiveMinAgo.getMinutes())}`;

        // Buka sekarang juga (5 menit lalu agar langsung aktif di semua browser tanpa delay)
        payload.waktuBuka = pastLocal;

        // Jika waktu tutup sudah lewat, perpanjang default 30 hari
        const closeD = warForm.waktuTutup ? new Date(warForm.waktuTutup.replace(" ", "T")) : null;
        if (!closeD || isNaN(closeD.getTime()) || closeD.getTime() <= now.getTime()) {
          const defaultClose = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          payload.waktuTutup = `${defaultClose.getFullYear()}-${pad(defaultClose.getMonth() + 1)}-${pad(defaultClose.getDate())}T${pad(defaultClose.getHours())}:${pad(defaultClose.getMinutes())}`;
        }
      }

      const res = await fetch("/api/admin/war-tiket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.status) {
        setMsg(`Status war tiket berhasil diubah menjadi "${newStatus.toUpperCase()}"!`);
        fetchAdminWarData();
        setTimeout(() => setMsg(""), 4000);
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    }
  };

  // ── Fetch Konfirmasi Kas ──
  const fetchKas = async () => {
    try {
      const res = await fetch("/api/admin/kas");
      if (res.status === 401) { window.location.replace("/internal/dashboard-admin-xv7r2q"); return; }
      const json = await res.json();
      if (json.status && json.data) setKasList(json.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Fetch Matriks Iuran ──
  const fetchMatrix = useCallback(async (year: number) => {
    setMatrixLoading(true);
    try {
      const res = await fetch(`/api/admin/kas/matrix?tahun=${year}&_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.status === 401) { window.location.replace("/internal/dashboard-admin-xv7r2q"); return; }
      const json = await res.json();
      if (json.status && json.data) setMatrixData(json.data);
    } catch (e) { console.error(e); }
    finally { setMatrixLoading(false); }
  }, []);

  // ── Fetch Tagihan Kas ──
  const fetchTagihan = useCallback(async (year: number) => {
    setLoadingTagihan(true);
    try {
      const res = await fetch(`/api/admin/kas/tagihan?tahun=${year}`);
      const json = await res.json();
      if (json.status && json.data) setTagihanList(json.data);
    } catch (e) { console.error(e); }
    finally { setLoadingTagihan(false); }
  }, []);

  // ── Fetch Pengeluaran Kas ──
  const fetchPengeluaran = useCallback(async (year: number) => {
    setLoadingPengeluaran(true);
    try {
      const res = await fetch(`/api/admin/kas/pengeluaran?tahun=${year}`);
      const json = await res.json();
      if (json.status) {
        setPengeluaranList(json.data || []);
        setTotalPengeluaran(json.totalPengeluaran || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingPengeluaran(false); }
  }, []);

  // ── Fetch Pemasukan Kas (Eksternal Income) ──
  const fetchPemasukan = useCallback(async (year: number) => {
    setLoadingPemasukan(true);
    try {
      const res = await fetch(`/api/admin/kas/pemasukan?tahun=${year}`);
      const json = await res.json();
      if (json.status) {
        setPemasukanList(json.data || []);
        setTotalPemasukanEksternal(json.totalPemasukan || 0);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingPemasukan(false); }
  }, []);

  // ── Fetch Kupon Kas ──
  const fetchKupon = useCallback(async (year: number) => {
    setLoadingKupon(true);
    try {
      const res = await fetch(`/api/admin/kas/kupon?tahun=${year}`);
      const json = await res.json();
      if (json.status && json.data) setKuponList(json.data);
    } catch (e) { console.error(e); }
    finally { setLoadingKupon(false); }
  }, []);

  // ── STATE: Master Data Konfigurasi ──
  const [masterData, setMasterData] = useState<any>({
    kategoriPengeluaran: [
      "Operasional Fanbase", "Event / Project Show", "Konsumsi Tim", "Website & Server", "Produksi Merchandise", "Banner & Handbanner", "Dokumentasi & Media", "Lain-lain"
    ],
    tahunKasAktif: [2024, 2025, 2026, 2027, 2028, 2029],
    defaultNominalKas: 15000,
  });

  const fetchMasterData = async () => {
    try {
      const res = await fetch("/api/admin/master-data");
      const json = await res.json();
      if (json.status && json.data) {
        setMasterData(json.data);
      }
    } catch (e) { console.error(e); }
  };

  // ── Fetch Anggota untuk dropdown manual ──
  const fetchAnggota = async () => {
    try {
      const res = await fetch("/api/admin/keanggotaan");
      const json = await res.json();
      if (json.status && json.data) {
        if (Array.isArray(json.data)) {
          setAnggotaList(json.data);
        } else if (Array.isArray(json.data.direktori)) {
          setAnggotaList(json.data.direktori);
        } else {
          setAnggotaList([]);
        }
      }
    } catch (e) {
      console.error(e);
      setAnggotaList([]);
    }
  };

  useEffect(() => {
    fetchKas();
    fetchMatrix(matrixYear);
    fetchTagihan(matrixYear);
    fetchPengeluaran(matrixYear);
    fetchPemasukan(matrixYear);
    fetchKupon(matrixYear);
    fetchAnggota();
    fetchMasterData();

    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const tab = p.get("tab");
      if (tab && ["matriks", "tagihan", "pemasukan", "pengeluaran", "kupon", "konfirmasi", "war"].includes(tab)) {
        setActiveTab(tab as any);
      }
    }
  }, [fetchMatrix, fetchTagihan, fetchPengeluaran, fetchPemasukan, fetchKupon, matrixYear]);

  // ── Handlers: Konfirmasi ──
  const handleAction = async (id: number, action: string, extra: any = {}) => {
    setActionLoading(id);
    setMsg("");
    try {
      const res = await fetch("/api/admin/kas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...extra }),
      });
      const json = await res.json();
      if (json.status) {
        setMsg(json.message);
        fetchKas();
        fetchMatrix(matrixYear);
        fetchTagihan(matrixYear);
      } else {
        alert(json.message || "Gagal memproses aksi");
      }
    } catch (err: any) { alert(err.message || "Terjadi kesalahan"); }
    finally { setActionLoading(null); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editKas) return;
    try {
      const res = await fetch("/api/admin/kas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editKas),
      });
      const json = await res.json();
      if (json.status) { setMsg(json.message); setEditKas(null); fetchKas(); fetchMatrix(matrixYear); }
      else alert(json.message || "Gagal memperbarui kas");
    } catch (err: any) { alert(err.message || "Terjadi kesalahan"); }
  };

  const handleDeleteKas = async (id: number) => {
    if (!confirm(`Hapus data pembayaran kas #${id} dari sistem & spreadsheet?`)) return;
    try {
      const res = await fetch(`/api/admin/kas?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status) { setMsg(json.message); fetchKas(); fetchMatrix(matrixYear); }
      else alert(json.message || "Gagal menghapus kas");
    } catch (err: any) { alert(err.message || "Terjadi kesalahan"); }
  };

  // ── Handler: Toggle Bulan di Matriks (3 Status: Kosong -> Ceklis -> Strip -> Kosong) ──
  const handleToggleMonth = async (noAnggota: string, bulan: number, currentStatus: boolean | "not_joined") => {
    const key = `${noAnggota}:${bulan}`;
    setMatrixToggling(key);

    // Siklus 3 Status:
    // 1. Kosong (false / belum bayar) -> Jadi Ceklis ("diverifikasi" / lunas)
    // 2. Ceklis (true / lunas) -> Jadi Strip ("not_joined" / belum bergabung / bebas kas)
    // 3. Strip ("not_joined") -> Jadi Kosong ("unpaid" / belum bayar kas)
    let nextStatusMode: "diverifikasi" | "not_joined" | "unpaid" = "diverifikasi";
    if (currentStatus === true) {
      nextStatusMode = "not_joined";
    } else if (currentStatus === "not_joined") {
      nextStatusMode = "unpaid";
    } else {
      nextStatusMode = "diverifikasi";
    }

    // Optimistic UI: langsung update tampilan tanpa menunggu response server
    const nextVal: boolean | "not_joined" = nextStatusMode === "diverifikasi" ? true : nextStatusMode === "not_joined" ? "not_joined" : false;
    setMatrixData((prev: any) => {
      if (!prev?.matrixRows) return prev;
      return {
        ...prev,
        matrixRows: prev.matrixRows.map((r: any) =>
          r.noAnggota === noAnggota
            ? { ...r, months: { ...r.months, [bulan]: nextVal } }
            : r
        ),
      };
    });

    try {
      const res = await fetch("/api/admin/kas/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noAnggota, tahun: matrixYear, bulan, statusMode: nextStatusMode, nominal: 15000 }),
      });
      const json = await res.json();
      if (json.status) {
        fetchMatrix(matrixYear);
        fetchTagihan(matrixYear);
      } else {
        alert(json.message || "Gagal mengubah status");
      }
    } catch (err: any) { alert(err.message || "Terjadi kesalahan"); }
    finally { setMatrixToggling(null); }
  };

  // ── Handler: Re-sync semua data ke matriks ──
  const handleReSync = async () => {
    if (!confirm("Sinkronkan ulang semua data kas yang sudah diverifikasi ke matriks bulanan?")) return;
    setReSyncing(true);
    try {
      const res = await fetch("/api/admin/kas/matrix", { method: "PUT" });
      const json = await res.json();
      if (json.status) {
        setMsg(json.message);
        fetchMatrix(matrixYear);
        fetchTagihan(matrixYear);
      } else {
        alert(json.message || "Gagal sinkronisasi");
      }
    } catch (err: any) { alert(err.message || "Terjadi kesalahan"); }
    finally { setReSyncing(false); }
  };

  // ── Handler: Ekspor / Buat Tab Lengkap ke Google Sheets ──
  const handleExportToSheets = async () => {
    if (!confirm("Kirim dan sinkronkan seluruh Tab Matriks Kas (2024-2029), Anggota Aktif, Status Anggota, Leaderboard Kontributor, dan Laporan Pengeluaran ke Google Spreadsheet sekarang?")) return;
    setExportingToSheets(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/spreadsheet", { method: "POST" });
      const json = await res.json();
      if (json.status) {
        setMsg(json.message || "🎉 Berhasil! Seluruh tab telah disinkronkan ke Google Spreadsheet.");
      } else {
        alert(json.message || "Gagal ekspor ke spreadsheet");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menghubungkan ke Spreadsheet");
    } finally {
      setExportingToSheets(false);
    }
  };

  // ── Handler: Submit Input Kas Manual ──
  const handleManualKasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNoAnggota) {
      alert("Pilih nomor anggota terlebih dahulu");
      return;
    }
    const cleanNominal = Number(manualNominal.replace(/\D/g, "")) || 15000;
    setSubmittingManual(true);
    try {
      const res = await fetch("/api/admin/kas/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noAnggota: manualNoAnggota,
          tahun: Number(manualTahun),
          bulan: Number(manualBulan),
          isPaid: true,
          nominal: cleanNominal,
        }),
      });
      const json = await res.json();
      if (json.status) {
        setMsg(`✅ Pembayaran kas ${manualNoAnggota} untuk ${MONTH_NAMES_FULL[manualBulan - 1]} ${manualTahun} berhasil dicentang & dikirim ke Spreadsheet!`);
        setShowInputModal(false);
        fetchMatrix(matrixYear);
        fetchTagihan(matrixYear);
      } else {
        alert(json.message || "Gagal menyimpan kas");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setSubmittingManual(false);
    }
  };

  // ── Handler: Upload Foto Bukti Nota (Bisa Lebih Dari 1 Foto) ──
  const handleUploadNota = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingNota(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        let json: any = {};
        const cType = res.headers.get("content-type") || "";
        if (cType.includes("application/json")) {
          json = await res.json();
        } else {
          throw new Error("Server penyimpanan sedang sibuk. Silakan coba beberapa saat lagi.");
        }
        if (json.status && json.url) {
          uploadedUrls.push(json.url);
        } else {
          alert(json.message || `Gagal mengunggah foto ke-${i + 1}`);
        }
      }
      if (uploadedUrls.length > 0) {
        setNewPengeluaran((prev) => ({
          ...prev,
          buktiNotaUrls: [...(prev.buktiNotaUrls || []), ...uploadedUrls],
        }));
      }
    } catch (err: any) {
      alert(err?.message || "Gagal mengunggah foto");
    } finally {
      setUploadingNota(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── Handler: Submit Pengeluaran Kas Baru ──
  const handlePengeluaranSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNominal = Number(newPengeluaran.nominal.replace(/\D/g, ""));
    if (!cleanNominal || !newPengeluaran.keperluan) {
      alert("Keperluan dan nominal pengeluaran wajib diisi");
      return;
    }

    setSubmittingPengeluaran(true);
    try {
      const res = await fetch("/api/admin/kas/pengeluaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: newPengeluaran.tanggal,
          kategori: newPengeluaran.kategori,
          keperluan: newPengeluaran.keperluan,
          nominal: cleanNominal,
          buktiNotaUrl: newPengeluaran.buktiNotaUrls.join(","),
          catatan: newPengeluaran.catatan,
        }),
      });
      let json: any = {};
      const cType = res.headers.get("content-type") || "";
      if (cType.includes("application/json")) {
        json = await res.json();
      } else {
        throw new Error("Server sedang memproses. Silakan refresh halaman untuk mengecek.");
      }
      if (json.status) {
        setMsg("Pengeluaran kas berhasil dicatat!");
        setShowPengeluaranModal(false);
        setNewPengeluaran({
          tanggal: new Date().toISOString().split("T")[0],
          kategori: "Operasional",
          keperluan: "",
          nominal: "",
          buktiNotaUrls: [],
          catatan: "",
        });
        fetchPengeluaran(matrixYear);
        fetchMatrix(matrixYear);
      } else {
        alert(json.message || "Gagal mencatat pengeluaran");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setSubmittingPengeluaran(false);
    }
  };

  // ── Handler: Hapus Pengeluaran Kas ──
  const handleDeletePengeluaran = async (id: number) => {
    if (!confirm(`Hapus catatan pengeluaran kas #${id}?`)) return;
    try {
      const res = await fetch(`/api/admin/kas/pengeluaran?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status) {
        setMsg(json.message);
        fetchPengeluaran(matrixYear);
        fetchMatrix(matrixYear);
      } else {
        alert(json.message || "Gagal menghapus pengeluaran");
      }
    } catch (err: any) { alert(err.message || "Terjadi kesalahan"); }
  };

  // ── Handler: Buka Modal Edit Pengeluaran ──
  const handleOpenEditPengeluaran = (item: any) => {
    let tglStr = "";
    try {
      if (item.tanggal) {
        const d = new Date(item.tanggal);
        if (!isNaN(d.getTime())) {
          tglStr = d.toISOString().split("T")[0];
        }
      }
    } catch {
      tglStr = item.tanggal || "";
    }

    const notaUrls = parseNotaList(item.bukti_nota_url || item.buktiNotaUrl);

    setEditPengeluaran({
      id: item.id,
      tanggal: tglStr || new Date().toISOString().split("T")[0],
      kategori: item.kategori || "Operasional",
      keperluan: item.keperluan || "",
      nominal: item.nominal ? Number(item.nominal).toLocaleString("id-ID") : "",
      buktiNotaUrls: notaUrls,
      catatan: item.catatan || "",
    });
    setShowEditPengeluaranModal(true);
  };

  // ── Handler: Upload Foto Bukti Nota untuk Edit (Bisa Lebih Dari 1 Foto) ──
  const handleUploadEditNota = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingEditNota(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        let json: any = {};
        const cType = res.headers.get("content-type") || "";
        if (cType.includes("application/json")) {
          json = await res.json();
        } else {
          throw new Error("Server penyimpanan sedang sibuk. Silakan coba beberapa saat lagi.");
        }
        if (json.status && json.url) {
          uploadedUrls.push(json.url);
        } else {
          alert(json.message || `Gagal mengunggah foto ke-${i + 1}`);
        }
      }
      if (uploadedUrls.length > 0) {
        setEditPengeluaran((prev) => ({
          ...prev,
          buktiNotaUrls: [...(prev.buktiNotaUrls || []), ...uploadedUrls],
        }));
      }
    } catch (err: any) {
      alert(err?.message || "Gagal mengunggah foto nota");
    } finally {
      setUploadingEditNota(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── Handler: Submit Edit Pengeluaran Kas ──
  const handleEditPengeluaranSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPengeluaran.id) return;
    const cleanNominal = Number(String(editPengeluaran.nominal).replace(/\D/g, ""));
    if (!cleanNominal || !editPengeluaran.keperluan) {
      alert("Keperluan dan nominal pengeluaran wajib diisi");
      return;
    }

    setSubmittingEditPengeluaran(true);
    try {
      const res = await fetch("/api/admin/kas/pengeluaran", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editPengeluaran.id,
          tanggal: editPengeluaran.tanggal,
          kategori: editPengeluaran.kategori,
          keperluan: editPengeluaran.keperluan,
          nominal: cleanNominal,
          buktiNotaUrl: editPengeluaran.buktiNotaUrls.join(","),
          catatan: editPengeluaran.catatan,
        }),
      });
      let json: any = {};
      const cType = res.headers.get("content-type") || "";
      if (cType.includes("application/json")) {
        json = await res.json();
      } else {
        throw new Error("Server sedang memproses. Silakan refresh halaman untuk mengecek.");
      }
      if (json.status) {
        setMsg("Catatan pengeluaran & bukti nota berhasil diperbarui!");
        setShowEditPengeluaranModal(false);
        fetchPengeluaran(matrixYear);
        fetchMatrix(matrixYear);
      } else {
        alert(json.message || "Gagal memperbarui pengeluaran");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setSubmittingEditPengeluaran(false);
    }
  };

  // ── Handler: Upload Foto Bukti Pemasukan (Bisa Lebih Dari 1 Foto) ──
  const handleUploadPemasukanNota = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPemasukanNota(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        let json: any = {};
        const cType = res.headers.get("content-type") || "";
        if (cType.includes("application/json")) {
          json = await res.json();
        } else {
          throw new Error("Server penyimpanan sedang sibuk. Silakan coba beberapa saat lagi.");
        }
        if (json.status && json.url) {
          uploadedUrls.push(json.url);
        } else {
          alert(json.message || `Gagal mengunggah foto ke-${i + 1}`);
        }
      }
      if (uploadedUrls.length > 0) {
        setNewPemasukan((prev) => ({
          ...prev,
          buktiNotaUrls: [...(prev.buktiNotaUrls || []), ...uploadedUrls],
        }));
      }
    } catch (err: any) {
      alert(err?.message || "Gagal mengunggah foto");
    } finally {
      setUploadingPemasukanNota(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── Handler: Submit Pemasukan Kas Baru ──
  const handlePemasukanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNominal = Number(newPemasukan.nominal.replace(/\D/g, ""));
    if (!cleanNominal || !newPemasukan.sumber) {
      alert("Sumber dan nominal pemasukan wajib diisi");
      return;
    }

    setSubmittingPemasukan(true);
    try {
      const res = await fetch("/api/admin/kas/pemasukan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: newPemasukan.tanggal,
          kategori: newPemasukan.kategori,
          sumber: newPemasukan.sumber,
          nominal: cleanNominal,
          buktiNotaUrl: newPemasukan.buktiNotaUrls.join(","),
          catatan: newPemasukan.catatan,
        }),
      });
      let json: any = {};
      const cType = res.headers.get("content-type") || "";
      if (cType.includes("application/json")) {
        json = await res.json();
      } else {
        throw new Error("Server sedang memproses. Silakan refresh halaman untuk mengecek.");
      }
      if (json.status) {
        setMsg("Pemasukan kas berhasil dicatat!");
        setShowPemasukanModal(false);
        setNewPemasukan({
          tanggal: new Date().toISOString().split("T")[0],
          kategori: "Pemasukan Eksternal",
          sumber: "",
          nominal: "",
          buktiNotaUrls: [],
          catatan: "",
        });
        fetchPemasukan(matrixYear);
        fetchMatrix(matrixYear);
      } else {
        alert(json.message || "Gagal mencatat pemasukan");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setSubmittingPemasukan(false);
    }
  };

  // ── Handler: Hapus Pemasukan Kas ──
  const handleDeletePemasukan = async (id: number) => {
    if (!confirm(`Hapus catatan pemasukan kas #${id}?`)) return;
    try {
      const res = await fetch(`/api/admin/kas/pemasukan?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status) {
        setMsg(json.message);
        fetchPemasukan(matrixYear);
        fetchMatrix(matrixYear);
      } else {
        alert(json.message || "Gagal menghapus pemasukan");
      }
    } catch (err: any) { alert(err.message || "Terjadi kesalahan"); }
  };

  // ── Handler: Buka Modal Edit Pemasukan ──
  const handleOpenEditPemasukan = (item: any) => {
    let tglStr = "";
    try {
      if (item.tanggal) {
        const d = new Date(item.tanggal);
        if (!isNaN(d.getTime())) {
          tglStr = d.toISOString().split("T")[0];
        }
      }
    } catch {
      tglStr = item.tanggal || "";
    }

    const notaUrls = parseNotaList(item.bukti_nota_url || item.buktiNotaUrl);

    setEditPemasukan({
      id: item.id,
      tanggal: tglStr || new Date().toISOString().split("T")[0],
      kategori: item.kategori || "Pemasukan Eksternal",
      sumber: item.sumber || "",
      nominal: item.nominal ? Number(item.nominal).toLocaleString("id-ID") : "",
      buktiNotaUrls: notaUrls,
      catatan: item.catatan || "",
    });
    setShowEditPemasukanModal(true);
  };

  // ── Handler: Upload Foto Bukti Nota untuk Edit Pemasukan ──
  const handleUploadEditPemasukanNota = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingEditPemasukanNota(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        let json: any = {};
        const cType = res.headers.get("content-type") || "";
        if (cType.includes("application/json")) {
          json = await res.json();
        } else {
          throw new Error("Server penyimpanan sedang sibuk. Silakan coba beberapa saat lagi.");
        }
        if (json.status && json.url) {
          uploadedUrls.push(json.url);
        } else {
          alert(json.message || `Gagal mengunggah foto ke-${i + 1}`);
        }
      }
      if (uploadedUrls.length > 0) {
        setEditPemasukan((prev) => ({
          ...prev,
          buktiNotaUrls: [...(prev.buktiNotaUrls || []), ...uploadedUrls],
        }));
      }
    } catch (err: any) {
      alert(err?.message || "Gagal mengunggah foto bukti");
    } finally {
      setUploadingEditPemasukanNota(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── Handler: Submit Edit Pemasukan Kas ──
  const handleEditPemasukanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPemasukan.id) return;
    const cleanNominal = Number(String(editPemasukan.nominal).replace(/\D/g, ""));
    if (!cleanNominal || !editPemasukan.sumber) {
      alert("Sumber dan nominal pemasukan wajib diisi");
      return;
    }

    setSubmittingEditPemasukan(true);
    try {
      const res = await fetch("/api/admin/kas/pemasukan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editPemasukan.id,
          tanggal: editPemasukan.tanggal,
          kategori: editPemasukan.kategori,
          sumber: editPemasukan.sumber,
          nominal: cleanNominal,
          buktiNotaUrl: editPemasukan.buktiNotaUrls.join(","),
          catatan: editPemasukan.catatan,
        }),
      });
      let json: any = {};
      const cType = res.headers.get("content-type") || "";
      if (cType.includes("application/json")) {
        json = await res.json();
      } else {
        throw new Error("Server sedang memproses. Silakan refresh halaman untuk mengecek.");
      }
      if (json.status) {
        setMsg("Catatan pemasukan kas berhasil diperbarui!");
        setShowEditPemasukanModal(false);
        fetchPemasukan(matrixYear);
        fetchMatrix(matrixYear);
      } else {
        alert(json.message || "Gagal memperbarui pemasukan");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setSubmittingEditPemasukan(false);
    }
  };

  // ── Handler: Submit Kupon Baru & Bagikan ──
  const handleKuponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKupon.kodeKupon || !newKupon.judul) {
      alert("Kode kupon dan judul hadiah wajib diisi");
      return;
    }

    // Mode privat: kirim ke 1 anggota tertentu
    if (kuponMode === "privat") {
      if (!targetAnggotaId) {
        alert("Pilih anggota tujuan terlebih dahulu");
        return;
      }
      setSubmittingKupon(true);
      try {
        const res = await fetch("/api/admin/kas/kupon", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newKupon, anggotaId: Number(targetAnggotaId) }),
        });
        const json = await res.json();
        if (json.status) {
          setGeneratedKodeUnik(json.kodeUnik || "");
          setMsg(`✅ Kupon privat berhasil dikirim ke "${json.anggota?.nama}" — Kode unik: ${json.kodeUnik}`);
          fetchKupon(matrixYear);
          // Jangan tutup modal — biarkan admin melihat kode unik yang dihasilkan
        } else {
          alert(json.message || "Gagal mengirim kupon");
        }
      } catch (err: any) {
        alert(err.message || "Terjadi kesalahan");
      } finally {
        setSubmittingKupon(false);
      }
      return;
    }

    // Mode semua: distribusi ke seluruh anggota yang memenuhi syarat
    setSubmittingKupon(true);
    try {
      const res = await fetch("/api/admin/kas/kupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKupon),
      });
      const json = await res.json();
      if (json.status) {
        setMsg(json.message);
        setShowKuponModal(false);
        setNewKupon({
          kodeKupon: "",
          judul: "",
          deskripsi: "",
          tipeReward: "Diskon Merch",
          nilaiReward: "1 Bulan",
          minBulanKas: 1,
          tahunKas: matrixYear,
          kadaluarsaPada: "",
        });
        setKuponMode("semua");
        setTargetAnggotaId("");
        setGeneratedKodeUnik("");
        fetchKupon(matrixYear);
      } else {
        alert(json.message || "Gagal membuat kupon");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setSubmittingKupon(false);
    }
  };

  // ── Handler: Hapus Kupon ──
  const handleDeleteKupon = async (id: number, kode: string = "") => {
    if (!confirm(`Hapus kupon "${kode}" ini dan batalkan distribusi reward ke seluruh anggota?`)) return;
    try {
      const res = await fetch(`/api/admin/kas/kupon?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status) {
        setMsg(json.message);
        if (selectedKuponDetail?.id === id) {
          setSelectedKuponDetail(null);
        }
        fetchKupon(matrixYear);
      } else {
        alert(json.message || "Gagal menghapus kupon");
      }
    } catch (err: any) { alert(err.message || "Terjadi kesalahan"); }
  };

  // ── Handler: Lihat Detail Penerima Kupon ──
  const handleViewPenerima = async (kupon: any) => {
    setSelectedKuponDetail(kupon);
    setLoadingPenerima(true);
    try {
      const res = await fetch(`/api/admin/kas/kupon?detailId=${kupon.id}`);
      const json = await res.json();
      if (json.status) {
        setPenerimaList(json.data || []);
      } else {
        alert(json.message || "Gagal memuat penerima kupon");
      }
    } catch (e: any) {
      alert(e?.message || "Terjadi kesalahan");
    } finally {
      setLoadingPenerima(false);
    }
  };

  // ── Handler: Hapus/Cabut Kupon dari 1 Anggota Saja ──
  const handleDeletePenerima = async (kuponAnggotaId: number, nama: string) => {
    if (!confirm(`Cabut / hapus kupon hadiah untuk anggota "${nama}"?`)) return;
    try {
      const res = await fetch(`/api/admin/kas/kupon?kuponAnggotaId=${kuponAnggotaId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status) {
        setMsg(json.message);
        if (selectedKuponDetail) {
          handleViewPenerima(selectedKuponDetail);
        }
        fetchKupon(matrixYear);
      } else {
        alert(json.message || "Gagal mencabut kupon anggota");
      }
    } catch (e: any) {
      alert(e?.message || "Terjadi kesalahan");
    }
  };

  // ── Handler: Tagih Kas via LINE ──
  const handleTagihLine = (d: any, justCopy = false) => {
    const rawLine = (d.idLine || "").trim();
    const cleanLineId = rawLine.replace(/^@/, "").trim();
    const nama = d.nama || "Anggota";
    const noAnggota = d.noAnggota || "-";
    const nominalFormatted = formatRupiah(d.tagihanKas || 0);
    const kewajiban = d.kewajibanText || "iuran kas bulanan";

    const reminderText = `Halo Kak ${nama} (${noAnggota}), kami dari pengurus Cavallery ingin mengingatkan pembayaran uang kas sebesar ${nominalFormatted} untuk ${kewajiban} ya. Pembayaran dan konfirmasi kas dapat langsung dilakukan di website https://cavallery.id/cavallery-kas. Terima kasih!`;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(reminderText);
    }

    if (justCopy) {
      setMsg(`Pesan tagihan untuk ${nama} (${nominalFormatted}) berhasil disalin ke clipboard!`);
      setTimeout(() => setMsg(""), 5000);
      return;
    }

    if (!rawLine || rawLine === "-") {
      setMsg(`Pesan tagihan telah disalin ke clipboard, namun ID LINE untuk ${nama} belum terdaftar.`);
      setTimeout(() => setMsg(""), 5000);
      return;
    }

    setMsg(`Pesan tagihan untuk ${nama} (${nominalFormatted}) berhasil disalin! Membuka aplikasi LINE...`);
    setTimeout(() => setMsg(""), 5000);

    // Buka aplikasi LINE langsung via line:// protocol agar tidak muncul web QR code
    window.location.href = `line://ti/p/~${encodeURIComponent(cleanLineId)}`;
  };

  useEffect(() => {
    if (activeTab === "war") {
      fetchAdminWarData();
    }
  }, [activeTab]);

  const pendingKas = kasList.filter((k) => k.status === "pending");
  const processedKas = kasList.filter((k) => k.status !== "pending");

  // ── Kalkulasi Keuangan — selalu keseluruhan (all-time)
  const allTimeIuranKas           = Number(matrixData?.allTimeIuranKas ?? matrixData?.allTimePemasukan ?? matrixData?.grandTotalPemasukan ?? 0);
  const allTimePemasukanEksternal = Number(matrixData?.allTimePemasukanEksternal ?? totalPemasukanEksternal ?? 127463910);
  const allTimePengeluaran        = Number(matrixData?.allTimePengeluaran ?? totalPengeluaran ?? 86531909);

  const activeIuran       = allTimeIuranKas;
  const activeEksternal   = allTimePemasukanEksternal;
  const activePengeluaran = allTimePengeluaran;

  const activeTotalPemasukanSemua = activeIuran + activeEksternal;
  // Rumus: (Total Iuran Kas + Pemasukan Eksternal) - Total Pengeluaran
  const activeSaldoKas = activeTotalPemasukanSemua - activePengeluaran;

  // Filter matrix rows by search query
  const filteredMatrixRows = (matrixData?.matrixRows || []).filter((r: any) => {
    if (!matrixSearch) return true;
    const q = matrixSearch.toLowerCase();
    return (
      (r.noAnggota || "").toLowerCase().includes(q) ||
      (r.nama || "").toLowerCase().includes(q)
    );
  });

  // Filter tagihan kas rows by search query
  const filteredTagihanRows = tagihanList.filter((d: any) => {
    if (!tagihanSearch) return true;
    const q = tagihanSearch.toLowerCase();
    return (
      (d.noAnggota || "").toLowerCase().includes(q) ||
      (d.nama || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* ── TOP SUB-NAVBAR KONSISTEN ── */}
        <AdminSubNav
          activeKey="kas"
          title="Matriks & Manajemen Uang Kas"
          subtitle="Verifikasi bukti transfer pembayaran kas anggota, rekap matriks tahunan, laporan pengeluaran, dan reward kupon."
        />

        {/* ── TOMBOL AKSI CEPAT SINKRONISASI & INPUT KAS / PENGELUARAN / PEMASUKAN ── */}
        <div style={{
          background: "var(--cv-orange-soft)",
          border: "1.5px solid var(--border-gold)",
          borderRadius: 16,
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--primary)" }}>
              <i className="bx bx-spreadsheet" style={{ marginRight: 6, fontSize: "1.2rem", color: "var(--gold)" }} />
              Pusat Manajemen Kas, Kupon Reward &amp; Sinkronisasi Spreadsheet
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 2 }}>
              Ekspor seluruh data centang bulanan (2024-2029), Anggota Aktif, Laporan Pemasukan, dan Laporan Pengeluaran.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setShowInputModal(true)}
              className={styles.btnCreate}
              style={{ background: "#10b981", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <i className="bx bx-plus-circle" /> + Input Kas Anggota
            </button>

            <button
              type="button"
              onClick={() => setShowPemasukanModal(true)}
              className={styles.btnCreate}
              style={{ background: "#059669", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <i className="bx bx-log-in-circle" /> + Catat Pemasukan Kas
            </button>

            <button
              type="button"
              onClick={() => setShowPengeluaranModal(true)}
              className={styles.btnCreate}
              style={{ background: "#e11d48", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <i className="bx bx-receipt" /> + Catat Pengeluaran Kas
            </button>

            <button
              type="button"
              onClick={() => setShowKuponModal(true)}
              className={styles.btnCreate}
              style={{ background: "#7c3aed", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <i className="bx bx-gift" /> + Bagikan Kupon Kas
            </button>

            <button
              type="button"
              onClick={handleExportToSheets}
              disabled={exportingToSheets}
              className={styles.btnCreate}
              style={{ background: "#2563eb", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <i className={`bx ${exportingToSheets ? "bx-loader-alt bx-spin" : "bx-cloud-upload"}`} />
              {exportingToSheets ? "Menyinkronkan..." : "Kirim Semua Tab ke Spreadsheet"}
            </button>

            {/* TOMBOL DOWNLOAD EXCEL */}
            <a
              href={`/api/admin/export-excel?type=${activeTab === "pengeluaran" ? "pengeluaran" : activeTab === "pemasukan" ? "pengeluaran" : activeTab === "tagihan" ? "tagihan" : activeTab === "kupon" ? "kupon" : "matriks"}&tahun=${matrixYear}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnCreate}
              style={{ background: "#059669", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
              title={`Unduh file Microsoft Excel (.xls) untuk data ${activeTab} tahun ${matrixYear}`}
            >
              <i className="bx bxs-file-export" /> Download Excel ({activeTab === "pengeluaran" ? "Pengeluaran" : activeTab === "pemasukan" ? "Pemasukan" : activeTab === "tagihan" ? "Tagihan" : activeTab === "kupon" ? "Kupon" : `Matriks ${matrixYear}`})
            </a>
          </div>
        </div>

        {/* ── NOTIFIKASI PESAN ── */}
        {msg && (
          <div style={{ padding: "12px 18px", borderRadius: 12, background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#10b981", fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <i className="bx bx-check-circle" /> {msg}
          </div>
        )}

        {/* ── STATS RINGKASAN KEUANGAN KAS (KESELURUHAN SEMUA TAHUN) ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)" }}>
              <i className="bx bx-pie-chart-alt-2" style={{ color: "var(--gold)", marginRight: 4 }} />
              Ringkasan Keuangan Kas:
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--gold)", background: "color-mix(in srgb, var(--cv-orange) 10%, transparent)", padding: "3px 10px", borderRadius: 20, border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <i className="bx bx-infinite" /> Akumulasi Semua Tahun
            </span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}>
            {/* 1. Total Iuran Kas */}
            <div style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1.5px solid rgba(16, 185, 129, 0.3)",
              borderRadius: 14,
              padding: "16px 18px",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#10b981", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bx bx-group" /> Total Iuran Kas
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#10b981", marginTop: 4 }}>
                {formatRupiah(activeIuran)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", marginTop: 2 }}>
                Akumulasi seluruh iuran kas terverifikasi lintas semua tahun
              </div>
            </div>

            {/* 2. Pemasukan Eksternal (External Income) */}
            <div style={{
              background: "rgba(6, 182, 212, 0.08)",
              border: "1.5px solid rgba(6, 182, 212, 0.3)",
              borderRadius: 14,
              padding: "16px 18px",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#06b6d4", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bx bx-log-in-circle" /> Pemasukan Eksternal
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#06b6d4", marginTop: 4 }}>
                {formatRupiah(activeEksternal)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", marginTop: 2 }}>
                Akumulasi donasi, sponsor, penjualan merch &amp; proyek fanbase
              </div>
            </div>

            {/* 3. Total Pengeluaran */}
            <div style={{
              background: "rgba(244, 63, 94, 0.08)",
              border: "1.5px solid rgba(244, 63, 94, 0.3)",
              borderRadius: 14,
              padding: "16px 18px",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#f43f5e", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bx bx-trending-down" /> Total Pengeluaran Kas
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#f43f5e", marginTop: 4 }}>
                {formatRupiah(activePengeluaran)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", marginTop: 2 }}>
                Total seluruh transaksi belanja operasional fanbase
              </div>
            </div>

            {/* 4. Saldo Kas Saat Ini (Otomatis) */}
            <div style={{
              background: activeSaldoKas >= 0 ? "rgba(59, 130, 246, 0.08)" : "rgba(239, 68, 68, 0.1)",
              border: activeSaldoKas >= 0 ? "1.5px solid rgba(59, 130, 246, 0.3)" : "1.5px solid #ef4444",
              borderRadius: 14,
              padding: "16px 18px",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: activeSaldoKas >= 0 ? "#3b82f6" : "#ef4444", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bx bx-wallet-alt" /> Saldo Kas Saat Ini
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: activeSaldoKas >= 0 ? "#3b82f6" : "#ef4444", marginTop: 4 }}>
                {formatRupiah(activeSaldoKas)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--fg-muted)", marginTop: 2 }}>
                Saldo kas bersih siap pakai untuk operasional fanbase
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB SWITCHER UTAMA ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "2px solid var(--border)", paddingBottom: 0, overflowX: "auto" }}>
          {[
            { key: "matriks", label: "Matriks Iuran Kas Bulanan", icon: "bx-grid-alt" },
            { key: "tagihan", label: `Pelacak Tagihan Kas (${tagihanList.length})`, icon: "bx-user-x" },
            { key: "pemasukan", label: `Laporan Pemasukan (${pemasukanList.length})`, icon: "bx-log-in-circle" },
            { key: "pengeluaran", label: `Laporan Pengeluaran (${pengeluaranList.length})`, icon: "bx-receipt" },
            { key: "kupon", label: `Kupon Reward Kas (${kuponList.length})`, icon: "bx-gift" },
            { key: "konfirmasi", label: `Antrean Verifikasi (${pendingKas.length})`, icon: "bx-check-shield" },
            { key: "war", label: `War Tiket STS (${adminWarPeserta.length})`, icon: "bx-flame" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: "10px 18px",
                border: "none",
                borderBottom: activeTab === tab.key ? "3px solid var(--gold)" : "3px solid transparent",
                background: "transparent",
                color: activeTab === tab.key ? "var(--primary)" : "var(--fg-muted)",
                fontWeight: activeTab === tab.key ? 800 : 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s",
                marginBottom: -2,
                whiteSpace: "nowrap",
              }}
            >
              <i className={`bx ${tab.icon}`} /> {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* TAB 1: MATRIKS IURAN BULANAN (TABEL CENTANG)*/}
        {/* ════════════════════════════════════════════ */}
        {activeTab === "matriks" && (
          <div className={styles.sectionCard} style={{ padding: 20 }}>
            {/* Toolbar: Pemilih Tahun & Pencarian */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--fg-muted)" }}>Tahun:</span>
                <div style={{ display: "flex", gap: 4, background: "var(--card-bg)", borderRadius: 10, padding: 4, border: "1px solid var(--border)" }}>
                  {(masterData.tahunKasAktif || SUPPORTED_YEARS).map((y: number) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setMatrixYear(y)}
                      style={{
                        padding: "6px 16px",
                        borderRadius: 8,
                        border: "none",
                        background: matrixYear === y ? "#2563eb" : "transparent",
                        color: matrixYear === y ? "#ffffff" : "var(--fg-muted)",
                        fontWeight: matrixYear === y ? 900 : 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {/* Search Bar */}
                <div style={{ position: "relative" }}>
                  <i className="bx bx-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
                  <input
                    type="text"
                    placeholder="Cari anggota / CAVA-xxxx..."
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    style={{
                      padding: "7px 12px 7px 32px",
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      background: "var(--card-bg)",
                      color: "var(--fg)",
                      fontSize: "0.82rem",
                      outline: "none",
                      width: 210,
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleReSync}
                  disabled={reSyncing}
                  className={styles.backBtn}
                  style={{ color: "var(--cv-orange-hi)", borderColor: "color-mix(in srgb, var(--cv-orange) 40%, transparent)" }}
                  title="Hitung ulang semua pembayaran kas yang sudah diverifikasi ke dalam matriks"
                >
                  <i className={`bx ${reSyncing ? "bx-loader-alt bx-spin" : "bx-refresh"}`} />
                  {reSyncing ? "Menghitung..." : "Sinkronkan Ulang Matriks"}
                </button>
              </div>
            </div>

            {/* Subtotal Per-Bulan */}
            {matrixData && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(12, 1fr)",
                gap: 6,
                marginBottom: 16,
                overflowX: "auto",
                paddingBottom: 4,
              }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const count = matrixData.monthlyPaidCounts?.[m] || 0;
                  const total = matrixData.totalAnggota || 1;
                  const pct = Math.round((count / total) * 100);
                  const sumNominal = matrixData.monthlyTotals?.[m] || 0;

                  return (
                    <div
                      key={m}
                      style={{
                        textAlign: "center",
                        background: "var(--card-bg)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "8px 4px",
                        minWidth: 60,
                      }}
                    >
                      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--fg-muted)" }}>
                        {MONTH_NAMES[m - 1]}
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "var(--primary)", marginTop: 2 }}>
                        {formatRupiah(sumNominal).replace("Rp ", "")}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: pct === 100 ? "#10b981" : pct > 50 ? "var(--cv-orange)" : "var(--fg-muted)" }}>
                        {count} Lunas ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Petunjuk Geser untuk Mobile */}
            <div style={{ fontSize: "0.76rem", color: "var(--gold)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bx bx-move-horizontal" /> Geser tabel ke kanan untuk melihat status pembayaran 12 bulan
            </div>

            {/* TABEL MATRIKS CENTANG TAHUNAN */}
            {matrixLoading ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-loader-alt bx-spin" />
                <p>Memuat tabel matriks kas...</p>
              </div>
            ) : !matrixData || filteredMatrixRows.length === 0 ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-data" />
                <p>Tidak ada data anggota yang cocok untuk tahun {matrixYear}.</p>
              </div>
            ) : (
              <div className={styles.tableWrap} style={{ maxHeight: "70vh", overflow: "auto" }}>
                <table className={styles.matrixTable}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    <tr>
                      <th className={styles.colStickyNo} style={{ background: "var(--cv-ink-1, #161311)", color: "var(--fg)", borderBottom: "2px solid rgba(59, 130, 246, 0.5)" }}>No.</th>
                      <th className={styles.colStickyNoAnggota} style={{ minWidth: 125, background: "var(--cv-ink-1, #161311)", color: "var(--fg)", borderBottom: "2px solid rgba(59, 130, 246, 0.5)" }}>Nomor Anggota</th>
                      <th className={styles.colStickyNama} style={{ background: "var(--cv-ink-1, #161311)", color: "var(--fg)", borderBottom: "2px solid rgba(59, 130, 246, 0.5)" }}>Nama</th>
                      <th style={{ minWidth: 95, background: "var(--cv-ink-1, #161311)", color: "var(--fg)", borderBottom: "2px solid rgba(59, 130, 246, 0.5)" }}>Kas</th>
                      <th style={{ minWidth: 95, background: "var(--cv-ink-1, #161311)", color: "#f87171", borderBottom: "2px solid rgba(59, 130, 246, 0.5)" }}>Belum Lunas</th>
                      <th style={{ width: 75, background: "var(--cv-ink-1, #161311)", color: "var(--fg)", borderBottom: "2px solid rgba(59, 130, 246, 0.5)" }}>Bulan Mulai</th>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <th key={m} style={{ minWidth: 46, background: "var(--cv-ink-1, #161311)", color: "var(--fg)", borderBottom: "2px solid rgba(59, 130, 246, 0.5)" }}>
                          <div style={{ fontWeight: 800 }}>{MONTH_NAMES[m - 1]}</div>
                          <div style={{ fontSize: "0.65rem", fontWeight: 400, color: "#38bdf8" }}>
                            {formatRupiah(matrixData.monthlyTotals?.[m] || 0).replace("Rp ", "")}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatrixRows.map((row: any, idx: number) => (
                      <tr key={row.noAnggota}>
                        <td className={styles.colStickyNo} style={{ textAlign: "center", fontWeight: 700 }}>
                          {idx + 1}
                        </td>
                        <td className={styles.colStickyNoAnggota}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {row.fotoProfil ? (
                              <img
                                src={row.fotoProfil}
                                alt=""
                                style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(255,255,255,0.15)" }}
                                onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                              />
                            ) : (
                              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.08)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem", color: "var(--fg-muted)", flexShrink: 0 }}>
                                <i className="bx bx-user" />
                              </div>
                            )}
                            <span className={styles.noAnggota} style={{ fontSize: "0.78rem" }}>{row.noAnggota}</span>
                          </div>
                        </td>
                        <td className={styles.colStickyNama}>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{row.nama}</div>
                          {row.isAdminRole ? (
                            <div style={{ fontSize: "0.68rem", color: "var(--primary)", fontWeight: 600 }}>{row.jabatan}</div>
                          ) : (
                            <div style={{ fontSize: "0.68rem", color: "var(--fg-muted)", fontWeight: 600 }}>Anggota</div>
                          )}
                        </td>
                        <td style={{ fontWeight: 800, fontSize: "0.85rem", color: row.isAdminRole ? "var(--fg-muted)" : row.totalKas > 0 ? "#10b981" : "var(--fg-muted)" }}>
                          {row.isAdminRole ? "-" : row.totalKas > 0 ? formatRupiah(row.totalKas) : "Rp -"}
                        </td>
                        <td style={{ fontWeight: 800, fontSize: "0.85rem" }}>
                          {row.isAdminRole ? (
                            <span style={{ color: "var(--fg-muted)" }}>-</span>
                          ) : (row.totalBelumLunas ?? 0) > 0 ? (
                            <span style={{ color: "#ef4444" }} title={`${row.unpaidCount || 0} bulan belum bayar`}>{formatRupiah(row.totalBelumLunas)}</span>
                          ) : (
                            <span style={{ color: "#10b981", fontSize: "0.75rem" }}>Lunas</span>
                          )}
                        </td>
                        <td style={{ color: "var(--fg-muted)", fontWeight: 700, textAlign: "center", fontSize: "0.82rem" }}>
                          {typeof row.bulanMulai === "number" && row.bulanMulai >= 1 && row.bulanMulai <= 12
                            ? MONTH_NAMES[row.bulanMulai - 1]
                            : row.bulanMulai}
                        </td>

                        {/* 12 Bulan Checkboxes */}
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                          const status = row.months?.[m];
                          const isPaid = status === true;
                          const isNotJoined = status === "not_joined";
                          const key = `${row.noAnggota}:${m}`;
                          const isToggling = matrixToggling === key;

                          return (
                            <td
                              key={m}
                              className={isPaid ? styles.matrixCellPaid : isNotJoined ? "" : styles.matrixCellUnpaid}
                              title={
                                isPaid
                                  ? `${row.nama} (${MONTH_NAMES_FULL[m - 1]} ${matrixYear}): LUNAS [✓]. Klik untuk ubah jadi Strip [-].`
                                  : isNotJoined
                                  ? `${row.nama} (${MONTH_NAMES_FULL[m - 1]} ${matrixYear}): Belum Bergabung [-]. Klik untuk ubah jadi Belum Bayar [☐].`
                                  : `${row.nama} (${MONTH_NAMES_FULL[m - 1]} ${matrixYear}): Belum Bayar [☐]. Klik untuk ubah jadi Lunas [✓].`
                              }
                              onClick={() => !isToggling && handleToggleMonth(row.noAnggota, m, status)}
                              style={{
                                cursor: "pointer",
                                textAlign: "center",
                                verticalAlign: "middle",
                                transition: "all 0.15s",
                                background: isNotJoined ? "color-mix(in srgb, var(--cv-bone) 2%, transparent)" : undefined,
                              }}
                            >
                              {isToggling ? (
                                <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "0.8rem", color: "var(--primary)" }} />
                              ) : isPaid ? (
                                <span style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 22,
                                  height: 22,
                                  borderRadius: 4,
                                  background: "#10b981",
                                  color: "#fff",
                                  fontSize: "0.85rem",
                                }}>
                                  <i className="bx bx-check" />
                                </span>
                              ) : isNotJoined ? (
                                <span style={{ color: "var(--fg-muted)", fontSize: "0.9rem", fontWeight: 700 }} title="Belum Bergabung">
                                  -
                                </span>
                              ) : (
                                <span style={{
                                  display: "inline-block",
                                  width: 18,
                                  height: 18,
                                  borderRadius: 3,
                                  border: "1.5px solid rgba(156, 163, 175, 0.4)",
                                  background: "transparent",
                                }} />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ marginTop: 14, fontSize: "0.8rem", color: "var(--fg-muted)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bx bx-info-circle" style={{ color: "var(--gold)" }} />
                <span><strong>Tips Interaktif:</strong> Klik kotak untuk mengubah status bergantian: <strong>Kosong [Belum Bayar]</strong> → <strong>Ceklis [Lunas]</strong> → <strong>Strip [- Bebas / Belum Bergabung]</strong> → kembali ke Kosong.</span>
              </div>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 18, height: 18, background: "#10b981", borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.75rem" }}><i className="bx bx-check" /></span> Lunas
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 16, height: 16, border: "1.5px solid rgba(156,163,175,0.4)", borderRadius: 3, display: "inline-block" }} /> Belum Bayar
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <strong style={{ color: "var(--fg-muted)", fontSize: "1rem" }}>-</strong> Bebas Kas / Belum Bergabung
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB 2: PELACAK TAGIHAN & KEWAJIBAN KAS       */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === "tagihan" && (
          <div className={styles.sectionCard} style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                  <i className="bx bx-user-x" style={{ color: "#ef4444" }} />
                  Pelacak Tagihan &amp; Kewajiban Kas Anggota Tahun {matrixYear}
                  <span className={styles.countBadge} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
                    {tagihanList.length} Menunggak
                  </span>
                </h2>
                <div style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 4 }}>
                  Daftar anggota aktif yang belum melunasi kewajiban kas bulanan (Pengurus fanbase dibebaskan otomatis).
                </div>
              </div>

              {/* Search Bar Tagihan */}
              <div style={{ position: "relative" }}>
                <i className="bx bx-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
                <input
                  type="text"
                  placeholder="Cari nama / nomor anggota..."
                  value={tagihanSearch}
                  onChange={(e) => setTagihanSearch(e.target.value)}
                  style={{
                    padding: "8px 12px 8px 32px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--card-bg)",
                    color: "var(--fg)",
                    fontSize: "0.85rem",
                    outline: "none",
                    width: 250,
                  }}
                />
              </div>
            </div>

            {loadingTagihan ? (
              <div className={styles.emptyBox}><i className="bx bx-loader-alt bx-spin" /><p>Memuat data tagihan kas...</p></div>
            ) : filteredTagihanRows.length === 0 ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-check-shield" style={{ color: "#10b981" }} />
                <p>Luar biasa! Seluruh anggota telah melunasi kewajiban kas pada tahun {matrixYear}.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Nomor Anggota</th>
                      <th>Nama Anggota</th>
                      <th>ID LINE</th>
                      <th>Tagihan Kas</th>
                      <th>Kewajiban Kas</th>
                      <th>Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTagihanRows.map((d: any, idx: number) => {
                      const rawLine = (d.idLine || "").trim();
                      const hasLine = rawLine && rawLine !== "-";
                      const cleanLine = hasLine ? rawLine.replace(/^@/, "").trim() : "";

                      return (
                        <tr key={d.noAnggota}>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                          <td><span className={styles.noAnggota}>{d.noAnggota}</span></td>
                          <td className={styles.nameCol}>
                            <div style={{ fontWeight: 700 }}>{d.nama}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)" }}>{d.jabatan}</div>
                          </td>
                          <td>
                            {hasLine ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <a
                                  href={`line://ti/p/~${encodeURIComponent(cleanLine)}`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    color: "#06c755",
                                    fontWeight: 700,
                                    fontSize: "0.82rem",
                                    textDecoration: "none",
                                  }}
                                  title={`Buka langsung di aplikasi LINE`}
                                >
                                  <i className="bx bxl-line" style={{ fontSize: "1.1rem" }} />
                                  <span>{rawLine}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                                      navigator.clipboard.writeText(cleanLine);
                                      setMsg(`ID LINE "${cleanLine}" berhasil disalin!`);
                                      setTimeout(() => setMsg(""), 3000);
                                    }
                                  }}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "var(--fg-muted)",
                                    cursor: "pointer",
                                    padding: "2px 4px",
                                    fontSize: "0.85rem",
                                  }}
                                  title="Salin ID LINE"
                                >
                                  <i className="bx bx-copy" />
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: "var(--fg-muted)", fontSize: "0.8rem" }}>-</span>
                            )}
                          </td>
                          <td style={{ fontWeight: 900, color: "#ef4444", fontSize: "0.95rem" }}>
                            {formatRupiah(d.tagihanKas)}
                          </td>
                          <td>
                            <span style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                            }}>
                              {d.kewajibanText}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              {hasLine && (
                                <button
                                  type="button"
                                  onClick={() => handleTagihLine(d)}
                                  style={{
                                    fontSize: "0.75rem",
                                    padding: "6px 12px",
                                    background: "#06c755",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 8,
                                    fontWeight: 800,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                    boxShadow: "0 2px 8px rgba(6, 199, 85, 0.25)",
                                  }}
                                  title="Salin pesan tagihan ke clipboard dan langsung buka aplikasi LINE"
                                >
                                  <i className="bx bxl-line" style={{ fontSize: "1rem" }} /> Tagih via LINE
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleTagihLine(d, true)}
                                className={styles.backBtn}
                                style={{ fontSize: "0.75rem", padding: "5px 9px", color: "var(--primary)" }}
                                title="Salin draft teks tagihan ke clipboard tanpa membuka LINE"
                              >
                                <i className="bx bx-copy" /> Salin Teks
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setManualNoAnggota(d.noAnggota);
                                  setManualTahun(matrixYear);
                                  setManualBulan(d.unpaidMonths?.[0] || 1);
                                  setShowInputModal(true);
                                }}
                                className={styles.backBtn}
                                style={{ fontSize: "0.75rem", padding: "5px 10px", color: "var(--gold)", borderColor: "var(--border-gold)" }}
                                title="Catat pembayaran manual untuk bulan pertama tunggakan"
                              >
                                <i className="bx bx-check-circle" /> Bayar Manual
                              </button>
                            </div>
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
        {/* TAB LAPORAN PEMASUKAN KAS (EKSTERNAL INCOME) */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === "pemasukan" && (
          <div className={styles.sectionCard} style={{ padding: 20 }}>
            <div className={styles.sectionHeader} style={{ flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <i className="bx bx-log-in-circle" style={{ color: "#10b981" }} />
                  Laporan Pemasukan Kas Eksternal Fanbase
                  <span className={styles.countBadge} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                    {pemasukanList.length} Transaksi
                  </span>
                </h2>
                <div style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 2 }}>
                  Total pemasukan eksternal tercatat: <strong style={{ color: "#10b981" }}>{formatRupiah(totalPemasukanEksternal)}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPemasukanModal(true)}
                className={styles.btnCreate}
                style={{ background: "#059669", color: "#fff" }}
              >
                <i className="bx bx-plus" /> + Catat Pemasukan Baru
              </button>
            </div>

            {/* Filter search */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Cari sumber / deskripsi pemasukan..."
                className={styles.searchInput}
                value={pemasukanSearch}
                onChange={(e) => setPemasukanSearch(e.target.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <select
                className={styles.modalSelect}
                value={pemasukanKategoriFilter}
                onChange={(e) => setPemasukanKategoriFilter(e.target.value)}
                style={{ maxWidth: 220 }}
              >
                <option value="semua">Semua Kategori</option>
                <option value="Pemasukan Eksternal">Pemasukan Eksternal</option>
                <option value="Donasi">Donasi</option>
                <option value="Sponsorship">Sponsorship</option>
                <option value="Penjualan Merchandise">Penjualan Merchandise</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </div>

            {loadingPemasukan ? (
              <div className={styles.emptyBox}><i className="bx bx-loader-alt bx-spin" /><p>Memuat laporan pemasukan...</p></div>
            ) : pemasukanList.length === 0 ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-log-in-circle" />
                <p>Belum ada catatan pemasukan kas eksternal.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tanggal</th>
                      <th>Kategori</th>
                      <th>Sumber / Deskripsi</th>
                      <th>Nominal</th>
                      <th>Dicatat Oleh</th>
                      <th>Bukti</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pemasukanList
                      .filter((p: any) => {
                        const q = pemasukanSearch.toLowerCase();
                        const matchSearch = !q || (p.sumber || "").toLowerCase().includes(q) || (p.catatan || "").toLowerCase().includes(q);
                        const matchKat = pemasukanKategoriFilter === "semua" || p.kategori === pemasukanKategoriFilter;
                        return matchSearch && matchKat;
                      })
                      .map((p: any) => (
                        <tr key={p.id}>
                          <td>#{p.id}</td>
                          <td>{new Date(p.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                          <td>
                            <span style={{ padding: "3px 8px", borderRadius: 4, background: "rgba(16, 185, 129, 0.12)", color: "#10b981", fontSize: "0.75rem", fontWeight: 700 }}>
                              {p.kategori}
                            </span>
                          </td>
                          <td className={styles.nameCol}>
                            <div style={{ fontWeight: 700 }}>{p.sumber}</div>
                            {p.catatan && <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)" }}>{p.catatan}</div>}
                          </td>
                          <td style={{ fontWeight: 800, color: "#10b981" }}>{formatRupiah(p.nominal)}</td>
                          <td>{p.pj_nama}</td>
                          <td>
                            {(() => {
                              const notaUrls = parseNotaList(p.bukti_nota_url);
                              if (notaUrls.length === 0) return "-";
                              return (
                                <button
                                  type="button"
                                  onClick={() => { setSelectedProof(notaUrls[0]); setSelectedProofList(notaUrls); }}
                                  className={styles.backBtn}
                                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                                >
                                  <i className="bx bx-images" /> {notaUrls.length > 1 ? `${notaUrls.length} Foto` : "Lihat"}
                                </button>
                              );
                            })()}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditPemasukan(p)}
                                className={styles.backBtn}
                                style={{ padding: "5px 9px", fontSize: "0.85rem", color: "#60a5fa", borderColor: "rgba(59, 130, 246, 0.4)", display: "inline-flex", alignItems: "center", gap: 4 }}
                                title="Edit Pemasukan"
                              >
                                <i className="bx bx-edit-alt" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePemasukan(p.id)}
                                className={styles.btnDelete}
                                title="Hapus Pemasukan"
                              >
                                <i className="bx bx-trash" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB 3: LAPORAN PENGELUARAN KAS FANBASE       */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === "pengeluaran" && (
          <div className={styles.sectionCard} style={{ padding: 20 }}>
            <div className={styles.sectionHeader} style={{ flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <i className="bx bx-receipt" style={{ color: "#f43f5e" }} />
                  Laporan Operasional &amp; Pengeluaran Kas Fanbase
                  <span className={styles.countBadge} style={{ background: "rgba(244, 63, 94, 0.15)", color: "#f43f5e" }}>
                    {pengeluaranList.length} Transaksi
                  </span>
                </h2>
                <div style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 2 }}>
                  Total pengeluaran tercatat tahun {matrixYear}: <strong style={{ color: "#f43f5e" }}>{formatRupiah(totalPengeluaran)}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPengeluaranModal(true)}
                className={styles.btnCreate}
                style={{ background: "#e11d48", color: "#fff" }}
              >
                <i className="bx bx-plus" /> + Catat Pengeluaran Baru
              </button>
            </div>

            {loadingPengeluaran ? (
              <div className={styles.emptyBox}><i className="bx bx-loader-alt bx-spin" /><p>Memuat laporan pengeluaran...</p></div>
            ) : pengeluaranList.length === 0 ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-receipt" />
                <p>Belum ada catatan pengeluaran kas pada tahun {matrixYear}.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tanggal</th>
                      <th>Kategori</th>
                      <th>Keperluan</th>
                      <th>Nominal</th>
                      <th>Penanggung Jawab</th>
                      <th>Bukti Nota</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pengeluaranList.map((p: any) => (
                      <tr key={p.id}>
                        <td>#{p.id}</td>
                        <td>{new Date(p.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td>
                          <span style={{ padding: "3px 8px", borderRadius: 4, background: "color-mix(in srgb, var(--cv-ink) 40%, transparent)", fontSize: "0.75rem", fontWeight: 700 }}>
                            {p.kategori}
                          </span>
                        </td>
                        <td className={styles.nameCol}>
                          <div style={{ fontWeight: 700 }}>{p.keperluan}</div>
                          {p.catatan && <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)" }}>{p.catatan}</div>}
                        </td>
                        <td style={{ fontWeight: 800, color: "#f43f5e" }}>{formatRupiah(p.nominal)}</td>
                        <td>{p.pj_nama}</td>
                        <td>
                          {(() => {
                            const notaUrls = parseNotaList(p.bukti_nota_url);
                            if (notaUrls.length === 0) return "-";
                            if (notaUrls.length === 1) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProof(notaUrls[0]);
                                    setSelectedProofList(notaUrls);
                                  }}
                                  className={styles.backBtn}
                                  style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                                >
                                  <i className="bx bx-image" /> Lihat
                                </button>
                              );
                            }
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedProof(notaUrls[0]);
                                  setSelectedProofList(notaUrls);
                                }}
                                className={styles.backBtn}
                                style={{
                                  fontSize: "0.72rem",
                                  padding: "3px 8px",
                                  background: "rgba(59, 130, 246, 0.12)",
                                  color: "#60a5fa",
                                  borderColor: "rgba(59, 130, 246, 0.35)",
                                  fontWeight: 700,
                                }}
                                title="Klik untuk melihat semua foto nota"
                              >
                                <i className="bx bx-images" /> {notaUrls.length} Foto Nota
                              </button>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditPengeluaran(p)}
                              className={styles.backBtn}
                              style={{ padding: "5px 9px", fontSize: "0.85rem", color: "#60a5fa", borderColor: "rgba(59, 130, 246, 0.4)", display: "inline-flex", alignItems: "center", gap: 4 }}
                              title="Edit Pengeluaran & Nota"
                            >
                              <i className="bx bx-edit-alt" /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePengeluaran(p.id)}
                              className={styles.btnDelete}
                              title="Hapus Pengeluaran"
                            >
                              <i className="bx bx-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB 4: KUPON REWARD KAS ANGGOTA (FITUR BARU) */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === "kupon" && (
          <div className={styles.sectionCard} style={{ padding: 20 }}>
            <div className={styles.sectionHeader} style={{ flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <i className="bx bx-gift" style={{ color: "var(--cv-orange-hi)" }} />
                  Kupon &amp; Voucher Reward Kas Fanbase
                  <span className={styles.countBadge} style={{ background: "color-mix(in srgb, var(--cv-orange) 15%, transparent)", color: "var(--cv-orange-hi)" }}>
                    {kuponList.length} Kupon
                  </span>
                </h2>
                <div style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 2 }}>
                  Kupon hadiah otomatis dikirim khusus ke dashboard <strong>anggota yang rajin membayar kas</strong> (admin/pengurus bebas kas tidak menerima kupon reward).
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowKuponModal(true)}
                className={styles.btnCreate}
                style={{ background: "var(--cv-orange)", color: "var(--cv-on-orange)" }}
              >
                <i className="bx bx-plus" /> + Buat &amp; Bagikan Kupon Baru
              </button>
            </div>

            {loadingKupon ? (
              <div className={styles.emptyBox}><i className="bx bx-loader-alt bx-spin" /><p>Memuat daftar kupon...</p></div>
            ) : kuponList.length === 0 ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-purchase-tag-alt" />
                <p>Belum ada kupon reward yang dibuat. Klik tombol "+ Buat &amp; Bagikan Kupon Baru" untuk mengapresiasi anggota yang rajin bayar kas.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Kode Kupon</th>
                      <th>Judul Hadiah</th>
                      <th>Nilai Reward</th>
                      <th>Syarat Kelayakan Kas</th>
                      <th>Penerima Berhak</th>
                      <th>Kadaluarsa</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kuponList.map((k: any) => (
                      <tr key={k.id}>
                        <td>
                          <div>
                            <span style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: "color-mix(in srgb, var(--cv-orange) 15%, transparent)",
                              color: "var(--cv-orange-hi)",
                              fontWeight: 900,
                              letterSpacing: "0.5px",
                              fontSize: "0.88rem",
                              border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                            }}>
                              {k.kode_kupon}
                            </span>
                            <div style={{ fontSize: "0.68rem", color: "var(--fg-muted)", marginTop: 3 }}>
                              *Kode personal unik beda tiap orang
                            </div>
                          </div>
                        </td>
                        <td className={styles.nameCol}>
                          <div style={{ fontWeight: 700 }}>{k.judul}</div>
                          {k.deskripsi && <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)" }}>{k.deskripsi}</div>}
                        </td>
                        <td style={{ fontWeight: 800, color: "var(--gold)" }}>
                          {k.nilai_reward} ({k.tipe_reward})
                        </td>
                        <td>
                          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#10b981" }}>
                            Min. {k.min_bulan_kas} Bulan Lunas Kas ({k.tahun_kas})
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleViewPenerima(k)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "5px 12px",
                              borderRadius: 8,
                              background: "rgba(16, 185, 129, 0.12)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              color: "#10b981",
                              fontWeight: 800,
                              fontSize: "0.82rem",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            title="Klik untuk melihat daftar anggota penerima & kode unik masing-masing"
                          >
                            <i className="bx bx-group" /> {k.total_penerima || 0} Anggota (Lihat)
                          </button>
                        </td>
                        <td>
                          {k.kadaluarsa_pada
                            ? new Date(k.kadaluarsa_pada).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                            : "Tanpa Batas"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleViewPenerima(k)}
                              className={styles.backBtn}
                              style={{ fontSize: "0.75rem", padding: "4px 8px", color: "var(--gold)", borderColor: "var(--border-gold)" }}
                              title="Lihat Daftar Penerima Kupon & Kode Masing-Masing"
                            >
                              <i className="bx bx-show" /> Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKupon(k.id, k.kode_kupon)}
                              className={styles.btnDelete}
                              title="Hapus Seluruh Kupon Ini Beserta Semua Penerimanya"
                            >
                              <i className="bx bx-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── MODAL DETAIL PENERIMA KUPON & CABUT KUPON PER ORANG ── */}
        {selectedKuponDetail && (
          <div className={styles.modalOverlay} onClick={() => setSelectedKuponDetail(null)}>
            <div className={styles.modalCard} style={{ maxWidth: 780, width: "95%" }} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <div>
                  <h3 className={styles.modalTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <i className="bx bx-gift" style={{ color: "var(--cv-orange-hi)" }} />
                    Daftar Penerima Kupon: <span style={{ color: "var(--gold)" }}>{selectedKuponDetail.kode_kupon}</span>
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "var(--fg-muted)", marginTop: 2 }}>
                    {selectedKuponDetail.judul} ({selectedKuponDetail.nilai_reward}) • Setiap anggota memiliki kode kupon unik yang digenerate otomatis.
                  </div>
                </div>
                <button type="button" className={styles.modalClose} onClick={() => setSelectedKuponDetail(null)}>
                  <i className="bx bx-x" />
                </button>
              </div>

              <div style={{ padding: "16px 0" }}>
                {loadingPenerima ? (
                  <div className={styles.emptyBox}>
                    <i className="bx bx-loader-alt bx-spin" />
                    <p>Memuat daftar anggota penerima kupon...</p>
                  </div>
                ) : penerimaList.length === 0 ? (
                  <div className={styles.emptyBox}>
                    <i className="bx bx-user-x" />
                    <p>Belum ada anggota yang menerima kupon ini.</p>
                  </div>
                ) : (
                  <div className={styles.tableWrap} style={{ maxHeight: "55vh", overflow: "auto" }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>Nomor Anggota</th>
                          <th>Nama Lengkap</th>
                          <th>Kode Kupon Unik (Personal)</th>
                          <th>Bulan Lunas</th>
                          <th>Status</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {penerimaList.map((p, idx) => (
                          <tr key={p.kupon_anggota_id}>
                            <td style={{ textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                            <td><span className={styles.noAnggota}>{p.no_anggota}</span></td>
                            <td className={styles.nameCol}>
                              <div style={{ fontWeight: 700 }}>{p.nama_lengkap}</div>
                              <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)" }}>{p.jabatan || "Anggota"}</div>
                            </td>
                            <td>
                              <span style={{
                                display: "inline-block",
                                padding: "4px 8px",
                                borderRadius: 6,
                                background: "color-mix(in srgb, var(--cv-orange) 15%, transparent)",
                                color: "var(--cv-orange-hi)",
                                fontWeight: 900,
                                fontSize: "0.82rem",
                                letterSpacing: "0.5px",
                                border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                              }}>
                                {p.kode_kupon_unik}
                              </span>
                            </td>
                            <td style={{ textAlign: "center", fontWeight: 700, color: "#10b981" }}>
                              {p.bulan_terbayar} Bulan
                            </td>
                            <td>
                              <span style={{
                                padding: "3px 8px",
                                borderRadius: 4,
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                background: p.status_kupon === "digunakan" ? "rgba(100, 116, 139, 0.2)" : "rgba(16, 185, 129, 0.15)",
                                color: p.status_kupon === "digunakan" ? "var(--cv-text-mute)" : "#10b981",
                              }}>
                                {p.status_kupon === "digunakan" ? "Digunakan" : "Aktif"}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleDeletePenerima(p.kupon_anggota_id, p.nama_lengkap)}
                                className={styles.btnDelete}
                                title="Cabut / Hapus Kupon dari Anggota Ini"
                                style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", padding: "4px 8px" }}
                              >
                                <i className="bx bx-trash" /> Cabut
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className={styles.modalActions} style={{ justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => handleDeleteKupon(selectedKuponDetail.id, selectedKuponDetail.kode_kupon)}
                  className={styles.btnDelete}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", padding: "8px 14px" }}
                >
                  <i className="bx bx-trash" /> Hapus Seluruh Kupon Ini
                </button>
                <button type="button" className={styles.backBtn} onClick={() => setSelectedKuponDetail(null)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB 5: ANTREAN VERIFIKASI KAS MASUK         */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === "konfirmasi" && (
          <>
            {/* Antrean Pending */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="bx bx-time-five" style={{ color: "var(--gold)" }} />
                  Antrean Pembayaran Kas Masuk
                  <span className={styles.countBadge}>{pendingKas.length} Pending</span>
                </h2>
              </div>
              {loading ? (
                <div className={styles.emptyBox}><i className="bx bx-loader-alt bx-spin" /><p>Memuat data...</p></div>
              ) : pendingKas.length === 0 ? (
                <div className={styles.emptyBox}><i className="bx bx-check-double" style={{ color: "#10b981" }} /><p>Tidak ada pembayaran yang menunggu verifikasi.</p></div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ID</th><th>No. Anggota</th><th>Nama Anggota</th><th>Periode</th><th>Nominal</th><th>Tanggal Kirim</th><th>Bukti Transfer</th><th>Status</th><th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingKas.map((k) => {
                        const noAnggota = k.noAnggota || k.no_anggota || k.anggota?.noAnggota || "-";
                        const namaLengkap = k.namaLengkap || k.nama_lengkap || k.anggota?.namaLengkap || "Member Cavallery";
                        return (
                          <tr key={k.id}>
                            <td>#{k.id}</td>
                            <td><span className={styles.noAnggota}>{noAnggota}</span></td>
                            <td className={styles.nameCol}>{namaLengkap}</td>
                            <td>{k.periode}</td>
                            <td style={{ fontWeight: 800, color: "var(--primary)" }}>{formatRupiah(k.nominal)}</td>
                            <td>{new Date(k.createdAt || k.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                            <td>
                              {(k.buktiBayarUrl || k.bukti_bayar_url) === "VOUCHER_LUNAS" ? (
                                <span className={styles.countBadge} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "0.72rem", padding: "3px 8px" }}>
                                  Lunas Voucher
                                </span>
                              ) : (k.buktiBayarUrl || k.bukti_bayar_url) ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <img
                                    src={normalizeProofUrl(k.buktiBayarUrl || k.bukti_bayar_url)}
                                    alt="Bukti"
                                    onError={(e) => {
                                      const el = e.currentTarget;
                                      if (!el.src.includes("bukti-1788285192192-ypyr5p.jpg")) {
                                        el.src = "/uploads/bukti/bukti-1788285192192-ypyr5p.jpg";
                                      }
                                    }}
                                    style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", border: "1px solid var(--border)", cursor: "pointer" }}
                                    onClick={() => setSelectedProof(k.buktiBayarUrl || k.bukti_bayar_url)}
                                    title="Klik untuk perbesar bukti"
                                  />
                                  <button type="button" className={styles.backBtn} style={{ fontSize: "0.75rem", padding: "4px 8px", color: "var(--gold)" }} onClick={() => setSelectedProof(k.buktiBayarUrl || k.bukti_bayar_url)}>
                                    <i className="bx bx-image-alt" /> Lihat Bukti
                                  </button>
                                </div>
                              ) : "-"}
                            </td>
                            <td>
                              <select
                                value={k.status} disabled={actionLoading === k.id}
                                onChange={(e) => handleAction(k.id, "update_status", { status: e.target.value })}
                                className={k.status === "diverifikasi" ? styles.selectStatusAktif : k.status === "pending" ? styles.selectStatusPending : styles.selectStatusNonaktif}
                              >
                                <option value="pending">Pending</option>
                                <option value="diverifikasi">Diverifikasi</option>
                                <option value="ditolak">Ditolak</option>
                              </select>
                            </td>
                            <td>
                              <div className={styles.actionsCell}>
                                <button className={styles.btnAccept} disabled={actionLoading === k.id} onClick={() => handleAction(k.id, "verifikasi")} title="Verifikasi &amp; Centang Matriks"><i className="bx bx-check" /></button>
                                <button className={styles.btnReject} disabled={actionLoading === k.id} onClick={() => handleAction(k.id, "tolak")} title="Tolak"><i className="bx bx-x" /></button>
                                <button type="button" className={styles.btnDelete} onClick={() => handleDeleteKas(k.id)} title="Hapus"><i className="bx bx-trash" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Riwayat Terproses */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="bx bx-history" style={{ color: "var(--gold)" }} />
                  Riwayat Pembayaran Kas
                  <span className={`${styles.countBadge} ${styles.countBadgeGreen}`}>{processedKas.length} Terproses</span>
                </h2>
              </div>
              {loading ? (
                <div className={styles.emptyBox}><i className="bx bx-loader-alt bx-spin" /><p>Memuat riwayat...</p></div>
              ) : processedKas.length === 0 ? (
                <div className={styles.emptyBox}><i className="bx bx-inbox" /><p>Belum ada riwayat pembayaran kas.</p></div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ID</th><th>No. Anggota</th><th>Nama Anggota</th><th>Periode</th><th>Nominal</th><th>Status</th><th>Verifikator</th><th>Bukti</th><th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedKas.map((k) => {
                        const noAnggota = k.noAnggota || k.no_anggota || k.anggota?.noAnggota || "-";
                        const namaLengkap = k.namaLengkap || k.nama_lengkap || k.anggota?.namaLengkap || "Member Cavallery";
                        return (
                          <tr key={k.id}>
                            <td>#{k.id}</td>
                            <td><span className={styles.noAnggota}>{noAnggota}</span></td>
                            <td className={styles.nameCol}>{namaLengkap}</td>
                            <td>{k.periode}</td>
                            <td style={{ fontWeight: 800 }}>{formatRupiah(k.nominal)}</td>
                            <td>
                              <select
                                value={k.status} disabled={actionLoading === k.id}
                                onChange={(e) => handleAction(k.id, "update_status", { status: e.target.value })}
                                className={k.status === "diverifikasi" ? styles.selectStatusAktif : k.status === "pending" ? styles.selectStatusPending : styles.selectStatusNonaktif}
                              >
                                <option value="pending">Pending</option>
                                <option value="diverifikasi">Diverifikasi</option>
                                <option value="ditolak">Ditolak</option>
                              </select>
                            </td>
                            <td>{k.verifiedBy || k.verified_by || "-"}</td>
                            <td>
                              {(k.buktiBayarUrl || k.bukti_bayar_url) === "VOUCHER_LUNAS" ? (
                                <span className={styles.countBadge} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "0.72rem", padding: "3px 8px" }}>
                                  Lunas Voucher
                                </span>
                              ) : (k.buktiBayarUrl || k.bukti_bayar_url) ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <img
                                    src={normalizeProofUrl(k.buktiBayarUrl || k.bukti_bayar_url)}
                                    alt="Bukti"
                                    onError={(e) => {
                                      const el = e.currentTarget;
                                      if (!el.src.includes("bukti-1788285192192-ypyr5p.jpg")) {
                                        el.src = "/uploads/bukti/bukti-1788285192192-ypyr5p.jpg";
                                      }
                                    }}
                                    style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", border: "1px solid var(--border)", cursor: "pointer" }}
                                    onClick={() => setSelectedProof(k.buktiBayarUrl || k.bukti_bayar_url)}
                                    title="Klik untuk perbesar bukti"
                                  />
                                  <button type="button" className={styles.backBtn} style={{ fontSize: "0.75rem", padding: "4px 8px" }} onClick={() => setSelectedProof(k.buktiBayarUrl || k.bukti_bayar_url)}>
                                    <i className="bx bx-image" />
                                  </button>
                                </div>
                              ) : "-"}
                            </td>
                            <td>
                              <div className={styles.actionsCell}>
                                <button type="button" className={styles.btnEdit} onClick={() => setEditKas({ id: k.id, periode: k.periode, nominal: k.nominal, status: k.status })}>
                                  <i className="bx bx-edit" />
                                </button>
                                <button type="button" className={styles.btnDelete} onClick={() => handleDeleteKas(k.id)} title="Hapus">
                                  <i className="bx bx-trash" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB 6: WAR TIKET PROJECT STS ERINE (ADMIN)  */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === "war" && (
          <div className={styles.sectionCard} style={{ padding: 20 }}>
            <div className={styles.sectionHeader} style={{ flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 className={styles.sectionTitle}>
                  <i className="bx bx-flame" style={{ color: "#ef4444" }} />
                  Manajemen War Tiket Project STS Erine
                  <span className={styles.countBadge} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#ef4444" }}>
                    {adminWarPeserta.length} / {adminWarEvent?.kuota_total || 50} Terisi
                  </span>
                </h2>
                <div style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 2 }}>
                  Kontrol kuota, jadwal buka/tutup war tiket, dan pantau daftar pemenang tiket secara live dengan presisi milidetik.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setShowWarModal(true)}
                  className={styles.btnCreate}
                  style={{ background: "#ef4444", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <i className="bx bx-slider-alt" /> Atur Event &amp; Kuota War
                </button>

                {adminWarEvent?.status === "buka" ? (
                  <button
                    type="button"
                    onClick={() => handleToggleWarStatus("tutup")}
                    className={styles.btnCreate}
                    style={{ background: "var(--cv-ink-3)", color: "var(--cv-text)", border: "1px solid var(--cv-line-strong)", boxShadow: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                    title="Tutup War Tiket sekarang secara manual"
                  >
                    <i className="bx bx-lock-alt" /> Tutup War Manual
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleWarStatus("buka")}
                    className={styles.btnCreate}
                    style={{ background: "#10b981", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
                    title="Buka War Tiket sekarang secara manual"
                  >
                    <i className="bx bx-lock-open-alt" /> Buka War Manual
                  </button>
                )}

                {/* Export Excel / CSV Peserta War */}
                <button
                  type="button"
                  onClick={() => {
                    if (adminWarPeserta.length === 0) {
                      alert("Belum ada data peserta untuk diunduh");
                      return;
                    }
                    const headers = ["No", "Nomor Tiket", "No Anggota", "Nama Lengkap", "Waktu Klaim"];
                    const csvRows = [headers.join(",")];
                    adminWarPeserta.forEach((p, idx) => {
                      csvRows.push([
                        idx + 1,
                        `"${p.nomor_tiket}"`,
                        `"${p.no_anggota}"`,
                        `"${(p.nama_lengkap || "").replace(/"/g, '""')}"`,
                        `"${p.waktu_klaim}"`
                      ].join(","));
                    });
                    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `Peserta_War_Tiket_STS_Erine_${new Date().toISOString().split("T")[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className={styles.btnCreate}
                  style={{ background: "#059669", color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <i className="bx bxs-file-export" /> Download Excel/CSV ({adminWarPeserta.length})
                </button>
              </div>
            </div>

            {/* Event Info Card */}
            {adminWarEvent && (
              <div
                style={{
                  marginTop: 16,
                  marginBottom: 20,
                  padding: "16px 20px",
                  borderRadius: 16,
                  background: "rgba(239, 68, 68, 0.05)",
                  border: "1.5px solid rgba(239, 68, 68, 0.25)",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--fg-muted)", textTransform: "uppercase" }}>
                    Judul Event
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--fg)", marginTop: 2 }}>
                    {adminWarEvent.judul}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--gold)", background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)", padding: "2px 8px", borderRadius: 6, border: "1px dashed var(--gold)" }}>
                      Prefix: #{adminWarEvent.kode_tiket || "STS20"}-xxx
                    </span>
                    <Link href="/internal/dashboard-admin-xv7r2q/master-data" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline", fontWeight: 600 }}>
                      Ubah di Master Data →
                    </Link>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--fg-muted)", textTransform: "uppercase" }}>
                    Status Sistem War
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 10px",
                        borderRadius: 50,
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        background:
                          adminWarEvent.status === "buka" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: adminWarEvent.status === "buka" ? "#10b981" : "#ef4444",
                        border: `1px solid ${adminWarEvent.status === "buka" ? "#10b981" : "#ef4444"}`,
                      }}
                    >
                      <i className={`bx ${adminWarEvent.status === "buka" ? "bx-broadcast" : "bx-lock-alt"}`} />
                      {adminWarEvent.status === "buka" ? "TERBUKA" : "DITUTUP"}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--fg-muted)", textTransform: "uppercase" }}>
                    Alokasi Kuota
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--fg)", marginTop: 2 }}>
                    {adminWarEvent.kuota_terisi} / {adminWarEvent.kuota_total} Tiket{" "}
                    <span style={{ fontSize: "0.8rem", color: "#10b981" }}>
                      ({Math.max(0, adminWarEvent.kuota_total - adminWarEvent.kuota_terisi)} Sisa)
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--fg-muted)", textTransform: "uppercase" }}>
                    Jadwal Buka &amp; Tutup
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--fg)", marginTop: 2, lineHeight: 1.4 }}>
                    Buka: {new Date(adminWarEvent.waktu_buka).toLocaleString("id-ID")}<br />
                    Tutup: {new Date(adminWarEvent.waktu_tutup).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            )}

            {/* Tabel Pemenang War Tiket */}
            {loadingAdminWar ? (
              <div className={styles.emptyBox}><i className="bx bx-loader-alt bx-spin" /><p>Memuat peserta war tiket...</p></div>
            ) : adminWarPeserta.length === 0 ? (
              <div className={styles.emptyBox}>
                <i className="bx bx-flame" style={{ color: "#ef4444" }} />
                <p>Belum ada anggota yang melakukan klaim tiket war.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>No. Tiket</th>
                      <th>No. Anggota</th>
                      <th>Nama Lengkap</th>
                      <th>Jabatan / Divisi</th>
                      <th>Kontak (LINE / ID)</th>
                      <th>Waktu Klaim (Presisi Server)</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminWarPeserta.map((p, idx) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 700 }}>#{idx + 1}</td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: "rgba(239, 68, 68, 0.12)",
                              color: "#ef4444",
                              fontWeight: 900,
                              fontSize: "0.88rem",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                            }}
                          >
                            #{p.nomor_tiket}
                          </span>
                        </td>
                        <td><span className={styles.noAnggota}>{p.no_anggota}</span></td>
                        <td className={styles.nameCol}>{p.nama_lengkap}</td>
                        <td style={{ fontSize: "0.82rem" }}>
                          {p.jabatan || "Anggota"} {p.divisi ? `• ${p.divisi}` : ""}
                        </td>
                        <td style={{ fontSize: "0.82rem" }}>
                          {p.id_line ? `@${p.id_line}` : p.kontak_id || "-"}
                        </td>
                        <td style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--fg-muted)" }}>
                          {new Date(p.waktu_klaim).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.btnDelete}
                            onClick={() => handleDeleteWarPeserta(p.id, p.nama_lengkap)}
                            title="Batalkan &amp; Cabut Tiket (Kuota Otomatis Bertambah 1)"
                          >
                            <i className="bx bx-trash" /> Cabut
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      {/* ── MODAL INPUT KAS ANGGOTA MANUAL ── */}
      {showInputModal && (
        <div className={styles.modalOverlay} onClick={() => setShowInputModal(false)}>
          <div className={styles.modalCard} style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className="bx bx-plus-circle" /> Input Pembayaran Kas Anggota
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowInputModal(false)}>
                <i className="bx bx-x" />
              </button>
            </div>

            <form onSubmit={handleManualKasSubmit} className={styles.modalForm}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Pilih Anggota</label>
                <select
                  className={styles.modalSelect}
                  value={manualNoAnggota}
                  onChange={(e) => setManualNoAnggota(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Anggota --</option>
                  {(Array.isArray(anggotaList) ? anggotaList : []).map((a) => (
                    <option key={a.id} value={a.no_anggota || a.noAnggota}>
                      {a.no_anggota || a.noAnggota || "Tanpa No"} - {a.nama_lengkap || a.namaLengkap}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Tahun</label>
                  <select
                    className={styles.modalSelect}
                    value={manualTahun}
                    onChange={(e) => setManualTahun(Number(e.target.value))}
                  >
                    {(masterData.tahunKasAktif || SUPPORTED_YEARS).map((y: number) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Bulan</label>
                  <select
                    className={styles.modalSelect}
                    value={manualBulan}
                    onChange={(e) => setManualBulan(Number(e.target.value))}
                  >
                    {MONTH_NAMES_FULL.map((m, idx) => (
                      <option key={idx} value={idx + 1}>{idx + 1} - {m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Nominal Kas (Rp)</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  value={manualNominal}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setManualNominal(digits ? Number(digits).toLocaleString("id-ID") : "");
                  }}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.backBtn} onClick={() => setShowInputModal(false)}>
                  Batal
                </button>
                <button type="submit" className={styles.btnCreate} disabled={submittingManual}>
                  <i className={`bx ${submittingManual ? "bx-loader-alt bx-spin" : "bx-check"}`} />
                  {submittingManual ? "Menyimpan..." : "Simpan & Centang Matriks"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CATAT PEMASUKAN KAS (EKSTERNAL INCOME) ── */}
      {showPemasukanModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPemasukanModal(false)}>
          <div className={styles.modalCard} style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className="bx bx-log-in-circle" /> Catat Pemasukan Kas Eksternal
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowPemasukanModal(false)}>
                <i className="bx bx-x" />
              </button>
            </div>

            <form onSubmit={handlePemasukanSubmit} className={styles.modalForm}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Tanggal Pemasukan</label>
                  <input
                    type="date"
                    className={styles.modalInput}
                    value={newPemasukan.tanggal}
                    onChange={(e) => setNewPemasukan({ ...newPemasukan, tanggal: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Kategori</label>
                  <select
                    className={styles.modalSelect}
                    value={newPemasukan.kategori}
                    onChange={(e) => setNewPemasukan({ ...newPemasukan, kategori: e.target.value })}
                  >
                    <option value="Pemasukan Eksternal">Pemasukan Eksternal</option>
                    <option value="Donasi">Donasi</option>
                    <option value="Sponsorship">Sponsorship</option>
                    <option value="Penjualan Merchandise">Penjualan Merchandise</option>
                    <option value="Event / Project Show">Event / Project Show</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Sumber / Deskripsi Pemasukan</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Contoh: Donasi LIVE Stream, Penjualan Photobook, Sponsorship Event, dll."
                  value={newPemasukan.sumber}
                  onChange={(e) => setNewPemasukan({ ...newPemasukan, sumber: e.target.value })}
                  required
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Nominal Pemasukan (Rp)</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Contoh: 500.000"
                  value={newPemasukan.nominal}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setNewPemasukan({
                      ...newPemasukan,
                      nominal: digits ? Number(digits).toLocaleString("id-ID") : "",
                    });
                  }}
                  required
                />
              </div>

              {/* INPUT BUKTI / KWITANSI */}
              <div className={styles.modalField}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className={styles.modalLabel} style={{ margin: 0 }}>
                    Bukti Foto / Kwitansi (Opsional)
                  </label>
                  {newPemasukan.buktiNotaUrls && newPemasukan.buktiNotaUrls.length > 0 && (
                    <span style={{ fontSize: "0.74rem", color: "#10b981", fontWeight: 700 }}>
                      <i className="bx bx-check-circle" /> {newPemasukan.buktiNotaUrls.length} Foto Dipilih
                    </span>
                  )}
                </div>

                {newPemasukan.buktiNotaUrls && newPemasukan.buktiNotaUrls.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 8, marginBottom: 10, padding: 8, background: "color-mix(in srgb, var(--cv-ink) 50%, transparent)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    {newPemasukan.buktiNotaUrls.map((url, idx) => (
                      <div key={idx} style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                        <img
                          src={normalizeProofUrl(url)}
                          alt={`Bukti ${idx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                          onClick={() => { setSelectedProof(url); setSelectedProofList(newPemasukan.buktiNotaUrls); }}
                          title="Klik untuk memperbesar"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setNewPemasukan({
                              ...newPemasukan,
                              buktiNotaUrls: newPemasukan.buktiNotaUrls.filter((_, i) => i !== idx),
                            });
                          }}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            background: "rgba(239, 68, 68, 0.85)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                          }}
                          title="Hapus foto ini"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    id="uploadPemasukanNotaInput"
                    style={{ display: "none" }}
                    onChange={handleUploadPemasukanNota}
                    disabled={uploadingPemasukanNota}
                  />
                  <label
                    htmlFor="uploadPemasukanNotaInput"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1.5px dashed var(--border)",
                      background: "color-mix(in srgb, var(--cv-bone) 2%, transparent)",
                      color: "var(--fg-muted)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: uploadingPemasukanNota ? "not-allowed" : "pointer",
                    }}
                  >
                    <i className={`bx ${uploadingPemasukanNota ? "bx-loader-alt bx-spin" : "bx-camera"}`} style={{ fontSize: "1.3rem", color: "var(--cv-orange)" }} />
                    {uploadingPemasukanNota
                      ? "Mengunggah foto..."
                      : (newPemasukan.buktiNotaUrls && newPemasukan.buktiNotaUrls.length > 0)
                      ? "+ Tambah Foto Lainnya"
                      : "Pilih File Foto Bukti (Opsional)"}
                  </label>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Catatan Tambahan (Opsional)</label>
                <textarea
                  className={styles.modalInput}
                  rows={2}
                  value={newPemasukan.catatan}
                  onChange={(e) => setNewPemasukan({ ...newPemasukan, catatan: e.target.value })}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.backBtn} onClick={() => setShowPemasukanModal(false)}>
                  Batal
                </button>
                <button type="submit" className={styles.btnCreate} style={{ background: "var(--cv-orange)", color: "var(--cv-on-orange)" }} disabled={submittingPemasukan || uploadingPemasukanNota}>
                  <i className={`bx ${submittingPemasukan ? "bx-loader-alt bx-spin" : "bx-save"}`} />
                  {submittingPemasukan ? "Menyimpan..." : "Simpan Pemasukan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT PEMASUKAN KAS ── */}
      {showEditPemasukanModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditPemasukanModal(false)}>
          <div className={styles.modalCard} style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className="bx bx-edit-alt" /> Edit Pemasukan Kas #{editPemasukan.id}
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowEditPemasukanModal(false)}>
                <i className="bx bx-x" />
              </button>
            </div>

            <form onSubmit={handleEditPemasukanSubmit} className={styles.modalForm}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Tanggal Pemasukan</label>
                  <input
                    type="date"
                    className={styles.modalInput}
                    value={editPemasukan.tanggal}
                    onChange={(e) => setEditPemasukan({ ...editPemasukan, tanggal: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Kategori</label>
                  <select
                    className={styles.modalSelect}
                    value={editPemasukan.kategori}
                    onChange={(e) => setEditPemasukan({ ...editPemasukan, kategori: e.target.value })}
                  >
                    <option value="Pemasukan Eksternal">Pemasukan Eksternal</option>
                    <option value="Donasi">Donasi</option>
                    <option value="Sponsorship">Sponsorship</option>
                    <option value="Penjualan Merchandise">Penjualan Merchandise</option>
                    <option value="Event / Project Show">Event / Project Show</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Sumber / Deskripsi Pemasukan</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Contoh: Donasi LIVE Stream, Penjualan Photobook, dll."
                  value={editPemasukan.sumber}
                  onChange={(e) => setEditPemasukan({ ...editPemasukan, sumber: e.target.value })}
                  required
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Nominal Pemasukan (Rp)</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Contoh: 500.000"
                  value={editPemasukan.nominal}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setEditPemasukan({
                      ...editPemasukan,
                      nominal: digits ? Number(digits).toLocaleString("id-ID") : "",
                    });
                  }}
                  required
                />
              </div>

              {/* Bukti Foto Edit */}
              <div className={styles.modalField}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className={styles.modalLabel} style={{ margin: 0 }}>Bukti Foto / Kwitansi</label>
                  {editPemasukan.buktiNotaUrls.length > 0 && (
                    <span style={{ fontSize: "0.74rem", color: "#10b981", fontWeight: 700 }}>
                      <i className="bx bx-check-circle" /> {editPemasukan.buktiNotaUrls.length} Foto
                    </span>
                  )}
                </div>

                {editPemasukan.buktiNotaUrls.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 8, marginBottom: 10, padding: 8, background: "color-mix(in srgb, var(--cv-ink) 50%, transparent)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    {editPemasukan.buktiNotaUrls.map((url, idx) => (
                      <div key={idx} style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                        <img
                          src={normalizeProofUrl(url)}
                          alt={`Bukti ${idx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                          onClick={() => { setSelectedProof(url); setSelectedProofList(editPemasukan.buktiNotaUrls); }}
                          title="Klik untuk memperbesar"
                        />
                        <button
                          type="button"
                          onClick={() => setEditPemasukan({ ...editPemasukan, buktiNotaUrls: editPemasukan.buktiNotaUrls.filter((_, i) => i !== idx) })}
                          style={{ position: "absolute", top: 2, right: 2, background: "rgba(239,68,68,0.85)", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.7rem" }}
                          title="Hapus foto ini"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    id="uploadEditPemasukanNotaInput"
                    style={{ display: "none" }}
                    onChange={handleUploadEditPemasukanNota}
                    disabled={uploadingEditPemasukanNota}
                  />
                  <label
                    htmlFor="uploadEditPemasukanNotaInput"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1.5px dashed var(--border)",
                      background: "color-mix(in srgb, var(--cv-bone) 2%, transparent)",
                      color: "var(--fg-muted)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: uploadingEditPemasukanNota ? "not-allowed" : "pointer",
                    }}
                  >
                    <i className={`bx ${uploadingEditPemasukanNota ? "bx-loader-alt bx-spin" : "bx-camera"}`} style={{ fontSize: "1.3rem", color: "var(--cv-orange)" }} />
                    {uploadingEditPemasukanNota ? "Mengunggah..." : "+ Tambah / Ganti Foto Bukti"}
                  </label>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Catatan Tambahan (Opsional)</label>
                <textarea
                  className={styles.modalInput}
                  rows={2}
                  value={editPemasukan.catatan}
                  onChange={(e) => setEditPemasukan({ ...editPemasukan, catatan: e.target.value })}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.backBtn} onClick={() => setShowEditPemasukanModal(false)}>
                  Batal
                </button>
                <button type="submit" className={styles.btnCreate} style={{ background: "var(--cv-orange)", color: "var(--cv-on-orange)" }} disabled={submittingEditPemasukan || uploadingEditPemasukanNota}>
                  <i className={`bx ${submittingEditPemasukan ? "bx-loader-alt bx-spin" : "bx-save"}`} />
                  {submittingEditPemasukan ? "Memperbarui..." : "Perbarui Pemasukan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL CATAT PENGELUARAN KAS (DENGAN INPUT GAMBAR LANGSUNG) ── */}
      {showPengeluaranModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPengeluaranModal(false)}>
          <div className={styles.modalCard} style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className="bx bx-receipt" /> Catat Pengeluaran Kas Operasional
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowPengeluaranModal(false)}>
                <i className="bx bx-x" />
              </button>
            </div>

            <form onSubmit={handlePengeluaranSubmit} className={styles.modalForm}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Tanggal Pengeluaran</label>
                  <input
                    type="date"
                    className={styles.modalInput}
                    value={newPengeluaran.tanggal}
                    onChange={(e) => setNewPengeluaran({ ...newPengeluaran, tanggal: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Kategori</label>
                  <select
                    className={styles.modalSelect}
                    value={newPengeluaran.kategori}
                    onChange={(e) => setNewPengeluaran({ ...newPengeluaran, kategori: e.target.value })}
                  >
                    {(masterData.kategoriPengeluaran || [
                      "Operasional Fanbase", "Event / Project Show", "Konsumsi Tim", "Website & Server", "Produksi Merchandise", "Banner & Handbanner", "Dokumentasi & Media", "Lain-lain"
                    ]).map((kat: string) => (
                      <option key={kat} value={kat}>{kat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Keperluan / Deskripsi Singkat</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Contoh: Banner Erine 200 Show, Snack Gath, dll."
                  value={newPengeluaran.keperluan}
                  onChange={(e) => setNewPengeluaran({ ...newPengeluaran, keperluan: e.target.value })}
                  required
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Nominal Pengeluaran (Rp)</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Contoh: 150.000"
                  value={newPengeluaran.nominal}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setNewPengeluaran({
                      ...newPengeluaran,
                      nominal: digits ? Number(digits).toLocaleString("id-ID") : "",
                    });
                  }}
                  required
                />
              </div>

              {/* INPUT GAMBAR NOTA / KWITANSI (BISA UPLOAD LEBIH DARI 1 FOTO) */}
              <div className={styles.modalField}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className={styles.modalLabel} style={{ margin: 0 }}>
                    Bukti Foto Nota / Kwitansi (Bisa Banyak Foto)
                  </label>
                  {newPengeluaran.buktiNotaUrls && newPengeluaran.buktiNotaUrls.length > 0 && (
                    <span style={{ fontSize: "0.74rem", color: "#10b981", fontWeight: 700 }}>
                      <i className="bx bx-check-circle" /> {newPengeluaran.buktiNotaUrls.length} Foto Dipilih
                    </span>
                  )}
                </div>

                {/* List preview gambar yang sudah dipilih */}
                {newPengeluaran.buktiNotaUrls && newPengeluaran.buktiNotaUrls.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 8, marginBottom: 10, padding: 8, background: "color-mix(in srgb, var(--cv-ink) 50%, transparent)", borderRadius: 10, border: "1px solid var(--border)" }}>
                    {newPengeluaran.buktiNotaUrls.map((url, idx) => (
                      <div key={idx} style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                        <img
                          src={normalizeProofUrl(url)}
                          alt={`Nota ${idx + 1}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                          onClick={() => { setSelectedProof(url); setSelectedProofList(newPengeluaran.buktiNotaUrls); }}
                          title="Klik untuk memperbesar"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setNewPengeluaran({
                              ...newPengeluaran,
                              buktiNotaUrls: newPengeluaran.buktiNotaUrls.filter((_, i) => i !== idx),
                            });
                          }}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            background: "rgba(239, 68, 68, 0.85)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "50%",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            fontSize: "0.7rem",
                          }}
                          title="Hapus foto ini"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    id="uploadNotaInput"
                    style={{ display: "none" }}
                    onChange={handleUploadNota}
                    disabled={uploadingNota}
                  />
                  <label
                    htmlFor="uploadNotaInput"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1.5px dashed var(--border)",
                      background: "color-mix(in srgb, var(--cv-bone) 2%, transparent)",
                      color: "var(--fg-muted)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      cursor: uploadingNota ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    <i className={`bx ${uploadingNota ? "bx-loader-alt bx-spin" : "bx-camera"}`} style={{ fontSize: "1.3rem", color: "var(--gold)" }} />
                    {uploadingNota
                      ? "Mengunggah foto..."
                      : (newPengeluaran.buktiNotaUrls && newPengeluaran.buktiNotaUrls.length > 0)
                      ? "+ Tambah Foto Nota Lainnya"
                      : "Pilih File Foto / Kamera Nota (Bisa Lebih Dari 1)"}
                  </label>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Catatan Tambahan (Opsional)</label>
                <textarea
                  className={styles.modalInput}
                  rows={2}
                  value={newPengeluaran.catatan}
                  onChange={(e) => setNewPengeluaran({ ...newPengeluaran, catatan: e.target.value })}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.backBtn} onClick={() => setShowPengeluaranModal(false)}>
                  Batal
                </button>
                <button type="submit" className={styles.btnCreate} style={{ background: "var(--cv-orange)", color: "var(--cv-on-orange)" }} disabled={submittingPengeluaran || uploadingNota}>
                  <i className={`bx ${submittingPengeluaran ? "bx-loader-alt bx-spin" : "bx-save"}`} />
                  {submittingPengeluaran ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT PENGELUARAN & NOTA KAS (FITUR EDIT / CRUD NOTA) ── */}
      {showEditPengeluaranModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditPengeluaranModal(false)}>
          <div className={styles.modalCard} style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className="bx bx-edit-alt" style={{ color: "var(--cv-orange)" }} /> Edit Pengeluaran #{editPengeluaran.id}
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowEditPengeluaranModal(false)}>
                <i className="bx bx-x" />
              </button>
            </div>

            <form onSubmit={handleEditPengeluaranSubmit} className={styles.modalForm}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Tanggal Pengeluaran</label>
                  <input
                    type="date"
                    className={styles.modalInput}
                    value={editPengeluaran.tanggal}
                    onChange={(e) => setEditPengeluaran({ ...editPengeluaran, tanggal: e.target.value })}
                    required
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Kategori</label>
                  <select
                    className={styles.modalSelect}
                    value={editPengeluaran.kategori}
                    onChange={(e) => setEditPengeluaran({ ...editPengeluaran, kategori: e.target.value })}
                  >
                    {(masterData.kategoriPengeluaran || [
                      "Operasional Fanbase", "Event / Project Show", "Konsumsi Tim", "Website & Server", "Produksi Merchandise", "Banner & Handbanner", "Dokumentasi & Media", "Lain-lain"
                    ]).map((kat: string) => (
                      <option key={kat} value={kat}>{kat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Keperluan / Deskripsi Singkat</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Contoh: Banner Erine 200 Show, Snack Gath, dll."
                  value={editPengeluaran.keperluan}
                  onChange={(e) => setEditPengeluaran({ ...editPengeluaran, keperluan: e.target.value })}
                  required
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Nominal Pengeluaran (Rp)</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Contoh: 150.000"
                  value={editPengeluaran.nominal}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setEditPengeluaran({
                      ...editPengeluaran,
                      nominal: digits ? Number(digits).toLocaleString("id-ID") : "",
                    });
                  }}
                  required
                />
              </div>

              {/* INPUT GAMBAR NOTA / KWITANSI (BISA UPLOAD LEBIH DARI 1 FOTO) */}
              <div className={styles.modalField}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className={styles.modalLabel} style={{ margin: 0 }}>
                    Bukti Foto Nota / Kwitansi (Bisa Banyak Foto)
                  </label>
                  {editPengeluaran.buktiNotaUrls && editPengeluaran.buktiNotaUrls.length > 0 && (
                    <span style={{ fontSize: "0.74rem", color: "#10b981", fontWeight: 700 }}>
                      <i className="bx bx-check-circle" /> {editPengeluaran.buktiNotaUrls.length} Foto Terpasang
                    </span>
                  )}
                </div>

                {editPengeluaran.buktiNotaUrls && editPengeluaran.buktiNotaUrls.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "color-mix(in srgb, var(--cv-ink) 40%, transparent)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 8 }}>
                      {editPengeluaran.buktiNotaUrls.map((url, idx) => (
                        <div key={idx} style={{ position: "relative", width: "100%", aspectRatio: "1/1", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                          <img
                            src={normalizeProofUrl(url)}
                            alt={`Nota ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                            onClick={() => { setSelectedProof(url); setSelectedProofList(editPengeluaran.buktiNotaUrls); }}
                            title="Klik untuk memperbesar"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setEditPengeluaran({
                                ...editPengeluaran,
                                buktiNotaUrls: editPengeluaran.buktiNotaUrls.filter((_, i) => i !== idx),
                              });
                            }}
                            style={{
                              position: "absolute",
                              top: 2,
                              right: 2,
                              background: "rgba(239, 68, 68, 0.85)",
                              color: "#fff",
                              border: "none",
                              borderRadius: "50%",
                              width: 20,
                              height: 20,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              fontSize: "0.7rem",
                            }}
                            title="Hapus foto ini"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setEditPengeluaran({ ...editPengeluaran, buktiNotaUrls: [] })}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        <i className="bx bx-trash" /> Hapus Semua Foto
                      </button>

                      <div>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          id="uploadEditNotaInputAdd"
                          style={{ display: "none" }}
                          onChange={handleUploadEditNota}
                          disabled={uploadingEditNota}
                        />
                        <label
                          htmlFor="uploadEditNotaInputAdd"
                          style={{
                            fontSize: "0.78rem",
                            color: "var(--gold)",
                            cursor: uploadingEditNota ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontWeight: 700,
                          }}
                        >
                          <i className={`bx ${uploadingEditNota ? "bx-loader-alt bx-spin" : "bx-plus-circle"}`} />
                          {uploadingEditNota ? "Mengunggah..." : "+ Tambah Foto Nota Lain"}
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      id="uploadEditNotaInput"
                      style={{ display: "none" }}
                      onChange={handleUploadEditNota}
                      disabled={uploadingEditNota}
                    />
                    <label
                      htmlFor="uploadEditNotaInput"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "14px 16px",
                        borderRadius: 10,
                        border: "1.5px dashed color-mix(in srgb, var(--cv-orange) 40%, transparent)",
                        background: "color-mix(in srgb, var(--cv-orange) 5%, transparent)",
                        color: "var(--cv-orange)",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        cursor: uploadingEditNota ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <i className={`bx ${uploadingEditNota ? "bx-loader-alt bx-spin" : "bx-upload"}`} style={{ fontSize: "1.3rem" }} />
                      {uploadingEditNota ? "Mengunggah foto..." : "Pilih File Foto Nota (Bisa Lebih Dari 1)"}
                    </label>
                  </div>
                )}
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Catatan Tambahan (Opsional)</label>
                <textarea
                  className={styles.modalInput}
                  rows={2}
                  value={editPengeluaran.catatan}
                  onChange={(e) => setEditPengeluaran({ ...editPengeluaran, catatan: e.target.value })}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.backBtn} onClick={() => setShowEditPengeluaranModal(false)}>
                  Batal
                </button>
                <button
                  type="submit"
                  className={styles.btnCreate}
                  style={{ background: "var(--cv-orange-deep)", color: "var(--cv-on-orange)" }}
                  disabled={submittingEditPengeluaran || uploadingEditNota}
                >
                  <i className={`bx ${submittingEditPengeluaran ? "bx-loader-alt bx-spin" : "bx-save"}`} />
                  {submittingEditPengeluaran ? "Memperbarui..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL BUAT KUPON REWARD KAS BARU ── */}
      {showKuponModal && (
        <div className={styles.modalOverlay} onClick={() => { setShowKuponModal(false); setGeneratedKodeUnik(""); }}>
          <div className={styles.modalCard} style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className="bx bx-gift" style={{ color: "var(--cv-orange-hi)" }} /> Buat &amp; Bagikan Kupon Reward Kas
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => { setShowKuponModal(false); setGeneratedKodeUnik(""); }}>
                <i className="bx bx-x" />
              </button>
            </div>

            {/* ── TOGGLE MODE: Semua Anggota vs Privat (1 Orang) ── */}
            <div style={{ display: "flex", gap: 8, padding: "12px 0 4px", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => { setKuponMode("semua"); setTargetAnggotaId(""); setGeneratedKodeUnik(""); }}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 10, border: "1.5px solid",
                  borderColor: kuponMode === "semua" ? "var(--cv-orange)" : "var(--border)",
                  background: kuponMode === "semua" ? "color-mix(in srgb, var(--cv-orange) 12%, transparent)" : "transparent",
                  color: kuponMode === "semua" ? "var(--cv-orange-hi)" : "var(--fg-muted)",
                  fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
                }}
              >
                <i className="bx bx-group" /> Semua Anggota
              </button>
              <button
                type="button"
                onClick={() => { setKuponMode("privat"); setGeneratedKodeUnik(""); }}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 10, border: "1.5px solid",
                  borderColor: kuponMode === "privat" ? "var(--cv-orange)" : "var(--border)",
                  background: kuponMode === "privat" ? "color-mix(in srgb, var(--cv-orange) 12%, transparent)" : "transparent",
                  color: kuponMode === "privat" ? "var(--cv-orange)" : "var(--fg-muted)",
                  fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
                }}
              >
                <i className="bx bx-user-check" /> 1 Anggota Tertentu (Privat)
              </button>
            </div>

            <form onSubmit={handleKuponSubmit} className={styles.modalForm}>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Kode Kupon (KAPITAL)</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="Contoh: ERINE200SHOW"
                    value={newKupon.kodeKupon}
                    onChange={(e) => setNewKupon({ ...newKupon, kodeKupon: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Tahun Kas yang Dinilai</label>
                  <select
                    className={styles.modalSelect}
                    value={newKupon.tahunKas}
                    onChange={(e) => setNewKupon({ ...newKupon, tahunKas: Number(e.target.value) })}
                  >
                    {(masterData.tahunKasAktif || SUPPORTED_YEARS).map((y: number) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Judul Hadiah / Reward</label>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="Contoh: Voucher Diskon Merchandise Fanbase"
                  value={newKupon.judul}
                  onChange={(e) => setNewKupon({ ...newKupon, judul: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Tipe Reward</label>
                  <select
                    className={styles.modalSelect}
                    value={newKupon.tipeReward}
                    onChange={(e) => setNewKupon({ ...newKupon, tipeReward: e.target.value })}
                  >
                    {(masterData.tipeRewardKupon || [
                      "Diskon Merchandise", "Potongan Iuran Kas", "Photocard / Goodies", "Undian Tiket Show", "Akses Event Eksklusif", "Lainnya"
                    ]).map((tr: string) => (
                      <option key={tr} value={tr}>{tr}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Nilai Reward (Bulan Kas Gratis)</label>
                  <select
                    className={styles.modalSelect}
                    value={newKupon.nilaiReward}
                    onChange={(e) => setNewKupon({ ...newKupon, nilaiReward: e.target.value })}
                    required
                  >
                    <option value="1 Bulan">1 Bulan Kas Gratis (Rp 15.000)</option>
                    <option value="2 Bulan">2 Bulan Kas Gratis (Rp 30.000)</option>
                    <option value="3 Bulan">3 Bulan Kas Gratis (Rp 45.000)</option>
                    <option value="4 Bulan">4 Bulan Kas Gratis (Rp 60.000)</option>
                    <option value="5 Bulan">5 Bulan Kas Gratis (Rp 75.000)</option>
                    <option value="6 Bulan">6 Bulan Kas Gratis (Rp 90.000)</option>
                    <option value="7 Bulan">7 Bulan Kas Gratis (Rp 105.000)</option>
                    <option value="8 Bulan">8 Bulan Kas Gratis (Rp 120.000)</option>
                    <option value="9 Bulan">9 Bulan Kas Gratis (Rp 135.000)</option>
                    <option value="10 Bulan">10 Bulan Kas Gratis (Rp 150.000)</option>
                    <option value="11 Bulan">11 Bulan Kas Gratis (Rp 165.000)</option>
                    <option value="12 Bulan">12 Bulan Kas Gratis (Rp 180.000) — SETAHUN PENUH!</option>
                  </select>
                  <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)", marginTop: 2 }}>
                    Nilai potongan dihitung otomatis: 1 bulan = Rp 15.000
                  </div>
                </div>
              </div>

              {/* ── MODE SEMUA: Syarat Bulan Kas ── */}
              {kuponMode === "semua" && (
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>
                    <i className="bx bx-filter-alt" style={{ color: "var(--gold)" }} /> Syarat Pembayaran Kas (Kelayakan Anggota)
                  </label>
                  <select
                    className={styles.modalSelect}
                    value={newKupon.minBulanKas}
                    onChange={(e) => setNewKupon({ ...newKupon, minBulanKas: Number(e.target.value) })}
                  >
                    <option value={1}>Minimal 1 Bulan Lunas Kas di Tahun {newKupon.tahunKas}</option>
                    <option value={3}>Minimal 3 Bulan Lunas Kas (Rajin Bayar)</option>
                    <option value={6}>Minimal 6 Bulan Lunas Kas (Setengah Tahun)</option>
                    <option value={9}>Minimal 9 Bulan Lunas Kas</option>
                    <option value={12}>Lunas Penuh 12 Bulan (Super Rajin)</option>
                  </select>
                  <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)", marginTop: 2 }}>
                    * Khusus Anggota biasa yang membayar kas. Pengurus/Admin tidak diikutsertakan. Anggota yang belum memenuhi syarat <strong>tidak akan mendapatkan kupon</strong>.
                  </div>
                </div>
              )}

              {/* ── MODE PRIVAT: Pilih Anggota Tujuan ── */}
              {kuponMode === "privat" && (
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>
                    <i className="bx bx-user-pin" style={{ color: "var(--cv-orange)" }} /> Anggota Tujuan (Hanya 1 Orang)
                  </label>
                  <select
                    className={styles.modalSelect}
                    value={targetAnggotaId}
                    onChange={(e) => { setTargetAnggotaId(e.target.value); setGeneratedKodeUnik(""); }}
                    required={kuponMode === "privat"}
                    style={{ borderColor: targetAnggotaId ? "var(--cv-orange)" : undefined }}
                  >
                    <option value="">-- Pilih Anggota --</option>
                    {anggotaList
                      .filter((a: any) => a.status === "aktif" && (!a.jabatan || a.jabatan === "Anggota"))
                      .sort((a: any, b: any) => (a.nama_lengkap || "").localeCompare(b.nama_lengkap || ""))
                      .map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.nama_lengkap} ({a.no_anggota})
                        </option>
                      ))
                    }
                  </select>
                  <div style={{ fontSize: "0.72rem", color: "var(--cv-orange)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <i className="bx bx-lock-alt" />
                    Kupon ini <strong>hanya terlihat oleh anggota yang dipilih</strong>. Tidak akan muncul ke anggota lain.
                  </div>
                </div>
              )}

              {/* ── TAMPILKAN KODE UNIK SETELAH SUKSES MODE PRIVAT ── */}
              {generatedKodeUnik && kuponMode === "privat" && (
                <div style={{
                  background: "rgba(16,185,129,0.1)", border: "1.5px solid rgba(16,185,129,0.4)",
                  borderRadius: 12, padding: "14px 16px", marginBottom: 8,
                  display: "flex", flexDirection: "column", gap: 8
                }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#10b981", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="bx bx-check-circle" /> Kupon berhasil dibagikan!
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--fg-muted)" }}>
                    Kode unik yang diterima anggota:
                  </div>
                  <div style={{
                    fontFamily: "monospace", fontSize: "1.15rem", fontWeight: 900, color: "var(--cv-orange)",
                    letterSpacing: "0.1em", background: "color-mix(in srgb, var(--cv-ink) 50%, transparent)", padding: "8px 14px",
                    borderRadius: 8, border: "1px dashed var(--cv-orange)", cursor: "pointer",
                    userSelect: "all"
                  }}
                    onClick={() => { navigator.clipboard?.writeText(generatedKodeUnik); alert("Kode disalin!"); }}
                    title="Klik untuk menyalin kode"
                  >
                    {generatedKodeUnik}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)" }}>
                    Klik kode di atas untuk menyalin. Bagikan secara privat ke anggota yang bersangkutan.
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Tanggal Kadaluarsa (Opsional)</label>
                  <input
                    type="date"
                    className={styles.modalInput}
                    value={newKupon.kadaluarsaPada}
                    onChange={(e) => setNewKupon({ ...newKupon, kadaluarsaPada: e.target.value })}
                  />
                </div>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Deskripsi / Catatan Singkat</label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    placeholder="Contoh: Berlaku saat gath fanbase"
                    value={newKupon.deskripsi}
                    onChange={(e) => setNewKupon({ ...newKupon, deskripsi: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.backBtn} onClick={() => { setShowKuponModal(false); setGeneratedKodeUnik(""); }}>
                  Batal
                </button>
                <button type="submit" className={styles.btnCreate} style={{ background: "var(--cv-orange)", color: "var(--cv-on-orange)" }} disabled={submittingKupon}>
                  <i className={`bx ${submittingKupon ? "bx-loader-alt bx-spin" : kuponMode === "privat" ? "bx-user-check" : "bx-send"}`} />
                  {submittingKupon
                    ? (kuponMode === "privat" ? "Mengirim..." : "Mendistribusikan...")
                    : (kuponMode === "privat" ? "Kirim ke Anggota Ini" : "Simpan & Kirim ke Semua")
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ── MODAL PROOF IMAGE VIEWER (MENDUKUNG MULTI-FOTO NOTA) ── */}
      {selectedProof && (
        <div className={styles.modalOverlay} onClick={() => { setSelectedProof(null); setSelectedProofList([]); }}>
          <div className={styles.modalCard} style={{ maxWidth: 580, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <i className="bx bx-receipt" /> Bukti Pembayaran / Nota
                {selectedProofList.length > 1 && (
                  <span style={{ fontSize: "0.8rem", color: "var(--gold)", marginLeft: 8, fontWeight: 700 }}>
                    ({(selectedProofList.indexOf(selectedProof) !== -1 ? selectedProofList.indexOf(selectedProof) + 1 : 1)} dari {selectedProofList.length} Foto)
                  </span>
                )}
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => { setSelectedProof(null); setSelectedProofList([]); }}><i className="bx bx-x" /></button>
            </div>

            <div style={{ position: "relative", marginTop: 16, background: "color-mix(in srgb, var(--cv-ink) 80%, transparent)", borderRadius: 12, padding: 8, minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src={normalizeProofUrl(selectedProof)}
                alt="Bukti Pembayaran / Nota"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes("bukti-1788285192192-ypyr5p.jpg")) {
                    target.src = "/uploads/bukti/bukti-1788285192192-ypyr5p.jpg";
                  }
                }}
                style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: 10 }}
              />

              {/* Tombol Panah Prev / Next jika multi-foto */}
              {selectedProofList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const curIdx = selectedProofList.indexOf(selectedProof);
                      const prevIdx = curIdx > 0 ? curIdx - 1 : selectedProofList.length - 1;
                      setSelectedProof(selectedProofList[prevIdx]);
                    }}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(0,0,0,0.7)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.25)",
                      borderRadius: "50%",
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                    }}
                    title="Foto Sebelumnya"
                  >
                    <i className="bx bx-chevron-left" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const curIdx = selectedProofList.indexOf(selectedProof);
                      const nextIdx = curIdx < selectedProofList.length - 1 ? curIdx + 1 : 0;
                      setSelectedProof(selectedProofList[nextIdx]);
                    }}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "rgba(0,0,0,0.7)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.25)",
                      borderRadius: "50%",
                      width: 36,
                      height: 36,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                    }}
                    title="Foto Selanjutnya"
                  >
                    <i className="bx bx-chevron-right" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip jika lebih dari 1 foto */}
            {selectedProofList.length > 1 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
                {selectedProofList.map((url, idx) => {
                  const isActive = url === selectedProof;
                  return (
                    <img
                      key={idx}
                      src={normalizeProofUrl(url)}
                      alt={`Thumb ${idx + 1}`}
                      onClick={() => setSelectedProof(url)}
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: "cover",
                        borderRadius: 8,
                        cursor: "pointer",
                        border: isActive ? "2px solid var(--gold)" : "1px solid var(--cv-line-strong)",
                        opacity: isActive ? 1 : 0.6,
                        transform: isActive ? "scale(1.05)" : "scale(1)",
                        transition: "all 0.15s ease",
                      }}
                    />
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 10, fontSize: "0.75rem", opacity: 0.6, wordBreak: "break-all" }}>
              Tautan: {selectedProof}
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center" }}>
              <a href={normalizeProofUrl(selectedProof)} target="_blank" rel="noopener noreferrer" className={styles.backBtn}>
                <i className="bx bx-link-external" /> Buka Ukuran Penuh
              </a>
              <button type="button" className={styles.btnGhost} onClick={() => { setSelectedProof(null); setSelectedProofList([]); }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT KAS ── */}
      {editKas && (
        <div className={styles.modalOverlay} onClick={() => setEditKas(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}><i className="bx bx-edit" /> Edit Data Pembayaran Kas #{editKas.id}</h3>
              <button type="button" className={styles.modalClose} onClick={() => setEditKas(null)}><i className="bx bx-x" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Periode Kas</label>
                <input type="text" className={styles.modalInput} value={editKas.periode || ""} onChange={(e) => setEditKas({ ...editKas, periode: e.target.value })} required />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Nominal (Rp)</label>
                <input type="number" className={styles.modalInput} value={editKas.nominal || ""} onChange={(e) => setEditKas({ ...editKas, nominal: e.target.value })} required />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Status Verifikasi</label>
                <select className={styles.modalSelect} value={editKas.status || "diverifikasi"} onChange={(e) => setEditKas({ ...editKas, status: e.target.value })}>
                  <option value="diverifikasi">Diverifikasi (Valid)</option>
                  <option value="pending">Pending (Menunggu)</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.backBtn} onClick={() => setEditKas(null)}>Batal</button>
                <button type="submit" className={styles.btnCreate}><i className="bx bx-check" /> Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL SETTING EVENT WAR TIKET STS ERINE ── */}
      {showWarModal && (
        <div className={styles.modalOverlay} onClick={() => setShowWarModal(false)}>
          <div className={styles.modalCard} style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} style={{ color: "#ef4444" }}>
                <i className="bx bx-flame" /> Atur Event &amp; Kuota War Tiket
              </h3>
              <button type="button" className={styles.modalClose} onClick={() => setShowWarModal(false)}>
                <i className="bx bx-x" />
              </button>
            </div>

            <form onSubmit={handleSaveWarEvent} className={styles.modalForm}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Nama Event War Tiket</label>
                <input
                  type="text"
                  required
                  className={styles.modalInput}
                  value={warForm.judul}
                  onChange={(e) => setWarForm({ ...warForm, judul: e.target.value })}
                  placeholder="Contoh: War Tiket Project STS Erine 20th"
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Deskripsi Singkat</label>
                <textarea
                  className={styles.modalTextarea}
                  rows={2}
                  value={warForm.deskripsi}
                  onChange={(e) => setWarForm({ ...warForm, deskripsi: e.target.value })}
                  placeholder="Penjelasan singkat event war tiket..."
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Total Kuota Tiket</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    required
                    className={styles.modalInput}
                    value={warForm.kuotaTotal}
                    onChange={(e) => setWarForm({ ...warForm, kuotaTotal: Number(e.target.value) })}
                  />
                </div>

                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Status Sistem</label>
                  <select
                    className={styles.modalSelect}
                    value={warForm.status}
                    onChange={(e) => setWarForm({ ...warForm, status: e.target.value as any })}
                  >
                    <option value="buka">Buka (Aktif Sesuai Jadwal)</option>
                    <option value="tutup">Tutup (Nonaktifkan War)</option>
                    <option value="draft">Draft (Disembunyikan)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Jadwal Buka War (Server)</label>
                  <input
                    type="datetime-local"
                    required
                    className={styles.modalInput}
                    value={warForm.waktuBuka}
                    onChange={(e) => setWarForm({ ...warForm, waktuBuka: e.target.value })}
                  />
                </div>

                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Jadwal Tutup War (Server)</label>
                  <input
                    type="datetime-local"
                    required
                    className={styles.modalInput}
                    value={warForm.waktuTutup}
                    onChange={(e) => setWarForm({ ...warForm, waktuTutup: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Syarat &amp; Ketentuan</label>
                <textarea
                  className={styles.modalTextarea}
                  rows={3}
                  value={warForm.syaratKetentuan}
                  onChange={(e) => setWarForm({ ...warForm, syaratKetentuan: e.target.value })}
                  placeholder="Aturan untuk anggota yang ikut war tiket..."
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowWarModal(false)}>
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingWarEvent}
                  className={styles.btnCreate}
                  style={{ background: "#ef4444", color: "#fff" }}
                >
                  {savingWarEvent ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
