"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AdminSubNav from "@/components/admin/AdminSubNav";
import OrgChart from "@/components/structure/OrgChart";
import styles from "./page.module.css";
import {
  NodeType,
  Placement,
  StructureNode,
  StructureSettings,
  TreeNode,
} from "@/lib/structure";

// Palet warna yang disarankan untuk unit baru
const SUGGESTED_PALETTE = [
  "#3f7d6e", // Teal (Sekretariat)
  "#6b8e4e", // Olive Green (Keuangan)
  "#c08a2e", // Gold (Korlap)
  "#c4566f", // Rose Pink (Desain)
  "#7a5fb0", // Purple (Hamas)
  "#3d74b8", // Blue (IT)
  "#d0663a", // Warm Orange (Sosmed)
  "#2f8f9d", // Cyan (E-Sport)
  "#9c4174", // Magenta
  "#b35434", // Terracotta
  "#4a7c59", // Forest Green
  "#546e7a", // Slate Blue
];

export default function AdminStrukturPage() {
  const router = useRouter();

  // Data state
  const [nodes, setNodes] = useState<StructureNode[]>([]);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [settings, setSettings] = useState<StructureSettings>({
    chart_title: "Cavallery's Castle Structure",
    logo_url: "/uploads/cavallery/images/2026/10/1792248958349_logo_struktur.png",
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Tree collapsible state: Set ID node yang terbuka (expanded)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Modal State
  const [modalType, setModalType] = useState<
    "add_unit" | "add_child" | "edit" | "move" | "delete" | null
  >(null);
  const [targetNode, setTargetNode] = useState<StructureNode | null>(null);
  const [descendantCount, setDescendantCount] = useState<number>(0);

  // Form Fields
  const [formRole, setFormRole] = useState("");
  const [formPerson, setFormPerson] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [formNodeType, setFormNodeType] = useState<NodeType>("member");
  const [formPlacement, setFormPlacement] = useState<Placement>("normal");
  const [formColor, setFormColor] = useState("#3f7d6e");
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [formIsActive, setFormIsActive] = useState(true);

  // Settings Form State
  const [settingTitle, setSettingTitle] = useState("");
  const [settingLogo, setSettingLogo] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Ambil data struktur dari server
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/structure/nodes", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/internal/dashboard-admin-xv7r2q");
        return;
      }
      const json = await res.json();
      if (json.status) {
        setNodes(json.nodes || []);
        setTree(json.tree || null);
        if (json.settings) {
          setSettings(json.settings);
          setSettingTitle(json.settings.chart_title || "");
          setSettingLogo(json.settings.logo_url || "");
        }
        // Expand root dan unit secara default
        const initialExpanded = new Set<number>();
        (json.nodes || []).forEach((n: StructureNode) => {
          if (n.node_type === "root" || n.node_type === "unit" || n.node_type === "group") {
            initialExpanded.add(n.id);
          }
        });
        setExpandedIds(initialExpanded);
      } else {
        setMsg({ ok: false, text: json.message || "Gagal memuat data struktur" });
      }
    } catch {
      setMsg({ ok: false, text: "Gagal terhubung ke server" });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  // Flash message timeout
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Pilih warna berikutnya yang belum dipakai dari palet saran
  const pickNextColor = useCallback(() => {
    const usedColors = new Set(
      nodes.filter((n) => n.node_type === "unit" && n.accent_color).map((n) => n.accent_color!.toLowerCase())
    );
    for (const c of SUGGESTED_PALETTE) {
      if (!usedColors.has(c.toLowerCase())) return c;
    }
    return SUGGESTED_PALETTE[Math.floor(Math.random() * SUGGESTED_PALETTE.length)];
  }, [nodes]);

  // ── Open Modals ──────────────────────────────────────────────
  const openAddUnit = () => {
    const root = nodes.find((n) => n.node_type === "root");
    setFormRole("");
    setFormPerson("");
    setFormAvatarUrl("");
    setFormNodeType("unit");
    setFormPlacement("normal");
    setFormColor(pickNextColor());
    setFormParentId(root ? root.id : null);
    setFormIsActive(true);
    setModalType("add_unit");
  };

  const openAddChild = (parent: StructureNode) => {
    setTargetNode(parent);
    setFormRole("");
    setFormPerson("");
    setFormAvatarUrl("");
    // Jika parent adalah unit, default group atau member
    setFormNodeType("member");
    setFormPlacement("normal");
    setFormParentId(parent.id);
    setFormIsActive(true);
    setModalType("add_child");
  };

  const openEdit = (node: StructureNode) => {
    setTargetNode(node);
    setFormRole(node.role_label);
    setFormPerson(node.person_name || "");
    setFormAvatarUrl(node.avatar_url || "");
    setFormNodeType(node.node_type);
    setFormPlacement(node.placement);
    setFormColor(node.accent_color || pickNextColor());
    setFormParentId(node.parent_id);
    setFormIsActive(Boolean(node.is_active));
    setModalType("edit");
  };

  const openMove = (node: StructureNode) => {
    setTargetNode(node);
    setFormParentId(node.parent_id);
    setModalType("move");
  };

  const openDelete = async (node: StructureNode) => {
    setTargetNode(node);
    try {
      const res = await fetch(`/api/admin/structure/nodes/${node.id}`);
      const json = await res.json();
      setDescendantCount(json.descendantCount || 0);
    } catch {
      setDescendantCount(0);
    }
    setModalType("delete");
  };

  const closeModal = () => {
    setModalType(null);
    setTargetNode(null);
    setDescendantCount(0);
  };

  // ── CRUD Handlers ────────────────────────────────────────────
  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRole.trim()) {
      setMsg({ ok: false, text: "Nama atau jabatan wajib diisi" });
      return;
    }

    try {
      setBusy(true);

      if (modalType === "add_unit" || modalType === "add_child") {
        const res = await fetch("/api/admin/structure/nodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent_id: formParentId,
            node_type: formNodeType,
            role_label: formRole.trim(),
            person_name: formPerson.trim() || null,
            avatar_url: formAvatarUrl.trim() || null,
            placement: formPlacement,
            accent_color: formNodeType === "unit" ? formColor : null,
            is_active: formIsActive ? 1 : 0,
          }),
        });
        const json = await res.json();
        if (json.status) {
          setMsg({ ok: true, text: json.message || "Node berhasil ditambahkan" });
          closeModal();
          await load();
          setRefreshKey((k) => k + 1);
        } else {
          setMsg({ ok: false, text: json.message || "Gagal menambahkan node" });
        }
      } else if (modalType === "edit" && targetNode) {
        const res = await fetch(`/api/admin/structure/nodes/${targetNode.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role_label: formRole.trim(),
            person_name: formPerson.trim() || null,
            avatar_url: formAvatarUrl.trim() || null,
            placement: formPlacement,
            accent_color: targetNode.node_type === "unit" ? formColor : null,
            is_active: formIsActive ? 1 : 0,
          }),
        });
        const json = await res.json();
        if (json.status) {
          setMsg({ ok: true, text: json.message || "Node berhasil diperbarui" });
          closeModal();
          await load();
          setRefreshKey((k) => k + 1);
        } else {
          setMsg({ ok: false, text: json.message || "Gagal memperbarui node" });
        }
      }
    } catch {
      setMsg({ ok: false, text: "Terjadi kesalahan jaringan" });
    } finally {
      setBusy(false);
    }
  };

  const handleMoveParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetNode) return;

    try {
      setBusy(true);
      const res = await fetch(`/api/admin/structure/nodes/${targetNode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_id: formParentId,
        }),
      });
      const json = await res.json();
      if (json.status) {
        setMsg({ ok: true, text: json.message || "Node berhasil dipindahkan" });
        closeModal();
        await load();
        setRefreshKey((k) => k + 1);
      } else {
        setMsg({ ok: false, text: json.message || "Gagal memindahkan node" });
      }
    } catch {
      setMsg({ ok: false, text: "Terjadi kesalahan jaringan" });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!targetNode) return;
    try {
      setBusy(true);
      const res = await fetch(`/api/admin/structure/nodes/${targetNode.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.status) {
        setMsg({ ok: true, text: json.message || "Node berhasil dihapus" });
        closeModal();
        await load();
        setRefreshKey((k) => k + 1);
      } else {
        setMsg({ ok: false, text: json.message || "Gagal menghapus node" });
      }
    } catch {
      setMsg({ ok: false, text: "Terjadi kesalahan jaringan" });
    } finally {
      setBusy(false);
    }
  };

  // Reorder saudara (Move up / down)
  const handleReorder = async (node: StructureNode, direction: "up" | "down") => {
    const siblings = nodes
      .filter((n) => n.parent_id === node.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);

    const currentIndex = siblings.findIndex((s) => s.id === node.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const newSiblings = [...siblings];
    const [moved] = newSiblings.splice(currentIndex, 1);
    newSiblings.splice(targetIndex, 0, moved);

    const reorderedPayload = newSiblings.map((s, idx) => ({
      id: s.id,
      sort_order: idx + 1,
    }));

    try {
      setBusy(true);
      const res = await fetch("/api/admin/structure/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderedPayload }),
      });
      const json = await res.json();
      if (json.status) {
        await load();
        setRefreshKey((k) => k + 1);
      } else {
        setMsg({ ok: false, text: json.message || "Gagal mengubah urutan" });
      }
    } catch {
      setMsg({ ok: false, text: "Gagal menyimpan urutan" });
    } finally {
      setBusy(false);
    }
  };

  // Simpan Pengaturan (Logo URL & Judul)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await fetch("/api/admin/structure/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chart_title: settingTitle.trim(),
          logo_url: settingLogo.trim(),
        }),
      });
      const json = await res.json();
      if (json.status) {
        setMsg({ ok: true, text: "Pengaturan bagan berhasil disimpan." });
        setSettings(json.settings);
        setRefreshKey((k) => k + 1);
      } else {
        setMsg({ ok: false, text: json.message || "Gagal menyimpan pengaturan" });
      }
    } catch {
      setMsg({ ok: false, text: "Gagal menyimpan pengaturan" });
    } finally {
      setSavingSettings(false);
    }
  };

  // Filter daftar kandidat parent yang valid (menghindari siklus)
  const validParentCandidates = useMemo(() => {
    if (!targetNode) return nodes;

    // Ambil seluruh keturunan rekursif dari targetNode
    const descendants = new Set<number>();
    const queue = [targetNode.id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const children = nodes.filter((n) => n.parent_id === cur);
      for (const c of children) {
        descendants.add(c.id);
        queue.push(c.id);
      }
    }

    return nodes.filter((n) => n.id !== targetNode.id && !descendants.has(n.id));
  }, [nodes, targetNode]);

  // Render node pohon secara rekursif
  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const allChildren = [...(node.children || []), ...(node.belowChildren || [])];
    const hasChildren = allChildren.length > 0;
    const isRoot = node.node_type === "root";

    return (
      <li key={node.id} className={styles.treeItem}>
        <div
          className={styles.nodeRow}
          data-active={Boolean(node.is_active)}
          style={{ paddingLeft: `${14 + depth * 22}px` }}
        >
          <div className={styles.nodeLeft}>
            {hasChildren ? (
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => toggleExpand(node.id)}
                title={isExpanded ? "Tutup" : "Buka"}
              >
                <i className={`bx ${isExpanded ? "bx-chevron-down" : "bx-chevron-right"}`} />
              </button>
            ) : (
              <div style={{ width: 24 }} />
            )}

            {/* Warna aksen untuk unit atau pewarisan */}
            <div
              className={styles.colorIndicator}
              style={{ backgroundColor: node.inherited_accent_color }}
              title={`Aksen: ${node.inherited_accent_color}`}
            />

            {/* Badge Tipe */}
            <span className={styles.badgeType} data-type={node.node_type}>
              {node.node_type}
            </span>

            {node.placement === "below" && (
              <span className={styles.badgePlacement}>below</span>
            )}

            {/* Info Jabatan & Nama */}
            <div className={styles.nodeInfo} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {node.avatar_url && (
                <img
                  src={node.avatar_url}
                  alt=""
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid var(--cv-line, #444)",
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              )}
              <span className={styles.nodeRole}>{node.role_label}</span>
              {node.person_name && (
                <span className={styles.nodePerson}>• {node.person_name}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.nodeActions}>
            {/* Tambah Anak */}
            <button
              type="button"
              className={styles.btnIcon}
              onClick={() => openAddChild(node)}
              title="Tambah anak di bawah node ini"
              disabled={busy}
            >
              <i className="bx bx-plus" />
            </button>

            {/* Edit */}
            <button
              type="button"
              className={styles.btnIcon}
              onClick={() => openEdit(node)}
              title="Edit node"
              disabled={busy}
            >
              <i className="bx bx-pencil" />
            </button>

            {/* Pindahkan Parent (bukan root) */}
            {!isRoot && (
              <button
                type="button"
                className={styles.btnIcon}
                onClick={() => openMove(node)}
                title="Pindahkan ke parent lain"
                disabled={busy}
              >
                <i className="bx bx-transfer-alt" />
              </button>
            )}

            {/* Reorder Up */}
            {!isRoot && (
              <button
                type="button"
                className={styles.btnIcon}
                onClick={() => handleReorder(node, "up")}
                title="Pindahkan ke atas"
                disabled={busy}
              >
                <i className="bx bx-up-arrow-alt" />
              </button>
            )}

            {/* Reorder Down */}
            {!isRoot && (
              <button
                type="button"
                className={styles.btnIcon}
                onClick={() => handleReorder(node, "down")}
                title="Pindahkan ke bawah"
                disabled={busy}
              >
                <i className="bx bx-down-arrow-alt" />
              </button>
            )}

            {/* Hapus (Root tidak boleh dihapus) */}
            {!isRoot && (
              <button
                type="button"
                className={`${styles.btnIcon} ${styles.btnDanger}`}
                onClick={() => openDelete(node)}
                title="Hapus node"
                disabled={busy}
              >
                <i className="bx bx-trash" />
              </button>
            )}
          </div>
        </div>

        {/* Children Rows */}
        {hasChildren && isExpanded && (
          <ul className={styles.treeList}>
            {allChildren.map((child) => renderTreeNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <AdminSubNav
          activeKey="struktur"
          title="Struktur Organisasi Cavallery"
          subtitle="Kelola bagan struktur kepengurusan dinamis Cavallery's Castle Structure"
        />

        {msg && (
          <div className={styles.msg} data-ok={msg.ok ? "true" : "false"}>
            <i className={`bx ${msg.ok ? "bx-check-circle" : "bx-error-circle"}`} />
            <span>{msg.text}</span>
          </div>
        )}

        {/* 1. PRATINJAU LANGSUNG BAGAN (Top-Down Interactive SVG) */}
        <section className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <i className="bx bx-show" /> Pratinjau Langsung Publik
            </h2>
            <div className={styles.toolbarActions}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={loading}
              >
                <i className="bx bx-refresh" /> Muat Ulang
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={openAddUnit}
                disabled={busy}
              >
                <i className="bx bx-folder-plus" /> Tambah Divisi / Unit Baru
              </button>
            </div>
          </div>

          <OrgChart refreshKey={refreshKey} />
        </section>

        {/* 2. DAFTAR STRUKTUR HIRARKI (Tree List) */}
        <section className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <i className="bx bx-sitemap" /> Pohon Hirarki Kepengurusan
            </h2>
            <p className={styles.summary}>
              Total Node: <strong>{nodes.length}</strong> (Root, Leader, Unit, Group, Member)
            </p>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", padding: 24, color: "var(--cv-text-dim)" }}>
              Memuat data struktur…
            </p>
          ) : tree ? (
            <ul className={styles.treeList}>{renderTreeNode(tree, 0)}</ul>
          ) : (
            <p style={{ textAlign: "center", padding: 24, color: "var(--cv-text-dim)" }}>
              Belum ada data pohon struktur.
            </p>
          )}
        </section>

        {/* 3. PENGATURAN BAGAN (Logo URL & Judul) */}
        <section className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <i className="bx bx-cog" /> Pengaturan Bagan
            </h2>
          </div>

          <form onSubmit={handleSaveSettings} className={styles.settingsGrid}>
            <div className={styles.fields} style={{ padding: 0 }}>
              <div className={styles.field}>
                <label>Judul Bagan (Header)</label>
                <input
                  type="text"
                  value={settingTitle}
                  onChange={(e) => setSettingTitle(e.target.value)}
                  placeholder="Cavallery's Castle Structure"
                  required
                />
              </div>

              <div className={styles.field}>
                <label>URL Logo Cavallery</label>
                <input
                  type="text"
                  value={settingLogo}
                  onChange={(e) => setSettingLogo(e.target.value)}
                  placeholder="/uploads/cavallery/images/.../logo.png"
                  required
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={savingSettings}
                >
                  {savingSettings ? "Menyimpan…" : "Simpan Pengaturan"}
                </button>
              </div>
            </div>

            {/* Live Logo Preview Box */}
            <div className={styles.logoPreviewBox}>
              {settingLogo ? (
                <Image
                  src={settingLogo}
                  alt="Logo Preview"
                  width={140}
                  height={120}
                  unoptimized
                  className={styles.logoPreviewImg}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <span style={{ fontSize: "0.8rem", color: "var(--cv-text-dim)" }}>
                  Tanpa Logo
                </span>
              )}
            </div>
          </form>
        </section>
      </div>

      {/* ── MODAL: TAMBAH DIVISI / UNIT BARU ────────────────── */}
      {modalType === "add_unit" && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>Tambah Divisi / Unit Baru</h3>
              <button type="button" className={styles.btnIcon} onClick={closeModal}>
                <i className="bx bx-x" />
              </button>
            </div>
            <form onSubmit={handleSaveNode}>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label>Nama Divisi / Unit</label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder="Contoh: Divisi Publikasi & Desain"
                    autoFocus
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label>Warna Aksen</label>
                  <div className={styles.colorInputRow}>
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className={styles.colorPicker}
                    />
                    <input
                      type="text"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      placeholder="#3f7d6e"
                      style={{ width: 100 }}
                      required
                    />
                  </div>
                  {/* Palet Saran */}
                  <label style={{ marginTop: 6 }}>Saran Palet:</label>
                  <div className={styles.paletteRow}>
                    {SUGGESTED_PALETTE.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={styles.paletteChip}
                        style={{ backgroundColor: c }}
                        data-selected={formColor.toLowerCase() === c.toLowerCase()}
                        onClick={() => setFormColor(c)}
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Status Aktif</label>
                  <select
                    value={formIsActive ? "1" : "0"}
                    onChange={(e) => setFormIsActive(e.target.value === "1")}
                  >
                    <option value="1">Aktif (Tampil di bagan)</option>
                    <option value="0">Non-aktif (Disembunyikan)</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFoot}>
                <button type="button" className={styles.btnGhost} onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={busy}>
                  {busy ? "Menyimpan…" : "Tambah Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TAMBAH ANAK DI BAWAH NODE ────────────────── */}
      {modalType === "add_child" && targetNode && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>Tambah di bawah: {targetNode.role_label}</h3>
              <button type="button" className={styles.btnIcon} onClick={closeModal}>
                <i className="bx bx-x" />
              </button>
            </div>
            <form onSubmit={handleSaveNode}>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label>Tipe Node</label>
                  <select
                    value={formNodeType}
                    onChange={(e) => setFormNodeType(e.target.value as NodeType)}
                  >
                    <option value="member">Member (Orang dengan jabatan)</option>
                    <option value="group">Group (Kategori grup, misal: TikTok, IG)</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label>{formNodeType === "group" ? "Nama Grup / Platform" : "Jabatan"}</label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    placeholder={formNodeType === "group" ? "Contoh: YouTube" : "Contoh: Koordinator"}
                    autoFocus
                    required
                  />
                </div>

                {formNodeType === "member" && (
                  <>
                    <div className={styles.field}>
                      <label>Nama Orang (Boleh kosong)</label>
                      <input
                        type="text"
                        value={formPerson}
                        onChange={(e) => setFormPerson(e.target.value)}
                        placeholder="Nama anggota"
                      />
                    </div>

                    <div className={styles.field}>
                      <label>URL Foto Profil (Opsional)</label>
                      <input
                        type="text"
                        value={formAvatarUrl}
                        onChange={(e) => setFormAvatarUrl(e.target.value)}
                        placeholder="https://... atau /uploads/..."
                      />
                      {formAvatarUrl && (
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                          <img
                            src={formAvatarUrl}
                            alt="Preview Foto"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "2px solid var(--cv-orange, #e05a47)",
                            }}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                          <span style={{ fontSize: 12, color: "var(--adm-text-subtle, #999)" }}>Pratinjau Foto Profil</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className={styles.field}>
                  <label>Posisi / Penempatan (Placement)</label>
                  <select
                    value={formPlacement}
                    onChange={(e) => setFormPlacement(e.target.value as Placement)}
                  >
                    <option value="normal">Normal (Sejajar di baris berikutnya)</option>
                    <option value="below">Below (Di baris bawah anak-anak normal)</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Status Aktif</label>
                  <select
                    value={formIsActive ? "1" : "0"}
                    onChange={(e) => setFormIsActive(e.target.value === "1")}
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Non-aktif</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFoot}>
                <button type="button" className={styles.btnGhost} onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={busy}>
                  {busy ? "Menyimpan…" : "Tambahkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT NODE ────────────────────────────────── */}
      {modalType === "edit" && targetNode && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>Edit: {targetNode.role_label}</h3>
              <button type="button" className={styles.btnIcon} onClick={closeModal}>
                <i className="bx bx-x" />
              </button>
            </div>
            <form onSubmit={handleSaveNode}>
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label>Jabatan / Nama Label</label>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    required
                  />
                </div>

                {targetNode.node_type !== "unit" && (
                  <>
                    <div className={styles.field}>
                      <label>Nama Orang (Boleh kosong)</label>
                      <input
                        type="text"
                        value={formPerson}
                        onChange={(e) => setFormPerson(e.target.value)}
                        placeholder="Nama orang"
                      />
                    </div>

                    <div className={styles.field}>
                      <label>URL Foto Profil (Opsional)</label>
                      <input
                        type="text"
                        value={formAvatarUrl}
                        onChange={(e) => setFormAvatarUrl(e.target.value)}
                        placeholder="https://... atau /uploads/..."
                      />
                      {formAvatarUrl && (
                        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                          <img
                            src={formAvatarUrl}
                            alt="Preview Foto"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: "2px solid var(--cv-orange, #e05a47)",
                            }}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                          <span style={{ fontSize: 12, color: "var(--adm-text-subtle, #999)" }}>Pratinjau Foto Profil</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {targetNode.node_type === "unit" && (
                  <div className={styles.field}>
                    <label>Warna Aksen</label>
                    <div className={styles.colorInputRow}>
                      <input
                        type="color"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        className={styles.colorPicker}
                      />
                      <input
                        type="text"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        placeholder="#3f7d6e"
                        style={{ width: 100 }}
                        required
                      />
                    </div>
                  </div>
                )}

                {targetNode.node_type !== "root" && (
                  <div className={styles.field}>
                    <label>Posisi / Penempatan (Placement)</label>
                    <select
                      value={formPlacement}
                      onChange={(e) => setFormPlacement(e.target.value as Placement)}
                    >
                      <option value="normal">Normal</option>
                      <option value="below">Below</option>
                    </select>
                  </div>
                )}

                <div className={styles.field}>
                  <label>Status Aktif</label>
                  <select
                    value={formIsActive ? "1" : "0"}
                    onChange={(e) => setFormIsActive(e.target.value === "1")}
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Non-aktif</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFoot}>
                <button type="button" className={styles.btnGhost} onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={busy}>
                  {busy ? "Menyimpan…" : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PINDAHKAN PARENT ─────────────────────────── */}
      {modalType === "move" && targetNode && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3>Pindahkan Parent: {targetNode.role_label}</h3>
              <button type="button" className={styles.btnIcon} onClick={closeModal}>
                <i className="bx bx-x" />
              </button>
            </div>
            <form onSubmit={handleMoveParent}>
              <div className={styles.fields}>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--cv-text-dim)" }}>
                  Pilih parent baru untuk node ini. Pilihan yang berpotensi menyebabkan siklus telah disaring secara otomatis.
                </p>
                <div className={styles.field}>
                  <label>Parent Tujuan</label>
                  <select
                    value={formParentId !== null ? String(formParentId) : ""}
                    onChange={(e) =>
                      setFormParentId(e.target.value ? Number(e.target.value) : null)
                    }
                    required
                  >
                    <option value="" disabled>
                      -- Pilih Parent --
                    </option>
                    {validParentCandidates.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.node_type.toUpperCase()}] {p.role_label}
                        {p.person_name ? ` (${p.person_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalFoot}>
                <button type="button" className={styles.btnGhost} onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={busy}>
                  {busy ? "Memindahkan…" : "Pindahkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: KONFIRMASI HAPUS DENGAN JUMLAH ANAK ────────── */}
      {modalType === "delete" && targetNode && (
        <div className={styles.modalBackdrop} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h3 style={{ color: "#ef4444" }}>Konfirmasi Hapus</h3>
              <button type="button" className={styles.btnIcon} onClick={closeModal}>
                <i className="bx bx-x" />
              </button>
            </div>
            <div className={styles.fields}>
              <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus <strong>{targetNode.role_label}</strong>
                {targetNode.person_name ? ` (${targetNode.person_name})` : ""}?
              </p>

              {descendantCount > 0 ? (
                <div
                  style={{
                    padding: 12,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: 8,
                    color: "#fca5a5",
                    fontSize: "0.85rem",
                  }}
                >
                  <i className="bx bx-error" style={{ marginRight: 6 }} />
                  <strong>Peringatan:</strong> Menghapus node ini juga akan menghapus{" "}
                  <strong>{descendantCount} anggota/sub-node</strong> di dalamnya (ON DELETE CASCADE).
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--cv-text-dim)" }}>
                  Node ini tidak memiliki anak dan dapat dihapus dengan aman.
                </p>
              )}
            </div>

            <div className={styles.modalFoot}>
              <button type="button" className={styles.btnGhost} onClick={closeModal}>
                Batal
              </button>
              <button
                type="button"
                className={`${styles.btnPrimary} ${styles.btnDanger}`}
                onClick={handleDeleteNode}
                disabled={busy}
              >
                {busy ? "Menghapus…" : "Ya, Hapus Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
