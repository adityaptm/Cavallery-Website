# Cavallery Website — Fanbase Resmi Erine JKT48

Website resmi fanbase Catherina Vallencia (Erine) JKT48 Team Passion: https://cavallery.id  
Dibangun menggunakan **Next.js (App Router)**, **React 19**, **TypeScript**, dan terintegrasi dengan **MySQL Hostinger** serta **JKT48 Connect API**.

---

## 🚀 Menjalankan Secara Lokal

1. **Clone repository & Install dependencies:**
   ```bash
   git clone https://github.com/adityayudha/Cavallery-Website.git
   cd Cavallery-Website
   npm install
   ```

2. **Setup Environment Variables:**
   Salin `.env.example` menjadi `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Isi variable di `.env.local`:
   ```ini
   # Database MySQL (Hostinger Remote Server)
   DB_HOST=153.92.15.44
   DB_PORT=3306
   DB_NAME=u410588002_Cavallery
   DB_USER=u410588002_Cavallery
   DB_PASSWORD=YOUR_DB_PASSWORD
   DB_SSL=false

   # Session Secret
   SESSION_SECRET=cava-secret-key-2026-vallencia-secure

   # JKT48 Connect Public API Key (https://api.jkt48connect.app/dashboard/keys)
   JKT48CONNECT_API_KEY="jkc_..."
   JKT48CONNECT_API_BASE_URL="https://api.jkt48connect.app"
   ```

3. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```
   Buka [http://localhost:3000](http://localhost:3000) di browser.

---

## 🌐 Panduan Deploy di Hostinger

### 1. Konfigurasi Environment Variable di Hostinger
1. Masuk ke **hPanel Hostinger** (https://hpanel.hostinger.com).
2. Buka menu **Websites** → Pilih domain `cavallery.id` → **Manage**.
3. Jika menggunakan fitur **Node.js** di hPanel:
   - Masuk ke menu **Node.js**.
   - Pada bagian **Environment Variables**, tambahkan:
     * Key: `JKT48CONNECT_API_KEY`
     * Value: `jkc_...` *(Salin kunci lengkap dari dashboard JKT48 Connect, pastikan tidak terpotong oleh `...`)*
   - Tambahkan juga konfigurasi DB (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, dll.).
4. Jika menggunakan **VPS Hostinger (KVM VPS)**:
   - Masuk via SSH ke server VPS.
   - Buat / edit file `.env.production` atau `.env.local` di direktori proyek:
     ```bash
     nano .env.local
     ```
   - Masukkan `JKT48CONNECT_API_KEY="jkc_..."`.
   - Simpan (`Ctrl + O`, Enter, `Ctrl + X`).
   - Restart proses dengan PM2:
     ```bash
     pm2 restart cavallery-website --update-env
     ```

### 2. Redeploy / Build
- Jalankan build di server:
  ```bash
  npm run build
  ```
- Sistem dirancang tahan error: Jika `JKT48CONNECT_API_KEY` belum diset saat build, build tetap berhasil tanpa crash, dan komponen UI akan menampilkan state empty/informasi yang ramah pengguna di runtime.

---

## 📋 Fitur Integrasi JKT48 Connect

1. **Jadwal Kegiatan & Kalender Bulanan (`/schedule`):**
   - Menampilkan kalender bulanan interaktif dan daftar agenda kegiatan.
   - Dropdown pemilihan periode bulan dari `available_periods`.
   - Highlight khusus untuk agenda kegiatan Erine.
2. **Status Stok Tiket Eksklusif (`/schedule`):**
   - Live checker status tiket 2-Shot / Video Call event eksklusif (default `EX79CB`).
   - Badge status semantik (Tersedia / Hampir Habis / Habis).
   - Tautan langsung ke halaman pembelian resmi.
3. **Live Streaming Hub (`/live`):**
   - Monitoring siaran langsung IDN Live & Showroom secara real-time.
   - Indikator deteksi status siaran Erine.
   - Stream komentar real-time dengan auto-scroll dan deteksi tab aktif (pause otomatis saat tab background).
   - Galeri rekap banner dan screenshot live.
4. **Update Media Sosial Erine (`/about/erine`):**
   - Feed multi-platform: Semua, X (Twitter), Instagram, dan TikTok Erine.
   - Paginasi berbasis cursor yang disimpan di `localStorage` per user.
   - Desain kartu responsif dengan teks 4-baris clamp dan link ke post asli.
