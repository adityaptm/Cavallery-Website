
"use client";
import React, { useState, useEffect, useCallback, useRef, Component, ErrorInfo, ReactNode } from "react";
import styles from "./page.module.css";
import type { BotMediaItem } from "@/app/api/bot-media/route";
import LineChatManager from "@/components/admin/LineChatManager";
import AdminPassionBackground from "@/components/admin/AdminPassionBackground";
import RecruitmentAdminManager from "@/components/admin/RecruitmentAdminManager";
import RoleApplicationsManager from "@/components/admin/RoleApplicationsManager";

const api = (path: string) => (path.startsWith("/api") ? path : `/api${path}`);

const MERCH_API_BASE = "https://v5.jkt48connect.com/api/merch";
const merchApi = (path: string) => `${MERCH_API_BASE}${path}`;

const mediaApi = (path: string) => {
  const clean = path.replace(/^\/media/, "");
  return clean ? `/api/media${clean.startsWith("/") ? clean : `/${clean}`}` : "/api/media";
};

const DISCORD_API = "/api/discord";

type Section =
  | "dashboard" | "recruitment" | "roleapplications" | "esport"    | "news"     | "timeline" | "gallery"
  | "setlists"  | "stats"       | "youtube"  | "funfacts"
  | "kabesha"   | "media"       | "discord"  | "journal"
  | "bot"       | "botmedia"    | "linechat"   | "tickets"  | "calendar" | "updates" 
  | "vcschedule"| "abouterine"  | "anggotakota" | "merch" | "invitations" | "fanart" | "twoshot" | "dengerine"
  | "users"     | "trash"       | "activitylogs"| "loginlogs"   | "visitorlocations";


// ─── ACTIVITY LOGGING HELPER ─────────────────────────────────
let currentAdminUsername = "Admin";

async function recordDashboardActivity(actionName: string, module: string, details?: string, username?: string) {
  try {
    await fetch("/api/admin/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "log_activity",
        actionName,
        module,
        details,
        username: username || currentAdminUsername || "Admin",
      }),
    });
  } catch {}
}

// ─── HELPERS ─────────────────────────────────────────────────
function sanitizeArrayField(val: any): string[] {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (val === null || val === undefined || val === "") return [];
  const s = String(val).trim();
  if (s === "") return [];
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
  }
  if (s.startsWith("{") && s.endsWith("}")) {
    const inner = s.slice(1, -1);
    const items: string[] = [];
    let current = ""; let inQuote = false;
    for (const ch of inner) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === "," && !inQuote) { items.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    if (current.trim()) items.push(current.trim());
    return items.filter(Boolean);
  }
  return s.split(",").map(v => v.trim()).filter(Boolean);
}

const ARRAY_FIELDS: Record<string, string[]> = {
  gallery:  ["tags"],
  news:     ["images"],
  setlists: ["songs"],
};

function preparePayload(section: string, data: Record<string, any>): Record<string, any> {
  const payload = { ...data };
  const arrayKeys = ARRAY_FIELDS[section] ?? [];
  for (const key of arrayKeys) {
    if (key in payload) payload[key] = sanitizeArrayField(payload[key]);
  }
  return payload;
}

// ─── ADMIN WRAPPER ───────────────────────────────────────────
function AdminPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ─── ERROR BOUNDARY ──────────────────────────────────────────
interface ErrorBoundaryProps {
  children: ReactNode;
  moduleName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dashboard Module Error Caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "3rem 1.5rem",
          maxWidth: 580,
          margin: "3rem auto",
          textAlign: "center",
          background: "rgba(22, 17, 15, 0.92)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          borderRadius: 18,
          boxShadow: "0 16px 50px rgba(0,0,0,0.6), 0 0 30px rgba(239,68,68,0.15)"
        }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.8rem",
            margin: "0 auto 16px"
          }}>
            <i className="bx bx-error" />
          </div>
          <h3 style={{ margin: "0 0 8px", color: "#fff", fontSize: "1.2rem", fontWeight: 700 }}>
            Modul {this.props.moduleName || "Halaman"} Mengalami Kendala
          </h3>
          <p style={{ margin: "0 0 20px", color: "var(--cv-text-mute, #a89a90)", fontSize: "0.88rem", lineHeight: 1.5 }}>
            {this.state.error?.message || "Terjadi kendala sementara saat memuat data modul. Silakan coba klik tombol di bawah untuk memuat ulang modul."}
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: "10px 24px",
              borderRadius: 24,
              border: "none",
              background: "linear-gradient(135deg, var(--cv-orange, #ff6b1a), var(--cv-orange-hi, #ff8f4d))",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.88rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 6px 20px rgba(255, 107, 26, 0.35)"
            }}
          >
            <i className="bx bx-refresh" /> Coba Lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── AUTH HOOK (PENGGANTI sessionStorage — server-side verified) ──────────────
function useAdminAuth() {
  const [authed,   setAuthed]   = useState(false);
  const [role,     setRole]     = useState<string>("admin");
  const [username, setUsername] = useState<string>("");
  const [checking, setChecking] = useState(true);

  const applyUserData = (data: { username?: string; name?: string; role?: string }) => {
    const uName = data.name || data.username || "Admin";
    currentAdminUsername = data.username || "admin";
    const uLower = (data.username || "").toLowerCase();
    const nameLower = (data.name || "").toLowerCase();
    const isSuper = data.role === "superadmin" || 
                    ["admin", "vallencia", "aditya"].includes(uLower) || 
                    uLower.includes("aditya") || 
                    nameLower.includes("aditya");
    setRole(isSuper ? "superadmin" : (data.role || "admin"));
    setUsername(uName);
    setAuthed(true);
  };

  useEffect(() => {
    // Verifikasi session ke server saat mount dengan timeout 3.5 detik
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    fetch("/api/admin/verify", {
      method:      "GET",
      credentials: "same-origin",
      signal:      controller.signal,
    })
      .then(res => res.json())
      .then(data => {
        const isValid = data.status === true && data.valid === true;
        if (isValid) {
          applyUserData(data);
        } else {
          setAuthed(false);
        }
      })
      .catch(() => {
        setAuthed(false);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setChecking(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", {
        method:      "POST",
        credentials: "same-origin",
      });
    } catch {}
    setAuthed(false);
  };

  return { authed, role, username, checking, setAuthed, logout, applyUserData };
}

// ─── LOGIN PAGE (auth via API → httpOnly cookie) ──────────────
function LoginPage({ onLogin }: { onLogin: (userData: any) => void }) {
  const [user, setUser]       = useState("");
  const [pass, setPass]       = useState("");
  const [hp, setHp]           = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user.trim() || !pass.trim()) {
      setErr("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const res = await fetch("/api/admin/login", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "same-origin",
        body:        JSON.stringify({
          username: user.trim(),
          password: pass.trim(),
          _hp:      hp,
        }),
      });

      const data = await res.json();

      if (data.status) {
        onLogin(data);
      } else {
        setErr(data.message || "Username atau password salah.");
      }
    } catch {
      setErr("Tidak bisa terhubung ke server. Coba lagi.");
    }

    setLoading(false);
  };

  return (
    <AdminPortal>
      <div className={styles.adminRoot}>
        <div className={styles.loginWrap}>
          {/* Background Passion Fire & Embers */}
          <AdminPassionBackground />

          <div className={styles.loginCard}>
            <div className={styles.loginLogo}>
              <i className="bx bxs-shield-alt-2" />
            </div>
            <div className={styles.loginShieldBadge}>
              <i className="bx bxs-shield-alt-2" /> CAVALLERY PORTAL
            </div>
            <h1 className={styles.loginTitle}>Cavallery Admin</h1>
            <p className={styles.loginSub}>Gerbang Terproteksi &bull; Akses Terbatas</p>

            {err && <div className={styles.errMsg}><i className="bx bx-error-circle" /> {err}</div>}

            {/* Invisible Honeypot */}
            <input
              type="text"
              name="_hp_address"
              value={hp}
              onChange={e => setHp(e.target.value)}
              style={{ display: "none" }}
              tabIndex={-1}
              autoComplete="off"
            />

            <div className={styles.field}>
              <label>Username</label>
              <input
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="Username admin"
                autoComplete="username"
                disabled={loading}
                onKeyDown={e => e.key === "Enter" && submit()}
              />
            </div>

            <div className={styles.field}>
              <label>Password</label>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                onKeyDown={e => e.key === "Enter" && submit()}
              />
            </div>

            <button className={styles.loginBtn} onClick={submit} disabled={loading} style={{ marginTop: "14px" }}>
              {loading ? (
                <><i className="bx bx-loader-alt bx-spin" /> Memeriksa Akses...</>
              ) : (
                <><i className="bx bx-log-in" /> Masuk Dashboard</>
              )}
            </button>

            <div className={styles.loginCardFooter}>
              <span>Team Passion &bull; Cavallery Administration</span>
            </div>
          </div>
        </div>
      </div>
    </AdminPortal>
  );
}

// ─── TOAST ────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <i className={`bx ${type === "success" ? "bx-check-circle" : "bx-error-circle"}`} />
      {msg}
    </div>
  );
}

// ─── CONFIRM MODAL ────────────────────────────────────────────
function ConfirmModal({ msg, onConfirm, onCancel }: { msg: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
        <i className="bx bx-trash" style={{ fontSize: "2.5rem", color: "var(--adm-danger)" }} />
        <p>{msg}</p>
        <div className={styles.confirmBtns}>
          <button className={styles.btnGhost} onClick={onCancel}>Batal</button>
          <button className={styles.btnDanger} onClick={onConfirm}>Hapus</button>
        </div>
      </div>
    </div>
  );
}

// ─── GENERIC TABLE ────────────────────────────────────────────
function DataTable({ cols, rows, onEdit, onDelete, readOnly }: {
  cols: { key: string; label: string }[];
  rows: any[];
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
  readOnly?: boolean;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={`${styles.table} ${styles.responsiveTable}`}>
        <thead>
          <tr>
            {cols.map(c => <th key={c.key}>{c.label}</th>)}
            {!readOnly && <th>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length + (readOnly ? 0 : 1)} className={styles.empty}><i className="bx bx-inbox" /> Tidak ada data</td></tr>
          ) : rows.map((row, i) => (
            <tr key={row.id ?? row.stat_key ?? i}>
              {cols.map(c => (
                <td key={c.key} data-label={c.label}>{
                  typeof row[c.key] === "boolean" ? (row[c.key] ? "✓" : "✗") :
                  c.key === "image_url" && row[c.key] ? <img src={row[c.key]} alt="" className={styles.thumb} /> :
                  c.key === "slug" && row[c.key] ? (
                    <a
                      href={`/news/cavallery-statement/${row[c.key]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--cv-orange)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      {String(row[c.key])} <i className="bx bx-link-external" style={{ fontSize: "0.85em" }} />
                    </a>
                  ) :
                  c.key === "link_url" && row[c.key] ? (
                    <a
                      href={row[c.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--cv-orange)", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      Buka Web <i className="bx bx-link-external" style={{ fontSize: "0.85em" }} />
                    </a>
                  ) :
                  Array.isArray(row[c.key]) ? row[c.key].join(", ").slice(0, 60) :
                  String(row[c.key] ?? "-").slice(0, 60)
                }</td>
              ))}
              {!readOnly && (
                <td data-label="Aksi">
                  <div className={styles.actionBtns}>
                    <button className={styles.btnEdit} onClick={() => onEdit(row)}><i className="bx bx-edit" /></button>
                    <button className={styles.btnDel}  onClick={() => onDelete(row)}><i className="bx bx-trash" /></button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MEDIA UPLOAD MODAL ───────────────────────────────────────
function MediaUploadModal({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: (uploadedData: any) => void;
}) {
  const [files, setFiles]         = useState<File[]>([]);
  const [folder, setFolder]       = useState("cavallery/images");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) setFiles(Array.from(e.dataTransfer.files));
  };

  const upload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setProgress([]);

    if (files.length === 1) {
      const fd = new FormData();
      fd.append("file", files[0]);
      fd.append("folder", folder);
      fd.append("alt_text", files[0].name);
      try {
        const res  = await fetch("/api/media/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json.status || json.success) {
          setProgress([`✓ ${files[0].name} — berhasil diunggah ke database!`]);
          setTimeout(() => {
            onUploaded(json.data);
          }, 300);
        } else {
          setProgress([`✗ ${files[0].name} — ${json.message || "Gagal mengunggah"}`]);
        }
      } catch {
        setProgress([`✗ ${files[0].name} — error jaringan`]);
      }
    } else {
      const fd = new FormData();
      files.forEach(f => fd.append("files[]", f));
      fd.append("folder", folder);
      try {
        const res  = await fetch("/api/media/upload-multiple", { method: "POST", body: fd });
        const json = await res.json();
        const logs: string[] = [];
        (json.data?.uploaded ?? []).forEach((u: any) => logs.push(`✓ ${u.original_name}`));
        (json.data?.errors   ?? []).forEach((e: any) => logs.push(`✗ ${e.name} — ${e.reason}`));
        setProgress(logs);
        if (json.data?.uploaded?.length > 0) {
          setTimeout(() => {
            onUploaded(json.data.uploaded);
          }, 400);
        }
      } catch {
        setProgress(["✗ Error jaringan"]);
      }
    }
    setUploading(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.formModal} style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className={styles.formModalHeader}>
          <h3><i className="bx bx-upload" /> Upload Media</h3>
          <button className={styles.closeX} onClick={onClose}><i className="bx bx-x" /></button>
        </div>
        <div className={styles.formBody}>
          <div
            className={styles.dropZone}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <i className="bx bx-cloud-upload" style={{ fontSize: "2.5rem", opacity: 0.5 }} />
            <p>Drag & drop atau <u>klik untuk pilih file</u></p>
            <small>JPEG, PNG, WEBP, GIF, MP4, WEBM, MOV · Maks 10MB gambar / 200MB video</small>
            <input
              ref={inputRef} type="file" multiple style={{ display: "none" }}
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={handleFiles}
            />
          </div>

          {files.length > 0 && (
            <div className={styles.fileList}>
              {files.map((f, i) => (
                <div key={i} className={styles.fileItem}>
                  <i className={`bx ${f.type.startsWith("video") ? "bx-video" : "bx-image"}`} />
                  <span>{f.name}</span>
                  <small>{(f.size / 1024 / 1024).toFixed(2)} MB</small>
                </div>
              ))}
            </div>
          )}

          <div className={styles.field}>
            <label>Folder</label>
            <select
              value={folder}
              onChange={e => setFolder(e.target.value)}
              style={{
                background: "var(--adm-surface)", color: "var(--adm-text)",
                border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px",
              }}
            >
              <option value="cavallery/images">cavallery/images</option>
              <option value="cavallery/videos">cavallery/videos</option>
              <option value="gallery">gallery</option>
              <option value="news">news</option>
            </select>
          </div>

          {progress.length > 0 && (
            <div className={styles.progressLog}>
              {progress.map((p, i) => (
                <div key={i} className={p.startsWith("✓") ? styles.logOk : styles.logErr}>{p}</div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.formFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Tutup</button>
          <button className={styles.btnPrimary} onClick={upload} disabled={uploading || files.length === 0}>
            {uploading
              ? <><i className="bx bx-loader-alt bx-spin" /> Mengupload...</>
              : <><i className="bx bx-upload" /> Upload {files.length > 0 ? `(${files.length})` : ""}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MEDIA PICKER MODAL ───────────────────────────────────────
function MediaPickerModal({
  onPick,
  onClose,
  type = "image",
}: {
  onPick: (url: string) => void;
  onClose: () => void;
  type?: "image" | "video" | "all";
}) {
  const [items, setItems]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [folder, setFolder]         = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (folder) params.set("folder", folder);
      if (type !== "all") params.set("type", type);
      params.set("limit", "500");
      params.set("_t", String(Date.now()));
      const res  = await fetch(`/api/media?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setItems(json?.data?.items ?? []);
    } catch { setItems([]); }
    setLoading(false);
  }, [search, folder, type]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={styles.formModal}
          style={{ maxWidth: 760, width: "95vw" }}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.formModalHeader}>
            <h3><i className="bx bx-folder-open" /> Pilih Media</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className={styles.btnPrimary}
                style={{ fontSize: 13 }}
                onClick={() => setShowUpload(true)}
              >
                <i className="bx bx-upload" /> Upload Baru
              </button>
              <button className={styles.closeX} onClick={onClose}><i className="bx bx-x" /></button>
            </div>
          </div>
          <div className={styles.formBody}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input
                placeholder="Cari nama file..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, minWidth: 160,
                  background: "var(--adm-surface)", color: "var(--adm-text)",
                  border: "1px solid var(--adm-border)", borderRadius: 6, padding: "7px 12px",
                }}
              />
              <select
                value={folder}
                onChange={e => setFolder(e.target.value)}
                style={{
                  background: "var(--adm-surface)", color: "var(--adm-text)",
                  border: "1px solid var(--adm-border)", borderRadius: 6, padding: "7px 12px",
                }}
              >
                <option value="">Semua Folder</option>
                <option value="cavallery/images">cavallery/images</option>
                <option value="cavallery/videos">cavallery/videos</option>
                <option value="gallery">gallery</option>
                <option value="news">news</option>
              </select>
              <button className={styles.btnGhost} onClick={load}>
                <i className="bx bx-refresh" />
              </button>
            </div>

            {loading ? (
              <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat...</div>
            ) : items.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", opacity: 0.4 }}>
                <i className="bx bx-image-alt" style={{ fontSize: "2.5rem" }} />
                <p>Belum ada media</p>
              </div>
            ) : (
              <div className={styles.mediaGrid}>
                {items.map(item => (
                  <div
                    key={item.id}
                    className={styles.mediaThumbWrap}
                    onClick={() => { onPick(item.public_url); onClose(); }}
                  >
                    {item.type === "video" ? (
                      <div className={styles.videoThumb}>
                        <i className="bx bx-video-recording" />
                        <small>{item.original_name.slice(0, 20)}</small>
                      </div>
                    ) : (
                      <img
                        src={(item.public_url || "").replace(/\\/g, "/")}
                        alt={item.alt_text || item.original_name}
                        className={styles.mediaThumbImg}
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = "true";
                            target.src = "/images/cava-logo-round.png";
                          }
                        }}
                      />
                    )}
                    <div className={styles.mediaThumbLabel}>{item.original_name.slice(0, 22)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={styles.formFooter}>
            <button className={styles.btnGhost} onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>

      {showUpload && (
        <MediaUploadModal
          onClose={() => { setShowUpload(false); load(); }}
          onUploaded={() => { setShowUpload(false); load(); }}
        />
      )}
    </>
  );
}

// ─── FORM MODAL ───────────────────────────────────────────────
function FormModal({
  title, fields, data, onChange, onSave, onClose, saving,
}: {
  title: string;
  fields: { key: string; label: string; type?: string; rows?: number; hint?: string }[];
  data: Record<string, any>;
  onChange: (key: string, val: any) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [pickerField, setPickerField] = useState<string | null>(null);

  const displayValue = (key: string, val: any): string => {
    if (Array.isArray(val)) return val.join(", ");
    return String(val ?? "");
  };

  const isImageField = (key: string) =>
    key === "image_url" || key === "images" || key === "img";

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.formModal} onClick={e => e.stopPropagation()}>
          <div className={styles.formModalHeader}>
            <h3>{title}</h3>
            <button className={styles.closeX} onClick={onClose}><i className="bx bx-x" /></button>
          </div>
          <div className={styles.formBody}>
            {fields.map(f => (
              <div key={f.key} className={styles.field}>
                <label>
                  {f.label}
                  {f.hint && <span className={styles.fieldHint}> — {f.hint}</span>}
                </label>

                {isImageField(f.key) ? (
                  <>
                    <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                      <input
                        style={{ flex: 1 }}
                        type="text"
                        value={displayValue(f.key, data[f.key])}
                        onChange={e => onChange(f.key, e.target.value)}
                        placeholder="URL gambar atau pilih dari media..."
                      />
                      <button
                        type="button"
                        className={styles.btnGhost}
                        style={{ whiteSpace: "nowrap", fontSize: 13 }}
                        onClick={() => setPickerField(f.key)}
                      >
                        <i className="bx bx-folder-open" /> Pilih
                      </button>
                    </div>
                    {data[f.key] &&
                      typeof data[f.key] === "string" &&
                      !data[f.key].includes(",") && (
                        <img
                          src={data[f.key]}
                          alt="preview"
                          style={{
                            marginTop: 6, maxHeight: 100, borderRadius: 6,
                            objectFit: "cover", border: "1px solid var(--adm-border)",
                          }}
                          onError={e => (e.currentTarget.style.display = "none")}
                        />
                    )}
                  </>
                ) : f.type === "textarea" ? (
                  <textarea
                    rows={f.rows ?? 4}
                    value={displayValue(f.key, data[f.key])}
                    onChange={e => onChange(f.key, e.target.value)}
                  />
                ) : f.type === "checkbox" ? (
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={!!data[f.key]}
                      onChange={e => onChange(f.key, e.target.checked)}
                    />
                    <span>{data[f.key] ? "Aktif" : "Nonaktif"}</span>
                  </label>
                ) : (
                  <input
                    type={f.type ?? "text"}
                    value={displayValue(f.key, data[f.key])}
                    onChange={e => onChange(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
          <div className={styles.formFooter}>
            <button className={styles.btnGhost} onClick={onClose}>Batal</button>
            <button className={styles.btnPrimary} onClick={onSave} disabled={saving}>
              {saving
                ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</>
                : <><i className="bx bx-save" /> Simpan</>
              }
            </button>
          </div>
        </div>
      </div>

      {pickerField && (
        <MediaPickerModal
          type="image"
          onPick={url => { onChange(pickerField, url); setPickerField(null); }}
          onClose={() => setPickerField(null)}
        />
      )}
    </>
  );
}

// ─── MEDIA MANAGER ────────────────────────────────────────────
function MediaManager() {
  const [items, setItems]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [folder, setFolder]         = useState("");
  const [filterType, setFilterType] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [confirm, setConfirm]       = useState<any>(null);
  const [toast, setToast]           = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [total, setTotal]           = useState(0);
  const [publishedIds, setPublishedIds] = useState<Set<string>>(new Set());
  const [publishModal, setPublishModal] = useState<any | null>(null);
  const [pubTitle, setPubTitle]         = useState("");
  const [pubDate, setPubDate]           = useState("");
  const [pubActive, setPubActive]       = useState(true);
  const [pubSaving, setPubSaving]       = useState(false);
  const [draggedIdx, setDraggedIdx]     = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx]   = useState<number | null>(null);
  const [syncingVideos, setSyncingVideos] = useState(false);
  const [cleaningVideos, setCleaningVideos] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const handleCleanupLocalVideos = async () => {
    if (cleaningVideos) return;
    if (!window.confirm("Hapus seluruh file MP4 lokal di server (karena sudah dialihkan ke URL CDN)?")) return;
    setCleaningVideos(true);
    showToast("Sedang menghapus file MP4 lokal di server...", "success");
    try {
      const res = await fetch("/api/admin/media/cleanup-local");
      const data = await res.json();
      if (data.success) {
        showToast(`Berhasil menghapus file MP4 lokal (menghemat ${data.totalFreedMB} MB)!`, "success");
      } else {
        showToast("Gagal membersihkan: " + (data.message || "Error"), "error");
      }
    } catch (err: any) {
      showToast("Gagal: " + err.message, "error");
    } finally {
      setCleaningVideos(false);
    }
  };

  const handleSyncVideos = async () => {
    if (syncingVideos) return;
    setSyncingVideos(true);
    showToast("Sedang mengunggah video lokal ke server CDN Vallzy...", "success");
    try {
      const res = await fetch("/api/admin/media/upload-local");
      const data = await res.json();
      if (data.success) {
        showToast("Semua video lokal berhasil di-offload ke server CDN Vallzy!", "success");
      } else {
        showToast("Gagal migrasi video: " + (data.message || "Error"), "error");
      }
    } catch (err: any) {
      showToast("Gagal menghubungi API: " + err.message, "error");
    } finally {
      setSyncingVideos(false);
    }
  };

  const handleReorder = async (newItems: any[]) => {
    setItems(newItems);
    const orderedIds = newItems.map((i) => i.id).filter(Boolean);
    try {
      const res = await fetch("/api/media/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      const json = await res.json();
      if (json.status || res.ok) {
        showToast("Urutan foto diperbarui & otomatis aktif di web!", "success");
      }
    } catch {
      showToast("Gagal menyimpan urutan media", "error");
    }
  };

  const moveItem = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    handleReorder(next);
  };

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const onDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    if (draggedIdx === null || draggedIdx === dropIndex) return;
    const next = [...items];
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(dropIndex, 0, moved);
    setDraggedIdx(null);
    handleReorder(next);
  };

  const onDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      try {
        const pubRes = await fetch("/api/published-media");
        if (pubRes.ok) {
          const pubJson = await pubRes.json();
          if (Array.isArray(pubJson?.publishedIds)) {
            setPublishedIds(new Set(pubJson.publishedIds));
          }
        }
      } catch {}

      const params = new URLSearchParams();
      if (search)     params.set("search", search);
      if (folder)     params.set("folder", folder);
      if (filterType) params.set("type",   filterType);
      params.set("limit", "500");
      params.set("_t", String(Date.now()));
      const res  = await fetch(`/api/media?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setItems(json?.data?.items ?? []);
      setTotal(json?.data?.total ?? 0);
    } catch { setItems([]); }
    setLoading(false);
  }, [search, folder, filterType]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePublish = async (item: any) => {
    const isCurrentlyPub = Number(item.is_published) === 1;
    const targetStatus = !isCurrentlyPub;
    try {
      const res = await fetch("/api/published-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id: String(item.id) }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const finalStatus = json.newStatus !== undefined ? json.newStatus : targetStatus;
        setItems(prev =>
          prev.map(i =>
            String(i.id) === String(item.id)
              ? { ...i, is_published: finalStatus ? 1 : 0 }
              : i
          )
        );
        showToast(
          finalStatus
            ? `"${item.original_name}" DITERBITKAN ke Web!`
            : `"${item.original_name}" DISEMBUNYIKAN dari Web!`,
          "success"
        );
      } else {
        showToast(json.message || "Gagal mengubah status publikasi", "error");
      }
    } catch {
      showToast("Gagal mengubah status publikasi", "error");
    }
  };

  const deleteOne = async (item: any) => {
    setConfirm(null);
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status || res.ok) {
        showToast("Media berhasil dihapus dari database", "success");
        setItems(prev => prev.filter(i => String(i.id) !== String(item.id)));
        setTotal(prev => Math.max(0, prev - 1));
      } else {
        showToast(json.message || "Gagal menghapus", "error");
      }
    } catch {
      showToast("Error jaringan", "error");
    }
  };

  const deleteBulk = async () => {
    const idsToDelete = Array.from(selected);
    setConfirm(null);
    try {
      const res = await fetch("/api/media/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });
      const json = await res.json();
      if (json.status || res.ok) {
        showToast(`${idsToDelete.length} media berhasil dihapus dari database`, "success");
        const idSet = new Set(idsToDelete.map(String));
        setItems(prev => prev.filter(i => !idSet.has(String(i.id))));
        setTotal(prev => Math.max(0, prev - idsToDelete.length));
        setSelected(new Set());
      } else {
        showToast(json.message || "Gagal menghapus", "error");
      }
    } catch {
      showToast("Error jaringan", "error");
    }
  };

  const openPublish = (item: any) => {
    setPublishModal(item);
    setPubTitle(item.original_name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " "));
    setPubDate(new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }));
    setPubActive(true);
  };

  const handlePublishToGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publishModal) return;
    setPubSaving(true);
    try {
      const res = await fetch(api("/gallery"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pubTitle,
          image_url: publishModal.public_url,
          date_label: pubDate,
          is_active: pubActive,
        }),
      });
      const json = await res.json();
      if (json.status) {
        showToast("Foto berhasil diterbitkan ke Gallery web!", "success");
        setPublishModal(null);
      } else {
        showToast(json.message || "Gagal menerbitkan ke Gallery", "error");
      }
    } catch {
      showToast("Gagal terhubung ke server", "error");
    }
    setPubSaving(false);
  };

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && (
        <ConfirmModal
          msg={confirm.bulk
            ? `Hapus ${selected.size} media yang dipilih?`
            : `Hapus "${confirm.original_name}"?`}
          onConfirm={() => confirm.bulk ? deleteBulk() : deleteOne(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {showUpload && (
        <MediaUploadModal
          onClose={() => { setShowUpload(false); load(); }}
          onUploaded={(data) => {
            setShowUpload(false);
            if (data) {
              const newItems = Array.isArray(data) ? data : [data];
              setItems(prev => [...newItems, ...prev]);
              setTotal(prev => prev + newItems.length);
              showToast(`${newItems.length} media berhasil diunggah ke database!`, "success");
            }
            load();
          }}
        />
      )}

      {publishModal && (
        <div className={styles.modalOverlay} onClick={() => setPublishModal(null)}>
          <div className={styles.formModal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className={styles.formModalHeader}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="bx bx-image" style={{ color: "var(--cv-orange)" }} /> Tampilkan Foto ke Gallery Web
              </h3>
              <button className={styles.closeX} onClick={() => setPublishModal(null)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <form onSubmit={handlePublishToGallery}>
              <div className={styles.formBody}>
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <img
                    src={publishModal.public_url}
                    alt={publishModal.original_name}
                    style={{ maxHeight: 150, maxWidth: "100%", borderRadius: 8, objectFit: "cover" }}
                  />
                </div>

                <div className={styles.field}>
                  <label>Judul Foto di Galeri <span style={{ color: "#e05252" }}>*</span></label>
                  <input
                    value={pubTitle}
                    onChange={(e) => setPubTitle(e.target.value)}
                    required
                    placeholder="Contoh: Erine Theater Seitansai"
                    autoFocus
                  />
                </div>

                <div className={styles.field}>
                  <label>Label Tanggal</label>
                  <input
                    value={pubDate}
                    onChange={(e) => setPubDate(e.target.value)}
                    placeholder="Contoh: 20 Agustus 2026"
                  />
                </div>

                <div className={styles.field} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
                  <input
                    type="checkbox"
                    id="pubActiveCheckbox"
                    checked={pubActive}
                    onChange={(e) => setPubActive(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  <label htmlFor="pubActiveCheckbox" style={{ margin: 0, cursor: "pointer", fontWeight: 600 }}>
                    Langsung tampilkan di halaman /gallery (Aktif)
                  </label>
                </div>
                {!pubActive && (
                  <small style={{ color: "var(--cv-text-mute)", display: "block", marginTop: -4 }}>
                    Jika tidak dicentang, foto tersimpan sebagai draft dan belum terlihat oleh publik.
                  </small>
                )}
              </div>

              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setPublishModal(null)}>
                  Batal
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={pubSaving}>
                  {pubSaving ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" /> Menerbitkan...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-check" /> Terbitkan ke Gallery
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-folder-open" /> Media
          <span className={styles.count}>{total} file</span>
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {selected.size > 0 && (
            <button className={styles.btnDanger} onClick={() => setConfirm({ bulk: true })}>
              <i className="bx bx-trash" /> Hapus ({selected.size})
            </button>
          )}
          <button
            className={styles.btnGhost}
            onClick={handleSyncVideos}
            disabled={syncingVideos}
            title="Upload otomatis semua file video MP4 lokal ke server CDN Vallzy"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <i className={syncingVideos ? "bx bx-loader-alt bx-spin" : "bx bx-cloud-upload"} />
            {syncingVideos ? "Menyinkronkan..." : "Sinkron Video ke CDN"}
          </button>
          <button
            className={styles.btnGhost}
            onClick={handleCleanupLocalVideos}
            disabled={cleaningVideos}
            title="Hapus seluruh file MP4 lokal di folder public/assets dan public/audio (hemat 100+ MB)"
            style={{ display: "flex", alignItems: "center", gap: 6, color: "#e05252" }}
          >
            <i className={cleaningVideos ? "bx bx-loader-alt bx-spin" : "bx bx-trash"} />
            {cleaningVideos ? "Menghapus..." : "Hapus MP4 Lokal"}
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowUpload(true)}>
            <i className="bx bx-upload" /> Upload
          </button>
        </div>
      </div>

      <div style={{
        background: "color-mix(in srgb, var(--cv-orange) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)",
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 16,
        fontSize: "0.85rem",
        color: "var(--cv-text-dim)",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <i className="bx bx-shield-quarter" style={{ fontSize: "1.3rem", color: "var(--cv-orange)", flexShrink: 0 }} />
        <span>
          <strong>Kontrol Publikasi Media:</strong> Klik ikon mata <i className="bx bx-show" style={{ color: "#10b981" }} /> / <i className="bx bx-hide" /> pada tiap kartu untuk <strong>menerbitkan atau menyembunyikan</strong> file dari halaman About Cavallery.
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          placeholder="Cari nama file..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 180,
            background: "var(--adm-surface)", color: "var(--adm-text)",
            border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px",
          }}
        />
        <select value={folder} onChange={e => setFolder(e.target.value)} style={{ background: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px" }}>
          <option value="">Semua Folder</option>
          <option value="cavallery/images">cavallery/images</option>
          <option value="cavallery/videos">cavallery/videos</option>
          <option value="gallery">gallery</option>
          <option value="news">news</option>
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ background: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px" }}>
          <option value="">Semua Tipe</option>
          <option value="image">Gambar</option>
          <option value="video">Video</option>
        </select>
        <button className={styles.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </div>

      {loading ? (
        <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat media...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}>
          <i className="bx bx-image-alt" style={{ fontSize: "3rem" }} />
          <p>Belum ada media</p>
        </div>
      ) : (
        <div className={styles.mediaGrid}>
          {items.map((item, idx) => {
            const sel = selected.has(item.id);
            const isPub = Number(item.is_published) === 1;
            const isDragging = draggedIdx === idx;
            const isDragOver = dragOverIdx === idx && draggedIdx !== idx;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => onDragStart(e, idx)}
                onDragOver={(e) => onDragOver(e, idx)}
                onDrop={(e) => onDrop(e, idx)}
                onDragEnd={onDragEnd}
                className={`${styles.mediaCard} ${sel ? styles.mediaCardSelected : ""} ${isDragging ? styles.mediaCardDragging : ""} ${isDragOver ? styles.mediaCardDragOver : ""}`}
              >
                <div className={styles.mediaCheckbox} onClick={() => toggleSelect(item.id)}>
                  <i className={`bx ${sel ? "bx-checkbox-checked" : "bx-checkbox"}`} />
                </div>
                <div className={styles.orderBadge} title={`Urutan ke-${idx + 1}`}>
                  #{idx + 1}
                </div>
                <div className={styles.dragHandle} title="Tahan dan geser (drag) untuk mengubah urutan foto">
                  <i className="bx bx-grid-vertical" />
                </div>

                {item.type === "video" ? (
                  item.thumbnail_url ? (
                    <div style={{ position: "relative", width: "100%", aspectRatio: "1 / 1", overflow: "hidden", background: "var(--cv-ink-1)" }}>
                      <img
                        src={item.thumbnail_url}
                        alt={item.original_name}
                        className={styles.mediaCardImg}
                        loading="lazy"
                      />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "color-mix(in srgb, var(--cv-ink) 60%, transparent)" }}>
                        <i className="bx bx-play-circle" style={{ fontSize: "2.6rem", color: "var(--cv-orange)", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))" }} />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.videoThumb}>
                      <i className="bx bx-video-recording" style={{ fontSize: "2.5rem" }} />
                    </div>
                  )
                ) : (
                  <img
                    src={(item.public_url || "").replace(/\\/g, "/")}
                    alt={item.alt_text || item.original_name}
                    className={styles.mediaCardImg}
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.dataset.retried && item.public_url) {
                        target.dataset.retried = "true";
                        target.src = `${item.public_url}${item.public_url.includes("?") ? "&" : "?"}v=${Date.now()}`;
                      } else if (!target.dataset.fallback) {
                        target.dataset.fallback = "true";
                        target.src = "/images/cava-logo-round.png";
                      }
                    }}
                  />
                )}
                <div className={styles.mediaCardInfo}>
                  <div className={styles.mediaCardName} title={item.original_name}>
                    {item.original_name.length > 22 ? item.original_name.slice(0, 20) + "…" : item.original_name}
                  </div>
                  <div className={styles.mediaCardMeta}>
                    <span className={`${styles.typeBadge} ${item.type === "video" ? styles.typeBadgeVideo : styles.typeBadgeImage}`}>{item.type}</span>
                    <span>{(item.file_size / 1024).toFixed(0)} KB</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: isPub ? "rgba(16, 185, 129, 0.15)" : "color-mix(in srgb, var(--cv-bone) 6%, transparent)",
                        color: isPub ? "#10b981" : "var(--cv-text-mute)",
                        border: `1px solid ${isPub ? "rgba(16, 185, 129, 0.3)" : "var(--cv-line)"}`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <i className={`bx ${isPub ? "bx-check-circle" : "bx-lock-alt"}`} />
                      {isPub ? "Tampil di Web" : "Hanya di Media"}
                    </span>
                  </div>
                </div>

                <div className={styles.mediaCardActions}>
                  <button
                    title="Geser ke kiri / lebih awal"
                    disabled={idx === 0}
                    onClick={() => moveItem(idx, "left")}
                    className={styles.btnEdit}
                    style={{ opacity: idx === 0 ? 0.3 : 1 }}
                  >
                    <i className="bx bx-chevron-left" />
                  </button>
                  <button
                    title="Geser ke kanan / setelahnya"
                    disabled={idx === items.length - 1}
                    onClick={() => moveItem(idx, "right")}
                    className={styles.btnEdit}
                    style={{ opacity: idx === items.length - 1 ? 0.3 : 1 }}
                  >
                    <i className="bx bx-chevron-right" />
                  </button>
                  <button
                    title={isPub ? "Sembunyikan dari About Cavallery" : "Terbitkan ke About Cavallery"}
                    onClick={() => togglePublish(item)}
                    className={styles.btnEdit}
                    style={{ color: isPub ? "#10b981" : "var(--cv-text-mute)" }}
                  >
                    <i className={`bx ${isPub ? "bx-show" : "bx-hide"}`} />
                  </button>
                  {item.type === "image" && (
                    <button
                      title="Terbitkan ke Gallery Web"
                      onClick={() => openPublish(item)}
                      className={styles.btnEdit}
                      style={{ color: "var(--cv-orange)" }}
                    >
                      <i className="bx bx-image-add" />
                    </button>
                  )}
                  <button title="Salin URL" onClick={() => navigator.clipboard.writeText(item.public_url)} className={styles.btnEdit}><i className="bx bx-copy" /></button>
                  <button className={styles.btnDel} onClick={() => setConfirm(item)} title="Hapus"><i className="bx bx-trash" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── DISCORD MANAGER ──────────────────────────────────────────
interface DiscordLog {
  id: string;
  time: string;
  title: string;
  description?: string;
  url?: string;
  mention: string;
  image?: string;
  hasImage: boolean;
  status?: "success" | "failed";
}

function DiscordManager() {
  const [title,       setTitle]       = useState("");
  const [desc,        setDesc]        = useState("");
  const [url,         setUrl]         = useState("https://cavallery.id");
  const [image,       setImage]       = useState("");
  const [mention,     setMention]     = useState("");
  const [sending,     setSending]     = useState(false);
  const [logs,        setLogs]        = useState<DiscordLog[]>([]);
  const [toast,       setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showPicker,  setShowPicker]  = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [viewLog,     setViewLog]     = useState<DiscordLog | null>(null);
  const [searchLog,   setSearchLog]   = useState("");

  const STORAGE_KEY = "cava_discord_logs";

  useEffect(() => {
    // 1. Ambil data pengumuman aktif dari /api/discord agar sinkron dengan web internal
    fetch("/api/discord")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const apiLogs: DiscordLog[] = json.data.map((item: any) => ({
            id: item.id || `log-${Date.now()}`,
            time: item.date || item.timestamp,
            title: item.title,
            description: item.content || "",
            url: item.url || "https://cavallery.id",
            mention: item.mention || "—",
            image: item.image || "",
            hasImage: !!item.image,
            status: "success",
          }));
          setLogs(apiLogs);
        } else {
          // Fallback ke localStorage jika API kosong
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setLogs(parsed);
          }
        }
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setLogs(parsed);
          }
        } catch {}
      });
  }, []);

  const saveLogs = (newLogs: DiscordLog[]) => {
    setLogs(newLogs);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs)); } catch {}
  };

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const now = () => new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const send = async () => {
    if (!title.trim() || !desc.trim()) { showToast("Judul dan deskripsi wajib diisi", "error"); return; }
    setSending(true);
    try {
      const time   = now();
      let urlVal   = url.trim() || "https://cavallery.id";
      if (urlVal && !urlVal.startsWith("http://") && !urlVal.startsWith("https://")) {
        urlVal = "https://" + urlVal.replace(/^\/+/, "");
      }

      let imgVal   = image.trim();
      if (imgVal && !imgVal.startsWith("http://") && !imgVal.startsWith("https://")) {
        if (imgVal.startsWith("/")) {
          imgVal = "https://cavallery.id" + imgVal;
        } else {
          imgVal = "https://" + imgVal;
        }
      }

      // Bersihkan deskripsi & potong aman max 1800 karakter
      let cleanDesc = desc.trim();
      if (cleanDesc.length > 1800) {
        cleanDesc = cleanDesc.slice(0, 1797) + "...";
      }

      const payload: Record<string, any> = {
        title: title.trim(),
        description: cleanDesc,
        url: urlVal,
      };

      if (mention && mention !== "Tanpa Mention") {
        payload.mention = mention;
      }

      if (imgVal) {
        payload.image = imgVal;
        payload.image_url = imgVal;
      }

      const res = await fetch(DISCORD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => null);

      if (res.ok && resData?.success !== false) {
        showToast("✅ Berhasil diposting ke Web & Discord!", "success");
        const newLog: DiscordLog = {
          id: resData?.data?.id || `log-${Date.now()}`,
          time,
          title: title.trim(),
          description: cleanDesc,
          url: urlVal,
          mention: mention || "—",
          image: imgVal,
          hasImage: !!imgVal,
          status: "success",
        };
        saveLogs([newLog, ...logs].slice(0, 50));
        setTitle(""); setDesc(""); setImage(""); setMention("");
      } else {
        const errMsg = resData?.message || resData?.error || "Gagal mengirim ke Discord";
        showToast(`❌ Gagal (${res.status}): ${errMsg}`, "error");

        // Simpan juga ke log dengan status failed agar bisa dicoba lagi
        const failLog: DiscordLog = {
          id: `log-${Date.now()}`,
          time,
          title: title.trim(),
          description: cleanDesc,
          url: urlVal,
          mention: mention || "—",
          image: imgVal,
          hasImage: !!imgVal,
          status: "failed",
        };
        saveLogs([failLog, ...logs].slice(0, 50));
      }
    } catch (e: any) {
      showToast("❌ Error jaringan: " + (e?.message ?? "unknown"), "error");
    }
    setSending(false);
  };

  // Simpan Draft tanpa kirim
  const saveDraft = () => {
    if (!title.trim()) { showToast("Masukkan judul sebelum simpan draft", "error"); return; }
    const newLog: DiscordLog = {
      id: `draft-${Date.now()}`,
      time: now(),
      title: "[Draft] " + title.trim(),
      description: desc.trim(),
      url: url.trim() || "https://cavallery.id",
      mention: mention || "—",
      image: image.trim(),
      hasImage: !!image.trim(),
      status: "success",
    };
    saveLogs([newLog, ...logs].slice(0, 50));
    showToast("📝 Draft pengumuman berhasil disimpan ke riwayat!", "success");
  };

  // Muat data log ke dalam Form (Re-use / Edit)
  const loadLogToForm = (log: DiscordLog) => {
    setTitle(log.title.replace(/^\[Draft\]\s*/, ""));
    setDesc(log.description || "");
    setUrl(log.url || "https://cavallery.id");
    setImage(log.image || "");
    setMention(log.mention === "—" ? "" : log.mention);
    setViewLog(null);
    showToast("📋 Data pengumuman dimuat ke form input!", "success");
  };

  // Hapus single log
  const deleteSingleLog = async (id: string) => {
    try {
      await fetch(`/api/discord?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch {}
    const updated = logs.filter(l => l.id !== id);
    saveLogs(updated);
    setDeleteLogId(null);
    if (viewLog?.id === id) setViewLog(null);
    showToast("🗑️ Pengumuman dihapus dari web & log", "success");
  };

  const clearLogs = () => { saveLogs([]); setConfirmClear(false); showToast("Semua riwayat log dihapus", "success"); };

  const embedColor = mention === "@everyone" ? "#e05252" : mention === "@here" ? "var(--cv-orange)" : "#5865f2";

  // Filter logs berdasarkan keyword pencarian
  const filteredLogs = logs.filter(l => {
    if (!searchLog.trim()) return true;
    const q = searchLog.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      l.time.toLowerCase().includes(q) ||
      l.mention.toLowerCase().includes(q)
    );
  });

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmClear && <ConfirmModal msg="Hapus semua riwayat pengiriman Discord?" onConfirm={clearLogs} onCancel={() => setConfirmClear(false)} />}
      {deleteLogId && <ConfirmModal msg="Hapus item riwayat log ini?" onConfirm={() => deleteSingleLog(deleteLogId)} onCancel={() => setDeleteLogId(null)} />}
      {showPicker && <MediaPickerModal type="image" onPick={url => { setImage(url); setShowPicker(false); }} onClose={() => setShowPicker(false)} />}

      {/* Modal Detail Log (Read/Preview CRUD) */}
      {viewLog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "var(--cv-ink-2)", border: "1px solid var(--cv-line-strong)", borderRadius: 16, width: "100%", maxWidth: 520, padding: 24, display: "flex", flexDirection: "column", gap: 16, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--cv-line-strong)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="bxl-discord-alt" style={{ color: "#5865f2", fontSize: "1.3rem" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--cv-text)" }}>Detail Log Discord</h3>
              </div>
              <button className={styles.btnDel} style={{ width: 32, height: 32 }} onClick={() => setViewLog(null)}><i className="bx bx-x" /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, color: "var(--cv-text-mute)", textTransform: "uppercase", fontWeight: 700 }}>Waktu & Status</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 13, color: "var(--cv-text-dim)" }}>🕒 {viewLog.time}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: viewLog.status === "failed" ? "color-mix(in srgb, #ef4444 14%, transparent)" : "color-mix(in srgb, #10b981 14%, transparent)", color: viewLog.status === "failed" ? "#e07070" : "#6dbf6d", fontWeight: 700 }}>
                    {viewLog.status === "failed" ? "Gagal" : "Terkirim"}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "var(--cv-text-mute)", textTransform: "uppercase", fontWeight: 700 }}>Judul</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--cv-text)", marginTop: 4 }}>{viewLog.title}</div>
              </div>

              {viewLog.description && (
                <div>
                  <span style={{ fontSize: 11, color: "var(--cv-text-mute)", textTransform: "uppercase", fontWeight: 700 }}>Deskripsi</span>
                  <div style={{ fontSize: 13, color: "var(--cv-text-dim)", background: "var(--cv-ink-1)", padding: 12, borderRadius: 8, marginTop: 4, whiteSpace: "pre-wrap", lineHeight: 1.6, border: "1px solid var(--cv-line)" }}>
                    {viewLog.description}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 16 }}>
                <div>
                  <span style={{ fontSize: 11, color: "var(--cv-text-mute)", textTransform: "uppercase", fontWeight: 700 }}>Mention</span>
                  <div style={{ fontSize: 12, color: "var(--cv-text-mute)", marginTop: 4 }}>{viewLog.mention || "—"}</div>
                </div>
                {viewLog.url && (
                  <div>
                    <span style={{ fontSize: 11, color: "var(--cv-text-mute)", textTransform: "uppercase", fontWeight: 700 }}>Link URL</span>
                    <div style={{ fontSize: 12, color: "#5865f2", marginTop: 4 }}>{viewLog.url}</div>
                  </div>
                )}
              </div>

              {viewLog.image && (
                <div>
                  <span style={{ fontSize: 11, color: "var(--cv-text-mute)", textTransform: "uppercase", fontWeight: 700 }}>Lampiran Gambar</span>
                  <img src={viewLog.image} alt="preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8, marginTop: 4, border: "1px solid var(--cv-line-strong)" }} />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8, borderTop: "1px solid var(--cv-line-strong)", paddingTop: 14 }}>
              <button className={styles.btnPrimary} style={{ flex: 1, justifyContent: "center", fontSize: 13 }} onClick={() => loadLogToForm(viewLog)}>
                <i className="bx bx-edit" /> Muat ke Form & Edit
              </button>
              <button className={styles.btnDel} style={{ width: "auto", padding: "0 14px", fontSize: 13 }} onClick={() => { setDeleteLogId(viewLog.id); }}>
                <i className="bx bx-trash" /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.sectionHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
          <i className="bxl-discord-alt" style={{ color: "#5865f2" }} /> Discord Notifier &amp; Pengumuman Web
        </h2>
        <a
          href="/internal/pengumuman-discord-xv7r2q"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.82rem",
            fontWeight: 700,
            padding: "6px 14px",
            borderRadius: 8,
            background: "var(--cv-orange-soft)",
            color: "var(--cv-orange)",
            border: "1px solid var(--cv-orange-line)",
            textDecoration: "none",
          }}
        >
          <i className="bx bx-link-external" /> Buka Halaman Pengumuman Internal ↗
        </a>
      </div>

      <div className={styles.discordLayout}>
        <div className={styles.discordForm}>
          <div className={styles.discordFormInner}>
            <div className={styles.field}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label>Judul Update <span style={{ color: "#e05252" }}>*</span></label>
                <span style={{ fontSize: 11, color: title.length > 240 ? "#e05252" : "var(--cv-text-mute)" }}>{title.length}/256</span>
              </div>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Masukkan judul pengumuman..." maxLength={256} />
            </div>

            <div className={styles.field}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label>Deskripsi <span style={{ color: "#e05252" }}>*</span></label>
                <span style={{ fontSize: 11, color: desc.length > 1700 ? "#e05252" : desc.length > 1400 ? "var(--cv-orange)" : "var(--cv-text-mute)", fontWeight: 700 }}>
                  {desc.length}/1800 {desc.length > 1800 && "(Maksimal tercapai)"}
                </span>
              </div>
              <textarea
                rows={6}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Tulis detail pengumuman di sini (maks. 1.800 karakter agar pengiriman Discord selalu lancar)..."
                maxLength={1800}
              />
              <span style={{ fontSize: 11, color: "var(--cv-text-mute)", marginTop: 2 }}>
                💡 Tip: Teks dibatasi maks. 1.800 karakter agar sesuai batas pesan Discord dan tidak terjadi error server.
              </span>
            </div>

            <div className={styles.field}>
              <label>URL Website</label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://cavallery.id" />
            </div>

            <div className={styles.field}>
              <label>Gambar <span style={{ color: "var(--cv-text-mute)", fontWeight: 400 }}>(opsional)</span></label>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" value={image} onChange={e => setImage(e.target.value)} placeholder="URL gambar atau pilih dari media..." style={{ flex: 1 }} />
                <button className={styles.btnGhost} style={{ whiteSpace: "nowrap", fontSize: 13 }} onClick={() => setShowPicker(true)}><i className="bx bx-folder-open" /> Pilih</button>
                {image && <button className={styles.btnDel} style={{ width: 36, height: 36, flexShrink: 0 }} onClick={() => setImage("")} title="Hapus gambar"><i className="bx bx-x" /></button>}
              </div>
              {image && <img src={image} alt="preview" style={{ marginTop: 8, maxHeight: 120, borderRadius: 8, objectFit: "cover", border: "1px solid var(--adm-border)", width: "100%" }} onError={e => (e.currentTarget.style.display = "none")} />}
            </div>

            <div className={styles.field}>
              <label>Mention</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["", "@everyone", "@here"].map(m => (
                  <button key={m} onClick={() => setMention(m)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", borderColor: mention === m ? (m === "@everyone" ? "#e05252" : m === "@here" ? "var(--cv-orange)" : "#5865f2") : "var(--cv-line-strong)", background: mention === m ? (m === "@everyone" ? "color-mix(in srgb, #ef4444 14%, transparent)" : m === "@here" ? "color-mix(in srgb, var(--cv-orange) 14%, transparent)" : "rgba(88, 101, 242, 0.15)") : "transparent", color: mention === m ? (m === "@everyone" ? "#e05252" : m === "@here" ? "var(--cv-orange)" : "#7289da") : "var(--cv-text-mute)" }}>
                    {m || "Tanpa Mention"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className={styles.btnPrimary}
                onClick={send}
                disabled={sending || !title.trim() || !desc.trim()}
                style={{ flex: 2, justifyContent: "center", padding: "0.65rem", fontSize: "0.9rem", background: sending ? "var(--cv-ink-3)" : "#5865f2", color: sending ? "var(--cv-text-mute)" : "#fff" }}
              >
                {sending ? <><i className="bx bx-loader-alt bx-spin" /> Mengirim ke Discord...</> : <><i className="bx bxl-discord-alt" /> Kirim Sekarang</>}
              </button>
              <button
                className={styles.btnGhost}
                onClick={saveDraft}
                disabled={!title.trim()}
                title="Simpan sebagai catatan/draft ke log"
                style={{ flex: 1, justifyContent: "center", fontSize: "0.85rem", whiteSpace: "nowrap" }}
              >
                <i className="bx bx-save" /> Simpan Draft
              </button>
            </div>
          </div>
        </div>

        <div className={styles.discordRight}>
          <div className={styles.discordPreviewCard}>
            <p className={styles.discordPreviewLabel}><i className="bx bx-show" /> Preview Embed</p>
            <div className={styles.discordEmbed} style={{ borderLeftColor: embedColor }}>
              {mention && <div className={styles.discordMention} style={{ color: mention === "@everyone" ? "#e05252" : "var(--cv-orange)", background: mention === "@everyone" ? "color-mix(in srgb, #ef4444 14%, transparent)" : "color-mix(in srgb, var(--cv-orange) 14%, transparent)" }}>{mention}</div>}
              <div className={styles.discordEmbedTitle}>{title ? "📌 " + title : <span style={{ opacity: 0.3 }}>Judul pengumuman...</span>}</div>
              <div className={styles.discordEmbedDesc}>
                {desc ? desc.split("\n").map((line, i) => <span key={i}>{line}<br /></span>) : <span style={{ opacity: 0.3 }}>Deskripsi pengumuman...</span>}
                {desc && <><br /><span style={{ opacity: 0.5, fontSize: 11 }}>🕐 {now()}</span></>}
              </div>
              {image && <img src={image} alt="embed" className={styles.discordEmbedImg} onError={e => (e.currentTarget.style.display = "none")} />}
              {url && <div className={styles.discordEmbedUrl}><i className="bx bx-link-external" style={{ fontSize: 11 }} /> {url}</div>}
            </div>
          </div>

          {/* CRUD RIWAYAT LOG DISCORD */}
          <div className={styles.discordLogsCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
              <p className={styles.discordPreviewLabel} style={{ margin: 0 }}><i className="bx bx-history" /> Riwayat Log ({logs.length})</p>
              {logs.length > 0 && (
                <button
                  className={styles.btnDel}
                  style={{ width: "auto", height: "auto", padding: "3px 10px", fontSize: 11, borderRadius: 6 }}
                  onClick={() => setConfirmClear(true)}
                  title="Hapus semua riwayat"
                >
                  <i className="bx bx-trash" /> Hapus Semua
                </button>
              )}
            </div>

            {/* Search filter log */}
            {logs.length > 0 && (
              <div style={{ position: "relative", marginBottom: 10 }}>
                <input
                  type="text"
                  value={searchLog}
                  onChange={e => setSearchLog(e.target.value)}
                  placeholder="Cari riwayat pengumuman..."
                  style={{ width: "100%", padding: "6px 10px 6px 30px", fontSize: 12, background: "var(--cv-ink-1)", border: "1px solid var(--cv-line-strong)", borderRadius: 8, color: "var(--cv-text)" }}
                />
                <i className="bx bx-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--cv-text-mute)", fontSize: 14 }} />
                {searchLog && (
                  <button onClick={() => setSearchLog("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--cv-text-mute)", cursor: "pointer", fontSize: 14 }}>
                    <i className="bx bx-x" />
                  </button>
                )}
              </div>
            )}

            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", opacity: 0.4, fontSize: 13 }}>
                <i className="bx bx-inbox" style={{ fontSize: "2rem", display: "block", marginBottom: 4 }} />
                {logs.length === 0 ? "Belum ada riwayat" : "Tidak ada hasil pencarian"}
              </div>
            ) : (
              <div className={styles.discordLogList} style={{ maxHeight: 320, overflowY: "auto" }}>
                {filteredLogs.map((log) => (
                  <div key={log.id} className={styles.discordLogItem} style={{ borderLeft: log.status === "failed" ? "3px solid #e05252" : "3px solid #5865f2" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div
                        onClick={() => setViewLog(log)}
                        style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
                        title="Klik untuk melihat detail log"
                      >
                        <div className={styles.discordLogTitle} style={{ fontWeight: 600, color: "var(--cv-text)" }}>{log.title}</div>
                        <div className={styles.discordLogMeta} style={{ marginTop: 2 }}>
                          <span>{log.time}</span>
                          {log.mention && log.mention !== "—" && <span style={{ background: log.mention === "@everyone" ? "color-mix(in srgb, #ef4444 14%, transparent)" : "color-mix(in srgb, var(--cv-orange) 14%, transparent)", color: log.mention === "@everyone" ? "#e05252" : "var(--cv-orange)", padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>{log.mention}</span>}
                          {log.hasImage && <span style={{ color: "#5865f2", fontSize: 10 }}><i className="bx bx-image" /> gambar</span>}
                          {log.status === "failed" && <span style={{ color: "#e05252", fontSize: 10, fontWeight: 700 }}>⚠️ Gagal</span>}
                        </div>
                      </div>

                      {/* CRUD ACTION BUTTONS */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => setViewLog(log)}
                          title="Lihat Detail (Read)"
                          style={{ background: "var(--cv-ink-3)", border: "1px solid var(--cv-line-strong)", borderRadius: 6, color: "var(--cv-text-mute)", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                        >
                          <i className="bx bx-show" />
                        </button>
                        <button
                          onClick={() => loadLogToForm(log)}
                          title="Muat ke Form & Edit (Update)"
                          style={{ background: "color-mix(in srgb, var(--cv-orange) 14%, transparent)", border: "1px solid var(--cv-orange-deep)", borderRadius: 6, color: "var(--cv-orange-hi)", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                        >
                          <i className="bx bx-edit-alt" />
                        </button>
                        <button
                          onClick={() => setDeleteLogId(log.id)}
                          title="Hapus Log Ini (Delete)"
                          style={{ background: "color-mix(in srgb, #ef4444 14%, transparent)", border: "1px solid #5a2a2a", borderRadius: 6, color: "#f87171", width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}
                        >
                          <i className="bx bx-trash" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── JOURNAL MANAGER ──────────────────────────────────────────
interface JournalMessage {
  id: number;
  name: string;
  msg: string;
  date: string;
  rawDate: string;
}

const DEFAULT_JOURNAL_MESSAGES: JournalMessage[] = [];

function JournalManager() {
  const [messages, setMessages] = useState<JournalMessage[]>(DEFAULT_JOURNAL_MESSAGES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<JournalMessage | null>(null);
  const [newSender, setNewSender] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [editSender, setEditSender] = useState("");
  const [editMessageText, setEditMessageText] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<JournalMessage | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    let loadedMessages: JournalMessage[] | null = null;
    try {
      const res = await fetch("/api/journal");
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : null);
          loadedMessages = arr.map((item: any, idx: number) => {
            const raw = item.date || item.created_at || item.date_label || "";
            let formattedDate = "-";
            if (raw) {
              const d = new Date(raw);
              if (!isNaN(d.getTime())) {
                formattedDate = d.toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
              } else {
                formattedDate = String(raw);
              }
            }
            return {
              id: item.id || (idx + 1),
              name: item.name || item.Nama || item.nama || "Anonim",
              msg: item.msg || item.pesan || item.message || item.content || "",
              date: formattedDate,
              rawDate: raw || "",
            };
          });
      }
    } catch {}

    if (!loadedMessages || loadedMessages.length === 0) {
      try {
        const saved = typeof window !== "undefined" ? localStorage.getItem("cavallery_journal") : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedMessages = parsed;
          }
        }
      } catch {}
    }

    if (!loadedMessages || loadedMessages.length === 0) {
      loadedMessages = DEFAULT_JOURNAL_MESSAGES;
    }

    setMessages([...loadedMessages].reverse());
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cavallery_journal", JSON.stringify(loadedMessages));
      } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSender.trim() || !newMessage.trim()) { showToast("Nama dan pesan wajib diisi", "error"); return; }
    setSaving(true);

    const newEntry: JournalMessage = {
      id: Date.now(),
      name: newSender.trim(),
      msg: newMessage.trim(),
      date: new Date().toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      rawDate: new Date().toISOString()
    };

    const updated = [newEntry, ...messages];
    setMessages(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cavallery_journal", JSON.stringify([...updated].reverse()));
      } catch {}
    }

    try {
      await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSender.trim(), msg: newMessage.trim() })
      });
    } catch {}

    showToast("Pesan berhasil disematkan!", "success");
    setNewSender("");
    setNewMessage("");
    setShowAddModal(false);
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage) return;
    if (!editSender.trim() || !editMessageText.trim()) { showToast("Nama dan pesan wajib diisi", "error"); return; }
    setSaving(true);

    const updated = messages.map(m => m.id === selectedMessage.id ? { ...m, name: editSender.trim(), msg: editMessageText.trim() } : m);
    setMessages(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cavallery_journal", JSON.stringify([...updated].reverse()));
      } catch {}
    }

    try {
      await fetch("/api/journal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedMessage.id, name: editSender.trim(), msg: editMessageText.trim() })
      });
    } catch {}

    showToast("Pesan berhasil diperbarui!", "success");
    setShowEditModal(false);
    setSelectedMessage(null);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const updated = messages.filter(m => m.id !== confirmDelete.id);
    setMessages(updated);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cavallery_journal", JSON.stringify([...updated].reverse()));
      } catch {}
    }

    try {
      await fetch(`/api/journal?id=${confirmDelete.id}`, { method: "DELETE" });
    } catch {}

    showToast("Pesan berhasil dihapus!", "success");
    setConfirmDelete(null);
  };

  const openEdit = (msg: JournalMessage) => { setSelectedMessage(msg); setEditSender(msg.name); setEditMessageText(msg.msg); setShowEditModal(true); };
  const filtered = messages.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.msg.toLowerCase().includes(search.toLowerCase()));

  const exportCSV = () => {
    try {
      const headers = ["Nama", "Pesan", "Tanggal"];
      const rows = messages.map(m => [`"${m.name.replace(/"/g, '""')}"`, `"${m.msg.replace(/"/g, '""')}"`, `"${m.rawDate}"`]);
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `Journal_MemoRine_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      showToast("Ekspor CSV berhasil!", "success");
    } catch { showToast("Gagal mengekspor CSV", "error"); }
  };

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDelete && <ConfirmModal msg={`Hapus pesan dari "${confirmDelete.name}"?`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}

      {showAddModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3>Tambah Pesan MemoRine</h3>
              <button className={styles.closeX} onClick={() => setShowAddModal(false)}><i className="bx bx-x" /></button>
            </div>
            <form onSubmit={handleAdd}>
              <div className={styles.formBody}>
                <div className={styles.field}><label>Nama Pengirim</label><input type="text" value={newSender} onChange={e => setNewSender(e.target.value)} placeholder="Nama Kamu" required /></div>
                <div className={styles.field}><label>Pesan</label><textarea rows={4} value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Tulis pesan..." required /></div>
              </div>
              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowAddModal(false)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <><i className="bx bx-loader-alt bx-spin" /> Mengirim...</> : <><i className="bx bx-send" /> Sematkan Pesan</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3>Edit Pesan MemoRine</h3>
              <button className={styles.closeX} onClick={() => setShowEditModal(false)}><i className="bx bx-x" /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div className={styles.formBody}>
                <div className={styles.field}><label>Nama Pengirim</label><input type="text" value={editSender} onChange={e => setEditSender(e.target.value)} placeholder="Nama Kamu" required /></div>
                <div className={styles.field}><label>Pesan</label><textarea rows={4} value={editMessageText} onChange={e => setEditMessageText(e.target.value)} placeholder="Tulis pesan..." required /></div>
              </div>
              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => { setShowEditModal(false); setSelectedMessage(null); }}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Perubahan</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}><i className="bx bx-book-open" style={{ color: "var(--cv-orange)" }} /> Journal MemoRine<span className={styles.count}>{messages.length} pesan</span></h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={styles.btnGhost} onClick={exportCSV} disabled={messages.length === 0}><i className="bx bx-export" /> Ekspor CSV</button>
          <button className={styles.btnPrimary} onClick={() => setShowAddModal(true)}><i className="bx bx-plus" /> Tambah Pesan</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input placeholder="Cari nama pengirim atau pesan..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, background: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px" }} />
        <button className={styles.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </div>

      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat pesan MemoRine...</div> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}><i className="bx bx-inbox" style={{ fontSize: "3rem" }} /><p>Tidak ada pesan yang ditemukan</p></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th style={{ width: "50px" }}>No</th><th style={{ width: "150px" }}>Tanggal</th><th style={{ width: "200px" }}>Pengirim</th><th>Pesan</th><th style={{ width: "100px", textAlign: "center" }}>Aksi</th></tr></thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.id}>
                  <td>{filtered.length - i}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{m.date}</td>
                  <td style={{ fontWeight: 600, color: "var(--cv-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</td>
                  <td style={{ whiteSpace: "normal", wordBreak: "break-word", maxWidth: "500px", lineHeight: "1.4" }}>{m.msg}</td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button className={styles.btnGhost} style={{ padding: "4px 8px" }} onClick={() => openEdit(m)}><i className="bx bx-edit" /></button>
                      <button className={styles.btnGhost} style={{ padding: "4px 8px", color: "#ef4444" }} onClick={() => setConfirmDelete(m)}><i className="bx bx-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── BOT MANAGER ──────────────────────────────────────────────
interface BotConfig {
  apiKey: string;
  fallbackResponse: string;
  rules: { id: string; triggers: string[][]; response: string; }[];
}

const DEFAULT_BOT_CONFIG: BotConfig = {
  apiKey: "",
  fallbackResponse: "Wah pertanyaan seru nih! Sayangnya aku belum punya info detail soal itu. Coba tanyain aku soal Erine, setlist teaternya, projek Cavallery kayak #RoseObscura, atau hestek-hestek seru lainnya ya! Aku pasti bisa bantu.",
  rules: [
    { id: "rule_1", triggers: [["siapa", "kenal"], ["erine", "catherina"]], response: "Erine (Catherina Vallencia Kurniawan) itu member JKT48 generasi 12 yang sekarang berada di Team Passion! Dia diperkenalkan pertama kali tanggal 18 November 2023 di JakJapan Matsuri. Orangnya super gemesin dan berbakat banget!" },
    { id: "rule_2", triggers: [["setlist", "teater", "show"]], response: "Erine udah membawakan total 7 setlist lho! Mulai dari Aitakatta (hebatnya dia pernah bawain semua unit song di sini!), Pajama Drive, Renai Kinshi Jourei (RKJ), Te Wo Tsunaginagara (TWT), Kira Kira Girls (dia jadi global center!), terus setelah naik ke member inti ada Ramune no Nomikata dan setlist tim Passion yaitu Passion 200%!" },
    { id: "rule_3", triggers: [["projek", "project", "rose", "rh", "request hour", "obscura"]], response: "Saat ini Cavallery lagi ngadain projek Blue Rose dengan hestek #RoseObscura untuk Request Hour (RH) bertema #Memory! Kita juga ada hestek #NabungRine buat persiapan menyukseskan Erine di RH 2026 nanti. Yuk ikutan!" },
    { id: "rule_4", triggers: [["lahir", "umur", "usia", "tanggal"]], response: "Erine lahir tanggal 21 Agustus 2007 (Zodiak Leo). Sekarang dia udah makin dewasa dan terus bersinar bersama JKT48!" },
    { id: "rule_5", triggers: [["hometown", "asal", "tinggal", "bekasi"]], response: "Erine berasal dari Bekasi, Jawa Barat, Indonesia! Anak Bekasi kebanggaan Cavallery nih, hehe." },
    { id: "rule_6", triggers: [["maskot", "bebek", "rinara"]], response: "Maskot resmi Cavallery namanya Rinara! Bentuknya bebek lucu yang nemenin perjuangan kita selama SSK 2024 kemarin." },
    { id: "rule_7", triggers: [["golongan darah", "goldar"]], response: "Golongan darah Erine itu B ya guys!" },
    { id: "rule_8", triggers: [["tinggi", "tb"]], response: "Tinggi badan Erine itu 162 cm. Pas banget dan ideal!" },
    { id: "rule_9", triggers: [["makanan", "kesukaan", "favorit", "suka"]], response: "Erine suka banget makan seafood, mala tang, dan dubai chewy cookie! Hewan kesukaannya Sealion. Manis dan gurih semuanya disapu bersih, haha." },
    { id: "rule_10", triggers: [["mv", "video musik"]], response: "Erine sejauh ini udah tampil di 2 MV JKT48! Pertama, MV Undergirls 'Bibir yang Telah Dicuri' (Nusumareta Kuchibiru) berkat rank 18 di SSK 2024. Kedua, MV Team Passion yang judulnya 'Dekat Namun Jauh'!" },
    { id: "rule_11", triggers: [["hestek", "hashtag", "diesvenerine"]], response: "Erine punya banyak hestek seru! Ada #DiesVenErine (khusus hari Jumat), #MemoRine (jurnal), #SahuRine, #Ngabuburine, #BukbeRine, #GameRine (mini games), dan #NgabaRine untuk PM mingguan!" },
    { id: "rule_12", triggers: [["cavallery", "fanbase"]], response: "Cavallery adalah fanbase resmi pendukung Erine JKT48! Dibentuk tanggal 18 November 2023, bertepatan dengan debut Erine. Kita solid banget lho, yuk gabung!" },
    { id: "rule_13", triggers: [["ssk", "sousenkyo", "rank", "peringkat"]], response: "Erine berhasil meraih peringkat ke-18 di SSK JKT48 2024 dan masuk to jajaran Undergirls! Keren banget kan? Selama SSK juga ada maskot Cavallery bernama Rinara si bebek lucu." },
    { id: "rule_14", triggers: [["team", "tim", "passion"]], response: "Erine sekarang ada di Team Passion! Dia dipromosikan jadi member inti JKT48 pada 25 Oktober 2025 saat event Sister Reunion. Bangga banget sama pencapaiannya!" },
    { id: "rule_15", triggers: [["zodiak", "leo"]], response: "Zodiak Erine itu Leo karena lahir tanggal 21 Agustus! Cocok banget sama kepribadiannya yang percaya diri dan bersinar di panggung." },
    { id: "rule_16", triggers: [["brand", "ambassador", "bihunku", "freefire", "free fire"]], response: "Erine menjadi Brand Ambassador BihunKu dan FreeFire bareng member JKT48 lainnya. Keren banget ya bisa jadi BA brand besar!" },
    { id: "rule_17", triggers: [["halo", "hai", "hey", "hi ", "hi"]], response: "Halo juga! Aku asisten dari Jenderal Cavallery. Mau tanya apa nih soal Erine? Aku siap bantu!" },
    { id: "rule_18", triggers: [["lagi apa", "kabar", "gimana", "apa kabar"]], response: "Erine lagi sibuk banget nih sama kegiatan JKT48 di Team Passion! Jadwal teater, latihan setlist, dan berbagai event seru lainnya. Kalau mau tau jadwal shownya, cek aja di halaman utama Cavallery ya!" },
    { id: "rule_19", triggers: [["terima kasih", "makasih", "thanks", "thx"]], response: "Sama-sama ya! Seneng bisa bantu. Jangan lupa terus dukung Erine dan Cavallery ya!" }
  ]
};

function BotManager({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [config, setConfig] = useState<BotConfig>(DEFAULT_BOT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showRuleModal, setShowRuleModal] = useState<"add" | "edit" | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [ruleGroups, setRuleGroups] = useState<string[]>([""]);
  const [ruleResponse, setRuleResponse] = useState("");
  const [testQuery, setTestQuery] = useState("");
  const [testReply, setTestReply] = useState<string | null>(null);
  const [testSource, setTestSource] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [apiActive, setApiActive] = useState<boolean>(true);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const handleTestBot = async (queryText?: string) => {
    const q = (queryText ?? testQuery).trim();
    if (!q || testLoading) return;
    setTestLoading(true);
    setTestReply(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q })
      });
      const data = await res.json();
      setTestReply(data.reply || "Tidak ada balasan.");
      setTestSource(data.source === "gemini" ? `AI (${data.model || "Gemini"})` : "Knowledge Base (Rules)");
      setApiActive(true);
    } catch {
      setTestReply("Gagal menghubungkan ke bot.");
    } finally {
      setTestLoading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    let loadedConfig: BotConfig | null = null;
    try {
      const res = await fetch("/api/bot-config");
      if (res.ok) {
        const json = await res.json();
        if (json.status && json.data) {
          loadedConfig = json.data;
        }
      }
    } catch {}

    if (!loadedConfig) {
      try {
        const saved = typeof window !== "undefined" ? localStorage.getItem("cavallery_bot_config") : null;
        if (saved) {
          loadedConfig = JSON.parse(saved);
        }
      } catch {}
    }

    if (!loadedConfig) {
      loadedConfig = DEFAULT_BOT_CONFIG;
    }

    setConfig(loadedConfig);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cavallery_bot_config", JSON.stringify(loadedConfig));
      } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    const newConfig = { ...config };
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cavallery_bot_config", JSON.stringify(newConfig));
      } catch {}
    }
    try {
      await fetch("/api/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: config.apiKey, fallbackResponse: config.fallbackResponse })
      });
    } catch {}
    showToast("Konfigurasi umum berhasil disimpan!", "success");
    setSaving(false);
  };

  const openAddRule = () => { setRuleGroups([""]); setRuleResponse(""); setSelectedRuleId(null); setShowRuleModal("add"); };
  const openEditRule = (rule: any) => { setRuleGroups(rule.triggers.map((g: string[]) => Array.isArray(g) ? g.join(", ") : String(g))); setRuleResponse(rule.response); setSelectedRuleId(rule.id); setShowRuleModal("edit"); };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    const triggers2D = ruleGroups.map(g => g.split(",").map(w => w.trim()).filter(Boolean)).filter(g => g.length > 0);
    if (triggers2D.length === 0) { showToast("Harap masukkan setidaknya satu kata kunci", "error"); return; }
    if (!ruleResponse.trim()) { showToast("Pesan balasan wajib diisi", "error"); return; }
    setSaving(true);

    const updatedRules = [...(config.rules || [])];
    if (showRuleModal === "add") {
      updatedRules.push({ id: "rule_" + Date.now(), triggers: triggers2D, response: ruleResponse.trim() });
    } else {
      const idx = updatedRules.findIndex(r => r.id === selectedRuleId);
      if (idx !== -1) updatedRules[idx] = { id: selectedRuleId!, triggers: triggers2D, response: ruleResponse.trim() };
    }

    const newConfig = { ...config, rules: updatedRules };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cavallery_bot_config", JSON.stringify(newConfig));
      } catch {}
    }

    try {
      await fetch("/api/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: config.apiKey, fallbackResponse: config.fallbackResponse, rules: updatedRules })
      });
    } catch {}

    showToast("Aturan pesan berhasil disimpan!", "success");
    setShowRuleModal(null);
    setSaving(false);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!config || !confirm("Hapus aturan pesan ini?")) return;
    const updatedRules = (config.rules || []).filter(r => r.id !== ruleId);
    const newConfig = { ...config, rules: updatedRules };
    setConfig(newConfig);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("cavallery_bot_config", JSON.stringify(newConfig));
      } catch {}
    }

    try {
      await fetch("/api/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: config.apiKey, fallbackResponse: config.fallbackResponse, rules: updatedRules })
      });
    } catch {}

    showToast("Aturan pesan berhasil dihapus", "success");
  };

  const filteredRules = config?.rules.filter(r => r.response.toLowerCase().includes(search.toLowerCase()) || r.triggers.some(g => g.some(t => t.toLowerCase().includes(search.toLowerCase())))) || [];

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showRuleModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRuleModal(null)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3>{showRuleModal === "add" ? "Tambah Aturan Pesan" : "Edit Aturan Pesan"}</h3>
              <button className={styles.closeX} onClick={() => setShowRuleModal(null)}><i className="bx bx-x" /></button>
            </div>
            <form onSubmit={handleSaveRule}>
              <div className={styles.formBody} style={{ maxHeight: "60vh", overflowY: "auto" }}>
                <div className={styles.field}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Kata Kunci Triggers (Grup AND)</span>
                    <button type="button" className={styles.btnGhost} style={{ padding: "4px 8px", fontSize: "0.75rem" }} onClick={() => setRuleGroups(prev => [...prev, ""])}><i className="bx bx-plus" /> Tambah Kondisi AND</button>
                  </label>
                  <p style={{ fontSize: "0.75rem", opacity: 0.6, margin: "4px 0 12px 0" }}>Pisahkan kata kunci dengan koma (,) untuk kondisi OR. Tambah grup untuk kondisi AND.</p>
                  {ruleGroups.map((group, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <span style={{ fontSize: "0.8rem", minWidth: 60, opacity: 0.7 }}>Grup {idx + 1}:</span>
                      <input type="text" value={group} onChange={e => { const copy = [...ruleGroups]; copy[idx] = e.target.value; setRuleGroups(copy); }} placeholder="Contoh: halo, hai, hey" required style={{ flex: 1, background: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px" }} />
                      {ruleGroups.length > 1 && <button type="button" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", borderRadius: 6, padding: 8, cursor: "pointer" }} onClick={() => setRuleGroups(prev => prev.filter((_, i) => i !== idx))}><i className="bx bx-trash" /></button>}
                    </div>
                  ))}
                </div>
                <div className={styles.field}><label>Pesan Balasan (Response)</label><textarea rows={4} value={ruleResponse} onChange={e => setRuleResponse(e.target.value)} placeholder="Masukkan balasan bot..." required /></div>
              </div>
              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowRuleModal(null)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Aturan</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.sectionHeader} style={{ flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="https://images.jkt48connect.com/cavallery/images/2026/09/cf207d2f32384a39.jpg"
            alt="Bot Avatar"
            style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid #22c55e" }}
            onError={(e) => { e.currentTarget.src = "/images/cava-logo-round.png"; }}
          />
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
            Jenderal Cavallery AI
          </h2>
          {/* GREEN ACTIVE STATUS INDICATOR */}
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: "999px",
            backgroundColor: apiActive ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${apiActive ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            color: apiActive ? "#22c55e" : "#ef4444",
            fontSize: "0.78rem",
            fontWeight: 600
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: apiActive ? "#22c55e" : "#ef4444",
              boxShadow: apiActive ? "0 0 8px #22c55e" : "none"
            }} />
            {apiActive ? "API Bot Aktif" : "Offline"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {onNavigate && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => onNavigate("botmedia")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", padding: "6px 12px", border: "1px solid var(--cv-orange)", color: "var(--cv-orange)" }}
            >
              <i className="bx bx-video-recording" /> Kelola Video & Foto Bot LINE
            </button>
          )}
        </div>
      </div>

      {/* INTERACTIVE TEST CONSOLE (PLAYGROUND) */}
      <div style={{ background: "var(--adm-surface)", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 8, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--cv-text)", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="bx bx-play-circle" style={{ color: "#22c55e" }} /> Uji Coba Pertanyaan Bot Langsung
          </h4>
          <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Cek respon AI & Knowledge Base</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="text"
            value={testQuery}
            onChange={e => setTestQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleTestBot()}
            placeholder="Ketik pertanyaan untuk bot, misal: Siapa Erine? / Apa projek Blue Rose?"
            style={{ flex: 1, background: "var(--cv-ink-1)", color: "var(--cv-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px", fontSize: "0.88rem" }}
          />
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => handleTestBot()}
            disabled={testLoading || !testQuery.trim()}
          >
            {testLoading ? <><i className="bx bx-loader-alt bx-spin" /> Menguji...</> : <><i className="bx bx-send" /> Kirim Uji Coba</>}
          </button>
        </div>

        {/* Quick prompt chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: "0.75rem", opacity: 0.7, alignSelf: "center", marginRight: 4 }}>Contoh Pertanyaan:</span>
          {["Siapa Erine?", "Apa projek Blue Rose?", "Apa maskot Cavallery?", "Apa setlist Erine?", "Berapa rank SSK Erine?"].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => { setTestQuery(chip); handleTestBot(chip); }}
              style={{
                background: "color-mix(in srgb, var(--cv-bone) 5%, transparent)",
                border: "1px solid var(--cv-line)",
                borderRadius: 14,
                padding: "3px 10px",
                fontSize: "0.75rem",
                color: "var(--cv-text-dim)",
                cursor: "pointer"
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {testReply && (
          <div style={{
            background: "var(--cv-ink-1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: 6,
            padding: "12px 14px",
            marginTop: 8
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.75rem" }}>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>Respon Bot Jenderal:</span>
              <span style={{ color: "var(--cv-text-mute)" }}>Sumber: {testSource}</span>
            </div>
            <div style={{ fontSize: "0.88rem", color: "var(--cv-text)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {testReply}
            </div>
          </div>
        )}
      </div>

      {config && (
        <form onSubmit={handleSaveGeneral} style={{ background: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: 16, color: "var(--cv-text)", display: "flex", alignItems: "center", gap: 8 }}><i className="bx bx-cog" /> Pengaturan Umum Bot</h3>
          <div className={styles.field} style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Gemini API Key</span><span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Kosongkan untuk mode fallback</span></label>
            <input type="password" value={config.apiKey} onChange={e => setConfig({ ...config, apiKey: e.target.value })} placeholder="Masukkan Gemini API Key..." style={{ width: "100%", background: "var(--cv-ink-1)", color: "var(--cv-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "10px 14px", fontSize: "0.9rem" }} />
          </div>
          <div className={styles.field} style={{ marginBottom: 20 }}>
            <label>Pesan Default (Jika tidak ada kecocokan & Gemini offline)</label>
            <textarea rows={3} value={config.fallbackResponse} onChange={e => setConfig({ ...config, fallbackResponse: e.target.value })} placeholder="Masukkan balasan default..." required style={{ width: "100%", background: "var(--cv-ink-1)", color: "var(--cv-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "10px 14px", fontSize: "0.9rem", resize: "vertical" }} />
          </div>
          <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Pengaturan Umum</>}</button>
        </form>
      )}

      <div className={styles.sectionHeader} style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--cv-text)", display: "flex", alignItems: "center", gap: 8 }}><i className="bx bx-list-ul" /> Aturan Respon Kustom ({config?.rules.length || 0})</h3>
        <button className={styles.btnPrimary} onClick={openAddRule}><i className="bx bx-plus" /> Tambah Aturan</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <input placeholder="Cari kata kunci atau balasan..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, background: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px" }} />
        <button className={styles.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </div>

      {filteredRules.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}><i className="bx bx-comment-detail" style={{ fontSize: "3rem" }} /><p>Tidak ada aturan pesan yang ditemukan</p></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th style={{ width: "220px" }}>Kata Kunci (Triggers)</th><th>Respon Balasan</th><th style={{ width: "120px", textAlign: "center" }}>Aksi</th></tr></thead>
            <tbody>
              {filteredRules.map(rule => (
                <tr key={rule.id}>
                  <td style={{ verticalAlign: "top" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {rule.triggers.map((group, idx) => (
                        <div key={idx} style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                          {idx > 0 && <span style={{ fontSize: "0.7rem", color: "var(--cv-orange)", fontWeight: 600, marginRight: 4 }}>AND</span>}
                          {group.map((t, tid) => <span key={tid} style={{ background: "color-mix(in srgb, var(--cv-orange) 10%, transparent)", color: "var(--cv-orange)", border: "1px solid color-mix(in srgb, var(--cv-orange) 20%, transparent)", borderRadius: 4, padding: "2px 6px", fontSize: "0.75rem", fontWeight: 500 }}>{t}</span>)}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.4", fontSize: "0.85rem", verticalAlign: "top" }}>{rule.response}</td>
                  <td style={{ textAlign: "center", verticalAlign: "top" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button className={styles.btnGhost} style={{ padding: "4px 8px" }} onClick={() => openEditRule(rule)}><i className="bx bx-edit" /></button>
                      <button className={styles.btnGhost} style={{ padding: "4px 8px", color: "#ef4444" }} onClick={() => handleDeleteRule(rule.id)}><i className="bx bx-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ─── BOT LINE MEDIA MANAGER (FOTO & VIDEO) ──────────────────────
function BotMediaManager({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [mediaList, setMediaList] = useState<BotMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "video" | "image">("all");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<"add" | "edit" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<"video" | "image">("video");
  const [formTriggers, setFormTriggers] = useState("");
  const [formMediaUrl, setFormMediaUrl] = useState("");
  const [formPreviewUrl, setFormPreviewUrl] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  // Uploading state
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  // Keyword Playground
  const [testKeyword, setTestKeyword] = useState("");
  const [testResult, setTestResult] = useState<BotMediaItem | null>(null);
  const [hasTested, setHasTested] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<BotMediaItem | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const loadMedia = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot-media", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.status && Array.isArray(json.data)) {
          setMediaList(json.data);
        }
      }
    } catch {
      showToast("Gagal memuat media bot LINE", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleFileUpload = async (file: File, target: "media" | "preview") => {
    if (target === "media") setUploadingMedia(true);
    else setUploadingPreview(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "cavallery/bot");

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: fd
      });
      const data = await res.json();
      if (data.status && data.url) {
        if (target === "media") {
          setFormMediaUrl(data.url);
          showToast("File media berhasil diunggah!", "success");
        } else {
          setFormPreviewUrl(data.url);
          showToast("Thumbnail preview berhasil diunggah!", "success");
        }
      } else {
        showToast(data.message || "Gagal mengunggah file", "error");
      }
    } catch {
      showToast("Terjadi kesalahan saat mengunggah", "error");
    } finally {
      if (target === "media") setUploadingMedia(false);
      else setUploadingPreview(false);
    }
  };

  const openAdd = () => {
    setSelectedId(null);
    setFormTitle("");
    setFormType("video");
    setFormTriggers("");
    setFormMediaUrl("");
    setFormPreviewUrl("");
    setFormIsActive(true);
    setShowModal("add");
  };

  const openEdit = (item: BotMediaItem) => {
    setSelectedId(item.id);
    setFormTitle(item.title);
    setFormType(item.type);
    setFormTriggers(item.triggers.join(", "));
    setFormMediaUrl(item.mediaUrl);
    setFormPreviewUrl(item.previewUrl || "");
    setFormIsActive(item.isActive !== false);
    setShowModal("edit");
  };

  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Judul media wajib diisi", "error");
      return;
    }
    const triggers = formTriggers.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    if (triggers.length === 0) {
      showToast("Minimal masukkan 1 kata kunci trigger", "error");
      return;
    }
    if (!formMediaUrl.trim()) {
      showToast("File atau URL media wajib diisi", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: selectedId,
        title: formTitle.trim(),
        type: formType,
        triggers,
        mediaUrl: formMediaUrl.trim(),
        previewUrl: formPreviewUrl.trim() || (formType === "video" ? "https://images.jkt48connect.com/cavallery/images/2026/09/4dc2029f5e314054.jpg" : formMediaUrl.trim()),
        isActive: formIsActive
      };

      const method = showModal === "add" ? "POST" : "PUT";
      const res = await fetch("/api/bot-media", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status) {
        showToast(showModal === "add" ? "Media berhasil ditambahkan!" : "Media berhasil diperbarui!", "success");
        setShowModal(null);
        loadMedia();
      } else {
        showToast(data.message || "Gagal menyimpan media", "error");
      }
    } catch {
      showToast("Gagal menyimpan media", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: BotMediaItem) => {
    const updated = { ...item, isActive: !item.isActive };
    setMediaList(prev => prev.map(m => m.id === item.id ? updated : m));
    try {
      await fetch("/api/bot-media", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      showToast(`Media "${item.title}" ${updated.isActive ? "diaktifkan" : "dinonaktifkan"}`, "success");
    } catch {
      showToast("Gagal memperbarui status media", "error");
      loadMedia();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/bot-media?id=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status) {
        showToast("Media berhasil dihapus", "success");
        setMediaList(prev => prev.filter(m => m.id !== deleteTarget.id));
      } else {
        showToast(data.message || "Gagal menghapus media", "error");
      }
    } catch {
      showToast("Gagal menghapus media", "error");
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleTest = (kw?: string) => {
    const query = (kw ?? testKeyword).trim().toLowerCase();
    setHasTested(true);
    if (!query) {
      setTestResult(null);
      return;
    }
    const matched = mediaList.find(item =>
      item.isActive && item.triggers.some(tr => {
        const cleanTr = tr.trim().toLowerCase();
        return query.includes(cleanTr) || query === cleanTr;
      })
    );
    setTestResult(matched || null);
  };

  const filtered = mediaList.filter(item => {
    const matchSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.triggers.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === "all" ? true : item.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* MODAL TAMBAH / EDIT MEDIA */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(null)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className={styles.formModalHeader}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className={formType === "video" ? "bx bx-video" : "bx bx-image"} style={{ color: "var(--cv-orange)" }} />
                {showModal === "add" ? "Tambah Media Bot LINE" : "Edit Media Bot LINE"}
              </h3>
              <button className={styles.closeX} onClick={() => setShowModal(null)}><i className="bx bx-x" /></button>
            </div>

            <form onSubmit={handleSaveMedia}>
              <div className={styles.formBody} style={{ maxHeight: "70vh", overflowY: "auto", display: "grid", gap: 16 }}>
                {/* PILIHAN TIPE MEDIA */}
                <div className={styles.field}>
                  <label>Tipe Media</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setFormType("video")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        border: formType === "video" ? "2px solid var(--cv-orange)" : "1px solid var(--adm-border)",
                        background: formType === "video" ? "color-mix(in srgb, var(--cv-orange) 14%, transparent)" : "var(--adm-surface)",
                        color: formType === "video" ? "var(--cv-orange)" : "var(--adm-text)",
                        fontWeight: 700,
                        fontSize: "0.9rem"
                      }}
                    >
                      <i className="bx bxs-video" style={{ fontSize: "1.2rem" }} /> Video (MP4 / WebM)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType("image")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        border: formType === "image" ? "2px solid var(--cv-orange)" : "1px solid var(--adm-border)",
                        background: formType === "image" ? "color-mix(in srgb, var(--cv-orange) 14%, transparent)" : "var(--adm-surface)",
                        color: formType === "image" ? "var(--cv-orange)" : "var(--adm-text)",
                        fontWeight: 700,
                        fontSize: "0.9rem"
                      }}
                    >
                      <i className="bx bxs-image" style={{ fontSize: "1.2rem" }} /> Foto / Gambar
                    </button>
                  </div>
                </div>

                {/* JUDUL MEDIA */}
                <div className={styles.field}>
                  <label>Judul / Label Media</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Contoh: Video Reaksi Waduh / Foto Jikoline"
                    required
                    style={{ width: "100%", background: "var(--cv-ink-1)", color: "var(--cv-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "10px 14px" }}
                  />
                </div>

                {/* TRIGGERS */}
                <div className={styles.field}>
                  <label style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Kata Kunci Pemicu (Triggers)</span>
                    <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Pisahkan dengan koma (,)</span>
                  </label>
                  <input
                    type="text"
                    value={formTriggers}
                    onChange={e => setFormTriggers(e.target.value)}
                    placeholder="Contoh: waduh, kaget, astaga"
                    required
                    style={{ width: "100%", background: "var(--cv-ink-1)", color: "var(--cv-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "10px 14px" }}
                  />
                  <p style={{ fontSize: "0.75rem", opacity: 0.7, margin: "6px 0 0" }}>
                    Jika ada anggota LINE yang mengetik kata-kata ini (baik di chat pribadi maupun grup), bot akan membalas dengan media ini.
                  </p>
                </div>

                {/* UPLOAD FILE ATAU URL */}
                <div className={styles.field}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{formType === "video" ? "File Video atau URL Video (MP4)" : "File Foto atau URL Foto"}</span>
                    {uploadingMedia && <span style={{ fontSize: "0.75rem", color: "var(--cv-orange)" }}><i className="bx bx-loader-alt bx-spin" /> Mengunggah berkas...</span>}
                  </label>

                  <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
                    {/* Upload button container */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <label style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 14px",
                        borderRadius: 6,
                        background: "var(--cv-ink-2)",
                        border: "1px solid var(--cv-orange)",
                        color: "var(--cv-orange)",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: "0.85rem"
                      }}>
                        <i className="bx bx-upload" /> Unggah Dari Komputer
                        <input
                          type="file"
                          accept={formType === "video" ? "video/*" : "image/*"}
                          style={{ display: "none" }}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, "media");
                          }}
                        />
                      </label>
                      <span style={{ fontSize: "0.8rem", opacity: 0.6 }}>atau tempel URL langsung di bawah:</span>
                    </div>

                    <input
                      type="text"
                      value={formMediaUrl}
                      onChange={e => setFormMediaUrl(e.target.value)}
                      placeholder={formType === "video" ? "https://cavallery.id/uploads/.../video.mp4" : "https://cavallery.id/uploads/.../foto.jpg"}
                      required
                      style={{ width: "100%", background: "var(--cv-ink-1)", color: "var(--cv-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "10px 14px", fontSize: "0.88rem" }}
                    />
                  </div>

                  {/* PREVIEW MEDIA */}
                  {formMediaUrl && (
                    <div style={{ marginTop: 10, padding: 10, background: "var(--cv-ink-2)", borderRadius: 8, border: "1px solid var(--cv-line)" }}>
                      <span style={{ fontSize: "0.75rem", opacity: 0.7, display: "block", marginBottom: 6 }}>Pratinjau Media:</span>
                      {formType === "video" ? (
                        <video
                          src={formMediaUrl}
                          controls
                          style={{ maxHeight: 200, width: "100%", borderRadius: 6, background: "#000" }}
                        />
                      ) : (
                        <img
                          src={formMediaUrl}
                          alt="Preview"
                          style={{ maxHeight: 180, maxWidth: "100%", borderRadius: 6, objectFit: "contain" }}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* KHUSUS VIDEO: PREVIEW THUMBNAIL IMAGE */}
                {formType === "video" && (
                  <div className={styles.field}>
                    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Thumbnail Preview Gambar (Wajib untuk LINE Video)</span>
                      {uploadingPreview && <span style={{ fontSize: "0.75rem", color: "var(--cv-orange)" }}><i className="bx bx-loader-alt bx-spin" /> Mengunggah thumbnail...</span>}
                    </label>

                    <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <label style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 6,
                          background: "var(--cv-ink-2)",
                          border: "1px solid var(--adm-border)",
                          color: "var(--adm-text)",
                          cursor: "pointer",
                          fontSize: "0.82rem"
                        }}>
                          <i className="bx bx-image-add" /> Unggah Thumbnail
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, "preview");
                            }}
                          />
                        </label>
                        <span style={{ fontSize: "0.78rem", opacity: 0.6 }}>atau biarkan default / isi URL gambar:</span>
                      </div>

                      <input
                        type="text"
                        value={formPreviewUrl}
                        onChange={e => setFormPreviewUrl(e.target.value)}
                        placeholder="https://images.jkt48connect.com/cavallery/.../thumb.jpg"
                        style={{ width: "100%", background: "var(--cv-ink-1)", color: "var(--cv-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px", fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>
                )}

                {/* STATUS AKTIF */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                  <input
                    type="checkbox"
                    id="mediaActiveCheck"
                    checked={formIsActive}
                    onChange={e => setFormIsActive(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "var(--cv-orange)", cursor: "pointer" }}
                  />
                  <label htmlFor="mediaActiveCheck" style={{ cursor: "pointer", fontWeight: 600 }}>
                    Aktifkan media ini untuk merespon pengguna di LINE
                  </label>
                </div>
              </div>

              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowModal(null)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving || uploadingMedia || uploadingPreview}>
                  {saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> {showModal === "add" ? "Tambahkan Media" : "Simpan Perubahan"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className={styles.formModalHeader}>
              <h3 style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="bx bx-trash" /> Hapus Media Bot LINE?
              </h3>
              <button className={styles.closeX} onClick={() => setDeleteTarget(null)}><i className="bx bx-x" /></button>
            </div>
            <div className={styles.formBody}>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                Apakah kamu yakin ingin menghapus respon media <strong>&quot;{deleteTarget.title}&quot;</strong>?
                Bot LINE tidak akan lagi merespon kata kunci: <em>{deleteTarget.triggers.join(", ")}</em>.
              </p>
            </div>
            <div className={styles.formFooter}>
              <button type="button" className={styles.btnGhost} onClick={() => setDeleteTarget(null)}>Batal</button>
              <button
                type="button"
                className={styles.btnPrimary}
                style={{ background: "#ef4444", borderColor: "#ef4444" }}
                onClick={confirmDelete}
              >
                <i className="bx bx-trash" /> Ya, Hapus Media
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER UTAMA */}
      <div className={styles.sectionHeader} style={{ flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className={styles.sectionTitle} style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <i className="bx bx-video-recording" style={{ color: "var(--cv-orange)" }} /> Media Bot LINE (Video & Foto)
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", opacity: 0.7 }}>
            Kelola kiriman video dan gambar otomatis saat user mengirim kata kunci tertentu di LINE.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {onNavigate && (
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => onNavigate("bot")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", padding: "8px 14px" }}
            >
              <i className="bx bx-bot" style={{ color: "#22c55e" }} /> Aturan Teks & AI
            </button>
          )}
          <button className={styles.btnPrimary} onClick={openAdd} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="bx bx-plus" /> Tambah Video / Foto
          </button>
        </div>
      </div>

      {/* KEYWORD PLAYGROUND / TEST CONSOLE */}
      <div style={{ background: "var(--adm-surface)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 8, padding: 18, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--cv-text)", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="bx bx-search-alt" style={{ color: "#f59e0b" }} /> Uji Coba Kata Kunci Media Bot
          </h4>
          <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Simulasi pesan user LINE</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="text"
            value={testKeyword}
            onChange={e => setTestKeyword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleTest()}
            placeholder="Ketik kata kunci untuk uji coba, misal: waduh / hbd / niterine / gas..."
            style={{ flex: 1, background: "var(--cv-ink-1)", color: "var(--cv-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px", fontSize: "0.88rem" }}
          />
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => handleTest()}
            style={{ background: "#f59e0b", borderColor: "#f59e0b", color: "#000" }}
          >
            <i className="bx bx-play" /> Tes Respon
          </button>
        </div>

        {/* Quick chip tests */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{ fontSize: "0.75rem", opacity: 0.7, alignSelf: "center", marginRight: 4 }}>Contoh Cepat:</span>
          {["waduh", "hbd", "niterine", "ngasal", "diesvenerine", "gas"].map((kw, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setTestKeyword(kw); handleTest(kw); }}
              style={{
                background: "color-mix(in srgb, var(--cv-bone) 5%, transparent)",
                border: "1px solid var(--cv-line)",
                borderRadius: 14,
                padding: "3px 10px",
                fontSize: "0.75rem",
                color: "var(--cv-text-dim)",
                cursor: "pointer"
              }}
            >
              {kw}
            </button>
          ))}
        </div>

        {hasTested && (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: "var(--cv-ink-1)",
            border: `1px solid ${testResult ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)"}`,
            borderRadius: 6
          }}>
            {testResult ? (
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ width: 60, height: 60, borderRadius: 6, overflow: "hidden", background: "#000", flexShrink: 0 }}>
                  <img
                    src={testResult.previewUrl || testResult.mediaUrl}
                    alt={testResult.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ color: "#22c55e", fontWeight: 700, fontSize: "0.85rem" }}>
                      <i className="bx bx-check-circle" /> Cocok dengan: {testResult.title}
                    </span>
                    <span style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      padding: "2px 6px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      background: testResult.type === "video" ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)",
                      color: testResult.type === "video" ? "#ef4444" : "#3b82f6"
                    }}>
                      {testResult.type}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", opacity: 0.7 }}>
                    Triggers: {testResult.triggers.join(", ")}
                  </p>
                </div>
                <a
                  href={testResult.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnGhost}
                  style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                >
                  <i className="bx bx-external-link" /> Buka Media
                </a>
              </div>
            ) : (
              <div style={{ color: "#ef4444", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bx bx-info-circle" /> Tidak ada respon media yang cocok dengan kata kunci &quot;{testKeyword}&quot;. (Bot akan beralih ke aturan teks atau AI SimiSimi).
              </div>
            )}
          </div>
        )}
      </div>

      {/* FILTER & PENCARIAN */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 240 }}>
          <input
            type="text"
            placeholder="Cari berdasarkan judul atau trigger..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", maxWidth: 360, background: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px" }}
          />
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {[
            { id: "all", label: "Semua Media" },
            { id: "video", label: "🎬 Video" },
            { id: "image", label: "🖼️ Foto" }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterType(f.id as any)}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                border: filterType === f.id ? "1px solid var(--cv-orange)" : "1px solid var(--adm-border)",
                background: filterType === f.id ? "color-mix(in srgb, var(--cv-orange) 14%, transparent)" : "var(--adm-surface)",
                color: filterType === f.id ? "var(--cv-orange)" : "var(--adm-muted)"
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* GRID KARTU MEDIA */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--adm-muted)" }}>
          <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem", marginBottom: 8, display: "block" }} />
          Memuat daftar media bot LINE...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", background: "var(--adm-surface)", borderRadius: 8, border: "1px solid var(--adm-border)" }}>
          <i className="bx bx-film" style={{ fontSize: "2.5rem", color: "var(--adm-muted)", marginBottom: 10, display: "block" }} />
          <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada media bot yang ditemukan</p>
          <p style={{ margin: "4px 0 16px", fontSize: "0.85rem", opacity: 0.7 }}>Tambahkan video atau foto baru untuk bot LINE kamu.</p>
          <button className={styles.btnPrimary} onClick={openAdd}><i className="bx bx-plus" /> Tambah Media Baru</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map(item => (
            <div
              key={item.id}
              style={{
                background: "var(--adm-surface)",
                border: "1px solid var(--adm-border)",
                borderRadius: 8,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                transition: "border-color 0.2s"
              }}
            >
              {/* Media Preview Box */}
              <div style={{ position: "relative", height: 180, background: "#0a0a0c", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {item.type === "video" ? (
                  <>
                    <img
                      src={item.previewUrl || "https://images.jkt48connect.com/cavallery/images/2026/09/4dc2029f5e314054.jpg"}
                      alt={item.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.8 }}
                    />
                    <div style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.3)"
                    }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.7)",
                        border: "2px solid #fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: "1.4rem"
                      }}>
                        <i className="bx bx-play" style={{ marginLeft: 3 }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}

                {/* Badge Type */}
                <span style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  padding: "3px 8px",
                  borderRadius: 4,
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  background: item.type === "video" ? "rgba(220, 38, 38, 0.9)" : "rgba(37, 99, 235, 0.9)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}>
                  <i className={item.type === "video" ? "bx bx-video" : "bx bx-image"} />
                  {item.type}
                </span>

                {/* Status Badge */}
                <button
                  type="button"
                  onClick={() => handleToggleActive(item)}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    padding: "3px 8px",
                    borderRadius: 20,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: item.isActive ? "rgba(34, 197, 94, 0.9)" : "rgba(100, 116, 139, 0.9)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                  title="Klik untuk ubah status aktif"
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                  {item.isActive ? "Aktif" : "Nonaktif"}
                </button>
              </div>

              {/* Media Card Details */}
              <div style={{ padding: 14, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ margin: "0 0 8px", fontSize: "0.98rem", color: "var(--cv-text)" }}>
                    {item.title}
                  </h4>

                  {/* Triggers Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                    {item.triggers.map((tr, ti) => (
                      <span
                        key={ti}
                        style={{
                          background: "var(--cv-ink-1)",
                          border: "1px solid var(--adm-border)",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: "0.75rem",
                          color: "var(--cv-orange)",
                          fontWeight: 600
                        }}
                      >
                        {tr}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--cv-line)" }}>
                  <a
                    href={item.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnGhost}
                    style={{ fontSize: "0.78rem", padding: "4px 8px" }}
                    title="Buka URL Berkas"
                  >
                    <i className="bx bx-link-external" /> Lihat Media
                  </a>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      style={{ padding: "4px 8px", fontSize: "0.85rem" }}
                      onClick={() => openEdit(item)}
                      title="Edit Media"
                    >
                      <i className="bx bx-edit" /> Edit
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: "4px 8px",
                        fontSize: "0.85rem",
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "#ef4444",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer"
                      }}
                      onClick={() => setDeleteTarget(item)}
                      title="Hapus Media"
                    >
                      <i className="bx bx-trash" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── MERCHANDISE MANAGER ──────────────────────────────────────
type MerchTab = "products" | "categories" | "discounts" | "orders";

function MerchandiseManager() {
  const [tab, setTab] = useState<MerchTab>("products");

  return (
    <div className={styles.sectionWrap}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-store" style={{ color: "var(--cv-orange)" }} /> Merchandise
        </h2>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--adm-border)", paddingBottom: 8, flexWrap: "wrap" }}>
        {([
          ["products",   "bx-package",  "Produk"],
          ["categories", "bx-category", "Kategori"],
          ["discounts",  "bx-purchase-tag", "Kode Diskon"],
          ["orders",     "bx-receipt",  "Pesanan"],
        ] as [MerchTab, string, string][]).map(([key, icon, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={styles.btnGhost}
            style={{
              borderColor: tab === key ? "var(--cv-orange)" : "var(--adm-border)",
              color: tab === key ? "var(--cv-orange)" : "var(--adm-text)",
              fontWeight: tab === key ? 700 : 500,
            }}
          >
            <i className={`bx ${icon}`} /> {label}
          </button>
        ))}
      </div>

      {tab === "products"   && <MerchProductsTab />}
      {tab === "categories" && <MerchCategoriesTab />}
      {tab === "discounts"  && <MerchDiscountsTab />}
      {tab === "orders"     && <MerchOrdersTab />}
    </div>
  );
}

// ── Sub-tab: KATEGORI ──────────────────────────────────────────
function MerchCategoriesTab() {
  const [rows, setRows]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<"add" | "edit" | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<any>(null);
  const [toast, setToast]   = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(merchApi("/categories"));
      const json = await res.json();
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch { setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setFormData({ is_active: true, sort_order: 0 }); setModal("add"); };
  const openEdit = (row: any) => { setFormData({ ...row }); setModal("edit"); };

  const save = async () => {
    setSaving(true);
    try {
      const isEdit = modal === "edit";
      const url    = isEdit ? merchApi(`/admin/categories/${formData.id}`) : merchApi("/admin/categories");
      const res    = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.status) { showToast(isEdit ? "Kategori diperbarui!" : "Kategori ditambahkan!", "success"); setModal(null); load(); }
      else showToast(json.message || "Gagal menyimpan", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
    setSaving(false);
  };

  const del = async (row: any) => {
    setConfirm(null);
    try {
      const res  = await fetch(merchApi(`/admin/categories/${row.id}`), { method: "DELETE" });
      const json = await res.json();
      if (json.status) { showToast("Kategori dihapus!", "success"); load(); }
      else showToast(json.message || "Gagal menghapus", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
  };

  const fields = [
    { key: "name", label: "Nama Kategori" },
    { key: "slug", label: "Slug" },
    { key: "description", label: "Deskripsi", type: "textarea", rows: 2 },
    { key: "sort_order", label: "Urutan", type: "number" },
    { key: "is_active", label: "Aktif", type: "checkbox" },
  ];

  const cols = [
    { key: "name", label: "Nama" },
    { key: "slug", label: "Slug" },
    { key: "is_active", label: "Aktif" },
  ];

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={`Hapus kategori "${confirm.name}"?`} onConfirm={() => del(confirm)} onCancel={() => setConfirm(null)} />}
      {modal && (
        <FormModal
          title={modal === "add" ? "Tambah Kategori" : "Edit Kategori"}
          fields={fields}
          data={formData}
          onChange={(k, v) => setFormData((p: any) => ({ ...p, [k]: v }))}
          onSave={save}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
      <div className={styles.sectionHeader}>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>Kategori Produk <span className={styles.count}>{rows.length}</span></h3>
        <button className={styles.btnPrimary} onClick={openAdd}><i className="bx bx-plus" /> Tambah</button>
      </div>
      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat...</div>
        : <DataTable cols={cols} rows={rows} onEdit={openEdit} onDelete={row => setConfirm(row)} />}
    </div>
  );
}

// ── Sub-tab: PRODUK + VARIAN ───────────────────────────────────
// ── Sub-tab: PRODUK + VARIAN (VERSI UPDATE) ───────────────────
// Perubahan dari versi lama:
// 1. category_id sekarang dropdown <select> dari hasil fetch /categories,
//    bukan input teks manual (tidak perlu copy-paste UUID lagi).
// 2. Ada toggle "Produk punya ukuran/varian?" di form tambah/edit.
//    - Kalau OFF  -> field "Stok" biasa muncul, dikirim sebagai `stock`
//      (backend otomatis bikin 1 varian ONE_SIZE).
//    - Kalau ON   -> muncul builder daftar ukuran (size_label + stock),
//      dikirim sebagai array `variants: [{ size_label, stock }]`.
// 3. Kalau kategori yang dipilih sudah has_size = true di database,
//    toggle otomatis ON dan tidak bisa dimatikan (mengikuti field
//    `category_has_size` yang dikembalikan API kategori), supaya konsisten
//    dengan logic backend (`effectiveHasSize = has_size || cat.has_size`).

function MerchProductsTab() {
  const [rows, setRows]       = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<"add" | "edit" | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [sizeVariants, setSizeVariants] = useState<{ size_label: string; stock: number }[]>([{ size_label: "", stock: 0 }]);
  const [saving, setSaving]   = useState(false);
  const [confirm, setConfirm] = useState<any>(null);
  const [toast, setToast]     = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [variantProduct, setVariantProduct] = useState<any>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(merchApi("/products?limit=200&include_inactive=true")),
        fetch(merchApi("/categories?include_inactive=true")),
      ]);
      const pJson = await pRes.json();
      const cJson = await cRes.json();
      const data = pJson?.data;
      setRows(Array.isArray(data) ? data : data?.items ?? data?.products ?? []);
      setCategories(Array.isArray(cJson?.data) ? cJson.data : []);
    } catch { setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Kategori yang sedang dipilih di form (untuk cek has_size dari kategori)
  const selectedCategory = categories.find(cat => cat.id === formData.category_id);
  const categoryForcesSize = !!selectedCategory?.has_size;
  const hasSize = categoryForcesSize || !!formData.has_size;

  const openAdd = () => {
    setFormData({ is_active: true, sort_order: 0, has_size: false, status: "open", weight_grams: 1000, stock: 0 });
    setSizeVariants([{ size_label: "", stock: 0 }]);
    setModal("add");
  };

  const openEdit = (row: any) => {
    setFormData({ ...row });
    // kalau produk sudah ada, isi builder varian dari data varian yang sudah ada (kalau ada di row.variants)
    if (Array.isArray(row.variants) && row.variants.length > 0) {
      setSizeVariants(row.variants.map((v: any) => ({ size_label: v.size_label, stock: v.stock })));
    } else {
      setSizeVariants([{ size_label: "", stock: 0 }]);
    }
    setModal("edit");
  };

  const addSizeRow = () => setSizeVariants(prev => [...prev, { size_label: "", stock: 0 }]);
  const removeSizeRow = (idx: number) => setSizeVariants(prev => prev.filter((_, i) => i !== idx));
  const updateSizeRow = (idx: number, key: "size_label" | "stock", val: string) => {
    setSizeVariants(prev => prev.map((row, i) => i === idx ? { ...row, [key]: key === "stock" ? Number(val) || 0 : val } : row));
  };

  const save = async () => {
    // Validasi ringan di sisi form
    if (!formData.category_id) { showToast("Pilih kategori terlebih dahulu", "error"); return; }
    if (!formData.name?.trim()) { showToast("Nama produk wajib diisi", "error"); return; }
    if (!formData.price || Number(formData.price) <= 0) { showToast("Harga wajib diisi dan lebih dari 0", "error"); return; }

    if (hasSize) {
      const validRows = sizeVariants.filter(v => v.size_label.trim());
      if (validRows.length === 0) { showToast("Tambahkan minimal satu ukuran", "error"); return; }
    }

    setSaving(true);
    try {
      const isEdit = modal === "edit";
      const url = isEdit ? merchApi(`/admin/products/${formData.id}`) : merchApi("/admin/products");

      const payload: Record<string, any> = { ...formData, has_size: hasSize };
      if (hasSize) {
        payload.variants = sizeVariants
          .filter(v => v.size_label.trim())
          .map(v => ({ size_label: v.size_label.trim(), stock: v.stock }));
      } else {
        // tanpa ukuran -> backend otomatis bikin varian ONE_SIZE dari field `stock`
        delete payload.variants;
      }

      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.status) {
        showToast(isEdit ? "Produk diperbarui!" : "Produk ditambahkan!", "success");
        setModal(null);
        load();
      } else {
        showToast(json.message || "Gagal menyimpan", "error");
      }
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
    setSaving(false);
  };

  const del = async (row: any) => {
    setConfirm(null);
    try {
      const res  = await fetch(merchApi(`/admin/products/${row.id}`), { method: "DELETE" });
      const json = await res.json();
      if (json.status) { showToast("Produk dihapus!", "success"); load(); }
      else showToast(json.message || "Gagal menghapus", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
  };

  const cols = [
    { key: "image_url", label: "Gambar" },
    { key: "name", label: "Nama" },
    { key: "price", label: "Harga" },
    { key: "is_active", label: "Aktif" },
  ];

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={`Hapus produk "${confirm.name}"?`} onConfirm={() => del(confirm)} onCancel={() => setConfirm(null)} />}

      {modal && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3>{modal === "add" ? "Tambah Produk" : "Edit Produk"}</h3>
              <button className={styles.closeX} onClick={() => setModal(null)}><i className="bx bx-x" /></button>
            </div>

            <div className={styles.formBody}>
              <div className={styles.field}>
                <label>Nama Produk</label>
                <input
                  type="text"
                  value={formData.name ?? ""}
                  onChange={e => setFormData((p: any) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label>Slug <span className={styles.fieldHint}> — kosongkan untuk auto dari nama</span></label>
                <input
                  type="text"
                  value={formData.slug ?? ""}
                  onChange={e => setFormData((p: any) => ({ ...p, slug: e.target.value }))}
                />
              </div>

              {/* ── DROPDOWN KATEGORI (bukan input teks lagi) ── */}
              <div className={styles.field}>
                <label>Kategori</label>
                <select
                  value={formData.category_id ?? ""}
                  onChange={e => setFormData((p: any) => ({ ...p, category_id: e.target.value }))}
                  style={{
                    width: "100%",
                    background: "var(--adm-surface)", color: "var(--adm-text)",
                    border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px",
                  }}
                >
                  <option value="">— Pilih kategori —</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}{cat.has_size ? " (punya ukuran)" : ""}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <small style={{ color: "var(--adm-danger)" }}>
                    Belum ada kategori. Tambahkan kategori dulu di tab Kategori.
                  </small>
                )}
              </div>

              <div className={styles.field}>
                <label>Deskripsi</label>
                <textarea
                  rows={3}
                  value={formData.description ?? ""}
                  onChange={e => setFormData((p: any) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label>Harga (Rp)</label>
                <input
                  type="number"
                  value={formData.price ?? ""}
                  onChange={e => setFormData((p: any) => ({ ...p, price: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label>URL Gambar Utama</label>
                <input
                  type="text"
                  value={formData.image_url ?? ""}
                  onChange={e => setFormData((p: any) => ({ ...p, image_url: e.target.value }))}
                  placeholder="URL gambar..."
                />
                {formData.image_url && (
                  <img
                    src={formData.image_url}
                    alt="preview"
                    style={{ marginTop: 6, maxHeight: 100, borderRadius: 6, objectFit: "cover", border: "1px solid var(--adm-border)" }}
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              <div className={styles.field}>
                <label>Urutan</label>
                <input
                  type="number"
                  value={formData.sort_order ?? 0}
                  onChange={e => setFormData((p: any) => ({ ...p, sort_order: e.target.value }))}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={!!formData.is_active}
                    onChange={e => setFormData((p: any) => ({ ...p, is_active: e.target.checked }))}
                  />
                  <span>{formData.is_active ? "Aktif" : "Nonaktif"}</span>
                </label>
              </div>

              {/* ── TOGGLE PUNYA UKURAN / VARIAN ── */}
              <div className={styles.field} style={{ borderTop: "1px solid var(--adm-border)", paddingTop: 16, marginTop: 8 }}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={hasSize}
                    disabled={categoryForcesSize}
                    onChange={e => setFormData((p: any) => ({ ...p, has_size: e.target.checked }))}
                  />
                  <span>
                    Produk punya ukuran / varian?
                    {categoryForcesSize && (
                      <span style={{ opacity: 0.6, fontWeight: 400 }}> — otomatis aktif (kategori ini selalu pakai ukuran)</span>
                    )}
                  </span>
                </label>
              </div>

              {!hasSize ? (
                // Tanpa ukuran: satu field stok saja, dikirim sebagai body.stock
                <div className={styles.field}>
                  <label>Stok</label>
                  <input
                    type="number"
                    value={formData.stock ?? 0}
                    onChange={e => setFormData((p: any) => ({ ...p, stock: e.target.value }))}
                  />
                </div>
              ) : (
                // Dengan ukuran: builder dinamis size_label + stock
                <div className={styles.field}>
                  <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Daftar Ukuran & Stok</span>
                    <button
                      type="button"
                      className={styles.btnGhost}
                      style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                      onClick={addSizeRow}
                    >
                      <i className="bx bx-plus" /> Tambah Ukuran
                    </button>
                  </label>
                  {sizeVariants.map((row, idx) => (
                    <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
                      <input
                        type="text"
                        value={row.size_label}
                        onChange={e => updateSizeRow(idx, "size_label", e.target.value)}
                        placeholder="cth: S, M, L, XL"
                        style={{
                          flex: 2,
                          background: "var(--adm-surface)", color: "var(--adm-text)",
                          border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px",
                        }}
                      />
                      <input
                        type="number"
                        value={row.stock}
                        onChange={e => updateSizeRow(idx, "stock", e.target.value)}
                        placeholder="Stok"
                        style={{
                          flex: 1,
                          background: "var(--adm-surface)", color: "var(--adm-text)",
                          border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px",
                        }}
                      />
                      {sizeVariants.length > 1 && (
                        <button
                          type="button"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", borderRadius: 6, padding: 8, cursor: "pointer" }}
                          onClick={() => removeSizeRow(idx)}
                        >
                          <i className="bx bx-trash" />
                        </button>
                      )}
                    </div>
                  ))}
                  <small style={{ opacity: 0.6 }}>
                    Kalau ini produk baru, ukuran akan langsung dibuat sebagai varian. Untuk edit ukuran satu-satu setelah produk dibuat, gunakan tombol "Varian" di tabel produk.
                  </small>
                </div>
              )}
            </div>

            <div className={styles.formFooter}>
              <button className={styles.btnGhost} onClick={() => setModal(null)}>Batal</button>
              <button className={styles.btnPrimary} onClick={save} disabled={saving}>
                {saving
                  ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</>
                  : <><i className="bx bx-save" /> Simpan</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {variantProduct && (
        <MerchVariantsModal product={variantProduct} onClose={() => { setVariantProduct(null); load(); }} />
      )}

      <div className={styles.sectionHeader}>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>Produk <span className={styles.count}>{rows.length}</span></h3>
        <button className={styles.btnPrimary} onClick={openAdd}><i className="bx bx-plus" /> Tambah Produk</button>
      </div>

      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat...</div> : (
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.responsiveTable}`}>
            <thead><tr><th>Gambar</th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Aktif</th><th>Aksi</th></tr></thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className={styles.empty}><i className="bx bx-inbox" /> Belum ada produk</td></tr>
              ) : rows.map(row => (
                <tr key={row.id}>
                  <td data-label="Gambar">{row.image_url ? <img src={row.image_url} alt="" className={styles.thumb} /> : "-"}</td>
                  <td data-label="Nama">{row.name}</td>
                  <td data-label="Kategori">{row.category_name ?? "-"}</td>
                  <td data-label="Harga">Rp{Number(row.price ?? 0).toLocaleString("id-ID")}</td>
                  <td data-label="Aktif">{row.is_active ? "✓" : "✗"}</td>
                  <td data-label="Aksi">
                    <div className={styles.actionBtns}>
                      <button className={styles.btnGhost} style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => setVariantProduct(row)}><i className="bx bx-list-ul" /> Varian</button>
                      <button className={styles.btnEdit} onClick={() => openEdit(row)}><i className="bx bx-edit" /></button>
                      <button className={styles.btnDel} onClick={() => setConfirm(row)}><i className="bx bx-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Modal Varian Produk ─────────────────────────────────────────
// ── Modal Varian Produk (VERSI FIX) ─────────────────────────────
// Bug sebelumnya: form state pakai key `name`, tapi backend endpoint
//   POST /admin/products/:id/variants  dan  PUT /admin/variants/:id
// expect body { size_label, stock } — bukan `name`. Akibatnya size_label
// tidak pernah terkirim (selalu undefined) -> backend selalu balas
// "size_label wajib diisi", dan kolom NAMA di tabel juga kosong karena
// data dari server balik sebagai `size_label`, bukan `name`.
//
// Fix: samakan key form & tabel jadi `size_label` di semua tempat.

function MerchVariantsModal({ product, onClose }: { product: any; onClose: () => void }) {
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState<Record<string, any>>({ size_label: "", sku: "", price_adjustment: 0, stock: 0, is_active: true });
  const [editId, setEditId]     = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(merchApi(`/products/${product.slug || product.id}`));
      const json = await res.json();
      setVariants(json?.data?.variants ?? []);
    } catch { setVariants([]); }
    setLoading(false);
  }, [product]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ size_label: "", sku: "", price_adjustment: 0, stock: 0, is_active: true }); setEditId(null); };

  const save = async () => {
    if (!form.size_label?.trim()) { showToast("Nama varian (ukuran) wajib diisi", "error"); return; }
    setSaving(true);
    try {
      const isEdit = !!editId;
      const url    = isEdit ? merchApi(`/admin/variants/${editId}`) : merchApi(`/admin/products/${product.id}/variants`);
      const res    = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size_label: form.size_label.trim(),
          sku: form.sku,
          price_adjustment: form.price_adjustment,
          stock: form.stock,
        }),
      });
      const json = await res.json();
      if (json.status) { showToast("Varian disimpan!", "success"); resetForm(); load(); }
      else showToast(json.message || "Gagal menyimpan varian", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
    setSaving(false);
  };

  const del = async (v: any) => {
    if (!confirm(`Hapus varian "${v.size_label}"?`)) return;
    try {
      const res  = await fetch(merchApi(`/admin/variants/${v.id}`), { method: "DELETE" });
      const json = await res.json();
      if (json.status) { showToast("Varian dihapus!", "success"); load(); }
      else showToast(json.message || "Gagal menghapus", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className={styles.formModal} style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        <div className={styles.formModalHeader}>
          <h3><i className="bx bx-list-ul" /> Varian — {product.name}</h3>
          <button className={styles.closeX} onClick={onClose}><i className="bx bx-x" /></button>
        </div>
        <div className={styles.formBody}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
            <div className={styles.field} style={{ flex: 1, minWidth: 100, marginBottom: 0 }}>
              <label>Nama Varian</label>
              <input value={form.size_label} onChange={e => setForm((p: any) => ({ ...p, size_label: e.target.value }))} placeholder="cth: Size L" />
            </div>
            <div className={styles.field} style={{ flex: 1, minWidth: 100, marginBottom: 0 }}>
              <label>SKU</label>
              <input value={form.sku} onChange={e => setForm((p: any) => ({ ...p, sku: e.target.value }))} />
            </div>
            <div className={styles.field} style={{ width: 100, marginBottom: 0 }}>
              <label>+/- Harga</label>
              <input type="number" value={form.price_adjustment} onChange={e => setForm((p: any) => ({ ...p, price_adjustment: e.target.value }))} />
            </div>
            <div className={styles.field} style={{ width: 90, marginBottom: 0 }}>
              <label>Stok</label>
              <input type="number" value={form.stock} onChange={e => setForm((p: any) => ({ ...p, stock: e.target.value }))} />
            </div>
            <button className={styles.btnPrimary} onClick={save} disabled={saving || !form.size_label?.trim()}>
              {saving ? <i className="bx bx-loader-alt bx-spin" /> : editId ? "Simpan" : <><i className="bx bx-plus" /> Tambah</>}
            </button>
            {editId && <button className={styles.btnGhost} onClick={resetForm}>Batal</button>}
          </div>

          {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat varian...</div> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Nama</th><th>SKU</th><th>+/- Harga</th><th>Stok</th><th>Aksi</th></tr></thead>
                <tbody>
                  {variants.length === 0 ? (
                    <tr><td colSpan={5} className={styles.empty}>Belum ada varian</td></tr>
                  ) : variants.map(v => (
                    <tr key={v.id}>
                      <td>{v.size_label}</td><td>{v.sku || "-"}</td>
                      <td>{Number(v.price_adjustment ?? 0).toLocaleString("id-ID")}</td>
                      <td>{v.stock}</td>
                      <td>
                        <div className={styles.actionBtns}>
                          <button
                            className={styles.btnEdit}
                            onClick={() => {
                              setForm({
                                size_label: v.size_label ?? "",
                                sku: v.sku ?? "",
                                price_adjustment: v.price_adjustment ?? 0,
                                stock: v.stock ?? 0,
                              });
                              setEditId(v.id);
                            }}
                          >
                            <i className="bx bx-edit" />
                          </button>
                          <button className={styles.btnDel} onClick={() => del(v)}><i className="bx bx-trash" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className={styles.formFooter}>
          <button className={styles.btnGhost} onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-tab: KODE DISKON ────────────────────────────────────────
function MerchDiscountsTab() {
  const [rows, setRows]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<"add" | "edit" | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<any>(null);
  const [toast, setToast]   = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(merchApi("/admin/discount-codes?include_inactive=true"));
      const json = await res.json();
      setRows(Array.isArray(json?.data) ? json.data : []);
    } catch { setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setFormData({ is_active: true }); setModal("add"); };
  const openEdit = (row: any) => { setFormData({ ...row }); setModal("edit"); };

  const save = async () => {
    setSaving(true);
    try {
      const isEdit = modal === "edit";
      const url    = isEdit ? merchApi(`/admin/discount-codes/${formData.id}`) : merchApi("/admin/discount-codes");
      const res    = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.status) { showToast(isEdit ? "Kode diskon diperbarui!" : "Kode diskon ditambahkan!", "success"); setModal(null); load(); }
      else showToast(json.message || "Gagal menyimpan", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
    setSaving(false);
  };

  const del = async (row: any) => {
    setConfirm(null);
    try {
      const res  = await fetch(merchApi(`/admin/discount-codes/${row.id}`), { method: "DELETE" });
      const json = await res.json();
      if (json.status) { showToast("Kode diskon dihapus!", "success"); load(); }
      else showToast(json.message || "Gagal menghapus", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
  };

  const fields = [
    { key: "code", label: "Kode (cth: JKT48FANS)" },
    { key: "discount_percent", label: "Diskon (%)", type: "number" },
    { key: "max_uses", label: "Maks Pemakaian", hint: "kosongkan = tanpa batas", type: "number" },
    { key: "expires_at", label: "Kedaluwarsa", type: "datetime-local" },
    { key: "is_active", label: "Aktif", type: "checkbox" },
  ];

  const cols = [
    { key: "code", label: "Kode" },
    { key: "discount_percent", label: "Diskon %" },
    { key: "used_count", label: "Terpakai" },
    { key: "max_uses", label: "Maks" },
    { key: "is_active", label: "Aktif" },
  ];

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={`Hapus kode diskon "${confirm.code}"?`} onConfirm={() => del(confirm)} onCancel={() => setConfirm(null)} />}
      {modal && (
        <FormModal
          title={modal === "add" ? "Tambah Kode Diskon" : "Edit Kode Diskon"}
          fields={fields}
          data={formData}
          onChange={(k, v) => setFormData((p: any) => ({ ...p, [k]: v }))}
          onSave={save}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
      <div className={styles.sectionHeader}>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>Kode Diskon <span className={styles.count}>{rows.length}</span></h3>
        <button className={styles.btnPrimary} onClick={openAdd}><i className="bx bx-plus" /> Tambah</button>
      </div>
      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat...</div>
        : <DataTable cols={cols} rows={rows} onEdit={openEdit} onDelete={row => setConfirm(row)} />}
    </div>
  );
}

// ── Sub-tab: PESANAN ────────────────────────────────────────────
function MerchOrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [tracking, setTracking] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res  = await fetch(merchApi(`/admin/orders?${params}`));
      const json = await res.json();
      setOrders(Array.isArray(json?.data) ? json.data : json?.data?.items ?? []);
    } catch { setOrders([]); }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (order: any, status: string) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status } : o));
    try {
      const res  = await fetch(merchApi(`/admin/orders/${order.id}/status`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.status) { showToast(json.message || "Gagal update status", "error"); load(); }
      else showToast("Status pesanan diperbarui", "success");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); load(); }
  };

  const saveTracking = async () => {
    if (!detail || !tracking.trim()) return;
    setSavingTracking(true);
    try {
      const res  = await fetch(merchApi(`/admin/orders/${detail.id}/tracking`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking_number: tracking.trim() }),
      });
      const json = await res.json();
      if (json.status) { showToast("Resi disimpan & email terkirim ke customer!", "success"); setDetail(null); load(); }
      else showToast(json.message || "Gagal menyimpan resi", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
    setSavingTracking(false);
  };

  const filtered = orders.filter(o =>
    (o.order_code || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (s: string) => ({
    pending:   { bg: "rgba(156,163,175,0.2)", fg: "var(--cv-text-mute)" },
    paid:      { bg: "color-mix(in srgb, var(--cv-orange-hi) 16%, transparent)",  fg: "var(--cv-orange-hi)" },
    processing:{ bg: "color-mix(in srgb, var(--cv-orange) 22%, transparent)",  fg: "var(--cv-orange)" },
    shipped:   { bg: "color-mix(in srgb, var(--cv-orange-deep) 26%, transparent)",  fg: "var(--cv-orange-deep)" },
    completed: { bg: "rgba(16,185,129,0.2)",  fg: "#10b981" },
    cancelled: { bg: "rgba(239,68,68,0.2)",   fg: "#ef4444" },
  }[s] || { bg: "rgba(156,163,175,0.2)", fg: "var(--cv-text-mute)" });

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {detail && (
        <div className={styles.modalOverlay} onClick={() => setDetail(null)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3>Pesanan {detail.order_code}</h3>
              <button className={styles.closeX} onClick={() => setDetail(null)}><i className="bx bx-x" /></button>
            </div>
            <div className={styles.formBody}>
              <p><strong>Customer:</strong> {detail.customer_name}</p>
              <p><strong>Email:</strong> {detail.customer_email}</p>
              <p><strong>No HP:</strong> {detail.customer_phone}</p>
              <p><strong>Alamat:</strong> {detail.shipping_address}</p>
              <p><strong>Total:</strong> Rp{Number(detail.total_amount ?? 0).toLocaleString("id-ID")}</p>
              <div className={styles.field}>
                <label>Nomor Resi</label>
                <input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Masukkan nomor resi..." />
                <small style={{ opacity: 0.6 }}>Menyimpan resi akan otomatis mengirim email ke customer.</small>
              </div>
            </div>
            <div className={styles.formFooter}>
              <button className={styles.btnGhost} onClick={() => setDetail(null)}>Tutup</button>
              <button className={styles.btnPrimary} onClick={saveTracking} disabled={savingTracking || !tracking.trim()}>
                {savingTracking ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Resi</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.sectionHeader}>
        <h3 style={{ margin: 0, fontSize: "1rem" }}>Pesanan <span className={styles.count}>{orders.length}</span></h3>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="Cari kode pesanan / nama customer..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, background: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px" }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px" }}>
          <option value="">Semua Status</option>
          {["pending","paid","processing","shipped","completed","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className={styles.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </div>

      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat pesanan...</div> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}><i className="bx bx-inbox" style={{ fontSize: "3rem" }} /><p>Tidak ada pesanan</p></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.responsiveTable}`}>
            <thead><tr><th>Kode</th><th>Customer</th><th>Total</th><th>Status</th><th style={{ textAlign: "center" }}>Aksi</th></tr></thead>
            <tbody>
              {filtered.map(o => {
                const sc = statusColor(o.status);
                return (
                  <tr key={o.id}>
                    <td data-label="Kode" style={{ fontWeight: 600 }}>{o.order_code}</td>
                    <td data-label="Customer">{o.customer_name}</td>
                    <td data-label="Total">Rp{Number(o.total_amount ?? 0).toLocaleString("id-ID")}</td>
                    <td data-label="Status">
                      <select
                        value={o.status}
                        onChange={e => updateStatus(o, e.target.value)}
                        style={{ padding: "3px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, border: "none", outline: "none", background: sc.bg, color: sc.fg }}
                      >
                        {["pending","paid","processing","shipped","completed","cancelled"].map(s => <option key={s} value={s} style={{ background: "var(--cv-ink-3)", color: "var(--cv-text)" }}>{s}</option>)}
                      </select>
                    </td>
                    <td data-label="Aksi" style={{ textAlign: "center" }}>
                      <button className={styles.btnGhost} style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => { setDetail(o); setTracking(o.tracking_number || ""); }}>
                        <i className="bx bx-detail" /> Detail / Resi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── SECTION MANAGER ──────────────────────────────────────────
function SectionManager({ section }: { section: Section }) {
  const [rows, setRows]         = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<"add" | "edit" | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState<any>(null);
  const [toast, setToast]       = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [stats, setStats] = useState<Record<string, any>>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsSaving, setStatsSaving] = useState(false);
  const [newsTab, setNewsTab]   = useState<"cavallery" | "jkt48">("cavallery");

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const loadStats = useCallback(async () => {
    if (section !== "setlists") return;
    setStatsLoading(true);
    try {
      const res = await fetch(api("/stats"));
      const json = await res.json();
      if (json.status && Array.isArray(json.data)) {
        const totalShows = json.data.find((s: any) => s.stat_key === "total_shows" || s.stat_key === "total_show");
        const setlists = json.data.find((s: any) => s.stat_key === "setlists" || s.stat_key === "total_setlist");
        const unitSongs = json.data.find((s: any) => s.stat_key === "unit_songs" || s.stat_key === "unit_song");
        setStats({
          total_shows: {
            stat_key: "total_shows",
            label: totalShows?.label || "Total Shows",
            value: String(totalShows?.value ?? "102"),
            icon: totalShows?.icon || "bx-calendar",
            sort_order: totalShows?.sort_order || "1",
            is_active: true,
          },
          setlists: {
            stat_key: "setlists",
            label: setlists?.label || "Setlists",
            value: String(setlists?.value ?? "7"),
            icon: setlists?.icon || "bx-music",
            sort_order: setlists?.sort_order || "2",
            is_active: true,
          },
          unit_songs: {
            stat_key: "unit_songs",
            label: unitSongs?.label || "Unit Songs",
            value: String(unitSongs?.value ?? "15"),
            icon: unitSongs?.icon || "bx-microphone",
            sort_order: unitSongs?.sort_order || "3",
            is_active: true,
          },
        });
      }
    } catch (e) { console.error("Error loading stats:", e); }
    setStatsLoading(false);
  }, [section]);

  useEffect(() => { if (section === "setlists") loadStats(); }, [section, loadStats]);

  const handleStatChange = (key: string, val: string) => setStats(prev => ({ ...prev, [key]: { ...prev[key], value: val } }));

  const saveStats = async () => {
    setStatsSaving(true);
    try {
      let allSuccess = true;
      for (const key of ['total_shows', 'setlists', 'unit_songs']) {
        const item = stats[key];
        if (!item) continue;
        const res = await fetch(api(`/stats/${item.stat_key}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        const json = await res.json();
        if (!json.status) allSuccess = false;
      }
      showToast(allSuccess ? "Statistik berhasil disimpan!" : "Beberapa statistik gagal disimpan", allSuccess ? "success" : "error");
    } catch { showToast("Gagal menyimpan statistik", "error"); }
    setStatsSaving(false);
  };

  const cfg: Record<string, { endpoint: string; cols: { key: string; label: string }[]; fields: { key: string; label: string; type?: string; rows?: number; hint?: string }[]; listKey: string; }> = {
    news: {
      endpoint: "/news",
      listKey: "news",
      cols: [
        { key: "image_url", label: "Gambar" },
        { key: "title", label: "Judul" },
        { key: "slug", label: "Slug URL (/news/cavallery-statement/[slug])" },
        { key: "label", label: "Label" },
        { key: "is_active", label: "Aktif" },
        { key: "published_at", label: "Tanggal" }
      ],
      fields: [
        { key: "title", label: "Judul Berita" },
        { key: "slug", label: "Slug URL Berita", hint: "Contoh: resmi-pernyataan-sikap (Akan menjadi URL /news/cavallery-statement/[slug])" },
        { key: "label", label: "Label / Kategori (cth: Statement, Resmi, Pengumuman)" },
        { key: "author", label: "Penulis / Author (cth: Cavallery Staff)" },
        { key: "description", label: "Deskripsi Singkat / Ringkasan", type: "textarea", rows: 2 },
        { key: "content", label: "Konten Lengkap Berita", type: "textarea", rows: 6 },
        { key: "image_url", label: "URL Gambar Utama" },
        { key: "images", label: "URL Gambar Dokumentasi / Lampiran", hint: "pisahkan dengan koma jika lebih dari 1", type: "textarea", rows: 2 },
        { key: "published_at", label: "Tanggal Publish", type: "datetime-local" },
        { key: "is_active", label: "Aktif", type: "checkbox" },
        { key: "is_pinned", label: "Pin ke Bagian Atas", type: "checkbox" }
      ]
    },
    timeline: { endpoint: "/timeline", listKey: "events", cols: [{ key: "year", label: "Tahun" }, { key: "date_label", label: "Tanggal" }, { key: "title", label: "Judul" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "year", label: "Tahun" }, { key: "event_date", label: "Tanggal Event", type: "date" }, { key: "date_label", label: "Label Tanggal" }, { key: "title", label: "Judul" }, { key: "handwriting_caption", label: "Caption Polaroid" }, { key: "description", label: "Deskripsi", type: "textarea", rows: 3 }, { key: "image_url", label: "URL Gambar Polaroid" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    gallery: { endpoint: "/gallery", listKey: "items", cols: [{ key: "image_url", label: "Gambar" }, { key: "title", label: "Judul" }, { key: "date_label", label: "Tanggal" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "title", label: "Judul" }, { key: "image_url", label: "URL Gambar" }, { key: "date_label", label: "Label Tanggal" }, { key: "alt_text", label: "Alt Text" }, { key: "tags", label: "Tags", hint: "pisahkan dengan koma, boleh kosong" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    setlists: { endpoint: "/setlists", listKey: "", cols: [{ key: "image_url", label: "Gambar" }, { key: "title", label: "Judul" }, { key: "date_range", label: "Periode" }, { key: "badge", label: "Badge" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "title", label: "Judul" }, { key: "date_range", label: "Periode (cth: 1 Jan - Present)" }, { key: "badge", label: "Badge (cth: 3 Shows)" }, { key: "image_url", label: "URL Gambar" }, { key: "songs", label: "Songs", hint: "pisahkan dengan koma", type: "textarea", rows: 3 }, { key: "show_count", label: "Jumlah Show", type: "number" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    stats: { endpoint: "/stats", listKey: "", cols: [{ key: "stat_key", label: "Key" }, { key: "label", label: "Label" }, { key: "value", label: "Nilai" }, { key: "icon", label: "Icon" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "stat_key", label: "Stat Key (cth: total_shows)" }, { key: "label", label: "Label" }, { key: "value", label: "Nilai", type: "number" }, { key: "icon", label: "Icon (cth: bx-calendar)" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    youtube: { endpoint: "/youtube", listKey: "videos", cols: [{ key: "title", label: "Judul" }, { key: "category", label: "Kategori" }, { key: "video_id", label: "Video ID" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "title", label: "Judul" }, { key: "url", label: "URL YouTube" }, { key: "category", label: "Kategori" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    funfacts: { endpoint: "/funfacts", listKey: "", cols: [{ key: "content", label: "Konten" }, { key: "sort_order", label: "Urutan" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "content", label: "Konten Funfact", type: "textarea", rows: 3 }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    kabesha: { endpoint: "/kabesha", listKey: "", cols: [{ key: "image_url", label: "Gambar" }, { key: "year_label", label: "Tahun" }, { key: "title", label: "Judul" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "year_label", label: "Label Tahun" }, { key: "title", label: "Judul" }, { key: "description", label: "Deskripsi", type: "textarea", rows: 3 }, { key: "image_url", label: "URL Gambar" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    dashboard:        { endpoint: "", listKey: "", cols: [], fields: [] },
    media:            { endpoint: "", listKey: "", cols: [], fields: [] },
    discord:          { endpoint: "", listKey: "", cols: [], fields: [] },
    journal:          { endpoint: "", listKey: "", cols: [], fields: [] },
    tickets:          { endpoint: "", listKey: "", cols: [], fields: [] },
    keanggotaan:      { endpoint: "", listKey: "", cols: [], fields: [] },
    adminkas:         { endpoint: "", listKey: "", cols: [], fields: [] },
    admindonasi:      { endpoint: "", listKey: "", cols: [], fields: [] },
    adminspreadsheet: { endpoint: "", listKey: "", cols: [], fields: [] },
  };

  const c = cfg[section] || { endpoint: "", listKey: "", cols: [], fields: [] };

  const jkt48Cols = [
    { key: "image_url", label: "Gambar" },
    { key: "title", label: "Judul" },
    { key: "label", label: "Kategori" },
    { key: "link_url", label: "Link Web" },
    { key: "published_at", label: "Tanggal" },
  ];

  const load = useCallback(async () => {
    if (["dashboard","media","discord","journal","tickets"].includes(section)) return;
    setLoading(true);
    try {
      let fetchUrl = api(`${c.endpoint}${c.endpoint.includes("?") ? "&" : "?"}_t=${Date.now()}`);
      if (section === "news") {
        fetchUrl = api(`${c.endpoint}?type=${newsTab}&_t=${Date.now()}`);
      }
      const res  = await fetch(fetchUrl, { cache: "no-store" });
      const json = await res.json();
      const data = json?.data;
      if      (Array.isArray(data))            setRows(data);
      else if (data?.news)                     setRows(data.news);
      else if (data?.items)                    setRows(data.items);
      else if (data?.videos)                   setRows(data.videos);
      else if (data?.events)                   setRows(data.events);
      else if (c.listKey && data?.[c.listKey]) setRows(data[c.listKey]);
      else                                     setRows([]);
    } catch { setRows([]); }
    setLoading(false);
  }, [section, newsTab, c.endpoint, c.listKey]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setFormData({ is_active: true, sort_order: 0 }); setModal("add"); };
  const openEdit = (row: any) => { setFormData({ ...row }); setModal("edit"); };

  const save = async () => {
    setSaving(true);
    try {
      const isEdit = modal === "edit";
      const editId = section === "stats" ? formData.stat_key : section === "youtube" ? formData.video_id : formData.id;
      const url    = isEdit ? api(`${c.endpoint}/${editId}`) : api(c.endpoint);
      const res    = await fetch(url, { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(preparePayload(section, formData)) });
      const json   = await res.json();
      if (json.status) {
        showToast(isEdit ? "Berhasil diperbarui!" : "Berhasil ditambahkan!", "success");
        const itemLabel = formData.title || formData.label || formData.name || formData.slug || editId || "Item";
        recordDashboardActivity(
          isEdit ? "Edit Data" : "Tambah Data",
          section.toUpperCase(),
          `${isEdit ? "Memperbarui" : "Menambahkan"} item "${itemLabel}" di modul ${section}`,
          currentAdminUsername
        );
        setModal(null);
        load();
      }
      else showToast(json.message || "Gagal menyimpan", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
    setSaving(false);
  };

  const del = async (row: any) => {
    setConfirm(null);
    try {
      const id  = section === "stats" ? row.stat_key : section === "youtube" ? row.video_id : row.id;
      const itemLabel = row.title || row.label || row.name || row.slug || id || "Item";

      // Pindahkan ke Trash terlebih dahulu agar bisa dipulihkan
      try {
        await fetch("/api/admin/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "trash",
            entity_type: section,
            entity_id: String(id),
            title: itemLabel,
            payload: row,
            username: currentAdminUsername,
          }),
        });
      } catch (err) {
        console.warn("Failed to backup to trash:", err);
      }

      const res  = await fetch(api(`${c.endpoint}/${id}`), { method: "DELETE" });
      const json = await res.json();
      if (json.status) {
        showToast("Berhasil dihapus (dipindahkan ke Trash)!", "success");
        recordDashboardActivity(
          "Hapus Data",
          section.toUpperCase(),
          `Menghapus item "${itemLabel}" di modul ${section} (dipindahkan ke Trash)`,
          currentAdminUsername
        );
        load();
      }
      else showToast(json.message || "Gagal menghapus", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
  };

  if (["dashboard","media","discord","journal","tickets"].includes(section)) return null;

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={`Hapus "${confirm.title || confirm.label || confirm.stat_key || confirm.content?.slice(0, 40) || "item ini"}"?`} onConfirm={() => del(confirm)} onCancel={() => setConfirm(null)} />}
      {modal && <FormModal title={modal === "add" ? `Tambah ${section}` : `Edit ${section}`} fields={c.fields} data={formData} onChange={(k, v) => setFormData(prev => ({ ...prev, [k]: v }))} onSave={save} onClose={() => setModal(null)} saving={saving} />}

      {section === "news" && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setNewsTab("cavallery")}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                border: newsTab === "cavallery" ? "1px solid var(--cv-orange)" : "1px solid var(--adm-border)",
                background: newsTab === "cavallery" ? "color-mix(in srgb, var(--cv-orange) 18%, transparent)" : "var(--adm-surface)",
                color: newsTab === "cavallery" ? "var(--cv-orange)" : "var(--adm-text)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="bx bx-shield-quarter" /> Berita Cavallery (Statement)
            </button>
            <button
              type="button"
              onClick={() => setNewsTab("jkt48")}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                border: newsTab === "jkt48" ? "1px solid var(--cv-orange)" : "1px solid var(--adm-border)",
                background: newsTab === "jkt48" ? "color-mix(in srgb, var(--cv-orange) 18%, transparent)" : "var(--adm-surface)",
                color: newsTab === "jkt48" ? "var(--cv-orange)" : "var(--adm-text)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="bx bx-news" /> Berita Resmi JKT48 (Official API)
            </button>
          </div>

          <div style={{
            background: "color-mix(in srgb, var(--cv-orange) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.84rem",
            color: "var(--cv-text)",
            lineHeight: 1.5,
          }}>
            {newsTab === "cavallery" ? (
              <span>
                <i className="bx bx-broadcast" style={{ color: "var(--cv-orange)", marginRight: 6 }} />
                <strong>Realtime Sync:</strong> Berita Cavallery tersambung langsung secara realtime ke <strong>Halaman Utama (Home)</strong> dan <strong>/news</strong>. Mengubah slug URL berita akan otomatis memperbarui link publik menjadi <code>/news/cavallery-statement/[slug]</code> tanpa jeda/cache.
              </span>
            ) : (
              <span>
                <i className="bx bx-info-circle" style={{ color: "var(--cv-orange)", marginRight: 6 }} />
                <strong>Feed Resmi JKT48:</strong> Data berita ini diambil langsung dari feed resmi situs JKT48 (read-only) untuk ditampilkan di portal berita publik.
              </span>
            )}
          </div>
        </div>
      )}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-data" /> {section === "news" ? (newsTab === "cavallery" ? "Cavallery Statement" : "Berita Resmi JKT48") : section.charAt(0).toUpperCase() + section.slice(1)}
          <span className={styles.count}>{rows.length} item</span>
        </h2>
        {!(section === "news" && newsTab === "jkt48") && (
          <button className={styles.btnPrimary} onClick={openAdd}><i className="bx bx-plus" /> Tambah {section === "news" ? "Berita" : ""}</button>
        )}
      </div>

      {section === "setlists" && (
        <div style={{ background: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "0.9rem", color: "var(--cv-text)", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 6 }}><i className="bx bx-bar-chart-alt-2" style={{ color: "var(--adm-accent)", fontSize: "1.1rem" }} />Edit Statistik</h3>
          {statsLoading ? <div style={{ color: "var(--cv-text-mute)", fontSize: 13, padding: "5px 0" }}><i className="bx bx-loader-alt bx-spin" /> Memuat statistik...</div> : (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              {[["total_shows", "Total Shows"], ["setlists", "Setlists"], ["unit_songs", "Unit Songs"]].map(([key, label]) => (
                <div key={key} className={styles.field} style={{ flex: 1, minWidth: 120 }}>
                  <label>{label}</label>
                  <input type="number" value={stats[key]?.value ?? ""} onChange={e => handleStatChange(key, e.target.value)} style={{ background: "var(--cv-ink-1)" }} />
                </div>
              ))}
              <button className={styles.btnPrimary} onClick={saveStats} disabled={statsSaving} style={{ height: 36, padding: "0 1.25rem", fontSize: "0.85rem" }}>
                {statsSaving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Statistik</>}
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data...</div>
      ) : (
        <DataTable
          cols={section === "news" && newsTab === "jkt48" ? jkt48Cols : c.cols}
          rows={rows}
          onEdit={openEdit}
          onDelete={row => setConfirm(row)}
          readOnly={section === "news" && newsTab === "jkt48"}
        />
      )}
    </div>
  );
}

const TICKET_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw62qxU5a7zGuNSpOHfVwX6mPb3DWNo94GvLSMNsitkx-YJJIQG_5QcDhhrfaXHHeMGnA/exec";

// ─── TICKETS MANAGER ──────────────────────────────────────────
function TicketsManager() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(TICKET_SCRIPT_URL);
      const rawData = await res.json();
      const formatted = Array.isArray(rawData)
        ? rawData
            .map((row: any, index: number) => {
              if (index === 0 && (row[1] === "Nama" || typeof row[0] === "string")) return null;
              return {
                id: parseInt(row[0]) || index + 1,
                date: row[5] || new Date().toISOString(),
                name: row[1] || "Anonymous",
                no_anggota: row[2] || "-",
                kategori: row[3] || "Lainnya",
                pesan: row[4] || "",
                divisi: row[6] || "-",
                status: row[7] || "Pending",
              };
            })
            .filter(Boolean)
        : [];

      setTickets(
        formatted
          .map((item: any) => ({
            ...item,
            formattedDate: item.date
              ? new Date(item.date).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-",
          }))
          .reverse()
      );
    } catch {
      showToast("Gagal memuat data tiket", "error");
      setTickets([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const params = new URLSearchParams();
      params.append("action", "delete");
      params.append("id", confirmDelete.id.toString());

      await fetch(TICKET_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: params,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      showToast("Tiket berhasil dihapus!", "success");
      setConfirmDelete(null);
      setTickets(prev => prev.filter(t => t.id !== confirmDelete.id));
    } catch {
      showToast("Gagal menghapus tiket", "error");
    }
  };

  const handleUpdate = async (id: number, field: "divisi" | "status", value: string) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
    try {
      const current = tickets.find((t) => t.id === id);
      const params = new URLSearchParams();
      params.append("action", "update");
      params.append("id", id.toString());
      if (field === "divisi") params.append("divisi", value);
      if (field === "status") params.append("status", value);
      if (current) {
        if (field !== "divisi") params.append("divisi", current.divisi);
        if (field !== "status") params.append("status", current.status);
      }

      await fetch(TICKET_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: params,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      showToast("Status tiket diperbarui!", "success");
    } catch {
      showToast("Gagal update", "error");
      load();
    }
  };

  const filtered = tickets.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.kategori.toLowerCase().includes(search.toLowerCase()) || t.pesan.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDelete && <ConfirmModal msg={`Hapus tiket dari "${confirmDelete.name}"?`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}><i className="bx bx-receipt" style={{ color: "#10b981" }} /> Ticketing Fanbase<span className={styles.count}>{tickets.length} tiket</span></h2>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <input placeholder="Cari pengirim, kategori atau pesan..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200, background: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px" }} />
        <button className={styles.btnGhost} onClick={load}><i className="bx bx-refresh" /> Refresh</button>
      </div>
      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat tiket...</div> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}><i className="bx bx-inbox" style={{ fontSize: "3rem" }} /><p>Tidak ada tiket yang ditemukan</p></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.responsiveTable}`}>
            <thead><tr><th style={{ width: "130px" }}>Tanggal</th><th style={{ width: "130px" }}>Pengirim</th><th style={{ width: "130px" }}>Kategori</th><th>Pesan</th><th style={{ width: "120px" }}>Divisi</th><th style={{ width: "100px", textAlign: "center" }}>Status</th><th style={{ width: "60px", textAlign: "center" }}>Aksi</th></tr></thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td data-label="Tanggal" style={{ whiteSpace: "nowrap", fontSize: "0.8rem" }}>{t.formattedDate}</td>
                  <td data-label="Pengirim"><div style={{ fontWeight: 600 }}>{t.name}</div><div style={{ fontSize: "0.75rem", opacity: 0.7 }}>No. Anggota: {t.no_anggota}</div></td>
                  <td data-label="Kategori"><span style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "2px 6px", borderRadius: 4, fontSize: "0.75rem", whiteSpace: "nowrap" }}>{t.kategori}</span></td>
                  <td data-label="Pesan" style={{ whiteSpace: "normal", wordBreak: "break-word", fontSize: "0.85rem" }}>{t.pesan}</td>
                  <td data-label="Divisi" style={{ fontSize: "0.8rem", color: "var(--cv-text)", opacity: t.divisi === "-" ? 0.4 : 1 }}>
                    <select value={t.divisi} onChange={e => handleUpdate(t.id, "divisi", e.target.value)} style={{ background: "transparent", border: "1px solid var(--cv-line)", color: "inherit", borderRadius: 4, padding: "2px 4px", fontSize: "0.75rem", cursor: "pointer", width: "100%" }}>
                      {["-","Divisi Humas","Divisi Desain","Divisi IT","Divisi Medsos","Divisi Esports","Divisi Sekretaris","Divisi Girl","Divisi Video Editor","All Divisi"].map(d => <option key={d} value={d} style={{ background: "var(--cv-ink-3)", color: "var(--cv-text)" }}>{d}</option>)}
                    </select>
                  </td>
                  <td data-label="Status" style={{ textAlign: "center" }}>
                    <select value={t.status} onChange={e => handleUpdate(t.id, "status", e.target.value)} style={{ padding: "3px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", border: "none", outline: "none", appearance: "none", textAlign: "center", width: "100%", background: t.status === "Completed" ? "rgba(16,185,129,0.2)" : t.status === "Progress" ? "color-mix(in srgb, var(--cv-orange) 20%, transparent)" : t.status === "Rejected" ? "rgba(239,68,68,0.2)" : "rgba(156,163,175,0.2)", color: t.status === "Completed" ? "#10b981" : t.status === "Progress" ? "var(--cv-orange)" : t.status === "Rejected" ? "#ef4444" : "var(--cv-text-mute)" }}>
                      {["Pending","Progress","Completed","Rejected"].map(s => <option key={s} value={s} style={{ background: "var(--cv-ink-3)", color: "var(--cv-text)" }}>{s}</option>)}
                    </select>
                  </td>
                  <td data-label="Aksi" style={{ textAlign: "center" }}>
                    <button className={styles.btnGhost} style={{ padding: "4px 8px", color: "#ef4444" }} onClick={() => setConfirmDelete(t)} title="Hapus"><i className="bx bx-trash" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── CALENDAR MANAGER ──────────────────────────────────────────
function CalendarManager() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("19:00");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(() => {
    setLoading(true);
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("cavallery_calendar") : null;
      if (saved) setEvents(JSON.parse(saved));
      else setEvents([]);
    } catch {
      setEvents([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) { showToast("Judul dan Tanggal wajib diisi", "error"); return; }
    setSaving(true);
    try {
      const newEvents = isEdit
        ? events.map(ev => ev.id === editId ? { ...ev, title, date, startTime, url, imageUrl } : ev)
        : [...events, { id: Date.now().toString(), title, date, startTime, url, imageUrl }];
      setEvents(newEvents);
      if (typeof window !== "undefined") {
        localStorage.setItem("cavallery_calendar", JSON.stringify(newEvents));
      }
      showToast(isEdit ? "Jadwal diperbarui" : "Jadwal ditambahkan", "success");
      setShowModal(false);
    } catch {
      showToast("Gagal menyimpan jadwal", "error");
    }
    setSaving(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const newEvents = events.filter(ev => ev.id !== confirmDelete.id);
    setEvents(newEvents);
    if (typeof window !== "undefined") {
      localStorage.setItem("cavallery_calendar", JSON.stringify(newEvents));
    }
    showToast("Jadwal dihapus", "success");
    setConfirmDelete(null);
  };

  const openAdd = () => { setIsEdit(false); setEditId(""); setTitle(""); setDate(""); setStartTime("19:00"); setUrl(""); setImageUrl(""); setShowModal(true); };
  const openEdit = (item: any) => { setIsEdit(true); setEditId(item.id); setTitle(item.title); setDate(item.date); setStartTime(item.startTime || "19:00"); setUrl(item.url || ""); setImageUrl(item.imageUrl || ""); setShowModal(true); };

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDelete && <ConfirmModal msg={`Hapus jadwal "${confirmDelete.title}"?`} onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}><h3>{isEdit ? "Edit Jadwal" : "Tambah Jadwal Manual"}</h3><button className={styles.closeX} onClick={() => setShowModal(false)}><i className="bx bx-x" /></button></div>
            <form onSubmit={handleSave}>
              <div className={styles.formBody}>
                <div className={styles.field}><label>Judul Event <span style={{ color: "#e05252" }}>*</span></label><input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Contoh: Meet & Greet" /></div>
                <div style={{ display: "flex", gap: 12 }}>
                  <div className={styles.field} style={{ flex: 1 }}><label>Tanggal <span style={{ color: "#e05252" }}>*</span></label><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
                  <div className={styles.field} style={{ flex: 1 }}><label>Waktu (WIB)</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
                </div>
                <div className={styles.field}><label>URL / Link <small>(opsional)</small></label><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
                <div className={styles.field}>
                  <label>Gambar Event <small>(opsional)</small></label>
                  <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
                  {imageUrl && <img src={imageUrl} alt="preview" style={{ marginTop: 8, maxHeight: 80, borderRadius: 8, objectFit: "cover", border: "1px solid var(--adm-border)" }} onError={e => (e.currentTarget.style.display = "none")} />}
                </div>
              </div>
              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}><i className="bx bx-calendar" style={{ color: "var(--cv-orange)" }} /> Kalender Manual<span className={styles.count}>{events.length} jadwal</span></h2>
        <button className={styles.btnPrimary} onClick={openAdd}><i className="bx bx-plus" /> Tambah Jadwal</button>
      </div>
      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat jadwal...</div> : events.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}><i className="bx bx-calendar-x" style={{ fontSize: "3rem" }} /><p>Belum ada jadwal manual</p></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Tanggal</th><th>Waktu</th><th>Judul Event</th><th>URL</th><th style={{ textAlign: "center" }}>Aksi</th></tr></thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td>{ev.date}</td><td>{ev.startTime} WIB</td><td style={{ fontWeight: 600 }}>{ev.title}</td>
                  <td>{ev.url ? <a href={ev.url} target="_blank" rel="noreferrer" style={{ color: "var(--cv-orange)" }}>{ev.url.length > 40 ? ev.url.slice(0, 40) + "…" : ev.url}</a> : "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button className={styles.btnGhost} style={{ padding: "4px 8px" }} onClick={() => openEdit(ev)} title="Edit"><i className="bx bx-edit" /></button>
                      <button className={styles.btnGhost} style={{ padding: "4px 8px", color: "#ef4444" }} onClick={() => setConfirmDelete(ev)} title="Hapus"><i className="bx bx-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const DEFAULT_UPDATES = [
  { id: "1", platform: "twitter", url: "https://x.com/CErine_JKT48/status/2080953550021308492" },
  { id: "2", platform: "tiktok", url: "https://www.tiktok.com/@jkt48.erine_/video/7646420621764627719" },
  { id: "3", platform: "instagram", url: "https://www.tiktok.com/@jkt48.erine_/video/7663816612352396552?q=erine&t=1785000002666" },
  { id: "4", platform: "threads", url: "https://www.threads.net/@jkt48.erine/post/DXt1wb4EjK2" }
];

// ─── UPDATES MANAGER ──────────────────────────────────────────
function UpdatesManager() {
  const [updates, setUpdates] = useState<any[]>(DEFAULT_UPDATES);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [platform, setPlatform] = useState("twitter");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/updates?t=" + Date.now());
      if (res.ok) {
        const json = await res.json();
        const list = json.data || (Array.isArray(json) ? json : null);
        if (Array.isArray(list) && list.length > 0) {
          setUpdates(list);
          setLoading(false);
          return;
        }
      }
    } catch {}

    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("cavallery_updates") : null;
      if (saved) setUpdates(JSON.parse(saved));
      else setUpdates(DEFAULT_UPDATES);
    } catch {
      setUpdates(DEFAULT_UPDATES);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return showToast("URL wajib diisi", "error");
    setSaving(true);
    try {
      let updatedList = [];
      if (editId) {
        updatedList = updates.map(u => u.id === editId ? { ...u, platform, url: url.trim() } : u);
      } else {
        updatedList = [...updates, { id: Date.now().toString(), platform, url: url.trim() }];
      }

      // Save to server API
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editId ? "update" : "add",
          id: editId,
          platform,
          url: url.trim(),
          item: { platform, url: url.trim() },
          data: updatedList,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setUpdates(json.data);
        } else {
          setUpdates(updatedList);
        }
      } else {
        setUpdates(updatedList);
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("cavallery_updates", JSON.stringify(updatedList));
      }
      showToast("Berhasil disimpan", "success");
      setShowModal(false);
    } catch {
      showToast("Gagal menyimpan ke server", "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const newUpdates = updates.filter(u => u.id !== confirmDelete.id);
      await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: confirmDelete.id, data: newUpdates }),
      });
      setUpdates(newUpdates);
      if (typeof window !== "undefined") {
        localStorage.setItem("cavallery_updates", JSON.stringify(newUpdates));
      }
      showToast("Berhasil dihapus", "success");
    } catch {
      showToast("Gagal menghapus", "error");
    }
    setConfirmDelete(null);
  };

  const openAdd = () => { setEditId(null); setPlatform("twitter"); setUrl(""); setShowModal(true); };
  const openEdit = (item: any) => { setEditId(item.id); setPlatform(item.platform); setUrl(item.url); setShowModal(true); };

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDelete && <ConfirmModal msg="Hapus update ini?" onConfirm={handleDelete} onCancel={() => setConfirmDelete(null)} />}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}><h3>{editId ? "Edit Update" : "Tambah Update"}</h3><button className={styles.closeX} onClick={() => setShowModal(false)}><i className="bx bx-x" /></button></div>
            <form onSubmit={handleSave}>
              <div className={styles.formBody}>
                <div className={styles.field}>
                  <label>Platform</label>
                  <select value={platform} onChange={e => setPlatform(e.target.value)} required style={{ background: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "8px 12px" }}>
                    <option value="twitter">Twitter / X</option>
                    <option value="tiktok">TikTok</option>
                    <option value="instagram">Instagram</option>
                    <option value="threads">Threads</option>
                  </select>
                </div>
                <div className={styles.field}><label>URL Post</label><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." required /></div>
              </div>
              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}><i className="bx bx-refresh" style={{ color: "#10b981" }} /> Latest Updates<span className={styles.count}>{updates.length} post</span></h2>
        <button className={styles.btnPrimary} onClick={openAdd}><i className="bx bx-plus" /> Tambah Update</button>
      </div>
      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat updates...</div> : updates.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}><i className="bx bx-inbox" style={{ fontSize: "3rem" }} /><p>Belum ada update</p></div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th style={{ width: "150px" }}>Platform</th><th>URL</th><th style={{ width: "100px", textAlign: "center" }}>Aksi</th></tr></thead>
            <tbody>
              {updates.map(item => (
                <tr key={item.id}>
                  <td style={{ textTransform: "capitalize" }}>{item.platform}</td>
                  <td><a href={item.url} target="_blank" rel="noreferrer" style={{ color: "var(--cv-orange)" }}>{item.url.length > 50 ? item.url.slice(0, 50) + "..." : item.url}</a></td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button className={styles.btnGhost} style={{ padding: "4px 8px" }} onClick={() => openEdit(item)}><i className="bx bx-edit" /></button>
                      <button className={styles.btnGhost} style={{ padding: "4px 8px", color: "#ef4444" }} onClick={() => setConfirmDelete(item)}><i className="bx bx-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const DEFAULT_VCSCHEDULE = {
  date: "Rabu, 11 Maret 2026",
  session1: "Sesi 1: 16.30 – 17.30",
  session2: "Sesi 2: 17.00 – 18.00",
  session3: "Sesi 3: 19.30 – 20.30",
  session4: "",
  imageUrl: "https://cavallery.id/wp-content/uploads/2026/04/VC_Maret.jpg"
};

// ─── VC SCHEDULE MANAGER ───────────────────────────────────────
function VcScheduleManager() {
  const [data, setData] = useState<any>(DEFAULT_VCSCHEDULE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vcschedule");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setData(DEFAULT_VCSCHEDULE);
      }
    } catch {
      setData(DEFAULT_VCSCHEDULE);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/vcschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: "Jadwal VC berhasil disimpan & terhubung ke halaman schedule!", type: "success" });
      } else {
        throw new Error(json.message || "Gagal menyimpan");
      }
    } catch (err: any) {
      setToast({ msg: err.message || "Gagal menyimpan", type: "error" });
    }
    setSaving(false);
  };

  const handleChange = (key: string, value: string) => setData((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}><i className="bx bx-video" style={{ color: "var(--cv-orange)" }} /> Jadwal Video Call</h2></div>
      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data...</div> : (
        <div className={styles.formModal} style={{ position: "relative", maxWidth: 600 }}>
          <form onSubmit={handleSave}>
            <div className={styles.formBody}>
              {[["date","Tanggal / Keterangan Event","Contoh: Rabu, 11 Maret 2026"],["session1","Sesi 1","Contoh: Sesi 1: 16.30 – 17.30"],["session2","Sesi 2","Contoh: Sesi 2: 17.00 – 18.00"],["session3","Sesi 3","Contoh: Sesi 3: 19.30 – 20.30"],["session4","Sesi 4 (Opsional)",""]].map(([key, label, placeholder]) => (
                <div key={key} className={styles.field}><label>{label}</label><input value={data[key] || ""} onChange={e => handleChange(key, e.target.value)} placeholder={placeholder} /></div>
              ))}
              <div className={styles.field}>
                <label>URL Gambar Poster</label>
                <input type="url" value={data.imageUrl || ""} onChange={e => handleChange("imageUrl", e.target.value)} placeholder="https://..." />
                {data.imageUrl && <img src={data.imageUrl} alt="preview" style={{ marginTop: 8, maxHeight: 150, borderRadius: 8, objectFit: "cover" }} />}
              </div>
            </div>
            <div className={styles.formFooter} style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan</>}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const DEFAULT_ABOUT_ERINE = [
  "https://pbs.twimg.com/media/HOEIOQbaYAA44IQ?format=jpg&name=large",
  "https://pbs.twimg.com/media/HMcKFbHboAEdwxl?format=jpg&name=large",
  "https://pbs.twimg.com/media/HJpGaCTaAAAZoVt?format=jpg&name=large"
];

// ─── ABOUT ERINE MANAGER ──────────────────────────────────────────
function AboutErineManager() {
  const [slides, setSlides] = useState<string[]>(DEFAULT_ABOUT_ERINE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [pickerIdx, setPickerIdx] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/about-erine");
      const json = await res.json();
      if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
        setSlides(json.data);
      } else {
        setSlides(DEFAULT_ABOUT_ERINE);
      }
    } catch {
      setSlides(DEFAULT_ABOUT_ERINE);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateSlide = (idx: number, val: string) => {
    const n = [...slides]; n[idx] = val; setSlides(n);
  };

  const addSlide = () => setSlides(prev => [...prev, ""]);

  const removeSlide = (idx: number) => {
    if (slides.length <= 1) return;
    setSlides(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const filtered = slides.filter(s => s.trim().length > 0);
    if (filtered.length === 0) {
      setToast({ msg: "Minimal harus ada 1 foto.", type: "error" });
      setSaving(false);
      return;
    }
    try {
      const res = await fetch("/api/about-erine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filtered),
      });
      const json = await res.json();
      if (json?.success) {
        setSlides(json.data);
        setToast({ msg: `✅ ${filtered.length} foto About Erine berhasil disimpan ke database!`, type: "success" });
      } else {
        setToast({ msg: json.message || "Gagal menyimpan ke server", type: "error" });
      }
    } catch {
      setToast({ msg: "Error koneksi ke server", type: "error" });
    }
    setSaving(false);
  };

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {pickerIdx !== null && (
        <MediaPickerModal
          type="image"
          onPick={(url) => { updateSlide(pickerIdx, url); setPickerIdx(null); }}
          onClose={() => setPickerIdx(null)}
        />
      )}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-image" style={{ color: "var(--cv-orange)" }} /> About Erine Hero Photos
        </h2>
        <p style={{ color: "var(--adm-muted)", fontSize: 13, marginTop: 4 }}>
          Kelola foto yang tampil di slider hero halaman About Erine. Foto pertama adalah foto utama yang paling besar.
        </p>
      </div>

      {loading ? (
        <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data dari database...</div>
      ) : (
        <div className={styles.formModal} style={{ position: "relative", maxWidth: 680 }}>
          <form onSubmit={handleSave}>
            <div className={styles.formBody}>
              {slides.map((url, idx) => (
                <div key={idx} className={styles.field}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <label style={{ margin: 0 }}>
                      {idx === 0 ? "🌟 Foto Utama (Foto 1 — tampil paling besar)" : `📷 Foto ${idx + 1}`}
                    </label>
                    {slides.length > 1 && (
                      <button
                        type="button"
                        className={styles.btnDel}
                        onClick={() => removeSlide(idx)}
                        title="Hapus foto ini"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                      >
                        <i className="bx bx-trash" /> Hapus
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
                    <input
                      type="text"
                      value={url}
                      onChange={e => updateSlide(idx, e.target.value)}
                      placeholder="URL foto (https://...) atau pilih dari media library"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={styles.btnGhost}
                      style={{ whiteSpace: "nowrap", fontSize: 13 }}
                      onClick={() => setPickerIdx(idx)}
                    >
                      <i className="bx bx-folder-open" /> Pilih
                    </button>
                  </div>
                  {url && url.trim().length > 4 && (
                    <img
                      src={url}
                      alt={`Preview ${idx + 1}`}
                      style={{ marginTop: 8, maxHeight: 160, width: "100%", borderRadius: 8, objectFit: "cover", border: "1px solid var(--adm-border)" }}
                      onError={e => (e.currentTarget.style.display = "none")}
                    />
                  )}
                </div>
              ))}

              <button
                type="button"
                className={styles.btnGhost}
                onClick={addSlide}
                style={{ width: "100%", marginTop: 8, padding: "10px", borderStyle: "dashed", fontSize: 14 }}
              >
                <i className="bx bx-plus" /> Tambah Foto Baru
              </button>

              <div style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "color-mix(in srgb, var(--cv-orange) 8%, transparent)",
                border: "1px dashed color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--adm-muted)",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}>
                <i className="bx bx-info-circle" style={{ color: "var(--cv-orange)", flexShrink: 0, marginTop: 2 }} />
                <span>
                  Total <strong>{slides.filter(s => s.trim()).length} foto</strong>. Foto 1 jadi foto utama besar, foto ke-2, 3, 4 tampil di thumbnail bawah.
                  Perubahan disimpan ke database dan langsung aktif di website.
                </span>
              </div>
            </div>
            <div className={styles.formFooter} style={{ justifyContent: "flex-end", marginTop: 16, gap: 8 }}>
              <button type="button" className={styles.btnGhost} onClick={load} disabled={loading}>
                <i className="bx bx-refresh" /> Reset
              </button>
              <button type="submit" className={styles.btnPrimary} disabled={saving}>
                {saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan ke Database...</> : <><i className="bx bx-save" /> Simpan ke Database</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const DEFAULT_CITIES: Record<string, number> = {
  "Jakarta": 92, "Bekasi": 64, "Tangerang": 58, "Bogor": 52, "Depok": 28, "Bandung": 26,
  "Surabaya": 24, "Semarang": 20, "Yogyakarta": 18, "Malang": 17, "Lampung": 12, "Medan": 11,
  "Padang": 9, "Balikpapan": 8, "Samarinda": 10, "Pekalongan": 7, "Banyumas": 6, "Kediri": 7,
  "Jember": 5, "Sidoarjo": 7, "Magelang": 5, "Kebumen": 5, "Kudus": 5, "Palembang": 5,
  "Makassar": 5, "Bengkulu": 6, "Denpasar": 2, "Banjar": 2, "Ponorogo": 3, "Nganjuk": 2,
  "Batam": 2, "Solo": 3, "Purwakarta": 2, "Pontianak": 2, "Pemalang": 3, "Pasuruan": 2,
  "Tasikmalaya": 2, "Sragen": 2, "Binjai": 2, "Jambi": 2, "Indramayu": 2, "Tegal": 3,
  "Purworejo": 2, "Cilegon": 2, "Sukabumi": 3, "Blitar": 2, "Boyolali": 2, "Karawang": 3,
  "Mojokerto": 2, "Pangkal Pinang": 2, "Palu": 2, "Kuningan": 3, "Manado": 3, "Probolinggo": 2,
  "Tuban": 2, "Kendari": 2, "Wonosobo": 2, "Garut": 2, "Majalengka": 2, "Lumajang": 2,
  "Serang": 2, "Pandeglang": 2, "Lubuklinggau": 1
};

// ─── ANGGOTA KOTA MANAGER ─────────────────────────────────────────
function AnggotaKotaManager() {
  const [cityData, setCityData] = useState<Record<string, number>>(DEFAULT_CITIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("cavallery_anggota_kota") : null;
      if (saved) setCityData(JSON.parse(saved));
      else setCityData(DEFAULT_CITIES);
    } catch {
      setCityData(DEFAULT_CITIES);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("cavallery_anggota_kota", JSON.stringify(cityData));
      }
      setToast({ msg: "Berhasil menyimpan Anggota Kota", type: "success" });
    } catch {
      setToast({ msg: "Gagal menyimpan", type: "error" });
    }
    setSaving(false);
  };

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}><i className="bx bx-map" style={{ color: "var(--cv-orange)" }} /> Anggota Kota ({Object.keys(cityData).length} Kota)</h2></div>
      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data...</div> : (
        <div className={styles.formModal} style={{ position: "relative", maxWidth: 800 }}>
          <form onSubmit={handleSave}>
            <div className={styles.formBody} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {Object.entries(cityData).map(([city, count]) => (
                <div className={styles.field} key={city} style={{ marginBottom: 0 }}>
                  <label>{city}</label>
                  <input type="number" value={count} onChange={e => setCityData({ ...cityData, [city]: parseInt(e.target.value) || 0 })} />
                </div>
              ))}
            </div>
            <div className={styles.formFooter} style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan</>}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── INVITATIONS (THE WAYFINDER) ──────────────────────────────────
const DEFAULT_INVITATIONS = [
  { id: "1", name: "Fenidelity", slug: "Fenidelity" },
  { id: "2", name: "Gitroops", slug: "Gitroops" },
  { id: "3", name: "Christyzer", slug: "Christyzer" },
  { id: "4", name: "Freyanation", slug: "Freyanation" },
  { id: "5", name: "Helismiley", slug: "Helismiley" },
  { id: "6", name: "Jessination", slug: "Jessination" },
  { id: "7", name: "MUFFIN", slug: "MUFFIN" },
  { id: "8", name: "Olla The Miracle", slug: "Olla-The-Miracle" },
  { id: "9", name: "Lunarian", slug: "Lunarian" },
  { id: "10", name: "Onielity", slug: "Onielity" },
  { id: "11", name: "Symfiony", slug: "Symfiony" },
  { id: "12", name: "Interindah", slug: "Interindah" },
  { id: "13", name: "Kath. Inc", slug: "Kath-Inc" },
  { id: "14", name: "MarshaOshi", slug: "MarshaOshi" },
  { id: "15", name: "Ellatheria", slug: "Ellatheria" },
  { id: "16", name: "Liamelior", slug: "Liamelior" },
  { id: "17", name: "Lynear", slug: "Lynear" },
  { id: "18", name: "Raishanrise", slug: "Raishanrise" },
  { id: "19", name: "Alamanda", slug: "Alamanda" },
  { id: "20", name: "Aninimous", slug: "Aninimous" },
  { id: "21", name: "Cellineyours", slug: "Cellineyours" },
  { id: "22", name: "Chelsealand", slug: "Chelsealand" },
  { id: "23", name: "Cynthiaction", slug: "Cynthiaction" },
  { id: "24", name: "Daisyne", slug: "Daisyne" },
  { id: "25", name: "DEGREES", slug: "DEGREES" },
  { id: "26", name: "Denalize", slug: "Denalize" },
  { id: "27", name: "Gracieluv", slug: "Gracieluv" },
  { id: "28", name: "Michiban", slug: "Michiban" },
  { id: "29", name: "Wargavi48", slug: "Wargavi48" },
  { id: "30", name: "Nayrakuen", slug: "Nayrakuen" },
  { id: "31", name: "Aranika", slug: "Aranika" },
  { id: "32", name: "Hillaryours", slug: "Hillaryours" },
  { id: "33", name: "Delynessence", slug: "Delynessence" },
  { id: "34", name: "Olinara", slug: "Olinara" },
  { id: "35", name: "TACT", slug: "TACT" },
  { id: "36", name: "Nalania", slug: "Nalania" },
  { id: "37", name: "RIBCALLS", slug: "RIBCALLS" },
  { id: "38", name: "Lanautica", slug: "Lanautica" },
  { id: "39", "name": "YokiNachia", slug: "YokiNachia" },
  { id: "40", name: "Fritzy Force", slug: "Fritzy-Force" },
  { id: "41", name: "Le Viosa", slug: "Le-Viosa" },
  { id: "42", name: "Cavallery", slug: "Cavallery" },
  { id: "43", name: "GROVY", slug: "GROVY" },
  { id: "44", name: "Jevolante", slug: "Jevolante" },
  { id: "45", name: "Humainiora", slug: "Humainiora" },
  { id: "46", name: "Iris", slug: "Iris" },
  { id: "47", name: "Aprillivels", slug: "Aprillivels" },
  { id: "48", name: "AuLavana", slug: "AuLavana" },
  { id: "49", name: "BerbahaGIA.ID", slug: "BerbahaGIAID" },
  { id: "50", name: "CINEMIKA", slug: "CINEMIKA" },
  { id: "51", name: "EKINAIR", slug: "EKINAIR" },
  { id: "52", name: "ASTRALUX", slug: "ASTRALUX" },
  { id: "53", name: "Carissera", slug: "Carissera" },
  { id: "54", name: "Heippy", slug: "Heippy" },
  { id: "55", name: "HIRAKIRA", slug: "HIRAKIRA" },
  { id: "56", name: "JazLune", slug: "JazLune" },
  { id: "57", name: "Jogo Bonita", slug: "Jogo-Bonita" },
  { id: "58", name: "Maxineiu", slug: "Maxineiu" },
  { id: "59", name: "Ralvandra", slug: "Ralvandra" },
  { id: "60", name: "RaraLand", slug: "RaraLand" },
  { id: "61", name: "TerpeSona", slug: "TerpeSona" },
  { id: "62", name: "TheaFeria", slug: "TheaFeria" },
  { id: "63", name: "Cipuyyy", slug: "Cipuyyy" },
  { id: "64", name: "William Santoso", slug: "William-Santoso" },
  { id: "65", name: "Angga", slug: "Angga" },
  { id: "66", name: "RFDorable", slug: "RFDorable" },
  { id: "67", name: "Vend.", slug: "Vend" },
  { id: "68", name: "Lucky Arasyah", slug: "Lucky-Arasyah" },
  { id: "69", name: "Indyraaa", slug: "Indyraaa" },
  { id: "70", name: "Roni Eriyanto", slug: "Roni-Eriyanto" },
  { id: "71", name: "Rifqi Annafi", slug: "Rifqi-Annafi" },
  { id: "72", name: "ForLovelist", slug: "ForLovelist" },
  { id: "73", name: "Expose Right Noise", slug: "Expose-Right-Noise" },
  { id: "74", name: "Tumpul Vallencia", slug: "Tumpul-Vallencia" },
  { id: "75", name: "Point Of View", slug: "Point-Of-View" },
  { id: "76", name: "Nabil Rasyaaa", slug: "Nabil-Rasyaaa" },
  { id: "77", name: "Ashlii Palsu", slug: "Ashlii-Palsu" },
  { id: "78", name: "Isnia", slug: "Isnia" },
];

const DEFAULT_CARD_CONFIG = {
  bgImage: "/images/wayfinder-bg.png",
  eventDate: "2026-08-22T15:00:00+07:00",
  badgeText: "Seitansai Project 2026",
  eyebrow: "Catherina Vallencia",
  heroName: "Erine",
  heroTitle: "The Wayfinder",
  invitedLabel: "Mengundang",
  dateTitle: "Sabtu, 22 Agustus 2026",
  dateSub: "Pukul 15.00 — 20.30 WIB",
  locationTitle: "CGV FX Sudirman — Lantai F7",
  locationSub: "Jl. Jend. Sudirman, Pintu Satu Senayan, Jakarta Selatan",
  mapUrl: "https://maps.google.com/?q=CGV+FX+Sudirman",
  dressCodeTitle: "Dress Code: Birthday T-shirt Erine",
  dressCodeSub: "atau pakaian sopan & rapih",
  footerText: "Cavallery ©2026",
};

function InvitationsManager() {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [cardConfig, setCardConfig] = useState<any>(DEFAULT_CARD_CONFIG);
  const [activeTab, setActiveTab] = useState<"list" | "config">("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterCheckin, setFilterCheckin] = useState<"all" | "hadir" | "belum">("all");
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/invitations");
      if (res.ok) {
        const json = await res.json();
        if (json?.success) {
          if (Array.isArray(json?.data) && json.data.length > 0) {
            setInvitations(json.data);
            if (typeof window !== "undefined") {
              localStorage.setItem("cavallery_invitations", JSON.stringify(json.data));
            }
          }
          if (json?.config) {
            setCardConfig({ ...DEFAULT_CARD_CONFIG, ...json.config });
            if (typeof window !== "undefined") {
              localStorage.setItem("cavallery_wayfinder_config", JSON.stringify(json.config));
            }
          }
          setLoading(false);
          return;
        }
      }
    } catch {}

    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("cavallery_invitations") : null;
      if (saved) {
        setInvitations(JSON.parse(saved));
      } else {
        setInvitations(DEFAULT_INVITATIONS);
      }
      const savedCfg = typeof window !== "undefined" ? localStorage.getItem("cavallery_wayfinder_config") : null;
      if (savedCfg) {
        setCardConfig(JSON.parse(savedCfg));
      } else {
        setCardConfig(DEFAULT_CARD_CONFIG);
      }
    } catch {
      setInvitations(DEFAULT_INVITATIONS);
      setCardConfig(DEFAULT_CARD_CONFIG);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const cleanToSlug = (text: string) =>
    text
      .trim()
      .replace(/\s+/g, "-")
      .replace(/\./g, "")
      .replace(/[^a-zA-Z0-9\-]/g, "");

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isCustomSlug && !isEdit) {
      setSlug(cleanToSlug(val));
    }
  };

  const openAdd = () => {
    setIsEdit(false);
    setEditId("");
    setName("");
    setSlug("");
    setIsCustomSlug(false);
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setIsEdit(true);
    setEditId(item.id);
    setName(item.name);
    setSlug(item.slug);
    setIsCustomSlug(true);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showToast("Nama penerima undangan wajib diisi", "error");
      return;
    }
    let formattedSlug = cleanToSlug(slug || cleanName);
    if (!formattedSlug) formattedSlug = "undangan-" + Date.now();

    setSaving(true);
    try {
      const payload = isEdit
        ? { action: "update", id: editId, item: { name: cleanName, slug: formattedSlug } }
        : { action: "add", name: cleanName, slug: formattedSlug };

      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setInvitations(json.data);
          if (typeof window !== "undefined") {
            localStorage.setItem("cavallery_invitations", JSON.stringify(json.data));
          }
          showToast(isEdit ? "Undangan berhasil diperbarui" : "Undangan baru berhasil ditambahkan", "success");
          recordDashboardActivity(isEdit ? "Edit Undangan" : "Tambah Undangan", "UNDANGAN", `${cleanName} (/undangan/${formattedSlug})`);
          setShowModal(false);
          setSaving(false);
          return;
        }
      }

      // Local fallback
      const updated = isEdit
        ? invitations.map((item) => (item.id === editId ? { ...item, name: cleanName, slug: formattedSlug } : item))
        : [...invitations, { id: Date.now().toString(), name: cleanName, slug: formattedSlug }];
      setInvitations(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("cavallery_invitations", JSON.stringify(updated));
      }
      showToast(isEdit ? "Undangan berhasil diperbarui" : "Undangan baru berhasil ditambahkan", "success");
      recordDashboardActivity(isEdit ? "Edit Undangan" : "Tambah Undangan", "UNDANGAN", `${cleanName} (/undangan/${formattedSlug})`);
      setShowModal(false);
    } catch {
      showToast("Gagal menyimpan undangan", "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: confirmDelete.id }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setInvitations(json.data);
          if (typeof window !== "undefined") {
            localStorage.setItem("cavallery_invitations", JSON.stringify(json.data));
          }
          showToast("Undangan berhasil dihapus", "success");
          recordDashboardActivity("Hapus Undangan", "UNDANGAN", `Menghapus undangan: ${confirmDelete.name}`);
          setConfirmDelete(null);
          return;
        }
      }
    } catch {}

    const updated = invitations.filter((item) => item.id !== confirmDelete.id && item.slug !== confirmDelete.slug);
    setInvitations(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("cavallery_invitations", JSON.stringify(updated));
    }
    showToast("Undangan berhasil dihapus", "success");
    recordDashboardActivity("Hapus Undangan", "UNDANGAN", `Menghapus undangan: ${confirmDelete.name}`);
    setConfirmDelete(null);
  };

  const handleCopyLink = (item: any) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://cavallery.id";
    const url = `${origin}/undangan/${item.slug}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(item.id || item.slug);
        showToast(`Link untuk ${item.name} berhasil disalin!`, "success");
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  const handleSaveCardConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateConfig", config: cardConfig }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.config) {
          setCardConfig(json.config);
          if (typeof window !== "undefined") {
            localStorage.setItem("cavallery_wayfinder_config", JSON.stringify(json.config));
          }
          showToast("Teks & Background kartu undangan berhasil disimpan!", "success");
          recordDashboardActivity("Edit Desain Undangan", "UNDANGAN", "Menyimpan konfigurasi desain teks & background");
          setSaving(false);
          return;
        }
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("cavallery_wayfinder_config", JSON.stringify(cardConfig));
      }
      showToast("Teks & Background kartu undangan berhasil disimpan!", "success");
      recordDashboardActivity("Edit Desain Undangan", "UNDANGAN", "Menyimpan konfigurasi desain teks & background");
    } catch {
      showToast("Gagal menyimpan konfigurasi kartu", "error");
    }
    setSaving(false);
  };

  const handleConfigChange = (key: string, val: string) => {
    setCardConfig((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleToggleCheckin = async (item: any) => {
    const isCheckedIn = Boolean(item.checked_in);
    const action = isCheckedIn ? "resetCheckin" : "checkin";
    setTogglingSlug(item.slug);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, slug: item.slug }),
      });
      const json = await res.json();
      if (json.success) {
        if (json.data && Array.isArray(json.data)) {
          setInvitations(json.data);
          if (typeof window !== "undefined") {
            localStorage.setItem("cavallery_invitations", JSON.stringify(json.data));
          }
        } else {
          setInvitations((prev) =>
            prev.map((it) =>
              it.slug === item.slug
                ? { ...it, checked_in: !isCheckedIn, checked_in_at: !isCheckedIn ? new Date().toISOString() : undefined }
                : it
            )
          );
        }
        showToast(
          !isCheckedIn
            ? `✓ ${item.name} berhasil ditandai HADIR!`
            : `Kehadiran ${item.name} direset ke Belum Hadir`,
          "success"
        );
        recordDashboardActivity(
          !isCheckedIn ? "Manual Check-in" : "Reset Check-in",
          "UNDANGAN",
          `${item.name} (/undangan/${item.slug})`
        );
      } else {
        showToast(json.message || "Gagal mengubah status kehadiran", "error");
      }
    } catch {
      showToast("Error jaringan saat mengubah kehadiran", "error");
    } finally {
      setTogglingSlug(null);
    }
  };

  const hadirCount = invitations.filter((i) => Boolean(i.checked_in)).length;
  const belumHadirCount = Math.max(0, invitations.length - hadirCount);

  const filtered = invitations.filter((item) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSearch =
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.slug && item.slug.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }
    if (filterCheckin === "hadir") return Boolean(item.checked_in);
    if (filterCheckin === "belum") return !Boolean(item.checked_in);
    return true;
  });

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDelete && (
        <ConfirmModal
          msg={`Hapus undangan untuk "${confirmDelete.name}"? Halaman /undangan/${confirmDelete.slug} tidak akan dapat diakses lagi.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.formModal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className={styles.formModalHeader}>
              <h3>{isEdit ? "Edit Undangan" : "Tambah Undangan Baru"}</h3>
              <button className={styles.closeX} onClick={() => setShowModal(false)}>
                <i className="bx bx-x" />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.formBody}>
                <div className={styles.field}>
                  <label>
                    Nama Penerima / Fanbase <span style={{ color: "#e05252" }}>*</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="Contoh: Nabil Rasyaaa / Kath. Inc"
                    autoFocus
                  />
                </div>

                <div className={styles.field}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label>
                      Slug URL <span style={{ color: "#e05252" }}>*</span>
                    </label>
                    {!isEdit && (
                      <button
                        type="button"
                        onClick={() => setIsCustomSlug(!isCustomSlug)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--cv-orange)",
                          fontSize: 12,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        {isCustomSlug ? "Auto slug dari nama" : "Kustomisasi slug"}
                      </button>
                    )}
                  </div>
                  <input
                    value={slug}
                    onChange={(e) => {
                      setIsCustomSlug(true);
                      setSlug(e.target.value);
                    }}
                    required
                    placeholder="Contoh: Nabil-Rasyaaa"
                  />
                  <div style={{ fontSize: 12, color: "var(--cv-text-mute)", marginTop: 4 }}>
                    URL: <span style={{ color: "var(--cv-orange)" }}>/undangan/{slug || "slug-url"}</span>
                  </div>
                </div>
              </div>

              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowModal(false)}>
                  Batal
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-save" /> Simpan
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header Section with Subtabs */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-envelope" style={{ color: "var(--cv-orange)" }} /> Undangan Fanbase
          <span className={styles.count}>{invitations.length} Undangan</span>
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href="/undangan/links"
            target="_blank"
            rel="noreferrer"
            className={styles.btnGhost}
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <i className="bx bx-link-external" /> Link Generator
          </a>
          <a
            href="/undangan/scan"
            target="_blank"
            rel="noreferrer"
            className={styles.btnGhost}
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, color: "#10b981" }}
          >
            <i className="bx bx-qr-scan" /> Scan Check-in
          </a>
          {activeTab === "list" && (
            <button className={styles.btnPrimary} onClick={openAdd}>
              <i className="bx bx-plus" /> Tambah Undangan
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--adm-border)", paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab("list")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: activeTab === "list" ? "color-mix(in srgb, var(--cv-orange) 14%, transparent)" : "transparent",
            color: activeTab === "list" ? "var(--cv-orange)" : "var(--adm-muted)",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <i className="bx bx-list-ul" /> Daftar Penerima ({invitations.length})
        </button>
        <button
          onClick={() => setActiveTab("config")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: activeTab === "config" ? "color-mix(in srgb, var(--cv-orange) 14%, transparent)" : "transparent",
            color: activeTab === "config" ? "var(--cv-orange)" : "var(--adm-muted)",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <i className="bx bx-slider-alt" /> Desain Teks & Background Card
        </button>
      </div>

      {/* TAB 1: DAFTAR PENERIMA */}
      {activeTab === "list" && (
        <>
          {/* Search & Filter Bar */}
          <div style={{ marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 280, maxWidth: 420 }}>
              <div style={{ position: "relative", width: "100%" }}>
                <i
                  className="bx bx-search"
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--cv-text-mute)",
                    fontSize: "1.1rem",
                  }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama fanbase atau slug..."
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 36px",
                    background: "var(--adm-surface)",
                    color: "var(--adm-text)",
                    border: "1px solid var(--adm-border)",
                    borderRadius: 8,
                    fontSize: "0.88rem",
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--cv-text-mute)",
                      cursor: "pointer",
                    }}
                  >
                    <i className="bx bx-x" />
                  </button>
                )}
              </div>
            </div>

            {/* Attendance Filter Pills */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setFilterCheckin("all")}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: filterCheckin === "all" ? "1px solid var(--cv-orange)" : "1px solid var(--adm-border)",
                  background: filterCheckin === "all" ? "color-mix(in srgb, var(--cv-orange) 18%, transparent)" : "var(--adm-surface)",
                  color: filterCheckin === "all" ? "var(--cv-orange)" : "var(--adm-text)",
                  transition: "all 0.15s ease",
                }}
              >
                Semua ({invitations.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterCheckin("hadir")}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: filterCheckin === "hadir" ? "1px solid #10b981" : "1px solid var(--adm-border)",
                  background: filterCheckin === "hadir" ? "rgba(16,185,129,0.18)" : "var(--adm-surface)",
                  color: filterCheckin === "hadir" ? "#10b981" : "var(--adm-text)",
                  transition: "all 0.15s ease",
                }}
              >
                <i className="bx bxs-check-circle" style={{ marginRight: 4 }} /> Hadir ({hadirCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterCheckin("belum")}
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: filterCheckin === "belum" ? "1px solid var(--cv-orange)" : "1px solid var(--adm-border)",
                  background: filterCheckin === "belum" ? "color-mix(in srgb, var(--cv-orange) 18%, transparent)" : "var(--adm-surface)",
                  color: filterCheckin === "belum" ? "var(--cv-orange)" : "var(--adm-text)",
                  transition: "all 0.15s ease",
                }}
              >
                Belum Hadir ({belumHadirCount})
              </button>
            </div>
          </div>

          {/* Content Table */}
          {loading ? (
            <div className={styles.loadingState}>
              <i className="bx bx-loader-alt bx-spin" /> Memuat daftar undangan...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}>
              <i className="bx bx-inbox" style={{ fontSize: "3rem" }} />
              <p>{search ? "Tidak ada undangan yang cocok dengan pencarian" : "Belum ada undangan"}</p>
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 45, textAlign: "center" }}>#</th>
                    <th>Penerima / Fanbase</th>
                    <th>Slug Link</th>
                    <th style={{ width: 100, textAlign: "center" }}>Check-in</th>
                    <th style={{ width: 260, textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => (
                    <tr key={item.id || item.slug || idx}>
                      <td style={{ textAlign: "center", color: "var(--cv-text-mute)", fontVariantNumeric: "tabular-nums" }}>
                        {idx + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--cv-text)" }}>
                        {item.name}
                      </td>
                      <td>
                        <code
                          style={{
                            fontSize: 12,
                            color: "var(--cv-orange)",
                            background: "color-mix(in srgb, var(--cv-orange) 9%, transparent)",
                            padding: "3px 8px",
                            borderRadius: 4,
                          }}
                        >
                          /undangan/{item.slug}
                        </code>
                      </td>
                      {/* Check-in status (Manual Clickable Badge) */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleCheckin(item)}
                          disabled={togglingSlug === item.slug}
                          title={item.checked_in ? "Klik untuk ubah kembali ke Belum Hadir" : "Klik untuk tandai Hadir manual"}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 11px",
                            borderRadius: 16,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: togglingSlug === item.slug ? "wait" : "pointer",
                            transition: "all 0.2s ease",
                            border: item.checked_in
                              ? "1px solid rgba(16,185,129,0.5)"
                              : "1px dashed var(--cv-line-strong)",
                            background: item.checked_in
                              ? "rgba(16,185,129,0.16)"
                              : "color-mix(in srgb, var(--cv-bone) 4%, transparent)",
                            color: item.checked_in ? "#10b981" : "var(--cv-text-mute)",
                          }}
                        >
                          {togglingSlug === item.slug ? (
                            <>
                              <i className="bx bx-loader-alt bx-spin" /> Proses...
                            </>
                          ) : item.checked_in ? (
                            <>
                              <i className="bx bxs-check-circle" /> Hadir
                            </>
                          ) : (
                            <>
                              <i className="bx bx-plus" /> Tandai Hadir
                            </>
                          )}
                        </button>
                        {item.checked_in && item.checked_in_at && (
                          <div style={{ fontSize: 10, color: "var(--cv-text-mute)", marginTop: 4 }}>
                            {new Date(item.checked_in_at).toLocaleString("id-ID", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
                          {/* Manual Attendance Toggle Button */}
                          <button
                            className={styles.btnGhost}
                            disabled={togglingSlug === item.slug}
                            style={{
                              padding: "5px 9px",
                              color: item.checked_in ? "var(--cv-orange)" : "#10b981",
                              fontSize: 13,
                              borderColor: item.checked_in ? "color-mix(in srgb, var(--cv-orange) 30%, transparent)" : "rgba(16,185,129,0.3)",
                              background: item.checked_in ? "color-mix(in srgb, var(--cv-orange) 8%, transparent)" : "rgba(16,185,129,0.08)",
                            }}
                            onClick={() => handleToggleCheckin(item)}
                            title={item.checked_in ? "Reset Kehadiran (Ubah ke Belum Hadir)" : "Tandai Hadir Manual"}
                          >
                            <i className={`bx ${item.checked_in ? "bx-user-x" : "bx-user-check"}`} />
                          </button>

                          {/* Copy Link Button */}
                          <button
                            className={styles.btnGhost}
                            style={{
                              padding: "5px 9px",
                              color: copiedId === (item.id || item.slug) ? "#10b981" : "var(--adm-text)",
                              fontSize: 13,
                            }}
                            onClick={() => handleCopyLink(item)}
                            title="Salin Link Undangan"
                          >
                            <i className={`bx ${copiedId === (item.id || item.slug) ? "bx-check" : "bx-copy"}`} />
                          </button>

                          {/* Open Link Button */}
                          <a
                            href={`/undangan/${item.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.btnGhost}
                            style={{ padding: "5px 9px", color: "var(--cv-orange)", textDecoration: "none", fontSize: 13 }}
                            title="Buka Halaman Undangan"
                          >
                            <i className="bx bx-link-external" />
                          </a>

                          {/* Edit Button */}
                          <button
                            className={styles.btnGhost}
                            style={{ padding: "5px 9px", fontSize: 13 }}
                            onClick={() => openEdit(item)}
                            title="Edit Undangan"
                          >
                            <i className="bx bx-edit" />
                          </button>

                          {/* Delete Button */}
                          <button
                            className={styles.btnGhost}
                            style={{ padding: "5px 9px", color: "#ef4444", fontSize: 13 }}
                            onClick={() => setConfirmDelete(item)}
                            title="Hapus Undangan"
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
        </>
      )}

      {/* TAB 2: EDIT TEKS & BACKGROUND CARD */}
      {activeTab === "config" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 640px) 1fr", gap: 24, alignItems: "start" }}>
          {/* Form Settings */}
          <div className={styles.formModal} style={{ position: "relative", maxWidth: "100%", padding: "20px 24px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "1.05rem", color: "var(--cv-orange)", display: "flex", alignItems: "center", gap: 8 }}>
              <i className="bx bx-palette" /> Edit Teks & Background Kartu
            </h3>
            <form onSubmit={handleSaveCardConfig}>
              <div className={styles.formBody}>
                {/* Background Image */}
                <div className={styles.field}>
                  <label style={{ fontWeight: 600 }}>URL Gambar Background Card</label>
                  <input
                    type="text"
                    value={cardConfig.bgImage || ""}
                    onChange={(e) => handleConfigChange("bgImage", e.target.value)}
                    placeholder="/images/wayfinder-bg.png atau https://..."
                  />
                  <small style={{ color: "var(--cv-text-mute)" }}>
                    Bisa berupa path lokal e.g. <code>/images/wayfinder-bg.png</code> atau link URL gambar online.
                  </small>
                </div>

                {/* Hero Texts */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className={styles.field}>
                    <label>Badge Atas</label>
                    <input
                      value={cardConfig.badgeText || ""}
                      onChange={(e) => handleConfigChange("badgeText", e.target.value)}
                      placeholder="Seitansai Project 2026"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Nama Member (Eyebrow)</label>
                    <input
                      value={cardConfig.eyebrow || ""}
                      onChange={(e) => handleConfigChange("eyebrow", e.target.value)}
                      placeholder="Catherina Vallencia"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className={styles.field}>
                    <label>Nama Utama (Hero Title)</label>
                    <input
                      value={cardConfig.heroName || ""}
                      onChange={(e) => handleConfigChange("heroName", e.target.value)}
                      placeholder="Erine"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Judul Sub (Theme)</label>
                    <input
                      value={cardConfig.heroTitle || ""}
                      onChange={(e) => handleConfigChange("heroTitle", e.target.value)}
                      placeholder="The Wayfinder"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Label Mengundang</label>
                  <input
                    value={cardConfig.invitedLabel || ""}
                    onChange={(e) => handleConfigChange("invitedLabel", e.target.value)}
                    placeholder="Mengundang"
                  />
                </div>

                {/* Event Details */}
                <div style={{ borderTop: "1px solid var(--adm-border)", paddingTop: 16, marginTop: 4 }}>
                  <div style={{ fontWeight: 600, color: "var(--cv-orange)", marginBottom: 12, fontSize: "0.9rem" }}>
                    <i className="bx bx-calendar" /> Detail Jadwal & Lokasi Acara
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className={styles.field}>
                      <label>Hari & Tanggal</label>
                      <input
                        value={cardConfig.dateTitle || ""}
                        onChange={(e) => handleConfigChange("dateTitle", e.target.value)}
                        placeholder="Sabtu, 22 Agustus 2026"
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Waktu Acara (WIB)</label>
                      <input
                        value={cardConfig.dateSub || ""}
                        onChange={(e) => handleConfigChange("dateSub", e.target.value)}
                        placeholder="Pukul 15.00 — 20.30 WIB"
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Countdown Target (ISO / Date string)</label>
                    <input
                      value={cardConfig.eventDate || ""}
                      onChange={(e) => handleConfigChange("eventDate", e.target.value)}
                      placeholder="2026-08-22T15:00:00+07:00"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Nama Lokasi / Tempat</label>
                    <input
                      value={cardConfig.locationTitle || ""}
                      onChange={(e) => handleConfigChange("locationTitle", e.target.value)}
                      placeholder="CGV FX Sudirman — Lantai F7"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Alamat Lengkap Lokasi</label>
                    <input
                      value={cardConfig.locationSub || ""}
                      onChange={(e) => handleConfigChange("locationSub", e.target.value)}
                      placeholder="Jl. Jend. Sudirman, Pintu Satu Senayan, Jakarta Selatan"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>URL Link Google Maps</label>
                    <input
                      type="url"
                      value={cardConfig.mapUrl || ""}
                      onChange={(e) => handleConfigChange("mapUrl", e.target.value)}
                      placeholder="https://maps.google.com/?q=CGV+FX+Sudirman"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className={styles.field}>
                      <label>Dress Code Judul</label>
                      <input
                        value={cardConfig.dressCodeTitle || ""}
                        onChange={(e) => handleConfigChange("dressCodeTitle", e.target.value)}
                        placeholder="Dress Code: Birthday T-shirt Erine"
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Dress Code Keterangan</label>
                      <input
                        value={cardConfig.dressCodeSub || ""}
                        onChange={(e) => handleConfigChange("dressCodeSub", e.target.value)}
                        placeholder="atau pakaian sopan & rapih"
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Footer Brand Copyright</label>
                    <input
                      value={cardConfig.footerText || ""}
                      onChange={(e) => handleConfigChange("footerText", e.target.value)}
                      placeholder="Cavallery ©2026"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formFooter} style={{ justifyContent: "space-between", marginTop: 20 }}>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setCardConfig(DEFAULT_CARD_CONFIG)}
                >
                  <i className="bx bx-reset" /> Reset Default
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" /> Menyimpan...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-save" /> Simpan Kustomisasi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Box */}
          <div
            style={{
              background: "var(--cv-ink-1)",
              border: "1px solid var(--adm-border)",
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              position: "sticky",
              top: 20,
            }}
          >
            <div style={{ fontSize: "0.85rem", color: "var(--cv-orange)", fontWeight: 600, marginBottom: 14, alignSelf: "flex-start" }}>
              <i className="bx bx-show" /> Live Preview Card
            </div>

            <div
              className="cv-dark"
              style={{
                width: "100%",
                maxWidth: 320,
                borderRadius: 14,
                border: "2px solid color-mix(in srgb, var(--cv-orange) 40%, transparent)",
                padding: "24px 18px",
                position: "relative",
                overflow: "hidden",
                background: "var(--cv-ink)",
                backgroundImage: `linear-gradient(rgba(10,15,12,0.82), rgba(10,15,12,0.98)), url(${cardConfig.bgImage || DEFAULT_CARD_CONFIG.bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                textAlign: "center",
                color: "var(--cv-text-dim)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              {/* Badge */}
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 12,
                  border: "1px solid color-mix(in srgb, var(--cv-orange) 35%, transparent)",
                  background: "rgba(0,0,0,0.6)",
                  color: "var(--cv-orange-hi)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                }}
              >
                {(cardConfig.badgeText || "SEITANSAI PROJECT 2026").toUpperCase()}
              </div>

              {/* Eyebrow */}
              <div style={{ fontSize: 11, color: "var(--cv-text-dim)", fontWeight: 600, letterSpacing: "0.06em" }}>
                {(cardConfig.eyebrow || "CATHERINA VALLENCIA").toUpperCase()}
              </div>

              {/* Hero Title */}
              <div
                style={{
                  fontSize: 32,
                  fontFamily: "Playfair Display, Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: 700,
                  color: "var(--cv-text)",
                  margin: "4px 0 0 0",
                }}
              >
                {cardConfig.heroName || "Erine"}
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: 11,
                  color: "var(--cv-orange-hi)",
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  marginBottom: 12,
                }}
              >
                {(cardConfig.heroTitle || "THE WAYFINDER").toUpperCase()}
              </div>

              {/* Mengundang Box */}
              <div
                style={{
                  background: "color-mix(in srgb, var(--cv-orange) 9%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--cv-orange) 35%, transparent)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 9, color: "var(--cv-text-dim)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {cardConfig.invitedLabel || "MENGUNDANG"}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontFamily: "Playfair Display, Georgia, serif",
                    fontStyle: "italic",
                    fontWeight: 700,
                    color: "var(--cv-orange-hi)",
                    marginTop: 2,
                  }}
                >
                  Nama Fanbase
                </div>
              </div>

              {/* Detail Box */}
              <div
                style={{
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  fontSize: 11,
                  textAlign: "left",
                  marginBottom: 14,
                }}
              >
                <div style={{ color: "var(--cv-orange-hi)", fontWeight: 700, fontSize: 11 }}>
                  {cardConfig.dateTitle || "Sabtu, 22 Agustus 2026"}
                </div>
                <div style={{ color: "var(--cv-text-dim)", fontSize: 10, marginBottom: 8 }}>
                  {cardConfig.dateSub || "Pukul 15.00 — 20.30 WIB"}
                </div>

                <div style={{ color: "var(--cv-orange-hi)", fontWeight: 700, fontSize: 11 }}>
                  {cardConfig.locationTitle || "CGV FX Sudirman — Lantai F7"}
                </div>
                <div style={{ color: "var(--cv-text-dim)", fontSize: 10, marginBottom: 8 }}>
                  {cardConfig.locationSub || "Jl. Jend. Sudirman, Jakarta Selatan"}
                </div>

                <div style={{ color: "var(--cv-orange-hi)", fontWeight: 700, fontSize: 10 }}>
                  {cardConfig.dressCodeTitle || "Dress Code: Birthday T-shirt Erine"}
                </div>
              </div>

              <div style={{ fontSize: 10, color: "var(--cv-text-mute)", fontWeight: 600 }}>
                {cardConfig.footerText || "CAVALLERY ©2026"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RECRUITMENT MANAGER ──────────────────────────────────────
function RecruitmentManager() {
  return <RecruitmentAdminManager />;
}

// ─── ESPORT MANAGER ───────────────────────────────────────────
interface EsportDivision {
  id: string;
  name: string;
  cover_url: string;
  is_active: number;
  sort_order: number;
  roster_count: number;
}

interface EsportRoster {
  id: number;
  division_id: string;
  player_name: string;
  game_id: string | null;
  role: string | null;
  avatar_url: string | null;
  is_captain: number;
  sort_order: number;
}

interface EsportMatch {
  id: number;
  division_id: string;
  division_name?: string;
  tournament_name: string;
  opponent_name: string;
  opponent_logo: string | null;
  match_date: string;
  status: "upcoming" | "live" | "completed";
  score_cavallery: number;
  score_opponent: number;
  result: "win" | "lose" | "draw" | "pending";
  stream_url: string | null;
  notes: string | null;
}

function EsportManager() {
  const [activeTab, setActiveTab] = useState<"roster" | "matches">("roster");

  const [divisions, setDivisions] = useState<EsportDivision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiv, setSelectedDiv] = useState<string>("ml");
  const [roster, setRoster] = useState<EsportRoster[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Match states
  const [matches, setMatches] = useState<EsportMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchFilterDiv, setMatchFilterDiv] = useState<string>("all");

  // Modals Division & Roster
  const [editDivModal, setEditDivModal] = useState<EsportDivision | null>(null);
  const [divName, setDivName] = useState("");
  const [divCover, setDivCover] = useState("");
  const [savingDiv, setSavingDiv] = useState(false);

  const [playerModal, setPlayerModal] = useState<EsportRoster | "new" | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [gameId, setGameId] = useState("");
  const [playerRole, setPlayerRole] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isCaptain, setIsCaptain] = useState(false);
  const [savingPlayer, setSavingPlayer] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<EsportRoster | null>(null);

  // Modals Matches
  const [matchModal, setMatchModal] = useState<EsportMatch | "new" | null>(null);
  const [mDivId, setMDivId] = useState("ml");
  const [mTourName, setMTourName] = useState("");
  const [mOpponent, setMOpponent] = useState("");
  const [mDate, setMDate] = useState("");
  const [mStatus, setMStatus] = useState<"upcoming" | "live" | "completed">("upcoming");
  const [mStreamUrl, setMStreamUrl] = useState("");
  const [mNotes, setMNotes] = useState("");
  const [savingMatch, setSavingMatch] = useState(false);

  // Score Input Modal
  const [scoreModal, setScoreModal] = useState<EsportMatch | null>(null);
  const [sScoreCav, setSScoreCav] = useState(0);
  const [sScoreOpp, setSScoreOpp] = useState(0);
  const [sResult, setSResult] = useState<"win" | "lose" | "draw">("win");
  const [savingScore, setSavingScore] = useState(false);

  const [confirmDeleteMatch, setConfirmDeleteMatch] = useState<EsportMatch | null>(null);
  const [showMediaUpload, setShowMediaUpload] = useState<"cover" | "avatar" | null>(null);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const loadDivisions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/esport?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setDivisions(json.data);
        }
      }
    } catch {
      showToast("Gagal memuat divisi esport", "error");
    }
    setLoading(false);
  }, []);

  const loadRoster = useCallback(async (divId: string) => {
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/esport/${divId}/roster?t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setRoster(json.data);
        }
      }
    } catch {
      showToast("Gagal memuat roster", "error");
    }
    setRosterLoading(false);
  }, []);

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    try {
      const url = matchFilterDiv !== "all" ? `/api/esport/matches?division_id=${matchFilterDiv}` : "/api/esport/matches";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMatches(json.data);
        }
      }
    } catch {
      showToast("Gagal memuat jadwal pertandingan", "error");
    }
    setMatchesLoading(false);
  }, [matchFilterDiv]);

  useEffect(() => {
    loadDivisions();
  }, [loadDivisions]);

  useEffect(() => {
    if (selectedDiv) {
      loadRoster(selectedDiv);
    }
  }, [selectedDiv, loadRoster]);

  useEffect(() => {
    if (activeTab === "matches") {
      loadMatches();
    }
  }, [activeTab, loadMatches]);

  const toggleActive = async (div: EsportDivision) => {
    const nextStatus = div.is_active ? 0 : 1;
    try {
      const res = await fetch("/api/esport", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: div.id, is_active: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setDivisions(prev =>
          prev.map(d => (d.id === div.id ? { ...d, is_active: nextStatus } : d))
        );
        showToast(
          nextStatus ? `${div.name} diaktifkan!` : `${div.name} dinonaktifkan (hiatus)`,
          "success"
        );
      } else {
        showToast(json.message || "Gagal mengubah status", "error");
      }
    } catch {
      showToast("Error koneksi jaringan", "error");
    }
  };

  const openEditDiv = (div: EsportDivision) => {
    setEditDivModal(div);
    setDivName(div.name);
    setDivCover(div.cover_url);
  };

  const saveDivision = async () => {
    if (!editDivModal) return;
    setSavingDiv(true);
    try {
      const res = await fetch("/api/esport", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editDivModal.id, name: divName, cover_url: divCover }),
      });
      const json = await res.json();
      if (json.success) {
        setDivisions(prev =>
          prev.map(d => (d.id === editDivModal.id ? { ...d, name: divName, cover_url: divCover } : d))
        );
        setEditDivModal(null);
        showToast("Divisi berhasil diperbarui", "success");
      } else {
        showToast(json.message || "Gagal menyimpan divisi", "error");
      }
    } catch {
      showToast("Error koneksi jaringan", "error");
    }
    setSavingDiv(false);
  };

  const openAddPlayer = () => {
    setPlayerModal("new");
    setPlayerName("");
    setGameId("");
    setPlayerRole("");
    setAvatarUrl("");
    setIsCaptain(false);
  };

  const openEditPlayer = (p: EsportRoster) => {
    setPlayerModal(p);
    setPlayerName(p.player_name);
    setGameId(p.game_id || "");
    setPlayerRole(p.role || "");
    setAvatarUrl(p.avatar_url || "");
    setIsCaptain(Boolean(p.is_captain));
  };

  const savePlayer = async () => {
    if (!playerName.trim()) {
      showToast("Nama player wajib diisi", "error");
      return;
    }
    setSavingPlayer(true);
    try {
      const isNew = playerModal === "new";
      const method = isNew ? "POST" : "PATCH";
      const payload: any = {
        player_name: playerName.trim(),
        game_id: gameId.trim() || null,
        role: playerRole.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        is_captain: isCaptain ? 1 : 0,
      };
      if (!isNew && typeof playerModal === "object" && playerModal !== null) {
        payload.id = playerModal.id;
      }

      const res = await fetch(`/api/esport/${selectedDiv}/roster`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setPlayerModal(null);
        loadRoster(selectedDiv);
        loadDivisions();
        showToast(isNew ? "Player berhasil ditambahkan!" : "Player berhasil diperbarui!", "success");
      } else {
        showToast(json.message || "Gagal menyimpan player", "error");
      }
    } catch {
      showToast("Error koneksi jaringan", "error");
    }
    setSavingPlayer(false);
  };

  const deletePlayer = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/esport/${selectedDiv}/roster?rid=${confirmDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setConfirmDelete(null);
        loadRoster(selectedDiv);
        loadDivisions();
        showToast("Player berhasil dihapus", "success");
      } else {
        showToast(json.message || "Gagal menghapus player", "error");
      }
    } catch {
      showToast("Error koneksi jaringan", "error");
    }
  };

  // Match actions
  const openAddMatch = () => {
    setMatchModal("new");
    setMDivId(selectedDiv || "ml");
    setMTourName("");
    setMOpponent("");
    // format now + 1 hour as datetime-local string
    const now = new Date();
    now.setHours(now.getHours() + 1);
    setMDate(now.toISOString().slice(0, 16));
    setMStatus("upcoming");
    setMStreamUrl("");
    setMNotes("");
  };

  const openEditMatch = (m: EsportMatch) => {
    setMatchModal(m);
    setMDivId(m.division_id);
    setMTourName(m.tournament_name);
    setMOpponent(m.opponent_name);
    setMDate(m.match_date ? new Date(m.match_date).toISOString().slice(0, 16) : "");
    setMStatus(m.status);
    setMStreamUrl(m.stream_url || "");
    setMNotes(m.notes || "");
  };

  const saveMatch = async () => {
    if (!mTourName.trim() || !mOpponent.trim() || !mDate) {
      showToast("Nama Turnamen, Lawan, dan Tanggal wajib diisi", "error");
      return;
    }
    setSavingMatch(true);
    try {
      const isNew = matchModal === "new";
      const method = isNew ? "POST" : "PATCH";
      const payload: any = {
        division_id: mDivId,
        tournament_name: mTourName.trim(),
        opponent_name: mOpponent.trim(),
        match_date: mDate,
        status: mStatus,
        stream_url: mStreamUrl.trim() || null,
        notes: mNotes.trim() || null,
      };
      if (!isNew && typeof matchModal === "object" && matchModal !== null) {
        payload.id = matchModal.id;
      }

      const res = await fetch("/api/esport/matches", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setMatchModal(null);
        loadMatches();
        showToast(isNew ? "Jadwal pertandingan berhasil ditambah!" : "Jadwal pertandingan diperbarui!", "success");
      } else {
        showToast(json.message || "Gagal menyimpan jadwal", "error");
      }
    } catch {
      showToast("Error koneksi jaringan", "error");
    }
    setSavingMatch(false);
  };

  const openScoreModal = (m: EsportMatch) => {
    setScoreModal(m);
    setSScoreCav(m.score_cavallery || 0);
    setSScoreOpp(m.score_opponent || 0);
    setSResult(m.result === "win" || m.result === "lose" || m.result === "draw" ? m.result : "win");
  };

  const saveScore = async () => {
    if (!scoreModal) return;
    setSavingScore(true);
    try {
      const res = await fetch("/api/esport/matches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scoreModal.id,
          score_cavallery: Number(sScoreCav) || 0,
          score_opponent: Number(sScoreOpp) || 0,
          result: sResult,
          status: "completed",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setScoreModal(null);
        loadMatches();
        showToast("Hasil pertandingan berhasil disimpan!", "success");
      } else {
        showToast(json.message || "Gagal menyimpan hasil", "error");
      }
    } catch {
      showToast("Error koneksi jaringan", "error");
    }
    setSavingScore(false);
  };

  const deleteMatch = async () => {
    if (!confirmDeleteMatch) return;
    try {
      const res = await fetch(`/api/esport/matches?id=${confirmDeleteMatch.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setConfirmDeleteMatch(null);
        loadMatches();
        showToast("Pertandingan berhasil dihapus", "success");
      } else {
        showToast(json.message || "Gagal menghapus pertandingan", "error");
      }
    } catch {
      showToast("Error koneksi jaringan", "error");
    }
  };

  const curDiv = divisions.find(d => d.id === selectedDiv);

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className={styles.sectionHeader} style={{ marginBottom: 16 }}>
        <div>
          <h2 className={styles.sectionTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="bx bx-trophy" style={{ color: "var(--gold)" }} />
            Cavallery Esport Manager
          </h2>
          <p className={styles.sectionSub}>
            Kelola divisi game, roaster pemain, serta jadwal & hasil pertandingan e-sports Cavallery.
          </p>
        </div>
      </div>

      {/* Tab Navigation (Roster vs Matches) */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24, borderBottom: "1px solid var(--adm-border)", paddingBottom: 12 }}>
        <button
          type="button"
          onClick={() => setActiveTab("roster")}
          style={{
            padding: "8px 18px",
            borderRadius: 10,
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: "pointer",
            border: activeTab === "roster" ? "1px solid var(--gold)" : "1px solid var(--adm-border)",
            background: activeTab === "roster" ? "color-mix(in srgb, var(--cv-orange) 15%, transparent)" : "var(--adm-surface)",
            color: activeTab === "roster" ? "var(--gold)" : "var(--adm-text)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i className="bx bx-group" /> Divisi & Roster Player
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("matches")}
          style={{
            padding: "8px 18px",
            borderRadius: 10,
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: "pointer",
            border: activeTab === "matches" ? "1px solid var(--gold)" : "1px solid var(--adm-border)",
            background: activeTab === "matches" ? "color-mix(in srgb, var(--cv-orange) 15%, transparent)" : "var(--adm-surface)",
            color: activeTab === "matches" ? "var(--gold)" : "var(--adm-text)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i className="bx bx-calendar-event" /> Jadwal & Hasil Pertandingan
        </button>
      </div>

      {activeTab === "roster" ? (
        <>
          {/* 6 Game Divisions Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 28 }}>
            {divisions.map(div => {
              const isSelected = div.id === selectedDiv;
              const isActive = Boolean(div.is_active);

              return (
                <div
                  key={div.id}
                  style={{
                    background: "var(--adm-surface)",
                    border: isSelected ? "2px solid var(--gold)" : "1px solid var(--adm-border)",
                    borderRadius: 14,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: isSelected ? "0 0 20px color-mix(in srgb, var(--cv-orange) 20%, transparent)" : "none",
                    transition: "all 0.2s ease",
                  }}
                >
                  {/* Cover preview */}
                  <div style={{ position: "relative", height: 130, background: "var(--cv-ink-1)", overflow: "hidden" }}>
                    <img
                      src={div.cover_url}
                      alt={div.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        filter: isActive ? "none" : "grayscale(0.8)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.85) 100%)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: "rgba(0,0,0,0.7)",
                        backdropFilter: "blur(4px)",
                        color: "#fff",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.25)",
                      }}
                    >
                      {div.roster_count || 0} Roster
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 10,
                        left: 12,
                        color: "#fff",
                        fontSize: "1.1rem",
                        fontWeight: 800,
                        textShadow: "0 2px 6px rgba(0,0,0,0.8)",
                      }}
                    >
                      {div.name}
                    </div>
                  </div>

                  {/* Controls */}
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                    {/* Active Switch */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--adm-muted)" }}>Status Divisi:</span>
                      <button
                        type="button"
                        onClick={() => toggleActive(div)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "4px 12px",
                          borderRadius: 20,
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          border: "none",
                          cursor: "pointer",
                          background: isActive ? "color-mix(in srgb, #10b981 14%, transparent)" : "rgba(239,68,68,0.15)",
                          color: isActive ? "#34d399" : "#f87171",
                        }}
                      >
                        <i className={`bx ${isActive ? "bx-check-circle" : "bx-pause-circle"}`} />
                        {isActive ? "AKTIF" : "NONAKTIF"}
                      </button>
                    </div>

                    {/* Buttons */}
                    <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                      <button
                        type="button"
                        className={isSelected ? styles.btnPrimary : styles.btnGhost}
                        style={{ flex: 1, padding: "7px 10px", fontSize: "0.82rem", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                        onClick={() => setSelectedDiv(div.id)}
                      >
                        <i className="bx bx-group" />
                        {isSelected ? "Sedang Dipilih" : "Kelola Roster"}
                      </button>
                      <button
                        type="button"
                        className={styles.btnGhost}
                        style={{ padding: "7px 10px", fontSize: "0.82rem" }}
                        onClick={() => openEditDiv(div)}
                        title="Edit nama & cover"
                      >
                        <i className="bx bx-image" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Roster Management for Selected Game */}
          <div style={{ background: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8, color: "var(--adm-text)" }}>
                  <i className="bx bx-group" style={{ color: "var(--gold)" }} />
                  Daftar Roster: <span style={{ color: "var(--gold)" }}>{curDiv?.name || selectedDiv}</span>
                  <span className={styles.count}>{roster.length}</span>
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--adm-muted)" }}>
                  Tambahkan anggota roaster untuk divisi {curDiv?.name}.
                </p>
              </div>
              <button className={styles.btnPrimary} onClick={openAddPlayer} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bx bx-user-plus" /> Tambah Player
              </button>
            </div>

            {rosterLoading ? (
              <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data roster...</div>
            ) : roster.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--adm-muted)" }}>
                <i className="bx bx-user-x" style={{ fontSize: "3rem", opacity: 0.3, display: "block", marginBottom: 8 }} />
                Belum ada player terdaftar untuk divisi {curDiv?.name}. Klik <strong>"Tambah Player"</strong> untuk memasukkan anggota baru.
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={`${styles.table} ${styles.responsiveTable}`}>
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Avatar</th>
                      <th>Nama Player</th>
                      <th>In-Game ID</th>
                      <th>Role / Posisi</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map(p => (
                      <tr key={p.id}>
                        <td data-label="Avatar">
                          {p.avatar_url ? (
                            <img src={p.avatar_url} alt="" className={styles.thumb} style={{ borderRadius: "50%" }} />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "color-mix(in srgb, var(--cv-orange) 15%, transparent)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                              <i className="bx bx-user" />
                            </div>
                          )}
                        </td>
                        <td data-label="Nama Player" style={{ fontWeight: 700, color: "var(--adm-text)" }}>
                          {p.player_name}
                        </td>
                        <td data-label="In-Game ID" style={{ fontFamily: "monospace", color: "var(--adm-muted)" }}>
                          {p.game_id || "-"}
                        </td>
                        <td data-label="Role">
                          <span style={{ padding: "3px 8px", background: "color-mix(in srgb, var(--cv-bone) 5%, transparent)", borderRadius: 6, fontSize: "0.8rem" }}>
                            {p.role || "Player"}
                          </span>
                        </td>
                        <td data-label="Status">
                          {Boolean(p.is_captain) ? (
                            <span style={{ background: "color-mix(in srgb, var(--cv-orange) 20%, transparent)", color: "var(--cv-orange-hi)", border: "1px solid color-mix(in srgb, var(--cv-orange) 40%, transparent)", padding: "2px 8px", borderRadius: 10, fontSize: "0.75rem", fontWeight: 700 }}>
                              👑 CAPTAIN
                            </span>
                          ) : (
                            <span style={{ color: "var(--adm-muted)", fontSize: "0.78rem" }}>Member</span>
                          )}
                        </td>
                        <td data-label="Aksi">
                          <div className={styles.actionBtns}>
                            <button className={styles.btnEdit} onClick={() => openEditPlayer(p)} title="Edit player">
                              <i className="bx bx-edit" />
                            </button>
                            <button className={styles.btnDel} onClick={() => setConfirmDelete(p)} title="Hapus player">
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
        </>
      ) : (
        /* MATCH SCHEDULES & RESULTS TAB */
        <div style={{ background: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: 14, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: 8, color: "var(--adm-text)" }}>
                <i className="bx bx-calendar-event" style={{ color: "var(--gold)" }} />
                Jadwal & Hasil Pertandingan
                <span className={styles.count}>{matches.length}</span>
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--adm-muted)" }}>
                Kelola jadwal turnamen/scrim mendatang dan input skor hasil pertandingan Cavallery Esport.
              </p>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Game filter */}
              <select
                value={matchFilterDiv}
                onChange={e => setMatchFilterDiv(e.target.value)}
                style={{
                  background: "var(--adm-bg)",
                  color: "var(--adm-text)",
                  border: "1px solid var(--adm-border)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: "0.85rem",
                }}
              >
                <option value="all">Semua Divisi Game</option>
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <button className={styles.btnPrimary} onClick={openAddMatch} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bx bx-plus-circle" /> Tambah Jadwal Pertandingan
              </button>
            </div>
          </div>

          {matchesLoading ? (
            <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data pertandingan...</div>
          ) : matches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--adm-muted)" }}>
              <i className="bx bx-calendar-x" style={{ fontSize: "3rem", opacity: 0.3, display: "block", marginBottom: 8 }} />
              Belum ada jadwal pertandingan terdaftar. Klik <strong>"Tambah Jadwal Pertandingan"</strong> untuk menambahkan.
            </div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.responsiveTable}`}>
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Turnamen / Event</th>
                    <th>Lawan / Opponent</th>
                    <th>Waktu Pertandingan</th>
                    <th>Status</th>
                    <th>Skor / Hasil</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(m => {
                    const isWin = m.result === "win";
                    const isLose = m.result === "lose";
                    const isDraw = m.result === "draw";

                    return (
                      <tr key={m.id}>
                        <td data-label="Game">
                          <span style={{ fontWeight: 700, color: "var(--gold)", fontSize: "0.85rem" }}>
                            {m.division_name || m.division_id.toUpperCase()}
                          </span>
                        </td>
                        <td data-label="Turnamen">
                          <div style={{ fontWeight: 700, color: "var(--adm-text)" }}>{m.tournament_name}</div>
                          {m.notes && <small style={{ color: "var(--adm-muted)", fontSize: "0.75rem" }}>{m.notes}</small>}
                        </td>
                        <td data-label="Lawan" style={{ fontWeight: 600 }}>
                          vs {m.opponent_name}
                        </td>
                        <td data-label="Waktu" style={{ fontSize: "0.82rem", color: "var(--adm-muted)" }}>
                          {new Date(m.match_date).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </td>
                        <td data-label="Status">
                          {m.status === "live" ? (
                            <span style={{ background: "#dc2626", color: "#fff", padding: "2px 8px", borderRadius: 10, fontSize: "0.72rem", fontWeight: 800, animation: "pulse 1.5s infinite" }}>
                              🔴 LIVE STREAM
                            </span>
                          ) : m.status === "completed" ? (
                            <span style={{ background: "color-mix(in srgb, var(--cv-bone) 8%, transparent)", color: "var(--adm-muted)", padding: "2px 8px", borderRadius: 10, fontSize: "0.72rem", fontWeight: 700 }}>
                              SELESAI
                            </span>
                          ) : (
                            <span style={{ background: "color-mix(in srgb, var(--cv-orange) 20%, transparent)", color: "var(--cv-orange-hi)", padding: "2px 8px", borderRadius: 10, fontSize: "0.72rem", fontWeight: 700 }}>
                              UPCOMING
                            </span>
                          )}
                        </td>
                        <td data-label="Skor / Hasil">
                          {m.status === "completed" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontWeight: 900, fontSize: "0.95rem", color: "var(--adm-text)" }}>
                                {m.score_cavallery} - {m.score_opponent}
                              </span>
                              <span
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  background: isWin ? "color-mix(in srgb, #10b981 14%, transparent)" : isLose ? "rgba(239,68,68,0.2)" : "color-mix(in srgb, var(--cv-bone) 10%, transparent)",
                                  color: isWin ? "#34d399" : isLose ? "#f87171" : "var(--cv-text)",
                                }}
                              >
                                {isWin ? "WIN" : isLose ? "LOSE" : "DRAW"}
                              </span>
                            </div>
                          ) : (
                            <span style={{ opacity: 0.5, fontSize: "0.8rem" }}>Belum Diinput</span>
                          )}
                        </td>
                        <td data-label="Aksi">
                          <div className={styles.actionBtns}>
                            <button
                              className={styles.btnGhost}
                              style={{ padding: "4px 8px", fontSize: 12, color: "var(--gold)", borderColor: "color-mix(in srgb, var(--cv-orange) 40%, transparent)" }}
                              onClick={() => openScoreModal(m)}
                              title="Input skor & hasil"
                            >
                              <i className="bx bx-check-square" /> Skor
                            </button>
                            <button className={styles.btnEdit} onClick={() => openEditMatch(m)} title="Edit jadwal">
                              <i className="bx bx-edit" />
                            </button>
                            <button className={styles.btnDel} onClick={() => setConfirmDeleteMatch(m)} title="Hapus">
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
      )}

      {/* MODAL: EDIT DIVISION (Cover & Name) */}
      {editDivModal && (
        <div className={styles.modalOverlay} onClick={() => setEditDivModal(null)}>
          <div className={styles.formModal} style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3><i className="bx bx-edit" /> Edit Divisi: {editDivModal.name}</h3>
              <button className={styles.closeX} onClick={() => setEditDivModal(null)}><i className="bx bx-x" /></button>
            </div>
            <div className={styles.formBody}>
              <div className={styles.field}>
                <label>Nama Divisi Game</label>
                <input
                  type="text"
                  value={divName}
                  onChange={e => setDivName(e.target.value)}
                  placeholder="Contoh: Mobile Legends"
                />
              </div>

              <div className={styles.field}>
                <label style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>URL Gambar Cover</span>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                    onClick={() => setShowMediaUpload("cover")}
                  >
                    <i className="bx bx-cloud-upload" /> Upload Gambar
                  </button>
                </label>
                <input
                  type="text"
                  value={divCover}
                  onChange={e => setDivCover(e.target.value)}
                  placeholder="https://... atau /uploads/..."
                />
              </div>

              {divCover && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--adm-muted)", display: "block", marginBottom: 4 }}>Preview Cover:</label>
                  <div style={{ width: "100%", height: 140, borderRadius: 8, overflow: "hidden", background: "var(--cv-ink)", border: "1px solid var(--adm-border)" }}>
                    <img src={divCover} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formFooter}>
              <button className={styles.btnGhost} onClick={() => setEditDivModal(null)}>Batal</button>
              <button className={styles.btnPrimary} onClick={saveDivision} disabled={savingDiv}>
                {savingDiv ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Perubahan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MATCH SCHEDULE */}
      {matchModal && (
        <div className={styles.modalOverlay} onClick={() => setMatchModal(null)}>
          <div className={styles.formModal} style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3>
                <i className="bx bx-calendar-event" />
                {matchModal === "new" ? "Tambah Jadwal Pertandingan" : "Edit Jadwal Pertandingan"}
              </h3>
              <button className={styles.closeX} onClick={() => setMatchModal(null)}><i className="bx bx-x" /></button>
            </div>
            <div className={styles.formBody}>
              <div className={styles.field}>
                <label>Divisi Game <span style={{ color: "#ef4444" }}>*</span></label>
                <select
                  value={mDivId}
                  onChange={e => setMDivId(e.target.value)}
                  style={{ background: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 8, padding: "10px 12px", width: "100%", fontSize: "0.9rem" }}
                >
                  {divisions.map(d => (
                    <option key={d.id} value={d.id} style={{ background: "var(--adm-bg)", color: "var(--adm-text)" }}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>Nama Turnamen / Event <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  value={mTourName}
                  onChange={e => setMTourName(e.target.value)}
                  placeholder="Contoh: Fanbase Cup JKT48 S2"
                  required
                />
              </div>

              <div className={styles.field}>
                <label>Nama Tim Lawan / Opponent <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  value={mOpponent}
                  onChange={e => setMOpponent(e.target.value)}
                  placeholder="Contoh: Valeria Esport / Team Kinal Fanbase"
                  required
                />
              </div>

              <div className={styles.field}>
                <label>Tanggal & Waktu Pertandingan <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="datetime-local"
                  value={mDate}
                  onChange={e => setMDate(e.target.value)}
                  required
                />
              </div>

              <div className={styles.field}>
                <label>Status Pertandingan</label>
                <select
                  value={mStatus}
                  onChange={e => setMStatus(e.target.value as any)}
                  style={{ background: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)", borderRadius: 8, padding: "10px 12px", width: "100%", fontSize: "0.9rem" }}
                >
                  <option value="upcoming" style={{ background: "var(--adm-bg)", color: "var(--adm-text)" }}>Akan Datang (Upcoming)</option>
                  <option value="live" style={{ background: "var(--adm-bg)", color: "var(--adm-text)" }}>Sedang Berlangsung (Live)</option>
                  <option value="completed" style={{ background: "var(--adm-bg)", color: "var(--adm-text)" }}>Selesai (Completed)</option>
                </select>
              </div>

              <div className={styles.field}>
                <label>Link Live Stream (YouTube / Discord - Opsional)</label>
                <input
                  type="text"
                  value={mStreamUrl}
                  onChange={e => setMStreamUrl(e.target.value)}
                  placeholder="https://youtube.com/live/..."
                />
              </div>

              <div className={styles.field}>
                <label>Catatan / Babak (Opsional)</label>
                <input
                  type="text"
                  value={mNotes}
                  onChange={e => setMNotes(e.target.value)}
                  placeholder="Contoh: Babak Semifinal - Best of 3"
                />
              </div>
            </div>

            <div className={styles.formFooter}>
              <button className={styles.btnGhost} onClick={() => setMatchModal(null)}>Batal</button>
              <button className={styles.btnPrimary} onClick={saveMatch} disabled={savingMatch}>
                {savingMatch ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Jadwal</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INPUT SKOR & HASIL */}
      {scoreModal && (
        <div className={styles.modalOverlay} onClick={() => setScoreModal(null)}>
          <div className={styles.formModal} style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3><i className="bx bx-check-square" /> Input Skor & Hasil Pertandingan</h3>
              <button className={styles.closeX} onClick={() => setScoreModal(null)}><i className="bx bx-x" /></button>
            </div>
            <div className={styles.formBody}>
              <p style={{ margin: "0 0 14px", fontSize: "0.88rem", color: "var(--adm-muted)" }}>
                {scoreModal.tournament_name} — <strong>Cavallery vs {scoreModal.opponent_name}</strong>
              </p>

              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div className={styles.field} style={{ flex: 1 }}>
                  <label>Skor Cavallery</label>
                  <input
                    type="number"
                    min="0"
                    value={sScoreCav}
                    onChange={e => setSScoreCav(Number(e.target.value))}
                    style={{ fontSize: "1.2rem", fontWeight: 800, textAlign: "center" }}
                  />
                </div>

                <div className={styles.field} style={{ flex: 1 }}>
                  <label>Skor {scoreModal.opponent_name}</label>
                  <input
                    type="number"
                    min="0"
                    value={sScoreOpp}
                    onChange={e => setSScoreOpp(Number(e.target.value))}
                    style={{ fontSize: "1.2rem", fontWeight: 800, textAlign: "center" }}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label>Hasil Akhir Cavallery</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { id: "win", label: "MENANG (WIN)", bg: "color-mix(in srgb, #10b981 14%, transparent)", color: "#34d399" },
                    { id: "lose", label: "KALAH (LOSE)", bg: "rgba(239,68,68,0.2)", color: "#f87171" },
                    { id: "draw", label: "SERI (DRAW)", bg: "color-mix(in srgb, var(--cv-bone) 10%, transparent)", color: "var(--cv-text)" },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSResult(opt.id as any)}
                      style={{
                        flex: 1,
                        padding: "10px 6px",
                        borderRadius: 8,
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        border: sResult === opt.id ? `2px solid ${opt.color}` : "1px solid var(--adm-border)",
                        background: opt.bg,
                        color: opt.color,
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.formFooter}>
              <button className={styles.btnGhost} onClick={() => setScoreModal(null)}>Batal</button>
              <button className={styles.btnPrimary} onClick={saveScore} disabled={savingScore}>
                {savingScore ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Hasil</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PLAYER */}
      {playerModal && (
        <div className={styles.modalOverlay} onClick={() => setPlayerModal(null)}>
          <div className={styles.formModal} style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3>
                <i className="bx bx-user" />
                {playerModal === "new" ? `Tambah Player — ${curDiv?.name}` : `Edit Player: ${playerName}`}
              </h3>
              <button className={styles.closeX} onClick={() => setPlayerModal(null)}><i className="bx bx-x" /></button>
            </div>
            <div className={styles.formBody}>
              <div className={styles.field}>
                <label>Nama Lengkap / Nama Panggilan <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Contoh: Farhan / Erine Fan"
                  required
                />
              </div>

              <div className={styles.field}>
                <label>In-Game ID / Nickname Game</label>
                <input
                  type="text"
                  value={gameId}
                  onChange={e => setGameId(e.target.value)}
                  placeholder="Contoh: CAV·Vallen (12345678)"
                />
              </div>

              <div className={styles.field}>
                <label>Role / Posisi</label>
                <input
                  type="text"
                  value={playerRole}
                  onChange={e => setPlayerRole(e.target.value)}
                  placeholder="Contoh: Jungler, Midlaner, Rusher, IGL, Striker"
                />
              </div>

              <div className={styles.field}>
                <label style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>URL Foto Avatar (Opsional)</span>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    style={{ padding: "2px 8px", fontSize: "0.75rem" }}
                    onClick={() => setShowMediaUpload("avatar")}
                  >
                    <i className="bx bx-cloud-upload" /> Upload Foto
                  </button>
                </label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://... atau /uploads/..."
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, padding: "8px 12px", background: "color-mix(in srgb, var(--cv-bone) 3%, transparent)", borderRadius: 8, border: "1px solid var(--adm-border)" }}>
                <input
                  type="checkbox"
                  id="isCaptainCheck"
                  checked={isCaptain}
                  onChange={e => setIsCaptain(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "var(--gold)" }}
                />
                <label htmlFor="isCaptainCheck" style={{ cursor: "pointer", fontSize: "0.88rem", color: "var(--adm-text)", fontWeight: 600 }}>
                  Jadikan Kapten Tim (Captain)
                </label>
              </div>
            </div>

            <div className={styles.formFooter}>
              <button className={styles.btnGhost} onClick={() => setPlayerModal(null)}>Batal</button>
              <button className={styles.btnPrimary} onClick={savePlayer} disabled={savingPlayer}>
                {savingPlayer ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE PLAYER MODAL */}
      {confirmDelete && (
        <ConfirmModal
          msg={`Yakin ingin menghapus player "${confirmDelete.player_name}" dari divisi ${curDiv?.name}?`}
          onConfirm={deletePlayer}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* MEDIA UPLOAD MODAL HELPER */}
      {showMediaUpload && (
        <MediaUploadModal
          onClose={() => setShowMediaUpload(null)}
          onUploaded={(url) => {
            if (showMediaUpload === "cover") setDivCover(url);
            if (showMediaUpload === "avatar") setAvatarUrl(url);
            setShowMediaUpload(null);
          }}
        />
      )}
    </div>
  );
}

// ─── DASHBOARD HOME ───────────────────────────────────────────
function DashboardHome({ onNav }: { onNav: (s: Section) => void }) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    ([
      { key: "recruitment", path: "/api/recruitment/submissions" },
      { key: "esport",      path: "/api/esport"      },
      { key: "news",        path: "/api/news?type=cavallery" },
      { key: "timeline",    path: "/api/timeline"    },
      { key: "gallery",     path: "/api/gallery"     },
      { key: "setlists",    path: "/api/setlists"    },
      { key: "youtube",     path: "/api/youtube"     },
      { key: "merch",       path: "/api/merch"       },
      { key: "funfacts",    path: "/api/funfacts"    },
      { key: "kabesha",     path: "/api/kabesha"     },
      { key: "stats",       path: "/api/stats"       },
      { key: "media",       path: mediaApi("/media") },
      { key: "journal",     path: "/api/journal"     },
      { key: "bot",         path: "/api/bot-config"  },
      { key: "botmedia",    path: "/api/bot-media"   },
      { key: "tickets",     path: "/api/tickets"     },
      { key: "calendar",    path: "/api/calendar"    },
      { key: "updates",     path: "/api/updates"     },
      { key: "anggotakota", path: "/api/anggota-kota" },
      { key: "abouterine",  path: "/api/about-erine"  },
      { key: "invitations", path: "/api/invitations" },
      { key: "vcschedule",  path: "/api/vcschedule"  },
      { key: "adminstruktur", path: "/api/structure" },
    ] as { key: string; path: string }[]).forEach(async ({ key, path }) => {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          let count = 0;
          const data = json?.data !== undefined ? json.data : (Array.isArray(json) ? json : json?.items);
          if (Array.isArray(data)) count = data.length;
          else if (data?.total !== undefined) count = data.total;
          else if (typeof data === "object" && data !== null) count = Object.keys(data).length;
          setCounts(prev => ({ ...prev, [key]: count }));
        }
      } catch {}
    });
  }, []);

  const sectionsGrouped = [
    {
      groupTitle: "Keuangan & Keanggotaan Utama",
      groupIcon: "bx-wallet",
      groupColor: "#10b981",
      cards: [
        { key: "keanggotaan" as any, icon: "bx-user-check", label: "Keanggotaan", color: "#3b82f6", desc: "Verifikasi & Direktori" },
        { key: "adminkas" as any, icon: "bx-wallet", label: "Kas Anggota", color: "#10b981", desc: "Matriks & Pengeluaran" },
        { key: "admindonasi" as any, icon: "bx-donate-heart", label: "Donasi Proyek", color: "#06b6d4", desc: "Verifikasi Donasi" },
        { key: "adminkontributor" as any, icon: "bx-heart-circle", label: "Kontributor", color: "#ec4899", desc: "Data Donatur Publik" },
        { key: "adminmasterdata" as any, icon: "bx-slider-alt", label: "Master Data", color: "#f59e0b", desc: "Banner Home & Opsi" },
        { key: "adminstruktur" as any, icon: "bx-sitemap", label: "Struktur Organisasi", color: "#8b5cf6", desc: "Bagan Castle Structure" },
        { key: "adminwartiket" as any, icon: "bx-flame", label: "War Tiket STS", color: "#f97316", desc: "Live Antrean War" },
        { key: "adminspreadsheet" as any, icon: "bx-table", label: "Live Spreadsheet", color: "#14b8a6", desc: "Google Sheets Backup" },
        { key: "adminexcel" as any, icon: "bxs-file-export", label: "Download Excel", color: "#059669", desc: "Export Matriks Kas" },
      ],
    },
    {
      groupTitle: "Rekrutmen & Interaksi Komunitas",
      groupIcon: "bx-conversation",
      groupColor: "#6366f1",
      cards: [
        { key: "recruitment", icon: "bx-group", label: "Recruitment", color: "#6366f1", desc: "Pendaftar Masuk" },
        { key: "invitations", icon: "bx-envelope", label: "Undangan", color: "#8b5cf6", desc: "RSVP Acara" },
        { key: "journal", icon: "bx-book-open", label: "MemoRine", color: "#f59e0b", desc: "Pesan & Doa Fans" },
        { key: "fanart", icon: "bx-palette", label: "Fanart Erine", color: "#ec4899", desc: "Karya Seni Fans" },
        { key: "twoshot", icon: "bx-camera", label: "2S with Erine", color: "#a855f7", desc: "Mading Foto 2-Shot" },
        { key: "dengerine", icon: "bx-headphone", label: "Dengerine", color: "#f43f5e", desc: "Playlist Lagu Fans" },
        { key: "esport", icon: "bx-trophy", label: "Esport", color: "#3b82f6", desc: "Turnamen & Game" },
        { key: "tickets", icon: "bx-receipt", label: "Tickets", color: "#0284c7", desc: "Kritik & Saran Fans" },
        { key: "anggotakota", icon: "bx-map", label: "Anggota Kota", color: "#10b981", desc: "Sebaran Domisili" },
        { key: "bot", icon: "bx-bot", label: "Bot LINE", color: "#22c55e", desc: "Webhook & Trigger" },
        { key: "botmedia", icon: "bx-video-recording", label: "Media Bot LINE", color: "#eab308", desc: "Respon Video & Foto" },
      ],
    },
    {
      groupTitle: "Publikasi Konten & Media",
      groupIcon: "bx-layer",
      groupColor: "#0284c7",
      cards: [
        { key: "news", icon: "bx-news", label: "News", color: "#0284c7", desc: "Cavallery Statement" },
        { key: "timeline", icon: "bx-map-pin", label: "Milestone", color: "#f59e0b", desc: "Linimasa Perjalanan" },
        { key: "gallery", icon: "bx-image-alt", label: "Gallery", color: "#8b5cf6", desc: "Galeri Dokumentasi" },
        { key: "media", icon: "bx-folder-open", label: "Media Vault", color: "#2563eb", desc: "Penyimpanan File" },
        { key: "youtube", icon: "bxl-youtube", label: "YouTube", color: "#ef4444", desc: "Video Komunitas" },
        { key: "updates", icon: "bx-refresh", label: "Updates", color: "#10b981", desc: "Log Perubahan" },
      ],
    },
    {
      groupTitle: "Erine & Show Tracker",
      groupIcon: "bx-star",
      groupColor: "#ec4899",
      cards: [
        { key: "abouterine", icon: "bx-image", label: "About Erine", color: "#ec4899", desc: "Biodata & Profil" },
        { key: "setlists", icon: "bx-music", label: "Setlists", color: "#6366f1", desc: "Show Theater JKT48" },
        { key: "kabesha", icon: "bx-star", label: "Kabesha", color: "#eab308", desc: "Foto Resmi Member" },
        { key: "vcschedule", icon: "bx-video", label: "Video Call", color: "#06b6d4", desc: "Jadwal Video Call" },
        { key: "calendar", icon: "bx-calendar", label: "Calendar", color: "#14b8a6", desc: "Agenda Bulanan" },
        { key: "stats", icon: "bx-bar-chart", label: "Stats", color: "#3b82f6", desc: "Statistik Pertunjukan" },
        { key: "funfacts", icon: "bx-laugh", label: "Funfacts", color: "#f59e0b", desc: "Fakta Menarik" },
        { key: "merch", icon: "bx-store", label: "Merchandise", color: "#8b5cf6", desc: "Katalog Merchandise" },
      ],
    },
  ];

  return (
    <div className={styles.dashHome}>
      {/* WELCOME BANNER DENGAN QUICK ACTION */}
      <div
        className={styles.welcomeBanner}
        style={{
          background: "var(--cv-ink-2)",
          border: "1px solid var(--cv-line)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "1.5rem 1.75rem",
          borderRadius: 16,
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 12, background: "rgba(59, 130, 246, 0.12)", color: "#60a5fa", fontSize: "0.74rem", fontWeight: 800, marginBottom: 8 }}>
            <i className="bx bxs-shield-alt-2" /> CAVALLERY ADMIN PANEL
          </div>
          <h2 style={{ margin: "0 0 4px", fontSize: "1.4rem", color: "var(--cv-text)", fontWeight: 800 }}>
            Selamat datang di Dashboard Admin!
          </h2>
          <p style={{ margin: 0, color: "var(--fg-dim)", fontSize: "0.86rem" }}>
            Pusat kendali seluruh fitur, data anggota, keuangan kas, dan konten website resmi Cavallery.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              background: "color-mix(in srgb, var(--cv-bone) 6%, transparent)",
              color: "var(--cv-text)",
              border: "1px solid var(--cv-line-strong)",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            <i className="bx bx-globe" /> Buka Website
          </a>
          <a
            href="https://docs.google.com/spreadsheets/d/1t9PlUNLN2rdskLq-ZpellJI0umclokLm7G-DI-VnFXg/edit"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            <i className="bx bx-table" /> Live Spreadsheet
          </a>
        </div>
      </div>

      {/* RENDER GROUPED DASHBOARD CARDS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {sectionsGrouped.map((group, gIdx) => (
          <div key={gIdx}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: "1px solid var(--cv-line)",
              }}
            >
              <i className={`bx ${group.groupIcon}`} style={{ color: group.groupColor, fontSize: "1.2rem" }} />
              <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--cv-text)", fontWeight: 700 }}>
                {group.groupTitle}
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
                gap: "0.85rem",
              }}
            >
              {group.cards.map((card) => (
                <button
                  key={card.key}
                  className={styles.dashCard}
                  onClick={() => onNav(card.key)}
                  style={{
                    "--accent": card.color,
                    padding: "1rem 0.65rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    position: "relative",
                  } as any}
                >
                  <i className={`bx ${card.icon}`} style={{ color: card.color, fontSize: "1.7rem" }} />
                  <div className={styles.dashCardCount} style={{ fontSize: "1.3rem" }}>
                    {counts[card.key] ?? "—"}
                  </div>
                  <div className={styles.dashCardLabel} style={{ fontWeight: 700, color: "var(--cv-text)" }}>
                    {card.label}
                  </div>
                  {card.desc && (
                    <div style={{ fontSize: "0.68rem", color: "var(--fg-dim)", marginTop: -2 }}>
                      {card.desc}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FANART MANAGER ──────────────────────────────────────────
function FanartManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [previewModal, setPreviewModal] = useState<any | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for manual add
  const [artTitle, setArtTitle] = useState("");
  const [artArtist, setArtArtist] = useState("");
  const [artSocial, setArtSocial] = useState("");
  const [artDesc, setArtDesc] = useState("");
  const [artImage, setArtImage] = useState("");
  const [artHighres, setArtHighres] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "all");
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/fanart?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch {
      showToast("Gagal memuat data fanart", "error");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateStatus = async (id: number | string, status: "approved" | "rejected" | "pending") => {
    try {
      const res = await fetch("/api/fanart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          status === "approved"
            ? "Karya fanart BERHASIL DISETUJUI & terbit di web!"
            : status === "rejected"
            ? "Karya ditolak."
            : "Status diubah ke pending.",
          "success"
        );
        loadData();
      } else {
        showToast(json.message || "Gagal mengubah status", "error");
      }
    } catch {
      showToast("Terjadi kendala jaringan", "error");
    }
  };

  const deleteItem = async (id: number | string) => {
    setConfirm(null);
    try {
      const res = await fetch(`/api/fanart?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Karya fanart berhasil dihapus", "success");
        loadData();
      } else {
        showToast(json.message || "Gagal menghapus", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/fanart/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.status) {
        setArtImage(json.data.image_url);
        showToast("Gambar berhasil diunggah", "success");
      } else {
        showToast(json.message || "Gagal mengunggah gambar", "error");
      }
    } catch {
      showToast("Error saat mengunggah", "error");
    } finally {
      setUploadingImg(false);
    }
  };

  const handleCreateFanart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artTitle.trim() || !artArtist.trim() || !artImage.trim()) {
      showToast("Judul, nama seniman, dan gambar wajib diisi", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/fanart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: artTitle.trim(),
          artist_name: artArtist.trim(),
          artist_social: artSocial.trim() || null,
          description: artDesc.trim() || null,
          image_url: artImage.trim(),
          highres_url: artHighres.trim() || null,
          status: "approved", // direct from admin = approved
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast("Fanart berhasil ditambahkan & langsung aktif di web!", "success");
        setAddModal(false);
        setArtTitle("");
        setArtArtist("");
        setArtSocial("");
        setArtDesc("");
        setArtImage("");
        setArtHighres("");
        loadData();
      } else {
        showToast(json.message || "Gagal menambahkan fanart", "error");
      }
    } catch {
      showToast("Error jaringan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const approvedCount = items.filter((i) => i.status === "approved").length;
  const rejectedCount = items.filter((i) => i.status === "rejected").length;

  const filteredItems = items.filter((item) => {
    if (tab === "all") return true;
    return item.status === tab;
  });

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && (
        <ConfirmModal
          msg={confirm.msg}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Header */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-palette" /> Fanart Erine
          <span className={styles.count}>{items.length} karya</span>
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={styles.btnGhost} onClick={loadData}>
            <i className="bx bx-refresh" /> Refresh
          </button>
          <button className={styles.btnPrimary} onClick={() => setAddModal(true)}>
            <i className="bx bx-plus" /> Tambah Fanart
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div
          onClick={() => setTab("pending")}
          style={{
            background: tab === "pending" ? "color-mix(in srgb, var(--cv-orange) 25%, transparent)" : "var(--adm-surface)",
            border: "1px solid " + (tab === "pending" ? "var(--cv-orange)" : "var(--adm-border)"),
            borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <i className="bx bx-time" style={{ fontSize: "1.8rem", color: "var(--cv-orange)" }} />
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--cv-orange)" }}>{pendingCount}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--adm-muted)" }}>Menunggu Review</div>
          </div>
        </div>

        <div
          onClick={() => setTab("approved")}
          style={{
            background: tab === "approved" ? "rgba(16, 185, 129, 0.25)" : "var(--adm-surface)",
            border: "1px solid " + (tab === "approved" ? "#10b981" : "var(--adm-border)"),
            borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <i className="bx bx-check-circle" style={{ fontSize: "1.8rem", color: "#10b981" }} />
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#10b981" }}>{approvedCount}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--adm-muted)" }}>Disetujui / Tayang</div>
          </div>
        </div>

        <div
          onClick={() => setTab("rejected")}
          style={{
            background: tab === "rejected" ? "rgba(239, 68, 68, 0.25)" : "var(--adm-surface)",
            border: "1px solid " + (tab === "rejected" ? "#ef4444" : "var(--adm-border)"),
            borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <i className="bx bx-x-circle" style={{ fontSize: "1.8rem", color: "#ef4444" }} />
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#ef4444" }}>{rejectedCount}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--adm-muted)" }}>Ditolak</div>
          </div>
        </div>

        <div
          onClick={() => setTab("all")}
          style={{
            background: tab === "all" ? "color-mix(in srgb, var(--cv-orange) 25%, transparent)" : "var(--adm-surface)",
            border: "1px solid " + (tab === "all" ? "var(--gold)" : "var(--adm-border)"),
            borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <i className="bx bx-palette" style={{ fontSize: "1.8rem", color: "var(--gold)" }} />
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--gold)" }}>{items.length}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--adm-muted)" }}>Total Semua</div>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Cari judul karya atau nama seniman..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 220,
            background: "var(--adm-surface)", color: "var(--adm-text)",
            border: "1px solid var(--adm-border)", borderRadius: 8, padding: "8px 12px",
          }}
        />
        <div style={{ display: "flex", gap: 6 }}>
          {(["all", "pending", "approved", "rejected"] as const).map((t) => (
            <button
              key={t}
              className={tab === t ? styles.btnPrimary : styles.btnGhost}
              style={{ padding: "6px 12px", fontSize: "0.82rem" }}
              onClick={() => setTab(t)}
            >
              {t === "all" ? "Semua" : t === "pending" ? "Pending" : t === "approved" ? "Disetujui" : "Ditolak"}
            </button>
          ))}
        </div>
      </div>

      {/* Content Table / Cards */}
      {loading ? (
        <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data fanart...</div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", opacity: 0.5 }}>
          <i className="bx bx-palette" style={{ fontSize: "3rem" }} />
          <p>Tidak ada karya fanart untuk filter ini.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>Karya</th>
                <th>Judul & Seniman</th>
                <th>Deskripsi</th>
                <th style={{ width: 90 }}>Suka</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 120 }}>Tanggal</th>
                <th style={{ width: 170 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div
                      style={{
                        width: 60, height: 60, borderRadius: 8, overflow: "hidden",
                        background: "var(--cv-ink)", cursor: "pointer", border: "1px solid var(--adm-border)",
                      }}
                      onClick={() => setPreviewModal(item)}
                    >
                      <img
                        src={item.image_url && !item.image_url.endsWith("/") ? item.image_url : "/images/erine1.jpg"}
                        alt={item.title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = "true";
                            target.src = "/images/erine1.jpg";
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--adm-text)" }}>{item.title}</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--gold)" }}>
                      <i className="bx bx-user" /> {item.artist_name}
                      {item.artist_social && (
                        <a
                          href={item.artist_social.startsWith("http") ? item.artist_social : `https://x.com/${item.artist_social.replace(/^@/, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ marginLeft: 6, color: "var(--adm-muted)" }}
                        >
                          <i className="bx bx-link-external" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "var(--adm-muted)", maxWidth: 220 }}>
                    {item.description || "—"}
                  </td>
                  <td style={{ fontWeight: 700, color: "#ef4444" }}>
                    <i className="bx bxs-heart" /> {item.likes || 0}
                  </td>
                  <td>
                    {item.status === "approved" ? (
                      <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: "0.75rem", background: "rgba(16,185,129,0.2)", color: "#10b981", fontWeight: 700 }}>
                        <i className="bx bx-check" /> Tayang
                      </span>
                    ) : item.status === "pending" ? (
                      <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: "0.75rem", background: "color-mix(in srgb, var(--cv-orange) 20%, transparent)", color: "var(--cv-orange)", fontWeight: 700 }}>
                        <i className="bx bx-time" /> Pending
                      </span>
                    ) : (
                      <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: "0.75rem", background: "rgba(239,68,68,0.2)", color: "#ef4444", fontWeight: 700 }}>
                        <i className="bx bx-x" /> Ditolak
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: "0.78rem", color: "var(--adm-muted)" }}>
                    {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {item.status !== "approved" && (
                        <button
                          className={styles.btnPrimary}
                          style={{ padding: "4px 8px", fontSize: "0.76rem" }}
                          onClick={() => updateStatus(item.id, "approved")}
                          title="Setujui dan tayangkan di web"
                        >
                          <i className="bx bx-check" /> Setujui
                        </button>
                      )}
                      {item.status !== "rejected" && (
                        <button
                          className={styles.btnGhost}
                          style={{ padding: "4px 8px", fontSize: "0.76rem", color: "#ef4444" }}
                          onClick={() => updateStatus(item.id, "rejected")}
                          title="Tolak karya"
                        >
                          <i className="bx bx-x" /> Tolak
                        </button>
                      )}
                      <button
                        className={styles.btnDel}
                        style={{ padding: "4px 8px" }}
                        onClick={() =>
                          setConfirm({
                            msg: `Hapus karya fanart "${item.title}" oleh ${item.artist_name}?`,
                            onConfirm: () => deleteItem(item.id),
                          })
                        }
                        title="Hapus permanen"
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

      {/* MODAL: PREVIEW FANART */}
      {previewModal && (
        <div className={styles.modalOverlay} onClick={() => setPreviewModal(null)}>
          <div className={styles.formModal} style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3><i className="bx bx-palette" /> {previewModal.title}</h3>
              <button className={styles.closeX} onClick={() => setPreviewModal(null)}><i className="bx bx-x" /></button>
            </div>
            <div className={styles.formBody}>
              <div style={{ width: "100%", maxHeight: 380, background: "var(--cv-ink)", borderRadius: 10, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={previewModal.image_url && !previewModal.image_url.endsWith("/") ? previewModal.image_url : "/images/erine1.jpg"}
                  alt={previewModal.title}
                  style={{ maxWidth: "100%", maxHeight: 380, objectFit: "contain" }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = "true";
                      target.src = "/images/erine1.jpg";
                    }
                  }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: "0.9rem", color: "var(--gold)", fontWeight: 700 }}>
                  Seniman: {previewModal.artist_name} {previewModal.artist_social && `(${previewModal.artist_social})`}
                </div>
                {previewModal.description && (
                  <p style={{ fontSize: "0.85rem", color: "var(--adm-text)", marginTop: 6 }}>{previewModal.description}</p>
                )}
                {previewModal.highres_url && (
                  <div style={{ marginTop: 8 }}>
                    <a href={previewModal.highres_url} target="_blank" rel="noreferrer" style={{ color: "var(--gold)", fontSize: "0.82rem" }}>
                      <i className="bx bx-link-external" /> Link Versi HD / Drive
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.formFooter}>
              {previewModal.status !== "approved" && (
                <button
                  className={styles.btnPrimary}
                  onClick={() => {
                    updateStatus(previewModal.id, "approved");
                    setPreviewModal(null);
                  }}
                >
                  <i className="bx bx-check" /> Setujui & Terbitkan
                </button>
              )}
              <button className={styles.btnGhost} onClick={() => setPreviewModal(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH FANART MANUAL DARI ADMIN */}
      {addModal && (
        <div className={styles.modalOverlay} onClick={() => setAddModal(false)}>
          <div className={styles.formModal} style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3><i className="bx bx-plus-circle" /> Tambah Fanart Erine</h3>
              <button className={styles.closeX} onClick={() => setAddModal(false)}><i className="bx bx-x" /></button>
            </div>
            <form onSubmit={handleCreateFanart}>
              <div className={styles.formBody}>
                <div className={styles.field}>
                  <label>Judul Karya Seni <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: Chibi Erine Summer Festival"
                    value={artTitle}
                    onChange={(e) => setArtTitle(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>Nama Seniman / Kredit <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: @seniman_cava (X) atau Nama Seniman"
                    value={artArtist}
                    onChange={(e) => setArtArtist(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>Link Akun Media Sosial (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: https://x.com/username"
                    value={artSocial}
                    onChange={(e) => setArtSocial(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label>Deskripsi Singkat Karya</label>
                  <textarea
                    placeholder="Ceritakan sedikit inspirasi di balik pembuatan ilustrasi ini..."
                    value={artDesc}
                    onChange={(e) => setArtDesc(e.target.value)}
                    style={{ minHeight: 60 }}
                  />
                </div>

                <div className={styles.field}>
                  <label>Upload File Gambar <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    disabled={uploadingImg}
                  />
                  {uploadingImg && <span style={{ fontSize: "0.8rem", color: "var(--gold)" }}><i className="bx bx-loader-alt bx-spin" /> Mengunggah gambar...</span>}
                  {artImage && (
                    <div style={{ marginTop: 8, width: 100, height: 100, borderRadius: 8, overflow: "hidden", border: "1px solid var(--adm-border)" }}>
                      <img src={artImage} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                </div>

                <div className={styles.field}>
                  <label>Link File Resolusi HD (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Link Google Drive versi HD"
                    value={artHighres}
                    onChange={(e) => setArtHighres(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setAddModal(false)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={submitting || uploadingImg}>
                  {submitting ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Terbitkan Fanart</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2S WITH ERINE MANAGER ─────────────────────────────────────
function TwoShotManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [confirm, setConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [previewModal, setPreviewModal] = useState<any | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states for manual add
  const [shotUser, setShotUser] = useState("");
  const [shotSocial, setShotSocial] = useState("");
  const [shotEvent, setShotEvent] = useState("");
  const [shotDate, setShotDate] = useState("");
  const [shotMsg, setShotMsg] = useState("");
  const [shotImage, setShotImage] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "all");
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/twoshot?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch {
      showToast("Gagal memuat data 2-Shot", "error");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateStatus = async (id: number | string, status: "approved" | "rejected" | "pending") => {
    try {
      const res = await fetch("/api/twoshot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(
          status === "approved"
            ? "Foto 2-Shot BERHASIL DISETUJUI & terbit di web!"
            : status === "rejected"
            ? "Foto 2-Shot ditolak."
            : "Status diubah ke pending.",
          "success"
        );
        loadData();
      } else {
        showToast(json.message || "Gagal mengubah status", "error");
      }
    } catch {
      showToast("Terjadi kendala jaringan", "error");
    }
  };

  const deleteItem = async (id: number | string) => {
    setConfirm(null);
    try {
      const res = await fetch(`/api/twoshot?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Foto 2-Shot berhasil dihapus", "success");
        loadData();
      } else {
        showToast(json.message || "Gagal menghapus", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/twoshot/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok && json.status) {
        setShotImage(json.data.image_url);
        showToast("Foto 2-Shot berhasil diunggah", "success");
      } else {
        showToast(json.message || "Gagal mengunggah foto", "error");
      }
    } catch {
      showToast("Error saat mengunggah", "error");
    } finally {
      setUploadingImg(false);
    }
  };

  const handleCreateTwoShot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shotUser.trim() || !shotImage || !shotMsg.trim()) {
      showToast("Nama penggemar, foto, dan pesan untuk Erine wajib diisi!", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/twoshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: shotUser.trim(),
          user_social: shotSocial.trim() || null,
          event_name: shotEvent.trim() || "2-Shot with Erine",
          event_date: shotDate.trim() || null,
          message: shotMsg.trim(),
          image_url: shotImage,
          status: "approved",
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Foto 2-Shot berhasil ditambahkan & langsung aktif di web!", "success");
        setAddModal(false);
        setShotUser("");
        setShotSocial("");
        setShotEvent("");
        setShotDate("");
        setShotMsg("");
        setShotImage("");
        loadData();
      } else {
        showToast(json.message || "Gagal menambahkan 2-Shot", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = items.filter((i) => {
    if (tab === "all") return true;
    return i.status === tab;
  });

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const approvedCount = items.filter((i) => i.status === "approved").length;

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderLeft}>
          <h2 className={styles.sectionTitle}>
            <i className="bx bx-camera" /> 2S with Erine
          </h2>
          <span className={styles.countBadge}>{items.length} foto</span>
        </div>
        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => setAddModal(true)}>
            <i className="bx bx-plus" /> Tambah 2-Shot
          </button>
        </div>
      </div>

      {/* FILTER TABS */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className={`${styles.filterBtn} ${tab === "all" ? styles.filterBtnActive : ""}`}
            onClick={() => setTab("all")}
          >
            Semua ({items.length})
          </button>
          <button
            className={`${styles.filterBtn} ${tab === "pending" ? styles.filterBtnActive : ""}`}
            onClick={() => setTab("pending")}
            style={pendingCount > 0 ? { borderColor: "var(--gold)", color: "var(--gold)" } : {}}
          >
            <i className="bx bx-time" /> Menunggu ({pendingCount})
          </button>
          <button
            className={`${styles.filterBtn} ${tab === "approved" ? styles.filterBtnActive : ""}`}
            onClick={() => setTab("approved")}
          >
            <i className="bx bx-check" /> Disetujui ({approvedCount})
          </button>
          <button
            className={`${styles.filterBtn} ${tab === "rejected" ? styles.filterBtnActive : ""}`}
            onClick={() => setTab("rejected")}
          >
            <i className="bx bx-x" /> Ditolak ({items.filter((i) => i.status === "rejected").length})
          </button>
        </div>

        <div style={{ position: "relative", minWidth: 220 }}>
          <input
            type="text"
            placeholder="Cari fans / pesan / event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 12px 6px 30px",
              background: "var(--adm-surface)",
              border: "1px solid var(--adm-border)",
              borderRadius: 6,
              color: "var(--adm-text)",
              fontSize: "0.85rem",
            }}
          />
          <i className="bx bx-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--adm-muted)" }} />
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data 2-Shot...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="bx bx-camera" style={{ fontSize: "2.5rem", color: "var(--adm-muted)", marginBottom: 8, display: "block" }} />
          <p>Tidak ada foto 2-Shot untuk filter ini.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>Foto</th>
                <th>Penggemar</th>
                <th>Event / Tanggal</th>
                <th>Pesan untuk Erine</th>
                <th style={{ width: 70 }}>Likes</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 180, textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div
                      style={{ width: 64, height: 64, borderRadius: 8, overflow: "hidden", background: "var(--cv-ink)", cursor: "pointer", border: "1px solid var(--adm-border)" }}
                      onClick={() => setPreviewModal(item)}
                      title="Klik untuk pratinjau"
                    >
                      <img
                        src={item.image_url && !item.image_url.endsWith("/") ? item.image_url : "/images/erine3.jpg"}
                        alt={item.user_name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = "true";
                            target.src = "/images/erine3.jpg";
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: "var(--adm-text)" }}>{item.user_name}</div>
                    {item.user_social && (
                      <div style={{ fontSize: "0.78rem", color: "var(--gold)" }}>{item.user_social}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: "0.85rem", color: "var(--adm-text)" }}>{item.event_name || "-"}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--adm-muted)" }}>
                      {item.event_date || new Date(item.created_at).toLocaleDateString("id-ID")}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: "0.82rem", color: "var(--adm-muted)", fontStyle: "italic", maxWidth: 260, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      "{item.message}"
                    </div>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.85rem", color: "var(--cv-orange)" }}>
                      <i className="bx bxs-heart" /> {item.likes || 0}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background:
                          item.status === "approved"
                            ? "rgba(16, 185, 129, 0.15)"
                            : item.status === "rejected"
                            ? "rgba(239, 68, 68, 0.15)"
                            : "color-mix(in srgb, var(--cv-orange) 15%, transparent)",
                        color:
                          item.status === "approved"
                            ? "#10b981"
                            : item.status === "rejected"
                            ? "#ef4444"
                            : "var(--cv-orange)",
                      }}
                    >
                      {item.status === "approved" ? "Disetujui" : item.status === "rejected" ? "Ditolak" : "Pending"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <button
                        className={styles.btnGhost}
                        style={{ padding: "4px 8px" }}
                        onClick={() => setPreviewModal(item)}
                        title="Lihat Pratinjau & Pesan"
                      >
                        <i className="bx bx-show" />
                      </button>
                      {item.status !== "approved" && (
                        <button
                          className={styles.btnPrimary}
                          style={{ padding: "4px 8px", fontSize: "0.78rem" }}
                          onClick={() => updateStatus(item.id, "approved")}
                          title="Setujui dan tampilkan di web"
                        >
                          <i className="bx bx-check" /> Setujui
                        </button>
                      )}
                      {item.status !== "rejected" && (
                        <button
                          className={styles.btnGhost}
                          style={{ padding: "4px 8px", color: "#ef4444", borderColor: "#ef4444" }}
                          onClick={() => updateStatus(item.id, "rejected")}
                          title="Tolak 2-Shot"
                        >
                          <i className="bx bx-x" /> Tolak
                        </button>
                      )}
                      <button
                        className={styles.btnDel}
                        style={{ padding: "4px 8px" }}
                        onClick={() =>
                          setConfirm({
                            msg: `Hapus foto 2-Shot oleh ${item.user_name}?`,
                            onConfirm: () => deleteItem(item.id),
                          })
                        }
                        title="Hapus permanen"
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

      {/* MODAL: PREVIEW 2-SHOT */}
      {previewModal && (
        <div className={styles.modalOverlay} onClick={() => setPreviewModal(null)}>
          <div className={styles.formModal} style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3><i className="bx bx-camera" /> 2-Shot by {previewModal.user_name}</h3>
              <button className={styles.closeX} onClick={() => setPreviewModal(null)}><i className="bx bx-x" /></button>
            </div>
            <div className={styles.formBody}>
              <div style={{ width: "100%", maxHeight: 380, background: "var(--cv-ink)", borderRadius: 10, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img
                  src={previewModal.image_url && !previewModal.image_url.endsWith("/") ? previewModal.image_url : "/images/erine3.jpg"}
                  alt={previewModal.user_name}
                  style={{ maxWidth: "100%", maxHeight: 380, objectFit: "contain" }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = "true";
                      target.src = "/images/erine3.jpg";
                    }
                  }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: "0.95rem", color: "var(--gold)", fontWeight: 700 }}>
                  Penggemar: {previewModal.user_name} {previewModal.user_social && `(${previewModal.user_social})`}
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--adm-muted)", marginTop: 4 }}>
                  Event: {previewModal.event_name || "-"} | Tanggal: {previewModal.event_date || "-"}
                </div>
                <div style={{ background: "color-mix(in srgb, var(--cv-orange) 8%, transparent)", borderLeft: "3px solid var(--cv-orange)", padding: "10px 14px", borderRadius: "0 8px 8px 0", marginTop: 10, fontSize: "0.9rem", color: "var(--adm-text)", fontStyle: "italic" }}>
                  "{previewModal.message}"
                </div>
              </div>
            </div>
            <div className={styles.formFooter}>
              {previewModal.status !== "approved" && (
                <button
                  className={styles.btnPrimary}
                  onClick={() => {
                    updateStatus(previewModal.id, "approved");
                    setPreviewModal(null);
                  }}
                >
                  <i className="bx bx-check" /> Setujui & Terbitkan
                </button>
              )}
              <button className={styles.btnGhost} onClick={() => setPreviewModal(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH 2-SHOT MANUAL DARI ADMIN */}
      {addModal && (
        <div className={styles.modalOverlay} onClick={() => setAddModal(false)}>
          <div className={styles.formModal} style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.formModalHeader}>
              <h3><i className="bx bx-plus-circle" /> Tambah 2-Shot with Erine</h3>
              <button className={styles.closeX} onClick={() => setAddModal(false)}><i className="bx bx-x" /></button>
            </div>
            <form onSubmit={handleCreateTwoShot}>
              <div className={styles.formBody}>
                <div className={styles.field}>
                  <label>Nama Penggemar / Member <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: Erine"
                    value={shotUser}
                    onChange={(e) => setShotUser(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>Akun Media Sosial (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: @username (X / IG)"
                    value={shotSocial}
                    onChange={(e) => setShotSocial(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className={styles.field}>
                    <label>Event / Sesi</label>
                    <input
                      type="text"
                      placeholder="Contoh: Seitansai Erine"
                      value={shotEvent}
                      onChange={(e) => setShotEvent(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Tanggal 2-Shot</label>
                    <input
                      type="text"
                      placeholder="Contoh: 22 Agustus 2026"
                      value={shotDate}
                      onChange={(e) => setShotDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Pesan untuk Erine <span style={{ color: "#ef4444" }}>*</span></label>
                  <textarea
                    placeholder="Tuliskan ucapan atau kenangan seru 2-Shot untuk Erine..."
                    value={shotMsg}
                    onChange={(e) => setShotMsg(e.target.value)}
                    style={{ minHeight: 70 }}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>Upload Foto 2-Shot <span style={{ color: "#ef4444" }}>*</span></label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    disabled={uploadingImg}
                  />
                  {uploadingImg && <span style={{ fontSize: "0.8rem", color: "var(--gold)" }}><i className="bx bx-loader-alt bx-spin" /> Mengunggah foto...</span>}
                  {shotImage && (
                    <div style={{ marginTop: 8, width: 100, height: 100, borderRadius: 8, overflow: "hidden", border: "1px solid var(--adm-border)" }}>
                      <img src={shotImage} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setAddModal(false)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={submitting || uploadingImg}>
                  {submitting ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Terbitkan 2-Shot</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DENGERINE MANAGER ─────────────────────────────────────────
function DengerineManager() {
  const DEFAULT_SONG = {
    id: "", title: "", creator: "", creatorHandle: "", creatorUrl: "",
    type: "Cover" as const, spotifyTrackId: "", youtubeId: "", audioUrl: "",
    duration: "", year: new Date().getFullYear(), tags: "", description: "",
  };

  const [songs, setSongs]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm]       = useState<any>(DEFAULT_SONG);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast]     = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const showMsg = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/dengerine");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setSongs(json.data);
      else setSongs([]);
    } catch {
      setSongs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm(DEFAULT_SONG);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (song: any) => {
    setForm({
      ...song,
      tags: Array.isArray(song.tags) ? song.tags.join(", ") : (song.tags || ""),
    });
    setEditing(song);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.creator.trim()) {
      showMsg("Judul dan kreator wajib diisi.", "error");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      year: Number(form.year) || new Date().getFullYear(),
    };
    try {
      const res  = await fetch("/api/dengerine", {
        method:  editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showMsg(editing ? "Lagu berhasil diperbarui!" : "Lagu berhasil ditambahkan!", "success");
        setShowForm(false);
        load();
      } else {
        throw new Error(json.message || "Gagal menyimpan");
      }
    } catch (err: any) {
      showMsg(err.message || "Gagal menyimpan", "error");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res  = await fetch(`/api/dengerine?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { showMsg("Lagu dihapus.", "success"); load(); }
      else throw new Error(json.message);
    } catch (err: any) { showMsg(err.message || "Gagal hapus", "error"); }
    setDeleteId(null);
  };

  const fc = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const SONG_TYPES = ["Cover", "Original", "Acoustic", "Remix"];

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {deleteId && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmBox}>
            <i className="bx bx-trash" style={{ fontSize: "2rem", color: "var(--cv-orange)" }} />
            <p>Hapus lagu ini dari Dengerine?</p>
            <div className={styles.confirmBtns}>
              <button className={styles.btnGhost} onClick={() => setDeleteId(null)}>Batal</button>
              <button className={styles.btnDanger} onClick={() => handleDelete(deleteId)}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-headphone" style={{ color: "#1db954" }} /> Dengerine — Arsip Lagu Fan
        </h2>
        <button className={styles.btnPrimary} onClick={openAdd}>
          <i className="bx bx-plus" /> Tambah Lagu
        </button>
      </div>

      <p style={{ color: "var(--fg-dim)", fontSize: "0.85rem", marginBottom: 20 }}>
        Kelola arsip lagu cover &amp; orisinal karya komunitas fans untuk Erine. Data akan tampil di halaman <strong>/dengerine</strong>.
      </p>

      {/* Song table */}
      {loading ? (
        <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data...</div>
      ) : songs.length === 0 ? (
        <div className={styles.emptyState}>
          <i className="bx bx-music" style={{ fontSize: "2.5rem", color: "var(--fg-dim)" }} />
          <p>Belum ada lagu. Tambahkan lagu pertama!</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Judul</th>
                <th>Kreator</th>
                <th>Tipe</th>
                <th>Spotify ID</th>
                <th>Tahun</th>
                <th style={{ textAlign: "right" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {songs.map((s, i) => (
                <tr key={s.id}>
                  <td style={{ color: "var(--fg-dim)", fontSize: "0.8rem" }}>{i + 1}</td>
                  <td style={{ fontWeight: 700 }}>{s.title}</td>
                  <td>
                    <div style={{ fontSize: "0.85rem" }}>{s.creator}</div>
                    {s.creatorHandle && <div style={{ fontSize: "0.75rem", color: "var(--fg-dim)" }}>{s.creatorHandle}</div>}
                  </td>
                  <td>
                    <span style={{
                      padding: "2px 8px", borderRadius: 6, fontSize: "0.72rem", fontWeight: 700,
                      background: s.type === "Original" ? "color-mix(in srgb, var(--cv-orange) 12%, transparent)" : "rgba(29,185,84,0.12)",
                      color:      s.type === "Original" ? "var(--cv-orange)" : "#1db954",
                    }}>
                      {s.type}
                    </span>
                  </td>
                  <td>
                    {s.spotifyTrackId ? (
                      <a href={`https://open.spotify.com/track/${s.spotifyTrackId}`} target="_blank" rel="noreferrer"
                        style={{ color: "#1db954", fontSize: "0.78rem", fontFamily: "monospace" }}>
                        {s.spotifyTrackId.slice(0, 16)}…
                      </a>
                    ) : <span style={{ color: "var(--fg-dim)", fontSize: "0.75rem" }}>—</span>}
                  </td>
                  <td style={{ color: "var(--fg-dim)", fontSize: "0.85rem" }}>{s.year || "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className={styles.btnSmall} onClick={() => openEdit(s)}>
                        <i className="bx bx-edit" />
                      </button>
                      <button className={`${styles.btnSmall} ${styles.btnSmallDanger}`} onClick={() => setDeleteId(s.id)}>
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

      {/* Add / Edit Form Modal */}
      {showForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.formModal} style={{ maxWidth: 700 }}>
            <div className={styles.formHeader}>
              <h3>{editing ? "Edit Lagu" : "Tambah Lagu Baru"}</h3>
              <button className={styles.closeBtn} onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.formBody}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className={styles.field}>
                    <label>Judul Lagu *</label>
                    <input value={form.title} onChange={e => fc("title", e.target.value)} placeholder="Nafas Tenang" required />
                  </div>
                  <div className={styles.field}>
                    <label>Tipe</label>
                    <select value={form.type} onChange={e => fc("type", e.target.value)}>
                      {SONG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Nama Kreator *</label>
                    <input value={form.creator} onChange={e => fc("creator", e.target.value)} placeholder="FarrelHanief" required />
                  </div>
                  <div className={styles.field}>
                    <label>Handle Kreator</label>
                    <input value={form.creatorHandle} onChange={e => fc("creatorHandle", e.target.value)} placeholder="@FarrelHanief10" />
                  </div>
                  <div className={styles.field}>
                    <label>URL Profil Kreator</label>
                    <input type="url" value={form.creatorUrl} onChange={e => fc("creatorUrl", e.target.value)} placeholder="https://twitter.com/..." />
                  </div>
                  <div className={styles.field}>
                    <label>Tahun</label>
                    <input type="number" value={form.year} onChange={e => fc("year", e.target.value)} placeholder="2026" />
                  </div>
                </div>

                <div className={styles.field} style={{ marginTop: 4 }}>
                  <label>
                    <i className="bx bxl-spotify" style={{ color: "#1db954" }} /> Spotify Track ID
                  </label>
                  <input
                    value={form.spotifyTrackId}
                    onChange={e => fc("spotifyTrackId", e.target.value)}
                    placeholder="2hDAoL55QcEk1DuGkvuWDU (ID saja, bukan URL lengkap)"
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--fg-dim)", marginTop: 4, display: "block" }}>
                    Ambil dari URL Spotify: open.spotify.com/track/<strong>[ID DI SINI]</strong>
                  </span>
                </div>

                {form.spotifyTrackId && (
                  <div style={{ marginTop: 8, borderRadius: 10, overflow: "hidden" }}>
                    <iframe
                      src={`https://open.spotify.com/embed/track/${form.spotifyTrackId}?utm_source=generator&theme=0`}
                      width="100%" height="80" frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      title="Preview"
                      style={{ display: "block" }}
                    />
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 4 }}>
                  <div className={styles.field}>
                    <label>YouTube Video ID (opsional)</label>
                    <input value={form.youtubeId} onChange={e => fc("youtubeId", e.target.value)} placeholder="dQw4w9WgXcQ" />
                  </div>
                  <div className={styles.field}>
                    <label>Durasi</label>
                    <input value={form.duration} onChange={e => fc("duration", e.target.value)} placeholder="3:24" />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Tag Genre (pisah koma)</label>
                  <input value={form.tags} onChange={e => fc("tags", e.target.value)} placeholder="Ballad, Piano, Tribute" />
                </div>

                <div className={styles.field}>
                  <label>Deskripsi Singkat</label>
                  <textarea
                    value={form.description}
                    onChange={e => fc("description", e.target.value)}
                    rows={3}
                    placeholder="Ceritakan sedikit tentang lagu ini..."
                  />
                </div>

                <div className={styles.field}>
                  <label>URL Cover Art (opsional)</label>
                  <input type="url" value={form.coverArt} onChange={e => fc("coverArt", e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className={styles.formFooter} style={{ justifyContent: "flex-end" }}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowForm(false)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> {editing ? "Perbarui" : "Tambahkan"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── MANAJEMEN PENGGUNA (USERS MANAGER) ──────────────────────────
function UsersManager({ currentRole, currentUsername }: { currentRole?: string; currentUsername?: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ username: "", name: "", division: "Operasional", password: "", role: "admin" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data);
      }
    } catch {
      setToast({ msg: "Gagal memuat pengguna", type: "error" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openAdd = () => {
    setEditing(null);
    setForm({ username: "", name: "", division: "Operasional", password: "", role: "admin" });
    setShowModal(true);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setForm({
      username: u.username,
      name: u.name,
      division: u.division || (u.username.toLowerCase() === "dior" ? "Bendahara" : "Operasional"),
      password: "",
      role: u.role || "admin",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: editing ? "update" : "create",
          id: editing?.id,
          ...form,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: json.message || "Berhasil disimpan", type: "success" });
        setShowModal(false);
        fetchUsers();
      } else {
        setToast({ msg: json.message || "Gagal menyimpan", type: "error" });
      }
    } catch {
      setToast({ msg: "Terjadi kesalahan", type: "error" });
    }
    setSaving(false);
  };

  const handleDelete = async (u: any) => {
    const lower = (u.username || "").toLowerCase();
    if (lower === "admin" || lower === "vallencia" || lower === "aditya") {
      setToast({ msg: "Akun Super Admin utama tidak dapat dihapus!", type: "error" });
      return;
    }
    if (!window.confirm(`Hapus admin "${u.username}" (${u.name})?`)) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: u.id, username: u.username }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: json.message, type: "success" });
        fetchUsers();
      } else {
        setToast({ msg: json.message, type: "error" });
      }
    } catch {
      setToast({ msg: "Gagal menghapus", type: "error" });
    }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (u.username && u.username.toLowerCase().includes(q)) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.division && u.division.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q));
  });

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="bx bx-user-pin" style={{ color: "var(--cv-orange)" }} /> Manajemen Pengguna & Divisi
            <span className={styles.count}>{users.length} Akun</span>
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--cv-text-mute)" }}>
            Kelola akun administrator Cavallery, pembagian divisi kerja, dan tingkatan role RBAC.
          </p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={openAdd}
          title="Tambah Admin Baru"
        >
          <i className="bx bx-plus" /> Tambah Admin
        </button>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 12 }}>
        <input
          type="text"
          placeholder="Cari username, nama, divisi, atau role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360, padding: "8px 12px", background: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: 8, color: "var(--cv-text)", fontSize: 13 }}
        />
      </div>

      {loading ? (
        <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data admin...</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 45, textAlign: "center" }}>#</th>
                <th>Username</th>
                <th>Nama Lengkap</th>
                <th>Divisi</th>
                <th>Role (Tingkatan)</th>
                <th>Dibuat</th>
                <th style={{ width: 120, textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id || u.username}>
                  <td style={{ textAlign: "center", color: "var(--cv-text-mute)" }}>{i + 1}</td>
                  <td style={{ fontWeight: 600, color: u.role === "superadmin" ? "var(--cv-orange)" : "var(--cv-orange-hi)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <i className={`bx ${u.role === "superadmin" ? "bxs-badge-check" : "bx-shield"}`} />
                      {u.username}
                    </span>
                  </td>
                  <td>{u.name}</td>
                  <td>
                    <span style={{
                      padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                      background: "color-mix(in srgb, var(--cv-orange) 12%, transparent)",
                      color: "var(--cv-orange)",
                      border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}>
                      <i className="bx bx-briefcase" />
                      {u.division || (u.username.toLowerCase() === "dior" ? "Bendahara" : "Operasional")}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700,
                      background: u.role === "superadmin" ? "color-mix(in srgb, var(--cv-orange) 20%, transparent)" : "color-mix(in srgb, var(--cv-orange) 20%, transparent)",
                      color: u.role === "superadmin" ? "var(--cv-orange)" : "var(--cv-orange-hi)",
                      border: `1px solid ${u.role === "superadmin" ? "color-mix(in srgb, var(--cv-orange) 40%, transparent)" : "color-mix(in srgb, var(--cv-orange) 40%, transparent)"}`,
                      textTransform: "uppercase",
                    }}>
                      {u.role || "admin"}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--cv-text-mute)" }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("id-ID") : "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button
                        className={styles.btnGhost}
                        style={{ padding: "4px 8px" }}
                        onClick={() => openEdit(u)}
                        title="Edit Admin & Role"
                      >
                        <i className="bx bx-edit" />
                      </button>
                      {u.username !== "admin" && u.username !== "vallencia" && u.username !== "aditya" && (
                        <button className={styles.btnGhost} style={{ padding: "4px 8px", color: "#ef4444" }} onClick={() => handleDelete(u)} title="Hapus">
                          <i className="bx bx-trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add/Edit */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.formModal} onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className={styles.formModalHeader}>
              <h3>{editing ? `Edit ${editing.username}` : "Tambah Admin Baru"}</h3>
              <button className={styles.closeX} onClick={() => setShowModal(false)}><i className="bx bx-x" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.formBody}>
                <div className={styles.field}>
                  <label>Username *</label>
                  <input
                    value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    disabled={Boolean(editing)}
                    required
                    placeholder="misal: dior"
                  />
                </div>
                <div className={styles.field}>
                  <label>Nama Lengkap / Panggilan *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="misal: Dior"
                  />
                </div>
                <div className={styles.field}>
                  <label>Divisi *</label>
                  <input
                    value={form.division}
                    onChange={e => setForm(p => ({ ...p, division: e.target.value }))}
                    required
                    placeholder="misal: Bendahara, Humas, Event, IT & Tech..."
                  />
                </div>
                <div className={styles.field}>
                  <label>Role (Tingkatan Hak Akses)</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    style={{
                      background: "var(--cv-ink-1)",
                      color: "var(--cv-text)",
                      border: "1px solid var(--cv-line-strong)",
                      borderRadius: 8,
                      padding: "9px 12px",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <option value="superadmin" style={{ background: "var(--cv-ink-2)", color: "var(--cv-text)" }}>Superadmin (Pangkat Tertinggi / Akses Penuh)</option>
                    <option value="admin" style={{ background: "var(--cv-ink-2)", color: "var(--cv-text)" }}>Admin (Operasional & Kelola Konten)</option>
                    <option value="editor" style={{ background: "var(--cv-ink-2)", color: "var(--cv-text)" }}>Editor (Hanya Tulis & Edit Berita/Galeri)</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label>{editing ? "Password Baru (kosongkan jika tidak ingin diubah)" : "Password *"}</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    required={!editing}
                    placeholder="******"
                  />
                </div>
              </div>
              <div className={styles.formFooter}>
                <button type="button" className={styles.btnGhost} onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>
                  {saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : "Simpan Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TEMPAT SAMPAH (TRASH MANAGER) ──────────────────────────────
function TrashManager({ currentRole, currentUsername }: { currentRole?: string; currentUsername?: string }) {
  const isSuperadmin = currentRole === "superadmin";
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trash?type=${typeFilter}`);
      const json = await res.json();
      if (json.status && Array.isArray(json.data)) {
        setItems(json.data);
      } else {
        setItems([]);
      }
    } catch {
      setToast({ msg: "Gagal memuat data tempat sampah", type: "error" });
    }
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  const handleRestore = async (item: any) => {
    if (!window.confirm(`Pulihkan "${item.title || item.entity_id}" kembali ke modul ${item.entity_type}?`)) return;
    setActionLoading(item.id);
    try {
      const res = await fetch("/api/admin/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", id: item.id, username: currentUsername || currentAdminUsername }),
      });
      const json = await res.json();
      if (json.status) {
        setToast({ msg: json.message || "Data berhasil dipulihkan!", type: "success" });
        fetchTrash();
      } else {
        setToast({ msg: json.message || "Gagal memulihkan", type: "error" });
      }
    } catch {
      setToast({ msg: "Terjadi kesalahan jaringan", type: "error" });
    }
    setActionLoading(null);
  };

  const handleDeletePermanent = async (item: any) => {
    if (!window.confirm(`PERINGATAN: Hapus PERMANEN "${item.title || item.entity_id}"? Data tidak akan bisa dikembalikan lagi!`)) return;
    setActionLoading(item.id);
    try {
      const res = await fetch("/api/admin/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_permanent", id: item.id, username: currentUsername || currentAdminUsername }),
      });
      const json = await res.json();
      if (json.status) {
        setToast({ msg: json.message || "Item berhasil dihapus permanen", type: "success" });
        fetchTrash();
      } else {
        setToast({ msg: json.message || "Gagal menghapus", type: "error" });
      }
    } catch {
      setToast({ msg: "Terjadi kesalahan jaringan", type: "error" });
    }
    setActionLoading(null);
  };

  const handleEmptyTrash = async () => {
    if (!isSuperadmin) {
      setToast({ msg: "Hanya Superadmin yang dapat mengosongkan seluruh tempat sampah", type: "error" });
      return;
    }
    if (!window.confirm("PERINGATAN BESAR: Apakah Anda yakin ingin MENGOSONGKAN SELURUH TEMPAT SAMPAH? Semua item yang ada di sini akan terhapus selamanya!")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "empty_trash", username: currentUsername || currentAdminUsername }),
      });
      const json = await res.json();
      if (json.status) {
        setToast({ msg: json.message || "Tempat sampah berhasil dikosongkan", type: "success" });
        fetchTrash();
      } else {
        setToast({ msg: json.message || "Gagal mengosongkan tempat sampah", type: "error" });
      }
    } catch {
      setToast({ msg: "Terjadi kesalahan jaringan", type: "error" });
    }
    setLoading(false);
  };

  const filtered = items.filter(it => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (it.title || "").toLowerCase().includes(q) ||
      (it.entity_id || "").toLowerCase().includes(q) ||
      (it.deleted_by || "").toLowerCase().includes(q);
    return matchSearch;
  });

  const uniqueTypes = Array.from(new Set(items.map(i => i.entity_type))).filter(Boolean);

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <i className="bx bx-trash" style={{ color: "var(--cv-orange)" }} /> Tempat Sampah (Recycle Bin / Trash)
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--cv-text-mute)" }}>
            Item yang dihapus dari modul News, Galeri, Timeline, dll. disimpan di sini dan dapat dipulihkan kapan saja.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {items.length > 0 && isSuperadmin && (
            <button
              className={styles.btnDanger}
              onClick={handleEmptyTrash}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", padding: "8px 14px", background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", color: "#f87171" }}
            >
              <i className="bx bx-trash-alt" /> Kosongkan Sampah
            </button>
          )}
          <button className={styles.btnGhost} onClick={fetchTrash} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <i className={`bx bx-refresh ${loading ? "bx-spin" : ""}`} /> Muat Ulang
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <input
            type="text"
            placeholder="Cari judul, ID, atau penghapus..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "8px 12px 8px 34px", borderRadius: 8, background: "var(--adm-surface)", border: "1px solid var(--adm-border)", color: "var(--adm-text)", fontSize: "0.85rem" }}
          />
          <i className="bx bx-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--cv-text-mute)" }} />
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: 8, background: "var(--adm-surface)", border: "1px solid var(--adm-border)", color: "var(--adm-text)", fontSize: "0.85rem" }}
        >
          <option value="all">Semua Modul ({items.length})</option>
          {uniqueTypes.map(t => (
            <option key={t} value={t}>{t.toUpperCase()} ({items.filter(i => i.entity_type === t).length})</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--cv-orange)" }}>
          <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2rem", marginBottom: 8, display: "block" }} />
          Memuat tempat sampah...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", background: "var(--adm-surface)", borderRadius: 12, border: "1px dashed var(--adm-border)", color: "var(--cv-text-mute)" }}>
          <i className="bx bx-trash" style={{ fontSize: "3rem", display: "block", marginBottom: 12, opacity: 0.4 }} />
          Tempat sampah kosong. Tidak ada data yang sedang dihapus.
        </div>
      ) : (
        <div className={styles.tableWrap} style={{ maxHeight: "65vh", overflow: "auto" }}>
          <table className={styles.table}>
            <thead style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--adm-surface)" }}>
              <tr>
                <th style={{ width: 110 }}>Modul</th>
                <th>Judul / Item</th>
                <th style={{ width: 140 }}>Dihapus Oleh</th>
                <th style={{ width: 160 }}>Waktu Dihapus</th>
                <th style={{ width: 190, textAlign: "center" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "color-mix(in srgb, var(--cv-orange) 15%, transparent)", color: "var(--cv-orange)", border: "1px solid color-mix(in srgb, var(--cv-orange) 30%, transparent)", textTransform: "uppercase" }}>
                      {item.entity_type}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{item.title || item.entity_id}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--cv-text-mute)" }}>ID Asli: {item.entity_id}</div>
                  </td>
                  <td>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.82rem", fontWeight: 600 }}>
                      <i className="bx bx-user" style={{ color: "var(--cv-orange)" }} /> {item.deleted_by || "Admin"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.78rem", color: "var(--cv-text-mute)" }}>
                    {new Date(item.deleted_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleRestore(item)}
                        disabled={actionLoading === item.id}
                        style={{ padding: "6px 12px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#10b981", display: "inline-flex", alignItems: "center", gap: 4 }}
                        title="Pulihkan data kembali ke modul asalnya"
                      >
                        <i className={`bx ${actionLoading === item.id ? "bx-loader-alt bx-spin" : "bx-undo"}`} /> Pulihkan
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePermanent(item)}
                        disabled={actionLoading === item.id}
                        style={{ padding: "6px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", background: "rgba(239, 68, 68, 0.12)", border: "1px solid #ef4444", color: "#f87171", display: "inline-flex", alignItems: "center", gap: 4 }}
                        title="Hapus permanen selamanya"
                      >
                        <i className="bx bx-trash" /> Hapus
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
  );
}

// ─── RIWAYAT AKTIVITAS (ACTIVITY LOGS MANAGER) ───────────────────
function ActivityLogsManager({ currentRole, currentUsername }: { currentRole?: string; currentUsername?: string }) {
  const isSuperadmin = currentRole === "superadmin";
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs?type=activity");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLogs(json.data);
      }
    } catch {
      setToast({ msg: "Gagal memuat log aktivitas", type: "error" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = (l.username && l.username.toLowerCase().includes(q)) ||
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.real_name && l.real_name.toLowerCase().includes(q)) ||
      (l.action && l.action.toLowerCase().includes(q)) ||
      (l.details && l.details.toLowerCase().includes(q));
    const matchMod = moduleFilter === "all" || l.module === moduleFilter;
    return matchSearch && matchMod;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(l => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(l => l.id)));
    }
  };

  const toggleSelectRow = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDeleteSelected = async () => {
    if (!isSuperadmin) {
      setToast({ msg: "Hanya Superadmin yang dapat menghapus riwayat aktivitas", type: "error" });
      return;
    }
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Hapus ${selectedIds.size} log terpilih?`)) return;

    try {
      const res = await fetch("/api/admin/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", type: "activity", ids: Array.from(selectedIds), username: currentUsername || currentAdminUsername }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: json.message, type: "success" });
        setSelectedIds(new Set());
        fetchLogs();
      } else {
        setToast({ msg: json.message, type: "error" });
      }
    } catch {
      setToast({ msg: "Gagal menghapus log", type: "error" });
    }
  };

  const handleClearAll = async () => {
    if (!isSuperadmin) {
      setToast({ msg: "Hanya Superadmin yang dapat membersihkan riwayat log", type: "error" });
      return;
    }
    if (!window.confirm("PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA riwayat aktivitas?")) return;
    try {
      const res = await fetch("/api/admin/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all", type: "activity", username: currentUsername || currentAdminUsername }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: json.message, type: "success" });
        setSelectedIds(new Set());
        fetchLogs();
      } else {
        setToast({ msg: json.message, type: "error" });
      }
    } catch {
      setToast({ msg: "Gagal membersihkan log", type: "error" });
    }
  };

  // Modules list for filter
  const modules = Array.from(new Set(logs.map(l => l.module).filter(Boolean)));

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-history" style={{ color: "var(--cv-orange)" }} /> Riwayat Aktivitas
          <span className={styles.count}>{logs.length} Log</span>
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={styles.btnGhost}
            onClick={handleDeleteSelected}
            disabled={!isSuperadmin || selectedIds.size === 0}
            style={{
              color: isSuperadmin && selectedIds.size > 0 ? "#ef4444" : "var(--cv-text-mute)",
              borderColor: isSuperadmin && selectedIds.size > 0 ? "#ef4444" : "var(--cv-line-strong)",
              opacity: !isSuperadmin ? 0.5 : 1,
              cursor: isSuperadmin ? "pointer" : "not-allowed",
            }}
            title={!isSuperadmin ? "Hanya Superadmin yang dapat menghapus log" : "Hapus Log Terpilih"}
          >
            <i className="bx bx-trash" /> Hapus Terpilih ({selectedIds.size})
          </button>
          <button
            className={styles.btnGhost}
            onClick={handleClearAll}
            disabled={!isSuperadmin}
            style={{
              color: isSuperadmin ? "#f87171" : "var(--cv-text-mute)",
              opacity: !isSuperadmin ? 0.5 : 1,
              cursor: isSuperadmin ? "pointer" : "not-allowed",
            }}
            title={!isSuperadmin ? "Hanya Superadmin yang dapat membersihkan seluruh log" : "Bersihkan Semua Log"}
          >
            <i className="bx bx-brush" /> Bersihkan Semua
          </button>
          <button className={styles.btnGhost} onClick={fetchLogs} title="Refresh">
            <i className="bx bx-refresh" />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Cari aksi, detail, username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280, padding: "8px 12px", background: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: 8, color: "var(--cv-text)", fontSize: 13 }}
        />
        <select
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "var(--cv-ink-1)",
            border: "1px solid var(--cv-line-strong)",
            borderRadius: 8,
            color: "var(--cv-text)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <option value="all" style={{ background: "var(--cv-ink-2)", color: "var(--cv-text)" }}>Semua Modul</option>
          {modules.map(m => (
            <option key={m} value={m} style={{ background: "var(--cv-ink-2)", color: "var(--cv-text)" }}>
              {m}
            </option>
          ))}
        </select>
        {selectedIds.size > 0 && (
          <span style={{ fontSize: 13, color: "var(--cv-orange)", fontWeight: 600 }}>
            {selectedIds.size} log terpilih
          </span>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat riwayat aktivitas...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--cv-text-mute)" }}>Tidak ada riwayat aktivitas</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 45, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    title="Pilih Semua"
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th>Waktu</th>
                <th>Pengguna / Admin</th>
                <th>Modul</th>
                <th>Aksi</th>
                <th>Detail</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{ background: selectedIds.has(l.id) ? "color-mix(in srgb, var(--cv-orange) 8%, transparent)" : undefined }}>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(l.id)}
                      onChange={() => toggleSelectRow(l.id)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td style={{ fontSize: 12, color: "var(--cv-text-mute)", whiteSpace: "nowrap" }}>
                    {l.created_at ? new Date(l.created_at).toLocaleString("id-ID") : "—"}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: "var(--cv-text)", fontWeight: 700, fontSize: 13 }}>
                        {l.name || l.real_name || l.nama || l.username || "Admin"}
                      </span>
                      {l.username && (l.name || l.real_name || l.nama) && (l.name || l.real_name || l.nama).toLowerCase() !== l.username.toLowerCase() && (
                        <span style={{ fontSize: 11, color: "var(--cv-orange)", fontFamily: "monospace" }}>@{l.username}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ background: "color-mix(in srgb, var(--cv-bone) 8%, transparent)", padding: "2px 6px", borderRadius: 4, fontSize: 11 }}>
                      {l.module}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--cv-text)" }}>{l.action}</td>
                  <td style={{ fontSize: 12, color: "var(--cv-text-mute)" }}>{l.details || "—"}</td>
                  <td style={{ fontSize: 12, color: "var(--cv-text-mute)", fontFamily: "monospace" }}>{l.ip_address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── RIWAYAT LOGIN (LOGIN LOGS MANAGER) ─────────────────────────
function LoginLogsManager({ currentRole, currentUsername }: { currentRole?: string; currentUsername?: string }) {
  const isSuperadmin = currentRole === "superadmin";
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs?type=login");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLogs(json.data);
      }
    } catch {
      setToast({ msg: "Gagal memuat log login", type: "error" });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = (l.username && l.username.toLowerCase().includes(q)) ||
      (l.name && l.name.toLowerCase().includes(q)) ||
      (l.real_name && l.real_name.toLowerCase().includes(q)) ||
      (l.ip_address && l.ip_address.toLowerCase().includes(q));
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(l => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(l => l.id)));
    }
  };

  const toggleSelectRow = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDeleteSelected = async () => {
    if (!isSuperadmin) {
      setToast({ msg: "Hanya Superadmin yang dapat menghapus log login", type: "error" });
      return;
    }
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Hapus ${selectedIds.size} log login terpilih?`)) return;

    try {
      const res = await fetch("/api/admin/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", type: "login", ids: Array.from(selectedIds), username: currentUsername || currentAdminUsername }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: json.message, type: "success" });
        setSelectedIds(new Set());
        fetchLogs();
      } else {
        setToast({ msg: json.message, type: "error" });
      }
    } catch {
      setToast({ msg: "Gagal menghapus log login", type: "error" });
    }
  };

  const handleClearAll = async () => {
    if (!isSuperadmin) {
      setToast({ msg: "Hanya Superadmin yang dapat membersihkan seluruh log login", type: "error" });
      return;
    }
    if (!window.confirm("PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA riwayat login?")) return;
    try {
      const res = await fetch("/api/admin/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all", type: "login", username: currentUsername || currentAdminUsername }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: json.message, type: "success" });
        setSelectedIds(new Set());
        fetchLogs();
      } else {
        setToast({ msg: json.message, type: "error" });
      }
    } catch {
      setToast({ msg: "Gagal membersihkan log", type: "error" });
    }
  };

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-log-in-circle" style={{ color: "var(--cv-orange)" }} /> Riwayat Login
          <span className={styles.count}>{logs.length} Percobaan</span>
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={styles.btnGhost}
            onClick={handleDeleteSelected}
            disabled={!isSuperadmin || selectedIds.size === 0}
            style={{
              color: isSuperadmin && selectedIds.size > 0 ? "#ef4444" : "var(--cv-text-mute)",
              borderColor: isSuperadmin && selectedIds.size > 0 ? "#ef4444" : "var(--cv-line-strong)",
              opacity: !isSuperadmin ? 0.5 : 1,
              cursor: isSuperadmin ? "pointer" : "not-allowed",
            }}
            title={!isSuperadmin ? "Hanya Superadmin yang dapat menghapus log" : "Hapus Log Terpilih"}
          >
            <i className="bx bx-trash" /> Hapus Terpilih ({selectedIds.size})
          </button>
          <button
            className={styles.btnGhost}
            onClick={handleClearAll}
            disabled={!isSuperadmin}
            style={{
              color: isSuperadmin ? "#f87171" : "var(--cv-text-mute)",
              opacity: !isSuperadmin ? 0.5 : 1,
              cursor: isSuperadmin ? "pointer" : "not-allowed",
            }}
            title={!isSuperadmin ? "Hanya Superadmin yang dapat membersihkan seluruh log" : "Bersihkan Semua Log"}
          >
            <i className="bx bx-brush" /> Bersihkan Semua
          </button>
          <button className={styles.btnGhost} onClick={fetchLogs} title="Refresh">
            <i className="bx bx-refresh" />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Cari username atau IP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280, padding: "8px 12px", background: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: 8, color: "var(--cv-text)", fontSize: 13 }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "var(--cv-ink-1)",
            border: "1px solid var(--cv-line-strong)",
            borderRadius: 8,
            color: "var(--cv-text)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <option value="all" style={{ background: "var(--cv-ink-2)", color: "var(--cv-text)" }}>Semua Status</option>
          <option value="success" style={{ background: "var(--cv-ink-2)", color: "var(--cv-text)" }}>Berhasil Saja</option>
          <option value="failed" style={{ background: "var(--cv-ink-2)", color: "var(--cv-text)" }}>Gagal Saja</option>
        </select>
        {selectedIds.size > 0 && (
          <span style={{ fontSize: 13, color: "var(--cv-orange)", fontWeight: 600 }}>
            {selectedIds.size} log terpilih
          </span>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat riwayat login...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--cv-text-mute)" }}>Tidak ada riwayat login</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 45, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    title="Pilih Semua"
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th>Waktu</th>
                <th>Pengguna / Akun</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>Perangkat / Browser</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} style={{ background: selectedIds.has(l.id) ? "color-mix(in srgb, var(--cv-orange) 8%, transparent)" : undefined }}>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(l.id)}
                      onChange={() => toggleSelectRow(l.id)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td style={{ fontSize: 12, color: "var(--cv-text-mute)", whiteSpace: "nowrap" }}>
                    {l.created_at ? new Date(l.created_at).toLocaleString("id-ID") : "—"}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: "var(--cv-text)", fontWeight: 700, fontSize: 13 }}>
                        {l.name || l.real_name || l.nama || l.username || "Admin"}
                      </span>
                      {l.username && (l.name || l.real_name || l.nama) && (l.name || l.real_name || l.nama).toLowerCase() !== l.username.toLowerCase() && (
                        <span style={{ fontSize: 11, color: "var(--cv-text-mute)", fontFamily: "monospace" }}>@{l.username}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    {l.status === "success" ? (
                      <span style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <i className="bx bx-check" /> Berhasil
                      </span>
                    ) : (
                      <span style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <i className="bx bx-x" /> Gagal
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--cv-text-mute)", fontFamily: "monospace" }}>{l.ip_address || "—"}</td>
                  <td style={{ fontSize: 11, color: "var(--cv-text-mute)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.user_agent}>
                    {l.user_agent || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── VISITOR LOCATIONS MANAGER ────────────────────────────────
function VisitorLocationsManager({ currentRole }: { currentRole?: string }) {
  const isSuperadmin = currentRole === "superadmin";
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/visitor/location");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLocations(json.data);
      }
    } catch {
      setToast({ msg: "Gagal memuat data lokasi pengunjung", type: "error" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const filtered = locations.filter((l) => {
    const q = search.toLowerCase();
    return (
      (l.ip_address && l.ip_address.toLowerCase().includes(q)) ||
      (l.page_path && l.page_path.toLowerCase().includes(q)) ||
      (l.user_agent && l.user_agent.toLowerCase().includes(q)) ||
      String(l.latitude).includes(q) ||
      String(l.longitude).includes(q)
    );
  });

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const toggleSelectRow = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDeleteSelected = async () => {
    if (!isSuperadmin) {
      setToast({
        msg: "Hanya Superadmin yang dapat menghapus data lokasi",
        type: "error",
      });
      return;
    }
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Hapus ${selectedIds.size} data lokasi terpilih?`)) return;

    try {
      const res = await fetch("/api/visitor/location", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: json.message, type: "success" });
        setSelectedIds(new Set());
        fetchLocations();
      } else {
        setToast({ msg: json.message, type: "error" });
      }
    } catch {
      setToast({ msg: "Gagal menghapus data lokasi", type: "error" });
    }
  };

  const handleClearAll = async () => {
    if (!isSuperadmin) {
      setToast({
        msg: "Hanya Superadmin yang dapat membersihkan seluruh log lokasi",
        type: "error",
      });
      return;
    }
    if (
      !window.confirm(
        "PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA riwayat lokasi pengunjung?"
      )
    )
      return;
    try {
      const res = await fetch("/api/visitor/location", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all" }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: json.message, type: "success" });
        setSelectedIds(new Set());
        fetchLocations();
      } else {
        setToast({ msg: json.message, type: "error" });
      }
    } catch {
      setToast({ msg: "Gagal membersihkan data lokasi", type: "error" });
    }
  };

  const uniqueIps = new Set(locations.map((l) => l.ip_address)).size;

  return (
    <div className={styles.sectionWrap}>
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-map-pin" style={{ color: "var(--cv-orange)" }} /> Lokasi Pengunjung (GPS)
          <span className={styles.count}>{locations.length} Titik Tercatat</span>
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={styles.btnGhost}
            onClick={handleDeleteSelected}
            disabled={!isSuperadmin || selectedIds.size === 0}
            style={{
              color: isSuperadmin && selectedIds.size > 0 ? "#ef4444" : "var(--cv-text-mute)",
              borderColor: isSuperadmin && selectedIds.size > 0 ? "#ef4444" : "var(--cv-line-strong)",
              opacity: !isSuperadmin ? 0.5 : 1,
              cursor: isSuperadmin ? "pointer" : "not-allowed",
            }}
            title={
              !isSuperadmin
                ? "Hanya Superadmin yang dapat menghapus data"
                : "Hapus Data Terpilih"
            }
          >
            <i className="bx bx-trash" /> Hapus Terpilih ({selectedIds.size})
          </button>
          <button
            className={styles.btnGhost}
            onClick={handleClearAll}
            disabled={!isSuperadmin}
            style={{
              color: isSuperadmin ? "#f87171" : "var(--cv-text-mute)",
              opacity: !isSuperadmin ? 0.5 : 1,
              cursor: isSuperadmin ? "pointer" : "not-allowed",
            }}
            title={
              !isSuperadmin
                ? "Hanya Superadmin yang dapat membersihkan data"
                : "Bersihkan Semua Data"
            }
          >
            <i className="bx bx-brush" /> Bersihkan Semua
          </button>
          <button
            className={styles.btnGhost}
            onClick={fetchLocations}
            title="Refresh"
          >
            <i className="bx bx-refresh" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "color-mix(in srgb, var(--cv-orange) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)", borderRadius: 10, padding: "12px 16px" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--cv-text-mute)", display: "block" }}>Total Koordinat Diterima</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--cv-orange)" }}>{locations.length}</span>
        </div>
        <div style={{ background: "color-mix(in srgb, var(--cv-orange) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--cv-orange) 25%, transparent)", borderRadius: 10, padding: "12px 16px" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--cv-text-mute)", display: "block" }}>Pengunjung / IP Unik</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--cv-orange-hi)" }}>{uniqueIps}</span>
        </div>
        <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", borderRadius: 10, padding: "12px 16px" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--cv-text-mute)", display: "block" }}>Status Izin Lokasi</span>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#34d399", marginTop: 4, display: "block" }}>Aktif (Sukarela)</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Cari IP, halaman, perangkat, atau koordinat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 360, padding: "8px 12px", background: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: 8, color: "var(--cv-text)", fontSize: 13 }}
        />
        {selectedIds.size > 0 && (
          <span style={{ fontSize: 13, color: "var(--cv-orange)", fontWeight: 600 }}>
            {selectedIds.size} data terpilih
          </span>
        )}
      </div>

      {loading ? (
        <div className={styles.loadingState}>
          <i className="bx bx-loader-alt bx-spin" /> Memuat data lokasi pengunjung...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--cv-text-mute)" }}>
          <i className="bx bx-map-pin" style={{ fontSize: "2.5rem", opacity: 0.4, display: "block", marginBottom: 8 }} />
          Belum ada data koordinat lokasi pengunjung yang masuk.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 45, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    title="Pilih Semua"
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th>Waktu</th>
                <th>IP Address</th>
                <th>Koordinat GPS</th>
                <th>Akurasi</th>
                <th>Halaman</th>
                <th>Perangkat / Browser</th>
                <th style={{ textAlign: "center" }}>Peta Google Maps</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  style={{
                    background: selectedIds.has(l.id)
                      ? "color-mix(in srgb, var(--cv-orange) 8%, transparent)"
                      : undefined,
                  }}
                >
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(l.id)}
                      onChange={() => toggleSelectRow(l.id)}
                      style={{ cursor: "pointer" }}
                    />
                  </td>
                  <td style={{ fontSize: 12, color: "var(--cv-text-mute)", whiteSpace: "nowrap" }}>
                    {l.visit_time
                      ? new Date(l.visit_time).toLocaleString("id-ID")
                      : l.created_at
                      ? new Date(l.created_at).toLocaleString("id-ID")
                      : "—"}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--cv-text-mute)", fontFamily: "monospace" }}>
                    {l.ip_address || "—"}
                  </td>
                  <td style={{ fontSize: 12, color: "var(--cv-text)", fontFamily: "monospace" }}>
                    {l.latitude}, {l.longitude}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, background: "rgba(16,185,129,0.12)", color: "#10b981", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
                      ±{Number(l.accuracy || 0).toFixed(0)}m
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--cv-orange)", fontWeight: 600 }}>
                    {l.page_path || "/"}
                  </td>
                  <td
                    style={{
                      fontSize: 11,
                      color: "var(--cv-text-mute)",
                      maxWidth: 220,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={l.user_agent}
                  >
                    {l.user_agent || "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <a
                      href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 10px",
                        borderRadius: 6,
                        background: "color-mix(in srgb, var(--cv-orange) 20%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--cv-orange) 40%, transparent)",
                        color: "var(--cv-orange)",
                        fontSize: 11,
                        fontWeight: 700,
                        textDecoration: "none",
                        cursor: "pointer",
                      }}
                      title="Buka titik koordinat langsung di Google Maps Satelit"
                    >
                      <i className="bx bx-map-pin" /> Buka Maps
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface NavGroup {
  id: string;
  label: string;
  icon: string;
  items: { key: Section; icon: string; label: string }[];
}

const navGroups: NavGroup[] = [
  {
    id: "keuangan_member",
    label: "Keanggotaan & Keuangan",
    icon: "bx-wallet",
    items: [
      { key: "adminanggotacava" as any, icon: "bx-id-card",      label: "Data Anggota CAVA" },
      { key: "keanggotaan" as any,      icon: "bx-user-check",   label: "Keanggotaan" },
      { key: "adminkontributor" as any, icon: "bx-heart-circle", label: "Kontributor" },
      { key: "adminkas" as any,         icon: "bx-wallet",       label: "Verifikasi Kas" },
      { key: "adminwartiket" as any,    icon: "bxs-flame",       label: "War Tiket STS" },
      { key: "admindonasi" as any,      icon: "bx-donate-heart", label: "Verifikasi Donasi" },
      { key: "adminmasterdata" as any,  icon: "bx-slider-alt",   label: "Master Data" },
      { key: "adminstruktur" as any,    icon: "bx-sitemap",      label: "Struktur Organisasi" },
      { key: "adminspreadsheet" as any, icon: "bx-table",        label: "Live Spreadsheet" },
      { key: "adminexcel" as any,        icon: "bxs-file-export", label: "Download Excel" },
    ],
  },
  {
    id: "utama",
    label: "Utama",
    icon: "bx-grid-alt",
    items: [
      { key: "dashboard",        icon: "bx-home-alt",     label: "Dashboard"   },
      { key: "recruitment",      icon: "bx-group",        label: "Recruitment" },
      { key: "roleapplications", icon: "bx-user-voice",   label: "Daftar Admin & Volunteer" },
      { key: "invitations",      icon: "bx-envelope",     label: "Undangan"    },
      { key: "anggotakota",      icon: "bx-map",          label: "Anggota Kota"},
    ],
  },
  {
    id: "konten",
    label: "Konten & Media",
    icon: "bx-layer",
    items: [
      { key: "news",        icon: "bx-news",         label: "News"        },
      { key: "timeline",    icon: "bx-map-pin",      label: "Milestone"   },
      { key: "gallery",     icon: "bx-image-alt",    label: "Gallery"     },
      { key: "youtube",     icon: "bxl-youtube",     label: "YouTube"     },
      { key: "media",       icon: "bx-folder-open",  label: "Media"       },
      { key: "updates",     icon: "bx-refresh",      label: "Updates"     },
    ],
  },
  {
    id: "erine",
    label: "Erine & Show",
    icon: "bx-star",
    items: [
      { key: "abouterine",  icon: "bx-image",        label: "About Erine" },
      { key: "kabesha",     icon: "bx-badge-check",  label: "Kabesha"     },
      { key: "funfacts",    icon: "bx-laugh",        label: "Funfacts"    },
      { key: "stats",       icon: "bx-bar-chart",    label: "Stats"       },
      { key: "setlists",    icon: "bx-music",        label: "Setlists"    },
      { key: "vcschedule",  icon: "bx-video",        label: "Video Call"  },
    ],
  },
  {
    id: "komunitas",
    label: "Komunitas & Interaksi",
    icon: "bx-conversation",
    items: [
      { key: "twoshot",     icon: "bx-camera",       label: "2S with Erine" },
      { key: "fanart",      icon: "bx-palette",      label: "Fanart Erine" },
      { key: "dengerine",   icon: "bx-headphone",    label: "Dengerine" },
      { key: "esport",      icon: "bx-trophy",       label: "Esport"      },
      { key: "journal",     icon: "bx-book-open",    label: "MemoRine"    },
      { key: "discord",     icon: "bxl-discord-alt", label: "Discord"     },
      { key: "bot",         icon: "bx-bot",          label: "Bot LINE"    },
      { key: "botmedia",    icon: "bx-video-recording", label: "Media Bot LINE" },
      { key: "linechat",    icon: "bx-chat",           label: "Live Chat LINE" },
      { key: "merch",       icon: "bx-store",        label: "Merchandise" },
      { key: "tickets",     icon: "bx-receipt",      label: "Tickets"     },
      { key: "calendar",    icon: "bx-calendar",     label: "Calendar"    },
    ],
  },
  {
    id: "sistem",
    label: "Manajemen Sistem",
    icon: "bx-cog",
    items: [
      { key: "users",        icon: "bx-user-pin",      label: "Manajemen Pengguna" },
      { key: "trash",        icon: "bx-trash",         label: "Tempat Sampah (Trash)" },
      { key: "activitylogs", icon: "bx-history",       label: "Riwayat Aktivitas"  },
      { key: "loginlogs",    icon: "bx-log-in-circle", label: "Riwayat Login"     },
      { key: "visitorlocations", icon: "bx-map-pin",   label: "Lokasi Pengunjung" },
    ],
  },
];

// ─── MAIN ─────────────────────────────────────────────────────
export default function AdminPage() {
  const { authed, role, username, checking, setAuthed, logout, applyUserData } = useAdminAuth();

  const [active, setActive] = useState<Section>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p) return p as Section;
    }
    return "dashboard";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const isSuperadmin = role === "superadmin";

  // Sembunyikan "Manajemen Sistem" jika bukan Super Admin
  const visibleNavGroups = navGroups.filter(g => {
    if (g.id === "sistem" && !isSuperadmin) return false;
    return true;
  });

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  if (checking) return (
    <AdminPortal>
      <div className={styles.adminRoot} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "var(--cv-orange)" }}>
          <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2.5rem", marginBottom: 12 }} />
          <div style={{ fontSize: "0.9rem", color: "var(--cv-text-mute)" }}>Memuat Cavallery Admin...</div>
        </div>
      </div>
    </AdminPortal>
  );

  if (!authed) return <LoginPage onLogin={(userData) => applyUserData(userData)} />;

  const navigate = (section: Section) => {
    const SYSTEM_SECTIONS = ["users", "trash", "activitylogs", "loginlogs", "visitorlocations"];
    if (SYSTEM_SECTIONS.includes(section as string) && !isSuperadmin) {
      setActive("dashboard");
      setDrawerOpen(false);
      return;
    }

    if ((section as string) === "adminanggotacava") {
      window.location.href = "/internal/dashboard-admin-xv7r2q/anggota";
      return;
    }
    if ((section as string) === "keanggotaan") {
      window.location.href = "/internal/dashboard-admin-xv7r2q/keanggotaan";
      return;
    }
    if ((section as string) === "adminkontributor") {
      window.location.href = "/internal/dashboard-admin-xv7r2q/kontributor";
      return;
    }
    if ((section as string) === "adminstruktur") {
      window.location.href = "/internal/dashboard-admin-xv7r2q/struktur";
      return;
    }
    if ((section as string) === "adminkas") {
      window.location.href = "/internal/dashboard-admin-xv7r2q/kas";
      return;
    }
    if ((section as string) === "adminwartiket") {
      window.location.href = "/internal/dashboard-admin-xv7r2q/kas?tab=war";
      return;
    }
    if ((section as string) === "admindonasi") {
      window.location.href = "/internal/dashboard-admin-xv7r2q/donasi";
      return;
    }
    if ((section as string) === "adminmasterdata") {
      window.location.href = "/internal/dashboard-admin-xv7r2q/master-data";
      return;
    }
    if ((section as string) === "adminspreadsheet") {
      window.open(
        "https://docs.google.com/spreadsheets/d/1t9PlUNLN2rdskLq-ZpellJI0umclokLm7G-DI-VnFXg/edit?gid=1846326647#gid=1846326647",
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }
    if ((section as string) === "adminexcel") {
      window.open("/api/admin/export-excel?type=matriks", "_blank");
      return;
    }
    setActive(section);
    setDrawerOpen(false);
  };

  // Helper to render accordion navigation
  const renderNav = () => (
    <nav className={styles.nav}>
      {visibleNavGroups.map(group => {
        const isCollapsed = Boolean(collapsedGroups[group.id]);
        const hasActiveChild = group.items.some(item => item.key === active);

        return (
          <div key={group.id} className={styles.navGroup}>
            <button
              type="button"
              className={styles.navGroupHeader}
              onClick={() => toggleGroup(group.id)}
              style={hasActiveChild ? { color: "var(--gold)" } : {}}
            >
              <div className={styles.navGroupHeaderLeft}>
                <i className={`bx ${group.icon}`} />
                <span>{group.label}</span>
              </div>
              <i className={`bx ${isCollapsed ? "bx-chevron-right" : "bx-chevron-down"} ${styles.navGroupArrow}`} />
            </button>

            {!isCollapsed && (
              <div className={styles.navGroupItems}>
                {group.items.map(n => (
                  <button
                    key={n.key}
                    className={`${styles.navItem} ${active === n.key ? styles.navActive : ""}`}
                    onClick={() => navigate(n.key)}
                  >
                    <i className={`bx ${n.icon}`} />
                    <span>{n.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const allItems = visibleNavGroups.flatMap(g => g.items);
  const currentTitle = allItems.find(n => n.key === active)?.label ?? "Dashboard";

  return (
    <AdminPortal>
      <style>{`
        .adm-root {
          --adm-bg:      var(--cv-ink);
          --adm-surface: var(--cv-ink-2);
          --adm-border:  var(--cv-line-strong);
          --adm-text:    var(--cv-text);
          --adm-muted:   var(--cv-text-mute);
          --adm-accent:  var(--cv-orange);
          --adm-danger:  #e05252;
          --adm-sidebar: 220px;
          --adm-topbar:  52px;
        }
      `}</style>

      <div className={`${styles.adminRoot} adm-root`}>

        {/* DESKTOP SIDEBAR */}
        <aside className={styles.sidebar}>
          <div className={styles.sideTop}>
            <div className={styles.sideLogo}>
              <i className="bx bxs-shield-alt-2" />
              <span>Cavallery</span>
            </div>
            {renderNav()}
          </div>
          <button className={styles.logoutBtn} onClick={logout}>
            <i className="bx bx-log-out" /> Keluar
          </button>
        </aside>

        {/* MOBILE DRAWER */}
        {drawerOpen && (
          <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
            <aside className={styles.drawer} onClick={e => e.stopPropagation()}>
              <div className={styles.sideTop}>
                <div className={styles.sideLogo}><i className="bx bxs-shield-alt-2" /><span>Cavallery</span></div>
                {renderNav()}
              </div>
              <button className={styles.logoutBtn} onClick={logout}><i className="bx bx-log-out" /> Keluar</button>
            </aside>
          </div>
        )}

        {/* MAIN AREA */}
        <div className={styles.mainArea}>
          <header className={styles.topbar}>
            <button className={styles.menuBtn} onClick={() => setDrawerOpen(true)}><i className="bx bx-menu" /></button>
            <div className={styles.topbarTitle}>{currentTitle}</div>
            <div className={styles.topbarRight}>
              <span
                className={styles.adminBadge}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 20,
                  background: role === "superadmin" ? "color-mix(in srgb, var(--cv-orange) 15%, transparent)" : "color-mix(in srgb, var(--cv-orange) 15%, transparent)",
                  border: `1px solid ${role === "superadmin" ? "color-mix(in srgb, var(--cv-orange) 40%, transparent)" : "color-mix(in srgb, var(--cv-orange) 40%, transparent)"}`,
                  color: role === "superadmin" ? "var(--cv-orange)" : "var(--cv-orange-hi)",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                <i className={`bx ${role === "superadmin" ? "bxs-badge-check" : "bx-shield"}`} />
                {role === "superadmin" ? "Super Admin" : "Admin"} ({username || "Admin"})
              </span>
              <button className={styles.logoutIconBtn} onClick={logout} title="Keluar"><i className="bx bx-log-out" /></button>
            </div>
          </header>

          <div className={styles.content}>
            {active === "dashboard"   ? <DashboardHome onNav={navigate} />
            : active === "recruitment"? <RecruitmentManager />
            : active === "roleapplications" ? <AdminErrorBoundary moduleName="Pendaftaran Admin & Volunteer"><RoleApplicationsManager /></AdminErrorBoundary>
            : active === "esport"     ? <EsportManager />
            : active === "invitations"? <InvitationsManager />
            : active === "media"      ? <MediaManager />
            : active === "discord"    ? <DiscordManager />
            : active === "journal"    ? <JournalManager />
            : active === "bot"        ? <BotManager onNavigate={navigate} />
            : active === "botmedia"   ? <BotMediaManager onNavigate={navigate} />
            : active === "linechat"   ? <AdminErrorBoundary moduleName="Live Chat LINE"><LineChatManager /></AdminErrorBoundary>
            : active === "tickets"    ? <TicketsManager />
            : active === "calendar"   ? <CalendarManager />
            : active === "updates"    ? <UpdatesManager />
            : active === "vcschedule" ? <VcScheduleManager />
            : active === "abouterine" ? <AboutErineManager />
            : active === "anggotakota"? <AnggotaKotaManager />
            : active === "merch"      ? <MerchandiseManager />
            : active === "fanart"     ? <FanartManager />
            : active === "twoshot"    ? <TwoShotManager />
            : active === "dengerine"  ? <DengerineManager />
            : active === "users"      ? (isSuperadmin ? <UsersManager currentRole={role} currentUsername={username} /> : <div style={{ padding: 48, textAlign: "center", color: "#f87171" }}><i className="bx bx-shield-x" style={{ fontSize: "3rem", marginBottom: 12, display: "block" }} />Akses Ditolak: Fitur Manajemen Sistem hanya dapat diakses oleh Super Admin.</div>)
            : active === "trash"      ? <TrashManager currentRole={role} currentUsername={username} />
            : active === "activitylogs"? (isSuperadmin ? <ActivityLogsManager currentRole={role} currentUsername={username} /> : <div style={{ padding: 48, textAlign: "center", color: "#f87171" }}><i className="bx bx-shield-x" style={{ fontSize: "3rem", marginBottom: 12, display: "block" }} />Akses Ditolak: Fitur Manajemen Sistem hanya dapat diakses oleh Super Admin.</div>)
            : active === "loginlogs"  ? (isSuperadmin ? <LoginLogsManager currentRole={role} currentUsername={username} /> : <div style={{ padding: 48, textAlign: "center", color: "#f87171" }}><i className="bx bx-shield-x" style={{ fontSize: "3rem", marginBottom: 12, display: "block" }} />Akses Ditolak: Fitur Manajemen Sistem hanya dapat diakses oleh Super Admin.</div>)
            : active === "visitorlocations"? (isSuperadmin ? <VisitorLocationsManager currentRole={role} /> : <div style={{ padding: 48, textAlign: "center", color: "#f87171" }}><i className="bx bx-shield-x" style={{ fontSize: "3rem", marginBottom: 12, display: "block" }} />Akses Ditolak: Fitur Manajemen Sistem hanya dapat diakses oleh Super Admin.</div>)
            : <SectionManager section={active} />}
          </div>
        </div>
      </div>
    </AdminPortal>
  );
}

