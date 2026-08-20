"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function TicketingPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [identityType, setIdentityType] = useState<"named" | "anonymous">("named");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    
    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: (formData.get("Nama") as string) || "Anonymous",
          no_anggota: (formData.get("no_anggota") as string) || "-",
          kategori: (formData.get("kategori") as string) || "Lainnya",
          pesan: (formData.get("pesan") as string) || "",
        }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Error submitting ticket:", error);
      setStatus("error");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerBox}>
          <h1 className={styles.title}>Ticketing Fanbase Cavallery</h1>
        </div>
        <div className={styles.decoration}>
          <div className={styles.line} />
          <div className={styles.diamond}>✦</div>
          <div className={styles.line} />
        </div>
        <p className={styles.subtitle}>"Kritik, Saran & Aspirasi Program Fanbase"</p>
      </div>

      <div className={styles.formCard}>
        {status === "success" ? (
          <div className={styles.statusMessage}>
            Terima kasih! Tiket kamu sudah tercatat oleh admin Cavallery. 
            Kami tampung dulu ya saran kamu!
          </div>
        ) : (
          <>
            <h2 className={styles.formTitle}>Formulir Tiket</h2>
            <p className={styles.formSubtitle}>Ayo kirimkan ide/keluh kesahmu di tiket ini!</p>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Identitas Pengirim</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioItem}>
                    <input
                      type="radio"
                      name="identity_type"
                      value="named"
                      checked={identityType === "named"}
                      onChange={() => setIdentityType("named")}
                    />
                    Pakai Nama
                  </label>
                  <label className={styles.radioItem}>
                    <input
                      type="radio"
                      name="identity_type"
                      value="anonymous"
                      checked={identityType === "anonymous"}
                      onChange={() => setIdentityType("anonymous")}
                    />
                    Anonim
                  </label>
                </div>
              </div>

              {identityType === "named" && (
                <>
                  <div className={styles.field}>
                    <label className={styles.label}>Nama Lengkap</label>
                    <input
                      type="text"
                      name="Nama"
                      required
                      placeholder="Contoh: Catherina Vallencia"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Nomor Anggota</label>
                    <input
                      type="text"
                      name="no_anggota"
                      placeholder="Contoh: 18"
                      required
                      className={styles.input}
                    />
                  </div>
                </>
              )}

              {identityType === "anonymous" && (
                <>
                  <input type="hidden" name="Nama" value="Anonymous" />
                  <input type="hidden" name="no_anggota" value="-" />
                </>
              )}

              <div className={styles.field}>
                <label className={styles.label}>Kategori</label>
                <select name="kategori" className={styles.select}>
                  <option value="Saran Program (Mabar, dll)">
                    Saran Program (MabaRine, BukbeRine dll)
                  </option>
                  <option value="Kritik Fanbase">Kritik Fanbase</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Pesan / Ide</label>
                <textarea 
                  name="pesan" 
                  rows={4} 
                  required 
                  className={styles.textarea}
                ></textarea>
              </div>

              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={status === "loading"}
              >
                {status === "loading" ? "MENGIRIM..." : "Kirim Tiket"}
              </button>

              {status === "error" && (
                <p className={styles.error}>Error! Coba cek koneksi atau URL script kamu.</p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
