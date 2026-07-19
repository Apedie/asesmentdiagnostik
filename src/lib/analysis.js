// Menghasilkan kesimpulan deskriptif (naratif) untuk individu & kelas,
// berdasarkan skor per modul + rincian per topik & per tingkat kesulitan
// yang dihitung server (lihat student_results.detail_topik).

export const MODUL_LABEL = { matematika: 'Matematika', ipa: 'IPA', penalaran: 'Penalaran Logis' }

export const TOPIK_LABEL = {
  operasi_hitung: 'operasi hitung dasar',
  pecahan: 'pecahan',
  desimal: 'bilangan desimal',
  persen: 'persentase',
  geometri: 'geometri dasar',
  aljabar: 'aljabar sederhana',
  statistika: 'statistika dasar (rata-rata)',
  soal_cerita: 'soal cerita / aplikasi',
  kpk_fpb: 'KPK & FPB',
  bilangan_bulat: 'bilangan bulat',
  pola: 'pola bilangan',
  makhluk_hidup: 'makhluk hidup',
  materi_perubahan: 'materi & perubahannya',
  energi: 'energi',
  bumi_antariksa: 'bumi & antariksa',
  tubuh_manusia: 'tubuh manusia',
  seri_angka: 'seri angka',
  analogi: 'analogi verbal',
  pola_huruf: 'pola huruf',
  deduktif: 'penalaran deduktif',
  klasifikasi: 'klasifikasi (mencari yang berbeda)',
}

const labelTopik = (k) => TOPIK_LABEL[k] || k

function persenOf(benar, total) {
  if (!total) return null
  return Math.round((benar / total) * 100)
}

// Urutkan topik dari yang paling lemah (persen terendah); hanya topik dengan data.
export function topikTerurut(perTopik) {
  return Object.entries(perTopik || {})
    .map(([topik, v]) => ({ topik, label: labelTopik(topik), benar: v.benar, total: v.total, persen: persenOf(v.benar, v.total) }))
    .filter((t) => t.total > 0)
    .sort((a, b) => a.persen - b.persen || b.total - a.total)
}

// ---------------------------------------------------------------------
// ANALISIS INDIVIDU
// ---------------------------------------------------------------------

function narasiTingkatKesulitan(perKesulitan, labelModul) {
  const m = perKesulitan?.mudah, s = perKesulitan?.sedang, sk = perKesulitan?.sukar
  const pm = m?.total ? persenOf(m.benar, m.total) : null
  const ps = s?.total ? persenOf(s.benar, s.total) : null
  const psk = sk?.total ? persenOf(sk.benar, sk.total) : null

  if (pm == null && ps == null && psk == null) return ''

  if (pm != null && pm < 50) {
    return `Pada soal tingkat dasar ${labelModul} pun masih banyak yang terlewat (${m.benar}/${m.total} benar), menandakan konsep fundamental perlu diperkuat lebih dulu sebelum melanjutkan ke materi yang lebih kompleks.`
  }
  if (pm != null && pm >= 70 && ps != null && ps < 50) {
    return `Konsep dasar ${labelModul} sudah dikuasai dengan baik (${m.benar}/${m.total} pada soal mudah), namun mulai kesulitan saat soal meningkat ke tingkat menengah (${s.benar}/${s.total}) — cocok untuk pendalaman bertahap.`
  }
  if (pm != null && pm >= 70 && ps != null && ps >= 60 && psk != null && psk >= 50) {
    return `Menunjukkan pemahaman yang kuat bahkan pada soal menantang (tingkat sukar: ${sk.benar}/${sk.total} benar) — berpotensi diberikan pengayaan (enrichment) di luar materi standar.`
  }
  if (pm != null && pm >= 70 && ps != null && ps >= 50) {
    return `Konsep dasar hingga menengah ${labelModul} dikuasai dengan cukup baik (mudah ${m.benar}/${m.total}, sedang ${s.benar}/${s.total})${psk != null ? `, sementara soal tingkat sukar masih menjadi tantangan (${sk.benar}/${sk.total})` : ''}.`
  }
  return `Penguasaan ${labelModul} bervariasi menurut tingkat kesulitan soal (mudah ${pm ?? '-'}%, sedang ${ps ?? '-'}%${psk != null ? `, sukar ${psk}%` : ''}).`
}

function narasiTopikModul(detailModul, labelModul) {
  const urut = topikTerurut(detailModul?.per_topik)
  if (urut.length === 0) return ''
  const lemah = urut.filter((t) => t.persen < 60).slice(0, 2)
  const kuat = [...urut].reverse().filter((t) => t.persen >= 80).slice(0, 2)

  const bagian = []
  if (kuat.length > 0) {
    bagian.push(`sudah cukup kuat pada topik ${kuat.map((t) => `${t.label} (${t.benar}/${t.total})`).join(' dan ')}`)
  }
  if (lemah.length > 0) {
    bagian.push(`masih perlu penguatan pada topik ${lemah.map((t) => `${t.label} (${t.benar}/${t.total})`).join(' dan ')}`)
  }
  if (bagian.length === 0) return ''
  return `Rincian topik ${labelModul}: ${bagian.join('; ')}.`
}

const KATA_KATEGORI = {
  'Perlu Pendampingan': 'masih memerlukan pendampingan intensif',
  'Cukup': 'berada pada tahap cukup, masih ada ruang penguatan',
  'Baik': 'menunjukkan pemahaman yang baik',
  'Sangat Baik': 'menunjukkan penguasaan yang sangat baik',
}

function analisisModul(modulKey, skor, kategori, detailModul) {
  const label = MODUL_LABEL[modulKey]
  if (skor == null) return `${label}: belum ada data (soal belum dikerjakan).`
  const intro = `${label} — skor ${skor} (${kategori}), ${KATA_KATEGORI[kategori] || ''}.`
  const kesulitan = narasiTingkatKesulitan(detailModul?.per_kesulitan, label)
  const topik = narasiTopikModul(detailModul, label)
  return [intro, kesulitan, topik].filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------
// PERBANDINGAN DENGAN TEMAN SEKELAS
// ---------------------------------------------------------------------

const SKOR_KEY = { matematika: 'skor_matematika', ipa: 'skor_ipa', penalaran: 'skor_penalaran' }

function statistikModul(skorKey, daftarHasil) {
  const vals = (daftarHasil || []).map((r) => r?.[skorKey]).filter((v) => v != null).map(Number)
  if (vals.length === 0) return null
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  return { avg, n: vals.length, vals }
}

// daftarHasil: array of student_results-like objects (skor_matematika/ipa/penalaran)
// milik siswa SEKELAS yang sudah selesai (boleh termasuk siswa yang dianalisis).
export function hitungStatistikKelas(daftarHasil) {
  return {
    matematika: statistikModul('skor_matematika', daftarHasil),
    ipa: statistikModul('skor_ipa', daftarHasil),
    penalaran: statistikModul('skor_penalaran', daftarHasil),
  }
}

function peringkatDari(skor, vals) {
  const lebihBaik = vals.filter((v) => v > skor).length
  return { rank: lebihBaik + 1, total: vals.length }
}

// Menghasilkan satu paragraf perbandingan skor siswa vs rata-rata & peringkat kelas.
export function narasiPerbandinganKelas(nama, result, statsKelas) {
  if (!statsKelas) return ''
  const bagian = []
  Object.entries(SKOR_KEY).forEach(([modul, key]) => {
    const skor = result?.[key]
    const stat = statsKelas[modul]
    if (skor == null || !stat || stat.n < 2) return
    const { rank, total } = peringkatDari(Number(skor), stat.vals)
    const selisih = Math.round(Number(skor) - stat.avg)
    const posisi = selisih > 0 ? `${selisih} poin di atas` : selisih < 0 ? `${Math.abs(selisih)} poin di bawah` : 'setara dengan'
    bagian.push(`${MODUL_LABEL[modul]}: peringkat ${rank} dari ${total} siswa, ${posisi} rata-rata kelas (${stat.avg})`)
  })
  if (bagian.length === 0) return ''
  return `Dibandingkan teman sekelas yang telah menyelesaikan asesmen, posisi ${nama} adalah — ${bagian.join('; ')}.`
}

// ---------------------------------------------------------------------
// RINCIAN JAWABAN PER KATEGORI (untuk melihat di mana siswa salah)
// ---------------------------------------------------------------------

// daftarJawaban: array hasil gabungan student_answers + question_bank, tiap item:
// { modul, topik, teks_soal, opsi, kunci_jawaban, jawaban, is_correct, urutan }
// Mengembalikan: { [modul]: { [topik]: [{ teks_soal, jawabanSiswa, jawabanBenar, isCorrect, isVak }] } }
export function kelompokkanJawabanPerKategori(daftarJawaban) {
  const hasil = {}
  ;(daftarJawaban || [])
    .slice()
    .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
    .forEach((q) => {
      const modul = q.modul
      const topik = q.topik ? labelTopik(q.topik) : 'Lainnya'
      const opsiSiswa = (q.opsi || []).find((o) => o.key === q.jawaban)
      const opsiBenar = q.kunci_jawaban ? (q.opsi || []).find((o) => o.key === q.kunci_jawaban) : null
      if (!hasil[modul]) hasil[modul] = {}
      if (!hasil[modul][topik]) hasil[modul][topik] = []
      hasil[modul][topik].push({
        teks_soal: q.teks_soal,
        jawabanSiswa: opsiSiswa?.text || '(tidak dijawab)',
        jawabanBenar: opsiBenar?.text || null,
        isCorrect: q.is_correct,
        isVak: q.kunci_jawaban == null,
      })
    })
  return hasil
}

const PESAN_GAYA = {
  Visual: 'belajar paling efektif lewat materi visual — gambar, diagram, peta konsep, dan catatan berwarna.',
  Auditori: 'belajar paling efektif lewat penjelasan lisan — diskusi, membaca nyaring, dan rekaman audio.',
  Kinestetik: 'belajar paling efektif lewat praktik langsung — eksperimen, gerakan, dan aktivitas hands-on.',
}

function narasiGayaBelajar(nama, dom, v, a, k) {
  if (!dom) return ''
  const total = (v || 0) + (a || 0) + (k || 0) || 1
  const persenV = Math.round((v / total) * 100)
  const persenA = Math.round((a / total) * 100)
  const persenK = Math.round((k / total) * 100)
  const isKombinasi = dom.includes('–') || dom.includes('-')
  if (isKombinasi) {
    return `Gaya belajar ${nama} adalah kombinasi ${dom} (Visual ${persenV}%, Auditori ${persenA}%, Kinestetik ${persenK}%) — fleksibel, sebaiknya diberi variasi metode pembelajaran alih-alih satu pendekatan tunggal.`
  }
  const kunci = Object.keys(PESAN_GAYA).find((x) => dom.startsWith(x))
  return `Gaya belajar dominan ${nama} adalah ${dom} (V:${persenV}% A:${persenA}% K:${persenK}%). ${nama} ${PESAN_GAYA[kunci] || ''}`
}

// Menghasilkan array paragraf (string[]) siap ditampilkan / dicetak PDF.
// statsKelas (opsional): hasil dari hitungStatistikKelas() — jika diisi, akan
// disisipkan paragraf perbandingan dengan teman sekelas setelah ringkasan umum.
export function analisisSiswa(siswa, result, statsKelas) {
  if (!result) return ['Siswa belum menyelesaikan asesmen — analisis akan tersedia setelah petualangan selesai.']

  const nama = siswa?.nama || 'Siswa ini'
  const rataRata = Math.round(
    ([result.skor_matematika, result.skor_ipa, result.skor_penalaran].filter((v) => v != null)
      .reduce((a, b) => a + Number(b), 0)) /
    ([result.skor_matematika, result.skor_ipa, result.skor_penalaran].filter((v) => v != null).length || 1)
  )

  const paragraf = []
  paragraf.push(`Secara umum, rata-rata skor akademik ${nama} adalah ${rataRata} dari 100. ${KATA_KATEGORI[kategoriUmum(rataRata)] ? `Ini ${KATA_KATEGORI[kategoriUmum(rataRata)]} pada tahap awal kelas 7.` : ''}`)

  const perbandingan = narasiPerbandinganKelas(nama, result, statsKelas)
  if (perbandingan) paragraf.push(perbandingan)

  paragraf.push(analisisModul('matematika', result.skor_matematika, result.kategori_matematika, result.detail_topik?.matematika))
  paragraf.push(analisisModul('ipa', result.skor_ipa, result.kategori_ipa, result.detail_topik?.ipa))
  paragraf.push(analisisModul('penalaran', result.skor_penalaran, result.kategori_penalaran, result.detail_topik?.penalaran))

  const gaya = narasiGayaBelajar(nama, result.gaya_belajar_dominan, result.vak_v, result.vak_a, result.vak_k)
  if (gaya) paragraf.push(gaya)

  if (result.rekomendasi?.length) {
    paragraf.push(`Rekomendasi tindak lanjut: ${result.rekomendasi.join(' ')}`)
  }

  return paragraf.filter(Boolean)
}

function kategoriUmum(p) {
  if (p == null) return null
  if (p <= 40) return 'Perlu Pendampingan'
  if (p <= 60) return 'Cukup'
  if (p <= 80) return 'Baik'
  return 'Sangat Baik'
}

// ---------------------------------------------------------------------
// ANALISIS KELAS
// ---------------------------------------------------------------------

function gabungTopik(rowsSelesai, modul) {
  const acc = {}
  rowsSelesai.forEach((r) => {
    const perTopik = r.result?.detail_topik?.[modul]?.per_topik || {}
    Object.entries(perTopik).forEach(([topik, v]) => {
      if (!acc[topik]) acc[topik] = { benar: 0, total: 0 }
      acc[topik].benar += v.benar
      acc[topik].total += v.total
    })
  })
  return acc
}

function distribusiKategori(rowsSelesai, key) {
  const dist = { 'Perlu Pendampingan': 0, 'Cukup': 0, 'Baik': 0, 'Sangat Baik': 0 }
  rowsSelesai.forEach((r) => {
    const kat = r.result?.[key]
    if (kat && dist[kat] != null) dist[kat]++
  })
  return dist
}

function narasiModulKelas(rowsSelesai, modulKey, skorKey, kategoriKey) {
  const label = MODUL_LABEL[modulKey]
  const n = rowsSelesai.length
  if (n === 0) return `${label}: belum ada siswa yang menyelesaikan asesmen.`

  const skorRata = Math.round(
    rowsSelesai.reduce((a, r) => a + (Number(r.result?.[skorKey]) || 0), 0) / n
  )
  const dist = distribusiKategori(rowsSelesai, kategoriKey)
  const perluDampingan = dist['Perlu Pendampingan']
  const sangatBaik = dist['Sangat Baik']

  const topikKelas = topikTerurut(gabungTopik(rowsSelesai, modulKey)).filter((t) => t.total >= Math.min(3, n))
  const lemah = topikKelas.slice(0, 2)

  let sebaran
  if (perluDampingan / n >= 0.4) {
    sebaran = `Perlu perhatian: ${perluDampingan} dari ${n} siswa (${Math.round((perluDampingan / n) * 100)}%) berada pada kategori "Perlu Pendampingan".`
  } else if (sangatBaik / n >= 0.4) {
    sebaran = `Sebagian besar siswa (${sangatBaik} dari ${n}) sudah berada pada kategori "Sangat Baik" — pertimbangkan materi pengayaan.`
  } else {
    sebaran = `Sebaran kemampuan bervariasi: ${dist['Perlu Pendampingan']} Perlu Pendampingan, ${dist['Cukup']} Cukup, ${dist['Baik']} Baik, ${dist['Sangat Baik']} Sangat Baik.`
  }

  const topikTxt = lemah.length > 0
    ? ` Topik yang secara umum masih lemah di kelas ini: ${lemah.map((t) => `${t.label} (${t.persen}% benar dari ${t.total} soal)`).join(', ')}.`
    : ''

  return `${label} — rata-rata kelas ${skorRata}. ${sebaran}${topikTxt}`
}

function narasiVakKelas(rowsSelesai) {
  const n = rowsSelesai.length
  if (n === 0) return ''
  const bucket = (g) => {
    if (!g) return null
    if (g.includes('–') || g.includes('-')) return 'Kombinasi'
    if (g.startsWith('Visual')) return 'Visual'
    if (g.startsWith('Auditori')) return 'Auditori'
    if (g.startsWith('Kinestetik')) return 'Kinestetik'
    return 'Kombinasi'
  }
  const count = { Visual: 0, Auditori: 0, Kinestetik: 0, Kombinasi: 0 }
  rowsSelesai.forEach((r) => { const b = bucket(r.result?.gaya_belajar_dominan); if (b) count[b]++ })
  const dominan = Object.entries(count).sort((a, b) => b[1] - a[1])[0]
  const persenDominan = Math.round((dominan[1] / n) * 100)

  const merata = Object.values(count).filter((v) => v > 0).length >= 3 &&
    Math.max(...Object.values(count)) - Math.min(...Object.values(count).filter((v) => v > 0)) <= Math.ceil(n * 0.2)

  if (merata) {
    return `Distribusi gaya belajar di kelas ini cukup merata antara Visual, Auditori, dan Kinestetik. Disarankan mengombinasikan ketiga metode (visual, ceramah/diskusi, dan praktik langsung) secara bergantian dalam satu unit pembelajaran agar seluruh siswa terlayani.`
  }
  return `Gaya belajar ${dominan[0]} paling dominan di kelas ini (${dominan[1]} dari ${n} siswa, ${persenDominan}%). Pertimbangkan memperbanyak pendekatan ${dominan[0].toLowerCase()} sebagai metode utama, tanpa mengabaikan gaya belajar lain.`
}

// Menghasilkan array paragraf kesimpulan kelas.
export function analisisKelas(rows) {
  const total = rows.length
  const selesai = rows.filter((r) => r.status_sesi === 'selesai' && r.result)
  const n = selesai.length

  if (total === 0) return ['Belum ada siswa yang bergabung ke kelas ini.']
  if (n === 0) return [`${total} siswa telah bergabung, namun belum ada yang menyelesaikan asesmen. Analisis akan muncul setelah ada siswa yang selesai.`]

  const paragraf = []
  paragraf.push(
    `${n} dari ${total} siswa (${Math.round((n / total) * 100)}%) telah menyelesaikan seluruh asesmen dan dianalisis di bawah ini.` +
    (n < total ? ` ${total - n} siswa lainnya masih dalam proses atau belum memulai.` : '')
  )

  paragraf.push(narasiModulKelas(selesai, 'matematika', 'skor_matematika', 'kategori_matematika'))
  paragraf.push(narasiModulKelas(selesai, 'ipa', 'skor_ipa', 'kategori_ipa'))
  paragraf.push(narasiModulKelas(selesai, 'penalaran', 'skor_penalaran', 'kategori_penalaran'))

  const vak = narasiVakKelas(selesai)
  if (vak) paragraf.push(vak)

  // Saran pengelompokan (Teaching at the Right Level)
  const distGabungan = ['kategori_matematika', 'kategori_ipa', 'kategori_penalaran'].map((k) => distribusiKategori(selesai, k))
  const rataPerluDampingan = Math.round(distGabungan.reduce((a, d) => a + d['Perlu Pendampingan'], 0) / 3)
  const rataSangatBaik = Math.round(distGabungan.reduce((a, d) => a + d['Sangat Baik'], 0) / 3)
  if (rataPerluDampingan > 0 || rataSangatBaik > 0) {
    paragraf.push(
      `Saran pengelompokan pembelajaran berdiferensiasi: sekitar ${rataPerluDampingan} siswa membutuhkan pendampingan intensif pada konsep dasar sebelum lanjut ke materi kelas 7, ` +
      `sementara sekitar ${rataSangatBaik} siswa dapat diberikan pengayaan atau tantangan tambahan. Sisanya dapat mengikuti alur pembelajaran reguler dengan penguatan pada topik yang disebutkan di atas.`
    )
  }

  return paragraf.filter(Boolean)
}
