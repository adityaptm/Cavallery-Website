"use client";

import { useState } from "react";
import type { Recruitment, RecruitmentQuestion } from "@/lib/dynamicRecruitment";
import styles from "@/app/join/page.module.css";

interface DynamicRecruitmentFormProps {
  recruitment: Recruitment;
  questions: RecruitmentQuestion[];
  onSuccess?: (submissionId: number) => void;
  onCancel?: () => void;
}

export default function DynamicRecruitmentForm({
  recruitment,
  questions,
  onSuccess,
  onCancel,
}: DynamicRecruitmentFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<number | null>(null);

  // Honeypot field for anti-bot
  const [honeypot, setHoneypot] = useState("");

  const sortedQuestions = [...questions].sort((a, b) => a.sort_order - b.sort_order);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (errorMsg) setErrorMsg("");
  };

  const handleCheckboxToggle = (key: string, option: string, isSingleAgreement: boolean) => {
    if (isSingleAgreement) {
      setFormData((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    } else {
      setFormData((prev) => {
        const currentList: string[] = Array.isArray(prev[key]) ? prev[key] : [];
        if (currentList.includes(option)) {
          return { ...prev, [key]: currentList.filter((item) => item !== option) };
        } else {
          return { ...prev, [key]: [...currentList, option] };
        }
      });
    }
    if (errorMsg) setErrorMsg("");
  };

  const handleFileUpload = async (key: string, file: File, validation: any) => {
    // Validasi Ukuran File (Default Max 5MB)
    const maxMB = validation?.maxSizeMB || 5;
    if (file.size > maxMB * 1024 * 1024) {
      setErrorMsg(`Ukuran file "${file.name}" melebihi batas maksimal ${maxMB}MB.`);
      return;
    }

    setUploadingField(key);
    setErrorMsg("");

    try {
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/admin/media/upload-local", {
        method: "POST",
        body: data,
      });

      if (res.ok) {
        const json = await res.json();
        const url = json.url || json.public_url || json.path || "";
        handleFieldChange(key, url);
      } else {
        // Fallback: simpan nama file atau URL placeholder jika endpoint upload beda
        handleFieldChange(key, file.name);
      }
    } catch {
      handleFieldChange(key, file.name);
    } finally {
      setUploadingField(null);
    }
  };

  const validateForm = (): boolean => {
    for (const q of sortedQuestions) {
      const val = formData[q.field_key];

      // Required Check
      if (q.is_required) {
        if (
          val === undefined ||
          val === null ||
          (typeof val === "string" && val.trim() === "") ||
          (Array.isArray(val) && val.length === 0) ||
          (q.type === "checkbox" && (val === false || val === 0 || val === "false"))
        ) {
          setErrorMsg(`"${q.label}" wajib diisi.`);
          return false;
        }
      }

      if (val !== undefined && val !== null && val !== "") {
        if (q.type === "email" && typeof val === "string") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val.trim())) {
            setErrorMsg(`Format email tidak valid pada "${q.label}".`);
            return false;
          }
        }

        if (q.type === "phone" && typeof val === "string") {
          const phoneClean = val.replace(/\D/g, "");
          if (phoneClean.length < 8 || phoneClean.length > 16) {
            setErrorMsg(`Nomor WhatsApp/telepon pada "${q.label}" harus antara 8 - 16 digit.`);
            return false;
          }
        }

        if (q.type === "number") {
          const num = Number(val);
          if (isNaN(num)) {
            setErrorMsg(`"${q.label}" harus berupa angka.`);
            return false;
          }
          if (q.validation?.min !== undefined && num < q.validation.min) {
            setErrorMsg(`Nilai "${q.label}" minimal ${q.validation.min}.`);
            return false;
          }
          if (q.validation?.max !== undefined && num > q.validation.max) {
            setErrorMsg(`Nilai "${q.label}" maksimal ${q.validation.max}.`);
            return false;
          }
        }

        if (typeof val === "string" && (q.type === "text" || q.type === "textarea")) {
          if (q.validation?.min !== undefined && val.trim().length < q.validation.min) {
            setErrorMsg(`"${q.label}" minimal ${q.validation.min} karakter.`);
            return false;
          }
          if (q.validation?.max !== undefined && val.trim().length > q.validation.max) {
            setErrorMsg(`"${q.label}" maksimal ${q.validation.max} karakter.`);
            return false;
          }
        }

        if (q.validation?.regex && typeof val === "string") {
          try {
            const reg = new RegExp(q.validation.regex);
            if (!reg.test(val)) {
              setErrorMsg(q.validation.customError || `Format isian "${q.label}" tidak valid.`);
              return false;
            }
          } catch {}
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm()) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/recruitment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recruitment_id: recruitment.id,
          answers: formData,
          _hp_cav: honeypot, // Honeypot
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Gagal mengirimkan formulir.");
      }

      setSubmitted(true);
      setSubmissionId(json.submission_id || null);
      if (onSuccess) onSuccess(json.submission_id);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.successBox}>
        <i className={`bx bx-check-circle ${styles.successIcon}`} />
        <h3 className={styles.successTitle}>Pendaftaran Berhasil Dikirim!</h3>
        <p className={styles.successDesc}>
          Terima kasih telah mendaftar pada <strong>{recruitment.title}</strong>!
          {submissionId ? ` (Nomor Pendaftaran: #${submissionId})` : ""}
          <br />
          Data formulir kamu telah tersimpan dengan aman dan sedang ditinjau oleh tim Cavallery.
        </p>
        <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "center", gap: 12 }}>
          {onCancel && (
            <button type="button" className={styles.submitBtn} onClick={onCancel}>
              Tutup Formulir
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Honeypot hidden input */}
      <input
        type="text"
        name="_hp_cav"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        style={{ display: "none" }}
      />

      {errorMsg && (
        <div className={styles.errorBox} role="alert">
          <i className="bx bx-error-circle" />
          <span>{errorMsg}</span>
        </div>
      )}

      {sortedQuestions.map((q) => {
        const val = formData[q.field_key] ?? "";
        const isRequired = Boolean(q.is_required);

        return (
          <div key={q.id} className={styles.field}>
            <label>
              {q.label} {isRequired && <span title="Wajib Diisi">*</span>}
            </label>
            {q.help_text && <p className={styles.fieldSubtext}>{q.help_text}</p>}

            {/* Input Types */}
            {q.type === "textarea" ? (
              <textarea
                rows={4}
                placeholder={q.placeholder || ""}
                value={val}
                onChange={(e) => handleFieldChange(q.field_key, e.target.value)}
                required={isRequired}
              />
            ) : q.type === "select" ? (
              <select
                value={val}
                onChange={(e) => handleFieldChange(q.field_key, e.target.value)}
                required={isRequired}
              >
                <option value="">-- Pilih {q.label} --</option>
                {q.options?.map((opt, idx) => (
                  <option key={idx} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : q.type === "radio" ? (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginTop: "6px",
                }}
              >
                {q.options?.map((opt, idx) => {
                  const isSelected = val === opt;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleFieldChange(q.field_key, opt)}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "12px",
                        border: isSelected
                          ? "2px solid var(--cv-orange, #ff6b1a)"
                          : "1.5px solid var(--border, rgba(245, 239, 230, 0.15))",
                        background: isSelected
                          ? "rgba(255, 107, 26, 0.15)"
                          : "var(--surface, rgba(24, 20, 18, 0.6))",
                        color: isSelected ? "var(--cv-orange, #ff6b1a)" : "var(--fg, #f5efe6)",
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <i
                        className={isSelected ? "bx bx-radio-circle-marked" : "bx bx-radio-circle"}
                        style={{ fontSize: "1.2rem" }}
                      />
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : q.type === "checkbox" ? (
              // Jika options 1 atau tidak ada options -> Single agreement checkbox
              (!q.options || q.options.length <= 1) ? (
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: Boolean(val)
                      ? "rgba(255, 107, 26, 0.12)"
                      : "var(--surface, rgba(24, 20, 18, 0.6))",
                    border: Boolean(val)
                      ? "1.5px solid var(--cv-orange, #ff6b1a)"
                      : "1.5px solid var(--border, rgba(245, 239, 230, 0.15))",
                    cursor: "pointer",
                    marginTop: "6px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(val)}
                    onChange={() => handleCheckboxToggle(q.field_key, "", true)}
                    style={{
                      width: "20px",
                      height: "20px",
                      accentColor: "var(--cv-orange, #ff6b1a)",
                      marginTop: "2px",
                    }}
                  />
                  <span style={{ fontSize: "0.92rem", color: "var(--fg, #f5efe6)", lineHeight: 1.5 }}>
                    {q.options?.[0] || q.label}
                  </span>
                </label>
              ) : (
                // Multi-checkbox group
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "10px",
                    marginTop: "6px",
                  }}
                >
                  {q.options.map((opt, idx) => {
                    const currentArray = Array.isArray(val) ? val : [];
                    const isChecked = currentArray.includes(opt);
                    return (
                      <label
                        key={idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 14px",
                          borderRadius: "12px",
                          background: isChecked
                            ? "rgba(255, 107, 26, 0.12)"
                            : "var(--surface, rgba(24, 20, 18, 0.6))",
                          border: isChecked
                            ? "1.5px solid var(--cv-orange, #ff6b1a)"
                            : "1.5px solid var(--border, rgba(245, 239, 230, 0.15))",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxToggle(q.field_key, opt, false)}
                          style={{
                            width: "18px",
                            height: "18px",
                            accentColor: "var(--cv-orange, #ff6b1a)",
                          }}
                        />
                        <span style={{ fontSize: "0.88rem", color: "var(--fg, #f5efe6)" }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )
            ) : q.type === "file" ? (
              <div>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(q.field_key, f, q.validation);
                  }}
                  disabled={uploadingField === q.field_key}
                  accept={q.validation?.fileTypes?.join(",") || undefined}
                />
                {uploadingField === q.field_key && (
                  <p style={{ fontSize: "0.8rem", color: "var(--cv-orange, #ff6b1a)", marginTop: "4px" }}>
                    <i className="bx bx-loader-alt bx-spin" /> Sedang mengunggah file...
                  </p>
                )}
                {val && typeof val === "string" && (
                  <p style={{ fontSize: "0.8rem", color: "#10b981", marginTop: "4px" }}>
                    <i className="bx bx-check-circle" /> File terpasang: {val}
                  </p>
                )}
              </div>
            ) : q.type === "social_handle" ? (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    fontWeight: 700,
                    color: "var(--cv-orange, #ff6b1a)",
                  }}
                >
                  @
                </span>
                <input
                  type="text"
                  placeholder={q.placeholder || "username"}
                  value={typeof val === "string" ? val.replace(/^@/, "") : ""}
                  onChange={(e) => handleFieldChange(q.field_key, `@${e.target.value.replace(/^@/, "")}`)}
                  style={{ paddingLeft: "34px", width: "100%" }}
                  required={isRequired}
                />
              </div>
            ) : (
              <input
                type={q.type === "phone" ? "tel" : q.type}
                placeholder={q.placeholder || ""}
                value={val}
                onChange={(e) => handleFieldChange(q.field_key, e.target.value)}
                required={isRequired}
              />
            )}
          </div>
        );
      })}

      <div style={{ marginTop: "1rem", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
        {onCancel && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onCancel}
            style={{
              position: "static",
              width: "auto",
              height: "auto",
              padding: "10px 18px",
              borderRadius: "10px",
              fontSize: "0.95rem",
              fontWeight: 600,
            }}
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting || Boolean(uploadingField)}
          style={{ width: onCancel ? "auto" : "100%" }}
        >
          {submitting ? (
            <>
              <i className="bx bx-loader-alt bx-spin" /> Mengirimkan...
            </>
          ) : (
            <>
              <i className="bx bx-send" /> Kirim Pendaftaran
            </>
          )}
        </button>
      </div>
    </form>
  );
}
