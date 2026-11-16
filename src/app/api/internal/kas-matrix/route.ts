import { NextResponse } from "next/server";
import { getYearlyKasMatrix } from "@/lib/kasMatrix";
import { query } from "@/lib/mysql";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tahun = parseInt(searchParams.get("tahun") || String(new Date().getFullYear()), 10);

    if (isNaN(tahun) || tahun < 2020 || tahun > 2035) {
      return NextResponse.json({ status: false, message: "Tahun tidak valid" }, { status: 400 });
    }

    const data = await getYearlyKasMatrix(tahun);

    const publicRows = data.matrixRows.map((row: any) => ({
      no: row.no,
      noAnggota: row.noAnggota,
      nama: row.nama,
      fotoProfil: row.fotoProfil || null,
      jabatan: row.jabatan,
      isAdminRole: row.isAdminRole,
      bulanMulai: row.bulanMulai,
      isAlreadyJoined: row.isAlreadyJoined,
      totalKas: row.isAdminRole ? null : row.totalKas,
      totalBelumLunas: row.isAdminRole ? null : (row.totalBelumLunas ?? 0),
      unpaidCount: row.isAdminRole ? null : (row.unpaidCount ?? 0),
      months: row.months,
    }));

    // Ambil data pengeluaran kas pada tahun yang dipilih
    const pengeluaranRows = (await query<any[]>(
      `SELECT id, tanggal, tahun, kategori, keperluan, nominal, pj_nama, bukti_nota_url, catatan 
       FROM pengeluaran_kas 
       WHERE tahun = ? 
       ORDER BY tanggal DESC, id DESC`,
      [tahun]
    )) || [];

    const totalPengeluaran = pengeluaranRows.reduce(
      (sum: number, p: any) => sum + (Number(p.nominal) || 0),
      0
    );

    // Ambil data pemasukan eksternal pada tahun yang dipilih
    const pemasukanRows = (await query<any[]>(
      `SELECT id, tanggal, tahun, kategori, sumber, nominal, pj_nama, bukti_nota_url, catatan 
       FROM pemasukan_kas 
       WHERE tahun = ? 
       ORDER BY tanggal DESC, id DESC`,
      [tahun]
    )) || [];

    const totalPemasukanEksternal = pemasukanRows.reduce(
      (sum: number, p: any) => sum + (Number(p.nominal) || 0),
      0
    );

    const saldoKasBersih = data.saldoKasTahun ?? (data.allTimeSaldo ?? (data.grandTotalPemasukan - totalPengeluaran));

    return NextResponse.json({
      status: true,
      tahun: data.tahun,
      totalAnggota: data.totalAnggota,
      monthlyTotals: data.monthlyTotals,
      monthlyPaidCounts: data.monthlyPaidCounts,
      grandTotalPemasukan: data.grandTotalPemasukan,
      totalPengeluaran: data.totalPengeluaranKas ?? totalPengeluaran,
      totalPemasukanEksternal: data.totalPemasukanEksternal ?? totalPemasukanEksternal,
      saldoKasBersih,
      allTimeIuranKas: data.allTimeIuranKas ?? data.allTimePemasukan,
      allTimePemasukanEksternal: data.allTimePemasukanEksternal ?? 0,
      allTimePemasukan: data.allTimePemasukan ?? data.grandTotalPemasukan,
      allTimePengeluaran: data.allTimePengeluaran ?? totalPengeluaran,
      allTimeSaldo: data.allTimeSaldo ?? saldoKasBersih,
      matrixRows: publicRows,
      pengeluaranList: pengeluaranRows,
      pemasukanList: pemasukanRows,
    });
  } catch (err: any) {
    console.error("[Public Matrix API] Error:", err);
    return NextResponse.json({ status: false, message: "Gagal memuat data" }, { status: 500 });
  }
}
