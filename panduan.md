# 📘 Panduan Deploy — Petualangan Jati Diri

Panduan lengkap menyiapkan, menjalankan, dan men-deploy aplikasi **Petualangan Jati Diri** (game asesmen diagnostik awal kelas 7). Ikuti berurutan dari atas ke bawah. Semua langkah **gratis** (Supabase Free Tier + Netlify Free Tier), tanpa kartu kredit.

---

## Daftar Isi
1. [Gambaran Arsitektur](#1-gambaran-arsitektur)
2. [Prasyarat](#2-prasyarat)
3. [Langkah A — Setup Supabase (Database + Auth)](#3-langkah-a--setup-supabase)
4. [Langkah B — Jalankan di Komputer Lokal](#4-langkah-b--jalankan-di-komputer-lokal)
5. [Langkah C — Deploy ke Netlify](#5-langkah-c--deploy-ke-netlify)
6. [Langkah D — Uji Coba End-to-End](#6-langkah-d--uji-coba-end-to-end)
7. [Cara Menggunakan (Guru & Siswa)](#7-cara-menggunakan)
8. [Pemeliharaan & Kustomisasi](#8-pemeliharaan--kustomisasi)
9. [Migrasi Database — Project yang Sudah Berjalan](#9-migrasi-database--project-yang-sudah-berjalan)
10. [Troubleshooting](#10-troubleshooting)
11. [Catatan Keamanan](#11-catatan-keamanan)

---

## 1. Gambaran Arsitektur

```
┌────────────────────┐        HTTPS         ┌──────────────────────────┐
│   Browser Siswa    │  ─────────────────▶  │                          │
│   (HP / Tablet)    │                      │        SUPABASE          │
├────────────────────┤     anon key +       │  • Postgres (data)       │
│   Browser Guru     │  ─────────────────▶  │  • Auth (login guru)     │
│   (Laptop)         │       RLS + RPC      │  • RPC (fungsi aman)     │
└────────────────────┘                      └──────────────────────────┘
         ▲
         │ file statis (HTML/JS/CSS)
┌────────────────────┐
│      NETLIFY       │  ◀── hasil `npm run build` (folder dist/)
│  (hosting statis)  │
└────────────────────┘
```

- **Frontend:** React + Vite (SPA), di-hosting sebagai file statis di **Netlify**.
- **Backend:** **Supabase** — Postgres, Auth (guru), dan fungsi RPC untuk akses aman siswa (tanpa akun).
- **Keamanan:** Row Level Security (RLS). Kunci jawaban **tidak pernah** dikirim ke browser; skor dihitung di server lewat RPC `finalize_student`.
- **Local-first:** jawaban siswa disimpan di `localStorage` + auto-save berkala ke Supabase (hemat kuota & tahan koneksi lambat).

---

## 2. Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| **Node.js** | Versi **18 atau 20** (disarankan 20). Cek: `node -v` |
| **Akun Supabase** | Gratis — daftar di [supabase.com](https://supabase.com) |
| **Akun Netlify** | Gratis — daftar di [netlify.com](https://netlify.com) |
| **Akun GitHub** (opsional) | Untuk deploy otomatis. Bisa juga deploy manual (drag & drop). |
| **Git** (opsional) | Untuk push kode ke GitHub |

> Sudah punya folder proyek ini lengkap? Bagus. Anda tinggal mengikuti Langkah A–C.

---

## 3. Langkah A — Setup Supabase

### A.1 Buat Project
1. Login ke [app.supabase.com](https://app.supabase.com) → **New project**.
2. Isi:
   - **Name:** `petualangan-jati-diri` (bebas)
   - **Database Password:** buat password kuat, **catat & simpan** (dipakai jika perlu akses DB langsung).
   - **Region:** pilih **Southeast Asia (Singapore)** agar cepat dari Indonesia.
3. Klik **Create new project**, tunggu ±2 menit sampai status hijau.

### A.2 Jalankan Skrip Database
1. Di menu kiri, buka **SQL Editor** → **New query**.
2. Buka file [`supabase/setup.sql`](supabase/setup.sql) dari proyek ini, **salin seluruh isinya**, tempel ke editor.
3. Klik **Run** (atau `Ctrl+Enter`).
4. Pastikan muncul **"Success. No rows returned"**. Skrip ini membuat:
   - Semua tabel (`teachers`, `classes`, `students`, `question_bank`, `student_answers`, `student_results`, `characters`)
   - Aturan **Row Level Security**
   - Fungsi **RPC** aman (registrasi siswa, ambil soal tanpa kunci, simpan jawaban, finalisasi skor, rincian per topik)
   - **Seed 81 soal** (15 VAK + 22 Matematika + 22 IPA + 22 Penalaran, dengan tingkat kesulitan mudah/sedang/sukar) + 8 karakter

> ⚠️ **PENTING — hanya untuk project BARU / kosong.** Skrip ini memakai `delete from question_bank` lalu insert ulang seluruh bank soal dengan ID baru. Karena `student_answers.question_id` memakai `ON DELETE CASCADE`, menjalankan `setup.sql` di project yang **sudah punya jawaban siswa tersimpan** akan **MENGHAPUS jawaban siswa tersebut** (walau data siswa & kelasnya sendiri tetap ada).
> Jika project Anda sudah punya siswa yang sedang/sudah mengerjakan, **jangan jalankan ulang `setup.sql`** — gunakan `supabase/migration_v2_analisis.sql` sebagai gantinya (lihat [Bagian 9](#9-migrasi-database--project-yang-sudah-berjalan)), yang aman dan tidak menghapus data apa pun.

### A.3 Matikan Konfirmasi Email (agar guru bisa langsung login)
1. Menu kiri → **Authentication** → **Sign In / Providers** (atau **Providers** → **Email**).
2. Cari opsi **Confirm email** dan **matikan (OFF)**.
   - Ini membuat guru bisa langsung login setelah mendaftar, tanpa harus klik link di email.
   - *Jika Anda ingin tetap memakai konfirmasi email, biarkan ON — guru harus cek email dulu sebelum login.*
3. **Save**.

### A.4 Ambil Kredensial API
1. Menu kiri → **Project Settings** (ikon gerigi) → **API**.
2. Catat dua nilai ini (dipakai di Langkah B & C):
   - **Project URL** → contoh `https://abcdefgh.supabase.co`
   - **anon public key** → string panjang diawali `eyJ...`

> **Aman?** Ya. `anon key` memang dirancang untuk dipakai di frontend — keamanan ditegakkan oleh **RLS**, bukan dengan menyembunyikan key ini. **Jangan** pernah memakai `service_role` key di frontend.

---

## 4. Langkah B — Jalankan di Komputer Lokal

Berguna untuk mencoba sebelum online.

### B.1 Install dependency
Buka terminal di folder proyek, jalankan:
```bash
npm install
```

### B.2 Buat file `.env`
Salin `.env.example` menjadi `.env`, lalu isi dengan kredensial dari Langkah A.4:
```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# Mac/Linux
cp .env.example .env
```
Isi `.env`:
```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJI....(anon key Anda)
```

### B.3 Jalankan mode pengembangan
```bash
npm run dev
```
Buka browser ke alamat yang muncul (biasanya `http://localhost:5173`).
Jika halaman awal **tidak** menampilkan peringatan kuning "Koneksi Supabase belum dikonfigurasi", berarti koneksi berhasil. 🎉

### B.4 Uji build produksi (opsional)
```bash
npm run build      # hasil ada di folder dist/
npm run preview    # menyajikan folder dist/ secara lokal
```

---

## 5. Langkah C — Deploy ke Netlify

Ada **dua cara**. Pilih salah satu.

### Cara 1 — Otomatis via GitHub (disarankan; update tinggal `git push`)

**C1.1 — Push kode ke GitHub**
```bash
git init
git add .
git commit -m "Petualangan Jati Diri - initial"
git branch -M main
git remote add origin https://github.com/USERNAME/petualangan-jati-diri.git
git push -u origin main
```
> File `.gitignore` sudah mengecualikan `node_modules`, `dist`, dan `.env` sehingga rahasia tidak ikut ter-upload.

**C1.2 — Hubungkan ke Netlify**
1. Login [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project** → **GitHub** → pilih repo tadi.
2. Netlify otomatis membaca `netlify.toml`. Pastikan:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. **Jangan klik Deploy dulu.** Buka **Add environment variables** dan isi:
   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://abcdefgh.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJI...` |
4. Klik **Deploy site**. Tunggu ±1–2 menit.
5. Situs live di URL seperti `https://random-name-123.netlify.app`.

> **Penting:** Setiap mengubah environment variable, lakukan **Deploys → Trigger deploy → Clear cache and deploy site** agar nilai baru terpakai.

### Cara 2 — Manual (drag & drop, tanpa GitHub)

1. Di komputer, pastikan `.env` sudah terisi, lalu jalankan:
   ```bash
   npm run build
   ```
2. Login Netlify → halaman **Sites** → **drag & drop folder `dist/`** ke area "Deploy manually".
3. Situs langsung live.

> Kekurangan Cara 2: karena env di-*bake* saat build, Anda harus `npm run build` ulang & drag ulang setiap ada perubahan. Cara 1 lebih praktis untuk jangka panjang.

### C.3 — (Opsional) Ganti Nama Domain
Netlify → **Site configuration** → **Change site name** → misal `asesmen-smpn5`.
URL menjadi `https://asesmen-smpn5.netlify.app`.

---

## 6. Langkah D — Uji Coba End-to-End

Lakukan ini setelah live untuk memastikan semua berjalan:

1. **Guru daftar & login:** buka `/guru/login` → **Daftar** → isi nama, email, password → masuk dashboard.
2. **Buat kelas:** klik **+ Buat Kelas** → isi nama (mis. "Kelas 7A"), mapel, tahun ajaran → **Simpan**. Muncul **kode kelas** (mis. `ABC-DEF`).
3. **Siswa main:** buka tab/incognito baru ke halaman utama `/` → masukkan kode kelas → isi nama & absen → pilih karakter → kerjakan 4 dunia.
   - Coba **refresh di tengah** kuis → progres harus tetap ada (local-first).
   - Coba **"Jeda & Simpan"** lalu masuk lagi dengan nama+absen sama → lanjut dari dunia terakhir (resume).
4. **Lihat hasil di guru:** kembali ke dashboard guru → klik kelas → lihat statistik, grafik, dan daftar siswa. Klik nama siswa → profil + rekomendasi.
5. **Ekspor:** coba **Ekspor PDF** dan **Ekspor Excel** di halaman kelas.

Jika kelima langkah berhasil, deployment Anda **sempurna**. ✅

---

## 7. Cara Menggunakan

### Untuk Guru
- **Registrasi/Login** di `/guru/login`.
- **Buat kelas** → dapat **kode kelas unik**. Bagikan kode ke siswa (tulis di papan / WA / print).
- **Pantau** status pengerjaan (Belum / Berjalan / Selesai) dan statistik rata-rata.
- **Halaman kelas** kini menampilkan kartu **"📋 Kesimpulan Analisis Kelas"** — paragraf deskriptif otomatis tentang tingkat kesiapan kelas, topik yang secara umum masih lemah, distribusi gaya belajar, dan saran pengelompokan pembelajaran berdiferensiasi (Teaching at the Right Level).
- **Klik nama siswa** untuk profil detail: skor tiap komponen, gaya belajar (grafik radar), rincian benar/salah **per topik** (mis. pecahan, energi, seri angka), dan kartu **"📋 Kesimpulan Analisis"** berupa narasi kekuatan/kelemahan siswa tersebut per mata pelajaran.
- **Nonaktifkan kode** setelah asesmen selesai (tombol 🔒 Nonaktifkan) agar tidak disalahgunakan.
- **Ekspor** laporan PDF (kini termasuk kesimpulan analisis naratif) atau Excel (data mentah).

### Untuk Siswa
- Buka alamat situs → masukkan **kode kelas** → isi **nama & nomor absen** → pilih **karakter**.
- Kerjakan **4 dunia** berurutan (VAK, Matematika, IPA, Penalaran). Urutan soal **dan** urutan pilihan jawaban diacak berbeda untuk tiap siswa, sehingga jawaban tidak bisa ditebak dari pola posisi.
- Bisa **jeda kapan saja**; lanjutkan nanti dengan **nama & absen yang sama**.
- Di akhir hanya melihat **gaya belajar + pesan penyemangat** (skor detail hanya untuk guru).

### Tentang Kualitas Soal & Analisis
- Setiap soal akademik (Matematika/IPA/Penalaran) kini bertag **tingkat kesulitan** (mudah/sedang/sukar) dan **topik**. Soal tingkat sukar ditambahkan agar siswa berkemampuan tinggi tetap terbedakan (menghindari efek "semua nilai 100"), sementara soal mudah tetap ada agar siswa yang masih berjuang di dasar tetap bisa menunjukkan kemampuannya (menghindari efek "semua nilai 0").
- **Urutan pilihan jawaban (A/B/C/D atau V/A/K) diacak per siswa** di sisi aplikasi (bukan cuma urutan soal) — ini menutup celah menebak pola (mis. "jawaban selalu B") tanpa perlu mengubah kunci jawaban di database.
- Kesimpulan deskriptif dihasilkan dari **rincian benar/total per topik & per tingkat kesulitan** yang dihitung di server saat siswa menyelesaikan asesmen (fungsi `finalize_student`), bukan sekadar persentase total — sehingga guru bisa melihat *pada bagian mana* siswa kuat/lemah, bukan cuma angka akhir.

---

## 8. Pemeliharaan & Kustomisasi

### Mengubah / Menambah Soal
Soal ada di tabel `question_bank`. Dua cara mengedit:
- **Lewat Supabase Table Editor:** menu **Table Editor** → tabel `question_bank` → edit langsung. Kolom `opsi` berformat JSON: `[{"key":"A","text":"..."}, ...]`, dan `kunci_jawaban` berisi key yang benar (mis. `"B"`). Untuk soal VAK, `kunci_jawaban` dikosongkan dan `key` opsi memakai `V`/`A`/`K`. Isi juga `topik` (mis. `pecahan`, `energi`, `seri_angka` — lihat daftar lengkap di `src/lib/analysis.js`, konstanta `TOPIK_LABEL`) dan `tingkat_kesulitan` (`mudah`/`sedang`/`sukar`) agar soal baru ikut masuk ke kesimpulan analisis otomatis.
- **Lewat SQL:** tambahkan `INSERT` mengikuti pola di bagian seed `supabase/setup.sql` (sertakan kolom `topik` dan `tingkat_kesulitan`).

> Menonaktifkan soal tanpa menghapus: set kolom `aktif = false`.
> ⚠️ **Jangan** menghapus lalu insert ulang soal yang sudah pernah dijawab siswa (akan menghapus jawaban siswa lewat cascade) — cukup **UPDATE** baris yang sudah ada.

### Mengubah Rentang Kategori Skor
Ada di fungsi `kategori_skor()` di `supabase/setup.sql`. Ubah ambang batas (40/60/80) lalu jalankan ulang bagian fungsi tersebut di SQL Editor.

### Mengubah Rekomendasi Otomatis
Aturan rule-based ada di fungsi `finalize_student()` (`supabase/setup.sql`). Sesuaikan blok `if ... then v_rekom := ...`.

### Menambah / Mengganti Karakter
Edit tabel `characters` (kolom `aset_avatar_url` memakai emoji di MVP; bisa diganti URL gambar dari Supabase Storage jika mau).

---

## 9. Migrasi Database — Project yang Sudah Berjalan

Jika project Supabase Anda **sudah dipakai** (sudah ada kelas/siswa) dan Anda baru meng-update kode aplikasi ini (versi dengan soal tingkat kesulitan + kesimpulan analisis deskriptif), **jangan** jalankan ulang `setup.sql` — itu akan menghapus jawaban siswa yang sudah tersimpan (lihat peringatan di Bagian 3.A.2). Sebagai gantinya:

1. Buka **Supabase Dashboard → SQL Editor → New query**.
2. Salin seluruh isi [`supabase/migration_v2_analisis.sql`](supabase/migration_v2_analisis.sql), tempel, lalu **Run**.
3. Skrip ini **hanya menambah**, tidak menghapus:
   - Kolom baru `topik` & `tingkat_kesulitan` pada `question_bank`, dan `detail_topik` pada `student_results`.
   - Menandai (UPDATE) 54 soal lama dengan topik & tingkat kesulitan yang sesuai — ID soal lama **tidak berubah**, jadi jawaban siswa yang sudah ada tetap valid.
   - Menambahkan 12 soal baru tingkat **sukar** (4 per modul Matematika/IPA/Penalaran) lewat `INSERT ... WHERE NOT EXISTS`, jadi aman dijalankan berkali-kali.
   - Memperbarui fungsi `finalize_student` agar menghitung rincian per topik & per tingkat kesulitan untuk siswa yang finalisasi **setelah** migrasi ini dijalankan.
4. Query terakhir dalam skrip adalah **verifikasi** — hasil yang diharapkan: semua baris `soal_belum_ditag` bernilai **0**. Jika ada modul dengan angka > 0, berarti ada soal yang teks-nya sudah diedit manual sehingga tidak cocok dengan pola pencocokan; tag topik/kesulitan soal tersebut manual lewat Table Editor.
5. **Redeploy frontend** (Netlify: `Trigger deploy`, atau lokal: restart `npm run dev`) agar kode terbaru (opsi teracak, kartu Kesimpulan Analisis) ikut aktif.

> **Catatan tentang skor siswa yang sudah menyelesaikan asesmen SEBELUM migrasi:** skor akademik mereka tidak berubah (dihitung dari jawaban yang sudah ada), tetapi kolom `detail_topik` mereka akan kosong (karena dihitung saat finalisasi, bukan retroaktif) sehingga kartu "Kesimpulan Analisis" untuk siswa tersebut akan lebih singkat (tanpa rincian per topik). Untuk data lama yang penting, guru bisa meminta siswa membuka kembali link `/hasil/<id>` — ini **tidak** menghitung ulang finalisasi (finalisasi hanya sekali). Jika ingin memperbaiki data siswa lama, opsi paling sederhana adalah menghapus baris siswa tersebut di tabel `students` (cascade menghapus jawaban & hasilnya) dan meminta siswa mengerjakan ulang.

---

## 10. Troubleshooting

| Gejala | Penyebab & Solusi |
|---|---|
| Halaman menampilkan peringatan kuning "Koneksi Supabase belum dikonfigurasi" | Env belum terisi. Lokal: cek `.env`. Netlify: cek Environment Variables lalu **Clear cache and deploy**. |
| Guru daftar tapi tidak bisa login | Konfirmasi email masih ON. Matikan di **Authentication → Providers → Email → Confirm email (OFF)**, atau cek email untuk link konfirmasi. |
| Siswa: "Kode kelas tidak ditemukan" | Kode salah, atau kelas berstatus **nonaktif**. Guru aktifkan lagi (🔓) atau cek ejaan kode. |
| Refresh halaman `/guru/...` memberi 404 di Netlify | Pastikan `netlify.toml` ada (berisi redirect SPA ke `/index.html`). Sudah disertakan di proyek ini. |
| Status siswa "Selesai" tapi skor/grafik tidak muncul di dashboard guru | Sejak versi ini, dashboard mengambil data siswa & hasil lewat query terpisah dengan pesan error eksplisit (bukan lagi *embed* diam-diam). Jika masih muncul: (1) hard refresh browser guru (`Ctrl+Shift+R`), (2) di Supabase, buka **Project Settings → API → klik "Reload schema"** (cache skema PostgREST kadang perlu di-refresh setelah menjalankan SQL baru), (3) cek pesan error merah di halaman kelas — sekarang error ditampilkan langsung alih-alih disembunyikan. |
| Siswa mengerjakan tapi belum masuk "Selesai" | Siswa belum menekan "Selesaikan Dunia" di dunia ke-4 (skor & finalisasi hanya terjadi di titik itu). Status masih "Berjalan". |
| Error saat `npm install` | Pastikan Node 18/20. Hapus `node_modules` & `package-lock.json`, lalu `npm install` lagi. |
| Build gagal di Netlify | Cek log build. Umumnya karena env variable belum di-set atau versi Node. `netlify.toml` sudah mematok Node 20. |

Cek log detail Supabase di **Logs** (menu kiri) dan error frontend di **Console** browser (F12).

---

## 11. Catatan Keamanan

- **RLS aktif** di semua tabel. Guru hanya bisa mengakses data kelas miliknya (`teacher_id = auth.uid()`).
- **Siswa (anon) tidak** bisa membaca tabel secara langsung — semua lewat fungsi **RPC** yang dibatasi:
  - `get_class_by_code` hanya mengembalikan kolom terbatas & kelas **aktif**.
  - `get_questions` mengembalikan soal **tanpa** `kunci_jawaban`.
  - `save_answers` & `finalize_student` menghitung benar/salah & skor **di server**, dan butuh **session token** yang cocok agar tidak bisa ditimpa orang lain.
- **Kunci jawaban tidak pernah dikirim ke browser** → siswa tidak bisa mengintip lewat Network/DevTools.
- **Nonaktifkan kode kelas** setelah asesmen selesai untuk mencegah pengisian ulang.
- Untuk produksi skala sekolah, tinjau ulang desain RLS bersama admin sesuai kebijakan sekolah (lihat PRD Bagian 9 — Risiko & Keputusan Terbuka).

---

### Struktur Proyek (ringkas)
```
gameadventure/
├── index.html
├── package.json
├── vite.config.js
├── netlify.toml            ← konfigurasi deploy Netlify (SPA redirect)
├── .env.example            ← template kredensial (salin jadi .env)
├── panduan.md              ← file ini
├── prd.md                  ← dokumen kebutuhan produk
├── supabase/
│   ├── setup.sql                  ← SKRIP DATABASE untuk project BARU (jalankan sekali di SQL Editor)
│   └── migration_v2_analisis.sql  ← Migrasi AMAN untuk project yang SUDAH ada datanya (lihat Bagian 9)
└── src/
    ├── main.jsx, App.jsx
    ├── context/AuthContext.jsx
    ├── lib/                ← supabase client, util, ekspor PDF/Excel, analysis.js (kesimpulan naratif)
    ├── data/worlds.js      ← definisi 4 dunia
    ├── components/         ← Navbar, QuizWorld, dll.
    └── pages/              ← alur siswa & dashboard guru
```

---

**Selamat! Aplikasi Petualangan Jati Diri siap digunakan.** 🧭
Jika butuh pengembangan Fase 2/3 (narasi adventure penuh, CMS soal untuk guru, multi-admin), lihat Roadmap di `prd.md` Bagian 8.
