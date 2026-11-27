"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "@/app/internal/dashboard-admin-xv7r2q/page.module.css";

interface RoleApplication {
  id: number;
  anggota_id: number;
  no_anggota: string;
  nama_anggota: string;
  id_line: string | null;
  discord: string | null;
  kontak_platform: string | null;
  kontak_id: string | null;
  role_type: "admin" | "volunteer";
  divisi: string | null;
  alasan: string;
  pengalaman: string | null;
  ketersediaan: string | null;
  portofolio_url: string | null;
  status: "diproses" | "diterima" | "ditolak";
  feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<
  RoleApplication["status"],
  { label: string; color: string; bg: string }
> = {
  diproses: { label: "Diproses", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
  diterima: { label: "Diterima", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
  ditolak: { label: "Ditolak", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
};

export default function RoleApplicationsManager() {
  const [items, setItems] = useState<RoleApplication[]>([]);
  const [stats, setStats] = useState({ total: 0, diproses: 0, diterima: 0, ditolak: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Review modal state
  const [selected, setSelected] = useState<RoleApplication | null>(null);
  const [nextStatus, setNextStatus] = useState<RoleApplication["status"]>("diproses");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        status: statusFilter,
        role_type: roleFilter,
        q: search.trim(),
        _t: String(Date.now()),
      });
      const res = await fetch(`/api/admin/role-applications?${qs.toString()}`);
      const json = await res.json();
      if (json.status) {
        setItems(json.data || []);
        if (json.stats) setStats(json.stats);
      } else {
        showToast(json.message || "Gagal memuat data", "error");
      }
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter, search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const openReviewModal = (item: RoleApplication) => {
    setSelected(item);
    setNextStatus(item.status);
    setFeedbackInput(item.feedback || "");
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    if (nextStatus === "ditolak" && feedbackInput.trim().length < 5) {
      showToast("Alasan penolakan (feedback) wajib diisi minimal 5 karakter.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/role-applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          status: nextStatus,
          feedback: feedbackInput.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.status) {
        showToast(json.message || "Gagal memperbarui status", "error");
      } else {
        showToast(json.message || "Status berhasil diperbarui!");
        setSelected(null);
        fetchList();
      }
    } catch {
      showToast("Terjadi kesalahan koneksi", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: RoleApplication) => {
    if (!window.confirm(`Hapus pendaftaran ${item.nama_anggota} (${item.role_type})?`)) return;
    try {
      const res = await fetch(`/api/admin/role-applications?id=${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.status) {
        showToast("Pendaftaran dihapus");
        fetchList();
      } else {
        showToast(json.message || "Gagal menghapus", "error");
      }
    } catch {
      showToast("Gagal menghapus", "error");
    }
  };

  return (
    <div className={styles.sectionWrap}>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 99999,
            padding: "12px 18px",
            borderRadius: 12,
            background: toast.type === "error" ? "#7f1d1d" : "#064e3b",
            border: `1px solid ${toast.type === "error" ? "#ef4444" : "#10b981"}`,
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-user-voice" style={{ color: "var(--cv-orange)" }} /> Pendaftaran Admin &amp; Volunteer
          <span className={styles.count}>{stats.total} Pendaftar</span>
        </h2>
        <button className={styles.btnGhost} onClick={fetchList} title="Refresh">
          <i className="bx bx-refresh" /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {[
          { label: "Total", value: stats.total, color: "var(--cv-orange)" },
          { label: "Diproses", value: stats.diproses, color: "#f59e0b" },
          { label: "Diterima", value: stats.diterima, color: "#10b981" },
          { label: "Ditolak", value: stats.ditolak, color: "#ef4444" },
        ].map((st) => (
          <div
            key={st.label}
            style={{
              background: "var(--adm-surface)",
              border: "1px solid var(--adm-border)",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--cv-text-mute)", fontWeight: 700 }}>
              {st.label}
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: st.color, marginTop: 4 }}>
              {st.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Cari nama, no. anggota, ID LINE, divisi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            minWidth: 240,
            flex: 1,
            maxWidth: 340,
            padding: "8px 12px",
            background: "var(--adm-surface)",
            border: "1px solid var(--adm-border)",
            borderRadius: 8,
            color: "var(--cv-text)",
            fontSize: 13,
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "var(--cv-ink-1)",
            border: "1px solid var(--cv-line-strong)",
            borderRadius: 8,
            color: "var(--cv-text)",
            fontSize: 13,
          }}
        >
          <option value="all">Semua Status</option>
          <option value="diproses">Diproses</option>
          <option value="diterima">Diterima</option>
          <option value="ditolak">Ditolak</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "var(--cv-ink-1)",
            border: "1px solid var(--cv-line-strong)",
            borderRadius: 8,
            color: "var(--cv-text)",
            fontSize: 13,
          }}
        >
          <option value="all">Semua Peran</option>
          <option value="admin">Admin Fanbase</option>
          <option value="volunteer">Volunteer</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className={styles.loadingState}>
          <i className="bx bx-loader-alt bx-spin" /> Memuat pendaftar...
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--cv-text-mute)" }}>
          Belum ada data pendaftar Admin / Volunteer.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Anggota</th>
                <th>Peran &amp; Divisi</th>
                <th>Kontak</th>
                <th>Status</th>
                <th>Feedback</th>
                <th>Tanggal</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const badge = STATUS_BADGE[item.status] || STATUS_BADGE.diproses;
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--cv-text)" }}>
                        {item.nama_anggota}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--cv-orange)", fontWeight: 700 }}>
                        {item.no_anggota}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(255, 107, 26, 0.15)",
                          color: "var(--cv-orange)",
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform: "uppercase",
                        }}
                      >
                        {item.role_type}
                      </span>
                      <div style={{ fontSize: 12, color: "var(--cv-text-mute)", marginTop: 4 }}>
                        {item.divisi || "-"}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--cv-text-mute)" }}>
                      {item.id_line && <div>LINE: {item.id_line}</div>}
                      {item.kontak_id && (
                        <div>
                          {item.kontak_platform || "Kontak"}: {item.kontak_id}
                        </div>
                      )}
                      {item.discord && <div>DC: {item.discord}</div>}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: badge.bg,
                          color: badge.color,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td
                      style={{
                        fontSize: 12,
                        color: "var(--cv-text-mute)",
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.feedback || ""}
                    >
                      {item.feedback || "—"}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--cv-text-mute)", whiteSpace: "nowrap" }}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString("id-ID")
                        : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => openReviewModal(item)}
                          title="Tinjau & Ubah Status"
                        >
                          <i className="bx bx-edit" /> Tinjau
                        </button>
                        <button
                          type="button"
                          className={styles.btnGhost}
                          onClick={() => handleDelete(item)}
                          style={{ color: "#ef4444" }}
                          title="Hapus"
                        >
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

      {/* Modal Tinjau Pendaftar */}
      {selected && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 99998,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div
            style={{
              background: "var(--adm-surface)",
              border: "1px solid var(--adm-border)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              color: "var(--cv-text)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
                Tinjau Pendaftaran {selected.role_type === "admin" ? "Admin" : "Volunteer"}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--cv-text-mute)",
                  fontSize: "1.4rem",
                  cursor: "pointer",
                }}
              >
                <i className="bx bx-x" />
              </button>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--adm-border)",
                borderRadius: 12,
                padding: 14,
                fontSize: 13,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 18,
              }}
            >
              <div>
                <strong>Nama:</strong> {selected.nama_anggota} ({selected.no_anggota})
              </div>
              <div>
                <strong>Divisi:</strong> {selected.divisi || "-"}
              </div>
              <div>
                <strong>Alasan / Motivasi:</strong>
                <div style={{ color: "var(--cv-text-mute)", marginTop: 2 }}>{selected.alasan}</div>
              </div>
              {selected.pengalaman && (
                <div>
                  <strong>Pengalaman:</strong>
                  <div style={{ color: "var(--cv-text-mute)", marginTop: 2 }}>
                    {selected.pengalaman}
                  </div>
                </div>
              )}
              {selected.ketersediaan && (
                <div>
                  <strong>Ketersediaan:</strong> {selected.ketersediaan}
                </div>
              )}
              {selected.portofolio_url && (
                <div>
                  <strong>Portofolio:</strong>{" "}
                  <a
                    href={selected.portofolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--cv-orange)" }}
                  >
                    {selected.portofolio_url}
                  </a>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveReview} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Status Pendaftaran
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {(["diproses", "diterima", "ditolak"] as const).map((st) => {
                    const b = STATUS_BADGE[st];
                    const active = nextStatus === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setNextStatus(st)}
                        style={{
                          padding: "10px 8px",
                          borderRadius: 10,
                          border: active ? `2px solid ${b.color}` : "1px solid var(--adm-border)",
                          background: active ? b.bg : "transparent",
                          color: active ? b.color : "var(--cv-text-mute)",
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {nextStatus === "ditolak"
                    ? "Alasan Penolakan (Wajib diisi)"
                    : "Feedback / Catatan Admin (Opsional)"}
                </label>
                <textarea
                  rows={3}
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  placeholder={
                    nextStatus === "ditolak"
                      ? "Jelaskan alasan penolakan agar anggota memahami kekurangannya..."
                      : "Tambahkan catatan atau instruksi lanjutan untuk anggota..."
                  }
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    background: "var(--cv-ink-1)",
                    border: "1px solid var(--adm-border)",
                    color: "var(--cv-text)",
                    fontSize: 13,
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setSelected(null)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "none",
                    background: "var(--cv-orange)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {saving ? "Menyimpan..." : "Simpan Keputusan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
