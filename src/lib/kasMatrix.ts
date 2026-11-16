import { query } from "@/lib/mysql";

const APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbw8vF9qJQwjIZhvc5yPrl9hkI4cYrbWzBP1Mr9D8XutqqDddiH8dZa374_ZLy7Aftn7jA/exec";

async function sendMatrixToAppsScript(action: string, payload: any): Promise<boolean> {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL || APPS_SCRIPT_URL;
  if (!url) return false;
  try {
    const rawBody = JSON.stringify({ action, data: payload });
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: rawBody,
      redirect: "follow",
    });
    return true;
  } catch (err: any) {
    console.error("[KasMatrix/AppsScript Error]:", err?.message || err);
  }
  return false;
}

export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const SUPPORTED_YEARS = [2024, 2025, 2026, 2027, 2028, 2029];

export async function ensureKasMatrixTable(): Promise<void> {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS iuran_kas_bulanan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        anggota_id INT NOT NULL,
        no_anggota VARCHAR(50) NOT NULL,
        tahun INT NOT NULL,
        bulan INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'diverifikasi',
        nominal DECIMAL(12,2) NOT NULL DEFAULT 15000,
        konfirmasi_kas_id INT NULL,
        verified_at DATETIME NULL,
        verified_by VARCHAR(100) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_anggota_tahun_bulan (no_anggota, tahun, bulan),
        INDEX idx_tahun_bulan (tahun, bulan),
        INDEX idx_no_anggota (no_anggota)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pengeluaran_kas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        tahun INT NOT NULL,
        kategori VARCHAR(100) NOT NULL DEFAULT 'Operasional',
        keperluan VARCHAR(255) NOT NULL,
        nominal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        pj_nama VARCHAR(100) NOT NULL,
        bukti_nota_url VARCHAR(500) NULL,
        catatan TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tahun (tahun),
        INDEX idx_tanggal (tanggal)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pemasukan_kas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        tahun INT NOT NULL,
        kategori VARCHAR(100) NOT NULL DEFAULT 'Pemasukan Eksternal',
        sumber VARCHAR(255) NOT NULL,
        nominal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        pj_nama VARCHAR(100) NOT NULL,
        bukti_nota_url TEXT NULL,
        catatan TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tahun (tahun),
        INDEX idx_tanggal (tanggal)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Upgrade bukti_nota_url ke TEXT dan pastikan status iuran mendukung 'not_joined'
    await query("ALTER TABLE pengeluaran_kas MODIFY COLUMN bukti_nota_url TEXT NULL").catch(() => {});
    await query("ALTER TABLE pemasukan_kas MODIFY COLUMN bukti_nota_url TEXT NULL").catch(() => {});
    await query("ALTER TABLE iuran_kas_bulanan MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'diverifikasi'").catch(() => {});

    // Seed baseline saldo awal pemasukan eksternal Rp 127.463.910 jika kosong
    const countEksternal = await query<any[]>("SELECT COUNT(*) AS cnt FROM pemasukan_kas");
    if (Number(countEksternal?.[0]?.cnt || 0) === 0) {
      await query(
        `INSERT INTO pemasukan_kas (tanggal, tahun, kategori, sumber, nominal, pj_nama, catatan)
         VALUES ('2026-01-01', 2026, 'Pemasukan Eksternal', 'Akumulasi Pemasukan Eksternal & Sponsorship Fanbase', 127463910.00, 'Bendahara Fanbase', 'Saldo awal akumulasi pemasukan eksternal fanbase')`
      );
    }

    // Seed baseline saldo awal pengeluaran Rp 86.531.909 jika kurang
    const sumPengeluaran = await query<any[]>("SELECT COALESCE(SUM(nominal), 0) AS total FROM pengeluaran_kas");
    const currentPengeluaran = Number(sumPengeluaran?.[0]?.total || 0);
    if (currentPengeluaran < 86531909) {
      const delta = 86531909 - currentPengeluaran;
      await query(
        `INSERT INTO pengeluaran_kas (tanggal, tahun, kategori, keperluan, nominal, pj_nama, catatan)
         VALUES ('2026-01-01', 2026, 'Operasional Fanbase', 'Akumulasi Pengeluaran Operasional & Proyek Fanbase', ?, 'Bendahara Fanbase', 'Saldo awal akumulasi pengeluaran operasional fanbase')`,
        [delta]
      );
    }
  } catch (err: any) {
    console.error("[KasMatrix] Error ensuring table:", err?.message);
  }
}

/**
 * Parsing Periode String (contoh: "Januari 2026", "09/2026", "2026-09") ke { bulan, tahun, totalBulan }
 */
export function parsePeriodeToMonths(periodeStr: string, nominal: number = 15000): { tahun: number; startBulan: number; count: number } {
  const clean = (periodeStr || "").trim();
  const currentYear = new Date().getFullYear();
  let tahun = currentYear;
  let startBulan = new Date().getMonth() + 1; // 1-12

  // Extract 4 digit year
  const yearMatch = clean.match(/202[3-9]|203[0-9]/);
  if (yearMatch) {
    tahun = parseInt(yearMatch[0], 10);
  }

  // Find month name
  for (let i = 0; i < MONTH_NAMES_ID.length; i++) {
    const mName = MONTH_NAMES_ID[i];
    if (new RegExp(mName, "i").test(clean)) {
      startBulan = i + 1;
      break;
    }
  }

  let count = 1;
  const bulanMatch = clean.match(/(\d+)\s*bulan/i);
  if (bulanMatch) {
    count = Math.max(1, parseInt(bulanMatch[1], 10));
  } else if (nominal >= 15000) {
    count = Math.max(1, Math.round(nominal / 15000));
  }

  return { tahun, startBulan, count };
}

/**
 * Sync Konfirmasi Kas yang DIVERIFIKASI ke tabel matriks bulanan
 */
export async function syncKasToMatrix(params: {
  konfirmasiKasId: number;
  anggotaId: number;
  noAnggota: string;
  periode: string;
  nominal: number;
  status: string; // 'diverifikasi' | 'pending' | 'ditolak'
  verifiedBy?: string;
}) {
  await ensureKasMatrixTable();
  const { konfirmasiKasId, anggotaId, noAnggota, periode, nominal, status, verifiedBy } = params;

  if (!noAnggota || noAnggota === "-") return;

  const { tahun, startBulan, count } = parsePeriodeToMonths(periode, nominal);
  const nominalPerMonth = count > 0 ? Math.round(nominal / count) : 15000;

  if (status === "diverifikasi") {
    for (let c = 0; c < count; c++) {
      let b = startBulan + c;
      let y = tahun;
      while (b > 12) {
        b -= 12;
        y += 1;
      }

      await query(
        `INSERT INTO iuran_kas_bulanan 
          (anggota_id, no_anggota, tahun, bulan, status, nominal, konfirmasi_kas_id, verified_at, verified_by)
         VALUES (?, ?, ?, ?, 'diverifikasi', ?, ?, NOW(), ?)
         ON DUPLICATE KEY UPDATE
          status = 'diverifikasi',
          nominal = VALUES(nominal),
          konfirmasi_kas_id = VALUES(konfirmasi_kas_id),
          verified_at = NOW(),
          verified_by = VALUES(verified_by)`,
        [anggotaId, noAnggota, y, b, nominalPerMonth, konfirmasiKasId, verifiedBy || "Admin"]
      );

      // Realtime push status checkmark ke Spreadsheet Tab (cth: "Kas 2026")
      updateSpreadsheetMatrixCell({
        tahun: y,
        noAnggota,
        bulan: b,
        isPaid: true,
      }).catch((e) => console.error("[Spreadsheet Matrix] Error updating cell:", e));
    }
  } else if (status === "ditolak" || status === "pending") {
    await query(
      `DELETE FROM iuran_kas_bulanan WHERE konfirmasi_kas_id = ?`,
      [konfirmasiKasId]
    );

    // Fallback delete berdasarkan anggota dan rentang bulan
    for (let c = 0; c < count; c++) {
      let b = startBulan + c;
      let y = tahun;
      while (b > 12) {
        b -= 12;
        y += 1;
      }

      await query(
        `DELETE FROM iuran_kas_bulanan WHERE (anggota_id = ? OR no_anggota = ?) AND tahun = ? AND bulan = ?`,
        [anggotaId, noAnggota, y, b]
      );

      updateSpreadsheetMatrixCell({
        tahun: y,
        noAnggota,
        bulan: b,
        isPaid: false,
      }).catch((e) => console.error("[Spreadsheet Matrix] Error updating cell:", e));
    }
  }
}

/**
 * Toggle Status Pembayaran Bulan Secara Manual oleh Admin dari Web
 */
export async function toggleMonthPayment(params: {
  noAnggota: string;
  tahun: number;
  bulan: number;
  isPaid?: boolean;
  statusMode?: "diverifikasi" | "not_joined" | "unpaid";
  nominal?: number;
  adminName: string;
}) {
  await ensureKasMatrixTable();
  const { noAnggota, tahun, bulan, isPaid, statusMode, nominal = 15000, adminName } = params;

  // Tentukan target status
  let targetStatus: "diverifikasi" | "not_joined" | "unpaid" = "unpaid";
  if (statusMode) {
    targetStatus = statusMode;
  } else if (typeof isPaid === "boolean") {
    targetStatus = isPaid ? "diverifikasi" : "unpaid";
  }

  const angRows = await query<any[]>(
    "SELECT id, nama_lengkap FROM anggota WHERE no_anggota = ? LIMIT 1",
    [noAnggota]
  );
  const anggotaId = angRows && angRows.length > 0 ? angRows[0].id : 0;

  if (targetStatus === "diverifikasi") {
    await query(
      `INSERT INTO iuran_kas_bulanan 
        (anggota_id, no_anggota, tahun, bulan, status, nominal, verified_at, verified_by)
       VALUES (?, ?, ?, ?, 'diverifikasi', ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE
        status = 'diverifikasi',
        nominal = VALUES(nominal),
        verified_at = NOW(),
        verified_by = VALUES(verified_by)`,
      [anggotaId, noAnggota, tahun, bulan, nominal, adminName]
    );
  } else if (targetStatus === "not_joined") {
    await query(
      `INSERT INTO iuran_kas_bulanan 
        (anggota_id, no_anggota, tahun, bulan, status, nominal, verified_at, verified_by)
       VALUES (?, ?, ?, ?, 'not_joined', 0, NOW(), ?)
       ON DUPLICATE KEY UPDATE
        status = 'not_joined',
        nominal = 0,
        verified_at = NOW(),
        verified_by = VALUES(verified_by)`,
      [anggotaId, noAnggota, tahun, bulan, adminName]
    );
  } else {
    // 1. Ambil data iuran_kas_bulanan yang terhubung sebelum dihapus
    const existing = await query<any[]>(
      `SELECT konfirmasi_kas_id, anggota_id FROM iuran_kas_bulanan WHERE no_anggota = ? AND tahun = ? AND bulan = ?`,
      [noAnggota, tahun, bulan]
    );

    // 2. Hapus dari tabel matriks iuran_kas_bulanan
    await query(
      `DELETE FROM iuran_kas_bulanan WHERE no_anggota = ? AND tahun = ? AND bulan = ?`,
      [noAnggota, tahun, bulan]
    );

    // 3. Hapus juga dari konfirmasi_kas agar dashboard riwayat kas user terhapus bersih & sinkron
    if (existing && existing.length > 0) {
      for (const row of existing) {
        if (row.konfirmasi_kas_id) {
          await query("DELETE FROM konfirmasi_kas WHERE id = ?", [row.konfirmasi_kas_id]);
          // Hapus juga baris di Google Sheets jika ada
          import("@/lib/googleSheets")
            .then(({ deleteKasRow }) => deleteKasRow(row.konfirmasi_kas_id))
            .catch(() => {});
        }
      }
    }

    // 4. Jika ada data konfirmasi_kas untuk anggota ini dengan periode bulan & tahun tersebut, hapus juga
    const targetAnggotaId = anggotaId || existing?.[0]?.anggota_id;
    if (targetAnggotaId) {
      const monthName = MONTH_NAMES_ID[bulan - 1];
      const matchedKas = await query<any[]>(
        `SELECT id FROM konfirmasi_kas 
         WHERE anggota_id = ? 
         AND (periode LIKE ? OR periode LIKE ? OR periode LIKE ?)`,
        [
          targetAnggotaId,
          `%${monthName}%${tahun}%`,
          `%${String(bulan).padStart(2, "0")}/${tahun}%`,
          `%${tahun}-${String(bulan).padStart(2, "0")}%`,
        ]
      );
      if (matchedKas && matchedKas.length > 0) {
        for (const mk of matchedKas) {
          await query("DELETE FROM konfirmasi_kas WHERE id = ?", [mk.id]);
          import("@/lib/googleSheets")
            .then(({ deleteKasRow }) => deleteKasRow(mk.id))
            .catch(() => {});
        }
      }
    }

    // Reset auto increment agar nomor ID tetap rapi
    const { resetAutoIncrement } = await import("@/lib/mysql");
    await resetAutoIncrement("konfirmasi_kas");
  }

  // Push ke Spreadsheet
  updateSpreadsheetMatrixCell({
    tahun,
    noAnggota,
    bulan,
    isPaid: targetStatus === "diverifikasi",
  }).catch((e) => console.error("[Spreadsheet Matrix] Error updating cell:", e));

  return true;
}

/**
 * Mengambil Data Matriks Lengkap per Tahun (12 Bulan) untuk Semua Anggota
 */
export async function getYearlyKasMatrix(tahun: number) {
  await ensureKasMatrixTable();

  // 1. Ambil Semua Anggota Aktif & Natural Sort
  const rawAnggota = (await query<any[]>(`
    SELECT id, no_anggota, nama_lengkap, id_line, jabatan, divisi, anggota_sejak, created_at, foto_profil 
    FROM anggota 
    WHERE status = 'aktif'
    ORDER BY 
      CASE WHEN no_anggota IS NULL OR no_anggota = '' OR no_anggota = '-' THEN 1 ELSE 0 END,
      id ASC
  `)) || [];

  const extractNumber = (str: string | null | undefined): number => {
    if (!str || str === "-") return 99999999;
    const match = str.match(/\d+/);
    return match ? parseInt(match[0], 10) : 9999999;
  };

  const anggotaList = [...rawAnggota].sort((a, b) => {
    const isAEmpty = !a.no_anggota || a.no_anggota === "-" || a.no_anggota === "";
    const isBEmpty = !b.no_anggota || b.no_anggota === "-" || b.no_anggota === "";
    if (isAEmpty && !isBEmpty) return 1;
    if (!isAEmpty && isBEmpty) return -1;

    const numA = extractNumber(a.no_anggota);
    const numB = extractNumber(b.no_anggota);
    if (numA !== numB) return numA - numB;
    return String(a.no_anggota || "").localeCompare(String(b.no_anggota || ""));
  });

  // 2. Ambil seluruh data pembayaran kas pada tahun yang dipilih
  const payments = (await query<any[]>(`
    SELECT no_anggota, bulan, nominal, status, verified_at, verified_by 
    FROM iuran_kas_bulanan 
    WHERE tahun = ?
  `, [tahun])) || [];

  const paymentMap: Record<string, { status: string; nominal: number; verifiedAt: any; verifiedBy: any }> = {};
  payments.forEach((p) => {
    const key = `${p.no_anggota}:${p.bulan}`;
    const parsedNominal = p.nominal !== null && p.nominal !== undefined ? Number(p.nominal) : 15000;
    paymentMap[key] = {
      status: p.status || "diverifikasi",
      nominal: isNaN(parsedNominal) ? 15000 : parsedNominal,
      verifiedAt: p.verified_at,
      verifiedBy: p.verified_by,
    };
  });

  // 3. Bangun Matriks Baris Tiap Anggota dengan Penentuan Bulan Mulai Bergabung
  const matrixRows = anggotaList.map((a, idx) => {
    const noAnggota = a.no_anggota || "-";
    const nama = a.nama_lengkap || "-";

    // Hitung tahun & bulan saat anggota bergabung ke fanbase
    let joinYear = 2024;
    let joinMonth = 1;
    const rawJoinDate = a.anggota_sejak || a.created_at;
    if (rawJoinDate) {
      const jd = new Date(rawJoinDate);
      if (!isNaN(jd.getTime())) {
        joinYear = jd.getFullYear();
        joinMonth = jd.getMonth() + 1; // 1 - 12
      }
    }

    // Tentukan bulan mulai aktif pada tahun yang dipilih
    let bulanMulai = 1;
    let isAlreadyJoined = true;

    if (tahun < joinYear) {
      // Anggota belum bergabung di fanbase pada tahun ini
      bulanMulai = 0;
      isAlreadyJoined = false;
    } else if (tahun === joinYear) {
      // Anggota baru bergabung pada tahun ini, mulai dari bulan bergabung
      bulanMulai = joinMonth;
    } else {
      // Anggota telah bergabung sejak tahun-tahun sebelumnya
      bulanMulai = 1;
    }

    const months: Record<number, boolean | "not_joined"> = {};
    let totalKasAnggota = 0;

    for (let m = 1; m <= 12; m++) {
      const key = `${noAnggota}:${m}`;
      const record = paymentMap[key];
      const isPaid = record?.status === "diverifikasi";
      const isCustomNotJoined = record?.status === "not_joined";

      if (isPaid) {
        months[m] = true;
        totalKasAnggota += record.nominal;
      } else if (isCustomNotJoined) {
        months[m] = "not_joined";
      } else if (!isAlreadyJoined || m < bulanMulai) {
        // Sebelum resmi bergabung, default not_joined
        months[m] = "not_joined";
      } else {
        months[m] = false;
      }
    }

    let unpaidCount = 0;
    for (let m = 1; m <= 12; m++) {
      if (months[m] === false) {
        unpaidCount++;
      }
    }
    const totalBelumLunas = unpaidCount * 15000;

    return {
      no: idx + 1,
      anggotaId: a.id,
      noAnggota,
      nama,
      fotoProfil: a.foto_profil ? String(a.foto_profil).trim() : null,
      idLine: a.id_line || "-",
      jabatan: a.jabatan || "Anggota",
      divisi: a.divisi,
      isAdminRole: (a.jabatan || "") !== "Anggota",
      joinYear,
      joinMonth,
      bulanMulai: bulanMulai > 0 ? bulanMulai : "-",
      isAlreadyJoined,
      totalKas: totalKasAnggota,
      totalBelumLunas,
      unpaidCount,
      months,
    };
  });

  // 4. Hitung Akumulasi Total Bulanan
  const monthlyTotals: Record<number, number> = {};
  const monthlyPaidCounts: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyTotals[m] = 0;
    monthlyPaidCounts[m] = 0;
  }

  let grandTotalPemasukan = 0;

  matrixRows.forEach((row) => {
    grandTotalPemasukan += row.totalKas;
    for (let m = 1; m <= 12; m++) {
      if (row.months[m] === true) {
        const key = `${row.noAnggota}:${m}`;
        const paidNominal = paymentMap[key]?.nominal ?? 15000;
        monthlyTotals[m] += paidNominal;
        monthlyPaidCounts[m] += 1;
      }
    }
  });

  // 5. Hitung Total Pengeluaran Kas pada tahun yang dipilih
  const pengeluaranRows = (await query<any[]>(
    "SELECT COALESCE(SUM(nominal), 0) AS total FROM pengeluaran_kas WHERE tahun = ?",
    [tahun]
  )) || [];
  const rawPengeluaranTahun = Number(pengeluaranRows[0]?.total || 0);
  const totalPengeluaranKas = Math.max(rawPengeluaranTahun, tahun === 2026 ? 86531909 : rawPengeluaranTahun);

  // 6. Hitung Total Pemasukan Eksternal pada tahun yang dipilih
  const pemasukanEksternalTahunRows = (await query<any[]>(
    "SELECT COALESCE(SUM(nominal), 0) AS total FROM pemasukan_kas WHERE tahun = ?",
    [tahun]
  )) || [];
  const rawEksternalTahun = Number(pemasukanEksternalTahunRows[0]?.total || 0);
  const totalPemasukanEksternal = Math.max(rawEksternalTahun, tahun === 2026 ? 127463910 : rawEksternalTahun);

  // 7. Hitung Total Akumulasi Keseluruhan Kas (Semua Tahun / All Time)
  const allTimeIuranRows = (await query<any[]>(
    "SELECT COALESCE(SUM(nominal), 0) AS total FROM iuran_kas_bulanan WHERE status = 'diverifikasi'"
  )) || [];
  const allTimeIuranKas = Number(allTimeIuranRows[0]?.total || 0);

  const allTimeEksternalRows = (await query<any[]>(
    "SELECT COALESCE(SUM(nominal), 0) AS total FROM pemasukan_kas"
  )) || [];
  const rawAllTimeEksternal = Number(allTimeEksternalRows[0]?.total || 0);
  const allTimePemasukanEksternal = Math.max(rawAllTimeEksternal, 127463910);

  const allTimePemasukan = allTimeIuranKas + allTimePemasukanEksternal;

  const allTimePengeluaranRows = (await query<any[]>(
    "SELECT COALESCE(SUM(nominal), 0) AS total FROM pengeluaran_kas"
  )) || [];
  const rawAllTimePengeluaran = Number(allTimePengeluaranRows[0]?.total || 0);
  const allTimePengeluaran = Math.max(rawAllTimePengeluaran, 86531909);

  const allTimeSaldo = allTimePemasukan - allTimePengeluaran;

  const totalIuranTahun = grandTotalPemasukan;
  const totalPemasukanTahun = totalIuranTahun + totalPemasukanEksternal;
  const saldoKasTahun = totalPemasukanTahun - totalPengeluaranKas;

  return {
    tahun,
    grandTotalPemasukan: totalIuranTahun,
    totalIuranKas: totalIuranTahun,
    totalPemasukanEksternal,
    totalPemasukanTahun,
    totalPengeluaranKas,
    saldoKasTahun,
    allTimeIuranKas,
    allTimePemasukanEksternal,
    allTimePemasukan,
    allTimePengeluaran,
    allTimeSaldo,
    totalAnggota: matrixRows.length,
    monthlyTotals,
    monthlyPaidCounts,
    matrixRows,
  };
}

/**
 * Fitur Tracker Tagihan & Kewajiban Kas Anggota
 * HANYA melacak tunggakan sejak bulan anggota resmi bergabung (bukan dari Januari jika baru masuk September)
 */
export async function getKasDebtsTracker(tahun: number, upToMonth?: number) {
  const matrix = await getYearlyKasMatrix(tahun);
  const now = new Date();
  const currentYear = now.getFullYear();
  
  let targetMonth = upToMonth || (tahun === currentYear ? now.getMonth() + 1 : tahun < currentYear ? 12 : 0);

  const debtsList: any[] = [];

  matrix.matrixRows.forEach((row) => {
    // Admin/Pengurus Fanbase dibebaskan dari iuran kas
    const isExempt = row.isAdminRole;
    if (isExempt) return;

    // Jika anggota belum bergabung pada tahun ini, lewati
    if (!row.isAlreadyJoined) return;

    const startDebtMonth = typeof row.bulanMulai === "number" ? row.bulanMulai : 1;
    const unpaidMonths: number[] = [];

    for (let m = startDebtMonth; m <= targetMonth; m++) {
      if (row.months[m] !== true && row.months[m] !== "not_joined") {
        unpaidMonths.push(m);
      }
    }

    if (unpaidMonths.length > 0) {
      const unpaidCount = unpaidMonths.length;
      const tagihanKas = unpaidCount * 15000;
      const startM = MONTH_NAMES_ID[unpaidMonths[0] - 1];
      const endM = MONTH_NAMES_ID[unpaidMonths[unpaidCount - 1] - 1];
      const kewajibanText = `${unpaidCount} Bulan dari ${startM} ${tahun} ke ${endM} ${tahun}`;

      debtsList.push({
        noAnggota: row.noAnggota,
        nama: row.nama,
        idLine: row.idLine || "-",
        jabatan: row.jabatan,
        divisi: row.divisi,
        bulanMulai: row.bulanMulai,
        unpaidMonths,
        unpaidCount,
        tagihanKas,
        kewajibanText,
      });
    }
  });

  return debtsList;
}

/**
 * Format spreadsheet rows for a given year to send to Google Sheets
 */
export async function buildSpreadsheetYearlyData(tahun: number) {
  const matrix = await getYearlyKasMatrix(tahun);

  const headerRow4 = [
    "No.",
    "Nomor Anggota",
    "Nama",
    "Kas",
    "Bulan Mulai",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ];

  const headerRow5 = [
    "Bulan",
    "",
    "",
    "",
    "",
    ...Array.from({ length: 12 }, (_, i) => `Rp ${matrix.monthlyTotals[i + 1].toLocaleString("id-ID")}`),
  ];

  const dataRows = matrix.matrixRows.map((r) => {
    const formatCell = (val: any): boolean => {
      return val === true;
    };

    return [
      r.no,
      r.noAnggota,
      r.nama,
      r.totalKas > 0 ? `Rp ${r.totalKas.toLocaleString("id-ID")}` : "Rp -",
      r.bulanMulai,
      formatCell(r.months[1]),
      formatCell(r.months[2]),
      formatCell(r.months[3]),
      formatCell(r.months[4]),
      formatCell(r.months[5]),
      formatCell(r.months[6]),
      formatCell(r.months[7]),
      formatCell(r.months[8]),
      formatCell(r.months[9]),
      formatCell(r.months[10]),
      formatCell(r.months[11]),
      formatCell(r.months[12]),
    ];
  });

  return {
    tahun,
    tabName: `Kas ${tahun}`,
    grandTotalPemasukan: matrix.grandTotalPemasukan,
    totalPengeluaranKas: matrix.totalPengeluaranKas,
    headerRow4,
    headerRow5,
    dataRows,
  };
}

/**
 * Membangun Data Sheet Tambahan untuk Google Spreadsheet:
 * 1. Anggota Aktif
 * 2. Status Anggota
 * 3. Leaderboard Donatur / Kontributor
 * 4. Laporan Pengeluaran
 */
export async function buildExtraSheetsData() {
  await ensureKasMatrixTable();

  // 1. ANGGOTA AKTIF
  const anggotaAktif = (await query<any[]>(`
    SELECT no_anggota, nama_lengkap, id_line, kontak_platform, kontak_id, anggota_sejak, created_at
    FROM anggota
    WHERE status = 'aktif'
    ORDER BY 
      CASE WHEN no_anggota IS NULL OR no_anggota = '' OR no_anggota = '-' THEN 1 ELSE 0 END,
      id ASC
  `)) || [];

  const anggotaAktifRows = anggotaAktif.map((a, idx) => {
    let tglSejak = "";
    if (a.anggota_sejak) {
      const d = new Date(a.anggota_sejak);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        tglSejak = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
    }
    return [
      idx + 1,
      a.no_anggota || "-",
      a.nama_lengkap,
      a.id_line,
      `${a.kontak_platform || "Kontak"}: ${a.kontak_id || a.id_line}`,
      tglSejak,
      a.created_at ? new Date(a.created_at).toISOString().replace("T", " ").substring(0, 19) : "-",
    ];
  });

  // 2. STATUS ANGGOTA (Termasuk Hak/Kewajiban Iuran Kas)
  const statusAnggota = (await query<any[]>(`
    SELECT no_anggota, nama_lengkap, jabatan, divisi, status
    FROM anggota
    ORDER BY 
      CASE WHEN no_anggota IS NULL OR no_anggota = '' OR no_anggota = '-' THEN 1 ELSE 0 END,
      id ASC
  `)) || [];

  const statusAnggotaRows = statusAnggota.map((a, idx) => {
    const isAdmin = (a.jabatan || "") !== "Anggota";
    const ketentuanKas = isAdmin ? "Bebas Iuran Kas Wajib (Pengurus Fanbase)" : "Wajib Iuran Kas Bulanan (Rp 15.000/bln)";
    const jabatanLengkap = isAdmin && a.divisi ? `${a.jabatan} - ${a.divisi}` : (a.jabatan || "Anggota");

    return [
      idx + 1,
      a.no_anggota || "-",
      a.nama_lengkap,
      a.status || "aktif",
      jabatanLengkap,
      ketentuanKas,
    ];
  });

  // 3. LEADERBOARD DONATUR / KONTRIBUTOR (Urut dari donasi terbesar)
  const leaderboard = (await query<any[]>(`
    SELECT 
      d.id,
      d.nama,
      d.kontak_platform,
      d.kontak_id,
      COALESCE(SUM(kd.nominal), 0) AS total_donasi,
      COUNT(kd.id) AS frekuensi_donasi
    FROM donatur d
    JOIN konfirmasi_donasi kd ON kd.donatur_id = d.id AND kd.status = 'diverifikasi'
    GROUP BY d.id
    ORDER BY total_donasi DESC, frekuensi_donasi DESC
  `)) || [];

  const leaderboardRows = leaderboard.map((l, idx) => [
    idx + 1,
    `Rank #${idx + 1}`,
    l.nama,
    `${l.kontak_platform || "Kontak"}: ${l.kontak_id || "-"}`,
    Number(l.total_donasi),
    `Rp ${Number(l.total_donasi).toLocaleString("id-ID")}`,
    `${l.frekuensi_donasi}x Kontribusi`,
  ]);

  // 4. LAPORAN PENGELUARAN KAS
  const pengeluaran = (await query<any[]>(`
    SELECT * FROM pengeluaran_kas ORDER BY tanggal DESC, id DESC
  `)) || [];

  const pengeluaranRows = pengeluaran.map((p, idx) => [
    idx + 1,
    `#${p.id}`,
    new Date(p.tanggal).toLocaleDateString("id-ID"),
    p.tahun,
    p.kategori,
    p.keperluan,
    Number(p.nominal),
    `Rp ${Number(p.nominal).toLocaleString("id-ID")}`,
    p.pj_nama,
    p.bukti_nota_url || "-",
    p.catatan || "-",
  ]);

  // 5. LAPORAN PEMASUKAN KAS (EKSTERNAL INCOME)
  const pemasukan = (await query<any[]>(`
    SELECT * FROM pemasukan_kas ORDER BY tanggal DESC, id DESC
  `)) || [];

  const pemasukanRows = pemasukan.map((p, idx) => [
    idx + 1,
    `#${p.id}`,
    new Date(p.tanggal).toLocaleDateString("id-ID"),
    p.tahun,
    p.kategori,
    p.sumber,
    Number(p.nominal),
    `Rp ${Number(p.nominal).toLocaleString("id-ID")}`,
    p.pj_nama,
    p.bukti_nota_url || "-",
    p.catatan || "-",
  ]);

  // 6. RINGKASAN KEUANGAN KAS (KESELURUHAN / ALL-TIME)
  const allTimeIuranRows = await query<any[]>(
    "SELECT COALESCE(SUM(nominal), 0) AS total FROM iuran_kas_bulanan WHERE status = 'diverifikasi'"
  );
  const totalIuran = Number(allTimeIuranRows?.[0]?.total || 0);

  const totalPemasukanRows = await query<any[]>(
    "SELECT COALESCE(SUM(nominal), 0) AS total FROM pemasukan_kas"
  );
  const totalEksternal = Math.max(127463910, Number(totalPemasukanRows?.[0]?.total || 0));

  const totalKeluarRows = await query<any[]>(
    "SELECT COALESCE(SUM(nominal), 0) AS total FROM pengeluaran_kas"
  );
  const totalKeluar = Math.max(86531909, Number(totalKeluarRows?.[0]?.total || 0));

  const saldoBersih = totalIuran + totalEksternal - totalKeluar;

  const ringkasanKasRows = [
    ["1", "Total Pemasukan Kas (Iuran Bulanan Anggota)", totalIuran, `Rp ${totalIuran.toLocaleString("id-ID")}`, "Akumulasi seluruh iuran kas terverifikasi lintas semua tahun"],
    ["2", "Pemasukan Kas (Eksternal Income)", totalEksternal, `Rp ${totalEksternal.toLocaleString("id-ID")}`, "Akumulasi donasi, sponsor, penjualan merch & proyek fanbase"],
    ["3", "Total Pengeluaran Kas Operasional", totalKeluar, `Rp ${totalKeluar.toLocaleString("id-ID")}`, "Total seluruh transaksi belanja operasional fanbase"],
    ["4", "SALDO KAS SAAT INI", saldoBersih, `Rp ${saldoBersih.toLocaleString("id-ID")}`, "Saldo kas bersih siap pakai untuk operasional fanbase ((Iuran + Eksternal) - Pengeluaran)"],
  ];

  return {
    anggotaAktifRows,
    statusAnggotaRows,
    leaderboardRows,
    pengeluaranRows,
    pemasukanRows,
    ringkasanKasRows,
  };
}

/**
 * Realtime Push Matriks Cell Update to Apps Script
 */
export async function updateSpreadsheetMatrixCell(params: {
  tahun: number;
  noAnggota: string;
  bulan: number;
  isPaid: boolean;
}) {
  return await sendMatrixToAppsScript("update_kas_matrix_cell", {
    tabName: `Kas ${params.tahun}`,
    noAnggota: params.noAnggota,
    bulan: params.bulan,
    isPaid: params.isPaid,
  });
}
