// Acak array (Fisher–Yates) — dipakai untuk mengacak urutan soal per siswa.
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function kategoriSkor(p) {
  if (p == null) return '-'
  if (p <= 40) return 'Perlu Pendampingan'
  if (p <= 60) return 'Cukup'
  if (p <= 80) return 'Baik'
  return 'Sangat Baik'
}

export function warnaKategori(p) {
  if (p == null) return '#94a3b8'
  if (p <= 40) return '#e63946'
  if (p <= 60) return '#f4a261'
  if (p <= 80) return '#2a9d8f'
  return '#2d6a4f'
}

// Kunci localStorage untuk progres siswa (local-first)
export const lsKey = (studentId) => `pjd_progress_${studentId}`
