# 🛡️ Petualangan Jati Diri (PJD) — Gamified Student Assessment System

[![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-1C1C1C?style=for-the-badge&logo=supabase&logoColor=3ECF8E)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)

**Petualangan Jati Diri** adalah sebuah aplikasi web interaktif (*gamified assessment*) berbasis kecerdasan visual yang dirancang untuk mengukur gaya belajar siswa (Visual, Auditori, Kinestetik) serta menguji kemampuan akademis mereka (Matematika, IPA, dan Penalaran Logis) dalam bentuk petualangan RPG 3D yang menyenangkan.

Aplikasi ini dilengkapi dengan **Dashboard Guru** yang komprehensif, analitik grafik kekuatan siswa, diagnosis database, serta ekspor laporan canggih dalam format PDF & Excel Multi-Sheet yang dilengkapi analisis deskriptif otomatis.

---

## 🌟 Fitur Utama

### 🎮 Sisi Petualang (Siswa)
- **RPG Character Selection**: Memilih dari 5 kelas karakter RPG keren: *Warrior* (⚔️), *Archer* (🏹), *Mage* (🧙), *Tanker* (🛡️), dan *Assassin* (🥷), lengkap dengan julukan petualangannya.
- **Story Intro & Komitmen Kejujuran**: Narasi cerita awal yang dipersonalisasi sesuai nama asli siswa untuk memotivasi keseriusan dan komitmen kejujuran (tanpa alat bantu/bantuan orang lain).
- **Interactive TPP 3D Perspective Road**: Kuis dibalut dalam simulasi perjalanan 3D dengan latar belakang petualangan hutan rimba alami (dilengkapi ornamen pohon, tanaman pakis, awan, jamur, dan bunga liar).
- **Dynamic Lane System**: Jalan setapak 3D otomatis terbagi menjadi **3 lajur** (untuk soal 3 pilihan/VAK) atau **4 lajur** (untuk soal 4 pilihan/mapel).
- **Smooth Running & Glide Animation**: Ketika opsi diklik, avatar emoji siswa akan **berlari bergoyang (*wiggle*) dan meluncur mulus** menyusuri jalurnya menuju gerbang plang pilihan jawaban.

### 📊 Sisi Analitik (Dashboard Guru)
- **Dashboard Rekapitulasi Kelas**: Statistik rata-rata nilai kelas, distribusi tingkat kesulitan soal, diagram batang pencapaian siswa, serta diagnosis database.
- **Profil Siswa & Diagnosis Diagnosis**: Menampilkan grafik radar/radar-chart kemampuan akademis individu, rincian jawaban per kategori soal, serta diagnosis error jika database ter-reset (*cascade check*).
- **Ekspor Laporan Canggih**:
  - **Cetak Laporan PDF Kelas**: PDF terstruktur berisi kesimpulan analitik kelas, tabel rekapitulasi, disusul lembar analisis deskriptif masing-masing siswa yang selesai.
  - **Cetak Laporan PDF Siswa**: PDF profil siswa individu lengkap dengan grafik radar kekuatan dan rincian warna pink untuk jawaban salah.
  - **Ekspor Excel Multi-Sheet**: Format laporan profesional dua sheet (`Ringkasan Kelas` dan `Data & Analisis Siswa`) lengkap dengan analisis deskriptif otomatis & rekomendasi individual siswa.

---

## 🛠️ Arsitektur Teknologi

- **Frontend**: React 18, React Router DOM v6, Chart.js (Grafik Radar & Batang).
- **Styling**: Vanilla CSS3 Custom Variables (Aesthetics modern, glassmorphism, responsive grid).
- **Backend & Database**: Supabase (PostgreSQL, Row Level Security, RPC Functions).
- **Utility**: html2canvas & jsPDF (Ekspor PDF), XLSX SheetJS (Ekspor Excel Multi-Sheet).

---

## 📂 Struktur Direktori Utama

```text
gameadventure/
├── src/
│   ├── components/
│   │   ├── QuizWorld.jsx         # Render kuis, lajur jalan raya 3D, dan gerakan avatar
│   │   └── Spinner.jsx           # Loading spinner premium
│   ├── context/
│   │   └── AuthContext.jsx       # Context manajemen sesi login guru
│   ├── data/
│   │   └── worlds.js             # Data 4 dunia petualangan kuis
│   ├── lib/
│   │   ├── exportExcel.js        # Utilitas ekspor data Excel multi-sheet & deskriptif
│   │   ├── exportPdf.js          # Utilitas ekspor PDF (rekap kelas & profil individu)
│   │   ├── supabase.js           # Client Supabase instansiasi
│   │   └── utils.js              # Utilitas pembantu (shuffle, formatting, dll)
│   ├── pages/
│   │   ├── Adventure.jsx         # Halaman fase petualangan kuis & cerita intro
│   │   ├── DashboardGuru.jsx     # Dashboard analitik guru utama
│   │   ├── StudentProfile.jsx    # Halaman detail & diagnosis pencapaian siswa
│   │   └── StudentRegister.jsx   # Registrasi siswa & pemilihan karakter RPG
│   ├── App.jsx                   # Router utama aplikasi
│   ├── index.css                 # Desain sistem global & animasi CSS TPP 3D
│   └── main.jsx                  # Mounting React & Global Error Boundary Catcher
├── supabase/
│   ├── setup.sql                 # Seluruh skema tabel PostgreSQL, RLS, & Rpc Supabase
│   └── update_rpg_characters.sql # Kueri standalone pembaruan karakter ke kelas RPG
```

---

## ⚙️ Cara Instalasi & Menjalankan Lokal

### 1. Kloning Repositori
```bash
git clone https://github.com/username/petualangan-jati-diri.git
cd petualangan-jati-diri
```

### 2. Instalasi Dependensi
Gunakan `npm` untuk mengunduh modul dependensi yang dibutuhkan:
```bash
npm install
```

### 3. Konfigurasi Variabel Lingkungan (`.env`)
Buat berkas bernama `.env` di direktori utama proyek, lalu isi dengan credentials Supabase Anda:
```env
VITE_SUPABASE_URL=https://<id-proyek-anda>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-proyek-anda>
```

### 4. Setup Database & Seeding
1. Masuk ke [Supabase Dashboard](https://supabase.com).
2. Buka proyek Anda, lalu arahkan ke bagian **SQL Editor**.
3. Buat query baru, lalu salin seluruh isi dari berkas `supabase/setup.sql` dan jalankan (*Run*).
4. Jika database Anda sudah berjalan dan Anda ingin memperbarui karakter petualang menjadi tipe RPG baru, silakan jalankan kueri dari berkas `supabase/update_rpg_characters.sql`.

### 5. Jalankan Server Dev Lokal
Jalankan server pengembangan lokal untuk menguji web:
```bash
npm run dev
```
Aplikasi akan dapat diakses secara lokal di browser melalui alamat `http://localhost:5173`.

### 6. Build Produksi
Untuk melakukan build ke bundel file statis siap sebar (produksi):
```bash
npm run build
```

---

## ⚔️ Daftar Dunia Petualangan

1. **Dunia 1: Cermin Jati Diri** 🪞 (Modul VAK — Preferensi Belajar)
2. **Dunia 2: Gua Angka** 🔢 (Modul Matematika Kognitif)
3. **Dunia 3: Hutan Ilmu** 🌳 (Modul IPA Kognitif)
4. **Dunia 4: Labirin Logika** 🧩 (Modul Penalaran Logis)

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi [MIT License](LICENSE).
