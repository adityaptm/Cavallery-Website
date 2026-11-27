"use client";

import { useState, useEffect, useCallback } from "react";

interface RoleApplication {
  id: number;
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

const DIVISI_OPTIONS = [
  "Media & Desain Kreatif",
  "Humas & Event Lapangan",
  "Project & Merchandise",
  "Bendahara & Administrasi Kas",
  "IT, Bot & Website",
  "Lainnya / Fleksibel",
];

const STATUS_META: Record<
  RoleApplication["status"],
  { label: string; icon: string; color: string; bg: string; border: string }
> = {
  diproses: {
    label: "Diproses",
    icon: "bx-time-five",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.14)",
    border: "rgba(245, 158, 11, 0.35)",
  },
  diterima: {
    label: "Diterima",
    icon: "bx-check-circle",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.14)",
    border: "rgba(16, 185, 129, 0.35)",
  },
  ditolak: {
    label: "Ditolak",
    icon: "bx-x-circle",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.14)",
    border: "rgba(239, 68, 68, 0.35)",
  },
};

export default function RoleApplicationPanel({
  sessionUser,
  styles,
}: {
  sessionUser: any;
  styles: Record<string, string>;
}) {
  const [applications, setApplications] = useState<RoleApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [roleType, setRoleType] = useState<"admin" | "volunteer">("volunteer");
  const [divisi, setDivisi] = useState(DIVISI_OPTIONS[0]);
  const [alasan, setAlasan] = useState("");
  const [pengalaman, setPengalaman] = useState("");
  const [ketersediaan, setKetersediaan] = useState("");
  const [portofolioUrl, setPortofolioUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/role-applications?_t=" + Date.now());
      const json = await res.json();
      if (json.status && Array.isArray(json.data)) {
        setApplications(json.data);
      }
    } catch {
      console.error("Gagal memuat pendaftaran admin/volunteer");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const hasPendingForSelected = applications.some(
    (app) => app.role_type === roleType && app.status === "diproses"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (alasan.trim().length < 15) {
      setAlert({
        type: "error",
        msg: "Mohon tulis alasan dan motivasi mendaftar minimal 15 karakter.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/role-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_type: roleType,
          divisi,
          alasan: alasan.trim(),
          pengalaman: pengalaman.trim(),
          ketersediaan: ketersediaan.trim(),
          portofolio_url: portofolioUrl.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.status) {
        setAlert({
          type: "error",
          msg: json.message || "Gagal mengirim pendaftaran.",
        });
      } else {
        setAlert({
          type: "success",
          msg: json.message || "Pendaftaran berhasil dikirim!",
        });
        setAlasan("");
        setPengalaman("");
        setKetersediaan("");
        setPortofolioUrl("");
        fetchApplications();
      }
    } catch (err: any) {
      setAlert({
        type: "error",
        msg: err?.message || "Terjadi kesalahan koneksi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Card Form Pendaftaran */}
      <div className={`glassCard ${styles.dashCard}`}>
        <div className={styles.header}>
          <div className="badge">
            <i className="bx bx-user-plus" /> Khusus Anggota Cavallery
          </div>
          <h1 className={styles.title}>Daftar Admin &amp; Volunteer</h1>
          <p className={styles.subtitle}>
            Tertarik berkontribusi lebih dekat bersama tim inti Cavallery dalam
            mengelola project dan dukungan untuk Erine? Ajukan pendaftaranmu di sini.
          </p>
        </div>

        {/* Pilihan Role Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setRoleType("volunteer");
              setAlert(null);
            }}
            style={{
              textAlign: "left",
              padding: "16px",
              borderRadius: 14,
              cursor: "pointer",
              border:
                roleType === "volunteer"
                  ? "2px solid var(--gold)"
                  : "1px solid var(--border)",
              background:
                roleType === "volunteer"
                  ? "rgba(229, 120, 48, 0.1)"
                  : "var(--surface)",
              color: "var(--fg)",
              transition: "all 0.2s",
              minHeight: 44,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: roleType === "volunteer" ? "var(--gold)" : "var(--fg)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="bx bx-heart" /> Volunteer
              </span>
              {roleType === "volunteer" && (
                <i
                  className="bx bxs-check-circle"
                  style={{ color: "var(--gold)", fontSize: "1.2rem" }}
                />
              )}
            </div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--fg-muted)", lineHeight: 1.45 }}>
              Membantu project tertentu seperti Seitansai, event teater, dekorasi bunga, atau dokumentasi lapangan.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleType("admin");
              setAlert(null);
            }}
            style={{
              textAlign: "left",
              padding: "16px",
              borderRadius: 14,
              cursor: "pointer",
              border:
                roleType === "admin"
                  ? "2px solid var(--gold)"
                  : "1px solid var(--border)",
              background:
                roleType === "admin"
                  ? "rgba(229, 120, 48, 0.1)"
                  : "var(--surface)",
              color: "var(--fg)",
              transition: "all 0.2s",
              minHeight: 44,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "1rem",
                  color: roleType === "admin" ? "var(--gold)" : "var(--fg)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <i className="bx bxs-shield-alt-2" /> Admin Fanbase
              </span>
              {roleType === "admin" && (
                <i
                  className="bx bxs-check-circle"
                  style={{ color: "var(--gold)", fontSize: "1.2rem" }}
                />
              )}
            </div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--fg-muted)", lineHeight: 1.45 }}>
              Pengurus aktif harian yang mengelola operasional fanbase, konten media sosial, kas, atau website.
            </p>
          </button>
        </div>

        {alert && (
          <div
            className={`${styles.alertBox} ${
              alert.type === "success" ? styles.alertSuccess : styles.alertError
            }`}
          >
            <i
              className={`bx ${
                alert.type === "success" ? "bx-check-circle" : "bx-error-circle"
              }`}
            />
            <span>{alert.msg}</span>
          </div>
        )}

        {hasPendingForSelected ? (
          <div
            style={{
              padding: "18px 20px",
              borderRadius: 14,
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              color: "var(--fg)",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <i
              className="bx bx-time-five"
              style={{ color: "#f59e0b", fontSize: "1.4rem", flexShrink: 0, marginTop: 2 }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.92rem", marginBottom: 4 }}>
                Pendaftaran {roleType === "admin" ? "Admin" : "Volunteer"} Sedang Diproses
              </div>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--fg-muted)", lineHeight: 1.5 }}>
                Pengajuan Anda untuk peran ini masih ditinjau oleh admin. Pantau statusnya pada riwayat di bawah.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Info Otomatis Anggota */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                fontSize: "0.8rem",
                color: "var(--fg-muted)",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px 18px",
              }}
            >
              <span>
                Nama: <strong style={{ color: "var(--fg)" }}>{sessionUser?.nama || "-"}</strong>
              </span>
              <span>
                No. Anggota: <strong style={{ color: "var(--gold)" }}>{sessionUser?.noAnggota || "-"}</strong>
              </span>
              {sessionUser?.idLine && (
                <span>
                  ID LINE: <strong style={{ color: "var(--fg)" }}>{sessionUser.idLine}</strong>
                </span>
              )}
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Divisi / Bidang yang Diminati</label>
                <span className={styles.badgeWajib}>WAJIB</span>
              </div>
              <select
                className={styles.select}
                value={divisi}
                onChange={(e) => setDivisi(e.target.value)}
              >
                {DIVISI_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label}>
                  Alasan &amp; Motivasi Mendaftar ({roleType === "admin" ? "Admin" : "Volunteer"})
                </label>
                <span className={styles.badgeWajib}>WAJIB</span>
              </div>
              <textarea
                className={styles.input}
                rows={4}
                style={{ minHeight: 100, resize: "vertical", paddingTop: 10 }}
                placeholder="Ceritakan alasan kamu ingin bergabung dan kontribusi apa yang ingin kamu berikan..."
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Pengalaman / Keahlian Relevan</label>
                <span className={styles.badgeOpsional}>OPSIONAL</span>
              </div>
              <textarea
                className={styles.input}
                rows={3}
                style={{ minHeight: 76, resize: "vertical", paddingTop: 10 }}
                placeholder="Contoh: Pernah handle desain poster, panitia event fanbase, edit video, admin sosmed, dll."
                value={pengalaman}
                onChange={(e) => setPengalaman(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Ketersediaan Waktu</label>
                <span className={styles.badgeOpsional}>OPSIONAL</span>
              </div>
              <input
                type="text"
                className={styles.input}
                placeholder="Contoh: Malam hari & akhir pekan / Fleksibel saat ada project"
                value={ketersediaan}
                onChange={(e) => setKetersediaan(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label}>Link Portofolio / Sosial Media</label>
                <span className={styles.badgeOpsional}>OPSIONAL</span>
              </div>
              <input
                type="url"
                className={styles.input}
                placeholder="https://drive.google.com/... atau https://x.com/..."
                value={portofolioUrl}
                onChange={(e) => setPortofolioUrl(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" /> Mengirim Pendaftaran...
                </>
              ) : (
                <>
                  <i className="bx bx-paper-plane" /> Kirim Pendaftaran{" "}
                  {roleType === "admin" ? "Admin" : "Volunteer"}
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Card Riwayat & Status Pendaftaran */}
      <div className={`glassCard ${styles.dashCard}`}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.15rem",
              fontWeight: 800,
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <i className="bx bx-list-check" style={{ color: "var(--gold)" }} />
            Status Pendaftaran Saya
          </h2>
          <button
            type="button"
            onClick={fetchApplications}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--fg)",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <i className="bx bx-refresh" /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "var(--gold)" }}>
            <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "1.8rem" }} />
            <p style={{ margin: "6px 0 0", fontSize: "0.85rem" }}>Memuat status pendaftaran...</p>
          </div>
        ) : applications.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "28px 16px",
              borderRadius: 12,
              background: "var(--surface)",
              border: "1px dashed var(--border)",
              color: "var(--fg-muted)",
              fontSize: "0.86rem",
            }}
          >
            Belum ada riwayat pendaftaran Admin atau Volunteer.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {applications.map((app) => {
              const meta = STATUS_META[app.status] || STATUS_META.diproses;
              return (
                <div
                  key={app.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: "rgba(229, 120, 48, 0.14)",
                          color: "var(--gold)",
                          fontWeight: 800,
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                        }}
                      >
                        {app.role_type === "admin" ? "Admin Fanbase" : "Volunteer"}
                      </span>
                      {app.divisi && (
                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--fg)" }}>
                          {app.divisi}
                        </span>
                      )}
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 12px",
                        borderRadius: 999,
                        background: meta.bg,
                        border: `1px solid ${meta.border}`,
                        color: meta.color,
                        fontSize: "0.78rem",
                        fontWeight: 800,
                      }}
                    >
                      <i className={`bx ${meta.icon}`} />
                      {meta.label}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.83rem",
                      color: "var(--fg-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {app.alasan}
                  </p>

                  {/* Feedback / Alasan Penolakan dari Admin */}
                  {app.feedback && (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background:
                          app.status === "ditolak"
                            ? "rgba(239, 68, 68, 0.09)"
                            : "rgba(16, 185, 129, 0.09)",
                        border:
                          app.status === "ditolak"
                            ? "1px solid rgba(239, 68, 68, 0.3)"
                            : "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          color: app.status === "ditolak" ? "#ef4444" : "#10b981",
                          marginBottom: 3,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <i className="bx bx-message-square-detail" />
                        {app.status === "ditolak" ? "Alasan Penolakan:" : "Catatan Admin:"}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "var(--fg)", lineHeight: 1.45 }}>
                        {app.feedback}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      fontSize: "0.72rem",
                      color: "var(--fg-muted)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: 8,
                    }}
                  >
                    <span>
                      Diajukan:{" "}
                      {app.created_at
                        ? new Date(app.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </span>
                    {app.reviewed_by && (
                      <span>
                        Ditinjau oleh: <strong>{app.reviewed_by}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
