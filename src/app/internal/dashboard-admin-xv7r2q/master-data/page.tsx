"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";
import ThemeToggle from "@/components/ThemeToggle";
import type { HomeBannerItem, HomeBannerSessionItem } from "@/lib/settings";
import AdminSubNav from "@/components/admin/AdminSubNav";

interface MasterDataState {
  divisi: string[];
  tipeDonasi: string[];
  nominalKas: number[];
  nominalDonasi: number[];
  platforms: string[];
  defaultNominalKas: number;
  kategoriPengeluaran: string[];
  tahunKasAktif: number[];
  jabatanBebasKas: string[];
  tipeRewardKupon: string[];
  homeBanners?: HomeBannerItem[];
}

export default function AdminMasterDataPage() {
  const [data, setData] = useState<MasterDataState>({
    divisi: [],
    tipeDonasi: [],
    nominalKas: [],
    nominalDonasi: [],
    platforms: [],
    defaultNominalKas: 15000,
    kategoriPengeluaran: [],
    tahunKasAktif: [2024, 2025, 2026, 2027, 2028, 2029],
    jabatanBebasKas: ["Admin Fanbase", "Pengurus Fanbase"],
    tipeRewardKupon: [],
    homeBanners: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Input states for new items
  const [newDivisi, setNewDivisi] = useState("");
  const [newTipeDonasi, setNewTipeDonasi] = useState("");
  const [newNominalKas, setNewNominalKas] = useState("");
  const [newNominalDonasi, setNewNominalDonasi] = useState("");
  const [newPlatform, setNewPlatform] = useState("");
  const [newKategoriPengeluaran, setNewKategoriPengeluaran] = useState("");
  const [newTahunKas, setNewTahunKas] = useState("");
  const [newJabatanBebas, setNewJabatanBebas] = useState("");
  const [newTipeReward, setNewTipeReward] = useState("");
  const [editDefaultNominal, setEditDefaultNominal] = useState("");

  // State untuk Kelola Banner & Informasi Pengumuman Home
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState<HomeBannerItem>({
    id: "",
    badge: "OPEN MEMBER",
    badgeColor: "gold",
    title: "",
    description: "",
    dateInfo: "",
    locationInfo: "",
    actionText: "Daftar Sekarang",
    actionUrl: "/join",
    imageUrl: "",
    sessions: [],
    isActive: true,
    priority: 1,
  });
  const [uploadingBannerImg, setUploadingBannerImg] = useState(false);
  const [importingVc, setImportingVc] = useState(false);

  // State Pengaturan Master War Tiket & Template E-Ticket
  const [warEvent, setWarEvent] = useState<{
    id?: number;
    judul: string;
    kodeTiket: string;
    subjudul: string;
    lokasiEvent: string;
    tanggalEvent: string;
    kategoriTiket: string;
    deskripsi: string;
    kuotaTotal: number;
    waktuBuka: string;
    waktuTutup: string;
    status: string;
    syaratKetentuan: string;
  }>({
    judul: "War Tiket Project STS Erine 20th",
    kodeTiket: "STS20",
    subjudul: "Cavallery • Official Fanbase Erine JKT48",
    lokasiEvent: "Theater JKT48, fX Sudirman Lt. 4",
    tanggalEvent: "Sabtu, 26 September 2026 • 19.00 WIB",
    kategoriTiket: "OFFICIAL VIP PASS • TEAM PASSION",
    deskripsi: "Akses khusus project perayaan Seitansai Catherina Vallencia (Erine) ke-20 bersama Cavallery Team Passion.",
    kuotaTotal: 50,
    waktuBuka: "",
    waktuTutup: "",
    status: "buka",
    syaratKetentuan: "1. Wajib memiliki akun anggota Cavallery aktif.\n2. 1 Akun anggota hanya dapat mengklaim maksimal 1 tiket.\n3. Tiket tidak dapat dipindahtangankan tanpa konfirmasi admin.",
  });
  const [savingWarEvent, setSavingWarEvent] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/master-data");
      if (res.status === 401) {
        window.location.replace("/internal/dashboard-admin-xv7r2q");
        return;
      }
      const json = await res.json();
      if (json.status && json.data) {
        setData({
          divisi: json.data.divisi || [],
          tipeDonasi: json.data.tipeDonasi || [],
          nominalKas: json.data.nominalKas || [],
          nominalDonasi: json.data.nominalDonasi || [],
          platforms: json.data.platforms || [],
          defaultNominalKas: json.data.defaultNominalKas || 15000,
          kategoriPengeluaran: json.data.kategoriPengeluaran || [
            "Operasional Fanbase",
            "Event / Project Show",
            "Konsumsi Tim",
            "Website & Server",
            "Produksi Merchandise",
            "Banner & Handbanner",
            "Dokumentasi & Media",
            "Lain-lain",
          ],
          tahunKasAktif: json.data.tahunKasAktif || [
            2024, 2025, 2026, 2027, 2028, 2029,
          ],
          jabatanBebasKas: json.data.jabatanBebasKas || [
            "Admin Fanbase",
            "Pengurus Fanbase",
          ],
          tipeRewardKupon: json.data.tipeRewardKupon || [
            "Diskon Merchandise",
            "Potongan Iuran Kas",
            "Photocard / Goodies",
            "Undian Tiket Show",
            "Akses Event Eksklusif",
            "Lainnya",
          ],
          homeBanners: Array.isArray(json.data.homeBanners) ? json.data.homeBanners : [],
        });
        setEditDefaultNominal(
          Number(json.data.defaultNominalKas || 15000).toLocaleString("id-ID"),
        );
      }

      // Fetch War Tiket Event Data
      try {
        const warRes = await fetch("/api/admin/war-tiket");
        if (warRes.ok) {
          const warJson = await warRes.json();
          if (warJson.status && warJson.data?.event) {
            const ev = warJson.data.event;
            const formatForInput = (dtStr: string) => {
              if (!dtStr) return "";
              const isoStr = dtStr.includes(" ") ? dtStr.replace(" ", "T") : dtStr;
              const d = new Date(isoStr);
              if (isNaN(d.getTime())) return "";
              const pad = (n: number) => String(n).padStart(2, "0");
              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            setWarEvent({
              id: ev.id,
              judul: ev.judul || "",
              kodeTiket: ev.kode_tiket || "STS20",
              subjudul: ev.subjudul || "Cavallery • Official Fanbase Erine JKT48",
              lokasiEvent: ev.lokasi_event || "Theater JKT48, fX Sudirman Lt. 4",
              tanggalEvent: ev.tanggal_event || "Sabtu, 26 September 2026 • 19.00 WIB",
              kategoriTiket: ev.kategori_tiket || "OFFICIAL VIP PASS • TEAM PASSION",
              deskripsi: ev.deskripsi || "",
              kuotaTotal: Number(ev.kuota_total) || 50,
              waktuBuka: formatForInput(ev.waktu_buka),
              waktuTutup: formatForInput(ev.waktu_tutup),
              status: ev.status || "buka",
              syaratKetentuan: ev.syarat_ketentuan || "",
            });
          }
        }
      } catch (err) {
        console.error("Fetch war event error in master data:", err);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWarEvent(true);
    setMsg("");
    try {
      const payload = { ...warEvent };
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
        setMsg("✓ Pengaturan Event & Template Kode Tiket War berhasil disimpan!");
        setTimeout(() => setMsg(""), 5000);
      } else {
        alert(json.message || "Gagal menyimpan pengaturan tiket");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSavingWarEvent(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (updatedData: MasterDataState) => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/master-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const json = await res.json();
      if (json.status && json.data) {
        setData({
          divisi: json.data.divisi || [],
          tipeDonasi: json.data.tipeDonasi || [],
          nominalKas: json.data.nominalKas || [],
          nominalDonasi: json.data.nominalDonasi || [],
          platforms: json.data.platforms || [],
          defaultNominalKas: json.data.defaultNominalKas || 15000,
          kategoriPengeluaran: json.data.kategoriPengeluaran || [],
          tahunKasAktif: json.data.tahunKasAktif || [],
          jabatanBebasKas: json.data.jabatanBebasKas || [],
          tipeRewardKupon: json.data.tipeRewardKupon || [],
          homeBanners: Array.isArray(json.data.homeBanners) ? json.data.homeBanners : [],
        });
        setMsg(json.message || "Master data berhasil disimpan!");
      } else {
        alert(json.message || "Gagal menyimpan data");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  // ── HANDLERS: Banner & Informasi Pengumuman Home ──────────
  const openNewBannerModal = () => {
    setEditingBannerId(null);
    setBannerForm({
      id: `banner-${Date.now()}`,
      badge: "MEET & GREET",
      badgeColor: "blue",
      title: "",
      description: "",
      dateInfo: "",
      locationInfo: "",
      actionText: "Lihat Jadwal",
      actionUrl: "/schedule",
      imageUrl: "",
      videoUrl: "",
      videoOrientation: "portrait",
      sessions: [
        { sessionName: "Sesi 1", time: "11.00 – 12.00 WIB", info: "Jalur 3 (Meet & Greet)" },
        { sessionName: "Sesi 2", time: "13.30 – 14.30 WIB", info: "Jalur 3 (Meet & Greet)" },
      ],
      isActive: true,
      priority: (data.homeBanners?.length || 0) + 1,
    });
    setShowBannerModal(true);
  };

  const openEditBannerModal = (banner: HomeBannerItem) => {
    setEditingBannerId(banner.id);
    setBannerForm({
      ...banner,
      videoOrientation: banner.videoOrientation || (banner.videoUrl?.includes("/shorts/") ? "portrait" : "landscape"),
      sessions: Array.isArray(banner.sessions) ? [...banner.sessions] : [],
    });
    setShowBannerModal(true);
  };

  const addSessionRow = () => {
    const cur = bannerForm.sessions || [];
    setBannerForm({
      ...bannerForm,
      sessions: [
        ...cur,
        {
          sessionName: `Sesi ${cur.length + 1}`,
          time: "11.00 – 12.00 WIB",
          info: "Jalur 3 • Meet & Greet",
        },
      ],
    });
  };

  const updateSessionRow = (idx: number, field: keyof HomeBannerSessionItem, val: string) => {
    const cur = [...(bannerForm.sessions || [])];
    if (cur[idx]) {
      cur[idx] = { ...cur[idx], [field]: val };
      setBannerForm({ ...bannerForm, sessions: cur });
    }
  };

  const removeSessionRow = (idx: number) => {
    const cur = (bannerForm.sessions || []).filter((_, i) => i !== idx);
    setBannerForm({ ...bannerForm, sessions: cur });
  };

  const handleUploadBannerImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBannerImg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipe", "banner");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.status && json.url) {
        setBannerForm((prev) => ({ ...prev, imageUrl: json.url }));
        setMsg("✓ Foto poster berhasil diunggah!");
        setTimeout(() => setMsg(""), 4000);
      } else {
        alert(json.message || "Gagal mengunggah foto");
      }
    } catch (err: any) {
      alert("Error upload: " + err.message);
    } finally {
      setUploadingBannerImg(false);
    }
  };

  const handleImportVcSchedule = async () => {
    setImportingVc(true);
    try {
      const res = await fetch("/api/vcschedule");
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        if (d) {
          const newSessions: HomeBannerSessionItem[] = [];
          for (let i = 1; i <= 6; i++) {
            const raw = d[`session${i}`];
            if (raw && typeof raw === "string" && raw.trim()) {
              const parts = raw.split(":");
              const sName = parts[0]?.trim() || `Sesi ${i}`;
              const sTime = parts.slice(1).join(":").trim() || raw;
              newSessions.push({
                sessionName: sName,
                time: sTime,
                info: "Jadwal Resmi Erine",
              });
            }
          }
          setBannerForm((prev) => ({
            ...prev,
            badge: "MEET & GREET",
            badgeColor: "blue",
            title: `Jadwal Meet & Greet / Video Call Erine (${d.date || "Terbaru"})`,
            description: `Jadwal sesi temu dan video call bersama Catherina Vallencia (Erine) JKT48 pada ${d.date || "waktu yang ditentukan"}. Siapkan tiketmu dan hadir tepat waktu!`,
            dateInfo: d.date || prev.dateInfo,
            imageUrl: d.imageUrl || prev.imageUrl,
            actionText: "Lihat Jadwal Lengkap",
            actionUrl: "/schedule",
            sessions: newSessions.length > 0 ? newSessions : prev.sessions,
          }));
          alert("✓ Berhasil mengimpor jadwal resmi VC/M&G Erine ke dalam form pengumuman!");
        }
      }
    } catch (err: any) {
      alert("Gagal impor jadwal: " + err.message);
    } finally {
      setImportingVc(false);
    }
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title.trim()) {
      alert("Judul banner / pengumuman wajib diisi!");
      return;
    }

    const currentBanners = data.homeBanners || [];
    let updatedBanners: HomeBannerItem[];

    if (editingBannerId) {
      updatedBanners = currentBanners.map((b) =>
        b.id === editingBannerId ? { ...bannerForm } : b
      );
    } else {
      const newBanner: HomeBannerItem = {
        ...bannerForm,
        id: bannerForm.id || `banner-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      updatedBanners = [...currentBanners, newBanner];
    }

    const updatedData = { ...data, homeBanners: updatedBanners };
    setData(updatedData);
    handleSave(updatedData);
    setShowBannerModal(false);
  };

  const toggleBannerStatus = (id: string, currentActive: boolean) => {
    const currentBanners = data.homeBanners || [];
    const updatedBanners = currentBanners.map((b) =>
      b.id === id ? { ...b, isActive: !currentActive } : b
    );
    const updatedData = { ...data, homeBanners: updatedBanners };
    setData(updatedData);
    handleSave(updatedData);
  };

  const deleteBanner = (id: string, title: string) => {
    if (!confirm(`Hapus pengumuman "${title}" dari banner Home?`)) return;
    const currentBanners = data.homeBanners || [];
    const updatedBanners = currentBanners.filter((b) => b.id !== id);
    const updatedData = { ...data, homeBanners: updatedBanners };
    setData(updatedData);
    handleSave(updatedData);
  };

  // Helper Divisi
  const addDivisi = () => {
    if (!newDivisi.trim()) return;
    if (data.divisi.includes(newDivisi.trim())) {
      alert("Divisi sudah ada!");
      return;
    }
    const updated = { ...data, divisi: [...data.divisi, newDivisi.trim()] };
    setData(updated);
    setNewDivisi("");
    handleSave(updated);
  };
  const removeDivisi = (item: string) => {
    if (!confirm(`Hapus divisi "${item}"?`)) return;
    const updated = { ...data, divisi: data.divisi.filter((d) => d !== item) };
    setData(updated);
    handleSave(updated);
  };

  // Helper Tipe Donasi
  const addTipeDonasi = () => {
    if (!newTipeDonasi.trim()) return;
    if (data.tipeDonasi.includes(newTipeDonasi.trim())) {
      alert("Tipe donasi sudah ada!");
      return;
    }
    const updated = {
      ...data,
      tipeDonasi: [...data.tipeDonasi, newTipeDonasi.trim()],
    };
    setData(updated);
    setNewTipeDonasi("");
    handleSave(updated);
  };
  const removeTipeDonasi = (item: string) => {
    if (!confirm(`Hapus tipe donasi "${item}"?`)) return;
    const updated = {
      ...data,
      tipeDonasi: data.tipeDonasi.filter((t) => t !== item),
    };
    setData(updated);
    handleSave(updated);
  };

  // Helper Nominal Kas
  const addNominalKas = () => {
    const val = parseInt(newNominalKas.replace(/\D/g, ""), 10);
    if (!val || isNaN(val)) return;
    if (data.nominalKas.includes(val)) {
      alert("Nominal kas sudah ada!");
      return;
    }
    const updated = {
      ...data,
      nominalKas: [...data.nominalKas, val].sort((a, b) => a - b),
    };
    setData(updated);
    setNewNominalKas("");
    handleSave(updated);
  };
  const removeNominalKas = (val: number) => {
    if (!confirm(`Hapus pilihan nominal Rp ${val.toLocaleString("id-ID")}?`))
      return;
    const updated = {
      ...data,
      nominalKas: data.nominalKas.filter((n) => n !== val),
    };
    setData(updated);
    handleSave(updated);
  };

  // Helper Nominal Donasi
  const addNominalDonasi = () => {
    const val = parseInt(newNominalDonasi.replace(/\D/g, ""), 10);
    if (!val || isNaN(val)) return;
    if (data.nominalDonasi.includes(val)) {
      alert("Nominal donasi sudah ada!");
      return;
    }
    const updated = {
      ...data,
      nominalDonasi: [...data.nominalDonasi, val].sort((a, b) => a - b),
    };
    setData(updated);
    setNewNominalDonasi("");
    handleSave(updated);
  };
  const removeNominalDonasi = (val: number) => {
    if (!confirm(`Hapus pilihan nominal Rp ${val.toLocaleString("id-ID")}?`))
      return;
    const updated = {
      ...data,
      nominalDonasi: data.nominalDonasi.filter((n) => n !== val),
    };
    setData(updated);
    handleSave(updated);
  };

  // Helper Platform
  const addPlatform = () => {
    if (!newPlatform.trim()) return;
    if (data.platforms.includes(newPlatform.trim())) {
      alert("Platform sudah ada!");
      return;
    }
    const updated = {
      ...data,
      platforms: [...data.platforms, newPlatform.trim()],
    };
    setData(updated);
    setNewPlatform("");
    handleSave(updated);
  };
  const removePlatform = (item: string) => {
    if (!confirm(`Hapus platform "${item}"?`)) return;
    const updated = {
      ...data,
      platforms: data.platforms.filter((p) => p !== item),
    };
    setData(updated);
    handleSave(updated);
  };

  // Helper Kategori Pengeluaran
  const addKategoriPengeluaran = () => {
    if (!newKategoriPengeluaran.trim()) return;
    if (data.kategoriPengeluaran.includes(newKategoriPengeluaran.trim())) {
      alert("Kategori pengeluaran sudah ada!");
      return;
    }
    const updated = {
      ...data,
      kategoriPengeluaran: [
        ...data.kategoriPengeluaran,
        newKategoriPengeluaran.trim(),
      ],
    };
    setData(updated);
    setNewKategoriPengeluaran("");
    handleSave(updated);
  };
  const removeKategoriPengeluaran = (item: string) => {
    if (!confirm(`Hapus kategori pengeluaran "${item}"?`)) return;
    const updated = {
      ...data,
      kategoriPengeluaran: data.kategoriPengeluaran.filter((k) => k !== item),
    };
    setData(updated);
    handleSave(updated);
  };

  // Helper Tahun Kas Aktif
  const addTahunKas = () => {
    const val = parseInt(newTahunKas.replace(/\D/g, ""), 10);
    if (!val || val < 2020 || val > 2040) {
      alert("Masukkan tahun valid (2020-2040)");
      return;
    }
    if (data.tahunKasAktif.includes(val)) {
      alert("Tahun sudah ada!");
      return;
    }
    const updated = {
      ...data,
      tahunKasAktif: [...data.tahunKasAktif, val].sort((a, b) => a - b),
    };
    setData(updated);
    setNewTahunKas("");
    handleSave(updated);
  };
  const removeTahunKas = (val: number) => {
    if (!confirm(`Hapus tahun ${val} dari matriks kas?`)) return;
    const updated = {
      ...data,
      tahunKasAktif: data.tahunKasAktif.filter((y) => y !== val),
    };
    setData(updated);
    handleSave(updated);
  };

  // Helper Jabatan Bebas Kas
  const addJabatanBebas = () => {
    if (!newJabatanBebas.trim()) return;
    if (data.jabatanBebasKas.includes(newJabatanBebas.trim())) {
      alert("Jabatan sudah ada!");
      return;
    }
    const updated = {
      ...data,
      jabatanBebasKas: [...data.jabatanBebasKas, newJabatanBebas.trim()],
    };
    setData(updated);
    setNewJabatanBebas("");
    handleSave(updated);
  };
  const removeJabatanBebas = (item: string) => {
    if (!confirm(`Hapus jabatan bebas iuran "${item}"?`)) return;
    const updated = {
      ...data,
      jabatanBebasKas: data.jabatanBebasKas.filter((j) => j !== item),
    };
    setData(updated);
    handleSave(updated);
  };

  // Helper Tipe Reward Kupon
  const addTipeReward = () => {
    if (!newTipeReward.trim()) return;
    if (data.tipeRewardKupon.includes(newTipeReward.trim())) {
      alert("Tipe reward sudah ada!");
      return;
    }
    const updated = {
      ...data,
      tipeRewardKupon: [...data.tipeRewardKupon, newTipeReward.trim()],
    };
    setData(updated);
    setNewTipeReward("");
    handleSave(updated);
  };
  const removeTipeReward = (item: string) => {
    if (!confirm(`Hapus tipe reward "${item}"?`)) return;
    const updated = {
      ...data,
      tipeRewardKupon: data.tipeRewardKupon.filter((t) => t !== item),
    };
    setData(updated);
    handleSave(updated);
  };

  // Save Default Nominal Kas
  const handleSaveDefaultKas = () => {
    const val = parseInt(editDefaultNominal.replace(/\D/g, ""), 10);
    if (!val || isNaN(val)) {
      alert("Masukkan nominal valid");
      return;
    }
    const updated = { ...data, defaultNominalKas: val };
    setData(updated);
    handleSave(updated);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* TOP SUB-NAVBAR KONSISTEN */}
        <AdminSubNav
          activeKey="master-data"
          title="Master Data & Konfigurasi Sistem"
          subtitle="Kelola banner & pengumuman home, event war tiket, tarif kas, kategori, dan master opsi sistem."
        />

        {/* NOTIFICATION */}
        {msg && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: 12,
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#10b981",
              fontWeight: 700,
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <i className="bx bx-check-circle" /> {msg}
          </div>
        )}

        {loading ? (
          <div className={styles.emptyBox}>
            <i className="bx bx-loader-alt bx-spin" />
            <p>Memuat master data...</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* ── MASTER REKRUTMEN & FORM PERTANYAAN JOIN ── */}
            <div
              className={styles.sectionCard}
              style={{
                border: "2px solid color-mix(in srgb, #ff6b1a 50%, transparent)",
                background: "color-mix(in srgb, #ff6b1a 8%, var(--cv-ink-2))",
                boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              <div className={styles.sectionHeader} style={{ marginBottom: 14 }}>
                <div>
                  <h2 className={styles.sectionTitle} style={{ color: "var(--cv-orange, #ff6b1a)", fontSize: "1.25rem" }}>
                    <i className="bx bx-slider-alt" style={{ color: "var(--cv-orange, #ff6b1a)", fontSize: "1.4rem" }} />
                    Master Pertanyaan &amp; Rekrutmen Form Join (/join)
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 2 }}>
                    Kelola formulir pendaftaran dinamis: tambah pertanyaan baru, pilih tipe input (teks, pilihan, upload), atur urutan pertanyaan, dan unduh data jawaban pendaftar.
                  </p>
                </div>
                <Link
                  href="/internal/dashboard-admin-xv7r2q?tab=recruitment"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 10,
                    background: "var(--cv-orange)",
                    color: "var(--cv-on-orange)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    textDecoration: "none",
                  }}
                >
                  <i className="bx bx-edit" /> Kelola Rekrutmen &amp; Pertanyaan
                </Link>
              </div>
            </div>

            {/* ── 0. KELOLA INFORMASI & BANNER HOME (OPEN MEMBER / MEET N GREET / EVENT) ── */}
            <div
              className={styles.sectionCard}
              style={{
                border: "2px solid color-mix(in srgb, var(--cv-orange) 45%, transparent)",
                background: "color-mix(in srgb, var(--cv-orange) 6%, var(--cv-ink-2))",
                boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              <div className={styles.sectionHeader} style={{ marginBottom: 14 }}>
                <div>
                  <h2 className={styles.sectionTitle} style={{ color: "var(--gold)", fontSize: "1.25rem" }}>
                    <i className="bx bx-broadcast" style={{ color: "var(--gold)", fontSize: "1.4rem" }} />
                    Informasi &amp; Banner Halaman Home
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 2 }}>
                    Tambahkan info untuk tampil di halaman utama website, seperti pengumuman Open Member, jadwal Meet &amp; Greet, event spesial, atau agenda resmi.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewBannerModal}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 10,
                    background: "var(--cv-orange)",
                    color: "var(--cv-on-orange)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                  }}
                >
                  <i className="bx bx-plus-circle" style={{ fontSize: "1.1rem" }} /> Tambah Banner / Info
                </button>
              </div>

              {/* DAFTAR BANNER */}
              {(!data.homeBanners || data.homeBanners.length === 0) ? (
                <div style={{ padding: "24px 0", textAlign: "center", opacity: 0.5 }}>
                  <i className="bx bx-info-circle" style={{ fontSize: "2rem", marginBottom: 6 }} />
                  <p style={{ margin: 0, fontSize: "0.88rem" }}>Belum ada banner info home. Klik tombol di atas untuk menambahkan.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                  {data.homeBanners.map((b) => (
                    <div
                      key={b.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: b.isActive ? "color-mix(in srgb, var(--cv-bone) 3%, transparent)" : "color-mix(in srgb, var(--cv-bone) 1%, transparent)",
                        border: b.isActive ? "1px solid color-mix(in srgb, var(--cv-orange) 35%, transparent)" : "1px dashed var(--cv-line-strong)",
                        opacity: b.isActive ? 1 : 0.6,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 12,
                        position: "relative",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 12,
                              background: b.badgeColor === "blue" ? "color-mix(in srgb, var(--cv-orange) 20%, transparent)" : b.badgeColor === "green" ? "rgba(16, 185, 129, 0.2)" : b.badgeColor === "red" ? "rgba(239, 68, 68, 0.2)" : "color-mix(in srgb, var(--cv-orange) 20%, transparent)",
                              color: b.badgeColor === "blue" ? "var(--cv-orange-hi)" : b.badgeColor === "green" ? "#6ee7b7" : b.badgeColor === "red" ? "#fca5a5" : "var(--cv-orange-hi)",
                              border: "1px solid currentColor",
                            }}
                          >
                            {b.badge}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleBannerStatus(b.id, b.isActive)}
                            style={{
                              padding: "2px 8px",
                              borderRadius: 10,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: b.isActive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                              border: `1px solid ${b.isActive ? "#10b981" : "#ef4444"}`,
                              color: b.isActive ? "#34d399" : "#f87171",
                              cursor: "pointer",
                            }}
                            title="Klik untuk toggle status aktif/nonaktif"
                          >
                            {b.isActive ? "● AKTIF DI HOME" : "○ NONAKTIF"}
                          </button>
                        </div>

                        {b.imageUrl && (
                          <div style={{ width: "100%", height: 110, borderRadius: 8, overflow: "hidden", marginBottom: 10, border: "1px solid var(--cv-line)" }}>
                            <img src={b.imageUrl} alt={b.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        )}

                        {b.videoUrl && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 6, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: "0.72rem", fontWeight: 700, marginBottom: 8 }}>
                            <i className="bx bxl-youtube" />
                            {b.videoOrientation === "portrait" ? "Video Portrait (9:16)" : "Video Landscape (16:9)"}
                          </div>
                        )}

                        <h4 style={{ margin: "0 0 6px", fontSize: "1rem", color: "var(--cv-text)" }}>{b.title}</h4>
                        <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: "var(--fg-dim)", lineHeight: 1.45 }}>{b.description}</p>

                        {b.sessions && b.sessions.length > 0 && (
                          <div style={{ marginBottom: 8, padding: "6px 10px", background: "color-mix(in srgb, var(--cv-orange) 10%, transparent)", borderRadius: 6, border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)", fontSize: "0.76rem" }}>
                            <strong style={{ color: "var(--gold)", display: "block", marginBottom: 2 }}>
                              <i className="bx bx-time-five" /> {b.sessions.length} Sesi Terjadwal:
                            </strong>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {b.sessions.map((s, si) => (
                                <span key={si} style={{ background: "color-mix(in srgb, var(--cv-ink) 60%, transparent)", padding: "2px 6px", borderRadius: 4, color: "var(--cv-text)" }}>
                                  {s.sessionName}: {s.time}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(b.dateInfo || b.locationInfo) && (
                          <div style={{ fontSize: "0.76rem", color: "var(--cv-text-dim)", display: "flex", flexDirection: "column", gap: 3, marginBottom: 8, background: "color-mix(in srgb, var(--cv-ink) 50%, transparent)", padding: "6px 10px", borderRadius: 6 }}>
                            {b.dateInfo && <div><i className="bx bx-calendar" style={{ color: "var(--gold)", marginRight: 6 }} />{b.dateInfo}</div>}
                            {b.locationInfo && <div><i className="bx bx-map-pin" style={{ color: "var(--gold)", marginRight: 6 }} />{b.locationInfo}</div>}
                          </div>
                        )}

                        <div style={{ fontSize: "0.75rem", color: "var(--fg-dim)", display: "flex", alignItems: "center", gap: 6 }}>
                          <i className="bx bx-link" /> Tombol: <strong>{b.actionText || "Selengkapnya"}</strong> &rarr; <code style={{ fontSize: "0.72rem", opacity: 0.8 }}>{b.actionUrl || "/"}</code>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid var(--cv-line)" }}>
                        <button
                          type="button"
                          className={styles.actionBtnEdit}
                          onClick={() => openEditBannerModal(b)}
                          style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                        >
                          <i className="bx bx-edit" /> Edit
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtnDel}
                          onClick={() => deleteBanner(b.id, b.title)}
                          style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                        >
                          <i className="bx bx-trash" /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 1. PENGATURAN MASTER EVENT & TEMPLATE E-TICKET WAR ── */}
            <div
              className={styles.sectionCard}
              style={{
                border: "2px solid color-mix(in srgb, var(--cv-orange) 45%, transparent)",
                background: "color-mix(in srgb, var(--cv-orange) 6%, var(--cv-ink-2))",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              <div className={styles.sectionHeader} style={{ marginBottom: 12 }}>
                <div>
                  <h2 className={styles.sectionTitle} style={{ color: "var(--gold)", fontSize: "1.25rem" }}>
                    <i className="bx bx-confirmation" style={{ color: "var(--gold)", fontSize: "1.4rem" }} />
                    Pengaturan Master Event &amp; Template E-Ticket War
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "var(--fg-muted)", marginTop: 2 }}>
                    Kustomisasi nama event tiket, kode unik tiket (dapat diubah dari STS19 ke kode event lain), kuota, venue acara, dan jadwal war tiket.
                  </p>
                </div>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    background: warEvent.status === "buka" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    border: `1px solid ${warEvent.status === "buka" ? "#10b981" : "#ef4444"}`,
                    color: warEvent.status === "buka" ? "#10b981" : "#ef4444",
                    textTransform: "uppercase",
                  }}
                >
                  Status: {warEvent.status}
                </span>
              </div>

              <form onSubmit={handleSaveWarEvent} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
                  {/* Nama Event / Judul Tiket */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                      Judul / Nama Event Tiket:
                    </label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={warEvent.judul}
                      onChange={(e) => setWarEvent({ ...warEvent, judul: e.target.value })}
                      placeholder="Contoh: War Tiket Project STS Erine 20th"
                      required
                    />
                  </div>

                  {/* Kode Prefix Tiket (Bisa Diubah!) */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--gold)" }}>
                        Kode Prefix Tiket (Nomor Tiket):
                      </label>
                      <span style={{ fontSize: "0.72rem", color: "var(--fg-muted)" }}>
                        Contoh: <strong>STS20</strong>, <strong>ERINE20</strong>, <strong>PASSION</strong>
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="text"
                        className={styles.modalInput}
                        style={{ fontWeight: 800, letterSpacing: "0.08em", color: "var(--gold)" }}
                        value={warEvent.kodeTiket}
                        onChange={(e) => setWarEvent({ ...warEvent, kodeTiket: e.target.value.toUpperCase() })}
                        placeholder="STS20"
                        required
                      />
                      <div
                        style={{
                          padding: "8px 14px",
                          borderRadius: 10,
                          background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                          border: "1px dashed var(--gold)",
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          color: "var(--gold)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Preview: #{warEvent.kodeTiket || "STS20"}-001
                      </div>
                    </div>
                  </div>

                  {/* Subjudul / Tema Acara */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                      Subjudul / Tema Acara:
                    </label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={warEvent.subjudul}
                      onChange={(e) => setWarEvent({ ...warEvent, subjudul: e.target.value })}
                      placeholder="Contoh: Cavallery • Official Fanbase Erine JKT48"
                    />
                  </div>

                  {/* Kategori / Level Tiket */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                      Kategori / Badge Tiket:
                    </label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={warEvent.kategoriTiket}
                      onChange={(e) => setWarEvent({ ...warEvent, kategoriTiket: e.target.value })}
                      placeholder="Contoh: OFFICIAL VIP PASS • TEAM PASSION"
                    />
                  </div>

                  {/* Lokasi / Venue Acara */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                      <i className="bx bx-map-pin" style={{ color: "var(--gold)", marginRight: 4 }} />
                      Lokasi / Venue Acara:
                    </label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={warEvent.lokasiEvent}
                      onChange={(e) => setWarEvent({ ...warEvent, lokasiEvent: e.target.value })}
                      placeholder="Contoh: Theater JKT48, fX Sudirman Lt. 4"
                    />
                  </div>

                  {/* Tanggal & Waktu Acara */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                      <i className="bx bx-calendar" style={{ color: "var(--gold)", marginRight: 4 }} />
                      Tanggal &amp; Waktu Pelaksanaan Acara:
                    </label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={warEvent.tanggalEvent}
                      onChange={(e) => setWarEvent({ ...warEvent, tanggalEvent: e.target.value })}
                      placeholder="Contoh: Sabtu, 26 September 2026 • 19.00 WIB"
                    />
                  </div>

                  {/* Kuota Total */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                      <i className="bx bx-group" style={{ color: "var(--gold)", marginRight: 4 }} />
                      Kuota Tiket Tersedia:
                    </label>
                    <input
                      type="number"
                      min="1"
                      className={styles.modalInput}
                      value={warEvent.kuotaTotal}
                      onChange={(e) => setWarEvent({ ...warEvent, kuotaTotal: Number(e.target.value) || 1 })}
                      required
                    />
                  </div>

                  {/* Status War */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                      Status Ketersediaan War:
                    </label>
                    <select
                      className={styles.modalInput}
                      value={warEvent.status}
                      onChange={(e) => setWarEvent({ ...warEvent, status: e.target.value })}
                    >
                      <option value="buka">Buka (Aktif &amp; Dapat Diwar)</option>
                      <option value="tutup">Tutup (Ditutup Sementara/Permanen)</option>
                      <option value="draft">Draft (Disembunyikan)</option>
                    </select>
                  </div>

                  {/* Waktu Buka War */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                      <i className="bx bx-time" style={{ color: "var(--gold)", marginRight: 4 }} />
                      Waktu Mulai Dibuka (Countdown):
                    </label>
                    <input
                      type="datetime-local"
                      className={styles.modalInput}
                      value={warEvent.waktuBuka}
                      onChange={(e) => setWarEvent({ ...warEvent, waktuBuka: e.target.value })}
                      required
                    />
                  </div>

                  {/* Waktu Tutup War */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                      <i className="bx bx-time-five" style={{ color: "var(--gold)", marginRight: 4 }} />
                      Waktu Ditutup (Batas Akhir War):
                    </label>
                    <input
                      type="datetime-local"
                      className={styles.modalInput}
                      value={warEvent.waktuTutup}
                      onChange={(e) => setWarEvent({ ...warEvent, waktuTutup: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Deskripsi Singkat */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                    Deskripsi Ringkas Event:
                  </label>
                  <input
                    type="text"
                    className={styles.modalInput}
                    value={warEvent.deskripsi}
                    onChange={(e) => setWarEvent({ ...warEvent, deskripsi: e.target.value })}
                    placeholder="Deskripsi singkat yang tampil pada banner war tiket..."
                  />
                </div>

                {/* Syarat & Ketentuan */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                    Syarat &amp; Ketentuan War Tiket:
                  </label>
                  <textarea
                    className={styles.modalInput}
                    rows={3}
                    style={{ resize: "vertical" }}
                    value={warEvent.syaratKetentuan}
                    onChange={(e) => setWarEvent({ ...warEvent, syaratKetentuan: e.target.value })}
                    placeholder="Tuliskan syarat dan aturan klaim tiket..."
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                  <button
                    type="submit"
                    disabled={savingWarEvent}
                    className={styles.btnCreate}
                    style={{
                      background: "var(--cv-orange)",
                      color: "var(--cv-on-orange)",
                      fontWeight: 800,
                      padding: "10px 24px",
                      borderRadius: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      border: "none",
                      boxShadow: "0 4px 14px color-mix(in srgb, var(--cv-orange) 35%, transparent)",
                    }}
                  >
                    {savingWarEvent ? (
                      <>
                        <i className="bx bx-loader-alt bx-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <i className="bx bx-save" /> Simpan Pengaturan &amp; Kode E-Tiket
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* ── 1. KATEGORI PENGELUARAN KAS (BARU DITAMBAHKAN) ── */}
            <div
              className={styles.sectionCard}
              style={{ border: "1.5px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)" }}
            >
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="bx bx-receipt" style={{ color: "var(--cv-orange)" }} />
                  Kategori Pengeluaran Kas Operasional (
                  {(data.kategoriPengeluaran || []).length})
                </h2>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--fg-muted)",
                  marginTop: -6,
                  marginBottom: 14,
                }}
              >
                Pilihan kategori belanja operasional fanbase saat mencatat
                pengeluaran di halaman kas.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {(data.kategoriPengeluaran || []).map((kat) => (
                  <span
                    key={kat}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 50,
                      background: "color-mix(in srgb, var(--cv-orange) 10%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                      color: "var(--cv-orange)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    <i className="bx bx-tag" style={{ fontSize: "0.9rem" }} />
                    {kat}
                    <button
                      type="button"
                      onClick={() => removeKategoriPengeluaran(kat)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: 0,
                        marginLeft: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Hapus Kategori"
                    >
                      <i
                        className="bx bx-x-circle"
                        style={{ fontSize: "1.1rem" }}
                      />
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, maxWidth: 380 }}>
                <input
                  type="text"
                  placeholder="Kategori baru (cth: Banner & Project)..."
                  className={styles.modalInput}
                  value={newKategoriPengeluaran}
                  onChange={(e) => setNewKategoriPengeluaran(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && addKategoriPengeluaran()
                  }
                />
                <button
                  type="button"
                  className={styles.btnCreate}
                  onClick={addKategoriPengeluaran}
                  disabled={saving || !newKategoriPengeluaran.trim()}
                  style={{
                    background: "var(--cv-orange)",
                    color: "var(--cv-on-orange)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <i className="bx bx-plus" /> Tambah
                </button>
              </div>
            </div>

            {/* ── 2. BESARAN IURAN KAS WAJIB & TAHUN AKTIF ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {/* Besaran Kas Wajib */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <i className="bx bx-money" style={{ color: "#10b981" }} />
                    Tarif Iuran Kas Wajib Bulanan
                  </h2>
                </div>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--fg-muted)",
                    marginTop: -6,
                    marginBottom: 14,
                  }}
                >
                  Standar nominal kewajiban iuran kas anggota per 1 bulan
                  (digunakan dalam pelacak tagihan kas).
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    maxWidth: 340,
                  }}
                >
                  <div style={{ position: "relative", flex: 1 }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontWeight: 700,
                        color: "var(--fg-muted)",
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      className={styles.modalInput}
                      style={{ paddingLeft: 38 }}
                      value={editDefaultNominal}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setEditDefaultNominal(
                          digits ? Number(digits).toLocaleString("id-ID") : "",
                        );
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSaveDefaultKas()
                      }
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.btnCreate}
                    onClick={handleSaveDefaultKas}
                    disabled={saving}
                  >
                    Simpan
                  </button>
                </div>
              </div>

              {/* Tahun Aktif Matriks Kas */}
              <div className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <i
                      className="bx bx-calendar"
                      style={{ color: "var(--gold)" }}
                    />
                    Tahun Aktif Matriks Kas ({(data.tahunKasAktif || []).length})
                  </h2>
                </div>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--fg-muted)",
                    marginTop: -6,
                    marginBottom: 14,
                  }}
                >
                  Tahun yang didukung pada pemilih tahun matriks kas dan tab
                  Google Spreadsheet.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 14,
                  }}
                >
                  {(data.tahunKasAktif || []).map((yr) => (
                    <span
                      key={yr}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 50,
                        background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                        color: "var(--gold)",
                        fontWeight: 800,
                        fontSize: "0.85rem",
                      }}
                    >
                      {yr}
                      {data.tahunKasAktif.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTahunKas(yr)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                          }}
                        >
                          <i
                            className="bx bx-x-circle"
                            style={{ fontSize: "1rem" }}
                          />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, maxWidth: 260 }}>
                  <input
                    type="number"
                    placeholder="Tambah Tahun (cth: 2030)"
                    className={styles.modalInput}
                    value={newTahunKas}
                    onChange={(e) => setNewTahunKas(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTahunKas()}
                  />
                  <button
                    type="button"
                    className={styles.btnCreate}
                    onClick={addTahunKas}
                    disabled={saving || !newTahunKas}
                  >
                    <i className="bx bx-plus" /> Tambah
                  </button>
                </div>
              </div>
            </div>

            {/* ── 3. JABATAN BEBAS IURAN KAS ── */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i
                    className="bx bx-user-check"
                    style={{ color: "var(--cv-orange)" }}
                  />
                  Jabatan Bebas Iuran Kas Wajib ({(data.jabatanBebasKas || []).length})
                </h2>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--fg-muted)",
                  marginTop: -6,
                  marginBottom: 14,
                }}
              >
                Anggota yang memiliki role jabatan ini secara otomatis
                dibebaskan dari kewajiban iuran kas bulanan.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {(data.jabatanBebasKas || []).map((jab) => (
                  <span
                    key={jab}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 50,
                      background: "color-mix(in srgb, var(--cv-orange) 10%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                      color: "var(--cv-orange)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    <i className="bx bx-award" />
                    {jab}
                    <button
                      type="button"
                      onClick={() => removeJabatanBebas(jab)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                      }}
                    >
                      <i
                        className="bx bx-x-circle"
                        style={{ fontSize: "1.1rem" }}
                      />
                    </button>
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, maxWidth: 360 }}>
                <input
                  type="text"
                  placeholder="Nama jabatan (cth: Dewan Penasehat)..."
                  className={styles.modalInput}
                  value={newJabatanBebas}
                  onChange={(e) => setNewJabatanBebas(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addJabatanBebas()}
                />
                <button
                  type="button"
                  className={styles.btnCreate}
                  onClick={addJabatanBebas}
                  disabled={saving || !newJabatanBebas.trim()}
                >
                  <i className="bx bx-plus" /> Tambah
                </button>
              </div>
            </div>

            {/* ── 4. MASTER DIVISI ADMIN FANBASE ── */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i
                    className="bx bx-shield-quarter"
                    style={{ color: "var(--primary)" }}
                  />
                  Divisi Admin Fanbase ({(data.divisi || []).length})
                </h2>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--fg-muted)",
                  marginTop: -6,
                  marginBottom: 14,
                }}
              >
                Divisi ini akan muncul di dropdown saat memilih role{" "}
                <strong>Admin Fanbase</strong> di tabel Keanggotaan &amp; form
                user.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {(data.divisi || []).map((div) => (
                  <span
                    key={div}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 50,
                      background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                      color: "var(--primary)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    <i
                      className="bx bx-check-shield"
                      style={{ fontSize: "0.9rem" }}
                    />
                    {div}
                    <button
                      type="button"
                      onClick={() => removeDivisi(div)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: 0,
                        marginLeft: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Hapus Divisi"
                    >
                      <i
                        className="bx bx-x-circle"
                        style={{ fontSize: "1.1rem" }}
                      />
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, maxWidth: 360 }}>
                <input
                  type="text"
                  placeholder="Nama Divisi Baru..."
                  className={styles.modalInput}
                  value={newDivisi}
                  onChange={(e) => setNewDivisi(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDivisi()}
                />
                <button
                  type="button"
                  className={styles.btnCreate}
                  onClick={addDivisi}
                  disabled={saving || !newDivisi.trim()}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <i className="bx bx-plus" /> Tambah
                </button>
              </div>
            </div>

            {/* ── 5. MASTER TIPE DONASI ── */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i
                    className="bx bx-donate-heart"
                    style={{ color: "var(--gold)" }}
                  />
                  Pilihan Tipe Donasi &amp; Project ({(data.tipeDonasi || []).length})
                </h2>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--fg-muted)",
                  marginTop: -6,
                  marginBottom: 14,
                }}
              >
                Kategori project yang dapat dipilih donatur/anggota saat
                melakukan donasi.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {(data.tipeDonasi || []).map((tipe) => (
                  <span
                    key={tipe}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 50,
                      background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                      color: "var(--gold)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    <i className="bx bx-gift" style={{ fontSize: "0.9rem" }} />
                    {tipe}
                    <button
                      type="button"
                      onClick={() => removeTipeDonasi(tipe)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: 0,
                        marginLeft: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Hapus Tipe"
                    >
                      <i
                        className="bx bx-x-circle"
                        style={{ fontSize: "1.1rem" }}
                      />
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, maxWidth: 360 }}>
                <input
                  type="text"
                  placeholder="Nama Project / Tipe Donasi Baru..."
                  className={styles.modalInput}
                  value={newTipeDonasi}
                  onChange={(e) => setNewTipeDonasi(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTipeDonasi()}
                />
                <button
                  type="button"
                  className={styles.btnCreate}
                  onClick={addTipeDonasi}
                  disabled={saving || !newTipeDonasi.trim()}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <i className="bx bx-plus" /> Tambah
                </button>
              </div>
            </div>

            {/* ── 6. MASTER PLATFORM KONTAK ── */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="bx bx-share-alt" style={{ color: "var(--cv-orange-hi)" }} />
                  Pilihan Platform Kontak ({(data.platforms || []).length})
                </h2>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--fg-muted)",
                  marginTop: -6,
                  marginBottom: 14,
                }}
              >
                Platform kontak yang tersedia di form pendaftaran anggota &amp;
                kontributor (LINE, X, Instagram, TikTok, dll).
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {(data.platforms || []).map((plat) => (
                  <span
                    key={plat}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 50,
                      background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                      color: "var(--cv-orange-hi)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    <i className="bx bx-link" style={{ fontSize: "0.9rem" }} />
                    {plat}
                    <button
                      type="button"
                      onClick={() => removePlatform(plat)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: 0,
                        marginLeft: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Hapus Platform"
                    >
                      <i
                        className="bx bx-x-circle"
                        style={{ fontSize: "1.1rem" }}
                      />
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, maxWidth: 360 }}>
                <input
                  type="text"
                  placeholder="Nama Platform Baru (cth: Telegram)"
                  className={styles.modalInput}
                  value={newPlatform}
                  onChange={(e) => setNewPlatform(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPlatform()}
                />
                <button
                  type="button"
                  className={styles.btnCreate}
                  onClick={addPlatform}
                  disabled={saving || !newPlatform.trim()}
                  style={{ whiteSpace: "nowrap" }}
                >
                  <i className="bx bx-plus" /> Tambah
                </button>
              </div>
            </div>

            {/* ── 7. MASTER TIPE REWARD KUPON KAS ── */}
            <div
              className={styles.sectionCard}
              style={{ border: "1.5px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)" }}
            >
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  <i className="bx bx-gift" style={{ color: "var(--cv-orange-hi)" }} />
                  Pilihan Tipe Reward Kupon Kas ({(data.tipeRewardKupon || []).length})
                </h2>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--fg-muted)",
                  marginTop: -6,
                  marginBottom: 14,
                }}
              >
                Pilihan reward / hadiah apresiasi kas yang tersedia saat admin
                membuat kupon reward untuk anggota yang rajin bayar kas.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {(data.tipeRewardKupon || []).map((rew) => (
                  <span
                    key={rew}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 50,
                      background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                      color: "var(--cv-orange-hi)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    <i className="bx bx-award" style={{ fontSize: "0.9rem" }} />
                    {rew}
                    <button
                      type="button"
                      onClick={() => removeTipeReward(rew)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: 0,
                        marginLeft: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Hapus Tipe Reward"
                    >
                      <i
                        className="bx bx-x-circle"
                        style={{ fontSize: "1.1rem" }}
                      />
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, maxWidth: 380 }}>
                <input
                  type="text"
                  placeholder="Tipe reward baru (cth: Voucher Tiket Event)..."
                  className={styles.modalInput}
                  value={newTipeReward}
                  onChange={(e) => setNewTipeReward(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTipeReward()}
                />
                <button
                  type="button"
                  className={styles.btnCreate}
                  onClick={addTipeReward}
                  disabled={saving || !newTipeReward.trim()}
                  style={{
                    background: "var(--cv-orange)",
                    color: "var(--cv-on-orange)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <i className="bx bx-plus" /> Tambah
                </button>
              </div>
            </div>
            {/* ── 8. MASTER NOMINAL KAS (KELIPATAN IURAN KAS 1 - 12 BULAN) ── */}
            <div
              className={styles.sectionCard}
              style={{ border: "1.5px solid rgba(16, 185, 129, 0.3)" }}
            >
              <div
                className={styles.sectionHeader}
                style={{ flexWrap: "wrap", gap: 10 }}
              >
                <div>
                  <h2 className={styles.sectionTitle}>
                    <i className="bx bx-wallet" style={{ color: "#10b981" }} />
                    Pilihan Nominal Iuran Kas ({(data.nominalKas || []).length})
                  </h2>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--fg-muted)",
                      marginTop: 2,
                    }}
                  >
                    Pilihan tombol cepat (chips) kelipatan kas 1 s/d 12 bulan di
                    portal kas anggota &amp; form bayar kas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const default12 = [
                      15000, 30000, 45000, 60000, 75000, 90000, 105000, 120000,
                      135000, 150000, 165000, 180000,
                    ];
                    const updated = { ...data, nominalKas: default12 };
                    setData(updated);
                    handleSave(updated);
                  }}
                  className={styles.btnSecondary}
                  style={{
                    fontSize: "0.78rem",
                    padding: "6px 14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title="Reset pilihan nominal ke standar 1-12 bulan (15.000 s/d 180.000)"
                >
                  <i className="bx bx-reset" /> Reset 1 - 12 Bulan (15k - 180k)
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {(data.nominalKas || []).map((nom) => {
                  const m = Math.round(nom / 15000);
                  const mLabel =
                    m === 1
                      ? "1 Bulan"
                      : m === 6
                        ? "6 Bulan (1/2 Thn)"
                        : m === 12
                          ? "12 Bulan (1 Thn)"
                          : `${m} Bulan`;

                  return (
                    <span
                      key={nom}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 14px",
                        borderRadius: 50,
                        background: "rgba(16, 185, 129, 0.1)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#10b981",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                      }}
                    >
                      <i
                        className="bx bx-check-circle"
                        style={{ fontSize: "0.9rem" }}
                      />
                      Rp {nom.toLocaleString("id-ID")}{" "}
                      <span style={{ fontSize: "0.72rem", opacity: 0.85 }}>
                        ({mLabel})
                      </span>
                      <button
                        type="button"
                        onClick={() => removeNominalKas(nom)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: 0,
                          marginLeft: 4,
                          display: "flex",
                          alignItems: "center",
                        }}
                        title={`Hapus Rp ${nom.toLocaleString("id-ID")}`}
                      >
                        <i
                          className="bx bx-x-circle"
                          style={{ fontSize: "1.1rem" }}
                        />
                      </button>
                    </span>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10, maxWidth: 380 }}>
                <input
                  type="text"
                  placeholder="Nominal kas baru (cth: 195000)..."
                  className={styles.modalInput}
                  value={newNominalKas}
                  onChange={(e) => setNewNominalKas(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNominalKas()}
                />
                <button
                  type="button"
                  className={styles.btnCreate}
                  onClick={addNominalKas}
                  disabled={saving || !newNominalKas.trim()}
                  style={{
                    background: "#10b981",
                    color: "#fff",
                    whiteSpace: "nowrap",
                  }}
                >
                  <i className="bx bx-plus" /> Tambah
                </button>
              </div>
            </div>

            {/* ── 9. MASTER NOMINAL DONASI (CHIPS CEPAT DONASI) ── */}
            <div
              className={styles.sectionCard}
              style={{ border: "1.5px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)" }}
            >
              <div
                className={styles.sectionHeader}
                style={{ flexWrap: "wrap", gap: 10 }}
              >
                <div>
                  <h2 className={styles.sectionTitle}>
                    <i className="bx bx-heart" style={{ color: "var(--cv-orange)" }} />
                    Pilihan Nominal Donasi ({(data.nominalDonasi || []).length})
                  </h2>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--fg-muted)",
                      marginTop: 2,
                    }}
                  >
                    Pilihan tombol cepat (chips) nominal donasi di halaman
                    donasi publik &amp; portal kas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const defaultDonasi = [
                      10000, 25000, 50000, 100000, 250000, 500000,
                    ];
                    const updated = { ...data, nominalDonasi: defaultDonasi };
                    setData(updated);
                    handleSave(updated);
                  }}
                  className={styles.btnSecondary}
                  style={{
                    fontSize: "0.78rem",
                    padding: "6px 14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title="Reset nominal donasi ke default"
                >
                  <i className="bx bx-reset" /> Reset Default (10k - 500k)
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 14,
                }}
              >
                {(data.nominalDonasi || []).map((nom) => (
                  <span
                    key={nom}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 50,
                      background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                      color: "var(--cv-orange)",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                    }}
                  >
                    <i className="bx bx-heart" style={{ fontSize: "0.9rem" }} />
                    Rp {nom.toLocaleString("id-ID")}
                    <button
                      type="button"
                      onClick={() => removeNominalDonasi(nom)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        padding: 0,
                        marginLeft: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title={`Hapus Rp ${nom.toLocaleString("id-ID")}`}
                    >
                      <i
                        className="bx bx-x-circle"
                        style={{ fontSize: "1.1rem" }}
                      />
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, maxWidth: 380 }}>
                <input
                  type="text"
                  placeholder="Nominal donasi baru (cth: 1000000)..."
                  className={styles.modalInput}
                  value={newNominalDonasi}
                  onChange={(e) => setNewNominalDonasi(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addNominalDonasi()}
                />
                <button
                  type="button"
                  className={styles.btnCreate}
                  onClick={addNominalDonasi}
                  disabled={saving || !newNominalDonasi.trim()}
                  style={{
                    background: "var(--cv-orange)",
                    color: "var(--cv-on-orange)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <i className="bx bx-plus" /> Tambah
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL TAMBAH / EDIT BANNER INFO HOME */}
        {showBannerModal && (
          <div className={styles.modalOverlay} onClick={() => setShowBannerModal(false)}>
            <div
              className={styles.formModal}
              onClick={(e) => e.stopPropagation()}
            >
              {/* STICKY HEADER */}
              <div className={styles.formModalHeader}>
                <h3>
                  <i className="bx bx-broadcast" style={{ color: "var(--gold)" }} />{" "}
                  {editingBannerId ? "Edit Banner & Info Home" : "Tambah Banner & Info Home Baru"}
                </h3>
                <button
                  type="button"
                  className={styles.closeX}
                  onClick={() => setShowBannerModal(false)}
                  title="Tutup Modal"
                >
                  <i className="bx bx-x" />
                </button>
              </div>

              {/* FORM & SCROLLABLE BODY */}
              <form onSubmit={handleSaveBanner} className={styles.modalFormWrapper}>
                <div className={styles.formBody}>
                  <div className={styles.formGrid2}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                        Kategori / Badge:
                      </label>
                      <input
                        type="text"
                        className={styles.modalInput}
                        value={bannerForm.badge}
                        onChange={(e) => setBannerForm({ ...bannerForm, badge: e.target.value.toUpperCase() })}
                        placeholder="Contoh: OPEN MEMBER, MEET & GREET"
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                        Warna Badge:
                      </label>
                      <select
                        className={styles.modalInput}
                        value={bannerForm.badgeColor || "gold"}
                        onChange={(e) => setBannerForm({ ...bannerForm, badgeColor: e.target.value })}
                      >
                        <option value="gold">Emas (Gold) - Standar / Open Member</option>
                        <option value="blue">Biru (Blue) - Meet & Greet / Jadwal</option>
                        <option value="green">Hijau (Green) - Info Resmi / Buka</option>
                        <option value="pink">Pink - Project / Seitansai</option>
                        <option value="red">Merah (Red) - Penting / Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                      Judul Pengumuman / Banner: <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={bannerForm.title}
                      onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                      placeholder="Contoh: Pendaftaran Anggota Cavallery 2026 Resmi Dibuka!"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                      Deskripsi / Isi Pengumuman:
                    </label>
                    <textarea
                      className={styles.modalInput}
                      rows={3}
                      value={bannerForm.description}
                      onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
                      placeholder="Tuliskan keterangan lengkap pengumuman di sini..."
                    />
                  </div>

                  <div className={styles.formGrid2}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                        Tanggal / Waktu (Opsional):
                      </label>
                      <input
                        type="text"
                        className={styles.modalInput}
                        value={bannerForm.dateInfo || ""}
                        onChange={(e) => setBannerForm({ ...bannerForm, dateInfo: e.target.value })}
                        placeholder="Contoh: 25 - 30 September 2026"
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                        Lokasi / Tempat (Opsional):
                      </label>
                      <input
                        type="text"
                        className={styles.modalInput}
                        value={bannerForm.locationInfo || ""}
                        onChange={(e) => setBannerForm({ ...bannerForm, locationInfo: e.target.value })}
                        placeholder="Contoh: Theater JKT48 / Online"
                      />
                    </div>
                  </div>

                  <div className={styles.formGrid2}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                        Teks Tombol Aksi:
                      </label>
                      <input
                        type="text"
                        className={styles.modalInput}
                        value={bannerForm.actionText || ""}
                        onChange={(e) => setBannerForm({ ...bannerForm, actionText: e.target.value })}
                        placeholder="Contoh: Daftar Sekarang, Lihat Jadwal"
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                        Tautan / Link URL:
                      </label>
                      <input
                        type="text"
                        className={styles.modalInput}
                        value={bannerForm.actionUrl || ""}
                        onChange={(e) => setBannerForm({ ...bannerForm, actionUrl: e.target.value })}
                        placeholder="Contoh: /join, /schedule, atau URL https://..."
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: "10px 14px", background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)", borderRadius: 10, border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--cv-orange-hi)", display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="bx bx-bulb" style={{ fontSize: "1rem" }} /> Impor data otomatis dari Jadwal VC / M&amp;G Erine?
                    </span>
                    <button
                      type="button"
                      onClick={handleImportVcSchedule}
                      disabled={importingVc}
                      style={{
                        padding: "6px 14px",
                        fontSize: "0.75rem",
                        borderRadius: 8,
                        background: "var(--cv-orange)",
                        color: "var(--cv-on-orange)",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 8px color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                      }}
                    >
                      <i className={`bx ${importingVc ? "bx-loader-alt bx-spin" : "bx-sync"}`} />
                      {importingVc ? "Mengimpor..." : "⚡ Impor API M&G"}
                    </button>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                      Foto / Poster Banner (Bisa Upload atau Masukkan URL):
                    </label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        className={styles.modalInput}
                        value={bannerForm.imageUrl || ""}
                        onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                        placeholder="https://... atau klik Upload Foto"
                        style={{ flex: "1 1 200px" }}
                      />
                      <label
                        style={{
                          padding: "9px 14px",
                          borderRadius: 10,
                          background: "color-mix(in srgb, var(--cv-orange) 18%, transparent)",
                          border: "1px solid var(--gold)",
                          color: "var(--gold)",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          justifyContent: "center",
                        }}
                      >
                        <i className={`bx ${uploadingBannerImg ? "bx-loader-alt bx-spin" : "bx-upload"}`} />
                        {uploadingBannerImg ? "Mengunggah..." : "Upload Foto"}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleUploadBannerImage}
                          disabled={uploadingBannerImg}
                        />
                      </label>
                    </div>
                    {bannerForm.imageUrl && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10, padding: 8, background: "color-mix(in srgb, var(--cv-bone) 3%, transparent)", borderRadius: 10, border: "1px solid var(--cv-line)" }}>
                        <img
                          src={bannerForm.imageUrl}
                          alt="Preview"
                          style={{ width: 80, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid var(--cv-line-strong)" }}
                        />
                        <span style={{ fontSize: "0.75rem", color: "var(--fg-dim)", flex: 1, wordBreak: "break-all" }}>
                          {bannerForm.imageUrl.length > 50 ? `${bannerForm.imageUrl.slice(0, 50)}...` : bannerForm.imageUrl}
                        </span>
                        <button
                          type="button"
                          onClick={() => setBannerForm({ ...bannerForm, imageUrl: "" })}
                          style={{ padding: "4px 8px", fontSize: "0.72rem", color: "#f87171", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 6, cursor: "pointer" }}
                        >
                          Hapus Foto
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── Field Video URL Khusus Home ── */}
                  <div style={{ padding: "12px", background: "rgba(239, 68, 68, 0.05)", borderRadius: 12, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: 4 }}>
                      <i className="bx bxl-youtube" style={{ color: "#ef4444", marginRight: 4 }} />
                      Video Khusus Home (Opsional - YouTube / Video URL):
                    </label>
                    <input
                      type="text"
                      className={styles.modalInput}
                      value={bannerForm.videoUrl || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const isShorts = val.includes("/shorts/");
                        setBannerForm({
                          ...bannerForm,
                          videoUrl: val,
                          videoOrientation: isShorts ? "portrait" : bannerForm.videoOrientation || "portrait",
                        });
                      }}
                      placeholder="Contoh: https://www.youtube.com/watch?v=... atau https://www.youtube.com/shorts/... atau video.mp4"
                      style={{ width: "100%" }}
                    />
                    <span style={{ fontSize: "0.73rem", color: "var(--fg-muted)", marginTop: 4, display: "block" }}>
                      *Mendukung link YouTube standar, YouTube Shorts, Reels, maupun file video .mp4.
                    </span>

                    {/* PILIHAN ORIENTASI VIDEO (LANDSCAPE / PORTRAIT) */}
                    <div style={{ marginTop: 10 }}>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--fg)", marginBottom: 6 }}>
                        Format / Orientasi Tampilan Video:
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setBannerForm({ ...bannerForm, videoOrientation: "landscape" })}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: (bannerForm.videoOrientation || "landscape") === "landscape" ? "2px solid var(--gold)" : "1px solid var(--cv-line)",
                            background: (bannerForm.videoOrientation || "landscape") === "landscape" ? "color-mix(in srgb, var(--cv-orange) 18%, transparent)" : "color-mix(in srgb, var(--cv-bone) 3%, transparent)",
                            color: (bannerForm.videoOrientation || "landscape") === "landscape" ? "var(--gold)" : "var(--fg-dim)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            textAlign: "left",
                          }}
                        >
                          <i className="bx bx-movie" style={{ fontSize: "1.2rem" }} />
                          <div>
                            <div>Landscape (16:9)</div>
                            <div style={{ fontSize: "0.68rem", opacity: 0.7, fontWeight: 500 }}>Horizontal / Standar</div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBannerForm({ ...bannerForm, videoOrientation: "portrait" })}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: bannerForm.videoOrientation === "portrait" ? "2px solid #ef4444" : "1px solid var(--cv-line)",
                            background: bannerForm.videoOrientation === "portrait" ? "rgba(239, 68, 68, 0.2)" : "color-mix(in srgb, var(--cv-bone) 3%, transparent)",
                            color: bannerForm.videoOrientation === "portrait" ? "#fca5a5" : "var(--fg-dim)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            textAlign: "left",
                          }}
                        >
                          <i className="bx bx-mobile-alt" style={{ fontSize: "1.2rem" }} />
                          <div>
                            <div>Portrait (9:16)</div>
                            <div style={{ fontSize: "0.68rem", opacity: 0.7, fontWeight: 500 }}>Vertikal / Shorts / Reels</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {bannerForm.videoUrl && (
                      <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: 8, border: "1px solid rgba(239, 68, 68, 0.25)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <span style={{ fontSize: "0.75rem", color: "#fca5a5", display: "flex", alignItems: "center", gap: 6 }}>
                          <i className="bx bx-video" />
                          Video aktif ({bannerForm.videoOrientation === "portrait" ? "Format Portrait 9:16" : "Format Landscape 16:9"})
                        </span>
                        <button
                          type="button"
                          onClick={() => setBannerForm({ ...bannerForm, videoUrl: "" })}
                          style={{ padding: "3px 8px", fontSize: "0.7rem", color: "#f87171", background: "rgba(239, 68, 68, 0.2)", border: "none", borderRadius: 4, cursor: "pointer" }}
                        >
                          Hapus Video
                        </button>
                      </div>
                    )}
                  </div>

                  {/* TABEL SESI & JAM ERINE */}
                  <div style={{ padding: "14px", background: "color-mix(in srgb, var(--cv-ink) 70%, transparent)", borderRadius: 12, border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "var(--gold)", display: "flex", alignItems: "center", gap: 6 }}>
                          <i className="bx bx-time-five" /> Tabel Sesi &amp; Jam Erine (Opsional)
                        </strong>
                        <span style={{ fontSize: "0.74rem", color: "var(--fg-dim)", display: "block", marginTop: 2 }}>
                          Rincian jam dan sesi untuk tampil dalam bentuk tabel di halaman Home
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={addSessionRow}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          background: "color-mix(in srgb, var(--cv-orange) 20%, transparent)",
                          border: "1px solid var(--gold)",
                          color: "var(--gold)",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <i className="bx bx-plus" /> Tambah Sesi
                      </button>
                    </div>

                    {(!bannerForm.sessions || bannerForm.sessions.length === 0) ? (
                      <p style={{ fontSize: "0.75rem", color: "var(--fg-dim)", margin: 0, fontStyle: "italic", padding: "6px 0" }}>
                        Belum ada rincian sesi. Klik tombol &quot;+ Tambah Sesi&quot; di atas untuk menambahkan jadwal sesi &amp; jam.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div className={styles.sessionGridHeader}>
                          <span>Sesi</span>
                          <span>Waktu / Jam</span>
                          <span>Jalur / Keterangan</span>
                          <span></span>
                        </div>
                        {bannerForm.sessions.map((ses, sIdx) => (
                          <div key={sIdx} className={styles.sessionGridRow}>
                            <input
                              type="text"
                              className={styles.modalInput}
                              value={ses.sessionName}
                              onChange={(e) => updateSessionRow(sIdx, "sessionName", e.target.value)}
                              placeholder="Sesi (cth: Sesi 1)"
                              style={{ padding: "8px 10px", fontSize: "0.8rem" }}
                            />
                            <input
                              type="text"
                              className={styles.modalInput}
                              value={ses.time}
                              onChange={(e) => updateSessionRow(sIdx, "time", e.target.value)}
                              placeholder="Waktu (cth: 11.00 – 12.00 WIB)"
                              style={{ padding: "8px 10px", fontSize: "0.8rem" }}
                            />
                            <input
                              type="text"
                              className={styles.modalInput}
                              value={ses.info || ""}
                              onChange={(e) => updateSessionRow(sIdx, "info", e.target.value)}
                              placeholder="Jalur (cth: Jalur 3 M&G)"
                              style={{ padding: "8px 10px", fontSize: "0.8rem" }}
                            />
                            <button
                              type="button"
                              className={styles.sessionDeleteBtn}
                              onClick={() => removeSessionRow(sIdx)}
                              title="Hapus baris sesi"
                            >
                              <i className="bx bx-trash" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "color-mix(in srgb, var(--cv-bone) 3%, transparent)", borderRadius: 10, border: "1px solid var(--cv-line)" }}>
                    <div>
                      <strong style={{ fontSize: "0.88rem", display: "block" }}>Status Tampil di Home</strong>
                      <span style={{ fontSize: "0.78rem", color: "var(--fg-dim)" }}>Jika dicentang, banner akan langsung muncul di halaman utama</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={bannerForm.isActive}
                      onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                      style={{ width: 22, height: 22, cursor: "pointer", accentColor: "var(--gold)" }}
                    />
                  </div>
                </div>

                {/* STICKY MODAL FOOTER */}
                <div className={styles.formModalFooter}>
                  <button type="button" className={styles.btnGhost} onClick={() => setShowBannerModal(false)}>
                    Batal
                  </button>
                  <button type="submit" className={styles.btnPrimary}>
                    <i className="bx bx-save" /> {editingBannerId ? "Perbarui Pengumuman" : "Simpan & Tampilkan"}
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
