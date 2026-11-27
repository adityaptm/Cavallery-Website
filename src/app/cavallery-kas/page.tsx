"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import * as htmlToImage from "html-to-image";
import styles from "./page.module.css";
import { getMemberBadge } from "@/lib/badges";
import RoleApplicationPanel from "@/components/kas/RoleApplicationPanel";

const PLATFORMS = ["LINE", "X (Twitter)", "Instagram", "TikTok", "Discord"];

const GENDERS = ["Laki-laki", "Perempuan"];

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DONATION_TYPES = [
  "General Support (Kas & Event Erine)",
  "Project Ulang Tahun / Seitansai",
  "Project Bunga & Dukungan Panggung",
  "Project Merchandise & Kreatif Fanbase",
  "Project Media & Ads Support",
];

function getDefaultPeriode() {
  const now = new Date();
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

function formatRupiah(amount?: number) {
  if (!amount) return "Rp 0";
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

const KAS_12_BULAN = [
  { bulan: 1, nominal: 15000, label: "1 Bulan", detail: "1 Bulan: Rp 15.000" },
  { bulan: 2, nominal: 30000, label: "2 Bulan", detail: "2 Bulan: Rp 30.000" },
  { bulan: 3, nominal: 45000, label: "3 Bulan", detail: "3 Bulan: Rp 45.000" },
  { bulan: 4, nominal: 60000, label: "4 Bulan", detail: "4 Bulan: Rp 60.000" },
  { bulan: 5, nominal: 75000, label: "5 Bulan", detail: "5 Bulan: Rp 75.000" },
  {
    bulan: 6,
    nominal: 90000,
    label: "6 Bulan (Setengah Tahun)",
    detail: "6 Bulan (Setengah Tahun): Rp 90.000",
  },
  {
    bulan: 7,
    nominal: 105000,
    label: "7 Bulan",
    detail: "7 Bulan: Rp 105.000",
  },
  {
    bulan: 8,
    nominal: 120000,
    label: "8 Bulan",
    detail: "8 Bulan: Rp 120.000",
  },
  {
    bulan: 9,
    nominal: 135000,
    label: "9 Bulan",
    detail: "9 Bulan: Rp 135.000",
  },
  {
    bulan: 10,
    nominal: 150000,
    label: "10 Bulan",
    detail: "10 Bulan: Rp 150.000",
  },
  {
    bulan: 11,
    nominal: 165000,
    label: "11 Bulan",
    detail: "11 Bulan: Rp 165.000",
  },
  {
    bulan: 12,
    nominal: 180000,
    label: "12 Bulan (1 Tahun)",
    detail: "12 Bulan (1 Tahun): Rp 180.000",
  },
];

function getKasCalculationText(nom: number): string | null {
  const m = Math.round(nom / 15000);
  if (nom <= 0 || nom % 15000 !== 0 || m <= 0) return null;
  if (m === 1) return "1 Bulan: Rp 15.000";
  if (m === 2) return "2 Bulan: Rp 30.000";
  if (m === 3) return "3 Bulan: Rp 45.000";
  if (m === 4) return "4 Bulan: Rp 60.000";
  if (m === 5) return "5 Bulan: Rp 75.000";
  if (m === 6) return "6 Bulan (Setengah Tahun): Rp 90.000";
  if (m === 7) return "7 Bulan: Rp 105.000";
  if (m === 8) return "8 Bulan: Rp 120.000";
  if (m === 9) return "9 Bulan: Rp 135.000";
  if (m === 10) return "10 Bulan: Rp 150.000";
  if (m === 11) return "11 Bulan: Rp 165.000";
  if (m === 12) return "12 Bulan (1 Tahun): Rp 180.000";
  return `${m} Bulan: Rp ${nom.toLocaleString("id-ID")}`;
}

export default function CavalleryKasPage() {
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auth View State
  const [authMode, setAuthMode] = useState<"masuk" | "daftar">("masuk");
  const [tipe, setTipe] = useState<"anggota" | "donatur">("anggota");

  // Form Masuk State
  const [loginNoAnggota, setLoginNoAnggota] = useState("");
  const [loginIdLine, setLoginIdLine] = useState("");
  const [loginNamaDonatur, setLoginNamaDonatur] = useState("");
  const [loginKontakDonatur, setLoginKontakDonatur] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);

  // Form Daftar State
  const [regNoAnggota, setRegNoAnggota] = useState("");
  const [regNamaLengkap, setRegNamaLengkap] = useState("");
  const [regIdLine, setRegIdLine] = useState("");
  const [regPin, setRegPin] = useState("");
  const [showRegPin, setShowRegPin] = useState(false);
  const [regDisplayLine, setRegDisplayLine] = useState("");
  const [regDiscord, setRegDiscord] = useState("");
  const [regGender, setRegGender] = useState("Laki-laki");
  const [regDomisili, setRegDomisili] = useState("");
  const [regKontakPlatform, setRegKontakPlatform] = useState("X (Twitter)");
  const [regKontakId, setRegKontakId] = useState("");
  const [regNamaDonatur, setRegNamaDonatur] = useState("");
  const [regKontakPlatformDonatur, setRegKontakPlatformDonatur] =
    useState("X (Twitter)");
  const [regKontakIdDonatur, setRegKontakIdDonatur] = useState("");
  const [regDiscordDonatur, setRegDiscordDonatur] = useState("");

  // PIN Prompt State for Members without PIN
  const [showPinPromptModal, setShowPinPromptModal] = useState(false);
  const [promptPinInput, setPromptPinInput] = useState("");
  const [promptPinLoading, setPromptPinLoading] = useState(false);
  const [promptPinError, setPromptPinError] = useState("");
  const [promptPinSuccess, setPromptPinSuccess] = useState("");

  // Auth feedback
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Registration Open/Close Status
  const [regAnggotaOpen, setRegAnggotaOpen] = useState(true);
  const [regDonaturOpen, setRegDonaturOpen] = useState(true);

  // Logged-in Dashboard State
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [portalTab, setPortalTab] = useState<
    "bayar" | "riwayat" | "kupon" | "donasi" | "war" | "daftar"
  >("bayar");
  const [periodeBulan, setPeriodeBulan] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [periodeTahun, setPeriodeTahun] = useState<number>(
    new Date().getFullYear(),
  );
  const [filterTahunRiwayat, setFilterTahunRiwayat] = useState<
    number | "semua"
  >(new Date().getFullYear());
  const [nominalKas, setNominalKas] = useState("15.000");
  const [selectedChipKas, setSelectedChipKas] = useState<number | "custom">(
    15000,
  );
  const [fileKas, setFileKas] = useState<File | null>(null);
  const [previewKas, setPreviewKas] = useState<string | null>(null);
  const [kasAlert, setKasAlert] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [submittingKas, setSubmittingKas] = useState(false);
  const [kasSuccessData, setKasSuccessData] = useState<{
    periode: string;
    nominal: number;
    message?: string;
  } | null>(null);
  const [showTabelKas12Bulan, setShowTabelKas12Bulan] = useState(false);

  // User Kupon Reward State
  const [userKupons, setUserKupons] = useState<any[]>([]);
  const [userLunasTahunIni, setUserLunasTahunIni] = useState(0);
  const [loadingUserKupons, setLoadingUserKupons] = useState(false);
  const [copiedKupon, setCopiedKupon] = useState<string | null>(null);

  // Voucher Kas Input State (di form Bayar Kas)
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    kuponAnggotaId: number;
    kodeKupon: string;
    judul: string;
    nominalPotongan: number;
    bulanGratis: number;
    label: string;
  } | null>(null);
  const [voucherMsg, setVoucherMsg] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // War Tiket STS Erine State
  const [warEvent, setWarEvent] = useState<any>({
    id: 1,
    judul: "War Tiket Project STS Erine 20th",
    kode_tiket: "STS20",
    subjudul: "Cavallery • Official Fanbase Erine JKT48",
    lokasi_event: "Theater JKT48, fX Sudirman Lt. 4",
    tanggal_event: "Sabtu, 26 September 2026 • 19.00 WIB",
    kategori_tiket: "OFFICIAL VIP PASS • TEAM PASSION",
    deskripsi: "Akses khusus project perayaan Seitansai Catherina Vallencia (Erine) ke-20 bersama Cavallery Team Passion.",
    kuota_total: 50,
    kuota_terisi: 0,
    sisa_kuota: 50,
    status: "buka",
    is_war_active: true,
  });
  const [userWarTicket, setUserWarTicket] = useState<any | null>(null);
  const [loadingWar, setLoadingWar] = useState(false);
  const [claimingWar, setClaimingWar] = useState(false);
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [warAlert, setWarAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [warTimeLeft, setWarTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isStarted: boolean;
    isEnded: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isStarted: false,
    isEnded: false,
  });

  // Avatar Upload State (User Dashboard)
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingUserAvatar, setUploadingUserAvatar] = useState(false);
  const [avatarToast, setAvatarToast] = useState<string | null>(null);

  // Kas History & Monthly Matrix Status
  const [kasHistory, setKasHistory] = useState<any[]>([]);
  const [monthlyStatus, setMonthlyStatus] = useState<any[]>([]);
  const [memberJoinDate, setMemberJoinDate] = useState<string | null>(null);
  const [trackerYear, setTrackerYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [loadingKasHistory, setLoadingKasHistory] = useState(false);

  // E-Kwitansi Digital State
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Widget Transparansi Kas Komunitas
  const [communityKasStats, setCommunityKasStats] = useState<{
    totalPemasukan: number;
    totalPengeluaran: number;
    saldoBersih: number;
    loading: boolean;
  }>({
    totalPemasukan: 0,
    totalPengeluaran: 0,
    saldoBersih: 0,
    loading: true,
  });

  // KTA Digital & Birthday Greeting State
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const [showKtaModal, setShowKtaModal] = useState(false);
  const [ktaCardTheme, setKtaCardTheme] = useState<"resmi" | "luxury">("resmi");
  const [ktaCardSide, setKtaCardSide] = useState<"front" | "back">("front");
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayAutoOpened, setBirthdayAutoOpened] = useState(false);
  const [editingTtl, setEditingTtl] = useState(false);
  const [inputTempatLahir, setInputTempatLahir] = useState("");
  const [inputTanggalLahir, setInputTanggalLahir] = useState("");
  const [inputGender, setInputGender] = useState("LAKI-LAKI");
  const [inputDomisili, setInputDomisili] = useState("");
  const [savingTtl, setSavingTtl] = useState(false);
  const [ttlSuccessMsg, setTtlSuccessMsg] = useState("");
  const [isPlayingBirthdayVideo, setIsPlayingBirthdayVideo] = useState(false);

  // Fitur 1: Holographic Foil & 3D Tilt State & Refs
  const tiltCardRef = useRef<HTMLDivElement | null>(null);
  const tiltTarget = useRef({ x: 0, y: 0 });
  const tiltCurrent = useRef({ x: 0, y: 0 });
  const tiltRafId = useRef<number | null>(null);
  const [iosSensorNeeded, setIosSensorNeeded] = useState(false);
  const [iosSensorGranted, setIosSensorGranted] = useState(false);

  // Fitur 2: Mode Privat State & Refs
  const [privacyMode, setPrivacyMode] = useState(false);
  const [revealedPrivateFields, setRevealedPrivateFields] = useState<{
    tempatLahir?: string;
    tanggalLahir?: string;
    domisili?: string;
  } | null>(null);
  const [revealingPrivate, setRevealingPrivate] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState(15);
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const revealIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [privacyToastMsg, setPrivacyToastMsg] = useState<string | null>(null);

  // Fitur 3: Kartu Publik yang Bisa Dibagikan State & Refs
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareRatio, setShareRatio] = useState<"4:5" | "9:16">("4:5");
  const [publicCardEnabled, setPublicCardEnabled] = useState(false);
  const [publicCode, setPublicCode] = useState<string>("");
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [sharingWeb, setSharingWeb] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const exportCardRef = useRef<HTMLDivElement | null>(null);


  // Donasi State
  const [tipeDonasi, setTipeDonasi] = useState(DONATION_TYPES[0]);
  const [nominalDonasi, setNominalDonasi] = useState("50.000");
  const [selectedChipDonasi, setSelectedChipDonasi] = useState<
    number | "custom"
  >(50000);
  const [fileDonasi, setFileDonasi] = useState<File | null>(null);
  const [previewDonasi, setPreviewDonasi] = useState<string | null>(null);
  const [donasiAlert, setDonasiAlert] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [submittingDonasi, setSubmittingDonasi] = useState(false);

  // Helper Formatter Pemisah Ribuan Otomatis (15000 -> 15.000)
  const handleNominalKasChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setNominalKas("");
      setSelectedChipKas("custom");
      return;
    }
    const formatted = Number(digits).toLocaleString("id-ID");
    setNominalKas(formatted);
    setSelectedChipKas("custom");
  };

  const handleNominalDonasiChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setNominalDonasi("");
      setSelectedChipDonasi("custom");
      return;
    }
    const formatted = Number(digits).toLocaleString("id-ID");
    setNominalDonasi(formatted);
    setSelectedChipDonasi("custom");
  };

  // Upload Foto Profil User
  const handleUserAvatarUpload = async (file: File) => {
    setUploadingUserAvatar(true);
    setAvatarToast(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.status) {
        throw new Error(uploadJson.message || "Gagal mengunggah foto profil");
      }

      const newPhotoUrl = uploadJson.url;

      // Update di database profil user
      const profileRes = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoProfil: newPhotoUrl }),
      });
      const profileJson = await profileRes.json();
      if (!profileRes.ok || !profileJson.status) {
        throw new Error(profileJson.message || "Gagal menyimpan foto profil");
      }

      setSessionUser((prev: any) => ({
        ...prev,
        fotoProfil: newPhotoUrl,
        foto_profil: newPhotoUrl,
      }));
      setAvatarToast("Foto profil berhasil diperbarui!");
      setTimeout(() => setAvatarToast(null), 4000);
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat mengganti foto profil");
    } finally {
      setUploadingUserAvatar(false);
    }
  };

  // Helper: Format Tanggal Indonesia
  const formatIndoDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Helper: Cek apakah hari ini ulang tahun anggota (Hanya jika pengguna sudah mengisi tanggal lahir)
  const checkIsBirthdayToday = (tanggalLahirStr?: string): boolean => {
    if (!tanggalLahirStr || typeof tanggalLahirStr !== "string") return false;
    const trimmed = tanggalLahirStr.trim();
    if (!trimmed) return false;
    try {
      const today = new Date();
      // Format dari <input type="date"> adalah YYYY-MM-DD
      const parts = trimmed.split(/[-/.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const month = parseInt(parts[1], 10) - 1; // 0-indexed month
          const day = parseInt(parts[2], 10);
          return today.getDate() === day && today.getMonth() === month;
        } else {
          // DD-MM-YYYY
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          return today.getDate() === day && today.getMonth() === month;
        }
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return today.getDate() === d.getDate() && today.getMonth() === d.getMonth();
      }
      return false;
    } catch {
      return false;
    }
  };

  // Body scroll lock with iOS restoration and Escape key listener when modal is open
  useEffect(() => {
    if (showKtaModal || showShareModal) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setShowKtaModal(false);
          setShowShareModal(false);
          setEditingTtl(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        const top = document.body.style.top;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
        if (top) {
          window.scrollTo(0, parseInt(top || "0", 10) * -1);
        }
      };
    }
  }, [showKtaModal, showShareModal]);

  // Auto-save draft of KTA biodata in sessionStorage
  useEffect(() => {
    if (editingTtl && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "kta_biodata_draft",
          JSON.stringify({
            tempatLahir: inputTempatLahir,
            tanggalLahir: inputTanggalLahir,
            gender: inputGender,
            domisili: inputDomisili,
          })
        );
      } catch {}
    }
  }, [editingTtl, inputTempatLahir, inputTanggalLahir, inputGender, inputDomisili]);

  // Pre-fill / Restore Biodata when editing starts
  const handleToggleEditTtl = async () => {
    const nextState = !editingTtl;
    setEditingTtl(nextState);
    if (nextState) {
      if (typeof window !== "undefined") {
        try {
          const draft = sessionStorage.getItem("kta_biodata_draft");
          if (draft) {
            const p = JSON.parse(draft);
            if (p.tempatLahir && !inputTempatLahir) setInputTempatLahir(p.tempatLahir);
            if (p.tanggalLahir && !inputTanggalLahir) setInputTanggalLahir(p.tanggalLahir);
            if (p.gender && !inputGender) setInputGender(p.gender);
            if (p.domisili && !inputDomisili) setInputDomisili(p.domisili);
          }
        } catch {}
      }
      if (!inputTempatLahir && sessionUser?.tempatLahir) setInputTempatLahir(sessionUser.tempatLahir);
      if (!inputTanggalLahir && sessionUser?.tanggalLahir) setInputTanggalLahir(sessionUser.tanggalLahir);
      if (sessionUser?.gender) setInputGender(sessionUser.gender);
      if (!inputDomisili && sessionUser?.domisili) setInputDomisili(sessionUser.domisili);

      // If still missing sensitive data, fetch from secure private-fields endpoint
      if (!inputTempatLahir || !inputTanggalLahir) {
        try {
          const res = await fetch("/api/kta/private-fields", { method: "POST" });
          const json = await res.json();
          const d = json.data || json.fields;
          if (d) {
            if (d.tempatLahir && !inputTempatLahir) setInputTempatLahir(d.tempatLahir);
            if (d.tanggalLahir && !inputTanggalLahir) setInputTanggalLahir(d.tanggalLahir);
            if (d.domisili && !inputDomisili) setInputDomisili(d.domisili);
          }
        } catch {}
      }
    }
  };

  // Simpan Biodata KTA (Tempat Lahir, Tanggal Lahir, Gender, Domisili)
  const handleSaveTtl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTempatLahir.trim() || !inputTanggalLahir.trim()) return;
    setSavingTtl(true);
    setTtlSuccessMsg("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempatLahir: inputTempatLahir.trim(),
          tanggalLahir: inputTanggalLahir.trim(),
          gender: inputGender.trim(),
          domisili: inputDomisili.trim(),
        }),
      });
      const json = await res.json();
      if (json.status) {
        setSessionUser((prev: any) => ({
          ...prev,
          tempatLahir: inputTempatLahir.trim(),
          tanggalLahir: inputTanggalLahir.trim(),
          gender: inputGender.trim(),
          domisili: inputDomisili.trim(),
        }));
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("kta_biodata_draft");
        }
        setEditingTtl(false);
        setTtlSuccessMsg("Biodata KTA berhasil diperbarui!");
        setTimeout(() => setTtlSuccessMsg(""), 4000);
      } else {
        alert(json.message || "Gagal menyimpan data");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menyimpan data");
    } finally {
      setSavingTtl(false);
    }
  };

  // ── FITUR 1: HOLOGRAPHIC FOIL & 3D TILT HANDLERS ──
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof (window as any).DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      setIosSensorNeeded(true);
    }
  }, []);

  const handleRequestIosSensor = async () => {
    try {
      if (
        typeof window !== "undefined" &&
        typeof (DeviceOrientationEvent as any).requestPermission === "function"
      ) {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === "granted") {
          setIosSensorGranted(true);
          setIosSensorNeeded(false);
        }
      }
    } catch (e) {
      console.error("Device orientation permission error:", e);
    }
  };

  useEffect(() => {
    if (!showKtaModal) return;

    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) return;
    }

    let isRunning = true;

    const updateTilt = () => {
      if (!isRunning) return;
      // Lerp smoothing with 0.08 factor
      tiltCurrent.current.x += (tiltTarget.current.x - tiltCurrent.current.x) * 0.08;
      tiltCurrent.current.y += (tiltTarget.current.y - tiltCurrent.current.y) * 0.08;

      if (tiltCardRef.current) {
        tiltCardRef.current.style.setProperty("--rx", tiltCurrent.current.x.toFixed(2));
        tiltCardRef.current.style.setProperty("--ry", tiltCurrent.current.y.toFixed(2));
        const mx = 50 + (tiltCurrent.current.y / 8) * 35;
        const my = 50 - (tiltCurrent.current.x / 8) * 35;
        tiltCardRef.current.style.setProperty("--mx", `${mx.toFixed(1)}%`);
        tiltCardRef.current.style.setProperty("--my", `${my.toFixed(1)}%`);
        const angle = 135 + (tiltCurrent.current.y / 8) * 45;
        tiltCardRef.current.style.setProperty("--angle", `${angle.toFixed(1)}deg`);
      }

      tiltRafId.current = requestAnimationFrame(updateTilt);
    };

    tiltRafId.current = requestAnimationFrame(updateTilt);

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      const clampedGamma = Math.max(-30, Math.min(30, e.gamma));
      const clampedBeta = Math.max(-30, Math.min(30, e.beta - 45));
      tiltTarget.current = {
        x: -(clampedBeta / 30) * 8,
        y: (clampedGamma / 30) * 8,
      };
    };

    window.addEventListener("deviceorientation", handleOrientation);

    return () => {
      isRunning = false;
      if (tiltRafId.current) cancelAnimationFrame(tiltRafId.current);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [showKtaModal]);

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!tiltCardRef.current) return;
    const rect = tiltCardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ratioX = (e.clientX - cx) / (rect.width / 2);
    const ratioY = (e.clientY - cy) / (rect.height / 2);
    tiltTarget.current = {
      x: -Math.max(-1, Math.min(1, ratioY)) * 8,
      y: Math.max(-1, Math.min(1, ratioX)) * 8,
    };
  };

  const handleCardPointerLeave = () => {
    tiltTarget.current = { x: 0, y: 0 };
  };

  // ── FITUR 2: MODE PRIVAT HANDLERS ──
  const handleTogglePrivacyMode = async () => {
    const nextVal = !privacyMode;
    setPrivacyMode(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("kta_privacy_mode", String(nextVal));
    }
    setPrivacyToastMsg(nextVal ? "Mode privat diaktifkan" : "Mode privat dinonaktifkan");
    setTimeout(() => setPrivacyToastMsg(null), 3000);

    try {
      await fetch("/api/kta/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacyModeDefault: nextVal }),
      });
    } catch (e) {
      console.error("Save privacy preference error:", e);
    }
  };

  const handleRevealPrivateFields = async () => {
    if (revealingPrivate || revealedPrivateFields) return;
    setRevealingPrivate(true);
    try {
      const res = await fetch("/api/kta/private-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.status && data.fields) {
        setRevealedPrivateFields(data.fields);
        setRevealCountdown(15);

        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);

        revealIntervalRef.current = setInterval(() => {
          setRevealCountdown((c) => {
            if (c <= 1) {
              clearInterval(revealIntervalRef.current!);
              return 0;
            }
            return c - 1;
          });
        }, 1000);

        revealTimerRef.current = setTimeout(() => {
          setRevealedPrivateFields(null);
          if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
        }, 15000);
      }
    } catch (e) {
      console.error("Reveal private fields error:", e);
    } finally {
      setRevealingPrivate(false);
    }
  };

  // ── FITUR 3: KARTU PUBLIK & SHARE HANDLERS ──
  const handleTogglePublicCard = async () => {
    setTogglingPublic(true);
    try {
      const nextVal = !publicCardEnabled;
      const res = await fetch("/api/kta/public", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextVal }),
      });
      const data = await res.json();
      if (data.status) {
        setPublicCardEnabled(data.publicCardEnabled);
        if (data.publicCode) setPublicCode(data.publicCode);
      }
    } catch (e) {
      console.error("Toggle public card error:", e);
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleRegeneratePublicCode = async () => {
    if (!confirm("Kode tautan lama tidak akan berfungsi lagi. Buat kode tautan baru?")) return;
    setRegeneratingCode(true);
    try {
      const res = await fetch("/api/kta/public", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate: true }),
      });
      const data = await res.json();
      if (data.status && data.publicCode) {
        setPublicCode(data.publicCode);
      }
    } catch (e) {
      console.error("Regenerate code error:", e);
    } finally {
      setRegeneratingCode(false);
    }
  };

  const handleExportPng = async () => {
    if (!exportCardRef.current || exportingPng) return;
    setExportingPng(true);
    try {
      if (document.fonts) await document.fonts.ready;
      const dataUrl = await htmlToImage.toPng(exportCardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `KTA-Cavallery-${sessionUser?.noAnggota || "KTA"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Export PNG error:", e);
      alert("Gagal mengunduh gambar. Silakan coba lagi.");
    } finally {
      setExportingPng(false);
    }
  };

  const handleWebShare = async () => {
    if (sharingWeb) return;
    setSharingWeb(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = publicCode ? `${origin}/v/${publicCode}` : "";

    try {
      if (!exportCardRef.current) return;
      if (document.fonts) await document.fonts.ready;
      const blob = await htmlToImage.toBlob(exportCardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      if (
        blob &&
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [new File([blob], "kta.png", { type: "image/png" })] })
      ) {
        const file = new File(
          [blob],
          `KTA-Cavallery-${sessionUser?.noAnggota || "KTA"}.png`,
          { type: "image/png" }
        );
        await navigator.share({
          title: "KTA Fanbase Cavallery",
          text: `KTA Resmi Cavallery Erine JKT48 • ${sessionUser?.namaLengkap || displayName}`,
          files: [file],
          url: publicUrl || undefined,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: "KTA Fanbase Cavallery",
          text: `KTA Resmi Cavallery Erine JKT48 • ${sessionUser?.namaLengkap || displayName}`,
          url: publicUrl || origin,
        });
      } else {
        await handleExportPng();
        if (publicUrl) {
          navigator.clipboard.writeText(publicUrl);
          alert("Gambar KTA diunduh & tautan publik berhasil disalin ke clipboard!");
        }
      }
    } catch (e) {
      console.error("Web share error:", e);
    } finally {
      setSharingWeb(false);
    }
  };

  // Melody Lagu Ulang Tahun (Web Audio API - Ceria & Lembut)
  const playBirthdayMelody = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      setIsPlayingBirthdayVideo(true);

      const notes = [
        { f: 261.63, d: 0.35 }, { f: 261.63, d: 0.35 }, { f: 293.66, d: 0.7 }, { f: 261.63, d: 0.7 }, { f: 349.23, d: 0.7 }, { f: 329.63, d: 1.2 },
        { f: 261.63, d: 0.35 }, { f: 261.63, d: 0.35 }, { f: 293.66, d: 0.7 }, { f: 261.63, d: 0.7 }, { f: 392.00, d: 0.7 }, { f: 349.23, d: 1.2 },
        { f: 261.63, d: 0.35 }, { f: 261.63, d: 0.35 }, { f: 523.25, d: 0.7 }, { f: 440.00, d: 0.7 }, { f: 349.23, d: 0.7 }, { f: 329.63, d: 0.7 }, { f: 293.66, d: 0.9 },
        { f: 466.16, d: 0.35 }, { f: 466.16, d: 0.35 }, { f: 440.00, d: 0.7 }, { f: 349.23, d: 0.7 }, { f: 392.00, d: 0.7 }, { f: 349.23, d: 1.4 },
      ];

      let t = ctx.currentTime + 0.1;
      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(note.f, t);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.d - 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + note.d);
        t += note.d;
      });

      setTimeout(() => {
        setIsPlayingBirthdayVideo(false);
      }, (t - ctx.currentTime) * 1000);
    } catch (e) {
      console.error(e);
      setIsPlayingBirthdayVideo(false);
    }
  };

  // Dynamic Master Data State
  const [donationTypes, setDonationTypes] = useState<string[]>(DONATION_TYPES);
  const [chipNominalsDonasi, setChipNominalsDonasi] = useState<number[]>([
    10000, 25000, 50000, 100000, 250000, 500000,
  ]);
  const [platformOptions, setPlatformOptions] = useState<string[]>([
    "LINE",
    "X (Twitter)",
    "Instagram",
    "TikTok",
    "Discord",
    "WhatsApp",
  ]);

  // Derived: parsed kas nominal for display hints
  const cleanNominalKas =
    parseInt((nominalKas || "").replace(/\D/g, ""), 10) || 0;

  // Check registration open/close & auth on mount
  const checkSettings = async () => {
    try {
      const res = await fetch("/api/pengaturan");
      const json = await res.json();
      if (json.status && json.data) {
        setRegAnggotaOpen(json.data.registerAnggotaOpen);
        setRegDonaturOpen(json.data.registerDonaturOpen);
      }
    } catch {}

    try {
      const resMd = await fetch("/api/master-data");
      const jsonMd = await resMd.json();
      if (jsonMd.status && jsonMd.data) {
        if (jsonMd.data.tipeDonasi?.length) {
          setDonationTypes(jsonMd.data.tipeDonasi);
          setTipeDonasi(jsonMd.data.tipeDonasi[0]);
        }
        if (jsonMd.data.nominalDonasi?.length)
          setChipNominalsDonasi(jsonMd.data.nominalDonasi);
        if (jsonMd.data.platforms?.length)
          setPlatformOptions(jsonMd.data.platforms);
      }
    } catch {}
  };

  const checkUserSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = await res.json();
        if (json.status && json.user) {
          setSessionUser(json.user);
          if (json.user.riwayatKas) {
            setKasHistory(json.user.riwayatKas);
          }
          if (json.user.publicCode) {
            setPublicCode(json.user.publicCode);
          }
          setPublicCardEnabled(Boolean(json.user.publicCardEnabled));
          const cachedPrivacy = typeof window !== "undefined" ? localStorage.getItem("kta_privacy_mode") : null;
          if (cachedPrivacy !== null) {
            setPrivacyMode(cachedPrivacy === "true");
          } else if (json.user.privacyModeDefault !== undefined) {
            setPrivacyMode(Boolean(json.user.privacyModeDefault));
          }
        } else {
          setSessionUser(null);
        }
      } else {
        setSessionUser(null);
      }
    } catch {
      setSessionUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkUserSession();
    checkSettings();
    // Bersihkan autofill browser jika tersimpan kredensial admin
    const timer = setTimeout(() => {
      setLoginNoAnggota((prev) => (prev.toUpperCase() === "VALLENCIA" || prev.toLowerCase() === "admin" ? "" : prev));
      setLoginIdLine((prev) => (prev === "kurn!@wan" ? "" : prev));
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setLoginNoAnggota("");
    setLoginIdLine("");
    setLoginNamaDonatur("");
    setLoginKontakDonatur("");
  }, [authMode, tipe]);

  const loadKasHistory = async () => {
    setLoadingKasHistory(true);
    try {
      const res = await fetch("/api/kas");
      const json = await res.json();
      if (json.status) {
        if (json.data) setKasHistory(json.data);
        if (json.anggotaSejak) setMemberJoinDate(json.anggotaSejak);
        if (json.monthlyStatus) {
          setMonthlyStatus(json.monthlyStatus);
          // Auto-set periode ke bulan pertama yang belum lunas (dan bukan not_joined) agar tidak terlongkap
          const currentYear = new Date().getFullYear();
          const settledMonths = new Set(
            (json.monthlyStatus as any[])
              .filter((s: any) => Number(s.tahun) === currentYear && (s.status === "diverifikasi" || s.status === "not_joined"))
              .map((s: any) => Number(s.bulan))
          );
          for (let m = 1; m <= 12; m++) {
            if (!settledMonths.has(m)) {
              setPeriodeBulan(m);
              setPeriodeTahun(currentYear);
              break;
            }
          }
        }
      }
    } catch {
      console.error("Failed to load kas history");
    } finally {
      setLoadingKasHistory(false);
    }
  };

  const fetchUserKupons = useCallback(async () => {
    setLoadingUserKupons(true);
    try {
      const res = await fetch("/api/kas/kupon");
      const json = await res.json();
      if (json.status) {
        setUserKupons(json.data || []);
        setUserLunasTahunIni(json.totalLunasTahunIni || 0);
      }
    } catch {
      console.error("Failed to load user kupons");
    } finally {
      setLoadingUserKupons(false);
    }
  }, []);

  // State Riwayat Donasi User & Leaderboard Donatur
  const [donasiHistory, setDonasiHistory] = useState<any[]>([]);
  const [loadingDonasiHistory, setLoadingDonasiHistory] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  const fetchDonasiHistory = useCallback(async () => {
    setLoadingDonasiHistory(true);
    try {
      const res = await fetch("/api/donasi");
      const json = await res.json();
      if (json.status && json.data) {
        setDonasiHistory(json.data);
      }
    } catch {
      console.error("Failed to load user donasi history");
    } finally {
      setLoadingDonasiHistory(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch("/api/donasi?type=leaderboard");
      const json = await res.json();
      if (json.status && json.data) {
        setLeaderboard(json.data);
      }
    } catch {
      console.error("Failed to load leaderboard");
    } finally {
      setLoadingLeaderboard(false);
    }
  }, []);

  const fetchWarEvent = useCallback(async () => {
    setLoadingWar(true);
    try {
      const res = await fetch(`/api/war-tiket?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
      const json = await res.json();
      if (json.status && json.data?.event) {
        setWarEvent(json.data.event);
        setUserWarTicket(json.data.userTicket);
      }
    } catch {
      console.error("Failed to load war event");
    } finally {
      setLoadingWar(false);
    }
  }, []);

  // Timer countdown war tiket sinkron waktu server (hanya aktif saat tab war dibuka & belum punya tiket)
  useEffect(() => {
    if (!warEvent || portalTab !== "war" || userWarTicket) return;

    const parseMs = (val: any) => {
      if (!val) return 0;
      if (typeof val === "number") return val;
      const str = String(val).trim();
      let iso = str.includes(" ") ? str.replace(" ", "T") : str;
      if (!iso.includes("+") && !iso.includes("Z")) {
        iso = iso.length === 16 ? `${iso}:00+07:00` : `${iso}+07:00`;
      }
      const t = new Date(iso).getTime();
      return isNaN(t) ? 0 : t;
    };

    const updateTimer = () => {
      const now = Date.now();
      const openTime = warEvent.waktu_buka_ms || parseMs(warEvent.waktu_buka);
      const closeTime = warEvent.waktu_tutup_ms || parseMs(warEvent.waktu_tutup);

      const hasStarted =
        warEvent.status === "buka" &&
        (openTime <= 0 || now >= openTime || warEvent.is_war_active || warEvent.is_started);
      const hasEnded =
        warEvent.status === "tutup" ||
        (closeTime > 0 && now > closeTime) ||
        warEvent.is_ended;

      if (!hasStarted) {
        // Belum mulai (Hitung mundur menuju buka)
        const diff = Math.max(0, openTime - now);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setWarTimeLeft((prev) => {
          if (
            prev.seconds === seconds &&
            prev.minutes === minutes &&
            prev.hours === hours &&
            prev.days === days &&
            !prev.isStarted &&
            !prev.isEnded
          ) {
            return prev;
          }
          return { days, hours, minutes, seconds, isStarted: false, isEnded: false };
        });
      } else if (!hasEnded) {
        // Sedang berlangsung!
        const diff = closeTime > 0 ? Math.max(0, closeTime - now) : 0;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setWarTimeLeft((prev) => {
          if (
            prev.seconds === seconds &&
            prev.minutes === minutes &&
            prev.hours === hours &&
            prev.days === days &&
            prev.isStarted &&
            !prev.isEnded
          ) {
            return prev;
          }
          return { days, hours, minutes, seconds, isStarted: true, isEnded: false };
        });
      } else {
        // Selesai
        setWarTimeLeft((prev) => {
          if (prev.isStarted && prev.isEnded) return prev;
          return { days: 0, hours: 0, minutes: 0, seconds: 0, isStarted: true, isEnded: true };
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [warEvent, portalTab, userWarTicket]);

  const handleClaimWarTicket = async () => {
    if (!warEvent || claimingWar) return;
    setClaimingWar(true);
    setWarAlert(null);

    try {
      const res = await fetch("/api/war-tiket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: warEvent.id }),
      });
      const json = await res.json();

      if (!res.ok || !json.status) {
        setWarAlert({ type: "error", msg: json.message || "Gagal mengklaim tiket war." });
        if (json.ticket) {
          setUserWarTicket(json.ticket);
        }
      } else {
        setWarAlert({ type: "success", msg: json.message || "Selamat! Kamu berhasil mendapatkan tiket!" });
        setUserWarTicket(json.data);
      }
      fetchWarEvent();
    } catch (err: any) {
      setWarAlert({ type: "error", msg: err?.message || "Terjadi kesalahan saat memproses klaim tiket." });
    } finally {
      setClaimingWar(false);
    }
  };

  const handleDownloadETicket = () => {
    if (!userWarTicket) return;
    setDownloadingTicket(true);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = 860;
      const h = 1320;
      canvas.width = w;
      canvas.height = h;

      // 1. Dark Luxury Obsidian Background
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, "#1c1814");
      bg.addColorStop(0.5, "#13100e");
      bg.addColorStop(1, "#0a0807");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 2. Subtle warm glow in center
      const radialGlow = ctx.createRadialGradient(w / 2, 420, 40, w / 2, 420, 460);
      radialGlow.addColorStop(0, "rgba(229, 120, 48, 0.12)");
      radialGlow.addColorStop(1, "transparent");
      ctx.fillStyle = radialGlow;
      ctx.fillRect(0, 0, w, h);

      // 3. Elegant Double Golden Border
      ctx.strokeStyle = "#e57830";
      ctx.lineWidth = 4;
      ctx.strokeRect(36, 36, w - 72, h - 72);

      ctx.strokeStyle = "rgba(229, 120, 48, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(46, 46, w - 92, h - 92);

      // Corner Accents (Decorative Golden Brackets)
      const drawCorner = (x: number, y: number, dx: number, dy: number) => {
        ctx.fillStyle = "#e57830";
        ctx.fillRect(x, y, dx * 26, dy * 4);
        ctx.fillRect(x, y, dx * 4, dy * 26);
      };
      drawCorner(54, 54, 1, 1);
      drawCorner(w - 54, 54, -1, 1);
      drawCorner(54, h - 54, 1, -1);
      drawCorner(w - 54, h - 54, -1, -1);

      // 4. Header Top Badge
      ctx.textAlign = "center";
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#e98d50";
      ctx.fillText(
        (warEvent?.kategori_tiket || "OFFICIAL VIP EVENT PASS").replace(/★/g, "").replace(/🔥/g, "").trim(),
        w / 2,
        95
      );

      // Brand Title
      ctx.font = "bold 26px serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("CAVALLERY FANBASE", w / 2, 134);

      // Project Title
      ctx.font = "bold 22px serif";
      ctx.fillStyle = "#e57830";
      ctx.fillText(
        (warEvent?.judul || "PROJECT STS ERINE 20TH BIRTHDAY")
          .replace(/19th/gi, "20th")
          .replace(/ke-19/gi, "ke-20")
          .toUpperCase(),
        w / 2,
        170
      );

      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText(warEvent?.subjudul || "Team Passion • Exclusive Limited Entry Pass", w / 2, 200);

      // Thin separator
      ctx.strokeStyle = "rgba(229, 120, 48, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(90, 224);
      ctx.lineTo(w - 90, 224);
      ctx.stroke();

      // 5. Ticket Number Badge Box
      const badgeW = 360;
      const badgeH = 76;
      const badgeX = (w - badgeW) / 2;
      const badgeY = 248;
      const bGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY + badgeH);
      bGrad.addColorStop(0, "#e47327");
      bGrad.addColorStop(1, "#92400e");

      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20);
      ctx.fill();
      ctx.strokeStyle = "#feb88a";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ticket Number Text
      ctx.font = "900 44px serif";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 8;
      ctx.fillText(`#${userWarTicket.nomor_tiket}`, w / 2, badgeY + 54);
      ctx.shadowBlur = 0;

      // 6. Member Information Card
      const cardY = 352;
      const cardW = w - 160;
      const cardX = 80;
      const cardH = 340;
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 18);
      ctx.fill();
      ctx.strokeStyle = "rgba(229, 120, 48, 0.22)";
      ctx.stroke();

      // Member Name Label & Value
      ctx.textAlign = "center";
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#a1a1aa";
      ctx.fillText("NAMA PEMEGANG TIKET", w / 2, cardY + 44);

      ctx.font = "bold 30px serif";
      ctx.fillStyle = "#ffffff";
      const name = userWarTicket.nama_lengkap || displayName || "Anggota Cavallery";
      ctx.fillText(name.toUpperCase(), w / 2, cardY + 84);

      // No Anggota
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "#e57830";
      const noAngg = userWarTicket.no_anggota || sessionUser?.noAnggota || "-";
      ctx.fillText(`NO. ANGGOTA: ${noAngg}`, w / 2, cardY + 120);

      // Access Level
      ctx.font = "bold 15px sans-serif";
      ctx.fillStyle = "#fb7a24";
      const accessLvl = warEvent?.kategori_tiket || "FULL ENTRY VIP PASS";
      ctx.fillText(`AKSES: ${accessLvl.toUpperCase()}`, w / 2, cardY + 160);

      // Verified Status Chip
      ctx.fillStyle = "rgba(185, 84, 16, 0.15)";
      ctx.strokeStyle = "#b95410";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 125, cardY + 186, 250, 36, 18);
      ctx.fill();
      ctx.stroke();
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#e47023";
      ctx.fillText("✓ TERVERIFIKASI RESMI", w / 2, cardY + 209);

      // Venue & Date Info
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = "#e57830";
      const venueStr = `${warEvent?.lokasi_event || "Theater JKT48"} • ${warEvent?.tanggal_event || "September 2026"}`;
      ctx.fillText(venueStr, w / 2, cardY + 248);

      // Waktu Klaim
      ctx.font = "12px sans-serif";
      ctx.fillStyle = "#71717a";
      const claimDate = new Date(userWarTicket.waktu_klaim);
      const claimStr = `${claimDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} • ${claimDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB`;
      ctx.fillText(`Waktu Registrasi Klaim: ${claimStr}`, w / 2, cardY + 276);

      // Unique Security Code
      const secPrefix = warEvent?.kode_tiket || "STS";
      const secCode = `SEC-${String(userWarTicket.id || 1).padStart(4, "0")}-${(userWarTicket.nomor_tiket || secPrefix).replace(/[^a-zA-Z0-9]/g, "")}`;
      ctx.font = "12px monospace";
      ctx.fillStyle = "#52525b";
      ctx.fillText(`KODE KEAMANAN: ${secCode}`, w / 2, cardY + 304);

      // 7. Perforated Tear Line (Garis Potong Tiket)
      const tearY = 730;
      ctx.setLineDash([12, 8]);
      ctx.strokeStyle = "rgba(229, 120, 48, 0.5)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(70, tearY);
      ctx.lineTo(w - 70, tearY);
      ctx.stroke();
      ctx.setLineDash([]); // reset dash

      // Notches (Lingkaran Potongan Tiket Kiri & Kanan)
      ctx.fillStyle = "#0a0807";
      ctx.beginPath();
      ctx.arc(36, tearY, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e57830";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(36, tearY, 26, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(w - 36, tearY, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(w - 36, tearY, 26, Math.PI / 2, (3 * Math.PI) / 2);
      ctx.stroke();

      // 8. Stub & QR Verification Section
      const qrSize = 180;
      const qrX = (w - qrSize) / 2;
      const qrY = 774;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrSize, qrSize, 18);
      ctx.fill();
      ctx.strokeStyle = "rgba(229, 120, 48, 0.6)";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Procedural Crisp QR Pattern
      const pCount = 15;
      const cellSize = (qrSize - 30) / pCount;
      ctx.fillStyle = "#18181b";
      const drawFinder = (fx: number, fy: number) => {
        ctx.fillRect(fx, fy, cellSize * 4, cellSize * 4);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(fx + cellSize, fy + cellSize, cellSize * 2, cellSize * 2);
        ctx.fillStyle = "#18181b";
        ctx.fillRect(fx + cellSize * 1.5, fy + cellSize * 1.5, cellSize, cellSize);
      };
      drawFinder(qrX + 15, qrY + 15);
      drawFinder(qrX + qrSize - 15 - cellSize * 4, qrY + 15);
      drawFinder(qrX + 15, qrY + qrSize - 15 - cellSize * 4);

      const seed = userWarTicket.nomor_tiket.split("").reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
      for (let r = 0; r < pCount; r++) {
        for (let c = 0; c < pCount; c++) {
          if ((r < 5 && c < 5) || (r < 5 && c > pCount - 6) || (r > pCount - 6 && c < 5)) continue;
          if (((r * c + seed * (r + 1)) % 3) === 0) {
            ctx.fillRect(qrX + 15 + c * cellSize, qrY + 15 + r * cellSize, cellSize - 1, cellSize - 1);
          }
        }
      }

      // 9. Simulated Barcode Lines
      const barY = 988;
      const barW = 380;
      const barX = (w - barW) / 2;
      ctx.fillStyle = "#ffffff";
      const bars = [3, 1, 4, 2, 1, 5, 2, 3, 1, 4, 2, 1, 3, 5, 1, 2, 4, 1, 3, 2, 5, 1, 2, 4, 3, 1, 2, 4, 2, 3, 1, 5, 2, 1, 4];
      let curX = barX;
      bars.forEach((bWidth, idx) => {
        if (idx % 2 === 0) {
          ctx.fillRect(curX, barY, bWidth * 2.2, 40);
        }
        curX += bWidth * 2.8;
      });

      ctx.font = "bold 14px monospace";
      ctx.fillStyle = "#a1a1aa";
      ctx.textAlign = "center";
      const codePfx = warEvent?.kode_tiket || "STS20";
      ctx.fillText(`*${codePfx}-${userWarTicket.nomor_tiket}-${noAngg}*`, w / 2, barY + 62);

      // 10. Important Event Notice Box
      const noticeY = 1080;
      const noticeW = w - 160;
      const noticeX = 80;
      const noticeH = 120;
      ctx.fillStyle = "rgba(229, 120, 48, 0.08)";
      ctx.beginPath();
      ctx.roundRect(noticeX, noticeY, noticeW, noticeH, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(229, 120, 48, 0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#feb88a";
      ctx.fillText("PETUNJUK KEDATANGAN DI VENUE ACARA:", w / 2, noticeY + 38);

      ctx.font = "13px sans-serif";
      ctx.fillStyle = "#d4d4d8";
      ctx.fillText("Simpan gambar ini di galeri ponsel Anda. Pada hari acara, cukup tunjukkan", w / 2, noticeY + 66);
      ctx.fillText("tiket digital ini kepada panitia Cavallery untuk penukaran wristband masuk.", w / 2, noticeY + 88);

      // 11. Trigger Download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `E-Ticket-${codePfx}-Cavallery-${userWarTicket.nomor_tiket}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setWarAlert({
        type: "success",
        msg: "E-Ticket berhasil diunduh ke ponsel/perangkat Anda! Cukup tunjukkan gambar ini kepada panitia di hari acara.",
      });
    } catch (err: any) {
      console.error("Download ticket error:", err);
      alert("Gagal mengunduh tiket: " + err.message);
    } finally {
      setDownloadingTicket(false);
    }
  };

  useEffect(() => {
    if (sessionUser && (portalTab === "kupon" || portalTab === "bayar")) {
      fetchUserKupons();
    }
  }, [portalTab, sessionUser, fetchUserKupons]);

  useEffect(() => {
    fetchWarEvent();
  }, [fetchWarEvent]);

  useEffect(() => {
    if (portalTab === "war") {
      fetchWarEvent();
    }
  }, [portalTab, sessionUser, fetchWarEvent]);

  useEffect(() => {
    if (sessionUser) {
      loadKasHistory();
    }
  }, [portalTab, sessionUser]);

  useEffect(() => {
    if (sessionUser) {
      fetch(`/api/internal/kas-matrix?tahun=${new Date().getFullYear()}`)
        .then((res) => res.json())
        .then((json) => {
          if (json && json.status) {
            setCommunityKasStats({
              totalPemasukan: json.allTimePemasukan ?? json.grandTotalPemasukan ?? 0,
              totalPengeluaran: json.allTimePengeluaran ?? json.totalPengeluaran ?? 0,
              saldoBersih: json.allTimeSaldo ?? json.saldoKasBersih ?? 0,
              loading: false,
            });
          } else {
            setCommunityKasStats((prev) => ({ ...prev, loading: false }));
          }
        })
        .catch(() => setCommunityKasStats((prev) => ({ ...prev, loading: false })));
    }
  }, [sessionUser]);

  useEffect(() => {
    if (sessionUser?.tempatLahir) setInputTempatLahir(sessionUser.tempatLahir);
    if (sessionUser?.tanggalLahir) setInputTanggalLahir(sessionUser.tanggalLahir);
    if (sessionUser?.gender) setInputGender(sessionUser.gender);
    if (sessionUser?.domisili) setInputDomisili(sessionUser.domisili);
  }, [sessionUser]);

  useEffect(() => {
    if (sessionUser?.tanggalLahir && sessionUser.tanggalLahir.trim() && !birthdayAutoOpened) {
      if (checkIsBirthdayToday(sessionUser.tanggalLahir)) {
        setShowBirthdayModal(true);
        setBirthdayAutoOpened(true);
      }
    }
  }, [sessionUser, birthdayAutoOpened]);

  useEffect(() => {
    if (sessionUser && portalTab === "donasi") {
      fetchDonasiHistory();
      fetchLeaderboard();
    }
  }, [portalTab, sessionUser, fetchDonasiHistory, fetchLeaderboard]);

  // Auth: Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      let payload: any = { tipe };
      if (tipe === "anggota") {
        if (!loginNoAnggota.trim() || !loginIdLine.trim()) {
          setAuthError("Nomor Anggota dan ID LINE atau PIN wajib diisi");
          setAuthLoading(false);
          return;
        }
        payload = {
          ...payload,
          noAnggota: loginNoAnggota.trim(),
          idLine: loginIdLine.trim(),
        };
      } else {
        if (!loginNamaDonatur.trim() || !loginKontakDonatur.trim()) {
          setAuthError("Nama dan ID / Nomor Kontak wajib diisi");
          setAuthLoading(false);
          return;
        }
        payload = {
          ...payload,
          nama: loginNamaDonatur.trim(),
          kontakId: loginKontakDonatur.trim(),
        };
      }

      const res = await fetch("/api/auth/masuk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.status) {
        setAuthError(json.message || "Gagal masuk. Periksa kembali data Anda.");
      } else {
        await checkUserSession();
        // Tawaran PIN: jika anggota login dan belum memiliki PIN
        if (json.user && json.user.type === "anggota" && !json.user.hasPin) {
          setShowPinPromptModal(true);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Handle Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setRegSuccess(null);
    setAuthLoading(true);

    try {
      let payload: any = { tipe };

      if (tipe === "anggota") {
        if (
          !regNoAnggota.trim() ||
          !regNamaLengkap.trim() ||
          !regIdLine.trim() ||
          !regDomisili.trim() ||
          !regKontakId.trim()
        ) {
          setAuthError(
            "Mohon lengkapi seluruh field bertanda WAJIB (termasuk Nomor Anggota)",
          );
          setAuthLoading(false);
          return;
        }
        if (regPin.trim() && !/^\d{4,6}$/.test(regPin.trim())) {
          setAuthError("PIN harus berupa 4 hingga 6 digit angka numerik");
          setAuthLoading(false);
          return;
        }
        payload = {
          ...payload,
          noAnggota: regNoAnggota.trim().toUpperCase(),
          namaLengkap: regNamaLengkap,
          idLine: regIdLine,
          pin: regPin.trim() || undefined,
          displayLine: regDisplayLine,
          discord: regDiscord,
          gender: regGender,
          domisili: regDomisili,
          kontakPlatform: regKontakPlatform,
          kontakId: regKontakId,
        };
      } else {
        if (!regNamaDonatur.trim() || !regKontakIdDonatur.trim()) {
          setAuthError("Mohon lengkapi Nama dan Kontak bertanda WAJIB");
          setAuthLoading(false);
          return;
        }
        payload = {
          ...payload,
          nama: regNamaDonatur,
          kontakPlatform: regKontakPlatformDonatur,
          kontakId: regKontakIdDonatur,
          discord: regDiscordDonatur,
        };
      }

      const res = await fetch("/api/auth/daftar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.status) {
        setAuthError(json.message || "Gagal melakukan pendaftaran.");
      } else {
        setRegSuccess(json.message);
      }
    } catch (err: any) {
      setAuthError(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Handle Simpan PIN dari Prompt / Tawaran
  const handleSavePinPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromptPinError("");
    setPromptPinSuccess("");

    const clean = promptPinInput.trim();
    if (!clean || !/^\d{4,6}$/.test(clean)) {
      setPromptPinError("PIN harus berupa 4 hingga 6 digit angka.");
      return;
    }

    setPromptPinLoading(true);
    try {
      const res = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: clean }),
      });
      const json = await res.json();
      if (!res.ok || !json.status) {
        setPromptPinError(json.message || "Gagal menyimpan PIN.");
      } else {
        setPromptPinSuccess("PIN login berhasil disimpan!");
        setSessionUser((prev: any) =>
          prev ? { ...prev, hasPin: true, pin: clean } : null
        );
        if (typeof window !== "undefined") {
          sessionStorage.setItem("cava_pin_prompt_dismissed", "true");
        }
        setTimeout(() => {
          setShowPinPromptModal(false);
          setPromptPinSuccess("");
          setPromptPinInput("");
        }, 1500);
      }
    } catch (err: any) {
      setPromptPinError(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setPromptPinLoading(false);
    }
  };

  const handleDismissPinPrompt = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("cava_pin_prompt_dismissed", "true");
    }
    setShowPinPromptModal(false);
  };

  // Auth: Handle Logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/keluar", { method: "POST" });
      setSessionUser(null);
      setAuthMode("masuk");
    } catch {
      setSessionUser(null);
    }
  };

  // Voucher Kas: Handle Apply / Check Voucher
  const handleApplyVoucher = async (codeToUse?: string) => {
    const targetCode = (codeToUse || voucherInput).trim();
    if (!targetCode) {
      setVoucherMsg({ type: "error", msg: "Masukkan kode voucher terlebih dahulu." });
      return;
    }
    setVoucherLoading(true);
    setVoucherMsg(null);
    try {
      const res = await fetch("/api/kas/kupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: targetCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.status) {
        setVoucherMsg({ type: "error", msg: json.message || "Kode voucher tidak valid." });
        setAppliedVoucher(null);
      } else {
        setAppliedVoucher(json.data);
        setVoucherInput(json.data.kodeKupon);
        setVoucherMsg({ type: "success", msg: json.message });
        if (json.data.bulanGratis && json.data.bulanGratis > 0) {
          const matchingChip = KAS_12_BULAN.find((k) => k.bulan === json.data.bulanGratis);
          if (matchingChip && cleanNominalKas < matchingChip.nominal) {
            setSelectedChipKas(matchingChip.nominal);
            setNominalKas(matchingChip.nominal.toLocaleString("id-ID"));
          }
        }
      }
    } catch (err: any) {
      setVoucherMsg({ type: "error", msg: err?.message || "Gagal memverifikasi voucher." });
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput("");
    setVoucherMsg(null);
  };

  const handleUseCouponFromTab = (k: any) => {
    const code = k.kode_kupon || k.base_kode_kupon;
    setPortalTab("bayar");
    handleApplyVoucher(code);
  };

  // Kas: Handle Submit
  const handleKasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKasAlert(null);

    const cleanNominal = parseInt(nominalKas.replace(/\D/g, ""), 10);
    if (!cleanNominal || cleanNominal <= 0) {
      setKasAlert({ type: "error", msg: "Nominal pembayaran tidak valid." });
      return;
    }

    const discount = appliedVoucher ? appliedVoucher.nominalPotongan : 0;
    const finalAmountToPay = Math.max(0, cleanNominal - discount);
    const isFullyCovered = appliedVoucher !== null && finalAmountToPay === 0;

    // Jika belum lunas dengan voucher (masih ada sisa transfer), wajib upload bukti
    if (!isFullyCovered && !fileKas) {
      setKasAlert({
        type: "error",
        msg: "Mohon unggah screenshot bukti transfer/QRIS untuk sisa pembayaran.",
      });
      return;
    }

    setSubmittingKas(true);

    try {
      let buktiBayarUrl = isFullyCovered ? "VOUCHER_LUNAS" : "";

      // 1. Upload Bukti jika ada file yang diunggah
      if (fileKas) {
        const formData = new FormData();
        formData.append("file", fileKas);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        let uploadJson: any = {};
        const upType = uploadRes.headers.get("content-type") || "";
        if (upType.includes("application/json")) {
          uploadJson = await uploadRes.json();
        } else {
          throw new Error("Server penyimpanan sedang sibuk. Silakan coba unggah kembali.");
        }
        if (!uploadRes.ok || !uploadJson.status) {
          throw new Error(uploadJson.message || "Gagal mengunggah bukti bayar");
        }
        buktiBayarUrl = uploadJson.url;
      }

      // Hitung jumlah bulan yang dibayar
      const jumlahBulan = Math.max(1, Math.round(cleanNominal / 15000));
      const finalPeriode = `${jumlahBulan} Bulan (${MONTH_NAMES[periodeBulan - 1]} ${periodeTahun})`;

      // 2. Submit Kas
      const kasRes = await fetch("/api/kas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periode: finalPeriode,
          nominal: finalAmountToPay,
          nominalTotal: cleanNominal,
          diskonVoucher: discount,
          kodeVoucher: appliedVoucher ? appliedVoucher.kodeKupon : undefined,
          buktiBayarUrl: buktiBayarUrl || "VOUCHER_LUNAS",
        }),
      });

      let kasJson: any = {};
      const kasType = kasRes.headers.get("content-type") || "";
      if (kasType.includes("application/json")) {
        kasJson = await kasRes.json();
      } else {
        throw new Error("Server sedang sibuk memproses antrean. Mohon coba beberapa detik lagi.");
      }
      if (!kasRes.ok || !kasJson.status) {
        throw new Error(kasJson.message || "Gagal mengirim konfirmasi kas");
      }

      setKasSuccessData({
        periode: finalPeriode,
        nominal: finalAmountToPay,
        message: isFullyCovered
          ? "Selamat! Konfirmasi bebas kas dengan voucher berhasil dikirim dan menunggu verifikasi admin."
          : "Konfirmasi pembayaran kas berhasil dikirim! Menunggu verifikasi admin.",
      });

      setKasAlert(null);

      setFileKas(null);
      setPreviewKas(null);
      setAppliedVoucher(null);
      setVoucherInput("");
      setVoucherMsg(null);
      loadKasHistory();
      fetchUserKupons();
    } catch (err: any) {
      setKasAlert({
        type: "error",
        msg: err.message || "Terjadi kesalahan saat memproses kas.",
      });
    } finally {
      setSubmittingKas(false);
    }
  };

  // Donasi: Handle Submit
  const handleDonasiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDonasiAlert(null);

    const cleanNominal = parseInt(nominalDonasi.replace(/\D/g, ""), 10);
    if (!cleanNominal || cleanNominal <= 0) {
      setDonasiAlert({ type: "error", msg: "Nominal donasi tidak valid." });
      return;
    }

    if (!fileDonasi) {
      setDonasiAlert({
        type: "error",
        msg: "Mohon unggah screenshot bukti transfer/QRIS.",
      });
      return;
    }

    setSubmittingDonasi(true);

    try {
      const formData = new FormData();
      formData.append("file", fileDonasi);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      let uploadJson: any = {};
      const upType = uploadRes.headers.get("content-type") || "";
      if (upType.includes("application/json")) {
        uploadJson = await uploadRes.json();
      } else {
        throw new Error("Server penyimpanan sedang sibuk. Silakan coba unggah kembali.");
      }
      if (!uploadRes.ok || !uploadJson.status) {
        throw new Error(uploadJson.message || "Gagal mengunggah bukti donasi");
      }

      const buktiBayarUrl = uploadJson.url;

      const donasiRes = await fetch("/api/donasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipeDonasi,
          nominal: cleanNominal,
          buktiBayarUrl,
        }),
      });

      let donasiJson: any = {};
      const donType = donasiRes.headers.get("content-type") || "";
      if (donType.includes("application/json")) {
        donasiJson = await donasiRes.json();
      } else {
        throw new Error("Server sedang memproses. Silakan cek riwayat donasi Anda.");
      }
      if (!donasiRes.ok || !donasiJson.status) {
        throw new Error(
          donasiJson.message || "Gagal mengirim konfirmasi donasi",
        );
      }

      setDonasiAlert({
        type: "success",
        msg: "Konfirmasi donasi berhasil dikirim! Terima kasih atas dukungan Anda untuk Erine.",
      });

      setFileDonasi(null);
      setPreviewDonasi(null);
      fetchDonasiHistory();
      fetchLeaderboard();
    } catch (err: any) {
      setDonasiAlert({
        type: "error",
        msg: err.message || "Terjadi kesalahan saat memproses donasi.",
      });
    } finally {
      setSubmittingDonasi(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className={styles.page}>
        <div style={{ textAlign: "center", color: "var(--gold)" }}>
          <i
            className="bx bx-loader-alt bx-spin"
            style={{ fontSize: "2.5rem", marginBottom: "12px" }}
          />
          <p>Memuat portal kas Cavallery...</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // VIEW 1: USER BELUM LOGIN (TAMPILKAN SCREEN MASUK / DAFTAR SESUAI DESAIN)
  // ══════════════════════════════════════════════════════════════════════
  if (!sessionUser) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={`glassCard ${styles.authCard}`}>
            {/* Circular Logo Header */}
            <div className={styles.logoWrap}>
              <img
                src="https://images.jkt48connect.com/cavallery/images/2026/09/cf207d2f32384a39.jpg"
                alt="Cavallery Logo"
                className={styles.logoImg}
              />
            </div>

            <h1 className={styles.brandTitle}>Cavallery</h1>

            <div className={styles.subtitleRow}>
              <div className={styles.subtitleLine} />
              <span className={styles.subtitleText}>
                {authMode === "masuk" ? "Masuk" : "Daftar"}
              </span>
              <div className={styles.subtitleLine} />
            </div>

            <p className={styles.instruction}>
              {authMode === "masuk"
                ? "Pilih bagaimana kamu ingin masuk ke portal Cavallery."
                : "Pilih bagaimana kamu ingin bergabung dengan Cavallery."}
            </p>

            {/* Success State After Registration */}
            {regSuccess ? (
              <div className={styles.successBox} style={{ margin: "20px 0" }}>
                <i className={`bx bx-check-circle ${styles.successIcon}`} />
                <h3 className={styles.successTitle}>Pendaftaran Berhasil!</h3>
                <p className={styles.successDesc}>{regSuccess}</p>
                <button
                  type="button"
                  className={styles.submitBtn}
                  style={{ marginTop: 12 }}
                  onClick={() => {
                    setAuthMode("masuk");
                    setRegSuccess(null);
                  }}
                >
                  <i className="bx bx-log-in" /> Menuju Halaman Masuk
                </button>
              </div>
            ) : (
              <>
                {/* Mode Switch (Masuk | Daftar) */}
                <div className={styles.modeSwitch}>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${authMode === "masuk" ? styles.modeBtnActive : ""}`}
                    onClick={() => {
                      setAuthMode("masuk");
                      setAuthError("");
                      setRegSuccess(null);
                    }}
                  >
                    <i className="bx bx-log-in" /> Masuk
                  </button>
                  <button
                    type="button"
                    className={`${styles.modeBtn} ${authMode === "daftar" ? styles.modeBtnActive : ""}`}
                    onClick={() => {
                      setAuthMode("daftar");
                      setAuthError("");
                      setRegSuccess(null);
                    }}
                  >
                    <i className="bx bx-user-plus" /> Daftar
                  </button>
                </div>

                {/* Role Switch Pill (Anggota | Kontributor) */}
                <div className={styles.togglePill}>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${tipe === "anggota" ? styles.toggleBtnActive : ""}`}
                    onClick={() => {
                      setTipe("anggota");
                      setAuthError("");
                      setRegSuccess(null);
                    }}
                  >
                    <i className="bx bx-user" /> Anggota
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleBtn} ${tipe === "donatur" ? styles.toggleBtnActive : ""}`}
                    onClick={() => {
                      setTipe("donatur");
                      setAuthError("");
                      setRegSuccess(null);
                    }}
                  >
                    <i className="bx bx-heart-circle" /> Kontributor
                  </button>
                </div>

                {/* Error Message */}
                {authError && (
                  <div className={styles.errorBox} style={{ marginBottom: 14 }}>
                    <i className="bx bx-error-circle" /> {authError}
                  </div>
                )}

                {/* ── FORM CONTAINER ── */}
                {authMode === "masuk" ? (
                  // ── FORM MASUK / LOGIN ──
                  <form onSubmit={handleLoginSubmit} className={styles.form} autoComplete="off">
                    {/* Dummy anti-autofill to trick browser password manager into not autofilling admin credentials */}
                    <input type="text" name="fake_username_remember" style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                    <input type="password" name="fake_password_remember" style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }} tabIndex={-1} aria-hidden="true" autoComplete="new-password" />

                    {tipe === "anggota" ? (
                      <>
                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>
                              Nomor Anggota
                            </label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <input
                            type="text"
                            name="cava_member_no_unique"
                            id="cava_member_no_unique"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="characters"
                            spellCheck="false"
                            className={styles.input}
                            placeholder="Contoh: CAVA-0001"
                            value={loginNoAnggota}
                            onChange={(e) =>
                              setLoginNoAnggota(e.target.value.toUpperCase())
                            }
                            required
                          />
                        </div>

                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>ID LINE atau PIN</label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <div style={{ position: "relative", width: "100%" }}>
                            <input
                              type={loginShowPassword ? "text" : "password"}
                              name="cava_line_credential_unique"
                              id="cava_line_credential_unique"
                              autoComplete="new-password"
                              autoCorrect="off"
                              spellCheck="false"
                              className={styles.input}
                              placeholder="Masukkan ID LINE atau 4-6 digit PIN kamu"
                              value={loginIdLine}
                              onChange={(e) => setLoginIdLine(e.target.value)}
                              style={{ paddingRight: 44 }}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setLoginShowPassword(!loginShowPassword)}
                              style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "none",
                                border: "none",
                                color: "var(--fg-muted)",
                                fontSize: "1.25rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 4,
                              }}
                              title={loginShowPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                            >
                              <i className={`bx ${loginShowPassword ? "bx-show" : "bx-hide"}`} />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>
                              Nama Kontributor
                            </label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <input
                            type="text"
                            name="cava_nama_kontributor_field"
                            id="cava_nama_kontributor_field"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            className={styles.input}
                            placeholder="Nama yang Anda daftarkan"
                            value={loginNamaDonatur}
                            onChange={(e) =>
                              setLoginNamaDonatur(e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>
                              ID Kontak (Kata Sandi)
                            </label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <div style={{ position: "relative", width: "100%" }}>
                            <input
                              type={loginShowPassword ? "text" : "password"}
                              name="cava_kontak_secret_field"
                              id="cava_kontak_secret_field"
                              autoComplete="new-password"
                              autoCorrect="off"
                              spellCheck="false"
                              className={styles.input}
                              placeholder="ID LINE / X / WA yang terdaftar"
                              value={loginKontakDonatur}
                              onChange={(e) =>
                                setLoginKontakDonatur(e.target.value)
                              }
                              style={{ paddingRight: 44 }}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setLoginShowPassword(!loginShowPassword)}
                              style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "none",
                                border: "none",
                                color: "var(--fg-muted)",
                                fontSize: "1.25rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 4,
                              }}
                              title={loginShowPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                            >
                              <i className={`bx ${loginShowPassword ? "bx-show" : "bx-hide"}`} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={authLoading}
                    >
                      {authLoading ? (
                        <>
                          <i className="bx bx-loader-alt bx-spin" />{" "}
                          Memeriksa...
                        </>
                      ) : (
                        <>
                          <i className="bx bx-log-in" /> Masuk
                        </>
                      )}
                    </button>
                  </form>
                ) : (tipe === "anggota" && !regAnggotaOpen) ||
                  (tipe === "donatur" && !regDonaturOpen) ? (
                  // ── KONDISI DAFTAR DITUTUP (TIDAK MENAMPILKAN FORM) ──
                  <div className={styles.closedStateWrap}>
                    <div className={styles.closedIconBox}>
                      <i className="bx bxs-lock-alt" />
                    </div>
                    <h3 className={styles.closedStateTitle}>
                      Pendaftaran{" "}
                      {tipe === "anggota" ? "Anggota Baru" : "Kontributor"}{" "}
                      Sedang Ditutup
                    </h3>
                    <p className={styles.closedStateDesc}>
                      Mohon maaf, saat ini pendaftaran{" "}
                      {tipe === "anggota" ? "anggota baru" : "kontributor"}{" "}
                      Cavallery sedang tidak menerima pendaftar baru. Silakan
                      pantau informasi resmi terbaru melalui media sosial kami.
                    </p>
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={() => setAuthMode("masuk")}
                      style={{ marginTop: 10 }}
                    >
                      <i className="bx bx-log-in" /> Kembali ke Halaman Masuk
                    </button>
                  </div>
                ) : (
                  // ── FORM DAFTAR AKTIF ──
                  <form onSubmit={handleRegisterSubmit} className={styles.form}>
                    {tipe === "anggota" ? (
                      <>
                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>No Anggota</label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="CAVA-0001"
                            value={regNoAnggota}
                            onChange={(e) =>
                              setRegNoAnggota(e.target.value.toUpperCase())
                            }
                            required
                          />
                          <span className={styles.hint}>
                            Sesuaikan dengan nomor anggota lama menggunakan
                            format 4 digit.
                          </span>
                        </div>

                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>Nama</label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="Nama kamu"
                            value={regNamaLengkap}
                            onChange={(e) => setRegNamaLengkap(e.target.value)}
                            required
                          />
                          <span className={styles.hint}>
                            Nama yang biasa kamu gunakan di Cavallery.
                          </span>
                        </div>

                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>ID LINE</label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="ID LINE aktif kamu"
                            value={regIdLine}
                            onChange={(e) => setRegIdLine(e.target.value)}
                            required
                          />
                          <span className={styles.hint}>
                            Masukkan ID LINE yang aktif.
                          </span>
                        </div>

                        {/* PIN Login (Opsional / Disarankan) */}
                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>PIN Login (4-6 Digit Angka)</label>
                            <span className={styles.badgeOpsional}>
                              OPSIONAL / DISARANKAN
                            </span>
                          </div>
                          <div style={{ position: "relative", width: "100%" }}>
                            <input
                              type={showRegPin ? "text" : "password"}
                              className={styles.input}
                              placeholder="Contoh: 123456 (4-6 digit angka)"
                              value={regPin}
                              maxLength={6}
                              onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ""))}
                              style={{ paddingRight: 44 }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegPin(!showRegPin)}
                              style={{
                                position: "absolute",
                                right: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "none",
                                border: "none",
                                color: "var(--fg-muted)",
                                fontSize: "1.25rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 4,
                              }}
                              title={showRegPin ? "Sembunyikan PIN" : "Lihat PIN"}
                            >
                              <i className={`bx ${showRegPin ? "bx-show" : "bx-hide"}`} />
                            </button>
                          </div>
                          <span className={styles.hint}>
                            PIN ini bisa digunakan untuk masuk ke akun selain menggunakan ID LINE.
                          </span>
                        </div>

                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>
                              Display Name LINE
                            </label>
                            <span className={styles.badgeOpsional}>
                              OPSIONAL
                            </span>
                          </div>
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="Display Name LINE kamu"
                            value={regDisplayLine}
                            onChange={(e) => setRegDisplayLine(e.target.value)}
                          />
                          <span className={styles.hint}>
                            Nama yang tampil di akun LINE kamu.
                          </span>
                        </div>

                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>
                              Username Discord
                            </label>
                            <span className={styles.badgeOpsional}>
                              OPSIONAL
                            </span>
                          </div>
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="username_discord"
                            value={regDiscord}
                            onChange={(e) => setRegDiscord(e.target.value)}
                          />
                          <span className={styles.hint}>
                            Masukkan username Discord kamu.
                          </span>
                        </div>

                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>Gender</label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <select
                            className={styles.select}
                            value={regGender}
                            onChange={(e) => setRegGender(e.target.value)}
                          >
                            {GENDERS.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>
                              Kota Domisili
                            </label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="Contoh: Jakarta, Surabaya, Bandung"
                            value={regDomisili}
                            onChange={(e) => setRegDomisili(e.target.value)}
                            required
                          />
                        </div>

                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>Kontak</label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <div className={styles.inputGroup}>
                            <select
                              className={styles.select}
                              value={regKontakPlatform}
                              onChange={(e) =>
                                setRegKontakPlatform(e.target.value)
                              }
                            >
                              {platformOptions.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="ID / Username akun kontak"
                              value={regKontakId}
                              onChange={(e) => setRegKontakId(e.target.value)}
                              required
                            />
                          </div>
                          <span className={styles.hint}>
                            Pilih setidaknya satu akun yang bisa dihubungi.
                          </span>
                        </div>
                      </>
                    ) : (
                      // ── Form Kontributor ──
                      <>
                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>
                              Nama Kontributor
                            </label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="Nama lengkap atau inisial"
                            value={regNamaDonatur}
                            onChange={(e) => setRegNamaDonatur(e.target.value)}
                            required
                          />
                        </div>

                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>Kontak</label>
                            <span className={styles.badgeWajib}>WAJIB</span>
                          </div>
                          <div className={styles.inputGroup}>
                            <select
                              className={styles.select}
                              value={regKontakPlatformDonatur}
                              onChange={(e) =>
                                setRegKontakPlatformDonatur(e.target.value)
                              }
                            >
                              {platformOptions.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder="ID / No. Kontak"
                              value={regKontakIdDonatur}
                              onChange={(e) =>
                                setRegKontakIdDonatur(e.target.value)
                              }
                              required
                            />
                          </div>
                        </div>

                        <div className={styles.field}>
                          <div className={styles.labelRow}>
                            <label className={styles.label}>
                              ID / Nama Discord
                            </label>
                            <span className={styles.badgeOpsional}>
                              OPSIONAL
                            </span>
                          </div>
                          <input
                            type="text"
                            className={styles.input}
                            placeholder="Contoh: user#1234"
                            value={regDiscordDonatur}
                            onChange={(e) =>
                              setRegDiscordDonatur(e.target.value)
                            }
                          />
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={authLoading}
                    >
                      {authLoading ? (
                        <>
                          <i className="bx bx-loader-alt bx-spin" />{" "}
                          Mendaftarkan...
                        </>
                      ) : (
                        <>
                          <i className="bx bx-user-plus" /> Daftar{" "}
                          {tipe === "anggota" ? "Anggota" : "Kontributor"}
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            )}

            <div className={styles.helpText}>
              Jika terjadi kendala, kehilangan, perubahan atau ketidaksesuaian
              data, dapat menghubungi admin Cavallery.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════
  // VIEW 2: USER SUDAH LOGIN (PORTAL KAS & DONASI CAVALLERY - STYLE GAMBAR 2)
  // ══════════════════════════════════════════════════════════════════════
  const displayName = sessionUser.namaLengkap || sessionUser.nama || "Ksatria";
  const userInitial = displayName.charAt(0).toUpperCase();
  const rawDate = sessionUser.anggotaSejak || sessionUser.createdAt;
  const formattedJoinDate = rawDate
    ? new Date(rawDate).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "9 Desember 2023";

  return (
    <div className={styles.page}>
      <div className={styles.containerDashboard}>
        {/* Feedback Ganti Foto Profil */}
        {avatarToast && (
          <div
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              background: "rgba(185, 84, 16, 0.15)",
              border: "1px solid rgba(185, 84, 16, 0.3)",
              color: "#b95410",
              fontWeight: 700,
              fontSize: "0.88rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
              animation: "fadeIn 0.3s ease",
            }}
          >
            <i className="bx bx-check-circle" /> {avatarToast}
          </div>
        )}

        {/* ── BANNER FESTIF ULANG TAHUN ANGGOTA (Hanya jika pengguna sudah mengisi tanggal lahir & hari ini ulang tahunnya) ── */}
        {sessionUser?.tanggalLahir && sessionUser.tanggalLahir.trim() && checkIsBirthdayToday(sessionUser.tanggalLahir) && (
          <div className={styles.birthdayBannerAlert}>
            <div className={styles.birthdayBannerLeft}>
              <div className={styles.birthdayCakeIconWrap}>
                <i className="bx bxs-cake" />
              </div>
              <div>
                <h3 className={styles.birthdayBannerTitle}>
                  🎉 Selamat Ulang Tahun, {displayName}! 🎂✨
                </h3>
                <p className={styles.birthdayBannerDesc}>
                  Hari ini adalah hari istimewamu! Ada kado video ucapan hangat dan pesan cinta dari Erine JKT48 menunggumu.
                </p>
              </div>
            </div>
            <button
              type="button"
              className={styles.birthdayBannerBtn}
              onClick={() => setShowBirthdayModal(true)}
            >
              <i className="bx bx-gift" /> Buka Kado dari Erine
            </button>
          </div>
        )}

        {/* ── TOP MEMBER LUXURY CARD (Style Referensi Gambar 2) ── */}
        <div className={styles.memberCard}>
          <div className={styles.memberCardHeader}>
            <span className={styles.brandBadge}>CAVALLERY</span>
            <span className={styles.memberStatusText}>
              {sessionUser.jabatan === "Admin Fanbase" ? (
                <>
                  <i className="bx bxs-crown" style={{ color: "#f5690b" }} />{" "}
                  Admin Fanbase{" "}
                  {sessionUser.divisi ? `(${sessionUser.divisi})` : ""}
                </>
              ) : (
                <>
                  <i className="bx bxs-circle" style={{ fontSize: "0.5rem" }} />
                  {sessionUser.jabatan && sessionUser.jabatan !== "Anggota"
                    ? sessionUser.jabatan
                    : "Aktif"}
                </>
              )}
            </span>
          </div>

          <div className={styles.memberCardBody}>
            <div className={styles.memberAvatarWrapper}>
              <div
                className={styles.memberAvatarCircle}
                onClick={() => setShowKtaModal(true)}
                title="Klik untuk melihat Kartu Tanda Anggota (KTA)"
              >
                {sessionUser.fotoProfil || sessionUser.foto_profil ? (
                  <img
                    src={sessionUser.fotoProfil || sessionUser.foto_profil}
                    alt={displayName}
                    className={styles.memberAvatarImg}
                  />
                ) : (
                  userInitial
                )}
              </div>
              <button
                type="button"
                className={styles.avatarEditBadge}
                onClick={(e) => {
                  e.stopPropagation();
                  avatarFileInputRef.current?.click();
                }}
                title="Ganti Foto Profil"
              >
                {uploadingUserAvatar ? (
                  <i className="bx bx-loader-alt bx-spin" />
                ) : (
                  <i className="bx bx-camera" />
                )}
              </button>
              <input
                type="file"
                ref={avatarFileInputRef}
                hidden
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUserAvatarUpload(file);
                }}
              />
            </div>
            <div className={styles.memberCardDetails}>
              <h2 className={styles.memberNameMain}>{displayName}</h2>
              <p className={styles.memberSubText}>
                {sessionUser.idLine
                  ? `@${sessionUser.idLine}`
                  : sessionUser.kontakId || displayName}
              </p>
              <div
                className={styles.memberCodeRow}
                onClick={() => setShowKtaModal(true)}
                title="Klik untuk membuka Kartu Tanda Anggota (KTA)"
              >
                <span className={styles.memberCodeText}>
                  {sessionUser.noAnggota || "CAVA-0001"}
                </span>
                <i className={`bx bx-qr-scan ${styles.memberCodeQr}`} />
              </div>

              {sessionUser.type === "anggota" && (
                <div className={styles.memberTtlRow}>
                  <i className="bx bx-cake" />
                  <span>
                    TTL:{" "}
                    <strong>
                      {sessionUser.tempatLahir && sessionUser.tanggalLahir
                        ? `${sessionUser.tempatLahir}, ${formatIndoDate(sessionUser.tanggalLahir)}`
                        : sessionUser.tanggalLahir
                          ? formatIndoDate(sessionUser.tanggalLahir)
                          : "Belum Diisi"}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTtl(true);
                      setShowKtaModal(true);
                    }}
                    className={styles.memberTtlEditBtn}
                    title="Ubah / Lengkapi Tempat & Tanggal Lahir KTA"
                  >
                    <i className="bx bx-edit-alt" />
                  </button>
                </div>
              )}

              <span className={styles.memberSinceText}>
                Anggota Sejak: {formattedJoinDate}
              </span>
              {sessionUser.type === "anggota" && (
                <div className={styles.memberActionsRow}>
                  {(() => {
                    const bDef = getMemberBadge(sessionUser.badge);
                    return (
                      <div
                        className={styles.memberBadgePill}
                        style={{
                          background: bDef.bgColor,
                          border: `1px solid ${bDef.borderColor}`,
                          color: bDef.color,
                        }}
                        title={bDef.description}
                      >
                        <i className={`bx ${bDef.icon}`} /> Badge: {bDef.name}
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => setShowKtaModal(true)}
                    className={styles.memberKtaPrimaryBtn}
                    title="Buka Kartu Tanda Anggota (KTA) Digital"
                  >
                    <i className="bx bx-id-card" /> KTA Digital
                  </button>

                  {sessionUser.jabatan === "Admin Fanbase" && (
                    <a
                      href="https://cavallery.id/internal/dashboard-admin-xv7r2q"
                      className={styles.memberKtaPrimaryBtn}
                      style={{
                        background: "linear-gradient(135deg, #b45309 0%, #d97706 100%)",
                        color: "#ffffff",
                        borderColor: "#f5690b",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6
                      }}
                      title="Buka Dashboard Admin Fanbase"
                    >
                      <i className="bx bxs-dashboard" /> Dashboard Admin
                    </a>
                  )}

                  {sessionUser.tanggalLahir && sessionUser.tanggalLahir.trim() && checkIsBirthdayToday(sessionUser.tanggalLahir) && (
                    <button
                      type="button"
                      onClick={() => setShowBirthdayModal(true)}
                      className={styles.memberBirthdayActionBtn}
                      title="Buka Ucapan Ulang Tahun Spesial dari Erine JKT48"
                    >
                      <i className="bx bxs-cake" /> Ucapan Ultah Erine 🎉
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPromptPinError("");
                      setPromptPinSuccess("");
                      setPromptPinInput("");
                      setShowPinPromptModal(true);
                    }}
                    className={styles.memberPinSecondaryBtn}
                    title={sessionUser.hasPin ? "Klik untuk mengubah PIN login" : "Klik untuk membuat PIN login"}
                  >
                    <i className="bx bxs-key" />
                    {sessionUser.hasPin ? "PIN Login: Aktif" : "PIN Login: Belum Diatur"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BANNER TAWARAN PIN LOGIN JIKA BELUM SETEL ── */}
        {sessionUser.type === "anggota" && !sessionUser.hasPin && (
          <div
            style={{
              marginTop: 16,
              padding: "14px 18px",
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(229, 120, 48, 0.18), rgba(229, 120, 48, 0.06))",
              border: "1.5px dashed rgba(229, 120, 48, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 240 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(229, 120, 48, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--gold)",
                  fontSize: "1.3rem",
                  flexShrink: 0,
                }}
              >
                <i className="bx bxs-key" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: "var(--gold)" }}>
                  Tingkatkan Kemudahan Login Akun
                </h4>
                <p style={{ margin: "3px 0 0 0", fontSize: "0.8rem", color: "var(--fg-muted)" }}>
                  Akunmu belum memiliki PIN. Atur 4-6 angka PIN sekarang agar bisa login cepat tanpa repot mengetik ID LINE.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPromptPinError("");
                setPromptPinSuccess("");
                setPromptPinInput("");
                setShowPinPromptModal(true);
              }}
              style={{
                background: "var(--gold)",
                color: "var(--cv-on-orange)",
                border: "none",
                borderRadius: 10,
                padding: "8px 16px",
                fontSize: "0.82rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 12px rgba(229, 120, 48, 0.3)",
              }}
            >
              <i className="bx bx-plus-circle" /> Buat PIN Sekarang
            </button>
          </div>
        )}

        {/* ── BOTTOM DUAL-PILL NAVIGATION & LOGOUT (Style Referensi Gambar 2) ── */}
        <div className={styles.navPillsCard}>
          <div className={styles.navTabsScrollTrack}>
            <button
              type="button"
              className={`${styles.navPillBtn} ${
                portalTab === "bayar" || portalTab === "riwayat"
                  ? styles.navPillBtnActive
                  : ""
              }`}
              onClick={() => setPortalTab("bayar")}
            >
              <i className="bx bx-wallet" />
              <span>Kas</span>
            </button>
            <button
              type="button"
              className={`${styles.navPillBtn} ${portalTab === "kupon" ? styles.navPillBtnActive : ""}`}
              onClick={() => setPortalTab("kupon")}
            >
              <i className="bx bx-gift" />
              <span>
                Reward {userKupons.length > 0 ? `(${userKupons.length})` : ""}
              </span>
            </button>
            <button
              type="button"
              className={`${styles.navPillBtn} ${portalTab === "donasi" ? styles.navPillBtnActive : ""}`}
              onClick={() => setPortalTab("donasi")}
            >
              <i className="bx bx-donate-heart" />
              <span>Donasi</span>
            </button>
            <button
              type="button"
              className={`${styles.navPillBtn} ${portalTab === "war" ? styles.navPillBtnActive : ""}`}
              onClick={() => setPortalTab("war")}
            >
              <i className="bx bx-flame" />
              <span>War Tiket</span>
            </button>
            {sessionUser?.type === "anggota" && (
              <button
                type="button"
                className={`${styles.navPillBtn} ${portalTab === "daftar" ? styles.navPillBtnActive : ""}`}
                onClick={() => setPortalTab("daftar")}
              >
                <i className="bx bx-user-plus" />
                <span>Daftar Tim</span>
              </button>
            )}
          </div>

          <button
            type="button"
            className={styles.logoutOutlineBtn}
            onClick={handleLogout}
            title="Keluar dari sesi akun"
          >
            <i className="bx bx-log-out" /> Keluar Akun
          </button>
        </div>

        {/* ── 1. WIDGET QUICK SUMMARY KAS KOMUNITAS (TRANSPARANSI KAS - HANYA UNTUK ANGGOTA BIASA) ── */}
        {(portalTab === "bayar" || portalTab === "riwayat") && sessionUser?.jabatan !== "Admin Fanbase" && !sessionUser?.jabatan?.toLowerCase().includes("admin") && (
          <div className={styles.communityKasSummaryCard}>
            <div className={styles.communityKasHeader}>
              <div className={styles.communityKasTitle}>
                <i className="bx bx-pie-chart-alt-2" style={{ color: "var(--gold)", fontSize: "1.25rem" }} />
                <span>Transparansi Kas Komunitas Cavallery</span>
              </div>
              <a
                href="/internal/iuran-kas-xv7r2q"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.communityKasLink}
                title="Buka pembukuan kas & nota pengeluaran publik"
              >
                <span>Buku Kas & Nota Publik</span>
                <i className="bx bx-link-external" />
              </a>
            </div>

            <div className={styles.communityKasGrid}>
              <div className={styles.communityStatItem}>
                <div className={styles.statIconWrapGreen}>
                  <i className="bx bx-arrow-to-bottom" />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Total Kas Terkumpul</span>
                  <span className={styles.statValueGreen}>
                    {communityKasStats.loading ? "Memuat..." : formatRupiah(communityKasStats.totalPemasukan)}
                  </span>
                </div>
              </div>

              <div className={styles.communityStatItem}>
                <div className={styles.statIconWrapRed}>
                  <i className="bx bx-arrow-from-bottom" />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Total Pengeluaran Project</span>
                  <span className={styles.statValueRed}>
                    {communityKasStats.loading ? "Memuat..." : formatRupiah(communityKasStats.totalPengeluaran)}
                  </span>
                </div>
              </div>

              <div className={styles.communityStatItem}>
                <div className={styles.statIconWrapGold}>
                  <i className="bx bx-shield-quarter" />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statLabel}>Saldo Kas Aktif</span>
                  <span className={styles.statValueGold}>
                    {communityKasStats.loading ? "Memuat..." : formatRupiah(communityKasStats.saldoBersih)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ── 2. KARTU STATUS KEANGGOTAAN & PROGRESS BAR 12 BULAN (HANYA UNTUK ANGGOTA BIASA) ── */}
        {(portalTab === "bayar" || portalTab === "riwayat") && sessionUser?.type === "anggota" && sessionUser?.jabatan !== "Admin Fanbase" && !sessionUser?.jabatan?.toLowerCase().includes("admin") && (() => {
          const currentYearNow = new Date().getFullYear();
          const currentMonthNow = new Date().getMonth() + 1;

          // Hitung tahun & bulan mulai bergabung
          let joinYear = 2024;
          let joinMonth = 1;
          const rawJoin = memberJoinDate || sessionUser?.anggotaSejak || sessionUser?.createdAt;
          if (rawJoin) {
            const jd = new Date(rawJoin);
            if (!isNaN(jd.getTime())) {
              joinYear = jd.getFullYear();
              joinMonth = jd.getMonth() + 1;
            }
          }

          // Bulan mulai wajib kas di tahun yang dipilih
          let startReqMonth = 1;
          if (trackerYear < joinYear) {
            startReqMonth = 13; // Belum bergabung di tahun ini
          } else if (trackerYear === joinYear) {
            startReqMonth = joinMonth;
          } else {
            startReqMonth = 1;
          }

          const paidThisYear = monthlyStatus.filter(
            (s) => Number(s.tahun) === trackerYear && s.status === "diverifikasi"
          );
          const totalPaidCount = paidThisYear.length;
          const percent = Math.min(100, Math.round((totalPaidCount / 12) * 100));

          // Hitung daftar bulan yang menunggak (sejak startReqMonth s/d bulan saat ini)
          const targetUpToMonth = trackerYear === currentYearNow ? currentMonthNow : trackerYear < currentYearNow ? 12 : 0;
          const unpaidMonthsList: number[] = [];
          for (let m = startReqMonth; m <= targetUpToMonth; m++) {
            const rowStatus = monthlyStatus.find(
              (s) => Number(s.tahun) === trackerYear && Number(s.bulan) === m
            );
            const isLunas = rowStatus?.status === "diverifikasi";
            const isBebasKas = rowStatus?.status === "not_joined";
            if (!isLunas && !isBebasKas) {
              unpaidMonthsList.push(m);
            }
          }

          const tunggakanCount = unpaidMonthsList.length;

          let statusBadgeText = `Tunggakan ${tunggakanCount} Bulan`;
          let statusBadgeClass = styles.trackerStatusWarning;

          if (totalPaidCount >= 12) {
            statusBadgeText = "Lunas 1 Tahun Penuh! 👑";
            statusBadgeClass = styles.trackerStatusSuccess;
          } else if (tunggakanCount === 0) {
            if (trackerYear === currentYearNow) {
              statusBadgeText = totalPaidCount > currentMonthNow ? "Lunas s/d Akhir Tahun 👑" : "Lunas s/d Bulan Ini 🛡️";
            } else if (trackerYear > currentYearNow) {
              statusBadgeText = `${totalPaidCount} Bulan Terbayar di Muka`;
            } else {
              statusBadgeText = "Lunas 🛡️";
            }
            statusBadgeClass = styles.trackerStatusSuccess;
          } else if (trackerYear > currentYearNow) {
            statusBadgeText = `${totalPaidCount} Bulan Terbayar di Muka`;
            statusBadgeClass = styles.trackerStatusInfo;
          }

          return (
            <div className={styles.memberKasTrackerCard}>
              <div className={styles.trackerHeader}>
                <div className={styles.trackerHeaderLeft}>
                  <div className={styles.trackerTitle}>
                    <i className="bx bx-calendar-star" style={{ color: "var(--gold)" }} />
                    <span>Progress Kas Anggota {trackerYear}</span>
                  </div>
                  <span className={`${styles.trackerBadge} ${statusBadgeClass}`}>
                    {statusBadgeText}
                  </span>
                </div>

                <div className={styles.trackerYearPills}>
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setTrackerYear(yr)}
                      className={`${styles.trackerYearBtn} ${trackerYear === yr ? styles.trackerYearBtnActive : ""}`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className={styles.trackerProgressBarContainer}>
                <div className={styles.trackerProgressBarHeader}>
                  <span style={{ fontSize: "0.82rem", color: "var(--fg-muted)" }}>
                    Keterpenuhan Iuran Kas: <strong style={{ color: "var(--gold)" }}>{totalPaidCount}</strong> dari 12 Bulan
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--gold)" }}>
                    {percent}%
                  </span>
                </div>
                <div className={styles.trackerProgressBarTrack}>
                  <div
                    className={styles.trackerProgressBarFill}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* 12 Bulan Grid */}
              <div className={styles.trackerMonthGrid}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const mRecord = monthlyStatus.find(
                    (s) => Number(s.tahun) === trackerYear && Number(s.bulan) === m
                  );
                  const isPaid = mRecord?.status === "diverifikasi";
                  const isNotJoined = mRecord?.status === "not_joined" || (trackerYear < joinYear || (trackerYear === joinYear && m < joinMonth && !isPaid));
                  const isPending = mRecord?.status === "pending";
                  const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
                  const mName = monthNamesShort[m - 1];

                  return (
                    <div
                      key={m}
                      className={`${styles.trackerMonthItem} ${isPaid ? styles.trackerMonthItemPaid : isPending ? styles.trackerMonthItemPending : isNotJoined ? "" : styles.trackerMonthItemUnpaid}`}
                      onClick={() => {
                        if (!isPaid && !isNotJoined) {
                          setPeriodeBulan(m);
                          setPeriodeTahun(trackerYear);
                          setPortalTab("bayar");
                          const el = document.getElementById("form-kas-input");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      title={isPaid ? `${mName} ${trackerYear}: LUNAS` : isNotJoined ? `${mName} ${trackerYear}: Belum Bergabung / Bebas Kas (-)` : isPending ? `${mName} ${trackerYear}: Menunggu Verifikasi` : `Klik untuk membayar kas ${mName} ${trackerYear}`}
                      style={{
                        cursor: isPaid || isNotJoined ? "default" : "pointer",
                        opacity: isNotJoined ? 0.6 : 1,
                      }}
                    >
                      <span className={styles.trackerMonthName}>{mName}</span>
                      <div className={styles.trackerMonthIcon}>
                        {isPaid ? (
                          <i className="bx bxs-check-circle" />
                        ) : isNotJoined ? (
                          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--fg-muted)" }}>-</span>
                        ) : isPending ? (
                          <i className="bx bx-time" />
                        ) : (
                          <i className="bx bx-circle" />
                        )}
                      </div>
                      <span className={styles.trackerMonthStatus}>
                        {isPaid ? "Lunas" : isNotJoined ? "-" : isPending ? "Pending" : "Bayar"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── SUB-TABS ROW FOR KAS / RIWAYAT ── */}
        {(portalTab === "bayar" || portalTab === "riwayat") && (
          <div
            style={{ display: "flex", justifyContent: "center", width: "100%" }}
          >
            <div className={styles.modeSwitch} style={{ maxWidth: 360 }}>
              <button
                type="button"
                className={`${styles.modeBtn} ${portalTab === "bayar" ? styles.modeBtnActive : ""}`}
                onClick={() => setPortalTab("bayar")}
              >
                <i className="bx bx-credit-card" />{" "}
                {sessionUser.jabatan === "Admin Fanbase"
                  ? "Status Kas"
                  : "Bayar Kas"}
              </button>
              <button
                type="button"
                className={`${styles.modeBtn} ${portalTab === "riwayat" ? styles.modeBtnActive : ""}`}
                onClick={() => setPortalTab("riwayat")}
              >
                <i className="bx bx-history" /> Riwayat Status
              </button>
            </div>
          </div>
        )}


        {/* ── TAB 1: BAYAR KAS (ATAU STATUS BEBAS KAS UNTUK ADMIN FANBASE) ── */}
        {portalTab === "bayar" &&
          (sessionUser.jabatan === "Admin Fanbase" ? (
            /* GOLDEN EXEMPTION CARD UNTUK ADMIN FANBASE */
            <div className={`glassCard ${styles.adminExemptionCard}`}>
              <div className={styles.adminCrownIconWrap}>
                <i className="bx bxs-crown" />
              </div>

              <span className={styles.adminExemptionBadge}>
                <i className="bx bxs-crown" style={{ marginRight: 6 }} />{" "}
                Manajemen & Pengurus Fanbase
              </span>

              <h1 className={styles.adminExemptionTitle}>
                Bebas Iuran Kas Wajib Bulanan
              </h1>

              <div className={styles.adminDivisiBadge}>
                <i className="bx bx-badge-check" />
                <span>
                  Divisi: {sessionUser.divisi || "Tim Inti / Koordinator"}
                </span>
              </div>

              <p className={styles.adminExemptionQuote}>
                "Terima kasih sebesar-besarnya atas waktu, tenaga, dan dedikasi
                Anda dalam mengelola & mengembangkan keluarga besar Cavallery
                untuk Erine. Sebagai pengurus resmi fanbase, Anda dibebaskan
                dari ketentuan iuran kas bulanan."
              </p>

              <a href="https://cavallery.id/internal/dashboard-admin-xv7r2q" className={styles.adminQuickBtn}>
                <i className="bx bxs-dashboard" /> Buka Dashboard Admin Fanbase
              </a>

              <button
                type="button"
                className={styles.adminDonasiLink}
                onClick={() => setPortalTab("donasi")}
              >
                Ingin tetap berpartisipasi donasi sukarela untuk project Erine?
                Klik di sini
              </button>
            </div>
          ) : kasSuccessData ? (
            /* SUCCESS CONFIRMATION CARD (FORM KAS TIDAK DITAMPILKAN LAGI) */
            <div className={`glassCard ${styles.dashCard}`} style={{ textAlign: "center", padding: "48px 24px" }}>
              <div style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                background: "rgba(185, 84, 16, 0.12)",
                border: "2px solid #b95410",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <i className="bx bx-check-circle" style={{ fontSize: "3rem", color: "#b95410" }} />
              </div>

              <div className="badge" style={{ marginBottom: 14 }}>
                <i className="bx bx-badge-check" /> Pembayaran Berhasil Dikirim
              </div>

              <h2 style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--fg)", marginBottom: 12 }}>
                Terima Kasih Sudah Membayar Kas!
              </h2>

              <p style={{
                fontSize: "0.96rem",
                lineHeight: 1.7,
                color: "var(--fg-muted)",
                maxWidth: 560,
                margin: "0 auto 26px",
              }}>
                Konfirmasi pembayaran kas Anda telah kami terima ke dalam sistem. Tim Admin Fanbase akan segera mengecek dan memverifikasi bukti pembayaran Anda. Dukungan Anda sangat berarti untuk memajukan keluarga besar Cavallery dan mendampingi perjalanan Erine.
              </p>

              {/* Rincian Singkat Pembayaran */}
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "18px 22px",
                maxWidth: 420,
                margin: "0 auto 30px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--fg-muted)" }}>Periode Kas:</span>
                  <strong style={{ color: "var(--fg)" }}>{kasSuccessData.periode}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <span style={{ color: "var(--fg-muted)" }}>Nominal Dibayar:</span>
                  <strong style={{ color: "var(--gold)" }}>{formatRupiah(kasSuccessData.nominal)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", alignItems: "center" }}>
                  <span style={{ color: "var(--fg-muted)" }}>Status Verifikasi:</span>
                  <span style={{
                    background: "rgba(245, 105, 11, 0.15)",
                    color: "#f5690b",
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    border: "1px solid rgba(245, 105, 11, 0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}>
                    <i className="bx bx-time-five" /> Menunggu Pengecekan Admin
                  </span>
                </div>
              </div>

              {/* Tombol Aksi */}
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className={styles.submitBtn}
                  style={{ maxWidth: 260, margin: 0 }}
                  onClick={() => {
                    setKasSuccessData(null);
                    setPortalTab("riwayat");
                  }}
                >
                  <i className="bx bx-history" /> Lihat Status Kas Saya
                </button>
                <button
                  type="button"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--fg)",
                    padding: "12px 22px",
                    borderRadius: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onClick={() => {
                    setKasSuccessData(null);
                  }}
                >
                  <i className="bx bx-refresh" /> Bayar Kas Periode Lain
                </button>
              </div>
            </div>
          ) : (
            /* FORM PEMBAYARAN KAS ANGGOTA REGULER */
            <div id="form-kas-input" className={`glassCard ${styles.dashCard}`}>
              <div className={styles.header}>
                <div className="badge">
                  <i className="bx bx-wallet" /> Kas Keanggotaan
                </div>
                <h1 className={styles.title}>Pembayaran Kas Cavallery</h1>
                <p className={styles.subtitle}>
                  Dukung operasional fanbase dan berbagai proyek kebersamaan
                  untuk Erine.
                </p>
              </div>

              {/* QRIS Container */}
              <div className={styles.qrisWrap}>
                <img
                  src="https://images.jkt48connect.com/cavallery/images/2026/09/b50e2fd04a9f4738.jpg"
                  alt="QRIS Kas Cavallery"
                  className={styles.qrisImg}
                />
                <div className={styles.qrisNote}>
                  <i className="bx bx-info-circle" />
                  <span>
                    <strong>Catatan:</strong> Pembayaran melebihi kewajiban
                    bulan berjalan akan dianggap sebagai deposit dan mengurangi
                    ketentuan kas bulan berikutnya.
                  </span>
                </div>
              </div>

              {/* Kas Feedback Alert */}
              {kasAlert && (
                <div
                  className={`${styles.alertBox} ${
                    kasAlert.type === "success"
                      ? styles.alertSuccess
                      : styles.alertError
                  }`}
                >
                  <i
                    className={`bx ${kasAlert.type === "success" ? "bx-check-circle" : "bx-error-circle"}`}
                  />
                  <span>{kasAlert.msg}</span>
                </div>
              )}

              <form onSubmit={handleKasSubmit} className={styles.form}>
                {/* DROPDOWN PERIODE KAS (BULAN & TAHUN TERPISAH) */}
                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label className={styles.label}>
                      Periode Kas yang Dibayar
                    </label>
                    <span className={styles.badgeWajib}>WAJIB</span>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--fg-muted)",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Pilih Bulan
                      </label>
                      <select
                        className={styles.input}
                        value={periodeBulan}
                        onChange={(e) =>
                          setPeriodeBulan(Number(e.target.value))
                        }
                      >
                        {MONTH_NAMES.map((m, idx) => (
                          <option key={m} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--fg-muted)",
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        Pilih Tahun
                      </label>
                      <select
                        className={styles.input}
                        value={periodeTahun}
                        onChange={(e) =>
                          setPeriodeTahun(Number(e.target.value))
                        }
                      >
                        {[2024, 2025, 2026, 2027, 2028, 2029].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--gold)",
                      marginTop: 6,
                      fontWeight: 600,
                    }}
                  >
                    <i
                      className="bx bx-calendar-check"
                      style={{ marginRight: 4 }}
                    />
                    Iuran Kas untuk:{" "}
                    <strong>
                      {MONTH_NAMES[periodeBulan - 1]} {periodeTahun}
                    </strong>
                  </div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--fg-muted)",
                      marginTop: 4,
                      lineHeight: 1.5,
                      background: "rgba(229, 120, 48, 0.06)",
                      border: "1px solid rgba(229, 120, 48, 0.15)",
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}
                  >
                    <i className="bx bx-info-circle" style={{ marginRight: 4, color: "var(--gold)" }} />
                    <strong>Tips:</strong> Pilih periode mulai dari bulan <strong>terakhir yang belum dibayar</strong> agar tidak terlongkap. Contoh: jika Agustus, September, dan Oktober belum lunas, pilih mulai <strong>Agustus</strong> lalu bayar 3 bulan sekaligus (Rp 45.000).
                  </div>
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label className={styles.label}>
                      Nominal Pembayaran (Rp)
                    </label>
                    <span className={styles.badgeWajib}>WAJIB</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={styles.input}
                    placeholder="15.000"
                    value={nominalKas}
                    onChange={(e) => handleNominalKasChange(e.target.value)}
                    required
                  />
                  {cleanNominalKas > 0 && (
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "#b95410",
                        marginTop: 10,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(185, 84, 16, 0.08)",
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(185, 84, 16, 0.25)",
                      }}
                    >
                      <i
                        className="bx bx-check-circle"
                        style={{ fontSize: "1.15rem", flexShrink: 0 }}
                      />
                      <span>
                        {getKasCalculationText(cleanNominalKas) ? (
                          <>
                            Hitungan:{" "}
                            <strong>
                              {getKasCalculationText(cleanNominalKas)}
                            </strong>
                          </>
                        ) : (
                          <>
                            Total Iuran Kas:{" "}
                            <strong>
                              Rp {cleanNominalKas.toLocaleString("id-ID")}
                            </strong>
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {/* ── RINCIAN HITUNGAN KAS 1 S/D 12 BULAN — SELALU TAMPIL ── */}
                  <div style={{ marginTop: 12 }}>
                    <div
                      style={{
                        marginTop: 8,
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 10,
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 8,
                        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.04)",
                      }}
                    >
                      {KAS_12_BULAN.map((item) => {
                        const isSelected = cleanNominalKas === item.nominal;
                        return (
                          <div
                            key={item.bulan}
                            onClick={() => {
                              setSelectedChipKas(item.nominal);
                              setNominalKas(
                                item.nominal.toLocaleString("id-ID"),
                              );
                            }}
                            style={{
                              padding: "7px 10px",
                              borderRadius: 8,
                              background: isSelected
                                ? "var(--gold)"
                                : "var(--bg)",
                              color: isSelected ? "var(--cv-on-orange)" : "var(--fg)",
                              border: isSelected
                                ? "1px solid var(--gold)"
                                : "1px solid var(--border)",
                              fontSize: "0.75rem",
                              fontWeight: isSelected ? 800 : 600,
                              cursor: "pointer",
                              transition: "all 0.15s",
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                            title={`Pilih ${item.detail}`}
                          >
                            <span
                              style={{
                                fontSize: "0.68rem",
                                opacity: isSelected ? 0.9 : 0.7,
                              }}
                            >
                              {item.label}
                            </span>
                            <span
                              style={{ fontWeight: 800, fontSize: "0.82rem" }}
                            >
                              Rp {item.nominal.toLocaleString("id-ID")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── KODE VOUCHER / KUPON KAS ── */}
                <div className={styles.field} style={{ marginTop: 14 }}>
                  <div className={styles.labelRow}>
                    <label className={styles.label}>
                      Kode Voucher / Kupon Kas
                    </label>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: "rgba(229, 120, 48, 0.15)",
                        color: "var(--gold)",
                        fontWeight: 700,
                      }}
                    >
                      OPSIONAL
                    </span>
                  </div>

                  {/* Jika User Punya Kupon Aktif di Akunnya, Tampilkan Quick Chips */}
                  {userKupons.filter((uk) => uk.status_kupon === "aktif").length > 0 && !appliedVoucher && (
                    <div style={{ marginBottom: 10 }}>
                      <div
                        style={{
                          fontSize: "0.74rem",
                          color: "var(--fg-muted)",
                          marginBottom: 6,
                          fontWeight: 600,
                        }}
                      >
                        <i
                          className="bx bx-gift"
                          style={{ color: "var(--gold)", marginRight: 4 }}
                        />
                        Voucher Anda yang tersedia (klik untuk gunakan):
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {userKupons
                          .filter((uk) => uk.status_kupon === "aktif")
                          .map((uk) => (
                            <button
                              key={uk.kupon_anggota_id}
                              type="button"
                              onClick={() => handleApplyVoucher(uk.kode_kupon)}
                              disabled={voucherLoading}
                              style={{
                                padding: "5px 10px",
                                borderRadius: 8,
                                border: "1px dashed var(--gold)",
                                background: "rgba(229, 120, 48, 0.08)",
                                color: "var(--gold)",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                transition: "all 0.2s",
                              }}
                            >
                              <i className="bx bx-purchase-tag-alt" />
                              <span>
                                {uk.judul} ({uk.nilai_reward})
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Input Kode Voucher & Tombol Terapkan */}
                  {!appliedVoucher ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Contoh: KAS-0001-ABCD atau kode promo"
                        value={voucherInput}
                        onChange={(e) =>
                          setVoucherInput(e.target.value.toUpperCase())
                        }
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          fontWeight: 700,
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyVoucher()}
                        disabled={voucherLoading || !voucherInput.trim()}
                        style={{
                          padding: "0 18px",
                          borderRadius: 10,
                          border: "none",
                          background: "var(--gold)",
                          color: "var(--cv-on-orange)",
                          fontWeight: 800,
                          fontSize: "0.85rem",
                          cursor:
                            voucherLoading || !voucherInput.trim()
                              ? "not-allowed"
                              : "pointer",
                          opacity:
                            voucherLoading || !voucherInput.trim() ? 0.6 : 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {voucherLoading ? (
                          <i className="bx bx-loader-alt bx-spin" />
                        ) : (
                          <i className="bx bx-check" />
                        )}
                        Gunakan Kupon
                      </button>
                    </div>
                  ) : (
                    /* Banner Voucher yang Sedang Aktif */
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        background: "rgba(185, 84, 16, 0.1)",
                        border: "1.5px solid #b95410",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: "#b95410",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.2rem",
                          }}
                        >
                          <i className="bx bx-badge-check" />
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: "0.9rem",
                              color: "#b95410",
                            }}
                          >
                            {appliedVoucher.judul}
                          </div>
                          <div
                            style={{
                              fontSize: "0.76rem",
                              color: "var(--fg-muted)",
                            }}
                          >
                            Kode: <strong>{appliedVoucher.kodeKupon}</strong> •
                            Potongan:{" "}
                            <strong style={{ color: "#b95410" }}>
                              Rp{" "}
                              {appliedVoucher.nominalPotongan.toLocaleString(
                                "id-ID",
                              )}{" "}
                              ({appliedVoucher.bulanGratis} Bulan)
                            </strong>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 8,
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#ef4444",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Batal Pakai
                      </button>
                    </div>
                  )}

                  {/* Feedback Voucher Alert */}
                  {voucherMsg && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color:
                          voucherMsg.type === "success" ? "#b95410" : "#ef4444",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <i
                        className={`bx ${voucherMsg.type === "success" ? "bx-check-circle" : "bx-x-circle"}`}
                      />
                      <span>{voucherMsg.msg}</span>
                    </div>
                  )}

                  {/* Rincian Kalkulasi Potongan Kas & Sisa Tagihan */}
                  {cleanNominalKas > 0 && appliedVoucher && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "12px 16px",
                        background: "color-mix(in srgb, var(--cv-ink) 50%, transparent)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: "0.82rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ color: "var(--fg-muted)" }}>
                          Total Iuran Kas (
                          {Math.max(1, Math.round(cleanNominalKas / 15000))}{" "}
                          Bulan):
                        </span>
                        <span style={{ fontWeight: 700 }}>
                          Rp {cleanNominalKas.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 8,
                          color: "#b95410",
                        }}
                      >
                        <span>
                          Potongan Voucher ({appliedVoucher.judul}):
                        </span>
                        <span style={{ fontWeight: 800 }}>
                          - Rp{" "}
                          {Math.min(
                            cleanNominalKas,
                            appliedVoucher.nominalPotongan,
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div
                        style={{
                          borderTop: "1px dashed var(--border)",
                          paddingTop: 8,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.95rem",
                          fontWeight: 900,
                        }}
                      >
                        <span>Sisa yang Harus Dibayar:</span>
                        <span
                          style={{
                            color:
                              Math.max(
                                0,
                                cleanNominalKas -
                                  appliedVoucher.nominalPotongan,
                              ) === 0
                                ? "#b95410"
                                : "var(--gold)",
                          }}
                        >
                          {Math.max(
                            0,
                            cleanNominalKas -
                              appliedVoucher.nominalPotongan,
                          ) === 0
                            ? "Rp 0 (LUNAS DENGAN VOUCHER)"
                            : `Rp ${(cleanNominalKas - appliedVoucher.nominalPotongan).toLocaleString("id-ID")}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── BUKTI BAYAR / QRIS CONTAINER JIKA TIDAK LUNAS PENUH DENGAN VOUCHER ── */}
                {appliedVoucher &&
                cleanNominalKas > 0 &&
                Math.max(0, cleanNominalKas - appliedVoucher.nominalPotongan) ===
                  0 ? (
                  <div
                    style={{
                      padding: "16px 20px",
                      borderRadius: 14,
                      background: "rgba(185, 84, 16, 0.12)",
                      border: "1.5px solid #b95410",
                      marginTop: 10,
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        color: "#b95410",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <i
                        className="bx bx-check-shield"
                        style={{ fontSize: "1.4rem" }}
                      />
                      <span>Tagihan Bebas Kas Lunas 100% dengan Voucher!</span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--fg-muted)",
                        margin: "6px 0 0",
                        lineHeight: 1.5,
                      }}
                    >
                      Seluruh iuran kas untuk periode ini ditanggung oleh voucher.
                      Anda tidak perlu melakukan pembayaran via QRIS ataupun
                      mengunggah bukti transfer.
                    </p>
                  </div>
                ) : (
                  <div className={styles.field}>
                    <div className={styles.labelRow}>
                      <label className={styles.label}>
                        Bukti Transfer / QRIS{" "}
                        {appliedVoucher ? "(Sisa Tagihan)" : ""}
                      </label>
                      <span className={styles.badgeWajib}>WAJIB</span>
                    </div>

                    {previewKas ? (
                      <div className={styles.previewWrap}>
                        <img
                          src={previewKas}
                          alt="Preview Bukti Kas"
                          className={styles.previewImg}
                        />
                        <button
                          type="button"
                          className={styles.removeFileBtn}
                          onClick={() => {
                            setFileKas(null);
                            setPreviewKas(null);
                          }}
                          title="Hapus gambar"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div className={styles.uploadBox}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const sel = e.target.files?.[0];
                            if (sel) {
                              setFileKas(sel);
                              setPreviewKas(URL.createObjectURL(sel));
                            }
                          }}
                          className={styles.fileInput}
                          required={
                            !(
                              appliedVoucher &&
                              cleanNominalKas > 0 &&
                              Math.max(
                                0,
                                cleanNominalKas -
                                  appliedVoucher.nominalPotongan,
                              ) === 0
                            )
                          }
                        />
                        <i
                          className={`bx bx-cloud-upload ${styles.uploadIcon}`}
                        />
                        <p className={styles.uploadText}>
                          Klik atau seret screenshot bukti bayar ke sini
                        </p>
                        <p className={styles.uploadHint}>
                          Format: JPG, PNG, WebP (Maks. 5MB)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submittingKas}
                  style={{
                    background:
                      appliedVoucher &&
                      cleanNominalKas > 0 &&
                      Math.max(
                        0,
                        cleanNominalKas - appliedVoucher.nominalPotongan,
                      ) === 0
                        ? "#b95410"
                        : undefined,
                    color:
                      appliedVoucher &&
                      cleanNominalKas > 0 &&
                      Math.max(
                        0,
                        cleanNominalKas - appliedVoucher.nominalPotongan,
                      ) === 0
                        ? "#fff"
                        : undefined,
                  }}
                >
                  {submittingKas ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" /> Mengirim
                      Konfirmasi...
                    </>
                  ) : appliedVoucher &&
                    cleanNominalKas > 0 &&
                    Math.max(
                      0,
                      cleanNominalKas - appliedVoucher.nominalPotongan,
                    ) === 0 ? (
                    <>
                      <i className="bx bx-gift" /> Konfirmasi Bebas Kas dengan
                      Voucher (Rp 0)
                    </>
                  ) : (
                    <>
                      <i className="bx bx-paper-plane" /> Kirim Konfirmasi Kas{" "}
                      {cleanNominalKas > 0
                        ? `(Rp ${Math.max(0, cleanNominalKas - (appliedVoucher ? appliedVoucher.nominalPotongan : 0)).toLocaleString("id-ID")})`
                        : ""}
                    </>
                  )}
                </button>
              </form>
            </div>
          ))}

        {/* ── TAB 2: RIWAYAT STATUS KAS ── */}
        {portalTab === "riwayat" && (
          <div className={`glassCard ${styles.dashCard}`}>
            <div className={styles.header}>
              <div className="badge">
                <i className="bx bx-history" /> Riwayat
              </div>
              <h2 className={styles.title}>Status Pembayaran Kas Anda</h2>
              <p className={styles.subtitle}>
                Pantau iuran kas bulanan Anda dan daftar konfirmasi kas yang
                telah dikirimkan.
              </p>
            </div>

            {/* ── BANNER TOTAL KESELURUHAN KAS (LINTAS TAHUN) ── */}
            {monthlyStatus.length > 0 && (() => {
              const totalLunas = monthlyStatus.filter(
                (s) => s.status === "diverifikasi"
              ).length;
              const totalNominal = monthlyStatus
                .filter((s) => s.status === "diverifikasi")
                .reduce((sum: number, s: any) => sum + (Number(s.nominal) || 0), 0);
              const tahunCovered = [...new Set(
                monthlyStatus
                  .filter((s) => s.status === "diverifikasi")
                  .map((s) => Number(s.tahun))
              )].sort() as number[];
              const isFullyPaid = totalLunas >= 12;
              return (
                <div
                  style={{
                    background: isFullyPaid
                      ? "linear-gradient(135deg, rgba(185, 84, 16, 0.12) 0%, rgba(185, 84, 16, 0.05) 100%)"
                      : "linear-gradient(135deg, rgba(229, 120, 48, 0.12) 0%, rgba(246, 154, 92, 0.06) 100%)",
                    border: isFullyPaid
                      ? "1.5px solid rgba(185, 84, 16, 0.35)"
                      : "1.5px solid var(--border-gold)",
                    borderRadius: 14,
                    padding: "16px 20px",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: isFullyPaid ? "#b95410" : "var(--gold)",
                      color: "var(--cv-on-orange)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.4rem",
                      flexShrink: 0,
                    }}
                  >
                    <i className={`bx ${isFullyPaid ? "bx-check-shield" : "bx-wallet"}`} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        color: "var(--primary)",
                        marginBottom: 4,
                      }}
                    >
                      Total Keseluruhan Kas
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 20,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", color: "var(--fg-muted)" }}>
                        Bulan Lunas:{" "}
                        <strong style={{ color: isFullyPaid ? "#b95410" : "var(--gold)" }}>
                          {totalLunas} Bulan
                        </strong>
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--fg-muted)" }}>
                        Total Dibayar:{" "}
                        <strong style={{ color: isFullyPaid ? "#b95410" : "var(--gold)" }}>
                          Rp {totalNominal.toLocaleString("id-ID")}
                        </strong>
                      </span>
                      {tahunCovered.length > 1 && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            background: "rgba(246, 154, 92, 0.15)",
                            border: "1px solid rgba(246, 154, 92, 0.3)",
                            borderRadius: 20,
                            padding: "2px 10px",
                            color: "#fab78b",
                            fontWeight: 700,
                          }}
                        >
                          <i className="bx bx-calendar" style={{ marginRight: 4 }} />
                          Mencakup {tahunCovered.join(" & ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── TRACKER IURAN BULANAN MEMBER (2024 - 2029) ── */}
            <div
              style={{
                background: "color-mix(in srgb, var(--cv-bone) 3%, transparent)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "16px 20px",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i
                    className="bx bx-calendar-check"
                    style={{ color: "var(--gold)", fontSize: "1.2rem" }}
                  />
                  Matriks Iuran Kas Tahun {trackerYear}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    background: "color-mix(in srgb, var(--cv-ink) 40%, transparent)",
                    borderRadius: 8,
                    padding: 3,
                    border: "1px solid var(--border)",
                  }}
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setTrackerYear(y)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        border: "none",
                        background:
                          trackerYear === y ? "var(--gold)" : "transparent",
                        color:
                          trackerYear === y ? "var(--cv-on-orange)" : "var(--fg-muted)",
                        fontWeight: trackerYear === y ? 800 : 600,
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* 12 Bulan Grid */}
              {(() => {
                let userJoinYear = 2024;
                let userJoinMonth = 1;
                const rawJoinDate =
                  sessionUser?.anggotaSejak || sessionUser?.createdAt;
                if (rawJoinDate) {
                  const jd = new Date(rawJoinDate);
                  if (!isNaN(jd.getTime())) {
                    userJoinYear = jd.getFullYear();
                    userJoinMonth = jd.getMonth() + 1;
                  }
                }

                const isBeforeJoinYear = trackerYear < userJoinYear;
                const isJoinYear = trackerYear === userJoinYear;
                const startRequiredMonth = isJoinYear
                  ? userJoinMonth
                  : isBeforeJoinYear
                    ? 13
                    : 1;
                const totalRequiredMonths = isBeforeJoinYear
                  ? 0
                  : isJoinYear
                    ? 12 - userJoinMonth + 1
                    : 12;
                const totalPaidThisYear = monthlyStatus.filter(
                  (s) =>
                    Number(s.tahun) === trackerYear &&
                    s.status === "diverifikasi",
                ).length;

                return (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(70px, 1fr))",
                        gap: 8,
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                        const isPaid = monthlyStatus.some(
                          (s) =>
                            Number(s.tahun) === trackerYear &&
                            Number(s.bulan) === m &&
                            s.status === "diverifikasi",
                        );
                        const isBeforeJoined =
                          isBeforeJoinYear || (isJoinYear && m < userJoinMonth);
                        const monthShort = [
                          "Jan",
                          "Feb",
                          "Mar",
                          "Apr",
                          "Mei",
                          "Jun",
                          "Jul",
                          "Agu",
                          "Sep",
                          "Okt",
                          "Nov",
                          "Des",
                        ][m - 1];

                        return (
                          <div
                            key={m}
                            style={{
                              padding: "10px 4px",
                              borderRadius: 10,
                              textAlign: "center",
                              background: isPaid
                                ? "rgba(185, 84, 16, 0.12)"
                                : isBeforeJoined
                                  ? "color-mix(in srgb, var(--cv-bone) 1%, transparent)"
                                  : "color-mix(in srgb, var(--cv-bone) 3%, transparent)",
                              border: isPaid
                                ? "1.5px solid rgba(185, 84, 16, 0.4)"
                                : "1px solid var(--border)",
                              opacity: isBeforeJoined && !isPaid ? 0.6 : 1,
                              transition: "all 0.2s",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "var(--fg-muted)",
                                marginBottom: 4,
                              }}
                            >
                              {monthShort}
                            </div>
                            <div
                              style={{
                                fontSize: "1.1rem",
                                color: isPaid ? "#b95410" : "var(--fg-muted)",
                              }}
                            >
                              {isPaid ? (
                                <i className="bx bx-check-circle" />
                              ) : isBeforeJoined ? (
                                <span
                                  style={{
                                    fontSize: "0.9rem",
                                    fontWeight: 700,
                                    color: "var(--fg-muted)",
                                  }}
                                >
                                  -
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: 14,
                                    height: 14,
                                    border: "1.5px solid rgba(156,163,175,0.4)",
                                    borderRadius: 3,
                                  }}
                                />
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: 800,
                                marginTop: 4,
                                color: isPaid ? "#b95410" : "var(--fg-muted)",
                              }}
                            >
                              {isPaid
                                ? "Lunas"
                                : isBeforeJoined
                                  ? "Bebas"
                                  : "Belum"}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                        fontSize: "0.78rem",
                        color: "var(--fg-muted)",
                      }}
                    >
                      <span>
                        Total Lunas {trackerYear}:{" "}
                        <strong style={{ color: "#b95410" }}>
                          {totalPaidThisYear} dari {totalRequiredMonths} Bulan
                          Wajib
                        </strong>
                        {isJoinYear &&
                          userJoinMonth > 1 &&
                          ` (Bergabung sejak ${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][userJoinMonth - 1]} ${userJoinYear})`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPortalTab("bayar")}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--gold)",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        Bayar Kas Sekarang{" "}
                        <i className="bx bx-right-arrow-alt" />
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Filter Bar Riwayat Transaksi Kas Per-Tahun */}
            {kasHistory.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                  padding: "12px 16px",
                  background: "color-mix(in srgb, var(--cv-bone) 3%, transparent)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i
                    className="bx bx-filter-alt"
                    style={{ color: "var(--gold)" }}
                  />
                  <span>Filter Riwayat Pembayaran:</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setFilterTahunRiwayat("semua")}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      border: "none",
                      background:
                        filterTahunRiwayat === "semua"
                          ? "var(--gold)"
                          : "color-mix(in srgb, var(--cv-bone) 6%, transparent)",
                      color:
                        filterTahunRiwayat === "semua"
                          ? "var(--cv-on-orange)"
                          : "var(--fg-muted)",
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    Semua ({kasHistory.length})
                  </button>
                  {[2026, 2025, 2024].map((yr) => {
                    const countInYear = kasHistory.filter((it) => {
                      const p = String(it.periode || "");
                      if (p.includes(String(yr))) return true;
                      const d = new Date(it.created_at || it.createdAt);
                      return !isNaN(d.getTime()) && d.getFullYear() === yr;
                    }).length;

                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setFilterTahunRiwayat(yr)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 20,
                          border: "none",
                          background:
                            filterTahunRiwayat === yr
                              ? "var(--gold)"
                              : "color-mix(in srgb, var(--cv-bone) 6%, transparent)",
                          color:
                            filterTahunRiwayat === yr
                              ? "var(--cv-on-orange)"
                              : "var(--fg-muted)",
                          fontWeight: 800,
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {yr} ({countInYear})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {loadingKasHistory ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--gold)",
                }}
              >
                <i
                  className="bx bx-loader-alt bx-spin"
                  style={{ fontSize: "2rem", marginBottom: "8px" }}
                />
                <p>Memuat riwayat...</p>
              </div>
            ) : kasHistory.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="bx bx-wallet" />
                <p>Belum ada riwayat pembayaran kas tercatat.</p>
              </div>
            ) : (
              (() => {
                const filteredList =
                  filterTahunRiwayat === "semua"
                    ? kasHistory
                    : kasHistory.filter((it) => {
                        const p = String(it.periode || "");
                        if (p.includes(String(filterTahunRiwayat))) return true;
                        const d = new Date(it.created_at || it.createdAt);
                        return (
                          !isNaN(d.getTime()) &&
                          d.getFullYear() === filterTahunRiwayat
                        );
                      });

                if (filteredList.length === 0) {
                  return (
                    <div className={styles.emptyState}>
                      <i className="bx bx-calendar-x" />
                      <p>
                        Tidak ada riwayat pembayaran kas tercatat pada tahun{" "}
                        {filterTahunRiwayat}.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className={styles.historyList}>
                    {filteredList.map((item) => {
                      let badgeClass = styles.badgePending;
                      let badgeText = "Menunggu Verifikasi";
                      if (item.status === "diverifikasi") {
                        badgeClass = styles.badgeDiverifikasi;
                        badgeText = "Diverifikasi";
                      } else if (item.status === "ditolak") {
                        badgeClass = styles.badgeDitolak;
                        badgeText = "Ditolak";
                      }

                      const rawDate = item.created_at || item.createdAt;
                      let dateFormatted = "-";
                      if (rawDate) {
                        const d = new Date(rawDate);
                        if (!isNaN(d.getTime())) {
                          dateFormatted = d.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        }
                      }
                      const proofUrl =
                        item.bukti_bayar_url || item.buktiBayarUrl;

                      return (
                        <div key={item.id} className={styles.historyItem}>
                          <div className={styles.historyLeft}>
                            <h4 className={styles.historyPeriode}>
                              {item.periode}
                            </h4>
                            <span className={styles.historyNominal}>
                              {formatRupiah(item.nominal)}
                            </span>
                            <span className={styles.historyDate}>
                              {dateFormatted}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: 8,
                            }}
                          >
                            <span className={badgeClass}>{badgeText}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                              {item.status === "diverifikasi" && (
                                <button
                                  type="button"
                                  className={styles.receiptBtn}
                                  onClick={() => setSelectedReceipt(item)}
                                  title="Buka & Cetak E-Kwitansi Resmi"
                                >
                                  <i className="bx bx-receipt" /> E-Kwitansi
                                </button>
                              )}
                              {proofUrl && (
                                <a
                                  href={proofUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={styles.viewProofBtn}
                                >
                                  <i className="bx bx-image" /> Lihat Bukti
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* ── TAB KUPON REWARD KAS (FITUR BARU APRESIASI KAS) ── */}
        {portalTab === "kupon" && (
          <div className={`glassCard ${styles.dashCard}`}>
            <div className={styles.header}>
              <div className="badge">
                <i className="bx bx-gift" /> Reward Kas Eksklusif
              </div>
              <h1 className={styles.title}>Kupon &amp; Voucher Reward Kas</h1>
              <p className={styles.subtitle}>
                Apresiasi khusus dari fanbase Cavallery untuk anggota yang
                tertib dan rajin membayar uang kas bulanan.
              </p>
            </div>

            {/* Banner Status Kas User */}
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(229, 120, 48, 0.15) 0%, rgba(246, 154, 92, 0.12) 100%)",
                border: "1.5px solid var(--border-gold)",
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "var(--gold)",
                    color: "var(--cv-on-orange)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                    fontWeight: 900,
                  }}
                >
                  <i className="bx bx-award" />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      color: "var(--primary)",
                    }}
                  >
                    Status Kas Anda:{" "}
                    {sessionUser?.jabatan === "Admin Fanbase"
                      ? "Pengurus Fanbase (Bebas Kas)"
                      : `${userLunasTahunIni} Bulan Lunas di Tahun ${new Date().getFullYear()}`}
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--fg-muted)",
                      marginTop: 2,
                    }}
                  >
                    {sessionUser?.jabatan === "Admin Fanbase"
                      ? "Sebagai pengurus resmi, Anda berhak menerima seluruh kupon apresiasi fanbase."
                      : userLunasTahunIni >= 6
                        ? "Hebat! Anda termasuk anggota super rajin dalam membayar kas."
                        : userLunasTahunIni > 0
                          ? "Terima kasih telah membayar kas. Terus jaga keaktifan Anda untuk membuka lebih banyak reward!"
                          : "Ayo bayar uang kas bulanan Anda untuk membuka berbagai kupon & reward eksklusif."}
                  </div>
                </div>
              </div>

              {sessionUser?.jabatan !== "Admin Fanbase" &&
                userLunasTahunIni < 12 && (
                  <button
                    type="button"
                    onClick={() => setPortalTab("bayar")}
                    className={styles.backBtn}
                    style={{
                      color: "var(--gold)",
                      borderColor: "var(--border-gold)",
                      fontSize: "0.82rem",
                    }}
                  >
                    <i className="bx bx-plus-circle" /> Bayar Kas Tambahan
                  </button>
                )}
            </div>

            {loadingUserKupons ? (
              <div className={styles.emptyState}>
                <i
                  className="bx bx-loader-alt bx-spin"
                  style={{ fontSize: "2rem", color: "var(--gold)" }}
                />
                <p>Memeriksa kupon reward Anda...</p>
              </div>
            ) : userKupons.length === 0 ? (
              <div
                className={styles.emptyState}
                style={{ padding: "40px 20px" }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "color-mix(in srgb, var(--cv-bone) 5%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: "1.8rem",
                    color: "var(--fg-muted)",
                  }}
                >
                  <i className="bx bx-purchase-tag-alt" />
                </div>
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: "var(--fg)",
                    marginBottom: 6,
                  }}
                >
                  Belum Ada Kupon Aktif
                </h3>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--fg-muted)",
                    maxWidth: 440,
                    margin: "0 auto 18px",
                    lineHeight: 1.5,
                  }}
                >
                  Kupon reward dibagikan secara berkala oleh pengurus fanbase
                  kepada anggota yang aktif membayar kas. Tingkatkan riwayat
                  pembayaran kas Anda agar tidak ketinggalan kupon berikutnya!
                </p>
                <button
                  type="button"
                  className={styles.submitBtn}
                  style={{ maxWidth: 240, margin: "0 auto" }}
                  onClick={() => setPortalTab("bayar")}
                >
                  <i className="bx bx-wallet" /> Bayar Uang Kas Sekarang
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {userKupons.map((k) => {
                  const isCopied = copiedKupon === k.kode_kupon;
                  const isUsed = k.status_kupon === "digunakan";

                  return (
                    <div
                      key={k.kupon_anggota_id}
                      style={{
                        background: "var(--card-bg, var(--cv-ink-1))",
                        border: isUsed
                          ? "1.5px solid var(--border)"
                          : "1.5px dashed var(--gold)",
                        borderRadius: 16,
                        padding: 18,
                        position: "relative",
                        overflow: "hidden",
                        opacity: isUsed ? 0.6 : 1,
                      }}
                    >
                      {/* Decorative Notch */}
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          background: isUsed ? "#64748b" : "var(--gold)",
                          color: "var(--cv-on-orange)",
                          padding: "4px 12px",
                          borderBottomLeftRadius: 10,
                          fontSize: "0.72rem",
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        {isUsed ? "Sudah Digunakan" : k.tipe_reward}
                      </div>

                      <div
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 800,
                          color: "var(--primary)",
                          marginTop: 10,
                          paddingRight: 60,
                        }}
                      >
                        {k.judul}
                      </div>

                      <div
                        style={{
                          fontSize: "1.4rem",
                          fontWeight: 900,
                          color: isUsed ? "var(--fg-muted)" : "var(--gold)",
                          margin: "8px 0",
                        }}
                      >
                        {k.nilai_reward}
                      </div>

                      {k.deskripsi && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--fg-muted)",
                            marginBottom: 14,
                            lineHeight: 1.4,
                          }}
                        >
                          {k.deskripsi}
                        </div>
                      )}

                      {/* Box Kode Kupon dengan Tombol Salin */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "color-mix(in srgb, var(--cv-ink) 60%, transparent)",
                          border: "1px solid var(--border)",
                          marginBottom: 12,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: "var(--fg-muted)",
                              textTransform: "uppercase",
                              fontWeight: 700,
                            }}
                          >
                            Kode Kupon
                          </div>
                          <div
                            style={{
                              fontSize: "1.1rem",
                              fontWeight: 900,
                              letterSpacing: "1px",
                              color: "var(--cv-text)",
                            }}
                          >
                            {k.kode_kupon}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isUsed}
                          onClick={() => {
                            navigator.clipboard.writeText(k.kode_kupon);
                            setCopiedKupon(k.kode_kupon);
                            setTimeout(() => setCopiedKupon(null), 2500);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "none",
                            background: isCopied ? "#b95410" : "var(--gold)",
                            color: isCopied ? "#fff" : "var(--cv-on-orange)",
                            fontWeight: 800,
                            fontSize: "0.78rem",
                            cursor: isUsed ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            transition: "all 0.2s",
                          }}
                        >
                          <i
                            className={`bx ${isCopied ? "bx-check" : "bx-copy"}`}
                          />
                          {isCopied ? "Tersalin!" : "Salin"}
                        </button>
                      </div>

                      {/* Tombol Langsung Gunakan Kupon di Form Bayar Kas */}
                      {!isUsed && (
                        <button
                          type="button"
                          onClick={() => handleUseCouponFromTab(k)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "1px solid var(--gold)",
                            background: "rgba(229, 120, 48, 0.15)",
                            color: "var(--gold)",
                            fontWeight: 800,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            marginBottom: 10,
                            transition: "all 0.2s",
                          }}
                        >
                          <i className="bx bx-check-circle" /> Gunakan untuk Bayar Kas
                        </button>
                      )}

                      {/* Footer Kupon: Kadaluarsa */}
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--fg-muted)",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          Syarat: Min. {k.min_bulan_kas} Bulan Kas {k.tahun_kas}
                        </span>
                        <span>
                          {k.kadaluarsa_pada
                            ? `Exp: ${new Date(k.kadaluarsa_pada).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
                            : "Tanpa Kadaluarsa"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: DONASI ── */}
        {portalTab === "donasi" && (
          <div className={`glassCard ${styles.dashCard}`}>
            <div className={styles.header}>
              <div className="badge">
                <i className="bx bx-donate-heart" /> Donasi Sukarela
              </div>
              <h1 className={styles.title}>Donasi Proyek Cavallery</h1>
              <p className={styles.subtitle}>
                Dukungan sukarela untuk perayaan ulang tahun, project fanbase,
                dan kegiatan bersama Erine.
              </p>
            </div>

            {/* QRIS Container */}
            <div className={styles.qrisWrap}>
              <img
                src="https://images.jkt48connect.com/cavallery/images/2026/09/b50e2fd04a9f4738.jpg"
                alt="QRIS Donasi Cavallery"
                className={styles.qrisImg}
              />
              <div className={styles.qrisNote}>
                <i className="bx bx-info-circle" />
                <span>
                  Donasi Anda 100% digunakan untuk pembiayaan project fanbase
                  Erine & kegiatan resmi Cavallery.
                </span>
              </div>
            </div>

            {donasiAlert && (
              <div
                className={`${styles.alertBox} ${
                  donasiAlert.type === "success"
                    ? styles.alertSuccess
                    : styles.alertError
                }`}
              >
                <i
                  className={`bx ${donasiAlert.type === "success" ? "bx-check-circle" : "bx-error-circle"}`}
                />
                <span>{donasiAlert.msg}</span>
              </div>
            )}

            <form onSubmit={handleDonasiSubmit} className={styles.form}>
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>Tipe Proyek / Donasi</label>
                  <span className={styles.badgeWajib}>WAJIB</span>
                </div>
                <select
                  className={styles.select}
                  value={tipeDonasi}
                  onChange={(e) => setTipeDonasi(e.target.value)}
                >
                  {donationTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>Nominal Donasi (Rp)</label>
                  <span className={styles.badgeWajib}>WAJIB</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.input}
                  placeholder="50.000"
                  value={nominalDonasi}
                  onChange={(e) => handleNominalDonasiChange(e.target.value)}
                  required
                />
                <div className={styles.chipsRow}>
                  {chipNominalsDonasi.map((nom) => (
                    <button
                      key={nom}
                      type="button"
                      className={`${styles.chip} ${selectedChipDonasi === nom ? styles.chipActive : ""}`}
                      onClick={() => {
                        setSelectedChipDonasi(nom);
                        setNominalDonasi(nom.toLocaleString("id-ID"));
                      }}
                    >
                      Rp {nom.toLocaleString("id-ID")}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`${styles.chip} ${selectedChipDonasi === "custom" ? styles.chipActive : ""}`}
                    onClick={() => setSelectedChipDonasi("custom")}
                  >
                    Nominal Lain
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>Bukti Transfer / QRIS</label>
                  <span className={styles.badgeWajib}>WAJIB</span>
                </div>

                {previewDonasi ? (
                  <div className={styles.previewWrap}>
                    <img
                      src={previewDonasi}
                      alt="Preview Bukti Donasi"
                      className={styles.previewImg}
                    />
                    <button
                      type="button"
                      className={styles.removeFileBtn}
                      onClick={() => {
                        setFileDonasi(null);
                        setPreviewDonasi(null);
                      }}
                      title="Hapus gambar"
                    >
                      &times;
                    </button>
                  </div>
                ) : (
                  <div className={styles.uploadBox}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const sel = e.target.files?.[0];
                        if (sel) {
                          setFileDonasi(sel);
                          setPreviewDonasi(URL.createObjectURL(sel));
                        }
                      }}
                      className={styles.fileInput}
                      required
                    />
                    <i className={`bx bx-cloud-upload ${styles.uploadIcon}`} />
                    <p className={styles.uploadText}>
                      Klik atau seret screenshot bukti donasi ke sini
                    </p>
                    <p className={styles.uploadHint}>
                      Format: JPG, PNG, WebP (Maks. 5MB)
                    </p>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submittingDonasi}
              >
                {submittingDonasi ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" /> Mengirim
                    Donasi...
                  </>
                ) : (
                  <>
                    <i className="bx bx-paper-plane" /> Kirim Konfirmasi Donasi
                  </>
                )}
              </button>
            </form>

            {/* ── RIWAYAT DONASI SAYA ── */}
            <div
              style={{
                marginTop: 32,
                paddingTop: 24,
                borderTop: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: 800,
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <i
                    className="bx bx-receipt"
                    style={{ color: "var(--gold)" }}
                  />
                  Riwayat Donasi Saya
                </h3>
                <span style={{ fontSize: "0.78rem", color: "var(--fg-muted)" }}>
                  {donasiHistory.length} kontribusi tercatat
                </span>
              </div>

              {loadingDonasiHistory ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px 0",
                    color: "var(--gold)",
                  }}
                >
                  <i
                    className="bx bx-loader-alt bx-spin"
                    style={{ fontSize: "1.8rem", marginBottom: 6 }}
                  />
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>
                    Memuat riwayat donasi...
                  </p>
                </div>
              ) : donasiHistory.length === 0 ? (
                <div
                  className={styles.emptyState}
                  style={{ padding: "28px 16px" }}
                >
                  <i
                    className="bx bx-donate-heart"
                    style={{ fontSize: "2.2rem" }}
                  />
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem" }}>
                    Belum ada riwayat donasi yang Anda kirimkan.
                  </p>
                </div>
              ) : (
                <div className={styles.donasiHistoryList}>
                  {donasiHistory.map((item) => {
                    let badgeClass = styles.badgePending;
                    let badgeText = "Menunggu Verifikasi";
                    if (item.status === "diverifikasi") {
                      badgeClass = styles.badgeDiverifikasi;
                      badgeText = "Diverifikasi";
                    } else if (item.status === "ditolak") {
                      badgeClass = styles.badgeDitolak;
                      badgeText = "Ditolak";
                    }

                    const rawDate = item.created_at || item.createdAt;
                    let dateFormatted = "-";
                    if (rawDate) {
                      const d = new Date(rawDate);
                      if (!isNaN(d.getTime())) {
                        dateFormatted = d.toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      }
                    }

                    const proofUrl = item.bukti_bayar_url || item.buktiBayarUrl;

                    return (
                      <div key={item.id} className={styles.donasiHistoryItem}>
                        <div className={styles.donasiHistoryLeft}>
                          <h4 className={styles.donasiTipe}>
                            {item.tipe_donasi ||
                              item.tipeDonasi ||
                              "General Support"}
                          </h4>
                          <span className={styles.donasiNominal}>
                            {formatRupiah(item.nominal)}
                          </span>
                          <span className={styles.donasiDate}>
                            <i
                              className="bx bx-time-five"
                              style={{ marginRight: 4 }}
                            />
                            {dateFormatted}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 8,
                          }}
                        >
                          <span className={badgeClass}>{badgeText}</span>
                          {proofUrl && (
                            <a
                              href={proofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.viewProofBtn}
                            >
                              <i className="bx bx-image" /> Lihat Bukti
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── LEADERBOARD DONATUR CAVALLERY ── */}
            <div className={styles.leaderboardCard}>
              <div className={styles.leaderboardHeader}>
                <h3 className={styles.leaderboardTitle}>
                  <i className="bx bxs-trophy" style={{ color: "#f5690b" }} />
                  Leaderboard Donatur Cavallery
                </h3>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--gold)",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <i className="bx bx-award" /> Top Kontributor Fanbase
                </span>
              </div>

              {loadingLeaderboard ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "30px 0",
                    color: "var(--gold)",
                  }}
                >
                  <i
                    className="bx bx-loader-alt bx-spin"
                    style={{ fontSize: "1.8rem", marginBottom: 6 }}
                  />
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>
                    Memuat leaderboard donatur...
                  </p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div
                  className={styles.emptyState}
                  style={{ padding: "24px 16px" }}
                >
                  <i className="bx bx-trophy" style={{ fontSize: "2.2rem" }} />
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem" }}>
                    Belum ada donasi terverifikasi di leaderboard.
                  </p>
                </div>
              ) : (
                <div className={styles.leaderboardList}>
                  {leaderboard.map((item, idx) => {
                    const rank = idx + 1;
                    let rankClass = styles.rankBadge;
                    let itemClass = styles.leaderboardItem;

                    if (rank === 1) {
                      rankClass = `${styles.rankBadge} ${styles.rankBadge1}`;
                      itemClass = `${styles.leaderboardItem} ${styles.leaderboardItemTop1}`;
                    } else if (rank === 2) {
                      rankClass = `${styles.rankBadge} ${styles.rankBadge2}`;
                      itemClass = `${styles.leaderboardItem} ${styles.leaderboardItemTop2}`;
                    } else if (rank === 3) {
                      rankClass = `${styles.rankBadge} ${styles.rankBadge3}`;
                      itemClass = `${styles.leaderboardItem} ${styles.leaderboardItemTop3}`;
                    }

                    return (
                      <div key={item.id || idx} className={itemClass}>
                        <div className={rankClass}>
                          {rank === 1 ? <i className="bx bxs-crown" /> : rank}
                        </div>

                        <div className={styles.donorInfo}>
                          <span className={styles.donorName}>
                            {item.donor_name || "Ksatria Cavallery"}
                          </span>
                          <span className={styles.donorMeta}>
                            <span
                              style={{
                                padding: "1px 6px",
                                borderRadius: 4,
                                background:
                                  item.donor_type === "Anggota"
                                    ? "rgba(204, 92, 17, 0.12)"
                                    : "rgba(245, 105, 11, 0.12)",
                                color:
                                  item.donor_type === "Anggota"
                                    ? "#f6863b"
                                    : "#f5690b",
                                fontWeight: 700,
                                fontSize: "0.68rem",
                              }}
                            >
                              {item.donor_type || "Donatur"}
                            </span>
                            <span>
                              • {item.tipe_donasi || "General Support"}
                            </span>
                          </span>
                        </div>

                        <div className={styles.donorNominal}>
                          {formatRupiah(item.nominal)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}


        {/* ── TAB 5: DAFTAR ADMIN & VOLUNTEER (KHUSUS ANGGOTA) ── */}
        {portalTab === "daftar" && sessionUser?.type === "anggota" && (
          <RoleApplicationPanel sessionUser={sessionUser} styles={styles} />
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── TAB 4: WAR TIKET PROJECT STS ERINE (TEAM PASSION FIRE) ── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {portalTab === "war" && (() => {
          const isWarClosed = Boolean(
            warEvent?.status === "tutup" ||
            warTimeLeft.isEnded ||
            (warEvent?.waktu_tutup_ms && Date.now() > warEvent.waktu_tutup_ms)
          );
          const isWarActive = Boolean(
            warEvent &&
            warEvent.status === "buka" &&
            (
              warTimeLeft.isStarted ||
              warEvent.is_war_active ||
              warEvent.is_started ||
              !warEvent.waktu_buka_ms ||
              Date.now() >= warEvent.waktu_buka_ms
            ) &&
            !isWarClosed
          );

          return (
            <div className={styles.warCard}>
              {/* Header Event */}
              <div className={styles.warCardHeader}>
                <div className={styles.warTitleWrap}>
                  <h2 className={styles.warMainTitle}>
                    <i className="bx bx-flame" style={{ color: "#ef4444" }} />
                    {(warEvent?.judul || "War Tiket Project STS Erine 20th").replace(/19th/gi, "20th").replace(/ke-19/gi, "ke-20")}
                  </h2>
                  <p className={styles.warSubtitle}>
                    {(warEvent?.deskripsi || "Akses khusus project perayaan Seitansai Catherina Vallencia (Erine) ke-20 bersama Cavallery Team Passion.")
                      .replace(/ke-19/gi, "ke-20")
                      .replace(/19th/gi, "20th")}
                  </p>
                </div>

                {/* Status Badge */}
                <div>
                  {loadingWar && !warEvent ? (
                    <span className={`${styles.warStatusBadge} ${styles.warStatusWaiting}`}>
                      <i className="bx bx-loader-alt bx-spin" /> Memuat...
                    </span>
                  ) : userWarTicket ? (
                    <span
                      className={styles.warStatusBadge}
                      style={{
                        background: "rgba(185, 84, 16, 0.15)",
                        border: "1px solid #b95410",
                        color: "#b95410",
                      }}
                    >
                      <i className="bx bx-check-circle" /> TIKET KAMU TERKONFIRMASI
                    </span>
                  ) : isWarClosed ? (
                    <span className={`${styles.warStatusBadge} ${styles.warStatusClosed}`}>
                      <i className="bx bx-lock-alt" /> WAR TELAH DITUTUP
                    </span>
                  ) : !isWarActive ? (
                    <span className={`${styles.warStatusBadge} ${styles.warStatusWaiting}`}>
                      <i className="bx bx-time-five" /> WAR BELUM DIBUKA
                    </span>
                  ) : warEvent && warEvent.kuota_terisi >= warEvent.kuota_total ? (
                    <span
                      className={styles.warStatusBadge}
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid #ef4444",
                        color: "#ef4444",
                      }}
                    >
                      <i className="bx bx-x-circle" /> KUOTA HABIS
                    </span>
                  ) : (
                    <span className={`${styles.warStatusBadge} ${styles.warStatusOpen}`}>
                      <i className="bx bx-broadcast" /> WAR SEDANG BERLANGSUNG
                    </span>
                  )}
                </div>
              </div>

            {/* Alert Message */}
            {warAlert && (
              <div
                style={{
                  padding: "12px 18px",
                  borderRadius: 14,
                  background:
                    warAlert.type === "success"
                      ? "rgba(185, 84, 16, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                  border: `1px solid ${warAlert.type === "success" ? "#b95410" : "#ef4444"}`,
                  color: warAlert.type === "success" ? "#b95410" : "#ef4444",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <i
                  className={`bx ${warAlert.type === "success" ? "bx-check-circle" : "bx-error-circle"}`}
                  style={{ fontSize: "1.2rem" }}
                />
                <span>{warAlert.msg}</span>
              </div>
            )}

            {/* ── JIKA USER SUDAH PUNYA TIKET: TAMPILKAN E-TICKET PASS MEWAH VIP STUB ── */}
            {userWarTicket ? (
              <div className={styles.warTicketPass}>
                <div className={styles.ticketTopBadge}>
                  {(warEvent?.kategori_tiket || "OFFICIAL VIP PASS • CAVALLERY")
                    .replace(/★/g, "")
                    .replace(/🔥/g, "")
                    .trim()}
                </div>

                <h2 className={styles.ticketEventTitle}>
                  {(warEvent?.judul || "PROJECT STS ERINE 20TH BIRTHDAY")
                    .replace(/19th/gi, "20th")
                    .replace(/ke-19/gi, "ke-20")}
                </h2>
                <div className={styles.ticketEventSub}>
                  {warEvent?.subjudul || "Cavallery • Fanbase Resmi Erine JKT48"}
                </div>

                <div className={styles.ticketNumberBadge}>
                  #{userWarTicket.nomor_tiket}
                </div>

                {/* Member Info Card */}
                <div className={styles.ticketOwnerCard}>
                  <div style={{ fontSize: "0.72rem", color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Pemegang Tiket Resmi
                  </div>
                  <h3 className={styles.ticketOwnerName}>
                    {userWarTicket.nama_lengkap || displayName}
                  </h3>
                  <div className={styles.ticketMetaRow}>
                    <span>No. Anggota: <strong style={{ color: "var(--gold)" }}>{userWarTicket.no_anggota || sessionUser.noAnggota}</strong></span>
                    <span>•</span>
                    <span className={styles.ticketStatusChip}>
                      <i className="bx bx-check-shield" /> Terverifikasi
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--gold)", fontWeight: 700, margin: "6px 0 2px" }}>
                    <i className="bx bx-map-pin" style={{ marginRight: 4 }} />
                    {warEvent?.lokasi_event || "Theater JKT48"} • {warEvent?.tanggal_event || "September 2026"}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--fg-muted)" }}>
                    Waktu Registrasi: {new Date(userWarTicket.waktu_klaim).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} • {new Date(userWarTicket.waktu_klaim).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                  </div>
                </div>

                {/* Perforated Tear Line */}
                <div className={styles.ticketPerforationLine}>
                  <div className={styles.ticketPerforationDash} />
                </div>

                {/* Stub QR & Barcode Section */}
                <div className={styles.ticketStubSection}>
                  <div className={styles.ticketQrBox}>
                    <div style={{ textAlign: "center" }}>
                      <i className="bx bx-qr-scan" style={{ fontSize: "4.2rem", color: "#1c1813" }} />
                      <div style={{ fontSize: "0.68rem", color: "var(--cv-text-mute)", fontWeight: 800, marginTop: 2 }}>
                        {userWarTicket.nomor_tiket}
                      </div>
                    </div>
                  </div>

                  <div className={styles.ticketBarcodeWrap}>
                    <div className={styles.ticketBarcodeLines}>
                      {[3, 1, 4, 2, 1, 5, 2, 3, 1, 4, 2, 1, 3, 5, 1, 2, 4, 1, 3, 2, 5, 1, 2, 4].map((w, i) => (
                        <div
                          key={i}
                          style={{
                            width: `${w * 1.8}px`,
                            height: "26px",
                            background: i % 2 === 0 ? "var(--fg)" : "transparent",
                            borderRadius: "1px",
                          }}
                        />
                      ))}
                    </div>
                    <div className={styles.ticketBarcodeNumber}>
                      *{warEvent?.kode_tiket || "STS20"}-{userWarTicket.nomor_tiket}-{userWarTicket.no_anggota || sessionUser.noAnggota}*
                    </div>
                  </div>
                </div>

                {/* Event Notice Box (Tinggal Datang & Tunjukkan, Tidak Perlu Diprint) */}
                <div className={styles.ticketNoticeBox}>
                  <i className={`bx bx-mobile ${styles.ticketNoticeIcon}`} />
                  <div>
                    <strong style={{ color: "var(--gold)", display: "block", marginBottom: 3 }}>
                      Tunjukkan Tiket di Ponsel pada Hari Acara
                    </strong>
                    Simpan gambar tiket ini di ponsel Anda. Pada hari acara, cukup tunjukkan e-ticket digital ini kepada panitia Cavallery di venue untuk penukaran wristband masuk. Tidak perlu dicetak/diprint.
                  </div>
                </div>

                {/* Tombol Unduh E-Ticket (Gambar PNG) */}
                <div style={{ width: "100%", marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={handleDownloadETicket}
                    disabled={downloadingTicket}
                    className={styles.ticketDownloadBtn}
                  >
                    {downloadingTicket ? (
                      <>
                        <i className="bx bx-loader-alt bx-spin" /> Menyiapkan Tiket HD...
                      </>
                    ) : (
                      <>
                        <i className="bx bx-download" /> Unduh E-Ticket (Simpan Gambar PNG)
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* ── JIKA BELUM PUNYA TIKET: COUNTDOWN + KUOTA + TOMBOL WAR ── */}
                {/* Countdown Timer (Hanya muncul jika belum buka & belum selesai) */}
                {!isWarActive && !isWarClosed && (
                  <div className={styles.warCountdownWrap}>
                    <div className={styles.countdownHeading}>
                      <i className="bx bx-alarm" /> Hitung Mundur War Tiket
                    </div>
                    <div className={styles.countdownBoxes}>
                      <div className={styles.countdownBox}>
                        <span className={styles.countdownNum}>
                          {String(warTimeLeft.days).padStart(2, "0")}
                        </span>
                        <span className={styles.countdownLabel}>Hari</span>
                      </div>
                      <div className={styles.countdownBox}>
                        <span className={styles.countdownNum}>
                          {String(warTimeLeft.hours).padStart(2, "0")}
                        </span>
                        <span className={styles.countdownLabel}>Jam</span>
                      </div>
                      <div className={styles.countdownBox}>
                        <span className={styles.countdownNum}>
                          {String(warTimeLeft.minutes).padStart(2, "0")}
                        </span>
                        <span className={styles.countdownLabel}>Menit</span>
                      </div>
                      <div className={styles.countdownBox}>
                        <span className={styles.countdownNum}>
                          {String(warTimeLeft.seconds).padStart(2, "0")}
                        </span>
                        <span className={styles.countdownLabel}>Detik</span>
                      </div>
                    </div>
                    <p style={{ fontSize: "0.78rem", color: "var(--fg-muted)", margin: 0 }}>
                      Tombol War akan otomatis aktif serentak saat hitung mundur mencapai 00:00:00.
                    </p>
                  </div>
                )}

                {/* Progress Kuota Tiket */}
                {warEvent && (
                  <div className={styles.warQuotaWrap}>
                    <div className={styles.quotaTextRow}>
                      <span style={{ color: "var(--fg-muted)" }}>
                        <i className="bx bx-group" style={{ marginRight: 4 }} />
                        Kuota Terisi: <strong>{warEvent.kuota_terisi} / {warEvent.kuota_total} Tiket</strong>
                      </span>
                      <span style={{ color: warEvent.sisa_kuota <= 5 ? "#ef4444" : "#b95410" }}>
                        <i className="bx bx-check-shield" style={{ marginRight: 4 }} />
                        Sisa Slot: <strong>{warEvent.sisa_kuota} Tiket</strong>
                      </span>
                    </div>
                    <div className={styles.quotaBarBg}>
                      <div
                        className={styles.quotaBarFill}
                        style={{
                          width: `${Math.min(100, Math.round((warEvent.kuota_terisi / warEvent.kuota_total) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Tombol Utama WAR TIKET */}
                <div style={{ marginTop: 8 }}>
                  {isWarClosed ? (
                    <button
                      type="button"
                      disabled
                      className={styles.warFlameBtn}
                      style={{
                        background: "#4b5563",
                        boxShadow: "none",
                        cursor: "not-allowed",
                      }}
                    >
                      <i className="bx bx-lock-alt" /> Periode War Tiket Telah Ditutup
                    </button>
                  ) : !isWarActive ? (
                    <button
                      type="button"
                      disabled
                      className={styles.warFlameBtn}
                      style={{ opacity: 0.6, cursor: "not-allowed", filter: "grayscale(40%)" }}
                    >
                      <i className="bx bx-time" /> War Belum Dibuka
                    </button>
                  ) : warEvent && warEvent.kuota_terisi >= warEvent.kuota_total ? (
                    <button
                      type="button"
                      disabled
                      className={styles.warFlameBtn}
                      style={{
                        background: "#4b5563",
                        boxShadow: "none",
                        cursor: "not-allowed",
                      }}
                    >
                      <i className="bx bx-x-circle" /> Mohon Maaf, Kuota Tiket Sudah Habis
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClaimWarTicket}
                      disabled={claimingWar}
                      className={styles.warFlameBtn}
                    >
                      {claimingWar ? (
                        <>
                          <i className="bx bx-loader-alt bx-spin" /> Memproses Antrean Tiket...
                        </>
                      ) : (
                        <>
                          <i className="bx bx-ticket" /> WAR TIKET SEKARANG
                        </>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Syarat & Ketentuan Card */}
            <div
              style={{
                background: "color-mix(in srgb, var(--cv-bone) 2%, transparent)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: "16px 20px",
                fontSize: "0.82rem",
                color: "var(--fg-muted)",
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  color: "var(--fg)",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="bx bx-info-circle" style={{ color: "var(--gold)" }} />
                Syarat &amp; Ketentuan War Tiket:
              </div>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                <li>Setiap 1 akun anggota Cavallery hanya berhak mendapatkan maksimal 1 tiket.</li>
                <li>Sistem mengalokasikan nomor tiket secara urut dan instan berdasarkan kecepatan klik server.</li>
                <li>E-Ticket yang diperoleh wajib ditunjukkan kepada panitia Cavallery saat verifikasi di venue.</li>
                <li>Tiket tidak dapat diperjualbelikan atau dipindahtangankan tanpa persetujuan admin.</li>
              </ul>
            </div>
          </div>
          );
        })()}
      </div>

      {/* ── MODAL POPUP VERIFIKASI ANGGOTA ── */}
      {showVerifyModal && (
        <div
          className={styles.verifyModalOverlay}
          onClick={() => setShowVerifyModal(false)}
        >
          <div
            className={styles.verifyModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.verifyLogoCircle}>
              <img
                src={
                  sessionUser.fotoProfil ||
                  sessionUser.foto_profil ||
                  "https://images.jkt48connect.com/cavallery/images/2026/09/cf207d2f32384a39.jpg"
                }
                alt={displayName}
              />
            </div>

            <h2 className={styles.verifyBrandTitle}>CAVALLERY</h2>

            <div className={styles.verifySubtitleRow}>
              <div className={styles.verifySubtitleLine} />
              <span className={styles.verifySubtitleText}>Verifikasi</span>
              <div className={styles.verifySubtitleLine} />
            </div>

            <span className={styles.verifyStatusBadge}>
              <i className="bx bxs-check-circle" />{" "}
              {sessionUser.status === "aktif"
                ? "Aktif"
                : sessionUser.status || "Aktif"}
            </span>

            <h3 className={styles.verifyMemberName}>{displayName}</h3>
            <p className={styles.verifyMemberCode}>
              {sessionUser.noAnggota || "CAVA-0001"}
            </p>

            <span className={styles.verifyRoleBadge}>
              {sessionUser.jabatan === "Admin Fanbase" ? (
                <>
                  <i className="bx bxs-crown" style={{ marginRight: 5 }} />{" "}
                  Admin Fanbase{" "}
                  {sessionUser.divisi ? `• ${sessionUser.divisi}` : ""}
                </>
              ) : (
                sessionUser.jabatan || "Anggota"
              )}
            </span>

            {sessionUser.type === "anggota" && (() => {
              const bDef = getMemberBadge(sessionUser.badge);
              return (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 14px",
                    borderRadius: 50,
                    background: bDef.bgColor,
                    border: `1px solid ${bDef.borderColor}`,
                    color: bDef.color,
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    marginTop: 6,
                    marginBottom: 4,
                  }}
                  title={bDef.description}
                >
                  <i className={`bx ${bDef.icon}`} /> Badge: {bDef.name}
                </span>
              );
            })()}

            <span className={styles.verifySinceText}>
              Anggota Sejak: {formattedJoinDate}
            </span>

            <button
              type="button"
              className={styles.verifyCloseBtn}
              onClick={() => setShowVerifyModal(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL PROMPT TAWARAN PIN LOGIN ── */}
      {showPinPromptModal && (
        <div
          className={styles.verifyModalOverlay}
          onClick={handleDismissPinPrompt}
        >
          <div
            className={styles.verifyModalCard}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420 }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(229, 120, 48, 0.15)",
                border: "2px solid rgba(229, 120, 48, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--gold)",
                fontSize: "1.8rem",
                margin: "0 auto 12px auto",
              }}
            >
              <i className="bx bxs-key" />
            </div>

            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--fg)", textAlign: "center", margin: 0 }}>
              {sessionUser?.hasPin ? "Ubah PIN Login" : "Tawaran PIN Login"}
            </h3>

            <p style={{ fontSize: "0.85rem", color: "var(--fg-muted)", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
              {sessionUser?.hasPin
                ? "Masukkan 4 hingga 6 digit angka numerik baru untuk memperbarui PIN login akun kamu."
                : "Tingkatkan kemudahan akses akunmu! Atur 4-6 angka PIN login agar kamu bisa masuk dengan lebih cepat tanpa repot mengetik ID LINE."}
            </p>

            {promptPinSuccess && (
              <div style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(185, 84, 16, 0.15)",
                border: "1px solid rgba(185, 84, 16, 0.3)",
                color: "#b95410",
                fontSize: "0.85rem",
                fontWeight: 700,
                textAlign: "center",
                marginTop: 12,
              }}>
                <i className="bx bx-check-circle" /> {promptPinSuccess}
              </div>
            )}

            {promptPinError && (
              <div style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                fontSize: "0.85rem",
                textAlign: "center",
                marginTop: 12,
              }}>
                <i className="bx bx-error-circle" /> {promptPinError}
              </div>
            )}

            <form onSubmit={handleSavePinPrompt} style={{ marginTop: 16 }}>
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label}>PIN (4-6 Digit Angka)</label>
                  <span className={styles.badgeWajib}>WAJIB</span>
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Contoh: 123456"
                  className={styles.input}
                  value={promptPinInput}
                  onChange={(e) => setPromptPinInput(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  required
                />
                <span className={styles.hint}>
                  Gunakan minimal 4 digit dan maksimal 6 digit angka numerik.
                </span>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={handleDismissPinPrompt}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "color-mix(in srgb, var(--cv-bone) 6%, transparent)",
                    border: "1px solid var(--cv-line)",
                    color: "var(--fg-muted)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Nanti Saja
                </button>
                <button
                  type="submit"
                  disabled={promptPinLoading || promptPinInput.length < 4}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--gold)",
                    border: "none",
                    color: "var(--cv-on-orange)",
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    cursor: promptPinLoading || promptPinInput.length < 4 ? "not-allowed" : "pointer",
                    opacity: promptPinLoading || promptPinInput.length < 4 ? 0.6 : 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {promptPinLoading ? (
                    <i className="bx bx-loader-alt bx-spin" />
                  ) : (
                    <i className="bx bx-save" />
                  )}
                  Simpan PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 3. MODAL E-KWITANSI DIGITAL RESMI CAVALLERY ── */}
      {selectedReceipt && (
        <div
          className={styles.receiptModalOverlay}
          onClick={() => setSelectedReceipt(null)}
        >
          <div
            className={styles.receiptModalCard}
            onClick={(e) => e.stopPropagation()}
            id="printable-receipt"
          >
            {/* Header Kwitansi */}
            <div className={styles.receiptHeader}>
              <div className={styles.receiptLogoWrap}>
                <img
                  src="/images/cava-logo.jpg"
                  alt="Cavallery Logo"
                  className={styles.receiptLogoImg}
                />
                <div>
                  <h3 className={styles.receiptBrandTitle}>CAVALLERY</h3>
                  <span className={styles.receiptBrandSub}>
                    Official Fanbase Catherina Vallencia (Erine JKT48)
                  </span>
                </div>
              </div>
              <div className={styles.receiptInvoiceBadge}>
                <span className={styles.receiptInvoiceLabel}>NO. KWITANSI</span>
                <span className={styles.receiptInvoiceNumber}>
                  KW-CAVA-{String(selectedReceipt.id || 0).padStart(5, "0")}
                </span>
              </div>
            </div>

            <div className={styles.receiptDivider} />

            {/* Title & Stempel Resmi */}
            <div className={styles.receiptTitleRow}>
              <div>
                <h2 className={styles.receiptDocTitle}>
                  KWITANSI PEMBAYARAN IURAN KAS
                </h2>
                <span className={styles.receiptDocSubtitle}>
                  Tanda bukti pembayaran iuran anggota resmi fanbase Cavallery
                </span>
              </div>
              <div className={styles.receiptStamp}>
                <div className={styles.stampInner}>
                  <i className="bx bxs-check-shield" />
                  <span className={styles.stampText}>LUNAS</span>
                  <span className={styles.stampSub}>BENDAHARA CAVALLERY</span>
                </div>
              </div>
            </div>

            {/* Rincian Pembayaran */}
            <div className={styles.receiptInfoGrid}>
              <div className={styles.receiptInfoItem}>
                <span className={styles.receiptInfoLabel}>Nama Anggota</span>
                <span className={styles.receiptInfoValue}>
                  {sessionUser?.namaLengkap || displayName}
                </span>
              </div>
              <div className={styles.receiptInfoItem}>
                <span className={styles.receiptInfoLabel}>No. Anggota (ID)</span>
                <span className={styles.receiptInfoValue}>
                  {sessionUser?.noAnggota || "-"}
                </span>
              </div>
              <div className={styles.receiptInfoItem}>
                <span className={styles.receiptInfoLabel}>Periode Kas</span>
                <span className={styles.receiptInfoValueHighlight}>
                  {selectedReceipt.periode}
                </span>
              </div>
              <div className={styles.receiptInfoItem}>
                <span className={styles.receiptInfoLabel}>Tanggal Pembayaran</span>
                <span className={styles.receiptInfoValue}>
                  {(() => {
                    const rawDate = selectedReceipt.created_at || selectedReceipt.createdAt;
                    if (!rawDate) return "-";
                    const d = new Date(rawDate);
                    return isNaN(d.getTime())
                      ? "-"
                      : d.toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        });
                  })()}
                </span>
              </div>
            </div>

            {/* Kotak Nominal Besar */}
            <div className={styles.receiptAmountBox}>
              <div>
                <span className={styles.receiptAmountLabel}>JUMLAH DIBAYARKAN</span>
                <h1 className={styles.receiptAmountValue}>
                  {formatRupiah(selectedReceipt.nominal)}
                </h1>
              </div>
              <div className={styles.receiptStatusPill}>
                <i className="bx bx-check-double" />
                <span>Terverifikasi Sah</span>
              </div>
            </div>

            {/* Note & Footer */}
            <div className={styles.receiptFooterRow}>
              <p className={styles.receiptNote}>
                * Kwitansi digital ini merupakan dokumen tanda terima sah yang diterbitkan oleh Sistem Informasi Kas Fanbase Cavallery. Terima kasih atas dukungan dan loyalitasmu untuk Erine & Cavallery!
              </p>
              <div className={styles.receiptSignature}>
                <span className={styles.sigDate}>
                  Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <div className={styles.sigImgWrap}>
                  <i className="bx bx-badge-check" style={{ color: "var(--gold)", fontSize: "2rem" }} />
                </div>
                <span className={styles.sigTitle}>Divisi Bendahara & Keuangan</span>
                <span className={styles.sigOrg}>Cavallery Official</span>
              </div>
            </div>

            {/* Action Buttons (Hidden when printing) */}
            <div className={styles.receiptActions}>
              <button
                type="button"
                className={styles.receiptPrintBtn}
                onClick={() => window.print()}
              >
                <i className="bx bx-printer" /> Cetak / Simpan PDF
              </button>
              <button
                type="button"
                className={styles.receiptCloseBtn}
                onClick={() => setSelectedReceipt(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. MODAL KARTU TANDA ANGGOTA (KTA) RESMI CAVALLERY ── */}
      {showKtaModal && isMounted && createPortal(
        <div
          className={styles.ktaModalOverlay}
          onClick={() => {
            setShowKtaModal(false);
            setEditingTtl(false);
          }}
        >
          <div
            className={styles.ktaModalCard}
            onClick={(e) => e.stopPropagation()}
            id="printable-kta"
            role="dialog"
            aria-modal="true"
            aria-label="KTA Digital Cavallery"
          >
            {/* Top Toolbar (Non-printable) */}
            <div className={styles.ktaToolbar}>
              <div className={styles.ktaToolbarTitle}>
                <i className="bx bx-id-card" style={{ color: "var(--gold)", fontSize: "1.2rem" }} />
                <span>KTA Digital Cavallery</span>
              </div>
              <div className={styles.ktaControlsRow}>
                {/* Side Segmented Control: Depan | Belakang */}
                <div className={styles.ktaSegmentedControl}>
                  <button
                    type="button"
                    className={`${styles.ktaSegmentBtn} ${ktaCardSide === "front" ? styles.ktaSegmentBtnActive : ""}`}
                    onClick={() => setKtaCardSide("front")}
                  >
                    <i className="bx bx-id-card" /> Depan
                  </button>
                  <button
                    type="button"
                    className={`${styles.ktaSegmentBtn} ${ktaCardSide === "back" ? styles.ktaSegmentBtnActive : ""}`}
                    onClick={() => setKtaCardSide("back")}
                  >
                    <i className="bx bx-barcode" /> Belakang
                  </button>
                </div>

                {/* Theme Segmented Control: Resmi | Luxury */}
                <div className={styles.ktaSegmentedControl}>
                  <button
                    type="button"
                    className={`${styles.ktaSegmentBtn} ${ktaCardTheme === "resmi" ? styles.ktaSegmentBtnActive : ""}`}
                    onClick={() => setKtaCardTheme("resmi")}
                  >
                    Resmi
                  </button>
                  <button
                    type="button"
                    className={`${styles.ktaSegmentBtn} ${ktaCardTheme === "luxury" ? styles.ktaSegmentBtnActive : ""}`}
                    onClick={() => setKtaCardTheme("luxury")}
                  >
                    Luxury
                  </button>
                </div>

                {/* iOS DeviceOrientation Sensor Permission Button */}
                {iosSensorNeeded && !iosSensorGranted && (
                  <button
                    type="button"
                    className={styles.ktaIosSensorBtn}
                    onClick={handleRequestIosSensor}
                    title="Izinkan sensor gerak untuk efek kilau holografik"
                  >
                    <i className="bx bx-compass" /> Efek Kilau
                  </button>
                )}

                {/* Fitur 2: Mode Privat Toggle Button */}
                <button
                  type="button"
                  className={`${styles.ktaPrivacyToggleBtn} ${privacyMode ? styles.ktaPrivacyToggleBtnActive : ""}`}
                  onClick={handleTogglePrivacyMode}
                  title={privacyMode ? "Mode privat aktif (data sensitif disamarkan)" : "Aktifkan mode privat"}
                >
                  <i className={privacyMode ? "bx bx-hide" : "bx bx-show"} />
                  <span>{privacyMode ? "Mode privat: Aktif" : "Mode privat: Nonaktif"}</span>
                </button>

                {/* Fitur 3: Bagikan Kartu Button */}
                <button
                  type="button"
                  className={styles.ktaShareToolbarBtn}
                  onClick={() => setShowShareModal(true)}
                  title="Bagikan Kartu Anggota ke Media Sosial"
                >
                  <i className="bx bx-share-alt" /> Bagikan
                </button>

                <button
                  type="button"
                  className={styles.ktaToolbarBtn}
                  onClick={handleToggleEditTtl}
                  title="Lengkapi Biodata KTA"
                >
                  <i className="bx bx-edit" /> {editingTtl ? "Tutup Form" : "Edit Biodata"}
                </button>
                <button
                  type="button"
                  className={styles.ktaToolbarPrintBtn}
                  onClick={() => window.print()}
                  title="Cetak atau Simpan KTA sebagai PDF"
                >
                  <i className="bx bx-printer" /> Cetak / PDF
                </button>
                <button
                  type="button"
                  className={styles.ktaCloseBtn}
                  onClick={() => {
                    setShowKtaModal(false);
                    setEditingTtl(false);
                  }}
                >
                  <i className="bx bx-x" />
                </button>
              </div>
            </div>

            {/* Privacy Notification Toast */}
            {privacyToastMsg && (
              <div className={styles.ktaPrivacyToast}>
                <i className="bx bx-check-circle" /> {privacyToastMsg}
              </div>
            )}

            {/* Form Edit Biodata KTA */}
            {editingTtl && (
              <form onSubmit={handleSaveTtl} className={styles.ktaTtlEditForm}>
                <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--gold)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bx bx-user-circle" /> Lengkapi Biodata Kartu Anggota
                </div>
                <div className={styles.ktaTtlGrid}>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--fg-muted)", display: "block", marginBottom: 4, fontWeight: 700 }}>
                      Tempat Lahir (Kota)
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Contoh: Jakarta"
                      value={inputTempatLahir}
                      onChange={(e) => setInputTempatLahir(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--fg-muted)", display: "block", marginBottom: 4, fontWeight: 700 }}>
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      className={styles.input}
                      value={inputTanggalLahir}
                      onChange={(e) => setInputTanggalLahir(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.72rem", color: "var(--fg-muted)", display: "block", marginBottom: 4, fontWeight: 700 }}>
                      Jenis Kelamin
                    </label>
                    <select
                      className={styles.input}
                      value={inputGender}
                      onChange={(e) => setInputGender(e.target.value)}
                    >
                      <option value="LAKI-LAKI">Laki-laki</option>
                      <option value="PEREMPUAN">Perempuan</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: "0.72rem", color: "var(--fg-muted)", display: "block", marginBottom: 4, fontWeight: 700 }}>
                      Domisili / Alamat
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Contoh: Bandung, Jawa Barat"
                      value={inputDomisili}
                      onChange={(e) => setInputDomisili(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => setEditingTtl(false)}
                    className={styles.secondaryBtn}
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingTtl}
                    className={styles.submitBtn}
                    style={{ padding: "6px 14px", fontSize: "0.8rem", width: "auto" }}
                  >
                    {savingTtl ? <i className="bx bx-loader-alt bx-spin" /> : <i className="bx bx-save" />} Simpan Biodata
                  </button>
                </div>
              </form>
            )}

            {ttlSuccessMsg && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(185, 84, 16, 0.15)", color: "#b95410", fontSize: "0.82rem", fontWeight: 700, margin: "10px 0" }}>
                <i className="bx bx-check-circle" /> {ttlSuccessMsg}
              </div>
            )}

            {/* Hint Ketuk Kartu untuk 3D Flip */}
            <div
              className={styles.ktaFlipHint}
              onClick={() => setKtaCardSide((s) => (s === "front" ? "back" : "front"))}
              title="Ketuk kartu untuk membalik sisi depan & belakang"
            >
              <i className="bx bx-sync" />
              <span>
                Ketuk kartu untuk membalik (3D Flip: Sisi {ktaCardSide === "front" ? "Depan" : "Belakang"})
              </span>
            </div>

            {/* ── 3D FLIP KTA CARD (CR-80 PORTRAIT 54:86) DENGAN TILT WRAPPER (FITUR 1) ── */}
            <div
              className={styles.ktaCardScene}
              onPointerMove={handleCardPointerMove}
              onPointerLeave={handleCardPointerLeave}
              onClick={() => setKtaCardSide((s) => (s === "front" ? "back" : "front"))}
              title="Ketuk kartu untuk membalik"
            >
              <div className={styles.ktaCardTiltWrapper} ref={tiltCardRef}>
                <div
                  className={`${styles.ktaCard3DWrapper} ${
                    ktaCardSide === "back" ? styles.ktaCard3DWrapperFlipped : ""
                  }`}
                >
                  {/* ── SISI DEPAN (FRONT FACE) ── */}
                  <div
                    className={`${styles.ktaCardFaceFront} ${
                      ktaCardTheme === "luxury" ? styles.ktaThemeLuxury : styles.ktaThemeResmi
                    }`}
                    style={{
                      pointerEvents: ktaCardSide === "front" ? "auto" : "none",
                    }}
                  >
                    {/* Efek Kilau Holografik (Fitur 1) */}
                    {ktaCardTheme === "luxury" ? (
                      <div className={styles.ktaHoloOverlayLuxury} />
                    ) : (
                      <div className={styles.ktaHoloOverlayResmi} />
                    )}

                    {/* Subtle Chess Knight Watermark */}
                    <i className={`fa-solid fa-chess-knight ${styles.ktaWatermarkChess}`} />

                    <div className={styles.ktaCardContentLayer}>
                      {/* Front Header */}
                      <div className={styles.ktaFrontHeader}>
                        <div className={styles.ktaHeaderBrand}>
                          <img
                            src="/images/cava-logo-round.png"
                            alt="Cavallery"
                            className={styles.ktaLogoImg}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/images/cava-logo.jpg";
                            }}
                          />
                          <div className={styles.ktaHeaderText}>
                            <h2 className={styles.ktaFrontHeaderTitle}>KARTU TANDA ANGGOTA</h2>
                            <span className={styles.ktaFrontHeaderSub}>FANBASE CAVALLERY</span>
                          </div>
                        </div>
                        <div className={styles.ktaGarudaBadge}>
                          <i className="fa-solid fa-chess-knight" />
                          <span>CAVA</span>
                        </div>
                      </div>

                      {/* Top Row: Passport Photo + No. Kartu & Status */}
                      <div className={styles.ktaTopRow}>
                        <div
                          className={styles.ktaPhotoFrame}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowKtaModal(false);
                            avatarFileInputRef.current?.click();
                          }}
                          title="Klik untuk pasang / ubah foto profil"
                        >
                          <img
                            src={
                              sessionUser.fotoProfil ||
                              sessionUser.foto_profil ||
                              "https://images.jkt48connect.com/cavallery/images/2026/09/cf207d2f32384a39.jpg"
                            }
                            alt={displayName}
                            className={styles.ktaPassportImg}
                          />
                          <div className={styles.ktaPhotoChangeOverlay}>
                            <i className="bx bx-camera" />
                            <span>Ganti Foto</span>
                          </div>
                        </div>

                        <div className={styles.ktaCardMetaRight}>
                          <div className={styles.ktaCardNoBlock}>
                            <span className={styles.ktaCardNoLabel}>Nomor Anggota</span>
                            <span className={styles.ktaCardNoValue}>
                              {sessionUser.noAnggota || "CAVA-0001"}
                            </span>
                          </div>
                          <div className={styles.ktaStatusBadgeRow}>
                            <span className={styles.ktaStatusBadgeActive}>
                              <i className="bx bxs-badge-check" />{" "}
                              {sessionUser.status === "aktif"
                                ? "AKTIF"
                                : (sessionUser.status || "AKTIF").toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Nama Anggota */}
                      <div className={styles.ktaNameBlock}>
                        <div className={styles.ktaMemberName}>
                          {sessionUser.namaLengkap || displayName}
                        </div>
                        <div className={styles.ktaMemberHandle}>
                          {sessionUser.idLine
                            ? `@${sessionUser.idLine}`
                            : sessionUser.kontakId || displayName}
                        </div>
                      </div>

                      {/* Biodata Grid 2 Kolom (dengan masking Mode Privat Fitur 2) */}
                      <div className={styles.ktaBiodataGrid}>
                        <div className={styles.ktaBioItem}>
                          <span className={styles.ktaBioLabel}>Jenis kelamin</span>
                          <span className={styles.ktaBioValue}>
                            {sessionUser.gender || "Laki-laki"}
                          </span>
                        </div>

                        {/* Tempat, Tgl Lahir (Sensitive Field) */}
                        <div className={styles.ktaBioItem}>
                          <span className={styles.ktaBioLabel}>Tempat, tgl lahir</span>
                          {privacyMode && !revealedPrivateFields ? (
                            <div className={styles.ktaMaskedValueRow}>
                              <span className={styles.ktaMaskedValue}>••••••••••</span>
                              <button
                                type="button"
                                className={styles.ktaRevealBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevealPrivateFields();
                                }}
                                disabled={revealingPrivate}
                                title="Tampilkan data asli selama 15 detik"
                              >
                                {revealingPrivate ? (
                                  <i className="bx bx-loader-alt bx-spin" />
                                ) : (
                                  <><i className="bx bx-show" /> Tampilkan</>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className={styles.ktaBioValue}>
                              {(() => {
                                const tempat = revealedPrivateFields
                                  ? revealedPrivateFields.tempatLahir
                                  : sessionUser.tempatLahir;
                                const tanggal = revealedPrivateFields
                                  ? revealedPrivateFields.tanggalLahir
                                  : sessionUser.tanggalLahir;
                                if (tempat && tanggal) {
                                  return `${tempat}, ${formatIndoDate(tanggal)}`;
                                }
                                if (tanggal) return formatIndoDate(tanggal);
                                return "Belum diisi";
                              })()}
                              {revealedPrivateFields && (
                                <span style={{ fontSize: "0.62rem", color: "#f5690b", marginLeft: 4, fontWeight: 700 }}>
                                  ({revealCountdown}s)
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Alamat Domisili (Sensitive Field) */}
                        <div className={styles.ktaBioItem}>
                          <span className={styles.ktaBioLabel}>Alamat domisili</span>
                          {privacyMode && !revealedPrivateFields ? (
                            <div className={styles.ktaMaskedValueRow}>
                              <span className={styles.ktaMaskedValue}>••••••••••</span>
                              <button
                                type="button"
                                className={styles.ktaRevealBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevealPrivateFields();
                                }}
                                disabled={revealingPrivate}
                                title="Tampilkan data asli selama 15 detik"
                              >
                                {revealingPrivate ? (
                                  <i className="bx bx-loader-alt bx-spin" />
                                ) : (
                                  <><i className="bx bx-show" /> Tampilkan</>
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className={styles.ktaBioValue}>
                              {(revealedPrivateFields ? revealedPrivateFields.domisili : sessionUser.domisili) || "Indonesia"}
                              {revealedPrivateFields && (
                                <span style={{ fontSize: "0.62rem", color: "#f5690b", marginLeft: 4, fontWeight: 700 }}>
                                  ({revealCountdown}s)
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        <div className={styles.ktaBioItem}>
                          <span className={styles.ktaBioLabel}>Oshi</span>
                          <span className={styles.ktaBioValue}>
                            <i
                              className="bx bxs-heart"
                              style={{ color: "#ef4444", marginRight: 3, fontSize: "0.75rem" }}
                            />
                            Catherina Vallencia K.
                          </span>
                        </div>
                        <div className={styles.ktaBioItem} style={{ gridColumn: "1 / -1" }}>
                          <span className={styles.ktaBioLabel}>Masa berlaku</span>
                          <span className={styles.ktaBioValue} style={{ letterSpacing: "0.04em" }}>
                            SEUMUR HIDUP
                          </span>
                        </div>
                      </div>

                      {/* Front Footer */}
                      <div className={styles.ktaFrontFooter}>
                        <div className={styles.ktaFrontSecurityTag}>
                          <i className="bx bx-shield-quarter" />
                          <span>Fanbase Cavallery • Sejak {formattedJoinDate}</span>
                        </div>
                        <div className={styles.ktaHoloChip} title="Holographic Security Chip" />
                      </div>
                    </div>
                  </div>

                  {/* ── SISI BELAKANG (BACK FACE) ── */}
                  <div
                    className={`${styles.ktaCardFaceBack} ${
                      ktaCardTheme === "luxury" ? styles.ktaThemeLuxury : styles.ktaThemeResmi
                    }`}
                    style={{
                      pointerEvents: ktaCardSide === "back" ? "auto" : "none",
                    }}
                  >
                    {/* Efek Kilau Holografik Belakang (Fitur 1) */}
                    {ktaCardTheme === "luxury" ? (
                      <div className={styles.ktaHoloOverlayLuxury} />
                    ) : (
                      <div className={styles.ktaHoloOverlayResmi} />
                    )}

                    {/* Subtle Chess Knight Watermark */}
                    <i className={`fa-solid fa-chess-knight ${styles.ktaWatermarkChess}`} />

                    <div className={styles.ktaCardContentLayer}>
                      {/* Back Header */}
                      <div className={styles.ktaBackHeader}>
                        <div className={styles.ktaHeaderBrand}>
                          <img
                            src="/images/cava-logo-round.png"
                            alt="Cavallery"
                            className={styles.ktaLogoImg}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/images/cava-logo.jpg";
                            }}
                          />
                          <div className={styles.ktaHeaderText}>
                            <h2 className={styles.ktaBackHeaderTitle}>KETENTUAN PENGGUNAAN</h2>
                            <span className={styles.ktaFrontHeaderSub}>OFFICIAL FANBASE CAVALLERY</span>
                          </div>
                        </div>
                        <div className={styles.ktaGarudaBadge}>
                          <i className="fa-solid fa-chess-knight" />
                          <span>CAVA</span>
                        </div>
                      </div>

                      {/* Center QR Container */}
                      <div className={styles.ktaQrContainer}>
                        <div className={styles.ktaQrWhiteBox}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(
                              typeof window !== "undefined" && publicCode && publicCardEnabled
                                ? `${window.location.origin}/v/${publicCode}`
                                : sessionUser.noAnggota || "CAVA-0001"
                            )}`}
                            alt="QR Code Anggota"
                            className={styles.ktaQrImg}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"><rect width="140" height="140" fill="%23ffffff"/><text x="50%" y="45%" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23111111">${sessionUser.noAnggota || "CAVA-0001"}</text><text x="50%" y="65%" text-anchor="middle" font-family="sans-serif" font-size="9" fill="%23666666">VERIFIKASI RESMI</text></svg>`;
                            }}
                          />
                        </div>
                        <div className={styles.ktaQrCaption}>
                          Scan untuk Verifikasi Keanggotaan
                        </div>
                      </div>

                      {/* Terms List (3 Ketentuan) */}
                      <div className={styles.ktaTermsList}>
                        <div className={styles.ktaTermsItem}>
                          <span className={styles.ktaTermsNumber}>1</span>
                          <span>
                            KTA Digital ini sah sebagai tanda pengenal resmi pendukung Erine JKT48.
                          </span>
                        </div>
                        <div className={styles.ktaTermsItem}>
                          <span className={styles.ktaTermsNumber}>2</span>
                          <span>
                            Wajib ditunjukkan untuk presensi event, gathering, &amp; merchandise fanbase.
                          </span>
                        </div>
                        <div className={styles.ktaTermsItem}>
                          <span className={styles.ktaTermsNumber}>3</span>
                          <span>
                            Hak cipta &amp; kepemilikan kartu berada di bawah naungan Fanbase Cavallery.
                          </span>
                        </div>
                      </div>

                      {/* Signature & Barcode Row */}
                      <div className={styles.ktaBackSignatureRow}>
                        <div className={styles.ktaDecorativeBarcode}>
                          <div className={styles.ktaBarcodeLines} />
                          <span className={styles.ktaBarcodeNum}>
                            {sessionUser.noAnggota || "CAVA-0001"}
                          </span>
                        </div>
                        <div className={styles.ktaSignatureBox}>
                          <div className={styles.ktaSignatureImg}>Cavallery Management</div>
                          <span className={styles.ktaSignatureTitle}>Official Fanbase</span>
                        </div>
                      </div>

                      {/* Back Footer Note */}
                      <div className={styles.ktaBackFooterNote}>
                        Diterbitkan oleh Fanbase Cavallery • Terdaftar Sejak {formattedJoinDate}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className={styles.ktaCardNotice}>
              * KTA Digital ini diterbitkan resmi oleh Fanbase Cavallery untuk identitas pendukung Erine JKT48. Tunjukkan KTA ini untuk verifikasi event, photobooth, &amp; pembagian merchandise.
            </p>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL BAGIKAN KARTU PUBLIK (FITUR 3) ── */}
      {showShareModal && isMounted && createPortal(
        <div
          className={styles.ktaShareModalOverlay}
          onClick={() => setShowShareModal(false)}
        >
          <div
            className={styles.ktaShareModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.ktaShareHeader}>
              <h3 className={styles.ktaShareHeaderTitle}>
                <i className="bx bx-share-alt" style={{ color: "var(--gold)" }} />
                <span>Bagikan Kartu Anggota</span>
              </h3>
              <button
                type="button"
                className={styles.ktaCloseBtn}
                onClick={() => setShowShareModal(false)}
              >
                <i className="bx bx-x" />
              </button>
            </div>

            {/* Ratio Toggle: 4:5 (Feed/Post) | 9:16 (Story) */}
            <div className={styles.ktaShareRatioToggle}>
              <button
                type="button"
                className={`${styles.ktaShareRatioBtn} ${shareRatio === "4:5" ? styles.ktaShareRatioBtnActive : ""}`}
                onClick={() => setShareRatio("4:5")}
              >
                4:5 (Feed / Post)
              </button>
              <button
                type="button"
                className={`${styles.ktaShareRatioBtn} ${shareRatio === "9:16" ? styles.ktaShareRatioBtnActive : ""}`}
                onClick={() => setShareRatio("9:16")}
              >
                9:16 (Story)
              </button>
            </div>

            {/* Public Link Settings */}
            <div className={styles.ktaSharePublicSettings}>
              <div className={styles.ktaShareToggleRow}>
                <div>
                  <div className={styles.ktaShareToggleLabel}>Aktifkan Tautan Kartu Publik</div>
                  <div className={styles.ktaShareToggleDesc}>
                    Siapa saja yang memiliki tautan dapat memverifikasi kartu ini
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={publicCardEnabled}
                  onChange={handleTogglePublicCard}
                  disabled={togglingPublic}
                  style={{ width: 20, height: 20, accentColor: "#e47327", cursor: "pointer" }}
                />
              </div>

              {publicCardEnabled && (
                <>
                  <div className={styles.ktaShareUrlBox}>
                    <span className={styles.ktaShareUrlText}>
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/v/${publicCode || ""}`
                        : `/v/${publicCode || ""}`}
                    </span>
                    <button
                      type="button"
                      className={styles.ktaShareCopyBtn}
                      onClick={() => {
                        const url = `${window.location.origin}/v/${publicCode}`;
                        navigator.clipboard.writeText(url);
                        setCopiedShareUrl(true);
                        setTimeout(() => setCopiedShareUrl(false), 2500);
                      }}
                    >
                      {copiedShareUrl ? "Tersalin!" : "Salin Tautan"}
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.ktaShareRegenBtn}
                    onClick={handleRegeneratePublicCode}
                    disabled={regeneratingCode}
                  >
                    {regeneratingCode ? "Membuat kode baru..." : "Ganti Kode Tautan"}
                  </button>
                </>
              )}
            </div>

            {/* Sanitized Card Preview for Export (Zero private data) */}
            <div className={styles.ktaShareExportPreviewWrapper}>
              <div
                ref={exportCardRef}
                className={`${styles.ktaExportCard} ${
                  shareRatio === "4:5" ? styles.ktaExportCard45 : styles.ktaExportCard916
                } ${ktaCardTheme === "luxury" ? styles.ktaThemeLuxury : styles.ktaThemeResmi}`}
              >
                {/* Subtle background effects & watermark */}
                {ktaCardTheme === "luxury" ? (
                  <div className={styles.ktaHoloOverlayLuxury} />
                ) : (
                  <div className={styles.ktaHoloOverlayResmi} />
                )}
                <i className={`fa-solid fa-chess-knight ${styles.ktaWatermarkChess}`} />

                {/* Header */}
                <div className={styles.ktaFrontHeader}>
                  <div className={styles.ktaHeaderBrand}>
                    <img
                      src="/images/cava-logo-round.png"
                      alt="Cavallery"
                      className={styles.ktaLogoImg}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/images/cava-logo.jpg";
                      }}
                    />
                    <div className={styles.ktaHeaderText}>
                      <h2 className={styles.ktaFrontHeaderTitle}>KARTU TANDA ANGGOTA</h2>
                      <span className={styles.ktaFrontHeaderSub}>FANBASE CAVALLERY</span>
                    </div>
                  </div>
                  <div className={styles.ktaGarudaBadge}>
                    <i className="fa-solid fa-chess-knight" />
                    <span>CAVA</span>
                  </div>
                </div>

                {/* Body: Photo + No. Kartu & Status */}
                <div className={styles.ktaTopRow} style={{ marginTop: 10 }}>
                  <div className={styles.ktaPhotoFrame}>
                    <img
                      src={
                        sessionUser.fotoProfil
                          ? `/api/kta/proxy-image?url=${encodeURIComponent(sessionUser.fotoProfil)}`
                          : "https://images.jkt48connect.com/cavallery/images/2026/09/cf207d2f32384a39.jpg"
                      }
                      alt={displayName}
                      className={styles.ktaPassportImg}
                      crossOrigin="anonymous"
                    />
                  </div>
                  <div className={styles.ktaCardMetaRight}>
                    <div className={styles.ktaCardNoBlock}>
                      <span className={styles.ktaCardNoLabel}>Nomor Anggota</span>
                      <span className={styles.ktaCardNoValue}>
                        {sessionUser.noAnggota || "CAVA-0001"}
                      </span>
                    </div>
                    <div className={styles.ktaStatusBadgeRow}>
                      <span className={styles.ktaStatusBadgeActive}>
                        <i className="bx bxs-badge-check" />{" "}
                        {sessionUser.status === "aktif"
                          ? "AKTIF"
                          : (sessionUser.status || "AKTIF").toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.ktaNameBlock}>
                  <div className={styles.ktaMemberName}>
                    {sessionUser.namaLengkap || displayName}
                  </div>
                  <div className={styles.ktaMemberHandle}>
                    {sessionUser.idLine
                      ? `@${sessionUser.idLine}`
                      : sessionUser.kontakId || displayName}
                  </div>
                </div>

                {/* Safe Sanitized Data Summary (No address, no TTL, no gender) */}
                <div className={styles.ktaBiodataGrid} style={{ marginTop: 8 }}>
                  <div className={styles.ktaBioItem}>
                    <span className={styles.ktaBioLabel}>Oshi</span>
                    <span className={styles.ktaBioValue}>
                      <i className="bx bxs-heart" style={{ color: "#ef4444", marginRight: 3, fontSize: "0.75rem" }} />
                      Catherina Vallencia
                    </span>
                  </div>
                  <div className={styles.ktaBioItem}>
                    <span className={styles.ktaBioLabel}>Anggota Sejak</span>
                    <span className={styles.ktaBioValue}>
                      {formattedJoinDate}
                    </span>
                  </div>
                </div>

                {/* QR Code to public verification */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "auto",
                    paddingTop: 8,
                    borderTop: "1px dashed rgba(228, 115, 39, 0.3)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--gold)" }}>
                      VERIFIKASI RESMI
                    </span>
                    <span style={{ fontSize: "0.55rem", opacity: 0.75 }}>
                      Scan QR untuk keaslian KTA
                    </span>
                  </div>
                  <div style={{ background: "#ffffff", padding: 3, borderRadius: 6 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=0&data=${encodeURIComponent(
                        typeof window !== "undefined"
                          ? `${window.location.origin}/v/${publicCode || sessionUser.noAnggota || "kta"}`
                          : `/v/${publicCode || "kta"}`
                      )}`}
                      alt="QR Verifikasi"
                      style={{ width: 44, height: 44, display: "block" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.ktaShareActionButtonsRow}>
              <button
                type="button"
                className={styles.ktaSharePrimaryActionBtn}
                onClick={handleExportPng}
                disabled={exportingPng}
              >
                {exportingPng ? (
                  <i className="bx bx-loader-alt bx-spin" />
                ) : (
                  <i className="bx bx-download" />
                )}
                <span>{exportingPng ? "Mengunduh..." : "Simpan Gambar (PNG)"}</span>
              </button>
              <button
                type="button"
                className={styles.ktaShareSecondaryActionBtn}
                onClick={handleWebShare}
                disabled={sharingWeb}
              >
                {sharingWeb ? (
                  <i className="bx bx-loader-alt bx-spin" />
                ) : (
                  <i className="bx bx-share" />
                )}
                <span>Bagikan</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 5. MODAL VIDEO / UCAPAN ULANG TAHUN DARI ERINE ── */}
      {showBirthdayModal && (
        <div
          className={styles.birthdayModalOverlay}
          onClick={() => setShowBirthdayModal(false)}
        >
          <div
            className={styles.birthdayModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animasi Festive Header */}
            <div className={styles.birthdayFestiveHeader}>
              <div className={styles.birthdayPartyBadge}>
                <i className="bx bxs-party" /> SPECIAL BIRTHDAY SURPRISE
              </div>
              <h2 className={styles.birthdayTitle}>
                Selamat Ulang Tahun, {displayName}! 🎂🎉
              </h2>
              <span className={styles.birthdaySubtitle}>
                Ada ucapan hangat dan pesan cinta dari Oshi kesayanganmu, Erine JKT48!
              </span>
            </div>

            {/* Video Ucapan Ultah dari Erine */}
            <div className={styles.birthdayMediaCard}>
              <div className={styles.birthdayMediaImgWrap}>
                <video
                  src="/uploads/cavallery/images/2026/10/1792059374525_1792059217614.mp4"
                  className={styles.birthdayMediaImg}
                  autoPlay
                  controls
                  playsInline
                  style={{ objectFit: "cover", objectPosition: "center 20%", width: "100%", maxHeight: "360px" }}
                />
              </div>
            </div>

            {/* Surat Pesan Hangat Personal dari Erine */}
            <div className={styles.birthdayLetterBox}>
              <div className={styles.birthdayLetterHeader}>
                <i className="bx bxs-heart" style={{ color: "#ef4444", fontSize: "1.2rem" }} />
                <span>Pesan Spesial dari Erine:</span>
              </div>
              <p className={styles.birthdayLetterText}>
                "Halo {displayName}! 💙
                <br /><br />
                Selamat ulang tahun yaa! 🎉✨ Di hari yang sangat istimewa ini, Erine mau mengucapkan terima kasih yang sebesar-besarnya karena kamu sudah selalu setia ada di samping Erine, memberi semangat, dan mendukung perjalanan Erine di JKT48 bersama keluarga Cavallery.
                <br /><br />
                Semoga di usiamu yang baru ini, kamu selalu diberikan kesehatan yang prima, kebahagiaan yang melimpah, dan segala impianmu segera terwujud! Terus dampingi dan temani Erine yaa sampai kita meraih panggung yang lebih tinggi lagi!
                <br /><br />
                <strong>Hadir dengan seribu kejutan, Checkmate! ♟️💙✨</strong>"
              </p>
              <div className={styles.birthdayLetterSignature}>
                <span className={styles.erineSigName}>— Catherina Vallencia (Erine)</span>
                <span className={styles.erineSigTeam}>Team Passion • JKT48 Generasi 12</span>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.birthdayActionsRow}>
              <button
                type="button"
                className={styles.birthdayCloseBtn}
                onClick={() => setShowBirthdayModal(false)}
              >
                Terima Kasih, Erine! 💙
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
