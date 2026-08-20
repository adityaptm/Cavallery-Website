
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./page.module.css";

const api = (path: string) => (path.startsWith("/api") ? path : `/api${path}`);
const merchApi = (path: string) => (path.startsWith("/api/merch") ? path : `/api/merch${path}`);

const DISCORD_API = "/api/discord";

type Section =
  | "dashboard" | "news"     | "timeline" | "gallery"
  | "setlists"  | "stats"    | "youtube"  | "funfacts"
  | "kabesha"   | "media"    | "discord"  | "journal"
  | "bot"       | "tickets"  | "calendar" | "updates" 
  | "vcschedule" | "abouterine" | "anggotakota" | "merch" | "invitations";


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

// ─── ADMIN PORTAL ─────────────────────────────────────────────
function AdminPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const siteHeader = document.querySelector("header") as HTMLElement | null;
    const siteNav    = document.querySelector("nav")    as HTMLElement | null;
    if (siteHeader) siteHeader.style.display = "none";
    if (siteNav)    siteNav.style.display    = "none";
    document.body.style.overflow = "hidden";
    setMounted(true);
    return () => {
      if (siteHeader) siteHeader.style.display = "";
      if (siteNav)    siteNav.style.display    = "";
      document.body.style.overflow = "";
    };
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

// ─── AUTH HOOK (PENGGANTI sessionStorage — server-side verified) ──────────────
function useAdminAuth() {
  const [authed,   setAuthed]   = useState(false);
  const [checking, setChecking] = useState(true);

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
        setAuthed(data.status === true && data.valid === true);
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

  return { authed, checking, setAuthed, logout };
}

// ─── LOGIN PAGE (auth via API → httpOnly cookie) ──────────────
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [user, setUser]       = useState("");
  const [pass, setPass]       = useState("");
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
        body:        JSON.stringify({ username: user, password: pass }),
      });

      const data = await res.json();

      if (data.status) {
        // Token disimpan di httpOnly cookie oleh server
        // Tidak ada yang bisa dimanipulasi dari browser console
        onLogin();
      } else {
        if (res.status === 429) {
          setErr("Terlalu banyak percobaan login. Coba lagi dalam 15 menit.");
        } else {
          setErr(data.message || "Username atau password salah.");
        }
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
          <div className={styles.loginCard}>
            <div className={styles.loginLogo}><i className="bx bxs-shield-alt-2" /></div>
            <h1 className={styles.loginTitle}>Cavallery Admin</h1>
            <p className={styles.loginSub}>Masuk untuk mengelola konten</p>
            {err && <div className={styles.errMsg}><i className="bx bx-error-circle" /> {err}</div>}
            <div className={styles.field}>
              <label>Username</label>
              <input
                value={user}
                onChange={e => setUser(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div className={styles.field}>
              <label>Password</label>
              <input
                type="password"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                disabled={loading}
                onKeyDown={e => e.key === "Enter" && submit()}
              />
            </div>
            <button className={styles.loginBtn} onClick={submit} disabled={loading}>
              {loading ? <><i className="bx bx-loader-alt bx-spin" /> Masuk...</> : "Masuk"}
            </button>
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
function DataTable({ cols, rows, onEdit, onDelete }: {
  cols: { key: string; label: string }[];
  rows: any[];
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={`${styles.table} ${styles.responsiveTable}`}>
        <thead>
          <tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}<th>Aksi</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length + 1} className={styles.empty}><i className="bx bx-inbox" /> Tidak ada data</td></tr>
          ) : rows.map((row, i) => (
            <tr key={row.id ?? row.stat_key ?? i}>
              {cols.map(c => (
                <td key={c.key} data-label={c.label}>{
                  typeof row[c.key] === "boolean" ? (row[c.key] ? "✓" : "✗") :
                  c.key === "image_url" && row[c.key] ? <img src={row[c.key]} alt="" className={styles.thumb} /> :
                  Array.isArray(row[c.key]) ? row[c.key].join(", ").slice(0, 60) :
                  String(row[c.key] ?? "-").slice(0, 60)
                }</td>
              ))}
              <td data-label="Aksi">
                <div className={styles.actionBtns}>
                  <button className={styles.btnEdit} onClick={() => onEdit(row)}><i className="bx bx-edit" /></button>
                  <button className={styles.btnDel}  onClick={() => onDelete(row)}><i className="bx bx-trash" /></button>
                </div>
              </td>
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
  onUploaded: (url: string) => void;
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
        const res  = await fetch(mediaApi("/media/upload"), { method: "POST", body: fd });
        const json = await res.json();
        if (json.status) {
          setProgress([`✓ ${files[0].name} — berhasil`]);
          onUploaded(json.data.public_url);
        } else {
          setProgress([`✗ ${files[0].name} — ${json.message}`]);
        }
      } catch {
        setProgress([`✗ ${files[0].name} — error jaringan`]);
      }
    } else {
      const fd = new FormData();
      files.forEach(f => fd.append("files[]", f));
      fd.append("folder", folder);
      try {
        const res  = await fetch(mediaApi("/media/upload-multiple"), { method: "POST", body: fd });
        const json = await res.json();
        const logs: string[] = [];
        (json.data?.uploaded ?? []).forEach((u: any) => logs.push(`✓ ${u.original_name}`));
        (json.data?.errors   ?? []).forEach((e: any) => logs.push(`✗ ${e.name} — ${e.reason}`));
        setProgress(logs);
        if (json.data?.uploaded?.length > 0) onUploaded(json.data.uploaded[0].public_url);
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
      params.set("limit", "100");
      const res  = await fetch(`${mediaApi("/media")}&${params}`);
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
                        src={item.public_url}
                        alt={item.alt_text || item.original_name}
                        className={styles.mediaThumbImg}
                        loading="lazy"
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

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

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
      params.set("limit", "100");
      const res  = await fetch(`${mediaApi("/media")}&${params}`);
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
    const isCurrentlyPub = publishedIds.has(item.id) || publishedIds.has(item.public_url);
    const newStatus = !isCurrentlyPub;
    try {
      const res = await fetch("/api/published-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", id: item.id }),
      });
      if (res.ok) {
        setPublishedIds(prev => {
          const next = new Set(prev);
          if (newStatus) {
            next.add(item.id);
            next.add(item.public_url);
          } else {
            next.delete(item.id);
            next.delete(item.public_url);
          }
          return next;
        });
        showToast(
          newStatus
            ? `"${item.original_name}" DITERBITKAN ke About Cavallery!`
            : `"${item.original_name}" DISEMBUNYIKAN (hanya tersimpan di media)`,
          "success"
        );
      }
    } catch {
      showToast("Gagal mengubah status publikasi", "error");
    }
  };

  const deleteOne = async (item: any) => {
    setConfirm(null);
    try {
      const res  = await fetch(mediaApi(`/media/${item.id}`), { method: "DELETE" });
      const json = await res.json();
      if (json.status) {
        showToast("Media berhasil dihapus", "success");
        load();
      } else if (res.status === 404 || (json.message && json.message.toLowerCase().includes("tidak ditemukan"))) {
        showToast("File sudah tidak ada di server, dibersihkan dari tampilan.", "success");
        setItems(prev => prev.filter(i => i.id !== item.id));
        setTotal(prev => Math.max(0, prev - 1));
      } else {
        showToast(json.message || "Gagal menghapus", "error");
      }
    } catch {
      showToast("Error jaringan", "error");
    }
  };

  const deleteBulk = async () => {
    setConfirm(null);
    try {
      const res  = await fetch(mediaApi("/media/bulk"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const json = await res.json();
      if (json.status) {
        showToast(`${selected.size} media dihapus`, "success");
        setSelected(new Set());
        load();
      } else if (res.status === 404 || (json.message && json.message.toLowerCase().includes("tidak ditemukan"))) {
        showToast("File yang tidak ditemukan telah dibersihkan dari daftar.", "success");
        setItems(prev => prev.filter(i => !selected.has(i.id)));
        setTotal(prev => Math.max(0, prev - selected.size));
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
          onUploaded={() => { setShowUpload(false); load(); }}
        />
      )}

      {publishModal && (
        <div className={styles.modalOverlay} onClick={() => setPublishModal(null)}>
          <div className={styles.formModal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className={styles.formModalHeader}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <i className="bx bx-image" style={{ color: "#c9a84c" }} /> Tampilkan Foto ke Gallery Web
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
                  <small style={{ color: "#888", display: "block", marginTop: -4 }}>
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
        <div style={{ display: "flex", gap: 8 }}>
          {selected.size > 0 && (
            <button className={styles.btnDanger} onClick={() => setConfirm({ bulk: true })}>
              <i className="bx bx-trash" /> Hapus ({selected.size})
            </button>
          )}
          <button className={styles.btnPrimary} onClick={() => setShowUpload(true)}>
            <i className="bx bx-upload" /> Upload
          </button>
        </div>
      </div>

      <div style={{
        background: "rgba(201, 168, 76, 0.08)",
        border: "1px solid rgba(201, 168, 76, 0.25)",
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 16,
        fontSize: "0.85rem",
        color: "#d6cebf",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <i className="bx bx-shield-quarter" style={{ fontSize: "1.3rem", color: "#c9a84c", flexShrink: 0 }} />
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
          {items.map(item => {
            const sel = selected.has(item.id);
            const isPub = publishedIds.has(item.id) || publishedIds.has(item.public_url) || publishedIds.has(item.file_name);
            return (
              <div key={item.id} className={`${styles.mediaCard} ${sel ? styles.mediaCardSelected : ""}`}>
                <div className={styles.mediaCheckbox} onClick={() => toggleSelect(item.id)}>
                  <i className={`bx ${sel ? "bx-checkbox-checked" : "bx-checkbox"}`} />
                </div>
                {item.type === "video" ? (
                  <div className={styles.videoThumb}>
                    <i className="bx bx-video-recording" style={{ fontSize: "2.5rem" }} />
                  </div>
                ) : (
                  <img src={item.public_url} alt={item.alt_text || item.original_name} className={styles.mediaCardImg} loading="lazy" />
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
                        background: isPub ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.06)",
                        color: isPub ? "#10b981" : "#888",
                        border: `1px solid ${isPub ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.1)"}`,
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
                    title={isPub ? "Sembunyikan dari About Cavallery" : "Terbitkan ke About Cavallery"}
                    onClick={() => togglePublish(item)}
                    className={styles.btnEdit}
                    style={{ color: isPub ? "#10b981" : "#aaa" }}
                  >
                    <i className={`bx ${isPub ? "bx-show" : "bx-hide"}`} />
                  </button>
                  {item.type === "image" && (
                    <button
                      title="Terbitkan ke Gallery Web"
                      onClick={() => openPublish(item)}
                      className={styles.btnEdit}
                      style={{ color: "#c9a84c" }}
                    >
                      <i className="bx bx-image-add" />
                    </button>
                  )}
                  <button title="Salin URL" onClick={() => navigator.clipboard.writeText(item.public_url)} className={styles.btnEdit}><i className="bx bx-copy" /></button>
                  <a href={item.public_url} target="_blank" rel="noreferrer" className={styles.btnEdit} title="Buka"><i className="bx bx-link-external" /></a>
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
  time: string;
  title: string;
  mention: string;
  hasImage: boolean;
  url?: string;
}

function DiscordManager() {
  const [title,    setTitle]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [url,      setUrl]      = useState("https://cavallery.id");
  const [image,    setImage]    = useState("");
  const [mention,  setMention]  = useState("");
  const [sending,  setSending]  = useState(false);
  const [logs,     setLogs]     = useState<DiscordLog[]>([]);
  const [toast,    setToast]    = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const STORAGE_KEY = "cava_discord_logs";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLogs(JSON.parse(raw));
    } catch {}
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
      if (urlVal && !urlVal.startsWith("http")) urlVal = "https://" + urlVal;
      let imgVal   = image.trim();
      if (imgVal && !imgVal.startsWith("http")) imgVal = "https://" + imgVal;

      const payload = {
        title: "📌 " + title.trim(),
        description: desc.trim() + "\n\n🕐 " + time,
        url: urlVal, link: urlVal,
        mention: mention || "",
        image: imgVal, image_url: imgVal, imageUrl: imgVal,
      };

      const res = await fetch(DISCORD_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("✅ Berhasil dikirim ke Discord!", "success");
        const newLog: DiscordLog = { time, title: title.trim(), mention: mention || "—", hasImage: !!image.trim(), url: urlVal };
        saveLogs([newLog, ...logs].slice(0, 30));
        setTitle(""); setDesc(""); setImage(""); setMention("");
      } else {
        const body = await res.text();
        showToast(`❌ Gagal (${res.status}): ${body.slice(0, 80)}`, "error");
      }
    } catch (e: any) {
      showToast("❌ Error jaringan: " + (e?.message ?? "unknown"), "error");
    }
    setSending(false);
  };

  const clearLogs = () => { saveLogs([]); setConfirmClear(false); showToast("Log dihapus", "success"); };

  const embedColor = mention === "@everyone" ? "#e05252" : mention === "@here" ? "#d97706" : "#5865f2";

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmClear && <ConfirmModal msg="Hapus semua riwayat pengiriman Discord?" onConfirm={clearLogs} onCancel={() => setConfirmClear(false)} />}
      {showPicker && <MediaPickerModal type="image" onPick={url => { setImage(url); setShowPicker(false); }} onClose={() => setShowPicker(false)} />}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bxl-discord-alt" style={{ color: "#5865f2" }} /> Discord Notifier
        </h2>
      </div>

      <div className={styles.discordLayout}>
        <div className={styles.discordForm}>
          <div className={styles.discordFormInner}>
            <div className={styles.field}>
              <label>Judul Update <span style={{ color: "#e05252" }}>*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Masukkan judul pengumuman..." maxLength={256} />
              <span style={{ fontSize: 11, color: "#555", textAlign: "right" }}>{title.length}/256</span>
            </div>
            <div className={styles.field}>
              <label>Deskripsi <span style={{ color: "#e05252" }}>*</span></label>
              <textarea rows={6} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Tulis detail pengumuman di sini..." maxLength={2000} />
              <span style={{ fontSize: 11, color: "#555", textAlign: "right" }}>{desc.length}/2000</span>
            </div>
            <div className={styles.field}>
              <label>URL Website</label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://cavallery.id" />
            </div>
            <div className={styles.field}>
              <label>Gambar <span style={{ color: "#777", fontWeight: 400 }}>(opsional)</span></label>
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
                  <button key={m} onClick={() => setMention(m)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "1px solid", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", borderColor: mention === m ? (m === "@everyone" ? "#e05252" : m === "@here" ? "#d97706" : "#5865f2") : "#333", background: mention === m ? (m === "@everyone" ? "#3a1a1a" : m === "@here" ? "#2a1e10" : "#1a1d3a") : "transparent", color: mention === m ? (m === "@everyone" ? "#e05252" : m === "@here" ? "#f59e0b" : "#7289da") : "#777" }}>
                    {m || "Tanpa Mention"}
                  </button>
                ))}
              </div>
            </div>
            <button className={styles.btnPrimary} onClick={send} disabled={sending || !title.trim() || !desc.trim()} style={{ width: "100%", justifyContent: "center", padding: "0.65rem", fontSize: "0.9rem", background: sending ? "#333" : "linear-gradient(135deg, #5865f2, #7289da)", color: "#fff" }}>
              {sending ? <><i className="bx bx-loader-alt bx-spin" /> Mengirim ke Discord...</> : <><i className="bx bxl-discord-alt" /> Kirim Sekarang</>}
            </button>
          </div>
        </div>

        <div className={styles.discordRight}>
          <div className={styles.discordPreviewCard}>
            <p className={styles.discordPreviewLabel}><i className="bx bx-show" /> Preview Embed</p>
            <div className={styles.discordEmbed} style={{ borderLeftColor: embedColor }}>
              {mention && <div className={styles.discordMention} style={{ color: mention === "@everyone" ? "#e05252" : "#f59e0b", background: mention === "@everyone" ? "#3a1a1a" : "#2a1e10" }}>{mention}</div>}
              <div className={styles.discordEmbedTitle}>{title ? "📌 " + title : <span style={{ opacity: 0.3 }}>Judul pengumuman...</span>}</div>
              <div className={styles.discordEmbedDesc}>
                {desc ? desc.split("\n").map((line, i) => <span key={i}>{line}<br /></span>) : <span style={{ opacity: 0.3 }}>Deskripsi pengumuman...</span>}
                {desc && <><br /><span style={{ opacity: 0.5, fontSize: 11 }}>🕐 {now()}</span></>}
              </div>
              {image && <img src={image} alt="embed" className={styles.discordEmbedImg} onError={e => (e.currentTarget.style.display = "none")} />}
              {url && (
                <div className={styles.discordEmbedUrl}>
                  <a
                    href={url.startsWith("http") ? url : `https://${url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#5865f2", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
                  >
                    <i className="bx bx-link-external" style={{ fontSize: 12 }} /> {url}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className={styles.discordLogsCard}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p className={styles.discordPreviewLabel} style={{ margin: 0 }}><i className="bx bx-history" /> Riwayat ({logs.length})</p>
              {logs.length > 0 && <button className={styles.btnDel} style={{ width: "auto", height: "auto", padding: "3px 10px", fontSize: 11, borderRadius: 6 }} onClick={() => setConfirmClear(true)}>Hapus Log</button>}
            </div>
            {logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", opacity: 0.3, fontSize: 13 }}>
                <i className="bx bx-inbox" style={{ fontSize: "2rem", display: "block", marginBottom: 4 }} />
                Belum ada riwayat
              </div>
            ) : (
              <div className={styles.discordLogList}>
                {logs.map((log, i) => (
                  <div key={i} className={styles.discordLogItem}>
                    <div className={styles.discordLogTitle}>{log.title}</div>
                    <div className={styles.discordLogMeta}>
                      <span>{log.time}</span>
                      {log.mention !== "—" && <span style={{ background: log.mention === "@everyone" ? "#3a1a1a" : "#2a1e10", color: log.mention === "@everyone" ? "#e05252" : "#f59e0b", padding: "1px 6px", borderRadius: 4, fontSize: 10 }}>{log.mention}</span>}
                      {log.hasImage && <span style={{ color: "#5865f2", fontSize: 10 }}><i className="bx bx-image" /> gambar</span>}
                      {log.url && (
                        <a
                          href={log.url.startsWith("http") ? log.url : `https://${log.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#3b82f6", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 2, textDecoration: "underline" }}
                          title={log.url}
                        >
                          <i className="bx bx-link-external" /> {log.url.replace(/^https?:\/\//, "").slice(0, 25)}{log.url.replace(/^https?:\/\//, "").length > 25 ? "…" : ""}
                        </a>
                      )}
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

const DEFAULT_JOURNAL_MESSAGES: JournalMessage[] = [
  { id: 1, name: "lalallalalala", msg: "haloo ci erinee sayangg!! tauu gaa kehidupan aku jadi lebih berwarna saat ada ci erineee, ci erine tu uda aku anggap seperti kaka kandung tauuu ya walaupun ci erine gatau aku hidup huhuhu soalnya belum bisa vc in another day akuu vc ya ci tunggu akuu!!!, bertahan lebih lama di jkt48 ya ci!! aku adalah salah satu orang yang bangga smaa ciciii, HARUS SELALU PERCAYA DIRI YA CII OKAIIII, aku tau banyak yang selalu dukung ciciii, I LOVE U CATHERINA VALLENCIA KETUA BEBEK KUUUU🐣🤍", date: "9 Mar 2026, 19.50", rawDate: "2026-03-09T12:50:42.000Z" },
  { id: 2, name: "Dinda duyoung ", msg: "Hai ci erine semangat terus yaa kegiatannya jaga kesehatannya jugaa apalagi sekarang kamu lagi sibuk\"nya latihan buat shonici setlist baru dan mv baru juga yaa semangat yaa, minum air putih yang cukup sehat\" cerine 🤍🍀. Cinta kamu banget 🫶🏻 jujur kangen 🥹", date: "12 Mar 2026, 21.25", rawDate: "2026-03-12T14:25:54.000Z" },
  { id: 3, name: "faiz mahmud", msg: "hai erine! bagaimana kabarmu? semoga kamu sehat selalu ya. jangan jaga kesehatan, istirahat yang cukup, dan bersemangat dalam menjalani hari yang penuh dengan seribu kejutan. udah deh itu aja o ya sebelum itu aku punya kata-kata untuk erine agar semangat dalam menjalani hari. kata-kata hari ini= jalani hidupmu dengan sungguh-sungguh agar hati mu tetap teguh", date: "15 Mar 2026, 20.48", rawDate: "2026-03-15T13:48:05.000Z" },
  { id: 4, name: "vernx ", msg: "Hai ci Erine semangat terus ya, jaga kesehatan selalu pokoknya apapun kegiatannya tetap semangat. Aku yakin kamu pasti bisa dan mampu untuk melakukannya dengan terbaik. Aku akan terus menemani perjalananmu sampai akhir, ci Erine kamu itu hebat, keren, luar biasa jadi jangan pernah merasa bahwa dirimu itu tidak layak ataupun tidak cocok untuk mendapatkan dukungan dan kebahagiaan yang dirasakan di JKT48. Ci Erine oshi kesayanganku yang tidak pernah tergantikan aku cuma mau bilang, tolong bertahan lebih lama di JKT48 kita sama-sama berjuang bikin chapter yang indah dan raih mimpi-mimpi besarmu. I love Ci Erine 🫶🏻💌", date: "19 Mar 2026, 09.55", rawDate: "2026-03-19T02:55:07.000Z" },
  { id: 5, name: "dhafinnn", msg: "semangat yaa dalam menjalani semuanya, you are stronger than you think. you dont have to carry it all alone, we've got your back. sehat sehat terus yaaaa 🤍", date: "19 Mar 2026, 23.52", rawDate: "2026-03-19T16:52:14.000Z" },
  { id: 6, name: "R_Syaa (aisyah_adl) ", msg: "Hai kak ci erine! minal aidzin wal faidzin, mohon maaf lahir dan batin yaa kakk🙏🏻 kakak semangattt terus yaaa kakk! aku selalu mendukung apapun yang kakak lakukan, terimakasih untuk semua kerja keras kak erine! kak ci erine hebat! aku sayang banget sama kak erine 🫂🤍", date: "20 Mar 2026, 02.51", rawDate: "2026-03-19T19:51:21.000Z" },
  { id: 7, name: "dari yg punya akun: jasjusscoklat", msg: "KA RINEEE TERIMAKASI YAA SUDAH HADIRR MEMBAWA BANYAK KEJUTANNN DAN BAHAGIAAA, you're the sun to the moon, eak~😝✌🏻✌🏻", date: "20 Mar 2026, 21.43", rawDate: "2026-03-20T14:43:39.000Z" },
  { id: 8, name: "odi", msg: "halowww erine terima kasih atas kerja keras dan semangatmu dari awal sampai sekarang! jaga kesehatan karna itu sangat sangat penting!😡", date: "20 Mar 2026, 22.55", rawDate: "2026-03-20T15:55:20.000Z" },
  { id: 9, name: "Jaden A.", msg: "kamu adalah manusia yang paling dinantikan kehadirannya oleh banyak orang. sehat selalu dan bahagia selalu manusia baik", date: "24 Mar 2026, 22.15", rawDate: "2026-03-24T15:15:59.000Z" },
  { id: 10, name: "Alisha", msg: "Hi Ci Erinee ^^ Semangat terus yaa, selalu ada banyak orang yang akan selalu support cicii! Love sekebonn ( *¯ ³¯*)♡", date: "28 Mar 2026, 22.01", rawDate: "2026-03-28T15:01:07.000Z" }
];

function JournalManager() {
  const [messages, setMessages] = useState<JournalMessage[]>([]);
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
    try {
      const res = await fetch("/api/journal", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        const loaded = arr.map((item: any, idx: number) => ({
          id: item.id || (idx + 1),
          name: item.name || "Anonim",
          msg: item.msg || item.pesan || "",
          date: item.date ? new Date(item.date).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-",
          rawDate: item.date || ""
        }));
        setMessages(loaded);
      } else {
        setMessages([]);
      }
    } catch {
      setMessages([]);
    }
    // Clean up any stale localStorage cache
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("cavallery_journal"); } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSender.trim() || !newMessage.trim()) { showToast("Nama dan pesan wajib diisi", "error"); return; }
    setSaving(true);

    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSender.trim(), msg: newMessage.trim() })
      });
      const json = await res.json();
      if (json.status) {
        showToast("Pesan berhasil disematkan!", "success");
        setNewSender("");
        setNewMessage("");
        setShowAddModal(false);
        await load();
      } else {
        showToast(json.message || "Gagal menambahkan pesan", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    }
    setSaving(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage) return;
    if (!editSender.trim() || !editMessageText.trim()) { showToast("Nama dan pesan wajib diisi", "error"); return; }
    setSaving(true);

    try {
      const res = await fetch("/api/journal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedMessage.id, name: editSender.trim(), msg: editMessageText.trim() })
      });
      const json = await res.json();
      if (json.status) {
        showToast("Pesan berhasil diperbarui!", "success");
        setShowEditModal(false);
        setSelectedMessage(null);
        await load();
      } else {
        showToast(json.message || "Gagal memperbarui pesan", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/journal?id=${confirmDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status) {
        showToast("Pesan berhasil dihapus!", "success");
        setConfirmDelete(null);
        await load();
      } else {
        showToast(json.message || "Gagal menghapus pesan", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    }
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
        <h2 className={styles.sectionTitle}><i className="bx bx-book-open" style={{ color: "#db2777" }} /> Journal MemoRine<span className={styles.count}>{messages.length} pesan</span></h2>
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
                  <td style={{ fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</td>
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
  apiKey: "AIzaSyA6SbeC1Ktwu1l1nC2ES1WF3kQagN0NiX0",
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
    { id: "rule_12", triggers: [["cavallery", "fanbase"]], response: "Cavallery adalah fanbase resmi pendukung Catherina Vallencia (Erine) JKT48! Dibentuk tanggal 18 November 2023, bertepatan dengan debut Erine. Kita solid banget lho, yuk gabung!" },
    { id: "rule_13", triggers: [["ssk", "sousenkyo", "rank", "peringkat"]], response: "Erine berhasil meraih peringkat ke-18 di SSK JKT48 2024 dan masuk to jajaran Undergirls! Keren banget kan? Selama SSK juga ada maskot Cavallery bernama Rinara si bebek lucu." },
    { id: "rule_14", triggers: [["team", "tim", "passion"]], response: "Erine sekarang ada di Team Passion! Dia dipromosikan jadi member inti JKT48 pada 25 Oktober 2025 saat event Sister Reunion. Bangga banget sama pencapaiannya!" },
    { id: "rule_15", triggers: [["zodiak", "leo"]], response: "Zodiak Erine itu Leo karena lahir tanggal 21 Agustus! Cocok banget sama kepribadiannya yang percaya diri dan bersinar di panggung." },
    { id: "rule_16", triggers: [["brand", "ambassador", "bihunku", "freefire", "free fire"]], response: "Erine menjadi Brand Ambassador BihunKu dan FreeFire bareng member JKT48 lainnya. Keren banget ya bisa jadi BA brand besar!" },
    { id: "rule_17", triggers: [["halo", "hai", "hey", "hi ", "hi"]], response: "Halo juga! Aku asisten dari Jenderal Cavallery. Mau tanya apa nih soal Erine? Aku siap bantu!" },
    { id: "rule_18", triggers: [["lagi apa", "kabar", "gimana", "apa kabar"]], response: "Erine lagi sibuk banget nih sama kegiatan JKT48 di Team Passion! Jadwal teater, latihan setlist, dan berbagai event seru lainnya. Kalau mau tau jadwal shownya, cek aja di halaman utama Cavallery ya!" },
    { id: "rule_19", triggers: [["terima kasih", "makasih", "thanks", "thx"]], response: "Sama-sama ya! Seneng bisa bantu. Jangan lupa terus dukung Erine dan Cavallery ya!" }
  ]
};

function BotManager() {
  const [config, setConfig] = useState<BotConfig>(DEFAULT_BOT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showRuleModal, setShowRuleModal] = useState<"add" | "edit" | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [ruleGroups, setRuleGroups] = useState<string[]>([""]);
  const [ruleResponse, setRuleResponse] = useState("");

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bot-config", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.status && json.data) {
          setConfig(json.data);
        }
      }
    } catch {}
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("cavallery_bot_config"); } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: config.apiKey, fallbackResponse: config.fallbackResponse })
      });
      const json = await res.json();
      if (json.status) {
        showToast("Konfigurasi umum berhasil disimpan!", "success");
        await load();
      } else {
        showToast(json.message || "Gagal menyimpan", "error");
      }
    } catch {
      showToast("Gagal menyimpan", "error");
    }
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

    try {
      const res = await fetch("/api/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: config.apiKey, fallbackResponse: config.fallbackResponse, rules: updatedRules })
      });
      const json = await res.json();
      if (json.status) {
        showToast("Aturan pesan berhasil disimpan!", "success");
        setShowRuleModal(null);
        await load();
      } else {
        showToast(json.message || "Gagal menyimpan", "error");
      }
    } catch {
      showToast("Gagal menyimpan", "error");
    }
    setSaving(false);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!config || !confirm("Hapus aturan pesan ini?")) return;
    const updatedRules = (config.rules || []).filter(r => r.id !== ruleId);
    try {
      const res = await fetch("/api/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: config.apiKey, fallbackResponse: config.fallbackResponse, rules: updatedRules })
      });
      const json = await res.json();
      if (json.status) {
        showToast("Aturan pesan dihapus", "success");
        await load();
      } else {
        showToast(json.message || "Gagal menghapus", "error");
      }
    } catch {
      showToast("Gagal menghapus", "error");
    }
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

      <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}><i className="bx bx-bot" style={{ color: "#db2777" }} /> Asisten Bot Cavallery</h2></div>

      {config && (
        <form onSubmit={handleSaveGeneral} style={{ background: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: 16, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><i className="bx bx-cog" /> Pengaturan Umum Bot</h3>
          <div className={styles.field} style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span>Gemini API Key</span><span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Kosongkan untuk mode fallback</span></label>
            <input type="password" value={config.apiKey} onChange={e => setConfig({ ...config, apiKey: e.target.value })} placeholder="Masukkan Gemini API Key..." style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "10px 14px", fontSize: "0.9rem" }} />
          </div>
          <div className={styles.field} style={{ marginBottom: 20 }}>
            <label>Pesan Default (Jika tidak ada kecocokan & Gemini offline)</label>
            <textarea rows={3} value={config.fallbackResponse} onChange={e => setConfig({ ...config, fallbackResponse: e.target.value })} placeholder="Masukkan balasan default..." required style={{ width: "100%", background: "#111", color: "#fff", border: "1px solid var(--adm-border)", borderRadius: 6, padding: "10px 14px", fontSize: "0.9rem", resize: "vertical" }} />
          </div>
          <button type="submit" className={styles.btnPrimary} disabled={saving}>{saving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Pengaturan Umum</>}</button>
        </form>
      )}

      <div className={styles.sectionHeader} style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: "1.1rem", margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}><i className="bx bx-list-ul" /> Aturan Respon Kustom ({config?.rules.length || 0})</h3>
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
                          {idx > 0 && <span style={{ fontSize: "0.7rem", color: "#db2777", fontWeight: 600, marginRight: 4 }}>AND</span>}
                          {group.map((t, tid) => <span key={tid} style={{ background: "rgba(219,39,119,0.1)", color: "#db2777", border: "1px solid rgba(219,39,119,0.2)", borderRadius: 4, padding: "2px 6px", fontSize: "0.75rem", fontWeight: 500 }}>{t}</span>)}
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


// ─── MERCHANDISE MANAGER ──────────────────────────────────────
type MerchTab = "products" | "categories" | "discounts" | "orders";

function MerchandiseManager() {
  const [tab, setTab] = useState<MerchTab>("products");

  return (
    <div className={styles.sectionWrap}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="bx bx-store" style={{ color: "#f59e0b" }} /> Merchandise
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
              borderColor: tab === key ? "#f59e0b" : "var(--adm-border)",
              color: tab === key ? "#f59e0b" : "var(--adm-text)",
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
    pending:   { bg: "rgba(156,163,175,0.2)", fg: "#9ca3af" },
    paid:      { bg: "rgba(59,130,246,0.2)",  fg: "#3b82f6" },
    processing:{ bg: "rgba(245,158,11,0.2)",  fg: "#f59e0b" },
    shipped:   { bg: "rgba(139,92,246,0.2)",  fg: "#8b5cf6" },
    completed: { bg: "rgba(16,185,129,0.2)",  fg: "#10b981" },
    cancelled: { bg: "rgba(239,68,68,0.2)",   fg: "#ef4444" },
  }[s] || { bg: "rgba(156,163,175,0.2)", fg: "#9ca3af" });

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
                        {["pending","paid","processing","shipped","completed","cancelled"].map(s => <option key={s} value={s} style={{ background: "#242424", color: "#fff" }}>{s}</option>)}
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

  const showToast = (msg: string, type: "success" | "error") => setToast({ msg, type });

  const loadStats = useCallback(async () => {
    if (section !== "setlists") return;
    setStatsLoading(true);
    try {
      const res = await fetch(api("/stats"));
      const json = await res.json();
      if (json.status && Array.isArray(json.data)) {
        const totalShows = json.data.find((s: any) => s.stat_key === "total_shows");
        const setlists = json.data.find((s: any) => s.stat_key === "setlists");
        const unitSongs = json.data.find((s: any) => s.stat_key === "unit_songs");
        setStats({
          total_shows: totalShows || { stat_key: "total_shows", label: "Total Shows", value: "0", icon: "bx-calendar", sort_order: "1", is_active: true },
          setlists: setlists || { stat_key: "setlists", label: "Setlists", value: "0", icon: "bx-music", sort_order: "2", is_active: true },
          unit_songs: unitSongs || { stat_key: "unit_songs", label: "Unit Songs", value: "0", icon: "bx-microphone", sort_order: "3", is_active: true }
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
        const res = await fetch(api(`/stats/${item.stat_key}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
        const json = await res.json();
        if (!json.status) allSuccess = false;
      }
      showToast(allSuccess ? "Statistik berhasil disimpan!" : "Beberapa statistik gagal disimpan", allSuccess ? "success" : "error");
    } catch { showToast("Gagal menyimpan statistik", "error"); }
    setStatsSaving(false);
  };

  const cfg: Record<string, { endpoint: string; cols: { key: string; label: string }[]; fields: { key: string; label: string; type?: string; rows?: number; hint?: string }[]; listKey: string; }> = {
    news: { endpoint: "/news", listKey: "news", cols: [{ key: "image_url", label: "Gambar" }, { key: "title", label: "Judul" }, { key: "label", label: "Label" }, { key: "is_active", label: "Aktif" }, { key: "published_at", label: "Tanggal" }], fields: [{ key: "slug", label: "Slug" }, { key: "title", label: "Judul" }, { key: "label", label: "Label" }, { key: "description", label: "Deskripsi Singkat", type: "textarea", rows: 2 }, { key: "content", label: "Konten Lengkap", type: "textarea", rows: 6 }, { key: "image_url", label: "URL Gambar Utama" }, { key: "images", label: "URL Gambar Dokumentasi", hint: "pisahkan dengan koma", type: "textarea", rows: 2 }, { key: "link_url", label: "Link URL" }, { key: "published_at", label: "Tanggal Publish", type: "datetime-local" }, { key: "is_active", label: "Aktif", type: "checkbox" }, { key: "is_pinned", label: "Pin", type: "checkbox" }] },
    timeline: { endpoint: "/timeline", listKey: "events", cols: [{ key: "year", label: "Tahun" }, { key: "date_label", label: "Tanggal" }, { key: "title", label: "Judul" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "year", label: "Tahun" }, { key: "event_date", label: "Tanggal Event", type: "date" }, { key: "date_label", label: "Label Tanggal" }, { key: "title", label: "Judul" }, { key: "description", label: "Deskripsi", type: "textarea", rows: 3 }, { key: "image_url", label: "URL Gambar" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    gallery: { endpoint: "/gallery", listKey: "items", cols: [{ key: "image_url", label: "Gambar" }, { key: "title", label: "Judul" }, { key: "date_label", label: "Tanggal" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "title", label: "Judul" }, { key: "image_url", label: "URL Gambar" }, { key: "date_label", label: "Label Tanggal" }, { key: "alt_text", label: "Alt Text" }, { key: "tags", label: "Tags", hint: "pisahkan dengan koma, boleh kosong" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    setlists: { endpoint: "/setlists", listKey: "", cols: [{ key: "image_url", label: "Gambar" }, { key: "title", label: "Judul" }, { key: "date_range", label: "Periode" }, { key: "badge", label: "Badge" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "title", label: "Judul" }, { key: "date_range", label: "Periode (cth: 1 Jan - Present)" }, { key: "badge", label: "Badge (cth: 3 Shows)" }, { key: "image_url", label: "URL Gambar" }, { key: "songs", label: "Songs", hint: "pisahkan dengan koma", type: "textarea", rows: 3 }, { key: "show_count", label: "Jumlah Show", type: "number" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    stats: { endpoint: "/stats", listKey: "", cols: [{ key: "stat_key", label: "Key" }, { key: "label", label: "Label" }, { key: "value", label: "Nilai" }, { key: "icon", label: "Icon" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "stat_key", label: "Stat Key (cth: total_shows)" }, { key: "label", label: "Label" }, { key: "value", label: "Nilai", type: "number" }, { key: "icon", label: "Icon (cth: bx-calendar)" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    youtube: { endpoint: "/youtube", listKey: "videos", cols: [{ key: "title", label: "Judul" }, { key: "category", label: "Kategori" }, { key: "video_id", label: "Video ID" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "title", label: "Judul" }, { key: "url", label: "URL YouTube" }, { key: "category", label: "Kategori" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    funfacts: { endpoint: "/funfacts", listKey: "", cols: [{ key: "content", label: "Konten" }, { key: "sort_order", label: "Urutan" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "content", label: "Konten Funfact", type: "textarea", rows: 3 }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    kabesha: { endpoint: "/kabesha", listKey: "", cols: [{ key: "image_url", label: "Gambar" }, { key: "year_label", label: "Tahun" }, { key: "title", label: "Judul" }, { key: "is_active", label: "Aktif" }], fields: [{ key: "year_label", label: "Label Tahun" }, { key: "title", label: "Judul" }, { key: "description", label: "Deskripsi", type: "textarea", rows: 3 }, { key: "image_url", label: "URL Gambar" }, { key: "sort_order", label: "Urutan", type: "number" }, { key: "is_active", label: "Aktif", type: "checkbox" }] },
    dashboard: { endpoint: "", listKey: "", cols: [], fields: [] },
    media:     { endpoint: "", listKey: "", cols: [], fields: [] },
    discord:   { endpoint: "", listKey: "", cols: [], fields: [] },
    journal:   { endpoint: "", listKey: "", cols: [], fields: [] },
    tickets:   { endpoint: "", listKey: "", cols: [], fields: [] },
  };

  const c = cfg[section];

  const load = useCallback(async () => {
    if (["dashboard","media","discord","journal","tickets"].includes(section)) return;
    setLoading(true);
    try {
      const res  = await fetch(api(c.endpoint));
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
  }, [section]);

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
      if (json.status) { showToast(isEdit ? "Berhasil diperbarui!" : "Berhasil ditambahkan!", "success"); setModal(null); load(); }
      else showToast(json.message || "Gagal menyimpan", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
    setSaving(false);
  };

  const del = async (row: any) => {
    setConfirm(null);
    try {
      const id  = section === "stats" ? row.stat_key : section === "youtube" ? row.video_id : row.id;
      const res  = await fetch(api(`${c.endpoint}/${id}`), { method: "DELETE" });
      const json = await res.json();
      if (json.status) { showToast("Berhasil dihapus!", "success"); load(); }
      else showToast(json.message || "Gagal menghapus", "error");
    } catch { showToast("Terjadi kesalahan jaringan", "error"); }
  };

  if (["dashboard","media","discord","journal","tickets"].includes(section)) return null;

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmModal msg={`Hapus "${confirm.title || confirm.label || confirm.stat_key || confirm.content?.slice(0, 40) || "item ini"}"?`} onConfirm={() => del(confirm)} onCancel={() => setConfirm(null)} />}
      {modal && <FormModal title={modal === "add" ? `Tambah ${section}` : `Edit ${section}`} fields={c.fields} data={formData} onChange={(k, v) => setFormData(prev => ({ ...prev, [k]: v }))} onSave={save} onClose={() => setModal(null)} saving={saving} />}

      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}><i className="bx bx-data" /> {section.charAt(0).toUpperCase() + section.slice(1)}<span className={styles.count}>{rows.length} item</span></h2>
        <button className={styles.btnPrimary} onClick={openAdd}><i className="bx bx-plus" /> Tambah</button>
      </div>

      {section === "setlists" && (
        <div style={{ background: "var(--adm-surface)", border: "1px solid var(--adm-border)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "0.9rem", color: "#f0f0f0", margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 6 }}><i className="bx bx-bar-chart-alt-2" style={{ color: "var(--adm-accent)", fontSize: "1.1rem" }} />Edit Statistik</h3>
          {statsLoading ? <div style={{ color: "#888", fontSize: 13, padding: "5px 0" }}><i className="bx bx-loader-alt bx-spin" /> Memuat statistik...</div> : (
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
              {[["total_shows", "Total Shows"], ["setlists", "Setlists"], ["unit_songs", "Unit Songs"]].map(([key, label]) => (
                <div key={key} className={styles.field} style={{ flex: 1, minWidth: 120 }}>
                  <label>{label}</label>
                  <input type="number" value={stats[key]?.value ?? ""} onChange={e => handleStatChange(key, e.target.value)} style={{ background: "#141414" }} />
                </div>
              ))}
              <button className={styles.btnPrimary} onClick={saveStats} disabled={statsSaving} style={{ height: 36, padding: "0 1.25rem", fontSize: "0.85rem" }}>
                {statsSaving ? <><i className="bx bx-loader-alt bx-spin" /> Menyimpan...</> : <><i className="bx bx-save" /> Simpan Statistik</>}
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data...</div> : <DataTable cols={c.cols} rows={rows} onEdit={openEdit} onDelete={row => setConfirm(row)} />}
    </div>
  );
}



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
      const res = await fetch("/api/tickets", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
        setTickets(
          arr.map((item: any) => ({
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
        );
      } else {
        setTickets([]);
      }
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
      const res = await fetch(`/api/tickets?id=${confirmDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.status) {
        showToast("Tiket berhasil dihapus!", "success");
        setConfirmDelete(null);
        await load();
      } else {
        showToast(json.message || "Gagal menghapus tiket", "error");
      }
    } catch {
      showToast("Gagal menghapus tiket", "error");
    }
  };

  const handleUpdate = async (id: number, field: "divisi" | "status", value: string) => {
    try {
      const res = await fetch("/api/tickets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      });
      const json = await res.json();
      if (json.status) {
        showToast("Status tiket diperbarui!", "success");
        await load();
      } else {
        showToast(json.message || "Gagal update", "error");
      }
    } catch {
      showToast("Gagal update", "error");
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
                  <td data-label="Divisi" style={{ fontSize: "0.8rem", color: "#f0f0f0", opacity: t.divisi === "-" ? 0.4 : 1 }}>
                    <select value={t.divisi} onChange={e => handleUpdate(t.id, "divisi", e.target.value)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "inherit", borderRadius: 4, padding: "2px 4px", fontSize: "0.75rem", cursor: "pointer", width: "100%" }}>
                      {["-","Divisi Humas","Divisi Desain","Divisi IT","Divisi Medsos","Divisi Esports","Divisi Sekretaris","Divisi Girl","Divisi Video Editor","All Divisi"].map(d => <option key={d} value={d} style={{ background: "#242424", color: "#fff" }}>{d}</option>)}
                    </select>
                  </td>
                  <td data-label="Status" style={{ textAlign: "center" }}>
                    <select value={t.status} onChange={e => handleUpdate(t.id, "status", e.target.value)} style={{ padding: "3px 8px", borderRadius: 12, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", border: "none", outline: "none", appearance: "none", textAlign: "center", width: "100%", background: t.status === "Completed" ? "rgba(16,185,129,0.2)" : t.status === "Progress" ? "rgba(245,158,11,0.2)" : t.status === "Rejected" ? "rgba(239,68,68,0.2)" : "rgba(156,163,175,0.2)", color: t.status === "Completed" ? "#10b981" : t.status === "Progress" ? "#f59e0b" : t.status === "Rejected" ? "#ef4444" : "#9ca3af" }}>
                      {["Pending","Progress","Completed","Rejected"].map(s => <option key={s} value={s} style={{ background: "#242424", color: "#fff" }}>{s}</option>)}
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setEvents(json.data);
        } else {
          setEvents([]);
        }
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    }
    // Remove stale local storage
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("cavallery_calendar"); } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) { showToast("Judul dan Tanggal wajib diisi", "error"); return; }
    setSaving(true);
    try {
      const payload = isEdit
        ? { action: "update", id: editId, item: { title, date, startTime, url, imageUrl } }
        : { action: "add", title, date, startTime, url, imageUrl };

      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showToast(isEdit ? "Jadwal diperbarui" : "Jadwal ditambahkan", "success");
        setShowModal(false);
        await load();
      } else {
        showToast(json.message || "Gagal menyimpan jadwal", "error");
      }
    } catch {
      showToast("Gagal menyimpan jadwal", "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: confirmDelete.id }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Jadwal dihapus", "success");
        setConfirmDelete(null);
        await load();
      } else {
        showToast(json.message || "Gagal menghapus jadwal", "error");
      }
    } catch {
      showToast("Gagal menghapus jadwal", "error");
    }
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
        <h2 className={styles.sectionTitle}><i className="bx bx-calendar" style={{ color: "#3b82f6" }} /> Kalender Manual<span className={styles.count}>{events.length} jadwal</span></h2>
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
                  <td>{ev.url ? <a href={ev.url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>{ev.url.length > 40 ? ev.url.slice(0, 40) + "…" : ev.url}</a> : "-"}</td>
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
      const res = await fetch("/api/updates", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const arr = json?.data ?? (Array.isArray(json) ? json : []);
        setUpdates(arr);
      } else {
        setUpdates([]);
      }
    } catch {
      setUpdates([]);
    }
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("cavallery_updates"); } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return showToast("URL wajib diisi", "error");
    setSaving(true);
    try {
      const action = editId ? "update" : "add";
      const payload = editId
        ? { action, id: editId, item: { platform, url: url.trim() } }
        : { action, id: Date.now().toString(), platform, url: url.trim() };
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Berhasil disimpan", "success");
        setShowModal(false);
        await load();
      } else {
        showToast(json.message || "Gagal menyimpan", "error");
      }
    } catch {
      showToast("Gagal menyimpan", "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: confirmDelete.id }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Berhasil dihapus", "success");
        setConfirmDelete(null);
        await load();
      } else {
        showToast(json.message || "Gagal menghapus", "error");
      }
    } catch {
      showToast("Gagal menghapus", "error");
    }
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
                  <td><a href={item.url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>{item.url.length > 50 ? item.url.slice(0, 50) + "..." : item.url}</a></td>
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
      const res = await fetch("/api/vcschedule", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        }
      }
    } catch {}
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("cavallery_vcschedule"); } catch {}
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
        setToast({ msg: "Jadwal VC berhasil disimpan", type: "success" });
        await load();
      } else {
        setToast({ msg: json.message || "Gagal menyimpan", type: "error" });
      }
    } catch {
      setToast({ msg: "Gagal menyimpan", type: "error" });
    }
    setSaving(false);
  };

  const handleChange = (key: string, value: string) => setData((prev: any) => ({ ...prev, [key]: value }));

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}><i className="bx bx-video" style={{ color: "#ec4899" }} /> Jadwal Video Call</h2></div>
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/about-erine", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSlides(json.data);
        }
      }
    } catch {}
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("cavallery_about_erine"); } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/about-erine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slides),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: "Berhasil menyimpan foto About Erine", type: "success" });
        await load();
      } else {
        setToast({ msg: json.message || "Gagal menyimpan", type: "error" });
      }
    } catch {
      setToast({ msg: "Gagal menyimpan", type: "error" });
    }
    setSaving(false);
  };

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}><i className="bx bx-image" style={{ color: "#ec4899" }} /> About Erine Hero Photos</h2></div>
      {loading ? <div className={styles.loadingState}><i className="bx bx-loader-alt bx-spin" /> Memuat data...</div> : (
        <div className={styles.formModal} style={{ position: "relative", maxWidth: 600 }}>
          <form onSubmit={handleSave}>
            <div className={styles.formBody}>
              {slides.map((url, idx) => (
                <div className={styles.field} key={idx}>
                  <label>Foto {idx + 1}</label>
                  <input type="url" value={url} onChange={e => { const n = [...slides]; n[idx] = e.target.value; setSlides(n); }} placeholder="https://..." />
                  {url && <img src={url} alt={`Preview ${idx + 1}`} style={{ marginTop: 8, maxHeight: 150, borderRadius: 8, objectFit: "cover" }} />}
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/anggota-kota", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCityData(json.data);
        }
      }
    } catch {}
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("cavallery_anggota_kota"); } catch {}
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/anggota-kota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cityData),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ msg: "Berhasil menyimpan Anggota Kota", type: "success" });
        await load();
      } else {
        setToast({ msg: json.message || "Gagal menyimpan", type: "error" });
      }
    } catch {
      setToast({ msg: "Gagal menyimpan", type: "error" });
    }
    setSaving(false);
  };

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className={styles.sectionHeader}><h2 className={styles.sectionTitle}><i className="bx bx-map" style={{ color: "#3b82f6" }} /> Anggota Kota ({Object.keys(cityData).length} Kota)</h2></div>
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
    setConfirmDelete(null);
  };

  const handleCopyLink = (item: any) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://cavallery.id";
    const url = `${origin}/the-wayfinder/${item.slug}`;
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
          setSaving(false);
          return;
        }
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("cavallery_wayfinder_config", JSON.stringify(cardConfig));
      }
      showToast("Teks & Background kartu undangan berhasil disimpan!", "success");
    } catch {
      showToast("Gagal menyimpan konfigurasi kartu", "error");
    }
    setSaving(false);
  };

  const handleConfigChange = (key: string, val: string) => {
    setCardConfig((prev: any) => ({ ...prev, [key]: val }));
  };

  const filtered = invitations.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.slug && item.slug.toLowerCase().includes(q))
    );
  });

  return (
    <div className={styles.sectionWrap}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmDelete && (
        <ConfirmModal
          msg={`Hapus undangan untuk "${confirmDelete.name}"? Halaman /the-wayfinder/${confirmDelete.slug} tidak akan dapat diakses lagi.`}
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
                          color: "#c9a84c",
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
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    URL: <span style={{ color: "#c9a84c" }}>/the-wayfinder/{slug || "slug-url"}</span>
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
          <i className="bx bx-envelope" style={{ color: "#c9a84c" }} /> Undangan (The Wayfinder)
          <span className={styles.count}>{invitations.length} Undangan</span>
        </h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href="/the-wayfinder/links"
            target="_blank"
            rel="noreferrer"
            className={styles.btnGhost}
            style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <i className="bx bx-link-external" /> Link Generator
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
            background: activeTab === "list" ? "#2a2410" : "transparent",
            color: activeTab === "list" ? "#c9a84c" : "var(--adm-muted)",
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
            background: activeTab === "config" ? "#2a2410" : "transparent",
            color: activeTab === "config" ? "#c9a84c" : "var(--adm-muted)",
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
          {/* Search Bar */}
          <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
              <i
                className="bx bx-search"
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#777",
                  fontSize: "1.1rem",
                }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau slug..."
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
                    color: "#999",
                    cursor: "pointer",
                  }}
                >
                  <i className="bx bx-x" />
                </button>
              )}
            </div>
            {search && (
              <span style={{ fontSize: 13, color: "#888" }}>
                Ditemukan {filtered.length} dari {invitations.length}
              </span>
            )}
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
                    <th style={{ width: 220, textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => (
                    <tr key={item.id || item.slug || idx}>
                      <td style={{ textAlign: "center", color: "#888", fontVariantNumeric: "tabular-nums" }}>
                        {idx + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: "#f0f0f0" }}>
                        {item.name}
                      </td>
                      <td>
                        <code
                          style={{
                            fontSize: 12,
                            color: "#c9a84c",
                            background: "rgba(201,168,76,0.09)",
                            padding: "3px 8px",
                            borderRadius: 4,
                          }}
                        >
                          /the-wayfinder/{item.slug}
                        </code>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
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
                            href={`/the-wayfinder/${item.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.btnGhost}
                            style={{ padding: "5px 9px", color: "#3b82f6", textDecoration: "none", fontSize: 13 }}
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
            <h3 style={{ margin: "0 0 16px 0", fontSize: "1.05rem", color: "#c9a84c", display: "flex", alignItems: "center", gap: 8 }}>
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
                  <small style={{ color: "#888" }}>
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
                  <div style={{ fontWeight: 600, color: "#c9a84c", marginBottom: 12, fontSize: "0.9rem" }}>
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
              background: "#111",
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
            <div style={{ fontSize: "0.85rem", color: "#c9a84c", fontWeight: 600, marginBottom: 14, alignSelf: "flex-start" }}>
              <i className="bx bx-show" /> Live Preview Card
            </div>

            <div
              style={{
                width: "100%",
                maxWidth: 320,
                borderRadius: 14,
                border: "2px solid rgba(240,190,83,0.4)",
                padding: "24px 18px",
                position: "relative",
                overflow: "hidden",
                background: "#0b0f0d",
                backgroundImage: `linear-gradient(rgba(10,15,12,0.82), rgba(10,15,12,0.98)), url(${cardConfig.bgImage || DEFAULT_CARD_CONFIG.bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                textAlign: "center",
                color: "#ece3d0",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }}
            >
              {/* Badge */}
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(240,190,83,0.35)",
                  background: "rgba(0,0,0,0.6)",
                  color: "#f0be53",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                }}
              >
                {(cardConfig.badgeText || "SEITANSAI PROJECT 2026").toUpperCase()}
              </div>

              {/* Eyebrow */}
              <div style={{ fontSize: 11, color: "#d6cebf", fontWeight: 600, letterSpacing: "0.06em" }}>
                {(cardConfig.eyebrow || "CATHERINA VALLENCIA").toUpperCase()}
              </div>

              {/* Hero Title */}
              <div
                style={{
                  fontSize: 32,
                  fontFamily: "Playfair Display, Georgia, serif",
                  fontStyle: "italic",
                  fontWeight: 700,
                  color: "#fff",
                  margin: "4px 0 0 0",
                }}
              >
                {cardConfig.heroName || "Erine"}
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: 11,
                  color: "#ffd778",
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
                  background: "rgba(240,190,83,0.09)",
                  border: "1px solid rgba(240,190,83,0.35)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 9, color: "#d6cebf", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                  {cardConfig.invitedLabel || "MENGUNDANG"}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontFamily: "Playfair Display, Georgia, serif",
                    fontStyle: "italic",
                    fontWeight: 700,
                    color: "#ffd778",
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
                <div style={{ color: "#ffd778", fontWeight: 700, fontSize: 11 }}>
                  {cardConfig.dateTitle || "Sabtu, 22 Agustus 2026"}
                </div>
                <div style={{ color: "#d6cebf", fontSize: 10, marginBottom: 8 }}>
                  {cardConfig.dateSub || "Pukul 15.00 — 20.30 WIB"}
                </div>

                <div style={{ color: "#ffd778", fontWeight: 700, fontSize: 11 }}>
                  {cardConfig.locationTitle || "CGV FX Sudirman — Lantai F7"}
                </div>
                <div style={{ color: "#d6cebf", fontSize: 10, marginBottom: 8 }}>
                  {cardConfig.locationSub || "Jl. Jend. Sudirman, Jakarta Selatan"}
                </div>

                <div style={{ color: "#ffd778", fontWeight: 700, fontSize: 10 }}>
                  {cardConfig.dressCodeTitle || "Dress Code: Birthday T-shirt Erine"}
                </div>
              </div>

              <div style={{ fontSize: 10, color: "#a09882", fontWeight: 600 }}>
                {cardConfig.footerText || "CAVALLERY ©2026"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD HOME ───────────────────────────────────────────
function DashboardHome({ onNav }: { onNav: (s: Section) => void }) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    ([
      { key: "news",        path: "/api/news"        },
      { key: "timeline",    path: "/api/timeline"    },
      { key: "gallery",     path: "/api/gallery"     },
      { key: "setlists",    path: "/api/setlists"    },
      { key: "youtube",     path: "/api/youtube"     },
      { key: "funfacts",    path: "/api/funfacts"    },
      { key: "kabesha",     path: "/api/kabesha"     },
      { key: "stats",       path: "/api/stats"       },
      { key: "media",       path: "/api/published-media" },
      { key: "journal",     path: "/api/journal"     },
      { key: "bot",         path: "/api/bot-config"  },
      { key: "tickets",     path: "/api/tickets"     },
      { key: "calendar",    path: "/api/calendar"    },
      { key: "updates",     path: "/api/updates"     },
      { key: "anggotakota", path: "/api/anggota-kota" },
      { key: "abouterine",  path: "/api/about-erine"  },
      { key: "invitations", path: "/api/invitations" },
      { key: "vcschedule",  path: "/api/vcschedule"  },
    ] as { key: string; path: string }[]).forEach(async ({ key, path }) => {
      try {
        const res = await fetch(path, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          let count = 0;
          const data = json?.data !== undefined ? json.data : (Array.isArray(json) ? json : json?.publishedIds);
          if (Array.isArray(data)) count = data.length;
          else if (typeof data === "object" && data !== null) count = Object.keys(data).length;
          setCounts(prev => ({ ...prev, [key]: count }));
        }
      } catch {}
    });
  }, []);

  const cards: { key: Section; icon: string; label: string; color: string }[] = [
    { key: "invitations",icon: "bx-envelope",     label: "Undangan",  color: "#c9a84c" },
    { key: "news",       icon: "bx-news",         label: "News",      color: "#b45309" },
    { key: "timeline",   icon: "bx-history",      label: "Timeline",  color: "#047857" },
    { key: "gallery",    icon: "bx-image-alt",    label: "Gallery",   color: "#7c3aed" },
    { key: "setlists",   icon: "bx-music",        label: "Setlists",  color: "#0369a1" },
    { key: "youtube",    icon: "bxl-youtube",     label: "YouTube",   color: "#dc2626" },
    { key: "merch",      icon: "bx-store",        label: "Merchandise", color: "#f59e0b" },
    { key: "funfacts",   icon: "bx-laugh",        label: "Funfacts",  color: "#059669" },
    { key: "kabesha",    icon: "bx-star",         label: "Kabesha",   color: "#d97706" },
    { key: "stats",      icon: "bx-bar-chart",    label: "Stats",     color: "#9333ea" },
    { key: "media",      icon: "bx-folder-open",  label: "Media",     color: "#0891b2" },
    { key: "discord",    icon: "bxl-discord-alt", label: "Discord",   color: "#5865f2" },
    { key: "journal",    icon: "bx-book-open",    label: "MemoRine",  color: "#db2777" },
    { key: "bot",        icon: "bx-bot",          label: "Bot",       color: "#f59e0b" },
    { key: "tickets",    icon: "bx-receipt",      label: "Tickets",   color: "#10b981" },
    { key: "calendar",   icon: "bx-calendar",     label: "Calendar",  color: "#3b82f6" },
    { key: "updates",    icon: "bx-refresh",      label: "Updates",   color: "#10b981" },
    { key: "vcschedule", icon: "bx-video",        label: "Video Call",color: "#ec4899" },
    { key: "abouterine", icon: "bx-image",        label: "About Erine",color: "#ec4899" },
    { key: "anggotakota",icon: "bx-map",          label: "Anggota Kota",color: "#3b82f6" },
  ];

  return (
    <div className={styles.dashHome}>
      <div className={styles.welcomeBanner}>
        <div><h2>Selamat datang, Vallencia!</h2><p>Kelola konten Cavallery dari sini.</p></div>
        <i className="bx bxs-shield-alt-2" style={{ fontSize: "4rem", opacity: 0.15 }} />
      </div>
      <div className={styles.dashGrid}>
        {cards.map(card => (
          <button key={card.key} className={styles.dashCard} onClick={() => onNav(card.key)} style={{ "--accent": card.color } as any}>
            <i className={`bx ${card.icon}`} style={{ color: card.color }} />
            <div className={styles.dashCardCount}>{counts[card.key] ?? "—"}</div>
            <div className={styles.dashCardLabel}>{card.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── NAV ITEMS ────────────────────────────────────────────────
const navItems: { key: Section; icon: string; label: string }[] = [
  { key: "dashboard",   icon: "bx-home-alt",     label: "Dashboard"  },
  { key: "invitations", icon: "bx-envelope",     label: "Undangan"   },
  { key: "news",        icon: "bx-news",         label: "News"       },
  { key: "timeline",    icon: "bx-history",      label: "Timeline"   },
  { key: "gallery",     icon: "bx-image-alt",    label: "Gallery"    },
  { key: "setlists",    icon: "bx-music",        label: "Setlists"   },
  { key: "youtube",     icon: "bxl-youtube",     label: "YouTube"    },
  { key: "merch",       icon: "bx-store",        label: "Merchandise"},
  { key: "funfacts",    icon: "bx-laugh",        label: "Funfacts"   },
  { key: "kabesha",     icon: "bx-star",         label: "Kabesha"    },
  { key: "stats",       icon: "bx-bar-chart",    label: "Stats"      },
  { key: "media",       icon: "bx-folder-open",  label: "Media"      },
  { key: "discord",     icon: "bxl-discord-alt", label: "Discord"    },
  { key: "journal",     icon: "bx-book-open",    label: "MemoRine"   },
  { key: "bot",         icon: "bx-bot",          label: "Bot"        },
  { key: "tickets",     icon: "bx-receipt",      label: "Tickets"    },
  { key: "calendar",    icon: "bx-calendar",     label: "Calendar"   },
  { key: "updates",     icon: "bx-refresh",      label: "Updates"    },
  { key: "vcschedule",  icon: "bx-video",        label: "Video Call" },
  { key: "abouterine",  icon: "bx-image",        label: "About Erine"},
  { key: "anggotakota", icon: "bx-map",          label: "Anggota Kota"},
];

// ─── MAIN ─────────────────────────────────────────────────────
export default function AdminPage() {
  // ✅ Auth diverifikasi ke server — tidak bisa di-bypass dari browser console
  const { authed, checking, setAuthed, logout } = useAdminAuth();

  const [active,     setActive]     = useState<Section>("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  

  if (checking) return (
    <AdminPortal>
      <div className={styles.adminRoot} style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", color: "#c9a84c" }}>
          <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2.5rem", marginBottom: 12 }} />
          <div style={{ fontSize: "0.9rem", color: "#aaa" }}>Memuat Cavallery Admin...</div>
        </div>
      </div>
    </AdminPortal>
  );

  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;

  const navigate = (section: Section) => { setActive(section); setDrawerOpen(false); };

  return (
    <AdminPortal>
      <style>{`
        .adm-root {
          --adm-bg:      #1a1a1a;
          --adm-surface: #242424;
          --adm-border:  #333;
          --adm-text:    #f0f0f0;
          --adm-muted:   #999;
          --adm-accent:  #c9a84c;
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
            <nav className={styles.nav}>
              {navItems.map(n => (
                <button key={n.key} className={`${styles.navItem} ${active === n.key ? styles.navActive : ""}`} onClick={() => navigate(n.key)}>
                  <i className={`bx ${n.icon}`} />
                  <span>{n.label}</span>
                </button>
              ))}
            </nav>
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
                <nav className={styles.nav}>
                  {navItems.map(n => (
                    <button key={n.key} className={`${styles.navItem} ${active === n.key ? styles.navActive : ""}`} onClick={() => navigate(n.key)}>
                      <i className={`bx ${n.icon}`} />
                      <span>{n.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
              <button className={styles.logoutBtn} onClick={logout}><i className="bx bx-log-out" /> Keluar</button>
            </aside>
          </div>
        )}

        {/* MAIN AREA */}
        <div className={styles.mainArea}>
          <header className={styles.topbar}>
            <button className={styles.menuBtn} onClick={() => setDrawerOpen(true)}><i className="bx bx-menu" /></button>
            <div className={styles.topbarTitle}>{navItems.find(n => n.key === active)?.label ?? "Dashboard"}</div>
            <div className={styles.topbarRight}>
              <span className={styles.adminBadge}><i className="bx bx-user" /> Admin</span>
              <button className={styles.logoutIconBtn} onClick={logout} title="Keluar"><i className="bx bx-log-out" /></button>
            </div>
          </header>

          <div className={styles.content}>
            {active === "dashboard"   ? <DashboardHome onNav={setActive} />
            : active === "invitations"? <InvitationsManager />
            : active === "media"      ? <MediaManager />
            : active === "discord"    ? <DiscordManager />
            : active === "journal"    ? <JournalManager />
            : active === "bot"        ? <BotManager />
            : active === "tickets"    ? <TicketsManager />
            : active === "calendar"   ? <CalendarManager />
            : active === "updates"    ? <UpdatesManager />
            : active === "vcschedule" ? <VcScheduleManager />
            : active === "abouterine" ? <AboutErineManager />
            : active === "anggotakota"? <AnggotaKotaManager />
            : active === "merch"      ? <MerchandiseManager />
            : <SectionManager section={active} />}
          </div>
        </div>
      </div>
    </AdminPortal>
  );
}
