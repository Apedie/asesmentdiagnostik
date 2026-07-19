import * as XLSX from 'xlsx'
import { hitungStatistikKelas, analisisSiswa, analisisKelas } from './analysis'

// Ekspor laporan analisis kelas dan siswa ke Excel (.xlsx)
export function exportKelasExcel(kelas, rows) {
  const selesai = rows.filter((r) => r.status_sesi === 'selesai' && r.result)
  const statsKelas = hitungStatistikKelas(selesai.map((r) => r.result))
  const narasiKelas = analisisKelas(rows)

  // ==========================================
  // SHEET 1: Ringkasan & Analisis Kelas
  // ==========================================
  const ringkasanData = [
    ['LAPORAN ANALISIS ASESMEN KELAS'],
    [],
    ['INFORMASI KELAS'],
    ['Nama Kelas', kelas.nama_kelas],
    ['Mata Pelajaran', kelas.mapel || 'Umum'],
    ['Tahun Ajaran', kelas.tahun_ajaran || '-'],
    ['Kode Kelas', kelas.kode_kelas],
    ['Tanggal Cetak', new Date().toLocaleDateString('id-ID')],
    [],
    ['STATISTIK SISWA'],
    ['Total Siswa Terdaftar', rows.length],
    ['Selesai Asesmen', selesai.length],
    ['Dalam Sesi (Berjalan)', rows.filter((r) => r.status_sesi === 'berjalan').length],
    ['Belum Mulai', rows.filter((r) => r.status_sesi === 'belum').length],
    [],
    ['RATA-RATA NILAI AKADEMIK KELAS'],
    ['Mata Pelajaran / Modul', 'Rata-rata Skor'],
    ['Matematika', statsKelas.matematika?.avg ?? '-'],
    ['IPA', statsKelas.ipa?.avg ?? '-'],
    ['Penalaran Logis', statsKelas.penalaran?.avg ?? '-'],
    [],
    ['KESIMPULAN ANALISIS KELAS (DESKRIPTIF)'],
  ]

  // Tambahkan paragraf analisis kelas ke Sheet 1
  narasiKelas.forEach((p) => {
    ringkasanData.push([p])
    ringkasanData.push([]) // Baris kosong sebagai pemisah paragraf
  })

  const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanData)
  
  // Atur lebar kolom Ringkasan
  wsRingkasan['!cols'] = [
    { wch: 45 }, // Kolom A
    { wch: 50 }, // Kolom B
  ]

  // ==========================================
  // SHEET 2: Data & Analisis Siswa
  // ==========================================
  const studentData = rows.map((r, i) => {
    let deskripsiIndividu = '-'
    let rekomendasiText = '-'
    if (r.result) {
      const paragraphs = analisisSiswa(r, r.result, statsKelas)
      deskripsiIndividu = paragraphs.join('\n\n')
      rekomendasiText = (r.result.rekomendasi || []).join('\n')
    }

    return {
      'No': i + 1,
      'Nama': r.nama,
      'No Absen': r.no_absen,
      'Status Sesi': r.status_sesi,
      'Skor Matematika': r.result?.skor_matematika ?? '',
      'Kategori Matematika': r.result?.kategori_matematika ?? '',
      'Skor IPA': r.result?.skor_ipa ?? '',
      'Kategori IPA': r.result?.kategori_ipa ?? '',
      'Skor Penalaran': r.result?.skor_penalaran ?? '',
      'Kategori Penalaran': r.result?.kategori_penalaran ?? '',
      'VAK Visual': r.result?.vak_v ?? '',
      'VAK Auditori': r.result?.vak_a ?? '',
      'VAK Kinestetik': r.result?.vak_k ?? '',
      'Gaya Belajar Dominan': r.result?.gaya_belajar_dominan ?? '',
      'Analisis Deskriptif Individu': deskripsiIndividu,
      'Rekomendasi Pembelajaran': rekomendasiText,
    }
  })

  const wsSiswa = XLSX.utils.json_to_sheet(studentData)
  
  // Atur lebar kolom Sheet Data Siswa
  wsSiswa['!cols'] = [
    { wch: 5 },   // No
    { wch: 25 },  // Nama
    { wch: 10 },  // No Absen
    { wch: 12 },  // Status Sesi
    { wch: 15 },  // Skor MTK
    { wch: 20 },  // Kategori MTK
    { wch: 15 },  // Skor IPA
    { wch: 20 },  // Kategori IPA
    { wch: 15 },  // Skor Penalaran
    { wch: 20 },  // Kategori Penalaran
    { wch: 12 },  // VAK V
    { wch: 12 },  // VAK A
    { wch: 12 },  // VAK K
    { wch: 20 },  // Gaya Belajar Dominan
    { wch: 80 },  // Analisis Deskriptif Individu
    { wch: 50 },  // Rekomendasi Pembelajaran
  ]

  // ==========================================
  // BUNDLE KE WORKBOOK (.xlsx)
  // ==========================================
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan Kelas')
  XLSX.utils.book_append_sheet(wb, wsSiswa, 'Data & Analisis Siswa')

  XLSX.writeFile(wb, `Laporan_${kelas.nama_kelas.replace(/\s+/g, '_')}.xlsx`)
}
