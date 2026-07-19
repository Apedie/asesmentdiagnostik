-- =====================================================================
--  MIGRASI v3 — Petualangan Jati Diri
--  Tujuan: mengizinkan GURU (authenticated) membaca isi lengkap
--  question_bank (termasuk teks soal, opsi, DAN kunci_jawaban).
--
--  Sebelumnya question_bank TIDAK punya policy SELECT sama sekali
--  (sengaja, agar siswa/anon tidak bisa mengintip kunci jawaban).
--  Tapi ini juga membuat GURU tidak bisa membaca soal — sehingga
--  fitur "rincian jawaban per kategori" (melihat soal mana yang
--  dijawab salah oleh siswa) tidak bisa ditampilkan di dashboard guru.
--
--  Policy baru ini HANYA mengizinkan role `authenticated` (yaitu guru
--  yang sudah login lewat Supabase Auth). Siswa tetap mengakses soal
--  lewat RPC get_questions() yang sudah menyaring kunci_jawaban keluar
--  — jadi keamanan terhadap siswa tidak berubah.
--
--  AMAN dijalankan di project yang sudah berjalan — hanya menambah
--  policy, tidak mengubah data apa pun.
-- =====================================================================

drop policy if exists question_bank_teacher_read on public.question_bank;
create policy question_bank_teacher_read on public.question_bank
  for select using (auth.role() = 'authenticated');

-- Verifikasi cepat: query ini harus BERHASIL saat dijalankan sebagai
-- authenticated (mis. lewat aplikasi setelah guru login), dan gagal/kosong
-- untuk anon. Di SQL Editor (yang berjalan sebagai postgres/service role)
-- query ini akan selalu berhasil terlepas dari policy — itu normal.
select count(*) as total_soal_di_bank from public.question_bank;
