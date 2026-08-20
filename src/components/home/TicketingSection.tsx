"use client";
import { useState } from "react";
import styles from "./TicketingSection.module.css";

export default function TicketingSection() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [identityType, setIdentityType] = useState<"named" | "anonymous">("named");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    
    const formData = new FormData(e.currentTarget);
    const isAnon = identityType === "anonymous";

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: isAnon ? "Anonymous" : ((formData.get("name") as string) || (formData.get("Nama") as string) || "Anonymous"),
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
    <section className={styles.section} id="tickets">
      <div className={styles.container}>
        <div className={styles.header}>
          <div className="badge"><i className="bx bx-envelope" /> Form Aspirasi</div>
          <h2 className={`sectionTitle textGold`}>Ticketing Fanbase</h2>
          <p className={styles.subtitle}>Sampaikan kritik, saran, atau aspirasi program fanbase Anda langsung ke admin Cavallery.</p>
        </div>

        <div className={styles.formWrapper}>
          <div className={styles.formCard}>
            {status === "success" ? (
              <div className={styles.statusMessage}>
                <i className="bx bx-check-circle" />
                <p>Terima kasih! Tiket Anda telah tercatat. Kami akan segera meninjau aspirasi Anda.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.identityToggle}>
                  <label 
                    className={`${styles.toggleLabel} ${identityType === "named" ? styles.active : ""}`}
                    onClick={() => setIdentityType("named")}
                  >
                    <input type="radio" name="identity_type" value="named" defaultChecked hidden />
                    <span>Pakai Nama</span>
                  </label>
                  <label 
                    className={`${styles.toggleLabel} ${identityType === "anonymous" ? styles.active : ""}`}
                    onClick={() => setIdentityType("anonymous")}
                  >
                    <input type="radio" name="identity_type" value="anonymous" hidden />
                    <span>Anonim</span>
                  </label>
                </div>

                <div className={styles.grid}>
                  {identityType === "named" ? (
                    <>
                      <div className={styles.field}>
                        <label>Nama Lengkap</label>
                        <input type="text" name="Nama" required placeholder="Contoh: Catherina Vallencia" />
                      </div>
                      <div className={styles.field}>
                        <label>Nomor Anggota</label>
                        <input type="text" name="no_anggota" required placeholder="Contoh: 18" />
                      </div>
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="Nama" value="Anonymous" />
                      <input type="hidden" name="no_anggota" value="-" />
                    </>
                  )}

                  <div className={styles.field}>
                    <label>Kategori</label>
                    <select name="kategori">
                      <option value="Saran Program">Saran Program (MabaRine, BukbeRine dll)</option>
                      <option value="Kritik Fanbase">Kritik Fanbase</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label>Pesan / Ide</label>
                    <textarea name="pesan" rows={4} required placeholder="Tuliskan ide atau pesanmu di sini..."></textarea>
                  </div>
                </div>

                <div className={styles.btnWrapper}>
                  <button type="submit" className="btnPrimary" disabled={status === "loading"}>
                    {status === "loading" ? "Mengirim..." : "Kirim Tiket"}
                  </button>
                </div>

                {status === "error" && <p className={styles.error}>Gagal mengirim. Periksa koneksi Anda.</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
