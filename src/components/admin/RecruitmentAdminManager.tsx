"use client";

import { useEffect, useState, useCallback } from "react";
import type {
  Recruitment,
  RecruitmentQuestion,
  QuestionType,
  RecruitmentSubmission,
} from "@/lib/dynamicRecruitment";
import DynamicRecruitmentForm from "@/components/recruitment/DynamicRecruitmentForm";

const QUESTION_TYPES: { type: QuestionType; label: string; icon: string }[] = [
  { type: "text", label: "Teks Singkat", icon: "bx-font" },
  { type: "textarea", label: "Teks Paragraf / Alasan", icon: "bx-align-left" },
  { type: "select", label: "Pilihan Dropdown (Select)", icon: "bx-list-ul" },
  { type: "radio", label: "Pilihan Tunggal (Radio)", icon: "bx-radio-circle-marked" },
  { type: "checkbox", label: "Pilihan Ganda / Persetujuan (Checkbox)", icon: "bx-checkbox-checked" },
  { type: "email", label: "Alamat Email", icon: "bx-envelope" },
  { type: "phone", label: "Nomor WhatsApp / HP", icon: "bx-phone" },
  { type: "number", label: "Angka", icon: "bx-hash" },
  { type: "social_handle", label: "Username Medsos (@handle)", icon: "bx-at" },
  { type: "url", label: "Tautan / Link Portofolio", icon: "bx-link" },
  { type: "date", label: "Tanggal", icon: "bx-calendar" },
  { type: "file", label: "Upload File / Berkas", icon: "bx-upload" },
];

export default function RecruitmentAdminManager() {
  const [activeTab, setActiveTab] = useState<"recruitments" | "submissions">("recruitments");
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Selected Recruitment for Question Builder or Submissions
  const [selectedRecruitment, setSelectedRecruitment] = useState<Recruitment | null>(null);
  const [questions, setQuestions] = useState<RecruitmentQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Recruitment CRUD Modal
  const [showRecModal, setShowRecModal] = useState(false);
  const [editingRec, setEditingRec] = useState<Recruitment | null>(null);
  const [recForm, setRecForm] = useState({
    title: "",
    slug: "",
    role_id: "member",
    description: "",
    start_date: "",
    end_date: "",
    is_active: true,
  });

  // Question CRUD Modal
  const [showQModal, setShowQModal] = useState(false);
  const [editingQ, setEditingQ] = useState<RecruitmentQuestion | null>(null);
  const [qForm, setQForm] = useState<{
    label: string;
    field_key: string;
    type: QuestionType;
    placeholder: string;
    help_text: string;
    is_required: boolean;
    options: string[];
    newOptionInput: string;
    validation: any;
    is_active: boolean;
  }>({
    label: "",
    field_key: "",
    type: "text",
    placeholder: "",
    help_text: "",
    is_required: false,
    options: [],
    newOptionInput: "",
    validation: {},
    is_active: true,
  });

  // Clone Questions Modal
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState<string>("");

  // Live Form Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Submissions State
  const [submissions, setSubmissions] = useState<RecruitmentSubmission[]>([]);
  const [subStatusFilter, setSubStatusFilter] = useState("all");
  const [subSearch, setSubSearch] = useState("");
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [statusUpdateNotes, setStatusUpdateNotes] = useState("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Recruitments
  const loadRecruitments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/recruitments?t=" + Date.now());
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRecruitments(json.data);
          // Set default selected recruitment if not selected
          if (!selectedRecruitment && json.data.length > 0) {
            setSelectedRecruitment(json.data[0]);
          }
        }
      }
    } catch {
      showToast("Gagal memuat daftar rekrutmen", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedRecruitment]);

  // Load Questions for Selected Recruitment
  const loadQuestions = useCallback(async (recId: number) => {
    setLoadingQuestions(true);
    try {
      const res = await fetch(`/api/admin/recruitments/${recId}/questions?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setQuestions(json.data);
        }
      }
    } catch {
      showToast("Gagal memuat pertanyaan rekrutmen", "error");
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  // Load Submissions for Selected Recruitment
  const loadSubmissions = useCallback(
    async (recId: number) => {
      setLoadingSubmissions(true);
      try {
        const url = `/api/admin/recruitments/${recId}/submissions?status=${subStatusFilter}&q=${encodeURIComponent(
          subSearch
        )}&t=${Date.now()}`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setSubmissions(json.data);
          }
        }
      } catch {
        showToast("Gagal memuat pendaftar rekrutmen", "error");
      } finally {
        setLoadingSubmissions(false);
      }
    },
    [subStatusFilter, subSearch]
  );

  useEffect(() => {
    loadRecruitments();
  }, [loadRecruitments]);

  useEffect(() => {
    if (selectedRecruitment) {
      if (activeTab === "recruitments") {
        loadQuestions(selectedRecruitment.id);
      } else {
        loadSubmissions(selectedRecruitment.id);
      }
    }
  }, [selectedRecruitment, activeTab, loadQuestions, loadSubmissions]);

  // ─────────────────────────────────────────────────────────────
  // RECRUITMENT HANDLERS
  // ─────────────────────────────────────────────────────────────

  const handleOpenRecModal = (rec?: Recruitment) => {
    if (rec) {
      setEditingRec(rec);
      setRecForm({
        title: rec.title,
        slug: rec.slug,
        role_id: rec.role_id,
        description: rec.description || "",
        start_date: rec.start_date ? rec.start_date.slice(0, 10) : "",
        end_date: rec.end_date ? rec.end_date.slice(0, 10) : "",
        is_active: Boolean(rec.is_active),
      });
    } else {
      setEditingRec(null);
      setRecForm({
        title: "",
        slug: "",
        role_id: "member",
        description: "",
        start_date: "",
        end_date: "",
        is_active: true,
      });
    }
    setShowRecModal(true);
  };

  const handleSaveRecruitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recForm.title.trim()) {
      showToast("Judul rekrutmen wajib diisi", "error");
      return;
    }

    try {
      const url = editingRec
        ? `/api/admin/recruitments/${editingRec.id}`
        : `/api/admin/recruitments`;
      const method = editingRec ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recForm),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showToast(json.message || "Rekrutmen berhasil disimpan!");
      setShowRecModal(false);
      loadRecruitments();
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan rekrutmen", "error");
    }
  };

  const handleDeleteRecruitment = async (rec: Recruitment) => {
    if (
      !confirm(
        `Yakin ingin menghapus rekrutmen "${rec.title}"? Data akan dicadangkan ke arsip trash.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/recruitments/${rec.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showToast(json.message || "Rekrutmen berhasil dihapus!");
      if (selectedRecruitment?.id === rec.id) setSelectedRecruitment(null);
      loadRecruitments();
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus rekrutmen", "error");
    }
  };

  const handleToggleRecActive = async (rec: Recruitment) => {
    try {
      const newActive = !rec.is_active;
      const res = await fetch(`/api/admin/recruitments/${rec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showToast(`Status rekrutmen berhasil diubah menjadi ${newActive ? "Aktif" : "Nonaktif"}!`);
      loadRecruitments();
      if (selectedRecruitment?.id === rec.id) {
        setSelectedRecruitment({ ...rec, is_active: newActive });
      }
    } catch (err: any) {
      showToast(err.message || "Gagal mengubah status", "error");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // QUESTION HANDLERS
  // ─────────────────────────────────────────────────────────────

  const handleOpenQModal = (q?: RecruitmentQuestion) => {
    if (q) {
      setEditingQ(q);
      setQForm({
        label: q.label,
        field_key: q.field_key,
        type: q.type,
        placeholder: q.placeholder || "",
        help_text: q.help_text || "",
        is_required: Boolean(q.is_required),
        options: Array.isArray(q.options) ? [...q.options] : [],
        newOptionInput: "",
        validation: q.validation || {},
        is_active: Boolean(q.is_active),
      });
    } else {
      setEditingQ(null);
      setQForm({
        label: "",
        field_key: "",
        type: "text",
        placeholder: "",
        help_text: "",
        is_required: false,
        options: [],
        newOptionInput: "",
        validation: {},
        is_active: true,
      });
    }
    setShowQModal(true);
  };

  const handleAddOption = () => {
    if (!qForm.newOptionInput.trim()) return;
    if (qForm.options.includes(qForm.newOptionInput.trim())) {
      showToast("Pilihan tersebut sudah ada", "error");
      return;
    }
    setQForm((prev) => ({
      ...prev,
      options: [...prev.options, prev.newOptionInput.trim()],
      newOptionInput: "",
    }));
  };

  const handleRemoveOption = (index: number) => {
    setQForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecruitment) return;
    if (!qForm.label.trim()) {
      showToast("Label pertanyaan wajib diisi", "error");
      return;
    }

    try {
      const payload = {
        label: qForm.label.trim(),
        field_key: qForm.field_key.trim() || undefined,
        type: qForm.type,
        placeholder: qForm.placeholder.trim() || null,
        help_text: qForm.help_text.trim() || null,
        is_required: qForm.is_required ? 1 : 0,
        options: ["select", "radio", "checkbox"].includes(qForm.type) ? qForm.options : null,
        validation: Object.keys(qForm.validation).length > 0 ? qForm.validation : null,
        is_active: qForm.is_active ? 1 : 0,
      };

      const url = editingQ
        ? `/api/admin/recruitments/questions/${editingQ.id}`
        : `/api/admin/recruitments/${selectedRecruitment.id}/questions`;
      const method = editingQ ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showToast(json.message || "Pertanyaan berhasil disimpan!");
      setShowQModal(false);
      loadQuestions(selectedRecruitment.id);
      loadRecruitments();
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan pertanyaan", "error");
    }
  };

  const handleDeleteQuestion = async (q: RecruitmentQuestion) => {
    if (!confirm(`Hapus pertanyaan "${q.label}"?`)) return;

    try {
      const res = await fetch(`/api/admin/recruitments/questions/${q.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showToast(json.message || "Pertanyaan berhasil dihapus!");
      if (selectedRecruitment) {
        loadQuestions(selectedRecruitment.id);
        loadRecruitments();
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus pertanyaan", "error");
    }
  };

  const handleToggleQActive = async (q: RecruitmentQuestion) => {
    try {
      const newActive = !q.is_active;
      const res = await fetch(`/api/admin/recruitments/questions/${q.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showToast(`Pertanyaan dinonaktifkan / diaktifkan!`);
      if (selectedRecruitment) {
        loadQuestions(selectedRecruitment.id);
        loadRecruitments();
      }
    } catch (err: any) {
      showToast(err.message || "Gagal mengubah status pertanyaan", "error");
    }
  };

  // Reorder Questions (Move Up / Down)
  const handleMoveQuestion = async (index: number, direction: "up" | "down") => {
    if (!selectedRecruitment) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const newQuestions = [...questions];
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIdx];
    newQuestions[targetIdx] = temp;

    setQuestions(newQuestions);

    const orderedIds = newQuestions.map((item) => item.id);
    try {
      const res = await fetch(
        `/api/admin/recruitments/${selectedRecruitment.id}/reorder-questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui urutan", "error");
      loadQuestions(selectedRecruitment.id);
    }
  };

  // Clone Questions Handler
  const handleCloneQuestions = async () => {
    if (!selectedRecruitment || !cloneSourceId) {
      showToast("Pilih rekrutmen sumber untuk disalin", "error");
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/recruitments/${selectedRecruitment.id}/clone-questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceRecruitmentId: cloneSourceId }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showToast(json.message || "Pertanyaan berhasil disalin!");
      setShowCloneModal(false);
      loadQuestions(selectedRecruitment.id);
      loadRecruitments();
    } catch (err: any) {
      showToast(err.message || "Gagal menyalin pertanyaan", "error");
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUBMISSION DETAIL & STATUS HANDLERS
  // ─────────────────────────────────────────────────────────────

  const handleOpenSubmissionDetail = async (sub: RecruitmentSubmission) => {
    try {
      const res = await fetch(`/api/admin/recruitments/submissions/${sub.id}?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSelectedSubmission(json.data);
          setStatusUpdateNotes(json.data.notes || "");
        }
      }
    } catch {
      showToast("Gagal memuat detail jawaban pendaftar", "error");
    }
  };

  const handleUpdateStatus = async (
    subId: number,
    newStatus: "pending" | "approved" | "rejected"
  ) => {
    try {
      const res = await fetch(`/api/admin/recruitments/submissions/${subId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes: statusUpdateNotes }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showToast(`Status pendaftar diubah menjadi ${newStatus}!`);
      if (selectedSubmission && selectedSubmission.id === subId) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus, notes: statusUpdateNotes });
      }
      if (selectedRecruitment) loadSubmissions(selectedRecruitment.id);
    } catch (err: any) {
      showToast(err.message || "Gagal mengubah status pendaftar", "error");
    }
  };

  const handleDeleteSubmission = async (subId: number) => {
    if (!confirm("Hapus data pendaftar ini? Data akan disimpan ke arsip trash.")) return;

    try {
      const res = await fetch(`/api/admin/recruitments/submissions/${subId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);

      showToast("Pendaftar berhasil dihapus (tersimpan di trash)!");
      setSelectedSubmission(null);
      if (selectedRecruitment) loadSubmissions(selectedRecruitment.id);
    } catch (err: any) {
      showToast(err.message || "Gagal menghapus pendaftar", "error");
    }
  };

  return (
    <div style={{ padding: "10px 0" }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "12px",
            backgroundColor: toast.type === "success" ? "#065f46" : "#991b1b",
            color: "#ffffff",
            fontWeight: 600,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <i className={toast.type === "success" ? "bx bx-check-circle" : "bx bx-error"} />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Main Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
          paddingBottom: "16px",
          borderBottom: "1px solid var(--cv-line, rgba(255,255,255,0.1))",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.45rem",
              fontWeight: 800,
              color: "var(--fg, #f5efe6)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              margin: 0,
            }}
          >
            <i className="bx bx-slider-alt" style={{ color: "var(--cv-orange, #ff6b1a)" }} />
            Master Dynamic Recruitment & Formulir Join
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "var(--fg-muted, #a3978c)" }}>
            Kelola pertanyaan form join tanpa ubah kode, atur urutan, validasi, dan kelola pendaftar masuk.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => handleOpenRecModal()}
            style={{
              padding: "9px 16px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #ff6b1a, #d9500b)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <i className="bx bx-plus-circle" /> Tambah Rekrutmen
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          borderBottom: "1.5px solid var(--border, rgba(255,255,255,0.08))",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("recruitments")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom:
              activeTab === "recruitments"
                ? "3px solid var(--cv-orange, #ff6b1a)"
                : "3px solid transparent",
            color: activeTab === "recruitments" ? "var(--cv-orange, #ff6b1a)" : "var(--fg-muted, #a3978c)",
            fontWeight: activeTab === "recruitments" ? 700 : 500,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <i className="bx bx-edit" /> Kelola Rekrutmen & Pertanyaan ({recruitments.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("submissions")}
          style={{
            padding: "10px 18px",
            background: "none",
            border: "none",
            borderBottom:
              activeTab === "submissions"
                ? "3px solid var(--cv-orange, #ff6b1a)"
                : "3px solid transparent",
            color: activeTab === "submissions" ? "var(--cv-orange, #ff6b1a)" : "var(--fg-muted, #a3978c)",
            fontWeight: activeTab === "submissions" ? 700 : 500,
            fontSize: "0.95rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <i className="bx bx-user-check" /> Data Pendaftar (Submissions)
        </button>
      </div>

      {/* Recruitment Selector Bar */}
      <div
        style={{
          background: "var(--surface, rgba(24, 20, 18, 0.6))",
          border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
          borderRadius: "14px",
          padding: "14px 18px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fg-muted, #a3978c)" }}>
            Pilih Rekrutmen:
          </span>
          <select
            value={selectedRecruitment?.id || ""}
            onChange={(e) => {
              const rec = recruitments.find((r) => r.id === Number(e.target.value));
              if (rec) setSelectedRecruitment(rec);
            }}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1.5px solid var(--border, rgba(255,255,255,0.15))",
              background: "var(--surface-2, #1f1a16)",
              color: "var(--fg, #f5efe6)",
              fontSize: "0.92rem",
              fontWeight: 600,
              minWidth: "260px",
            }}
          >
            {recruitments.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.role_id.toUpperCase()}) - {r.is_active ? "Buka (Aktif)" : "Tutup (Nonaktif)"}
              </option>
            ))}
          </select>

          {selectedRecruitment && (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 700,
                background: selectedRecruitment.is_active
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(239, 68, 68, 0.15)",
                color: selectedRecruitment.is_active ? "#10b981" : "#ef4444",
                border: selectedRecruitment.is_active
                  ? "1px solid rgba(16, 185, 129, 0.3)"
                  : "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              {selectedRecruitment.is_active ? "Pendaftaran Buka" : "Pendaftaran Tutup"}
            </span>
          )}
        </div>

        {selectedRecruitment && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleToggleRecActive(selectedRecruitment)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border, rgba(255,255,255,0.15))",
                background: "transparent",
                color: selectedRecruitment.is_active ? "#ef4444" : "#10b981",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <i className={selectedRecruitment.is_active ? "bx bx-lock" : "bx bx-lock-open"} />{" "}
              {selectedRecruitment.is_active ? "Tutup Pendaftaran" : "Buka Pendaftaran"}
            </button>
            <button
              type="button"
              onClick={() => handleOpenRecModal(selectedRecruitment)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border, rgba(255,255,255,0.15))",
                background: "transparent",
                color: "var(--fg, #f5efe6)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <i className="bx bx-edit-alt" /> Edit Rekrutmen
            </button>
            <button
              type="button"
              onClick={() => handleDeleteRecruitment(selectedRecruitment)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.1)",
                color: "#ef4444",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <i className="bx bx-trash" />
            </button>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: KELOLA PERTANYAAN (QUESTION BUILDER) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "recruitments" && (
        <div>
          {selectedRecruitment ? (
            <div>
              {/* Question Builder Toolbar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                    Formulir Pertanyaan: {selectedRecruitment.title}
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--fg-muted, #a3978c)" }}>
                    Total: {questions.length} pertanyaan terdaftar (Slug:{" "}
                    <code>{selectedRecruitment.slug}</code>).
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setShowPreviewModal(true)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
                      border: "1.5px solid var(--cv-orange, #ff6b1a)",
                      background: "rgba(255, 107, 26, 0.1)",
                      color: "var(--cv-orange, #ff6b1a)",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <i className="bx bx-show" /> Preview Form User
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCloneModal(true)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
                      border: "1px solid var(--border, rgba(255,255,255,0.15))",
                      background: "var(--surface, rgba(24,20,18,0.6))",
                      color: "var(--fg, #f5efe6)",
                      fontWeight: 600,
                      fontSize: "0.84rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <i className="bx bx-copy" /> Salin / Clone dari Rekrutmen Lain
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenQModal()}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "10px",
                      border: "none",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: "0.84rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <i className="bx bx-plus" /> Tambah Pertanyaan
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {loadingQuestions ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--cv-orange, #ff6b1a)" }}>
                  <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem" }} />
                  <p>Memuat pertanyaan...</p>
                </div>
              ) : questions.length === 0 ? (
                <div
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    background: "var(--surface, rgba(24,20,18,0.6))",
                    borderRadius: "16px",
                    border: "1px dashed var(--border, rgba(255,255,255,0.15))",
                  }}
                >
                  <i className="bx bx-file-blank" style={{ fontSize: "3rem", color: "var(--fg-muted, #a3978c)" }} />
                  <h4 style={{ margin: "12px 0 4px", color: "var(--fg, #f5efe6)" }}>Belum Ada Pertanyaan</h4>
                  <p style={{ margin: "0 0 16px", fontSize: "0.88rem", color: "var(--fg-muted, #a3978c)" }}>
                    Buat pertanyaan baru atau salin pertanyaan dari rekrutmen lain.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenQModal()}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: "var(--cv-orange, #ff6b1a)",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Buat Pertanyaan Pertama
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {questions.map((q, idx) => {
                    const typeObj = QUESTION_TYPES.find((t) => t.type === q.type);
                    return (
                      <div
                        key={q.id}
                        style={{
                          background: q.is_active
                            ? "var(--surface, rgba(24, 20, 18, 0.75))"
                            : "rgba(30, 25, 22, 0.4)",
                          opacity: q.is_active ? 1 : 0.65,
                          border: "1px solid var(--border, rgba(255,255,255,0.1))",
                          borderRadius: "12px",
                          padding: "14px 18px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "16px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {/* Order & Drag / Up-Down Handle */}
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveQuestion(idx, "up")}
                              style={{
                                background: "none",
                                border: "none",
                                color: idx === 0 ? "rgba(255,255,255,0.2)" : "var(--fg, #f5efe6)",
                                cursor: idx === 0 ? "not-allowed" : "pointer",
                                padding: "2px",
                                fontSize: "1rem",
                              }}
                              title="Pindah ke Atas"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === questions.length - 1}
                              onClick={() => handleMoveQuestion(idx, "down")}
                              style={{
                                background: "none",
                                border: "none",
                                color:
                                  idx === questions.length - 1
                                    ? "rgba(255,255,255,0.2)"
                                    : "var(--fg, #f5efe6)",
                                cursor: idx === questions.length - 1 ? "not-allowed" : "pointer",
                                padding: "2px",
                                fontSize: "1rem",
                              }}
                              title="Pindah ke Bawah"
                            >
                              ▼
                            </button>
                          </div>

                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "6px",
                              background: "rgba(255, 107, 26, 0.15)",
                              color: "var(--cv-orange, #ff6b1a)",
                              fontWeight: 800,
                              fontSize: "0.82rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {idx + 1}
                          </div>

                          {/* Question Label & Metadata */}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--fg, #f5efe6)" }}>
                                {q.label}
                              </span>
                              {q.is_required ? (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: "rgba(239, 68, 68, 0.2)",
                                    color: "#f87171",
                                    fontWeight: 700,
                                  }}
                                >
                                  Wajib
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: "rgba(255, 255, 255, 0.08)",
                                    color: "var(--fg-muted, #a3978c)",
                                  }}
                                >
                                  Opsional
                                </span>
                              )}
                              {!q.is_active && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: "rgba(100, 116, 139, 0.2)",
                                    color: "#94a3b8",
                                  }}
                                >
                                  Nonaktif
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                marginTop: "3px",
                                fontSize: "0.78rem",
                                color: "var(--fg-muted, #a3978c)",
                              }}
                            >
                              <span>
                                <i className={`bx ${typeObj?.icon || "bx-help-circle"}`} />{" "}
                                {typeObj?.label || q.type}
                              </span>
                              <span>•</span>
                              <span>
                                Key: <code>{q.field_key}</code>
                              </span>
                              {q.options && q.options.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{q.options.length} pilihan opsi</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleQActive(q)}
                            style={{
                              background: "none",
                              border: "none",
                              color: q.is_active ? "#10b981" : "#94a3b8",
                              fontSize: "1.2rem",
                              cursor: "pointer",
                              padding: "4px 8px",
                            }}
                            title={q.is_active ? "Nonaktifkan Pertanyaan" : "Aktifkan Pertanyaan"}
                          >
                            <i className={q.is_active ? "bx bx-toggle-right" : "bx bx-toggle-left"} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenQModal(q)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--fg, #f5efe6)",
                              fontSize: "1.1rem",
                              cursor: "pointer",
                              padding: "4px 8px",
                            }}
                            title="Edit Pertanyaan"
                          >
                            <i className="bx bx-edit" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              fontSize: "1.1rem",
                              cursor: "pointer",
                              padding: "4px 8px",
                            }}
                            title="Hapus Pertanyaan"
                          >
                            <i className="bx bx-trash" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <p>Silakan pilih atau tambahkan rekrutmen terlebih dahulu.</p>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: DATA PENDAFTAR (SUBMISSIONS & ANSWERS) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "submissions" && selectedRecruitment && (
        <div>
          {/* Submissions Toolbar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              {/* Search Bar */}
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Cari nama, kota, kontak..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  style={{
                    padding: "8px 12px 8px 34px",
                    borderRadius: "10px",
                    border: "1px solid var(--border, rgba(255,255,255,0.15))",
                    background: "var(--surface, rgba(24,20,18,0.6))",
                    color: "var(--fg, #f5efe6)",
                    fontSize: "0.88rem",
                    width: "240px",
                  }}
                />
                <i
                  className="bx bx-search"
                  style={{ position: "absolute", left: "10px", top: "10px", color: "var(--fg-muted, #a3978c)" }}
                />
              </div>

              {/* Status Filter */}
              <select
                value={subStatusFilter}
                onChange={(e) => setSubStatusFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--border, rgba(255,255,255,0.15))",
                  background: "var(--surface, rgba(24,20,18,0.6))",
                  color: "var(--fg, #f5efe6)",
                  fontSize: "0.88rem",
                }}
              >
                <option value="all">Semua Status ({submissions.length})</option>
                <option value="pending">Pending</option>
                <option value="approved">Diterima (Approved)</option>
                <option value="rejected">Ditolak (Rejected)</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <div>
              <a
                href={`/api/admin/recruitments/${selectedRecruitment.id}/export-csv`}
                download
                style={{
                  padding: "9px 16px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#10b981",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <i className="bx bx-spreadsheet" /> Unduh Jawaban (.csv / Excel)
              </a>
            </div>
          </div>

          {/* Submissions Table */}
          {loadingSubmissions ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--cv-orange, #ff6b1a)" }}>
              <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem" }} />
              <p>Memuat data pendaftar...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "var(--surface, rgba(24,20,18,0.6))",
                borderRadius: "16px",
                border: "1px dashed var(--border, rgba(255,255,255,0.15))",
              }}
            >
              <i className="bx bx-user-x" style={{ fontSize: "3rem", color: "var(--fg-muted, #a3978c)" }} />
              <h4 style={{ margin: "12px 0 4px", color: "var(--fg, #f5efe6)" }}>Belum Ada Pendaftar</h4>
              <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--fg-muted, #a3978c)" }}>
                Pendaftaran yang dikirimkan lewat form publik /join akan muncul di sini.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.88rem",
                  color: "var(--fg, #f5efe6)",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "2px solid var(--border, rgba(255,255,255,0.1))",
                      textAlign: "left",
                    }}
                  >
                    <th style={{ padding: "12px 14px" }}>No</th>
                    <th style={{ padding: "12px 14px" }}>Tanggal</th>
                    <th style={{ padding: "12px 14px" }}>Nama Lengkap</th>
                    <th style={{ padding: "12px 14px" }}>Kota</th>
                    <th style={{ padding: "12px 14px" }}>WhatsApp / LINE</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                    <th style={{ padding: "12px 14px", textAlign: "right" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, idx) => (
                    <tr
                      key={sub.id}
                      style={{
                        borderBottom: "1px solid var(--border, rgba(255,255,255,0.06))",
                      }}
                    >
                      <td style={{ padding: "12px 14px" }}>{idx + 1}</td>
                      <td style={{ padding: "12px 14px", fontSize: "0.8rem", color: "var(--fg-muted, #a3978c)" }}>
                        {sub.created_at ? new Date(sub.created_at).toLocaleDateString("id-ID") : "-"}
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 700 }}>
                        {sub.full_name}
                        {sub.nickname && (
                          <span style={{ fontSize: "0.78rem", fontWeight: 400, color: "var(--fg-muted, #a3978c)", marginLeft: "6px" }}>
                            ({sub.nickname})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px" }}>{sub.city}</td>
                      <td style={{ padding: "12px 14px" }}>
                        {sub.whatsapp || "-"} {sub.line_id ? `• Line: ${sub.line_id}` : ""}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background:
                              sub.status === "approved"
                                ? "rgba(16, 185, 129, 0.15)"
                                : sub.status === "rejected"
                                ? "rgba(239, 68, 68, 0.15)"
                                : "rgba(245, 158, 11, 0.15)",
                            color:
                              sub.status === "approved"
                                ? "#10b981"
                                : sub.status === "rejected"
                                ? "#ef4444"
                                : "#f59e0b",
                          }}
                        >
                          {sub.status === "approved"
                            ? "Diterima"
                            : sub.status === "rejected"
                            ? "Ditolak"
                            : "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleOpenSubmissionDetail(sub)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "1px solid var(--cv-orange, #ff6b1a)",
                            background: "rgba(255, 107, 26, 0.1)",
                            color: "var(--cv-orange, #ff6b1a)",
                            fontWeight: 600,
                            fontSize: "0.82rem",
                            cursor: "pointer",
                          }}
                        >
                          Lihat Jawaban
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

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 1: ADD / EDIT RECRUITMENT */}
      {/* ────────────────────────────────────────────────────────── */}
      {showRecModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowRecModal(false)}
        >
          <div
            style={{
              background: "#181412",
              border: "1.5px solid rgba(255, 107, 26, 0.3)",
              borderRadius: "18px",
              padding: "24px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", color: "var(--fg, #f5efe6)", fontSize: "1.25rem" }}>
              {editingRec ? "Edit Rekrutmen" : "Tambah Rekrutmen Baru"}
            </h3>

            <form onSubmit={handleSaveRecruitment} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                  Judul Rekrutmen *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Join Member Cavallery 2026"
                  value={recForm.title}
                  onChange={(e) => setRecForm({ ...recForm, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#221c18",
                    color: "#fff",
                    marginTop: "4px",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                  Slug URL (Identifier Unik)
                </label>
                <input
                  type="text"
                  placeholder="member / admin / volunteer / batch-2"
                  value={recForm.slug}
                  onChange={(e) => setRecForm({ ...recForm, slug: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#221c18",
                    color: "#fff",
                    marginTop: "4px",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                  Kategori Peran (Role ID)
                </label>
                <select
                  value={recForm.role_id}
                  onChange={(e) => setRecForm({ ...recForm, role_id: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#221c18",
                    color: "#fff",
                    marginTop: "4px",
                  }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="custom">Custom Role</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                  Deskripsi Rekrutmen
                </label>
                <textarea
                  rows={3}
                  placeholder="Penjelasan singkat mengenai rekrutmen ini..."
                  value={recForm.description}
                  onChange={(e) => setRecForm({ ...recForm, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#221c18",
                    color: "#fff",
                    marginTop: "4px",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    value={recForm.start_date}
                    onChange={(e) => setRecForm({ ...recForm, start_date: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "#221c18",
                      color: "#fff",
                      marginTop: "4px",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    value={recForm.end_date}
                    onChange={(e) => setRecForm({ ...recForm, end_date: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "#221c18",
                      color: "#fff",
                      marginTop: "4px",
                    }}
                  />
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={recForm.is_active}
                  onChange={(e) => setRecForm({ ...recForm, is_active: e.target.checked })}
                  style={{ width: "18px", height: "18px", accentColor: "var(--cv-orange, #ff6b1a)" }}
                />
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--fg, #f5efe6)" }}>
                  Aktifkan Rekrutmen Ini (Terbuka untuk Pendaftar)
                </span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowRecModal(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--cv-orange, #ff6b1a)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Simpan Rekrutmen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 2: ADD / EDIT QUESTION BUILDER */}
      {/* ────────────────────────────────────────────────────────── */}
      {showQModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowQModal(false)}
        >
          <div
            style={{
              background: "#181412",
              border: "1.5px solid rgba(255, 107, 26, 0.3)",
              borderRadius: "18px",
              padding: "24px",
              width: "100%",
              maxWidth: "620px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", color: "var(--fg, #f5efe6)", fontSize: "1.25rem" }}>
              {editingQ ? "Edit Pertanyaan" : "Tambah Pertanyaan Baru"}
            </h3>

            <form onSubmit={handleSaveQuestion} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                  Label Pertanyaan *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Nomor WhatsApp Aktif"
                  value={qForm.label}
                  onChange={(e) => setQForm({ ...qForm, label: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#221c18",
                    color: "#fff",
                    marginTop: "4px",
                  }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                    Jenis Tipe Input *
                  </label>
                  <select
                    value={qForm.type}
                    onChange={(e) => setQForm({ ...qForm, type: e.target.value as QuestionType })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "#221c18",
                      color: "#fff",
                      marginTop: "4px",
                    }}
                  >
                    {QUESTION_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                    Field Key (Slug Database)
                  </label>
                  <input
                    type="text"
                    placeholder="whatsapp / email / alasan"
                    value={qForm.field_key}
                    onChange={(e) => setQForm({ ...qForm, field_key: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "#221c18",
                      color: "#fff",
                      marginTop: "4px",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                  Placeholder Input
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 081234567890"
                  value={qForm.placeholder}
                  onChange={(e) => setQForm({ ...qForm, placeholder: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#221c18",
                    color: "#fff",
                    marginTop: "4px",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                  Teks Bantuan / Petunjuk (Help Text)
                </label>
                <input
                  type="text"
                  placeholder="Petunjuk pengisian untuk calon pendaftar..."
                  value={qForm.help_text}
                  onChange={(e) => setQForm({ ...qForm, help_text: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "#221c18",
                    color: "#fff",
                    marginTop: "4px",
                  }}
                />
              </div>

              {/* Dynamic Option Editor for Select / Radio / Checkbox */}
              {["select", "radio", "checkbox"].includes(qForm.type) && (
                <div
                  style={{
                    background: "rgba(255, 107, 26, 0.05)",
                    border: "1px dashed rgba(255, 107, 26, 0.3)",
                    borderRadius: "12px",
                    padding: "14px",
                  }}
                >
                  <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--cv-orange, #ff6b1a)" }}>
                    Editor Pilihan Opsi ({qForm.options.length})
                  </label>
                  <p style={{ margin: "2px 0 10px", fontSize: "0.78rem", color: "var(--fg-muted, #a3978c)" }}>
                    Ketik opsi lalu klik tombol "Tambah Opsi".
                  </p>

                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <input
                      type="text"
                      placeholder="Ketik nama opsi..."
                      value={qForm.newOptionInput}
                      onChange={(e) => setQForm({ ...qForm, newOptionInput: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.15)",
                        background: "#221c18",
                        color: "#fff",
                        fontSize: "0.88rem",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        border: "none",
                        background: "var(--cv-orange, #ff6b1a)",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + Tambah
                    </button>
                  </div>

                  {/* Options Badges */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {qForm.options.map((opt, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 10px",
                          borderRadius: "8px",
                          background: "#221c18",
                          border: "1px solid rgba(255,255,255,0.15)",
                          fontSize: "0.82rem",
                          color: "#fff",
                        }}
                      >
                        {opt}
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(i)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "0.95rem",
                            lineHeight: 1,
                            padding: "0 2px",
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Required & Active Toggles */}
              <div style={{ display: "flex", gap: "20px", marginTop: "4px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={qForm.is_required}
                    onChange={(e) => setQForm({ ...qForm, is_required: e.target.checked })}
                    style={{ width: "18px", height: "18px", accentColor: "var(--cv-orange, #ff6b1a)" }}
                  />
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--fg, #f5efe6)" }}>
                    Pertanyaan Wajib Diisi (Required)
                  </span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={qForm.is_active}
                    onChange={(e) => setQForm({ ...qForm, is_active: e.target.checked })}
                    style={{ width: "18px", height: "18px", accentColor: "var(--cv-orange, #ff6b1a)" }}
                  />
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--fg, #f5efe6)" }}>
                    Aktifkan Pertanyaan
                  </span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setShowQModal(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--cv-orange, #ff6b1a)",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Simpan Pertanyaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 3: CLONE QUESTIONS */}
      {/* ────────────────────────────────────────────────────────── */}
      {showCloneModal && selectedRecruitment && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowCloneModal(false)}
        >
          <div
            style={{
              background: "#181412",
              border: "1.5px solid rgba(255, 107, 26, 0.3)",
              borderRadius: "18px",
              padding: "24px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px", color: "var(--fg, #f5efe6)", fontSize: "1.2rem" }}>
              Salin Pertanyaan dari Rekrutmen Lain
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "0.85rem", color: "var(--fg-muted, #a3978c)" }}>
              Duplikasi semua pertanyaan dari rekrutmen sumber ke <strong>{selectedRecruitment.title}</strong> tanpa harus memasukkan satu per satu.
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                Pilih Rekrutmen Sumber:
              </label>
              <select
                value={cloneSourceId}
                onChange={(e) => setCloneSourceId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "#221c18",
                  color: "#fff",
                  marginTop: "6px",
                  fontSize: "0.92rem",
                }}
              >
                <option value="">-- Pilih Sumber --</option>
                {recruitments
                  .filter((r) => r.id !== selectedRecruitment.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.question_count || 0} pertanyaan)
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowCloneModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCloneQuestions}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--cv-orange, #ff6b1a)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Duplikasi Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 4: LIVE FORM PREVIEW */}
      {/* ────────────────────────────────────────────────────────── */}
      {showPreviewModal && selectedRecruitment && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            style={{
              background: "#181412",
              border: "1.5px solid var(--cv-orange, #ff6b1a)",
              borderRadius: "20px",
              padding: "28px",
              width: "100%",
              maxWidth: "660px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.85)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                paddingBottom: "12px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--cv-orange, #ff6b1a)",
                    textTransform: "uppercase",
                  }}
                >
                  Live Preview Form
                </span>
                <h3 style={{ margin: "2px 0 0", color: "var(--fg, #f5efe6)", fontSize: "1.25rem" }}>
                  {selectedRecruitment.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  color: "#fff",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <DynamicRecruitmentForm
              recruitment={selectedRecruitment}
              questions={questions.filter((q) => q.is_active)}
              onCancel={() => setShowPreviewModal(false)}
            />
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 5: SUBMISSION DETAIL WITH ANSWERS SNAPSHOT */}
      {/* ────────────────────────────────────────────────────────── */}
      {selectedSubmission && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            style={{
              background: "#181412",
              border: "1.5px solid rgba(255, 107, 26, 0.3)",
              borderRadius: "20px",
              padding: "24px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.85)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                paddingBottom: "12px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--cv-orange, #ff6b1a)", fontWeight: 700 }}>
                  Detail Pendaftar #{selectedSubmission.id}
                </span>
                <h3 style={{ margin: "2px 0 0", color: "var(--fg, #f5efe6)", fontSize: "1.25rem" }}>
                  {selectedSubmission.full_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  color: "#fff",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* Status Switcher & Notes */}
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--fg, #f5efe6)" }}>
                  Status Pendaftar:
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {(["pending", "approved", "rejected"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleUpdateStatus(selectedSubmission.id, st)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        background:
                          selectedSubmission.status === st
                            ? st === "approved"
                              ? "#10b981"
                              : st === "rejected"
                              ? "#ef4444"
                              : "#f59e0b"
                            : "rgba(255,255,255,0.08)",
                        color: selectedSubmission.status === st ? "#fff" : "var(--fg-muted, #a3978c)",
                      }}
                    >
                      {st === "approved" ? "Terima (Approve)" : st === "rejected" ? "Tolak (Reject)" : "Pending"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "var(--fg-muted, #a3978c)", fontWeight: 600 }}>
                  Catatan Admin (Notes):
                </label>
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <input
                    type="text"
                    placeholder="Tambah catatan untuk pendaftar ini..."
                    value={statusUpdateNotes}
                    onChange={(e) => setStatusUpdateNotes(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "#221c18",
                      color: "#fff",
                      fontSize: "0.84rem",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(selectedSubmission.id, selectedSubmission.status)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: "none",
                      background: "var(--cv-orange, #ff6b1a)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    Simpan Catatan
                  </button>
                </div>
              </div>
            </div>

            {/* Dynamic Answers List */}
            <h4 style={{ margin: "0 0 12px", color: "var(--fg, #f5efe6)", fontSize: "1rem" }}>
              Daftar Jawaban Formulir:
            </h4>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {selectedSubmission.answers && selectedSubmission.answers.length > 0 ? (
                selectedSubmission.answers.map((ans: any, i: number) => {
                  let displayVal = ans.answer_value;
                  if (typeof displayVal === "string" && displayVal.startsWith("[") && displayVal.endsWith("]")) {
                    try {
                      const parsed = JSON.parse(displayVal);
                      if (Array.isArray(parsed)) displayVal = parsed.join(", ");
                    } catch {}
                  }

                  return (
                    <div
                      key={i}
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "10px",
                        padding: "10px 14px",
                      }}
                    >
                      <div style={{ fontSize: "0.82rem", color: "var(--cv-orange, #ff6b1a)", fontWeight: 700 }}>
                        {ans.question_label}
                      </div>
                      <div
                        style={{
                          fontSize: "0.92rem",
                          color: "var(--fg, #f5efe6)",
                          marginTop: "4px",
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {displayVal || <span style={{ color: "rgba(255,255,255,0.3)" }}>- (Kosong)</span>}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ fontSize: "0.88rem", color: "var(--fg-muted, #a3978c)" }}>
                  <p>Nama: {selectedSubmission.full_name}</p>
                  <p>Kota: {selectedSubmission.city}</p>
                  <p>WhatsApp: {selectedSubmission.whatsapp}</p>
                  <p>Alasan: {selectedSubmission.reason}</p>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(239,68,68,0.3)",
                  background: "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                  fontWeight: 600,
                  fontSize: "0.84rem",
                  cursor: "pointer",
                }}
              >
                <i className="bx bx-trash" /> Hapus Pendaftar
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
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
