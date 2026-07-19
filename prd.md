# PRD: Petualangan Jati Diri — Game Asesmen Diagnostik Awal Kelas 7

**Versi:** 2.0 (Lengkap)
**Pemilik Produk:** Guru IPA / Wali Kelas 7
**Tanggal:** Juli 2026
**Stack:** Frontend (Netlify) + Supabase (Postgres, Auth, Storage)

---

## 1. Latar Belakang & Tujuan

Setiap tahun ajaran baru, siswa kelas 7 perlu diases kondisi awalnya sebelum pembelajaran dimulai, mencakup **gaya belajar, kemampuan dasar matematika, kemampuan dasar IPA, dan kemampuan penalaran logis**. Proses manual selama ini lambat dianalisis dan kurang menarik bagi siswa.

**Tujuan produk:** Web app bertema *adventure* ("Petualangan Jati Diri") yang membungkus 4 instrumen asesmen diagnostik dalam alur permainan imersif, sehingga siswa antusias mengerjakannya, sementara guru mendapat dashboard analisis otomatis (per kelas & per individu) sebagai dasar perencanaan pembelajaran berdiferensiasi (Teaching at the Right Level).

### Catatan Penting: Komponen "Tes IQ" → "Tes Penalaran Logis"
Tes IQ terstandar (WISC, Stanford-Binet, CFIT) berhak cipta dan umumnya wajib dijalankan psikolog berlisensi. PRD ini mengimplementasikan komponen ke-4 sebagai **Tes Penalaran Logis & Kognitif** orisinal (seri angka, pola, analogi, penalaran verbal). Hasil dilaporkan sebagai **"Skor Penalaran Logis"**, bukan "skor IQ resmi". Jika sekolah memiliki lisensi psikometri resmi, modul ini dapat diganti kemudian.

---

## 2. Target Pengguna & Peran

| Peran | Deskripsi | Akses |
|---|---|---|
| **Guru** | Membuat kelas, memantau progres, melihat analisis kelas & individu, ekspor laporan | Login email + password (Supabase Auth) |
| **Siswa** | Mengikuti petualangan diagnostik via kode kelas, tanpa akun terdaftar | Akses publik via kode kelas |

---

## 3. Alur Pengguna (User Flow)

### 3.1 Alur Guru
1. Registrasi/login (email + password)
2. Buat kelas baru (nama kelas, mapel, tahun ajaran) → sistem generate **kode kelas unik** (6 karakter alfanumerik, mis. `7A-K3P`)
3. Bagikan kode kelas ke siswa (WA/print/tulis di papan — di luar sistem)
4. Pantau dashboard kelas: status pengerjaan siswa + statistik rata-rata
5. Klik nama siswa → profil individu detail + rekomendasi
6. Ekspor laporan kelas/individu (PDF/Excel)

### 3.2 Alur Siswa
1. Buka website publik → input **kode kelas**
2. Isi **nama & nomor absen**
3. Pilih **karakter/avatar** (kosmetik) sebagai identitas petualangan
4. **Petualangan dimulai** melalui 4 "dunia" berurutan:
   - **Dunia 1 — Cermin Jati Diri:** Tes Gaya Belajar VAK (kuesioner preferensi)
   - **Dunia 2 — Gua Angka:** Tantangan Matematika Dasar
   - **Dunia 3 — Hutan Ilmu:** Tantangan IPA Dasar
   - **Dunia 4 — Labirin Logika:** Tes Penalaran Logis
5. **Bisa jeda kapan saja** — progres tersimpan otomatis (local-first + auto-save berkala), lanjut nanti dengan kode kelas + nama/absen yang sama
6. Layar hasil akhir: ringkasan gaya belajar + pesan penyemangat (skor detail hanya untuk guru)

---

## 4. Rincian Fitur per Modul

### 4.1 Autentikasi & Manajemen Kelas (Guru)
- Registrasi & login via Supabase Auth (email + password)
- CRUD kelas: nama, mapel, tahun ajaran, status aktif/nonaktif
- Generate kode kelas unik (bisa di-regenerate), dengan status aktif agar tidak disalahgunakan setelah asesmen selesai
- Kelola banyak kelas sekaligus

### 4.2 Modul Gaya Belajar (VAK)
- Kuesioner pilihan ganda; **tidak ada benar/salah**
- Setiap pertanyaan punya 3 opsi yang masing-masing mewakili **V (Visual), A (Auditori), K (Kinestetik)**
- **Penilaian:** jumlahkan pilihan tiap kategori. Kategori dengan skor tertinggi = gaya belajar dominan. Jika dua kategori berselisih ≤1, dilabeli "kombinasi" (mis. Visual-Kinestetik)
- Bank soal lengkap: **Lampiran A** (15 pertanyaan)

### 4.3 Modul Matematika Dasar
- Bank soal PG (level SD lanjut → awal kelas 7): operasi hitung, pecahan, desimal, persen, geometri dasar, pola, soal cerita
- **Urutan soal diacak per siswa** (bank sama, randomisasi tampilan)
- Skoring otomatis benar/salah
- Bank soal lengkap: **Lampiran B** (18 soal)

### 4.4 Modul IPA Dasar
- Bank soal PG (materi IPA SD): makhluk hidup, materi & perubahannya, energi, bumi & antariksa, tubuh manusia
- Diacak urutannya per siswa
- Bank soal lengkap: **Lampiran C** (18 soal)

### 4.5 Modul Penalaran Logis
- Bank soal PG orisinal: seri angka, pola huruf, analogi verbal, penalaran deduktif, mencari yang berbeda
- Diacak urutannya per siswa
- Skor dilaporkan sebagai kategori (Perlu Pendampingan / Cukup / Baik / Sangat Baik)
- Bank soal lengkap: **Lampiran D** (18 soal)

### 4.6 Sistem Karakter/Avatar (Kosmetik)
- Siswa memilih karakter di awal petualangan (nama + avatar + gelar naratif)
- **Murni tampilan — tidak memengaruhi hasil analisis**
- Pengembangan lanjut (non-MVP): unlock kostum berdasarkan progres

### 4.7 Sistem Progres, Local-First & Auto-Save
Lihat detail arsitektur di **Bagian 5.3**. Ringkas:
- Jawaban disimpan di **state lokal browser** (in-memory + localStorage) selama siswa bermain
- **Auto-save berkala** ke Supabase: (a) setiap selesai 1 dunia, dan (b) setiap interval waktu tertentu (mis. tiap 60 detik) sebagai cadangan
- Ini menghindari beban ke DB dari penyimpanan tiap klik
- Saat kembali (resume), sistem menarik progres terakhir dari Supabase dan/atau localStorage, ambil yang paling baru

### 4.8 Dashboard Analisis Guru
- **Level kelas:**
  - Distribusi gaya belajar VAK (pie/bar chart)
  - Rata-rata skor matematika, IPA, penalaran logis (bar/radar chart)
  - Status pengerjaan siswa (progress tracker: belum mulai / berjalan / selesai)
- **Level individu:**
  - Profil: gaya belajar dominan, skor & kategori tiap komponen, catatan otomatis (rule-based)
- **Ekspor laporan:**
  - PDF: laporan ringkas per kelas & per individu
  - Excel: data mentah semua skor untuk analisis lanjutan

---

## 5. Arsitektur Teknis

### 5.1 Stack
- **Frontend:** SPA (disarankan React + Vite, atau Next.js static export) → deploy ke **Netlify**
- **Backend/DB:** **Supabase** (Postgres + Auth + Storage untuk aset avatar)
- **Auth:** Supabase Auth untuk guru; siswa tanpa auth (akses via kode kelas + RLS ketat)
- **Grafik:** library chart client-side (mis. Recharts / Chart.js)
- **Ekspor:** PDF via `jspdf`; Excel via `sheetjs (xlsx)` — di sisi client

### 5.2 Kapasitas untuk ~32 siswa/kelas
Netlify (statis) dan Supabase free/pro tier **jauh melebihi** kebutuhan skala ini. Free tier Supabase menyediakan ratusan koneksi concurrent lewat pooler — 32 siswa serentak sangat ringan, bahkan beberapa kelas paralel masih aman. Titik kritis ada pada **desain RLS** (akses publik siswa) dan **strategi penyimpanan progres**, bukan jumlah siswa. Strategi local-first (5.3) makin memperkecil beban DB.

### 5.3 Strategi Penyimpanan Local-First + Auto-Save
**Prinsip:** kurangi frekuensi tulis ke Supabase dengan menampung state di klien dulu.

**Alur:**
1. Semua jawaban ditulis ke **state aplikasi (in-memory)** saat siswa menjawab.
2. Salinan state di-*mirror* ke **`localStorage`** setiap perubahan (murah, tidak membebani server) → tahan refresh/tutup tab tak sengaja.
3. **Sinkronisasi ke Supabase** dilakukan pada *checkpoint*:
   - Saat siswa menyelesaikan 1 dunia (batch insert jawaban dunia tsb.)
   - Timer auto-save tiap ~60 detik (kirim delta yang belum tersimpan)
   - Saat siswa menekan "Jeda & Simpan"
   - Saat menyelesaikan seluruh petualangan (finalisasi + hitung skor)
4. **Resume:** saat siswa masuk lagi (kode kelas + nama + absen cocok), sistem membandingkan progres di Supabase vs localStorage → pakai `updated_at` paling baru.
5. **Skoring** dihitung final di titik penyelesaian (bisa di client lalu diverifikasi, atau via Supabase Edge Function/RPC untuk mencegah manipulasi).

**Keuntungan:** hemat kuota tulis DB, tahan koneksi tidak stabil (sekolah), pengalaman siswa mulus.

### 5.4 Skema Data (Draf)

| Tabel | Kolom Kunci |
|---|---|
| `teachers` | id (uuid, = auth.uid), email, nama, created_at |
| `classes` | id, teacher_id (FK), nama_kelas, mapel, kode_kelas (unique), tahun_ajaran, status, created_at |
| `students` | id, class_id (FK), nama, no_absen, karakter_id, status_sesi (belum/berjalan/selesai), current_world, updated_at |
| `question_bank` | id, modul (vak/matematika/ipa/penalaran), teks_soal, opsi (jsonb), kunci_jawaban, kategori_vak (V/A/K, khusus modul vak), bobot, aktif |
| `student_answers` | id, student_id (FK), question_id (FK), jawaban, is_correct, world, created_at |
| `student_results` | id, student_id (FK unique), skor_matematika, skor_ipa, skor_penalaran, kategori_penalaran, vak_v, vak_a, vak_k, gaya_belajar_dominan, rekomendasi (jsonb), finalized_at |
| `characters` | id, nama, gelar, aset_avatar_url |

> Catatan: `students` diidentifikasi unik oleh kombinasi `(class_id, nama, no_absen)` untuk mekanisme resume.

### 5.5 Keamanan (Row Level Security)
- **Guru:** hanya baca/tulis data kelas miliknya (`classes.teacher_id = auth.uid()`), dan data siswa yang `class_id`-nya milik dia.
- **Siswa (anon/publik):**
  - Boleh SELECT `classes` hanya untuk validasi kode kelas (kolom terbatas)
  - Boleh INSERT/UPDATE `students`, `student_answers`, `student_results` hanya untuk row yang class_id-nya berstatus aktif dan cocok dengan sesi mereka
  - **Tidak boleh** membaca jawaban/hasil siswa lain
- Kode kelas punya status aktif; nonaktifkan setelah asesmen selesai.
- `question_bank` kunci jawaban **tidak** boleh terbaca anon (jangan kirim `kunci_jawaban` ke client; validasi jawaban lewat RPC/Edge Function bila ingin ketat). Alternatif MVP sederhana: skoring di client dengan risiko rendah karena ini asesmen diagnostik, bukan ujian bertaruh nilai.

---

## 6. Kebutuhan Non-Fungsional
- **Responsif / mobile-first** (siswa kemungkinan pakai HP/tablet lab)
- **Cepat**: aset avatar dioptimasi, lazy-load per dunia
- **Toleran koneksi lambat**: local-first + auto-retry saat sinkronisasi
- **Aksesibilitas dasar**: kontras warna cukup, ukuran teks memadai, navigasi jelas
- **Anti-frustrasi**: tidak ada timer ketat per soal untuk tes diagnostik (kecuali diinginkan pada modul penalaran)

---

## 7. Skema Penilaian & Kategorisasi

### 7.1 Gaya Belajar (VAK)
- Hitung jumlah pilihan V, A, K dari 15 pertanyaan.
- **Dominan** = kategori tertinggi.
- Selisih dua kategori teratas ≤1 → label "Kombinasi" (mis. "Visual–Kinestetik").

### 7.2 Skor Akademik (Matematika, IPA, Penalaran)
Skor = (jumlah benar / total soal) × 100. Kategori saran (dapat disesuaikan kurikulum):

| Rentang | Kategori |
|---|---|
| 0–40 | Perlu Pendampingan |
| 41–60 | Cukup |
| 61–80 | Baik |
| 81–100 | Sangat Baik |

### 7.3 Rekomendasi Otomatis (Rule-Based, contoh)
- Skor matematika "Perlu Pendampingan" → saran: penguatan operasi dasar & pecahan
- Gaya belajar Visual dominan → saran: perbanyak media gambar/diagram/peta konsep
- Gaya belajar Auditori dominan → saran: penjelasan lisan, diskusi, rekaman audio
- Gaya belajar Kinestetik dominan → saran: praktik langsung, eksperimen, pembelajaran bergerak
- dst. (aturan lengkap disusun bersama guru)

---

## 8. Roadmap Bertahap

**Fase 1 — MVP:**
- Auth guru, manajemen kelas + kode kelas
- 4 modul tes (bank soal Lampiran A–D, urutan diacak)
- Local-first + auto-save + resume
- Dashboard analisis dasar (angka + grafik per komponen)
- Ekspor PDF

**Fase 2 — Penguatan:**
- Tema adventure penuh (narasi, transisi antar dunia, ilustrasi)
- Ekspor Excel data mentah
- Rekomendasi otomatis rule-based lengkap

**Fase 3 — Nice-to-have:**
- Unlock kostum/pencapaian karakter
- Multi-guru/admin sekolah
- CMS ringan: guru mengedit/menambah bank soal sendiri

---

## 9. Risiko & Keputusan Terbuka
- Validasi kesahihan soal (terutama penalaran & VAK) sebaiknya ditinjau tim kurikulum sebelum go-live
- Batas rentang kategori skor perlu difinalkan bersama kurikulum
- Desain RLS Supabase perlu diuji keamanannya (akses publik siswa) sebelum produksi
- Kebijakan jika siswa menutup browser tiba-tiba → sudah dimitigasi localStorage + auto-save, namun tetap perlu diuji
- Perlu keputusan: skoring di client (sederhana) vs via Edge Function (lebih aman)

---

# LAMPIRAN — BANK SOAL

> Semua soal di bawah siap dipakai sebagai *seed data* `question_bank`. Untuk modul Matematika, IPA, dan Penalaran, **urutan tampilan diacak per siswa**. Untuk modul VAK, urutan boleh tetap.

## Lampiran A — Modul Gaya Belajar (VAK) — 15 Pertanyaan
*Tidak ada jawaban benar/salah. Setiap opsi berkode V / A / K.*

**A1. Saat guru menjelaskan pelajaran baru, saya paling mudah paham jika:**
- (V) melihat gambar, diagram, atau tulisan di papan
- (A) mendengarkan penjelasan guru
- (K) langsung mencoba atau praktik sendiri

**A2. Ketika ingin mengingat sesuatu, saya biasanya:**
- (V) membayangkan tulisan atau gambarnya
- (A) mengucapkannya berulang-ulang
- (K) menuliskannya atau bergerak sambil menghafal

**A3. Saat waktu luang, saya lebih suka:**
- (V) membaca buku atau menonton video
- (A) mendengarkan musik atau cerita
- (K) berolahraga atau membuat kerajinan tangan

**A4. Ketika belajar cara membuat sesuatu yang baru, saya suka:**
- (V) melihat contoh gambar/video langkah-langkahnya
- (A) mendengar seseorang menjelaskan caranya
- (K) langsung mencobanya sambil belajar

**A5. Saya paling mudah berkonsentrasi ketika:**
- (V) ruangan rapi dan ada catatan berwarna
- (A) suasana tenang atau ada suara latar yang saya suka
- (K) saya bisa bergerak atau memegang sesuatu

**A6. Ketika menghafal nomor atau kode, saya:**
- (V) membayangkan angka-angkanya
- (A) menyebutkannya keras-keras
- (K) mengetiknya berulang-ulang

**A7. Saat menjelaskan sesuatu kepada teman, saya cenderung:**
- (V) menggambar atau menunjukkan sesuatu
- (A) menjelaskan dengan kata-kata
- (K) memperagakannya langsung

**A8. Saya lebih menikmati pelajaran yang:**
- (V) banyak gambar, peta, atau diagram
- (A) banyak diskusi dan penjelasan lisan
- (K) banyak praktik dan percobaan

**A9. Ketika bosan di kelas, saya biasanya:**
- (V) menggambar atau mencoret-coret buku
- (A) berbisik atau mengobrol dengan teman
- (K) menggoyangkan kaki atau memainkan benda

**A10. Saya lebih mudah mengingat:**
- (V) wajah dan tempat
- (A) nama dan suara orang
- (K) kegiatan yang pernah saya lakukan

**A11. Ketika mempelajari aturan permainan baru, saya:**
- (V) membaca dan melihat gambarnya dulu
- (A) minta seseorang membacakan aturannya
- (K) langsung memainkannya sambil belajar

**A12. Ketika sedang belajar, saya suka:**
- (V) membuat catatan yang rapi dan berwarna
- (A) membaca dengan suara keras
- (K) berjalan-jalan sambil menghafal

**A13. Saat memilih hadiah untuk diri sendiri, saya tertarik pada:**
- (V) sesuatu yang menarik dilihat
- (A) sesuatu yang menghasilkan suara (mis. alat musik)
- (K) sesuatu yang bisa dimainkan atau dipegang

**A14. Ketika mengikuti petunjuk arah ke suatu tempat, saya lebih suka:**
- (V) melihat peta
- (A) mendengar petunjuk arah secara lisan
- (K) langsung pergi dan mengingat jalannya

**A15. Ketika sedang senang, saya cenderung:**
- (V) tersenyum dan menunjukkannya lewat ekspresi wajah
- (A) berbicara banyak atau bernyanyi
- (K) melompat atau bergerak aktif

---

## Lampiran B — Modul Matematika Dasar — 18 Soal
*(Jawaban benar ditandai ✔)*

**B1.** Hasil dari 24 + 18 × 2 = ...
A. 84   B. 60 ✔   C. 48   D. 72

**B2.** Hasil dari 3/4 + 1/8 = ...
A. 4/12   B. 7/8 ✔   C. 1/2   D. 5/8

**B3.** Hasil dari 0,5 × 0,2 = ...
A. 0,1 ✔   B. 1,0   C. 0,7   D. 0,25

**B4.** 25% dari 80 adalah ...
A. 20 ✔   B. 25   C. 40   D. 16

**B5.** Keliling persegi dengan panjang sisi 7 cm adalah ...
A. 14 cm   B. 28 cm ✔   C. 49 cm   D. 21 cm

**B6.** Luas persegi panjang dengan panjang 8 cm dan lebar 5 cm adalah ...
A. 13 cm²   B. 26 cm²   C. 40 cm² ✔   D. 45 cm²

**B7.** Jika 3x = 21, maka nilai x = ...
A. 6   B. 7 ✔   C. 18   D. 24

**B8.** Bilangan terkecil dari 0,45 ; 0,5 ; 0,405 ; 0,54 adalah ...
A. 0,45   B. 0,5   C. 0,405 ✔   D. 0,54

**B9.** Rata-rata dari bilangan 6, 8, 10, dan 12 adalah ...
A. 8   B. 9 ✔   C. 10   D. 12

**B10.** Sebuah baju seharga Rp50.000 mendapat diskon 20%. Harga setelah diskon adalah ...
A. Rp30.000   B. Rp40.000 ✔   C. Rp45.000   D. Rp10.000

**B11.** FPB dari 12 dan 18 adalah ...
A. 3   B. 6 ✔   C. 9   D. 36

**B12.** KPK dari 4 dan 6 adalah ...
A. 12 ✔   B. 24   C. 2   D. 10

**B13.** Hasil dari (-5) + 8 = ...
A. -3   B. 3 ✔   C. 13   D. -13

**B14.** Hasil dari 144 : 12 = ...
A. 11   B. 12 ✔   C. 13   D. 14

**B15.** Perhatikan pola: 2, 4, 8, 16, ... Bilangan berikutnya adalah ...
A. 20   B. 24   C. 32 ✔   D. 18

**B16.** Hasil dari 7² adalah ...
A. 14   B. 49 ✔   C. 21   D. 64

**B17.** Harga 1 pensil Rp2.500. Harga 6 pensil adalah ...
A. Rp12.500   B. Rp15.000 ✔   C. Rp13.000   D. Rp16.500

**B18.** Pecahan 3/5 sama dengan ...
A. 35%   B. 53%   C. 60% ✔   D. 30%

---

## Lampiran C — Modul IPA Dasar — 18 Soal
*(Jawaban benar ditandai ✔)*

**C1.** Bagian tumbuhan yang berfungsi menyerap air dan mineral dari tanah adalah ...
A. Daun   B. Akar ✔   C. Batang   D. Bunga

**C2.** Proses tumbuhan membuat makanan dengan bantuan cahaya matahari disebut ...
A. Respirasi   B. Fotosintesis ✔   C. Transpirasi   D. Penguapan

**C3.** Alat pernapasan pada ikan adalah ...
A. Paru-paru   B. Insang ✔   C. Kulit   D. Trakea

**C4.** Perubahan wujud benda dari padat menjadi cair disebut ...
A. Menguap   B. Membeku   C. Mencair ✔   D. Menyublim

**C5.** Sumber energi utama bagi kehidupan di bumi adalah ...
A. Bulan   B. Matahari ✔   C. Bintang   D. Angin

**C6.** Organ tubuh manusia yang berfungsi memompa darah adalah ...
A. Paru-paru   B. Jantung ✔   C. Hati   D. Ginjal

**C7.** Pada tekanan normal, air mendidih pada suhu ...
A. 0°C   B. 50°C   C. 100°C ✔   D. 37°C

**C8.** Hewan yang berkembang biak dengan cara bertelur disebut ...
A. Vivipar   B. Ovipar ✔   C. Ovovivipar   D. Metamorfosis

**C9.** Planet tempat kita tinggal adalah ...
A. Mars   B. Bumi ✔   C. Venus   D. Jupiter

**C10.** Benda yang dapat ditarik oleh magnet umumnya terbuat dari ...
A. Kayu   B. Plastik   C. Besi ✔   D. Kaca

**C11.** Gas yang diperlukan manusia saat bernapas adalah ...
A. Karbon dioksida   B. Oksigen ✔   C. Nitrogen   D. Hidrogen

**C12.** Urutan daur hidup kupu-kupu yang benar adalah ...
A. Telur → kepompong → ulat → kupu-kupu
B. Telur → ulat → kepompong → kupu-kupu ✔
C. Ulat → telur → kepompong → kupu-kupu
D. Kepompong → ulat → telur → kupu-kupu

**C13.** Bunyi dapat merambat melalui zat berikut, kecuali ...
A. Udara   B. Air   C. Benda padat   D. Ruang hampa ✔

**C14.** Bagian bunga yang merupakan alat kelamin betina adalah ...
A. Benang sari   B. Putik ✔   C. Mahkota   D. Kelopak

**C15.** Perpindahan panas melalui zat perantara tanpa disertai perpindahan zatnya disebut ...
A. Konduksi ✔   B. Konveksi   C. Radiasi   D. Isolasi

**C16.** Contoh sumber energi yang dapat diperbarui adalah ...
A. Batu bara   B. Minyak bumi   C. Sinar matahari ✔   D. Gas alam

**C17.** Berikut adalah fungsi rangka manusia, kecuali ...
A. Menegakkan tubuh   B. Melindungi organ dalam   C. Tempat melekatnya otot   D. Mencerna makanan ✔

**C18.** Peristiwa pergantian siang dan malam disebabkan oleh ...
A. Revolusi bumi   B. Rotasi bumi ✔   C. Gerhana   D. Rotasi bulan

---

## Lampiran D — Modul Penalaran Logis — 18 Soal
*(Jawaban benar ditandai ✔)*

**D1.** Lanjutkan seri berikut: 3, 6, 9, 12, ...
A. 14   B. 15 ✔   C. 16   D. 18

**D2.** Lanjutkan seri berikut: 1, 4, 9, 16, ...
A. 20   B. 24   C. 25 ✔   D. 36

**D3.** Panas : Dingin = Tinggi : ...
A. Besar   B. Rendah ✔   C. Panjang   D. Gunung

**D4.** Guru : Sekolah = Dokter : ...
A. Pasien   B. Rumah sakit ✔   C. Obat   D. Perawat

**D5.** Lanjutkan seri berikut: 2, 6, 12, 20, ...
A. 28   B. 30 ✔   C. 26   D. 32

**D6.** Semua kucing adalah hewan. Mimi adalah kucing. Maka Mimi adalah ...
A. Anjing   B. Hewan ✔   C. Tumbuhan   D. Ikan

**D7.** Lanjutkan pola huruf: A, C, E, G, ...
A. H   B. I ✔   C. J   D. K

**D8.** Manakah yang berbeda dari yang lain?
A. Apel   B. Jeruk   C. Wortel ✔   D. Mangga

**D9.** Lanjutkan seri berikut: 100, 50, 25, ...
A. 12,5 ✔   B. 20   C. 15   D. 10

**D10.** Buku : Membaca = Pena : ...
A. Kertas   B. Menulis ✔   C. Tinta   D. Meja

**D11.** Jika hari ini hari Selasa, maka 3 hari lagi adalah hari ...
A. Kamis   B. Jumat ✔   C. Sabtu   D. Rabu

**D12.** Perhatikan pola jumlah bintang tiap baris: 1, 2, 3, ... Jumlah bintang pada baris berikutnya adalah ...
A. 3   B. 4 ✔   C. 5   D. 6

**D13.** Manakah bilangan yang berbeda pola dari: 2, 4, 6, 7, 8?
A. 4   B. 6   C. 7 ✔   D. 8

**D14.** Ayah lebih tua dari Kakak. Kakak lebih tua dari Adik. Siapa yang paling muda?
A. Ayah   B. Kakak   C. Adik ✔   D. Sama semua

**D15.** Lanjutkan seri berikut: 5, 10, 20, 40, ...
A. 60   B. 70   C. 80 ✔   D. 50

**D16.** Ban : Mobil = Layar : ...
A. Angin   B. Perahu ✔   C. Laut   D. Nelayan

**D17.** Lanjutkan pola huruf: Z, Y, X, W, ...
A. U   B. V ✔   C. T   D. S

**D18.** Sebuah kotak berisi 3 bola merah dan 2 bola biru. Bola warna apa yang lebih banyak?
A. Merah ✔   B. Biru   C. Sama banyak   D. Tidak ada

---

*Total bank soal awal: 15 (VAK) + 18 (Matematika) + 18 (IPA) + 18 (Penalaran) = 69 item. Dapat ditambah/diedit guru pada Fase 3.*
