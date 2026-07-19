-- =====================================================================
--  UPDATE KARAKTER PETUALANG KE KELAS RPG (WARRIOR, ARCHER, MAGE, TANKER, ASSASSIN)
--  Jalankan kueri ini di Supabase Dashboard > SQL Editor > New query.
--  Aman dijalankan tanpa melanggar foreign key constraint referensi siswa.
-- =====================================================================

-- 1. Reset pilihan karakter siswa yang memilih karakter ID > 5 ke NULL
UPDATE public.students 
SET karakter_id = NULL 
WHERE karakter_id > 5;

-- 2. Hapus baris karakter lama yang ID-nya di luar 1-5
DELETE FROM public.characters 
WHERE id > 5;

-- 3. Masukkan/perbarui karakter RPG untuk ID 1-5 (menggunakan DO UPDATE agar tidak melanggar referensi siswa yang ada)
INSERT INTO public.characters (id, nama, gelar, aset_avatar_url) VALUES
  (1, 'Warrior',  'Ksatria Perkasa',  '⚔️'),
  (2, 'Archer',   'Pemanah Jitu',     '🏹'),
  (3, 'Mage',     'Penyihir Agung',    '🧙'),
  (4, 'Tanker',   'Tameng Pelindung', '🛡️'),
  (5, 'Assassin', 'Bayang Sunyi',      '🥷')
ON CONFLICT (id) DO UPDATE SET
  nama = EXCLUDED.nama,
  gelar = EXCLUDED.gelar,
  aset_avatar_url = EXCLUDED.aset_avatar_url;

