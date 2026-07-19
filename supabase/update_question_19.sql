-- =====================================================================
--  PERBAIKAN SOAL IPA NOMOR 19 (URUTAN ENERGI SENTER)
--  Jalankan kueri ini di Supabase Dashboard > SQL Editor > New query.
--  Kueri ini akan memperbaiki teks soal agar tidak membocorkan jawabannya.
-- =====================================================================

UPDATE public.question_bank
SET teks_soal = 'Ketika sebuah senter yang menggunakan baterai dinyalakan, urutan perubahan bentuk energi yang benar hingga lampu menyala adalah ...'
WHERE modul = 'ipa' AND urutan = 19;
