-- =====================================================================
--  MIGRASI v2 — Petualangan Jati Diri
--  Tujuan:
--    1) Menambah tingkat kesulitan & topik pada bank soal (untuk analisis
--       deskriptif per topik, dan menambah soal SUKAR agar asesmen bisa
--       membedakan kemampuan siswa, bukan cuma mudah/sedang seragam).
--    2) Menambah kolom `detail_topik` di student_results + menghitung
--       rincian benar/total per topik & per tingkat kesulitan saat finalisasi.
--
--  AMAN untuk project yang SUDAH punya data siswa: skrip ini TIDAK
--  menghapus question_bank (tidak seperti setup.sql awal yang memakai
--  `delete from question_bank` lalu insert ulang — itu akan MEMUTUS
--  relasi ke student_answers lewat ON DELETE CASCADE dan MENGHAPUS
--  jawaban siswa yang sudah tersimpan). Skrip ini hanya ALTER/UPDATE/INSERT.
--
--  Jalankan SEKALI di Supabase SQL Editor. Aman dijalankan ulang (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Kolom baru
-- ---------------------------------------------------------------------
alter table public.question_bank
  add column if not exists topik text,
  add column if not exists tingkat_kesulitan text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'question_bank_tingkat_kesulitan_check'
  ) then
    alter table public.question_bank
      add constraint question_bank_tingkat_kesulitan_check
      check (tingkat_kesulitan in ('mudah','sedang','sukar'));
  end if;
end $$;

alter table public.student_results
  add column if not exists detail_topik jsonb;

-- ---------------------------------------------------------------------
-- 2. Tag topik + tingkat kesulitan pada soal yang SUDAH ADA
--    (di-update lewat teks_soal, ID & jawaban lama TIDAK berubah,
--    jadi jawaban siswa yang sudah tersimpan tetap valid)
-- ---------------------------------------------------------------------

-- ===== MATEMATIKA =====
update public.question_bank set topik='operasi_hitung', tingkat_kesulitan='sedang' where modul='matematika' and teks_soal='Hasil dari 24 + 18 × 2 = ...';
update public.question_bank set topik='pecahan', tingkat_kesulitan='sedang' where modul='matematika' and teks_soal='Hasil dari 3/4 + 1/8 = ...';
update public.question_bank set topik='desimal', tingkat_kesulitan='mudah' where modul='matematika' and teks_soal='Hasil dari 0,5 × 0,2 = ...';
update public.question_bank set topik='persen', tingkat_kesulitan='mudah' where modul='matematika' and teks_soal='25% dari 80 adalah ...';
update public.question_bank set topik='geometri', tingkat_kesulitan='mudah' where modul='matematika' and teks_soal='Keliling persegi dengan panjang sisi 7 cm adalah ...';
update public.question_bank set topik='geometri', tingkat_kesulitan='sedang' where modul='matematika' and teks_soal='Luas persegi panjang dengan panjang 8 cm dan lebar 5 cm adalah ...';
update public.question_bank set topik='aljabar', tingkat_kesulitan='sedang' where modul='matematika' and teks_soal='Jika 3x = 21, maka nilai x = ...';
update public.question_bank set topik='desimal', tingkat_kesulitan='mudah' where modul='matematika' and teks_soal='Bilangan terkecil dari 0,45 ; 0,5 ; 0,405 ; 0,54 adalah ...';
update public.question_bank set topik='statistika', tingkat_kesulitan='sedang' where modul='matematika' and teks_soal='Rata-rata dari bilangan 6, 8, 10, dan 12 adalah ...';
update public.question_bank set topik='soal_cerita', tingkat_kesulitan='sedang' where modul='matematika' and teks_soal='Sebuah baju seharga Rp50.000 mendapat diskon 20%. Harga setelah diskon adalah ...';
update public.question_bank set topik='kpk_fpb', tingkat_kesulitan='mudah' where modul='matematika' and teks_soal='FPB dari 12 dan 18 adalah ...';
update public.question_bank set topik='kpk_fpb', tingkat_kesulitan='mudah' where modul='matematika' and teks_soal='KPK dari 4 dan 6 adalah ...';
update public.question_bank set topik='bilangan_bulat', tingkat_kesulitan='mudah' where modul='matematika' and teks_soal='Hasil dari (-5) + 8 = ...';
update public.question_bank set topik='operasi_hitung', tingkat_kesulitan='mudah' where modul='matematika' and teks_soal='Hasil dari 144 : 12 = ...';
update public.question_bank set topik='pola', tingkat_kesulitan='sedang' where modul='matematika' and teks_soal='Perhatikan pola: 2, 4, 8, 16, ... Bilangan berikutnya adalah ...';
update public.question_bank set topik='operasi_hitung', tingkat_kesulitan='mudah' where modul='matematika' and teks_soal='Hasil dari 7² adalah ...';
update public.question_bank set topik='soal_cerita', tingkat_kesulitan='mudah' where modul='matematika' and teks_soal='Harga 1 pensil Rp2.500. Harga 6 pensil adalah ...';
update public.question_bank set topik='persen', tingkat_kesulitan='sedang' where modul='matematika' and teks_soal='Pecahan 3/5 sama dengan ...';

-- ===== IPA =====
update public.question_bank set topik='makhluk_hidup', tingkat_kesulitan='mudah' where modul='ipa' and teks_soal='Bagian tumbuhan yang berfungsi menyerap air dan mineral dari tanah adalah ...';
update public.question_bank set topik='makhluk_hidup', tingkat_kesulitan='sedang' where modul='ipa' and teks_soal='Proses tumbuhan membuat makanan dengan bantuan cahaya matahari disebut ...';
update public.question_bank set topik='makhluk_hidup', tingkat_kesulitan='mudah' where modul='ipa' and teks_soal='Alat pernapasan pada ikan adalah ...';
update public.question_bank set topik='materi_perubahan', tingkat_kesulitan='mudah' where modul='ipa' and teks_soal='Perubahan wujud benda dari padat menjadi cair disebut ...';
update public.question_bank set topik='energi', tingkat_kesulitan='mudah' where modul='ipa' and teks_soal='Sumber energi utama bagi kehidupan di bumi adalah ...';
update public.question_bank set topik='tubuh_manusia', tingkat_kesulitan='mudah' where modul='ipa' and teks_soal='Organ tubuh manusia yang berfungsi memompa darah adalah ...';
update public.question_bank set topik='materi_perubahan', tingkat_kesulitan='sedang' where modul='ipa' and teks_soal='Pada tekanan normal, air mendidih pada suhu ...';
update public.question_bank set topik='makhluk_hidup', tingkat_kesulitan='mudah' where modul='ipa' and teks_soal='Hewan yang berkembang biak dengan cara bertelur disebut ...';
update public.question_bank set topik='bumi_antariksa', tingkat_kesulitan='mudah' where modul='ipa' and teks_soal='Planet tempat kita tinggal adalah ...';
update public.question_bank set topik='materi_perubahan', tingkat_kesulitan='mudah' where modul='ipa' and teks_soal='Benda yang dapat ditarik oleh magnet umumnya terbuat dari ...';
update public.question_bank set topik='tubuh_manusia', tingkat_kesulitan='mudah' where modul='ipa' and teks_soal='Gas yang diperlukan manusia saat bernapas adalah ...';
update public.question_bank set topik='makhluk_hidup', tingkat_kesulitan='sedang' where modul='ipa' and teks_soal='Urutan daur hidup kupu-kupu yang benar adalah ...';
update public.question_bank set topik='materi_perubahan', tingkat_kesulitan='sedang' where modul='ipa' and teks_soal='Bunyi dapat merambat melalui zat berikut, kecuali ...';
update public.question_bank set topik='makhluk_hidup', tingkat_kesulitan='sedang' where modul='ipa' and teks_soal='Bagian bunga yang merupakan alat kelamin betina adalah ...';
update public.question_bank set topik='energi', tingkat_kesulitan='sedang' where modul='ipa' and teks_soal='Perpindahan panas melalui zat perantara tanpa disertai perpindahan zatnya disebut ...';
update public.question_bank set topik='energi', tingkat_kesulitan='sedang' where modul='ipa' and teks_soal='Contoh sumber energi yang dapat diperbarui adalah ...';
update public.question_bank set topik='tubuh_manusia', tingkat_kesulitan='sedang' where modul='ipa' and teks_soal='Berikut adalah fungsi rangka manusia, kecuali ...';
update public.question_bank set topik='bumi_antariksa', tingkat_kesulitan='mudah' where modul='ipa' and teks_soal='Peristiwa pergantian siang dan malam disebabkan oleh ...';

-- ===== PENALARAN =====
update public.question_bank set topik='seri_angka', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Lanjutkan seri berikut: 3, 6, 9, 12, ...';
update public.question_bank set topik='seri_angka', tingkat_kesulitan='sedang' where modul='penalaran' and teks_soal='Lanjutkan seri berikut: 1, 4, 9, 16, ...';
update public.question_bank set topik='analogi', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Panas : Dingin = Tinggi : ...';
update public.question_bank set topik='analogi', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Guru : Sekolah = Dokter : ...';
update public.question_bank set topik='seri_angka', tingkat_kesulitan='sedang' where modul='penalaran' and teks_soal='Lanjutkan seri berikut: 2, 6, 12, 20, ...';
update public.question_bank set topik='deduktif', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Semua kucing adalah hewan. Mimi adalah kucing. Maka Mimi adalah ...';
update public.question_bank set topik='pola_huruf', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Lanjutkan pola huruf: A, C, E, G, ...';
update public.question_bank set topik='klasifikasi', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Manakah yang berbeda dari yang lain?';
update public.question_bank set topik='seri_angka', tingkat_kesulitan='sedang' where modul='penalaran' and teks_soal='Lanjutkan seri berikut: 100, 50, 25, ...';
update public.question_bank set topik='analogi', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Buku : Membaca = Pena : ...';
update public.question_bank set topik='deduktif', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Jika hari ini hari Selasa, maka 3 hari lagi adalah hari ...';
update public.question_bank set topik='pola', tingkat_kesulitan='sedang' where modul='penalaran' and teks_soal='Perhatikan pola jumlah bintang tiap baris: 1, 2, 3, ... Jumlah bintang pada baris berikutnya adalah ...';
update public.question_bank set topik='klasifikasi', tingkat_kesulitan='sedang' where modul='penalaran' and teks_soal='Manakah bilangan yang berbeda pola dari: 2, 4, 6, 7, 8?';
update public.question_bank set topik='deduktif', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Ayah lebih tua dari Kakak. Kakak lebih tua dari Adik. Siapa yang paling muda?';
update public.question_bank set topik='seri_angka', tingkat_kesulitan='sedang' where modul='penalaran' and teks_soal='Lanjutkan seri berikut: 5, 10, 20, 40, ...';
update public.question_bank set topik='analogi', tingkat_kesulitan='sedang' where modul='penalaran' and teks_soal='Ban : Mobil = Layar : ...';
update public.question_bank set topik='pola_huruf', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Lanjutkan pola huruf: Z, Y, X, W, ...';
update public.question_bank set topik='klasifikasi', tingkat_kesulitan='mudah' where modul='penalaran' and teks_soal='Sebuah kotak berisi 3 bola merah dan 2 bola biru. Bola warna apa yang lebih banyak?';

-- ---------------------------------------------------------------------
-- 3. Soal baru tingkat SUKAR — melebarkan sebaran kesulitan agar siswa
--    berkemampuan tinggi juga bisa terbedakan (hindari efek "mentok 100").
--    Hanya ditambahkan jika belum ada (dicek lewat teks_soal).
-- ---------------------------------------------------------------------

insert into public.question_bank (modul, teks_soal, opsi, kunci_jawaban, topik, tingkat_kesulitan, urutan)
select * from (values
  ('matematika',
   'Sebuah toko memberi diskon 20% untuk baju seharga Rp120.000, lalu ada potongan tambahan Rp10.000 untuk pembayaran tunai. Harga akhir yang harus dibayar adalah ...',
   '[{"key":"A","text":"Rp86.000"},{"key":"B","text":"Rp96.000"},{"key":"C","text":"Rp88.000"},{"key":"D","text":"Rp76.000"}]'::jsonb,
   'A','soal_cerita','sukar',19),
  ('matematika',
   'Ibu membeli 2 3/4 kg gula, lalu memakai 1 1/2 kg untuk membuat kue. Sisa gula ibu adalah ... kg',
   '[{"key":"A","text":"1 1/4"},{"key":"B","text":"1 1/2"},{"key":"C","text":"1 3/4"},{"key":"D","text":"2 1/4"}]'::jsonb,
   'A','pecahan','sukar',20),
  ('matematika',
   'Sebuah taman berbentuk persegi panjang berukuran 12 m × 8 m. Di tengah taman dibuat kolam berbentuk persegi dengan sisi 4 m. Luas taman yang tidak tertutup kolam adalah ...',
   '[{"key":"A","text":"80 m²"},{"key":"B","text":"96 m²"},{"key":"C","text":"76 m²"},{"key":"D","text":"84 m²"}]'::jsonb,
   'A','geometri','sukar',21),
  ('matematika',
   'Jika 2x + 5 = 17, maka nilai dari 3x − 4 adalah ...',
   '[{"key":"A","text":"14"},{"key":"B","text":"18"},{"key":"C","text":"22"},{"key":"D","text":"8"}]'::jsonb,
   'A','aljabar','sukar',22)
) as v(modul, teks_soal, opsi, kunci_jawaban, topik, tingkat_kesulitan, urutan)
where not exists (
  select 1 from public.question_bank q where q.modul = v.modul and q.teks_soal = v.teks_soal
);

insert into public.question_bank (modul, teks_soal, opsi, kunci_jawaban, topik, tingkat_kesulitan, urutan)
select * from (values
  ('ipa',
   'Sebuah senter menyala karena energi kimia dalam baterai diubah menjadi energi listrik lalu menjadi energi cahaya. Urutan perubahan energi yang benar adalah ...',
   '[{"key":"A","text":"Kimia → Listrik → Cahaya"},{"key":"B","text":"Listrik → Kimia → Cahaya"},{"key":"C","text":"Cahaya → Kimia → Listrik"},{"key":"D","text":"Kimia → Cahaya → Listrik"}]'::jsonb,
   'A','energi','sukar',19),
  ('ipa',
   'Es batu dimasukkan ke dalam gelas berisi air hangat. Es batu tersebut mengalami perubahan wujud dari padat menjadi cair karena peristiwa ...',
   '[{"key":"A","text":"Mencair karena menyerap panas"},{"key":"B","text":"Membeku karena melepas panas"},{"key":"C","text":"Menyublim karena tekanan rendah"},{"key":"D","text":"Mengembun karena suhu turun"}]'::jsonb,
   'A','materi_perubahan','sukar',20),
  ('ipa',
   'Ketika kita menarik napas, otot diafragma akan berkontraksi dan mendatar, menyebabkan rongga dada membesar sehingga udara ...',
   '[{"key":"A","text":"Masuk ke paru-paru"},{"key":"B","text":"Keluar dari paru-paru"},{"key":"C","text":"Tertahan di tenggorokan"},{"key":"D","text":"Berpindah ke lambung"}]'::jsonb,
   'A','tubuh_manusia','sukar',21),
  ('ipa',
   'Gerhana matahari total dapat terjadi ketika ...',
   '[{"key":"A","text":"Bulan berada tepat di antara Matahari dan Bumi, menutupi Matahari sepenuhnya"},{"key":"B","text":"Bumi berada tepat di antara Matahari dan Bulan"},{"key":"C","text":"Bulan berada di titik terjauh dari Bumi saat sejajar"},{"key":"D","text":"Matahari, Bumi, dan Bulan membentuk sudut 90°"}]'::jsonb,
   'A','bumi_antariksa','sukar',22)
) as v(modul, teks_soal, opsi, kunci_jawaban, topik, tingkat_kesulitan, urutan)
where not exists (
  select 1 from public.question_bank q where q.modul = v.modul and q.teks_soal = v.teks_soal
);

insert into public.question_bank (modul, teks_soal, opsi, kunci_jawaban, topik, tingkat_kesulitan, urutan)
select * from (values
  ('penalaran',
   'Lanjutkan seri berikut: 1, 1, 2, 3, 5, 8, ...',
   '[{"key":"A","text":"11"},{"key":"B","text":"12"},{"key":"C","text":"13"},{"key":"D","text":"14"}]'::jsonb,
   'C','seri_angka','sukar',19),
  ('penalaran',
   'Semua siswa kelas 7A mengikuti ekskursi. Sebagian siswa kelas 7A adalah anggota klub sains. Andi adalah anggota klub sains kelas 7A. Manakah pernyataan yang PASTI benar tentang Andi?',
   '[{"key":"A","text":"Andi mengikuti ekskursi"},{"key":"B","text":"Andi bukan anggota klub sains"},{"key":"C","text":"Andi tidak mengikuti ekskursi"},{"key":"D","text":"Andi adalah ketua klub sains"}]'::jsonb,
   'A','deduktif','sukar',20),
  ('penalaran',
   'Termometer : Suhu = Barometer : ...',
   '[{"key":"A","text":"Cuaca"},{"key":"B","text":"Tekanan udara"},{"key":"C","text":"Angin"},{"key":"D","text":"Hujan"}]'::jsonb,
   'B','analogi','sukar',21),
  ('penalaran',
   'Perhatikan pola berikut: 3, 7, 15, 31, ... Lanjutkan pola tersebut.',
   '[{"key":"A","text":"47"},{"key":"B","text":"60"},{"key":"C","text":"63"},{"key":"D","text":"62"}]'::jsonb,
   'C','seri_angka','sukar',22)
) as v(modul, teks_soal, opsi, kunci_jawaban, topik, tingkat_kesulitan, urutan)
where not exists (
  select 1 from public.question_bank q where q.modul = v.modul and q.teks_soal = v.teks_soal
);

-- ---------------------------------------------------------------------
-- 4. Fungsi bantu: rincian benar/total per topik & per tingkat kesulitan
-- ---------------------------------------------------------------------
create or replace function public.breakdown_topik(p_student_id uuid, p_modul text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(topik, jsonb_build_object('benar', benar, 'total', total)), '{}'::jsonb)
  from (
    select q.topik,
           count(*) filter (where sa.is_correct) as benar,
           count(*) as total
    from public.student_answers sa
    join public.question_bank q on q.id = sa.question_id
    where sa.student_id = p_student_id and q.modul = p_modul and q.topik is not null
    group by q.topik
  ) t;
$$;

create or replace function public.breakdown_kesulitan(p_student_id uuid, p_modul text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(tingkat_kesulitan, jsonb_build_object('benar', benar, 'total', total)), '{}'::jsonb)
  from (
    select q.tingkat_kesulitan,
           count(*) filter (where sa.is_correct) as benar,
           count(*) as total
    from public.student_answers sa
    join public.question_bank q on q.id = sa.question_id
    where sa.student_id = p_student_id and q.modul = p_modul and q.tingkat_kesulitan is not null
    group by q.tingkat_kesulitan
  ) t;
$$;

grant execute on function public.breakdown_topik(uuid, text) to anon, authenticated;
grant execute on function public.breakdown_kesulitan(uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. finalize_student — sekarang juga menghitung & menyimpan detail_topik
-- ---------------------------------------------------------------------
create or replace function public.finalize_student(p_student_id uuid, p_token uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_mtk numeric; v_ipa numeric; v_pen numeric;
  v_v int; v_a int; v_k int;
  v_dom text; v_top1 int; v_top2 int; v_selisih int;
  v_rekom jsonb := '[]'::jsonb;
  v_detail jsonb;
  function_cat text;
begin
  if not exists (select 1 from public.students s
                 where s.id = p_student_id and s.session_token = p_token) then
    raise exception 'TOKEN_TIDAK_VALID';
  end if;

  select round( 100.0 * count(*) filter (where sa.is_correct)
                / nullif((select count(*) from public.question_bank where modul='matematika' and aktif),0), 0)
    into v_mtk
  from public.student_answers sa
  join public.question_bank q on q.id = sa.question_id
  where sa.student_id = p_student_id and q.modul = 'matematika';

  select round( 100.0 * count(*) filter (where sa.is_correct)
                / nullif((select count(*) from public.question_bank where modul='ipa' and aktif),0), 0)
    into v_ipa
  from public.student_answers sa
  join public.question_bank q on q.id = sa.question_id
  where sa.student_id = p_student_id and q.modul = 'ipa';

  select round( 100.0 * count(*) filter (where sa.is_correct)
                / nullif((select count(*) from public.question_bank where modul='penalaran' and aktif),0), 0)
    into v_pen
  from public.student_answers sa
  join public.question_bank q on q.id = sa.question_id
  where sa.student_id = p_student_id and q.modul = 'penalaran';

  select
    count(*) filter (where sa.jawaban = 'V'),
    count(*) filter (where sa.jawaban = 'A'),
    count(*) filter (where sa.jawaban = 'K')
  into v_v, v_a, v_k
  from public.student_answers sa
  join public.question_bank q on q.id = sa.question_id
  where sa.student_id = p_student_id and q.modul = 'vak';

  v_v := coalesce(v_v,0); v_a := coalesce(v_a,0); v_k := coalesce(v_k,0);

  with s as (
    select 'Visual' as label, v_v as val
    union all select 'Auditori', v_a
    union all select 'Kinestetik', v_k
  ), ranked as (
    select label, val, row_number() over (order by val desc) rn from s
  )
  select
    (select label from ranked where rn=1),
    (select val   from ranked where rn=1),
    (select val   from ranked where rn=2),
    (select label from ranked where rn=2)
  into v_dom, v_top1, v_top2, function_cat;

  v_selisih := v_top1 - v_top2;
  if v_selisih <= 1 then
    v_dom := v_dom || '–' || function_cat;
  end if;

  if v_mtk is not null and v_mtk <= 40 then
    v_rekom := v_rekom || jsonb_build_array('Perkuat operasi hitung dasar & konsep pecahan.');
  end if;
  if v_ipa is not null and v_ipa <= 40 then
    v_rekom := v_rekom || jsonb_build_array('Perkuat konsep IPA dasar melalui contoh nyata & eksperimen sederhana.');
  end if;
  if v_pen is not null and v_pen <= 40 then
    v_rekom := v_rekom || jsonb_build_array('Latih penalaran lewat pola, teka-teki, dan permainan logika.');
  end if;
  if v_dom like 'Visual%' then
    v_rekom := v_rekom || jsonb_build_array('Perbanyak media gambar, diagram, peta konsep, dan warna.');
  end if;
  if v_dom like 'Auditori%' then
    v_rekom := v_rekom || jsonb_build_array('Perbanyak penjelasan lisan, diskusi, dan rekaman audio.');
  end if;
  if v_dom like 'Kinestetik%' then
    v_rekom := v_rekom || jsonb_build_array('Perbanyak praktik langsung, eksperimen, dan pembelajaran bergerak.');
  end if;

  v_detail := jsonb_build_object(
    'matematika', jsonb_build_object(
      'per_topik', public.breakdown_topik(p_student_id, 'matematika'),
      'per_kesulitan', public.breakdown_kesulitan(p_student_id, 'matematika')
    ),
    'ipa', jsonb_build_object(
      'per_topik', public.breakdown_topik(p_student_id, 'ipa'),
      'per_kesulitan', public.breakdown_kesulitan(p_student_id, 'ipa')
    ),
    'penalaran', jsonb_build_object(
      'per_topik', public.breakdown_topik(p_student_id, 'penalaran'),
      'per_kesulitan', public.breakdown_kesulitan(p_student_id, 'penalaran')
    )
  );

  insert into public.student_results (
    student_id, skor_matematika, skor_ipa, skor_penalaran,
    kategori_matematika, kategori_ipa, kategori_penalaran,
    vak_v, vak_a, vak_k, gaya_belajar_dominan, rekomendasi, detail_topik
  ) values (
    p_student_id, v_mtk, v_ipa, v_pen,
    public.kategori_skor(v_mtk), public.kategori_skor(v_ipa), public.kategori_skor(v_pen),
    v_v, v_a, v_k, v_dom, v_rekom, v_detail
  )
  on conflict (student_id) do update set
    skor_matematika = excluded.skor_matematika,
    skor_ipa = excluded.skor_ipa,
    skor_penalaran = excluded.skor_penalaran,
    kategori_matematika = excluded.kategori_matematika,
    kategori_ipa = excluded.kategori_ipa,
    kategori_penalaran = excluded.kategori_penalaran,
    vak_v = excluded.vak_v, vak_a = excluded.vak_a, vak_k = excluded.vak_k,
    gaya_belajar_dominan = excluded.gaya_belajar_dominan,
    rekomendasi = excluded.rekomendasi,
    detail_topik = excluded.detail_topik,
    finalized_at = now();

  update public.students
     set status_sesi = 'selesai', current_world = 5, updated_at = now()
   where id = p_student_id;
end;
$$;

grant execute on function public.finalize_student(uuid,uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Verifikasi — jalankan query ini setelah migrasi untuk memastikan
--    semua soal akademik (non-VAK) sudah punya topik & tingkat kesulitan.
--    Hasil yang diharapkan: seluruh baris count = 0.
-- ---------------------------------------------------------------------
select modul, count(*) as soal_belum_ditag
from public.question_bank
where modul <> 'vak' and aktif and (topik is null or tingkat_kesulitan is null)
group by modul;

-- =====================================================================
--  SELESAI. Bank soal sekarang: 15 VAK + 22 MTK + 22 IPA + 22 Penalaran
--  (masing-masing +4 soal SUKAR), semua bertag topik & tingkat kesulitan.
-- =====================================================================
