"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./page.module.css";
import DynamicRecruitmentForm from "@/components/recruitment/DynamicRecruitmentForm";
import type { Recruitment, RecruitmentQuestion } from "@/lib/dynamicRecruitment";

const ROLES_INFO: Record<
  string,
  {
    icon: string;
    iconBg: string;
    color: string;
    perks: string[];
  }
> = {
  member: {
    icon: "bx-user-pin",
    iconBg: "rgba(235, 116, 37, 0.12)",
    color: "#eb7425",
    perks: [
      "Akses grup koordinasi LINE resmi",
      "Prioritas proyek ulang tahun & Request Hour",
      "Keluarga besar Cavallery se-Indonesia",
    ],
  },
  admin: {
    icon: "bx-shield-quarter",
    iconBg: "var(--gold-dim, rgba(180, 83, 9, 0.12))",
    color: "var(--gold, #b45309)",
    perks: [
      "Menjadi bagian dari perjalanan kepengurusan Cavallery",
      "Pengembangan skill sesuai posisi (Editor, Sosmed, Esport)",
      "Berkolaborasi, membangun networking, dan ruang berkreasi.",
    ],
  },
  volunteer: {
    icon: "bx-donate-heart",
    iconBg: "rgba(227, 109, 31, 0.12)",
    color: "#e36d1f",
    perks: [
      "Pelaksana project event & perayaan Seitansai Erine",
      "Persiapan, pengaturan area, & pendampingan project",
      "Briefing resmi & koordinasi bersama panitia Cavallery",
    ],
  },
};

export default function JoinPage() {
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Selected Recruitment Modal State
  const [activeRecruitment, setActiveRecruitment] = useState<Recruitment | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<RecruitmentQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadActiveRecruitments = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Coba ambil dari endpoint active recruitments
      const res = await fetch("/api/recruitment/active?t=" + Date.now());
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setRecruitments(json.data);
          return;
        }
      }

      // 2. Fallback: ambil semua rekrutmen jika active kosong
      const fallbackRes = await fetch("/api/recruitment?t=" + Date.now());
      if (fallbackRes.ok) {
        const json = await fallbackRes.json();
        if (json.success && Array.isArray(json.data)) {
          const mapped = json.data.map((r: any) => ({
            id: r.id === "member" ? 1 : r.id === "admin" ? 2 : 3,
            title: r.title,
            slug: r.id,
            role_id: r.id,
            description: r.description,
            banner_url: null,
            start_date: null,
            end_date: null,
            is_active: Boolean(r.is_open),
          }));
          setRecruitments(mapped);
        }
      }
    } catch (err: any) {
      console.error("Gagal memuat rekrutmen:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActiveRecruitments();
  }, [loadActiveRecruitments]);

  // Buka Form Rekrutmen Tertentu
  const handleOpenForm = async (rec: Recruitment) => {
    setActiveRecruitment(rec);
    setLoadingQuestions(true);
    setLoadError("");

    try {
      const res = await fetch(`/api/recruitment/${rec.slug}?t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setActiveQuestions(json.data.questions || []);
          return;
        }
      }
      throw new Error("Gagal mengambil formulir pertanyaan.");
    } catch (err: any) {
      setLoadError(err.message || "Gagal memuat formulir.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleCloseModal = () => {
    setActiveRecruitment(null);
    setActiveQuestions([]);
    setLoadError("");
  };

  return (
    <div className={styles.page}>
      {/* Hero Header */}
      <div className={styles.hero}>
        <div className={styles.heroBg} />
        <div className={styles.heroInner}>
          <div className="badge">
            <i className="fa-solid fa-chess-knight" /> Official Fanbase Recruitment
          </div>
          <h1 className={styles.heroTitle}>
            Bergabung Bersama Komunitas <span className="textGold">Cavallery</span>
          </h1>
          <p className={styles.heroSub}>
            Tentukan peranmu dalam mendukung, merayakan, dan berbagi keceriaan bersama Erine JKT48.
          </p>
        </div>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingWrapper}>
            <i className="bx bx-loader-alt bx-spin" />
            <p>Memuat informasi recruitment...</p>
          </div>
        ) : recruitments.length === 0 ? (
          <div
            style={{
              padding: "4rem 1.5rem",
              textAlign: "center",
              background: "var(--surface, rgba(24, 20, 18, 0.6))",
              borderRadius: "18px",
              border: "1px dashed var(--border, rgba(255,255,255,0.15))",
              maxWidth: "600px",
              margin: "2rem auto",
            }}
          >
            <i className="bx bx-calendar-x" style={{ fontSize: "3rem", color: "var(--cv-orange, #ff6b1a)" }} />
            <h3 style={{ margin: "16px 0 8px", color: "var(--fg, #f5efe6)" }}>
              Belum Ada Recruitment Dibuka
            </h3>
            <p style={{ margin: 0, color: "var(--fg-muted, #a3978c)", fontSize: "0.95rem" }}>
              Saat ini seluruh periode pendaftaran sedang ditutup. Pantau pengumuman resmi di media sosial kami untuk jadwal pembukaan pendaftaran berikutnya.
            </p>
          </div>
        ) : (
          <div className={styles.cardsGrid}>
            {recruitments.map((rec) => {
              const roleKey = rec.role_id || "member";
              const info = ROLES_INFO[roleKey] || {
                icon: "bx-user",
                iconBg: "rgba(180, 83, 9, 0.1)",
                color: "#b45309",
                perks: [
                  "Akses koordinasi fanbase resmi Cavallery",
                  "Kesempatan berpartisipasi dalam event dan project khusus",
                ],
              };
              const isOpen = Boolean(rec.is_active);

              return (
                <div key={rec.id} className={styles.roleCard}>
                  <div className={styles.cardHeader}>
                    <div
                      className={styles.iconCircle}
                      style={{ background: info.iconBg, color: info.color }}
                    >
                      <i className={`bx ${info.icon}`} />
                    </div>
                    <div className={styles.statusBadgeWrap}>
                      {isOpen ? (
                        <span className={styles.badgeOpen}>
                          <span className={styles.pulseDot} /> Dibuka
                        </span>
                      ) : (
                        <span className={styles.badgeClosed}>Ditutup</span>
                      )}
                    </div>
                  </div>

                  <h3 className={styles.roleTitle}>{rec.title}</h3>
                  <p className={styles.roleDesc}>
                    {rec.description || "Pendaftaran resmi komunitas Cavallery."}
                  </p>

                  <div className={styles.perksList}>
                    <div className={styles.perksHeading}>Keuntungan / Benefit:</div>
                    {info.perks.map((perk, idx) => (
                      <div key={idx} className={styles.perkItem}>
                        <i className="bx bx-check" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className={`${styles.applyBtn} ${!isOpen ? styles.btnDisabled : ""}`}
                    disabled={!isOpen}
                    onClick={() => handleOpenForm(rec)}
                  >
                    {isOpen ? (
                      <>
                        Daftar Sekarang <i className="bx bx-right-arrow-alt" />
                      </>
                    ) : (
                      "Pendaftaran Ditutup"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── MODAL FORM PENDAFTARAN DINAMIS ─── */}
      {activeRecruitment && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div
            className={`${styles.modalContent} ${styles.modalContentWide}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeBtn}
              onClick={handleCloseModal}
              aria-label="Tutup modal"
            >
              <i className="bx bx-x" />
            </button>

            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div
                className={styles.modalIconCircle}
                style={{
                  background:
                    ROLES_INFO[activeRecruitment.role_id]?.iconBg || "rgba(235, 116, 37, 0.12)",
                  color:
                    ROLES_INFO[activeRecruitment.role_id]?.color || "#eb7425",
                }}
              >
                <i className={`bx ${ROLES_INFO[activeRecruitment.role_id]?.icon || "bx-edit"}`} />
              </div>
              <div>
                <h2 className={styles.modalTitle}>
                  Formulir {activeRecruitment.title}
                </h2>
                <p className={styles.modalSub}>
                  Lengkapi data formulir di bawah ini dengan jujur dan benar.
                </p>
              </div>
            </div>

            {/* Modal Body */}
            {loadingQuestions ? (
              <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--cv-orange, #ff6b1a)" }}>
                <i className="bx bx-loader-alt bx-spin" style={{ fontSize: "2.4rem" }} />
                <p style={{ marginTop: "12px", fontSize: "0.95rem" }}>Memuat pertanyaan formulir...</p>
              </div>
            ) : loadError ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <div className={styles.errorBox}>
                  <i className="bx bx-error-circle" />
                  <span>{loadError}</span>
                </div>
                <button
                  type="button"
                  className={styles.submitBtn}
                  style={{ marginTop: "16px" }}
                  onClick={handleCloseModal}
                >
                  Tutup
                </button>
              </div>
            ) : (
              <DynamicRecruitmentForm
                recruitment={activeRecruitment}
                questions={activeQuestions}
                onCancel={handleCloseModal}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
