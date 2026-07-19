-- =====================================================================
--  PETUALANGAN JATI DIRI — Setup Database Supabase (lengkap)
--  Jalankan seluruh file ini di Supabase Dashboard > SQL Editor > New query
--  Aman dijalankan berulang (idempotent) berkat DROP ... IF EXISTS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EKSTENSI
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";  -- untuk gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. TABEL
-- ---------------------------------------------------------------------

-- Profil guru (id = auth.uid dari Supabase Auth)
create table if not exists public.teachers (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nama       text,
  created_at timestamptz not null default now()
);

-- Kelas milik guru
create table if not exists public.classes (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid not null references public.teachers(id) on delete cascade,
  nama_kelas   text not null,
  mapel        text,
  kode_kelas   text not null unique,
  tahun_ajaran text,
  status       text not null default 'aktif' check (status in ('aktif','nonaktif')),
  created_at   timestamptz not null default now()
);

-- Karakter/avatar (kosmetik)
create table if not exists public.characters (
  id             int primary key,
  nama           text not null,
  gelar          text not null,
  aset_avatar_url text  -- di MVP kita pakai emoji, kolom ini opsional
);

-- Siswa (tanpa akun; unik per kombinasi class_id + nama + no_absen)
create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes(id) on delete cascade,
  nama          text not null,
  no_absen      text not null,
  karakter_id   int references public.characters(id),
  status_sesi   text not null default 'belum' check (status_sesi in ('belum','berjalan','selesai')),
  current_world int  not null default 1,
  session_token uuid not null default gen_random_uuid(),  -- untuk otorisasi ringan tanpa auth
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (class_id, nama, no_absen)
);

-- Bank soal
create table if not exists public.question_bank (
  id                 uuid primary key default gen_random_uuid(),
  modul              text not null check (modul in ('vak','matematika','ipa','penalaran')),
  teks_soal          text not null,
  opsi               jsonb not null,       -- array [{key, text}]
  kunci_jawaban      text,                 -- null untuk VAK
  kategori_vak       text,                 -- tidak dipakai (kategori ada di key opsi); disimpan utk kompatibilitas
  bobot              int not null default 1,
  aktif              boolean not null default true,
  urutan             int not null default 0,
  topik              text,                 -- mis. 'pecahan', 'energi', 'seri_angka' — untuk analisis per topik
  tingkat_kesulitan  text check (tingkat_kesulitan in ('mudah','sedang','sukar'))
);

-- Jawaban siswa
create table if not exists public.student_answers (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade,
  question_id uuid not null references public.question_bank(id) on delete cascade,
  jawaban     text,                   -- key opsi yang dipilih (mis. 'A' atau 'V')
  is_correct  boolean,                -- null untuk VAK
  world       int  not null,
  created_at  timestamptz not null default now(),
  unique (student_id, question_id)
);

-- Hasil final siswa
create table if not exists public.student_results (
  id                   uuid primary key default gen_random_uuid(),
  student_id           uuid not null unique references public.students(id) on delete cascade,
  skor_matematika      numeric,
  skor_ipa             numeric,
  skor_penalaran       numeric,
  kategori_matematika  text,
  kategori_ipa         text,
  kategori_penalaran   text,
  vak_v                int,
  vak_a                int,
  vak_k                int,
  gaya_belajar_dominan text,
  rekomendasi          jsonb,
  detail_topik         jsonb,           -- rincian benar/total per topik & tingkat kesulitan (utk analisis deskriptif)
  finalized_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. INDEX
-- ---------------------------------------------------------------------
create index if not exists idx_classes_teacher on public.classes(teacher_id);
create index if not exists idx_classes_kode     on public.classes(kode_kelas);
create index if not exists idx_students_class   on public.students(class_id);
create index if not exists idx_answers_student  on public.student_answers(student_id);
create index if not exists idx_qbank_modul      on public.question_bank(modul) where aktif;

-- =====================================================================
-- 3. TRIGGER: buat profil teacher otomatis saat user auth baru dibuat
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.teachers (id, email, nama)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nama', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================================
alter table public.teachers        enable row level security;
alter table public.classes         enable row level security;
alter table public.students        enable row level security;
alter table public.question_bank   enable row level security;
alter table public.student_answers enable row level security;
alter table public.student_results enable row level security;
alter table public.characters      enable row level security;

-- --- TEACHERS ---
drop policy if exists teachers_self on public.teachers;
create policy teachers_self on public.teachers
  for all using (id = auth.uid()) with check (id = auth.uid());

-- --- CLASSES (hanya guru pemilik) ---
drop policy if exists classes_owner on public.classes;
create policy classes_owner on public.classes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- --- STUDENTS (hanya guru pemilik kelasnya) ---
-- Akses siswa (anon) TIDAK lewat SELECT langsung, melainkan lewat RPC security-definer.
drop policy if exists students_owner on public.students;
create policy students_owner on public.students
  for all using (
    exists (select 1 from public.classes c
            where c.id = students.class_id and c.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.classes c
            where c.id = students.class_id and c.teacher_id = auth.uid())
  );

-- --- STUDENT_ANSWERS (hanya guru pemilik) ---
drop policy if exists answers_owner on public.student_answers;
create policy answers_owner on public.student_answers
  for select using (
    exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_answers.student_id and c.teacher_id = auth.uid()
    )
  );

-- --- STUDENT_RESULTS (hanya guru pemilik) ---
drop policy if exists results_owner on public.student_results;
create policy results_owner on public.student_results
  for select using (
    exists (
      select 1 from public.students s
      join public.classes c on c.id = s.class_id
      where s.id = student_results.student_id and c.teacher_id = auth.uid()
    )
  );

-- --- CHARACTERS (boleh dibaca semua, termasuk anon) ---
drop policy if exists characters_read on public.characters;
create policy characters_read on public.characters
  for select using (true);

-- --- QUESTION_BANK ---
-- Siswa (anon) TIDAK punya policy SELECT sama sekali — akses hanya lewat
-- RPC get_questions() yang menyaring kunci_jawaban keluar. Guru (authenticated)
-- BOLEH membaca soal secara penuh (termasuk kunci_jawaban) untuk keperluan
-- meninjau jawaban siswa per kategori di dashboard.
drop policy if exists question_bank_teacher_read on public.question_bank;
create policy question_bank_teacher_read on public.question_bank
  for select using (auth.role() = 'authenticated');

-- =====================================================================
-- 5. RPC (SECURITY DEFINER) — jembatan aman untuk siswa anon
-- =====================================================================

-- 5.1 Validasi kode kelas (kolom terbatas, hanya kelas aktif)
create or replace function public.get_class_by_code(p_code text)
returns table (id uuid, nama_kelas text, mapel text, tahun_ajaran text)
language sql security definer set search_path = public
as $$
  select c.id, c.nama_kelas, c.mapel, c.tahun_ajaran
  from public.classes c
  where upper(c.kode_kelas) = upper(p_code) and c.status = 'aktif';
$$;

-- 5.2 Registrasi / resume siswa. Mengembalikan identitas + token sesi + progress.
create or replace function public.register_student(
  p_code text, p_nama text, p_no_absen text, p_karakter_id int
)
returns table (
  student_id uuid, session_token uuid, status_sesi text, current_world int, karakter_id int
)
language plpgsql security definer set search_path = public
as $$
declare
  v_class_id uuid;
  v_student  public.students%rowtype;
begin
  select c.id into v_class_id from public.classes c
  where upper(c.kode_kelas) = upper(p_code) and c.status = 'aktif';

  if v_class_id is null then
    raise exception 'KODE_TIDAK_VALID';
  end if;

  select * into v_student from public.students s
  where s.class_id = v_class_id
    and lower(trim(s.nama)) = lower(trim(p_nama))
    and trim(s.no_absen) = trim(p_no_absen);

  if v_student.id is null then
    insert into public.students (class_id, nama, no_absen, karakter_id, status_sesi, current_world)
    values (v_class_id, trim(p_nama), trim(p_no_absen), p_karakter_id, 'berjalan', 1)
    returning * into v_student;
  end if;

  return query select v_student.id, v_student.session_token, v_student.status_sesi,
                      v_student.current_world, v_student.karakter_id;
end;
$$;

-- 5.2b Ambil progres siswa (untuk resume di perangkat lain). Butuh token.
create or replace function public.get_student_progress(p_student_id uuid, p_token uuid)
returns table (status_sesi text, current_world int, karakter_id int, nama text, no_absen text)
language sql security definer set search_path = public
as $$
  select s.status_sesi, s.current_world, s.karakter_id, s.nama, s.no_absen
  from public.students s
  where s.id = p_student_id and s.session_token = p_token;
$$;

-- 5.2c Ringkasan hasil untuk SISWA (hanya gaya belajar + semangat, tanpa skor detail)
create or replace function public.get_student_summary(p_student_id uuid, p_token uuid)
returns table (nama text, gaya_belajar_dominan text, karakter_nama text, karakter_gelar text, avatar text)
language sql security definer set search_path = public
as $$
  select s.nama, r.gaya_belajar_dominan, ch.nama, ch.gelar, ch.aset_avatar_url
  from public.students s
  left join public.student_results r on r.student_id = s.id
  left join public.characters ch on ch.id = s.karakter_id
  where s.id = p_student_id and s.session_token = p_token;
$$;

-- 5.3 Ambil soal per modul TANPA kunci jawaban (aman untuk anon)
create or replace function public.get_questions(p_modul text)
returns table (id uuid, modul text, teks_soal text, opsi jsonb, urutan int)
language sql security definer set search_path = public
as $$
  select q.id, q.modul, q.teks_soal, q.opsi, q.urutan
  from public.question_bank q
  where q.modul = p_modul and q.aktif
  order by q.urutan;
$$;

-- 5.4 Simpan batch jawaban 1 dunia (is_correct dihitung di server).
--     Butuh token sesi yang cocok agar tidak sembarang orang menimpa.
create or replace function public.save_answers(
  p_student_id uuid, p_token uuid, p_world int, p_answers jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  rec   jsonb;
  v_key text;
  v_qid uuid;
  v_ans text;
begin
  if not exists (select 1 from public.students s
                 where s.id = p_student_id and s.session_token = p_token) then
    raise exception 'TOKEN_TIDAK_VALID';
  end if;

  for rec in select * from jsonb_array_elements(p_answers)
  loop
    v_qid := (rec->>'question_id')::uuid;
    v_ans := rec->>'jawaban';
    select kunci_jawaban into v_key from public.question_bank where id = v_qid;

    insert into public.student_answers (student_id, question_id, jawaban, is_correct, world)
    values (
      p_student_id, v_qid, v_ans,
      case when v_key is null then null else (v_ans = v_key) end,
      p_world
    )
    on conflict (student_id, question_id)
    do update set jawaban = excluded.jawaban,
                  is_correct = excluded.is_correct,
                  world = excluded.world,
                  created_at = now();
  end loop;

  update public.students
     set current_world = greatest(current_world, p_world),
         status_sesi = 'berjalan',
         updated_at = now()
   where id = p_student_id;
end;
$$;

-- 5.4b Rincian benar/total per topik & per tingkat kesulitan (untuk analisis deskriptif)
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

-- 5.5 Finalisasi: hitung semua skor di server, tulis student_results, tandai selesai.
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

  -- Skor akademik = (benar / total soal modul) * 100
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

  -- VAK: hitung pilihan V/A/K
  select
    count(*) filter (where sa.jawaban = 'V'),
    count(*) filter (where sa.jawaban = 'A'),
    count(*) filter (where sa.jawaban = 'K')
  into v_v, v_a, v_k
  from public.student_answers sa
  join public.question_bank q on q.id = sa.question_id
  where sa.student_id = p_student_id and q.modul = 'vak';

  v_v := coalesce(v_v,0); v_a := coalesce(v_a,0); v_k := coalesce(v_k,0);

  -- Tentukan gaya belajar dominan / kombinasi (selisih <=1 -> kombinasi)
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
    v_dom := v_dom || '–' || function_cat;  -- kombinasi
  end if;

  -- Rekomendasi rule-based sederhana
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

-- Helper kategori skor
create or replace function public.kategori_skor(p numeric)
returns text language sql immutable as $$
  select case
    when p is null then null
    when p <= 40 then 'Perlu Pendampingan'
    when p <= 60 then 'Cukup'
    when p <= 80 then 'Baik'
    else 'Sangat Baik'
  end;
$$;

-- Beri izin eksekusi RPC ke anon (siswa) & authenticated (guru)
grant execute on function public.get_class_by_code(text) to anon, authenticated;
grant execute on function public.register_student(text,text,text,int) to anon, authenticated;
grant execute on function public.get_student_progress(uuid,uuid) to anon, authenticated;
grant execute on function public.get_student_summary(uuid,uuid) to anon, authenticated;
grant execute on function public.get_questions(text) to anon, authenticated;
grant execute on function public.save_answers(uuid,uuid,int,jsonb) to anon, authenticated;
grant execute on function public.finalize_student(uuid,uuid) to anon, authenticated;
grant execute on function public.breakdown_topik(uuid,text) to anon, authenticated;
grant execute on function public.breakdown_kesulitan(uuid,text) to anon, authenticated;

-- =====================================================================
-- 6. SEED — Karakter (RPG Classes)
-- =====================================================================
delete from public.characters;
insert into public.characters (id, nama, gelar, aset_avatar_url) values
  (1, 'Warrior',  'Ksatria Perkasa',  '⚔️'),
  (2, 'Archer',   'Pemanah Jitu',     '🏹'),
  (3, 'Mage',     'Penyihir Agung',    '🧙'),
  (4, 'Tanker',   'Tameng Pelindung', '🛡️'),
  (5, 'Assassin', 'Bayang Sunyi',      '🥷')
on conflict (id) do update set
  nama = excluded.nama,
  gelar = excluded.gelar,
  aset_avatar_url = excluded.aset_avatar_url;

-- =====================================================================
-- 7. SEED — Bank Soal (Lampiran A–D). Hapus dulu agar tidak dobel.
-- =====================================================================
delete from public.question_bank;

-- ---- Lampiran A: VAK (15) — opsi berkode V/A/K, tanpa kunci ----
insert into public.question_bank (modul, teks_soal, opsi, kunci_jawaban, urutan) values
('vak','Saat guru menjelaskan pelajaran baru, saya paling mudah paham jika:',
 '[{"key":"V","text":"melihat gambar, diagram, atau tulisan di papan"},{"key":"A","text":"mendengarkan penjelasan guru"},{"key":"K","text":"langsung mencoba atau praktik sendiri"}]', null, 1),
('vak','Ketika ingin mengingat sesuatu, saya biasanya:',
 '[{"key":"V","text":"membayangkan tulisan atau gambarnya"},{"key":"A","text":"mengucapkannya berulang-ulang"},{"key":"K","text":"menuliskannya atau bergerak sambil menghafal"}]', null, 2),
('vak','Saat waktu luang, saya lebih suka:',
 '[{"key":"V","text":"membaca buku atau menonton video"},{"key":"A","text":"mendengarkan musik atau cerita"},{"key":"K","text":"berolahraga atau membuat kerajinan tangan"}]', null, 3),
('vak','Ketika belajar cara membuat sesuatu yang baru, saya suka:',
 '[{"key":"V","text":"melihat contoh gambar/video langkah-langkahnya"},{"key":"A","text":"mendengar seseorang menjelaskan caranya"},{"key":"K","text":"langsung mencobanya sambil belajar"}]', null, 4),
('vak','Saya paling mudah berkonsentrasi ketika:',
 '[{"key":"V","text":"ruangan rapi dan ada catatan berwarna"},{"key":"A","text":"suasana tenang atau ada suara latar yang saya suka"},{"key":"K","text":"saya bisa bergerak atau memegang sesuatu"}]', null, 5),
('vak','Ketika menghafal nomor atau kode, saya:',
 '[{"key":"V","text":"membayangkan angka-angkanya"},{"key":"A","text":"menyebutkannya keras-keras"},{"key":"K","text":"mengetiknya berulang-ulang"}]', null, 6),
('vak','Saat menjelaskan sesuatu kepada teman, saya cenderung:',
 '[{"key":"V","text":"menggambar atau menunjukkan sesuatu"},{"key":"A","text":"menjelaskan dengan kata-kata"},{"key":"K","text":"memperagakannya langsung"}]', null, 7),
('vak','Saya lebih menikmati pelajaran yang:',
 '[{"key":"V","text":"banyak gambar, peta, atau diagram"},{"key":"A","text":"banyak diskusi dan penjelasan lisan"},{"key":"K","text":"banyak praktik dan percobaan"}]', null, 8),
('vak','Ketika bosan di kelas, saya biasanya:',
 '[{"key":"V","text":"menggambar atau mencoret-coret buku"},{"key":"A","text":"berbisik atau mengobrol dengan teman"},{"key":"K","text":"menggoyangkan kaki atau memainkan benda"}]', null, 9),
('vak','Saya lebih mudah mengingat:',
 '[{"key":"V","text":"wajah dan tempat"},{"key":"A","text":"nama dan suara orang"},{"key":"K","text":"kegiatan yang pernah saya lakukan"}]', null, 10),
('vak','Ketika mempelajari aturan permainan baru, saya:',
 '[{"key":"V","text":"membaca dan melihat gambarnya dulu"},{"key":"A","text":"minta seseorang membacakan aturannya"},{"key":"K","text":"langsung memainkannya sambil belajar"}]', null, 11),
('vak','Ketika sedang belajar, saya suka:',
 '[{"key":"V","text":"membuat catatan yang rapi dan berwarna"},{"key":"A","text":"membaca dengan suara keras"},{"key":"K","text":"berjalan-jalan sambil menghafal"}]', null, 12),
('vak','Saat memilih hadiah untuk diri sendiri, saya tertarik pada:',
 '[{"key":"V","text":"sesuatu yang menarik dilihat"},{"key":"A","text":"sesuatu yang menghasilkan suara (mis. alat musik)"},{"key":"K","text":"sesuatu yang bisa dimainkan atau dipegang"}]', null, 13),
('vak','Ketika mengikuti petunjuk arah ke suatu tempat, saya lebih suka:',
 '[{"key":"V","text":"melihat peta"},{"key":"A","text":"mendengar petunjuk arah secara lisan"},{"key":"K","text":"langsung pergi dan mengingat jalannya"}]', null, 14),
('vak','Ketika sedang senang, saya cenderung:',
 '[{"key":"V","text":"tersenyum dan menunjukkannya lewat ekspresi wajah"},{"key":"A","text":"berbicara banyak atau bernyanyi"},{"key":"K","text":"melompat atau bergerak aktif"}]', null, 15);

-- ---- Lampiran B: Matematika (18 asli + 4 soal SUKAR tambahan = 22) ----
insert into public.question_bank (modul, teks_soal, opsi, kunci_jawaban, topik, tingkat_kesulitan, urutan) values
('matematika','Hasil dari 24 + 18 × 2 = ...',
 '[{"key":"A","text":"84"},{"key":"B","text":"60"},{"key":"C","text":"48"},{"key":"D","text":"72"}]','B','operasi_hitung','sedang',1),
('matematika','Hasil dari 3/4 + 1/8 = ...',
 '[{"key":"A","text":"4/12"},{"key":"B","text":"7/8"},{"key":"C","text":"1/2"},{"key":"D","text":"5/8"}]','B','pecahan','sedang',2),
('matematika','Hasil dari 0,5 × 0,2 = ...',
 '[{"key":"A","text":"0,1"},{"key":"B","text":"1,0"},{"key":"C","text":"0,7"},{"key":"D","text":"0,25"}]','A','desimal','mudah',3),
('matematika','25% dari 80 adalah ...',
 '[{"key":"A","text":"20"},{"key":"B","text":"25"},{"key":"C","text":"40"},{"key":"D","text":"16"}]','A','persen','mudah',4),
('matematika','Keliling persegi dengan panjang sisi 7 cm adalah ...',
 '[{"key":"A","text":"14 cm"},{"key":"B","text":"28 cm"},{"key":"C","text":"49 cm"},{"key":"D","text":"21 cm"}]','B','geometri','mudah',5),
('matematika','Luas persegi panjang dengan panjang 8 cm dan lebar 5 cm adalah ...',
 '[{"key":"A","text":"13 cm²"},{"key":"B","text":"26 cm²"},{"key":"C","text":"40 cm²"},{"key":"D","text":"45 cm²"}]','C','geometri','sedang',6),
('matematika','Jika 3x = 21, maka nilai x = ...',
 '[{"key":"A","text":"6"},{"key":"B","text":"7"},{"key":"C","text":"18"},{"key":"D","text":"24"}]','B','aljabar','sedang',7),
('matematika','Bilangan terkecil dari 0,45 ; 0,5 ; 0,405 ; 0,54 adalah ...',
 '[{"key":"A","text":"0,45"},{"key":"B","text":"0,5"},{"key":"C","text":"0,405"},{"key":"D","text":"0,54"}]','C','desimal','mudah',8),
('matematika','Rata-rata dari bilangan 6, 8, 10, dan 12 adalah ...',
 '[{"key":"A","text":"8"},{"key":"B","text":"9"},{"key":"C","text":"10"},{"key":"D","text":"12"}]','B','statistika','sedang',9),
('matematika','Sebuah baju seharga Rp50.000 mendapat diskon 20%. Harga setelah diskon adalah ...',
 '[{"key":"A","text":"Rp30.000"},{"key":"B","text":"Rp40.000"},{"key":"C","text":"Rp45.000"},{"key":"D","text":"Rp10.000"}]','B','soal_cerita','sedang',10),
('matematika','FPB dari 12 dan 18 adalah ...',
 '[{"key":"A","text":"3"},{"key":"B","text":"6"},{"key":"C","text":"9"},{"key":"D","text":"36"}]','B','kpk_fpb','mudah',11),
('matematika','KPK dari 4 dan 6 adalah ...',
 '[{"key":"A","text":"12"},{"key":"B","text":"24"},{"key":"C","text":"2"},{"key":"D","text":"10"}]','A','kpk_fpb','mudah',12),
('matematika','Hasil dari (-5) + 8 = ...',
 '[{"key":"A","text":"-3"},{"key":"B","text":"3"},{"key":"C","text":"13"},{"key":"D","text":"-13"}]','B','bilangan_bulat','mudah',13),
('matematika','Hasil dari 144 : 12 = ...',
 '[{"key":"A","text":"11"},{"key":"B","text":"12"},{"key":"C","text":"13"},{"key":"D","text":"14"}]','B','operasi_hitung','mudah',14),
('matematika','Perhatikan pola: 2, 4, 8, 16, ... Bilangan berikutnya adalah ...',
 '[{"key":"A","text":"20"},{"key":"B","text":"24"},{"key":"C","text":"32"},{"key":"D","text":"18"}]','C','pola','sedang',15),
('matematika','Hasil dari 7² adalah ...',
 '[{"key":"A","text":"14"},{"key":"B","text":"49"},{"key":"C","text":"21"},{"key":"D","text":"64"}]','B','operasi_hitung','mudah',16),
('matematika','Harga 1 pensil Rp2.500. Harga 6 pensil adalah ...',
 '[{"key":"A","text":"Rp12.500"},{"key":"B","text":"Rp15.000"},{"key":"C","text":"Rp13.000"},{"key":"D","text":"Rp16.500"}]','B','soal_cerita','mudah',17),
('matematika','Pecahan 3/5 sama dengan ...',
 '[{"key":"A","text":"35%"},{"key":"B","text":"53%"},{"key":"C","text":"60%"},{"key":"D","text":"30%"}]','C','persen','sedang',18),
('matematika','Sebuah toko memberi diskon 20% untuk baju seharga Rp120.000, lalu ada potongan tambahan Rp10.000 untuk pembayaran tunai. Harga akhir yang harus dibayar adalah ...',
 '[{"key":"A","text":"Rp86.000"},{"key":"B","text":"Rp96.000"},{"key":"C","text":"Rp88.000"},{"key":"D","text":"Rp76.000"}]','A','soal_cerita','sukar',19),
('matematika','Ibu membeli 2 3/4 kg gula, lalu memakai 1 1/2 kg untuk membuat kue. Sisa gula ibu adalah ... kg',
 '[{"key":"A","text":"1 1/4"},{"key":"B","text":"1 1/2"},{"key":"C","text":"1 3/4"},{"key":"D","text":"2 1/4"}]','A','pecahan','sukar',20),
('matematika','Sebuah taman berbentuk persegi panjang berukuran 12 m × 8 m. Di tengah taman dibuat kolam berbentuk persegi dengan sisi 4 m. Luas taman yang tidak tertutup kolam adalah ...',
 '[{"key":"A","text":"80 m²"},{"key":"B","text":"96 m²"},{"key":"C","text":"76 m²"},{"key":"D","text":"84 m²"}]','A','geometri','sukar',21),
('matematika','Jika 2x + 5 = 17, maka nilai dari 3x − 4 adalah ...',
 '[{"key":"A","text":"14"},{"key":"B","text":"18"},{"key":"C","text":"22"},{"key":"D","text":"8"}]','A','aljabar','sukar',22);

-- ---- Lampiran C: IPA (18 asli + 4 soal SUKAR tambahan = 22) ----
insert into public.question_bank (modul, teks_soal, opsi, kunci_jawaban, topik, tingkat_kesulitan, urutan) values
('ipa','Bagian tumbuhan yang berfungsi menyerap air dan mineral dari tanah adalah ...',
 '[{"key":"A","text":"Daun"},{"key":"B","text":"Akar"},{"key":"C","text":"Batang"},{"key":"D","text":"Bunga"}]','B','makhluk_hidup','mudah',1),
('ipa','Proses tumbuhan membuat makanan dengan bantuan cahaya matahari disebut ...',
 '[{"key":"A","text":"Respirasi"},{"key":"B","text":"Fotosintesis"},{"key":"C","text":"Transpirasi"},{"key":"D","text":"Penguapan"}]','B','makhluk_hidup','sedang',2),
('ipa','Alat pernapasan pada ikan adalah ...',
 '[{"key":"A","text":"Paru-paru"},{"key":"B","text":"Insang"},{"key":"C","text":"Kulit"},{"key":"D","text":"Trakea"}]','B','makhluk_hidup','mudah',3),
('ipa','Perubahan wujud benda dari padat menjadi cair disebut ...',
 '[{"key":"A","text":"Menguap"},{"key":"B","text":"Membeku"},{"key":"C","text":"Mencair"},{"key":"D","text":"Menyublim"}]','C','materi_perubahan','mudah',4),
('ipa','Sumber energi utama bagi kehidupan di bumi adalah ...',
 '[{"key":"A","text":"Bulan"},{"key":"B","text":"Matahari"},{"key":"C","text":"Bintang"},{"key":"D","text":"Angin"}]','B','energi','mudah',5),
('ipa','Organ tubuh manusia yang berfungsi memompa darah adalah ...',
 '[{"key":"A","text":"Paru-paru"},{"key":"B","text":"Jantung"},{"key":"C","text":"Hati"},{"key":"D","text":"Ginjal"}]','B','tubuh_manusia','mudah',6),
('ipa','Pada tekanan normal, air mendidih pada suhu ...',
 '[{"key":"A","text":"0°C"},{"key":"B","text":"50°C"},{"key":"C","text":"100°C"},{"key":"D","text":"37°C"}]','C','materi_perubahan','sedang',7),
('ipa','Hewan yang berkembang biak dengan cara bertelur disebut ...',
 '[{"key":"A","text":"Vivipar"},{"key":"B","text":"Ovipar"},{"key":"C","text":"Ovovivipar"},{"key":"D","text":"Metamorfosis"}]','B','makhluk_hidup','mudah',8),
('ipa','Planet tempat kita tinggal adalah ...',
 '[{"key":"A","text":"Mars"},{"key":"B","text":"Bumi"},{"key":"C","text":"Venus"},{"key":"D","text":"Jupiter"}]','B','bumi_antariksa','mudah',9),
('ipa','Benda yang dapat ditarik oleh magnet umumnya terbuat dari ...',
 '[{"key":"A","text":"Kayu"},{"key":"B","text":"Plastik"},{"key":"C","text":"Besi"},{"key":"D","text":"Kaca"}]','C','materi_perubahan','mudah',10),
('ipa','Gas yang diperlukan manusia saat bernapas adalah ...',
 '[{"key":"A","text":"Karbon dioksida"},{"key":"B","text":"Oksigen"},{"key":"C","text":"Nitrogen"},{"key":"D","text":"Hidrogen"}]','B','tubuh_manusia','mudah',11),
('ipa','Urutan daur hidup kupu-kupu yang benar adalah ...',
 '[{"key":"A","text":"Telur → kepompong → ulat → kupu-kupu"},{"key":"B","text":"Telur → ulat → kepompong → kupu-kupu"},{"key":"C","text":"Ulat → telur → kepompong → kupu-kupu"},{"key":"D","text":"Kepompong → ulat → telur → kupu-kupu"}]','B','makhluk_hidup','sedang',12),
('ipa','Bunyi dapat merambat melalui zat berikut, kecuali ...',
 '[{"key":"A","text":"Udara"},{"key":"B","text":"Air"},{"key":"C","text":"Benda padat"},{"key":"D","text":"Ruang hampa"}]','D','materi_perubahan','sedang',13),
('ipa','Bagian bunga yang merupakan alat kelamin betina adalah ...',
 '[{"key":"A","text":"Benang sari"},{"key":"B","text":"Putik"},{"key":"C","text":"Mahkota"},{"key":"D","text":"Kelopak"}]','B','makhluk_hidup','sedang',14),
('ipa','Perpindahan panas melalui zat perantara tanpa disertai perpindahan zatnya disebut ...',
 '[{"key":"A","text":"Konduksi"},{"key":"B","text":"Konveksi"},{"key":"C","text":"Radiasi"},{"key":"D","text":"Isolasi"}]','A','energi','sedang',15),
('ipa','Contoh sumber energi yang dapat diperbarui adalah ...',
 '[{"key":"A","text":"Batu bara"},{"key":"B","text":"Minyak bumi"},{"key":"C","text":"Sinar matahari"},{"key":"D","text":"Gas alam"}]','C','energi','sedang',16),
('ipa','Berikut adalah fungsi rangka manusia, kecuali ...',
 '[{"key":"A","text":"Menegakkan tubuh"},{"key":"B","text":"Melindungi organ dalam"},{"key":"C","text":"Tempat melekatnya otot"},{"key":"D","text":"Mencerna makanan"}]','D','tubuh_manusia','sedang',17),
('ipa','Peristiwa pergantian siang dan malam disebabkan oleh ...',
 '[{"key":"A","text":"Revolusi bumi"},{"key":"B","text":"Rotasi bumi"},{"key":"C","text":"Gerhana"},{"key":"D","text":"Rotasi bulan"}]','B','bumi_antariksa','mudah',18),
('ipa','Ketika sebuah senter yang menggunakan baterai dinyalakan, urutan perubahan bentuk energi yang benar hingga lampu menyala adalah ...',
 '[{"key":"A","text":"Kimia → Listrik → Cahaya"},{"key":"B","text":"Listrik → Kimia → Cahaya"},{"key":"C","text":"Cahaya → Kimia → Listrik"},{"key":"D","text":"Kimia → Cahaya → Listrik"}]','A','energi','sukar',19),
('ipa','Es batu dimasukkan ke dalam gelas berisi air hangat. Es batu tersebut mengalami perubahan wujud dari padat menjadi cair karena peristiwa ...',
 '[{"key":"A","text":"Mencair karena menyerap panas"},{"key":"B","text":"Membeku karena melepas panas"},{"key":"C","text":"Menyublim karena tekanan rendah"},{"key":"D","text":"Mengembun karena suhu turun"}]','A','materi_perubahan','sukar',20),
('ipa','Ketika kita menarik napas, otot diafragma akan berkontraksi dan mendatar, menyebabkan rongga dada membesar sehingga udara ...',
 '[{"key":"A","text":"Masuk ke paru-paru"},{"key":"B","text":"Keluar dari paru-paru"},{"key":"C","text":"Tertahan di tenggorokan"},{"key":"D","text":"Berpindah ke lambung"}]','A','tubuh_manusia','sukar',21),
('ipa','Gerhana matahari total dapat terjadi ketika ...',
 '[{"key":"A","text":"Bulan berada tepat di antara Matahari dan Bumi, menutupi Matahari sepenuhnya"},{"key":"B","text":"Bumi berada tepat di antara Matahari dan Bulan"},{"key":"C","text":"Bulan berada di titik terjauh dari Bumi saat sejajar"},{"key":"D","text":"Matahari, Bumi, dan Bulan membentuk sudut 90°"}]','A','bumi_antariksa','sukar',22);

-- ---- Lampiran D: Penalaran (18 asli + 4 soal SUKAR tambahan = 22) ----
insert into public.question_bank (modul, teks_soal, opsi, kunci_jawaban, topik, tingkat_kesulitan, urutan) values
('penalaran','Lanjutkan seri berikut: 3, 6, 9, 12, ...',
 '[{"key":"A","text":"14"},{"key":"B","text":"15"},{"key":"C","text":"16"},{"key":"D","text":"18"}]','B','seri_angka','mudah',1),
('penalaran','Lanjutkan seri berikut: 1, 4, 9, 16, ...',
 '[{"key":"A","text":"20"},{"key":"B","text":"24"},{"key":"C","text":"25"},{"key":"D","text":"36"}]','C','seri_angka','sedang',2),
('penalaran','Panas : Dingin = Tinggi : ...',
 '[{"key":"A","text":"Besar"},{"key":"B","text":"Rendah"},{"key":"C","text":"Panjang"},{"key":"D","text":"Gunung"}]','B','analogi','mudah',3),
('penalaran','Guru : Sekolah = Dokter : ...',
 '[{"key":"A","text":"Pasien"},{"key":"B","text":"Rumah sakit"},{"key":"C","text":"Obat"},{"key":"D","text":"Perawat"}]','B','analogi','mudah',4),
('penalaran','Lanjutkan seri berikut: 2, 6, 12, 20, ...',
 '[{"key":"A","text":"28"},{"key":"B","text":"30"},{"key":"C","text":"26"},{"key":"D","text":"32"}]','B','seri_angka','sedang',5),
('penalaran','Semua kucing adalah hewan. Mimi adalah kucing. Maka Mimi adalah ...',
 '[{"key":"A","text":"Anjing"},{"key":"B","text":"Hewan"},{"key":"C","text":"Tumbuhan"},{"key":"D","text":"Ikan"}]','B','deduktif','mudah',6),
('penalaran','Lanjutkan pola huruf: A, C, E, G, ...',
 '[{"key":"A","text":"H"},{"key":"B","text":"I"},{"key":"C","text":"J"},{"key":"D","text":"K"}]','B','pola_huruf','mudah',7),
('penalaran','Manakah yang berbeda dari yang lain?',
 '[{"key":"A","text":"Apel"},{"key":"B","text":"Jeruk"},{"key":"C","text":"Wortel"},{"key":"D","text":"Mangga"}]','C','klasifikasi','mudah',8),
('penalaran','Lanjutkan seri berikut: 100, 50, 25, ...',
 '[{"key":"A","text":"12,5"},{"key":"B","text":"20"},{"key":"C","text":"15"},{"key":"D","text":"10"}]','A','seri_angka','sedang',9),
('penalaran','Buku : Membaca = Pena : ...',
 '[{"key":"A","text":"Kertas"},{"key":"B","text":"Menulis"},{"key":"C","text":"Tinta"},{"key":"D","text":"Meja"}]','B','analogi','mudah',10),
('penalaran','Jika hari ini hari Selasa, maka 3 hari lagi adalah hari ...',
 '[{"key":"A","text":"Kamis"},{"key":"B","text":"Jumat"},{"key":"C","text":"Sabtu"},{"key":"D","text":"Rabu"}]','B','deduktif','mudah',11),
('penalaran','Perhatikan pola jumlah bintang tiap baris: 1, 2, 3, ... Jumlah bintang pada baris berikutnya adalah ...',
 '[{"key":"A","text":"3"},{"key":"B","text":"4"},{"key":"C","text":"5"},{"key":"D","text":"6"}]','B','pola','sedang',12),
('penalaran','Manakah bilangan yang berbeda pola dari: 2, 4, 6, 7, 8?',
 '[{"key":"A","text":"4"},{"key":"B","text":"6"},{"key":"C","text":"7"},{"key":"D","text":"8"}]','C','klasifikasi','sedang',13),
('penalaran','Ayah lebih tua dari Kakak. Kakak lebih tua dari Adik. Siapa yang paling muda?',
 '[{"key":"A","text":"Ayah"},{"key":"B","text":"Kakak"},{"key":"C","text":"Adik"},{"key":"D","text":"Sama semua"}]','C','deduktif','mudah',14),
('penalaran','Lanjutkan seri berikut: 5, 10, 20, 40, ...',
 '[{"key":"A","text":"60"},{"key":"B","text":"70"},{"key":"C","text":"80"},{"key":"D","text":"50"}]','C','seri_angka','sedang',15),
('penalaran','Ban : Mobil = Layar : ...',
 '[{"key":"A","text":"Angin"},{"key":"B","text":"Perahu"},{"key":"C","text":"Laut"},{"key":"D","text":"Nelayan"}]','B','analogi','sedang',16),
('penalaran','Lanjutkan pola huruf: Z, Y, X, W, ...',
 '[{"key":"A","text":"U"},{"key":"B","text":"V"},{"key":"C","text":"T"},{"key":"D","text":"S"}]','B','pola_huruf','mudah',17),
('penalaran','Sebuah kotak berisi 3 bola merah dan 2 bola biru. Bola warna apa yang lebih banyak?',
 '[{"key":"A","text":"Merah"},{"key":"B","text":"Biru"},{"key":"C","text":"Sama banyak"},{"key":"D","text":"Tidak ada"}]','A','klasifikasi','mudah',18),
('penalaran','Lanjutkan seri berikut: 1, 1, 2, 3, 5, 8, ...',
 '[{"key":"A","text":"11"},{"key":"B","text":"12"},{"key":"C","text":"13"},{"key":"D","text":"14"}]','C','seri_angka','sukar',19),
('penalaran','Semua siswa kelas 7A mengikuti ekskursi. Sebagian siswa kelas 7A adalah anggota klub sains. Andi adalah anggota klub sains kelas 7A. Manakah pernyataan yang PASTI benar tentang Andi?',
 '[{"key":"A","text":"Andi mengikuti ekskursi"},{"key":"B","text":"Andi bukan anggota klub sains"},{"key":"C","text":"Andi tidak mengikuti ekskursi"},{"key":"D","text":"Andi adalah ketua klub sains"}]','A','deduktif','sukar',20),
('penalaran','Termometer : Suhu = Barometer : ...',
 '[{"key":"A","text":"Cuaca"},{"key":"B","text":"Tekanan udara"},{"key":"C","text":"Angin"},{"key":"D","text":"Hujan"}]','B','analogi','sukar',21),
('penalaran','Perhatikan pola berikut: 3, 7, 15, 31, ... Lanjutkan pola tersebut.',
 '[{"key":"A","text":"47"},{"key":"B","text":"60"},{"key":"C","text":"63"},{"key":"D","text":"62"}]','C','seri_angka','sukar',22);

-- =====================================================================
--  SELESAI. Total: 15 VAK + 22 MTK + 22 IPA + 22 Penalaran = 81 soal.
--  Setiap modul akademik memiliki sebaran tingkat kesulitan
--  (mudah/sedang/sukar) dan tag topik untuk analisis diagnostik.
-- =====================================================================
