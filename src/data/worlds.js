// Definisi 4 "dunia" petualangan + metadata modul.
export const WORLDS = [
  {
    id: 1,
    modul: 'vak',
    nama: 'Cermin Jati Diri',
    ikon: '🪞',
    warna: '#7b2cbf',
    deskripsi: 'Kenali cara belajarmu. Tidak ada jawaban benar atau salah — pilih yang paling sesuai dirimu.',
    tipe: 'preferensi', // tanpa benar/salah
    acak: false,        // VAK urutan tetap
  },
  {
    id: 2,
    modul: 'matematika',
    nama: 'Gua Angka',
    ikon: '🔢',
    warna: '#d00000',
    deskripsi: 'Pecahkan tantangan angka di dalam gua yang penuh teka-teki matematika.',
    tipe: 'kuis',
    acak: true,
  },
  {
    id: 3,
    modul: 'ipa',
    nama: 'Hutan Ilmu',
    ikon: '🌳',
    warna: '#2d6a4f',
    deskripsi: 'Jelajahi hutan pengetahuan alam dan buktikan pemahamanmu tentang dunia.',
    tipe: 'kuis',
    acak: true,
  },
  {
    id: 4,
    modul: 'penalaran',
    nama: 'Labirin Logika',
    ikon: '🧩',
    warna: '#1d3557',
    deskripsi: 'Temukan jalan keluar labirin dengan pola, analogi, dan penalaran logis.',
    tipe: 'kuis',
    acak: true,
  },
]

export const getWorld = (id) => WORLDS.find((w) => w.id === Number(id))
