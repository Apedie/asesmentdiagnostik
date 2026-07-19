import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { analisisSiswa, analisisKelas, hitungStatistikKelas } from './analysis'

const HIJAU = [27, 67, 50]

function header(doc, judul, subjudul) {
  doc.setFillColor(...HIJAU)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.text('Petualangan Jati Diri', 14, 12)
  doc.setFontSize(10)
  doc.text(judul, 14, 20)
  if (subjudul) doc.text(subjudul, doc.internal.pageSize.getWidth() - 14, 20, { align: 'right' })
  doc.setTextColor(0, 0, 0)
}

// Laporan lengkap satu kelas (Analisis Kelas, Tabel Rekap, dan Analisis Individu Siswa)
export function exportKelasPDF(kelas, rows) {
  const doc = new jsPDF()
  
  // Halaman 1: Cover & Analisis Kelas
  header(doc, `Laporan Hasil Asesmen Kelas: ${kelas.nama_kelas}`, `Kode: ${kelas.kode_kelas}`)
  let y = 38
  
  doc.setFontSize(11)
  doc.text(`Mata Pelajaran : ${kelas.mapel || 'Umum'}`, 14, y); y += 6
  doc.text(`Tahun Ajaran   : ${kelas.tahun_ajaran || '-'}`, 14, y); y += 6
  doc.text(`Tanggal Cetak  : ${new Date().toLocaleDateString('id-ID')}`, 14, y); y += 10
  
  const selesai = rows.filter(r => r.status_sesi === 'selesai' && r.result)
  const statsKelas = hitungStatistikKelas(selesai.map(r => r.result))
  const narasiKelas = analisisKelas(rows)
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Analisis Kemampuan Kelas (Deskriptif):', 14, y); y += 8
  doc.setFont('helvetica', 'normal')
  
  doc.setFontSize(9.5)
  narasiKelas.forEach((p) => {
    const lines = doc.splitTextToSize(p, 182)
    if (y + lines.length * 5 > 280) {
      doc.addPage()
      y = 20
    }
    doc.text(lines, 14, y)
    y += lines.length * 5 + 4
  })
  
  // Halaman Berikutnya: Tabel Semua Siswa
  doc.addPage()
  header(doc, `Rekapitulasi Nilai Siswa`, `Kelas: ${kelas.nama_kelas}`)
  y = 38
  
  autoTable(doc, {
    startY: y,
    head: [['No', 'Nama', 'Absen', 'Status', 'MTK', 'IPA', 'Penalaran', 'Gaya Belajar']],
    body: rows.map((r, i) => [
      i + 1,
      r.nama,
      r.no_absen,
      r.status_sesi,
      r.result?.skor_matematika ?? '-',
      r.result?.skor_ipa ?? '-',
      r.result?.skor_penalaran ?? '-',
      r.result?.gaya_belajar_dominan ?? '-',
    ]),
    headStyles: { fillColor: HIJAU },
    styles: { fontSize: 8, cellPadding: 2.5 },
  })
  
  y = doc.lastAutoTable.finalY + 12
  
  // Halaman-halaman berikutnya: Analisis Deskriptif Masing-masing Siswa
  if (selesai.length > 0) {
    if (y > 240) {
      doc.addPage()
      y = 20
    } else {
      y += 4
    }
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Analisis Kemampuan Individu Siswa:', 14, y); y += 8
    doc.setFont('helvetica', 'normal')
    
    selesai.forEach((s) => {
      // Periksa sisa ruang halaman, jika tidak cukup untuk header & beberapa baris teks, tambah halaman baru
      if (y > 230) {
        doc.addPage()
        y = 20
      }
      
      doc.setFontSize(10.5)
      doc.setFont('helvetica', 'bold')
      doc.text(`${s.no_absen}. ${s.nama}`, 14, y); y += 5.5
      doc.setFont('helvetica', 'normal')
      
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      doc.text(`Skor: Matematika ${s.result.skor_matematika ?? '-'} | IPA ${s.result.skor_ipa ?? '-'} | Penalaran Logis ${s.result.skor_penalaran ?? '-'} | Gaya Belajar: ${s.result.gaya_belajar_dominan ?? '-'}`, 14, y); y += 5.5
      doc.setTextColor(0, 0, 0)
      
      doc.setFontSize(9.2)
      const paragraphs = analisisSiswa(s, s.result, statsKelas)
      paragraphs.forEach((p) => {
        const lines = doc.splitTextToSize(p, 182)
        if (y + lines.length * 4.5 > 280) {
          doc.addPage()
          y = 20
        }
        doc.text(lines, 14, y)
        y += lines.length * 4.5 + 2
      })
      
      y += 4
      doc.setDrawColor(220, 220, 220)
      doc.line(14, y, 196, y)
      y += 8
    })
  }
  
  doc.save(`Laporan_${kelas.nama_kelas.replace(/\s+/g, '_')}.pdf`)
}

// Laporan individu satu siswa lengkap dengan analisis deskriptif, perbandingan kelas, dan rincian jawaban per kategori
export function exportSiswaPDF(kelas, siswa, result, statsKelas, jawabanKategori) {
  const doc = new jsPDF()
  header(doc, 'Laporan Individu Siswa', kelas?.nama_kelas || '')
  let y = 38
  doc.setFontSize(12)
  doc.text(`Nama   : ${siswa.nama}`, 14, y); y += 7
  doc.text(`Absen  : ${siswa.no_absen}`, 14, y); y += 7
  doc.text(`Status : ${siswa.status_sesi}`, 14, y); y += 10

  if (result) {
    autoTable(doc, {
      startY: y,
      head: [['Komponen', 'Skor', 'Kategori']],
      body: [
        ['Matematika', result.skor_matematika ?? '-', result.kategori_matematika ?? '-'],
        ['IPA', result.skor_ipa ?? '-', result.kategori_ipa ?? '-'],
        ['Penalaran Logis', result.skor_penalaran ?? '-', result.kategori_penalaran ?? '-'],
      ],
      headStyles: { fillColor: HIJAU },
    })
    y = doc.lastAutoTable.finalY + 8

    autoTable(doc, {
      startY: y,
      head: [['Gaya Belajar (VAK)', 'Jumlah Pilihan']],
      body: [
        ['Visual', result.vak_v ?? 0],
        ['Auditori', result.vak_a ?? 0],
        ['Kinestetik', result.vak_k ?? 0],
        ['Dominan', result.gaya_belajar_dominan ?? '-'],
      ],
      headStyles: { fillColor: HIJAU },
    })
    y = doc.lastAutoTable.finalY + 8

    doc.setFontSize(12)
    doc.text('Rekomendasi Pembelajaran:', 14, y); y += 7
    doc.setFontSize(10)
    const rekom = result.rekomendasi || []
    if (rekom.length === 0) doc.text('- (belum ada rekomendasi otomatis)', 16, y)
    rekom.forEach((r) => {
      const lines = doc.splitTextToSize(`• ${r}`, 180)
      if (y + lines.length * 6 > 280) {
        doc.addPage()
        y = 20
      }
      doc.text(lines, 16, y)
      y += lines.length * 6
    })
    y += 6

    // Kesimpulan analisis deskriptif (naratif)
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFontSize(12)
    doc.text('Kesimpulan Analisis:', 14, y); y += 7
    doc.setFontSize(9.5)
    analisisSiswa(siswa, result, statsKelas).forEach((paragraf) => {
      const lines = doc.splitTextToSize(paragraf, 182)
      if (y + lines.length * 5 > 280) {
        doc.addPage()
        y = 20
      }
      doc.text(lines, 14, y)
      y += lines.length * 5 + 4
    })
    
    // Rincian Jawaban Siswa per Kategori (Matematika, IPA, Penalaran)
    if (jawabanKategori) {
      y += 6
      if (y > 240) {
        doc.addPage()
        y = 20
      }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Rincian Jawaban per Kategori:', 14, y); y += 8
      doc.setFont('helvetica', 'normal')
      
      const MODUL_MAP = {
        matematika: 'Matematika',
        ipa: 'IPA',
        penalaran: 'Penalaran Logis'
      }
      
      for (const modul of ['matematika', 'ipa', 'penalaran']) {
        const perTopik = jawabanKategori[modul]
        if (!perTopik) continue
        
        // Kumpulkan semua soal dalam modul ini
        const tableBody = []
        Object.entries(perTopik).forEach(([topik, soalList]) => {
          soalList.forEach((s) => {
            tableBody.push([
              topik,
              s.teks_soal,
              s.jawabanSiswa,
              s.jawabanBenar || '-',
              s.isCorrect ? '✓ Benar' : '✗ Salah',
              s.isCorrect // simpan boolean untuk didParseCell
            ])
          })
        })
        
        if (tableBody.length === 0) continue
        
        // Cetak Judul Modul
        if (y > 250) {
          doc.addPage()
          y = 20
        }
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.text(MODUL_MAP[modul] || modul.toUpperCase(), 14, y); y += 4
        doc.setFont('helvetica', 'normal')
        
        autoTable(doc, {
          startY: y,
          head: [['Topik', 'Pertanyaan / Soal', 'Jawaban Siswa', 'Kunci Jawaban', 'Status']],
          body: tableBody.map(row => row.slice(0, 5)), // hilangkan boolean isCorrect dari data visual
          headStyles: { fillColor: HIJAU },
          styles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 28 }, // Topik
            1: { cellWidth: 72 }, // Pertanyaan
            2: { cellWidth: 32 }, // Jawaban Siswa
            3: { cellWidth: 32 }, // Kunci
            4: { cellWidth: 18 }  // Status
          },
          didParseCell: function(data) {
            if (data.row.section === 'body') {
              const isCorrectVal = tableBody[data.row.index][5]
              if (isCorrectVal === false) {
                // Beri latar belakang merah muda lembut untuk jawaban salah
                data.cell.styles.fillColor = [255, 240, 240]
                if (data.column.index === 4) {
                  data.cell.styles.textColor = [220, 50, 50]
                  data.cell.styles.fontStyle = 'bold'
                }
              } else if (isCorrectVal === true && data.column.index === 4) {
                data.cell.styles.textColor = [27, 67, 50]
                data.cell.styles.fontStyle = 'bold'
              }
            }
          }
        })
        y = doc.lastAutoTable.finalY + 8
      }
    }
  } else {
    doc.setFontSize(11)
    doc.text('Siswa belum menyelesaikan asesmen.', 14, y)
  }

  doc.save(`Laporan_${siswa.nama.replace(/\s+/g, '_')}.pdf`)
}
