-- =============================================================================
-- CEdPreneur — Dev/test seed data
-- =============================================================================
-- Purpose: populate the minimum end-to-end dataset needed to exercise every
-- migrated Dosen module (Dashboard, Project, Kelompok Bimbingan, Mentoring)
-- against Supabase, without any manual row-by-row insertion.
--
-- Run this once, in the Supabase SQL Editor (or `psql`) against your project.
-- It only INSERTs — no table structure is created or altered.
--
-- Login credentials created by this seed (password is the same for all):
--   Dosen    NIP  198500000001         password: Seed12345!
--   Mahasiswa NIM 2400000001..2400000005  password: Seed12345!
--   UMKM     email umkm.seed@cle.local password: Seed12345!
--
-- Notes:
-- * auth.users / auth.identities columns follow the standard Supabase GoTrue
--   schema. If your project's auth schema differs (check with `\d auth.users`
--   in the SQL editor), adjust the column list accordingly before running.
-- * pgcrypto (crypt/gen_salt) is enabled by default on Supabase projects,
--   installed into the `extensions` schema — referenced explicitly below so
--   this works regardless of search_path.
-- * This script is NOT idempotent — re-running it will fail on duplicate
--   emails / primary keys. Intended for a single run against a fresh project.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------
-- Fixed ids used throughout this script (so every FK below is guaranteed
-- valid without relying on RETURNING/psql variables).
-- -----------------------------------------------------------------------
-- Dosen
--   profile id: a0000000-0000-0000-0000-000000000001
--   dosen.id:   a0000000-0000-0000-0000-000000000002
-- Mahasiswa 1..5
--   profile ids: b0000000-0000-0000-0000-00000000000{1..5}
--   mahasiswa.id: b1000000-0000-0000-0000-00000000000{1..5}
-- UMKM
--   profile id: c0000000-0000-0000-0000-000000000001
--   umkm.id:    c1000000-0000-0000-0000-000000000001
-- Mata kuliah: d0000000-0000-0000-0000-000000000001
-- Kelas:       d1000000-0000-0000-0000-000000000001
-- Kelas_umkm:  d2000000-0000-0000-0000-000000000001
-- Project:     e0000000-0000-0000-0000-000000000001
-- Kelompok 1/2: f0000000-0000-0000-0000-00000000000{1,2}
-- Laporan_progress 1..4: aa000000-0000-0000-0000-00000000000{1..4}

-- =============================================================================
-- 1. auth.users + auth.identities — dosen, 5 mahasiswa, 1 umkm
-- =============================================================================

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, recovery_sent_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   '198500000001@cle.local', extensions.crypt('Seed12345!', extensions.gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   '2400000001@student.cle.local', extensions.crypt('Seed12345!', extensions.gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated',
   '2400000002@student.cle.local', extensions.crypt('Seed12345!', extensions.gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated',
   '2400000003@student.cle.local', extensions.crypt('Seed12345!', extensions.gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated',
   '2400000004@student.cle.local', extensions.crypt('Seed12345!', extensions.gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated',
   '2400000005@student.cle.local', extensions.crypt('Seed12345!', extensions.gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
   'umkm.seed@cle.local', extensions.crypt('Seed12345!', extensions.gen_salt('bf')),
   now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  (gen_random_uuid(), 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'email', '198500000001@cle.local'),
   'email', now(), now(), now()),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000001', 'email', '2400000001@student.cle.local'),
   'email', now(), now(), now()),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000002', 'email', '2400000002@student.cle.local'),
   'email', now(), now(), now()),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
   jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000003', 'email', '2400000003@student.cle.local'),
   'email', now(), now(), now()),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004',
   jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000004', 'email', '2400000004@student.cle.local'),
   'email', now(), now(), now()),
  (gen_random_uuid(), 'b0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005',
   jsonb_build_object('sub', 'b0000000-0000-0000-0000-000000000005', 'email', '2400000005@student.cle.local'),
   'email', now(), now(), now()),
  (gen_random_uuid(), 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   jsonb_build_object('sub', 'c0000000-0000-0000-0000-000000000001', 'email', 'umkm.seed@cle.local'),
   'email', now(), now(), now());

-- =============================================================================
-- 2. profiles — one row per auth user above
-- =============================================================================

insert into public.profiles (id, nama_lengkap, email, role, is_active, created_by) values
  ('a0000000-0000-0000-0000-000000000001', 'Dr. Budi Seed', '198500000001@cle.local', 'dosen', true, null),
  ('b0000000-0000-0000-0000-000000000001', 'Ayu Seed', '2400000001@student.cle.local', 'mahasiswa', true, null),
  ('b0000000-0000-0000-0000-000000000002', 'Bima Seed', '2400000002@student.cle.local', 'mahasiswa', true, null),
  ('b0000000-0000-0000-0000-000000000003', 'Citra Seed', '2400000003@student.cle.local', 'mahasiswa', true, null),
  ('b0000000-0000-0000-0000-000000000004', 'Dedi Seed', '2400000004@student.cle.local', 'mahasiswa', true, null),
  ('b0000000-0000-0000-0000-000000000005', 'Eka Seed', '2400000005@student.cle.local', 'mahasiswa', true, null),
  ('c0000000-0000-0000-0000-000000000001', 'Kopi Seed Nusantara', 'umkm.seed@cle.local', 'umkm', true, null);

-- =============================================================================
-- 3. dosen
-- =============================================================================

insert into public.dosen (id, profile_id, nip, fakultas) values
  ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   '198500000001', 'Teknologi Rekayasa Multimedia');

-- =============================================================================
-- 4. mahasiswa (5, dua program studi berbeda agar breakdown Program Studi
--    di Dashboard Dosen punya lebih dari satu baris)
-- =============================================================================

insert into public.mahasiswa (id, profile_id, nim, prodi, angkatan) values
  ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   '2400000001', 'Teknologi Rekayasa Multimedia', 2024),
  ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   '2400000002', 'Teknologi Rekayasa Multimedia', 2024),
  ('b1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
   '2400000003', 'Desain Grafis', 2024),
  ('b1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004',
   '2400000004', 'Desain Grafis', 2024),
  ('b1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000005',
   '2400000005', 'Teknologi Rekayasa Multimedia', 2024);

-- =============================================================================
-- 5. umkm
-- =============================================================================

insert into public.umkm (id, profile_id, nama_usaha, sektor_usaha, alamat, deskripsi_usaha) values
  ('c1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'Kopi Seed Nusantara', 'Food and Beverage', 'Jl. Contoh No. 1, Jakarta Selatan',
   'UMKM contoh untuk keperluan seed/testing end-to-end.');

-- =============================================================================
-- 6. mata_kuliah (dibutuhkan sebagai FK kelas)
-- =============================================================================

insert into public.mata_kuliah (id, kode_mk, nama_mk, sks) values
  ('d0000000-0000-0000-0000-000000000001', 'PMW101', 'Praktik Kewirausahaan', 3);

-- =============================================================================
-- 7. kelas — milik dosen seed di atas
-- =============================================================================

insert into public.kelas (id, dosen_id, mata_kuliah_id, nama_kelas, semester, tahun_ajaran) values
  ('d1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
   'd0000000-0000-0000-0000-000000000001', 'RJ24Seed', 'Ganjil', '2026/2027');

-- =============================================================================
-- 8. kelas_umkm — relasi kelas <-> UMKM
-- =============================================================================

insert into public.kelas_umkm (id, kelas_id, umkm_id) values
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001');

-- =============================================================================
-- 9. project — dibuat oleh dosen seed, terhubung ke kelas + UMKM di atas
-- =============================================================================

insert into public.project (id, kelas_id, umkm_id, created_by, judul_project, deskripsi, deadline, status) values
  ('e0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002',
   'Digitalisasi Kopi Seed Nusantara',
   'Project contoh untuk pengujian end-to-end modul Dosen (Dashboard, Project, Kelompok, Mentoring).',
   (current_date + interval '60 days')::date, 'berjalan');

-- =============================================================================
-- 10. kelompok (2) — di bawah project di atas
-- =============================================================================

insert into public.kelompok (id, project_id, nama_kelompok, status) values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
   'Kelompok Seed 1', 'aktif'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001',
   'Kelompok Seed 2', 'selesai');

-- =============================================================================
-- 11. kelompok_anggota — 5 mahasiswa dibagi ke 2 kelompok (3 + 2)
-- =============================================================================

insert into public.kelompok_anggota (kelompok_id, mahasiswa_id) values
  ('f0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002'),
  ('f0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003'),
  ('f0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000004'),
  ('f0000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005');

-- =============================================================================
-- 12. laporan_progress — beberapa laporan per kelompok, status bervariasi
--     (draft/submitted/reviewed) agar semua badge status bisa diuji.
-- =============================================================================

insert into public.laporan_progress (
  id, kelompok_id, judul_laporan, isi_laporan, persentase_progress, status, tanggal_submit
) values
  ('aa000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001',
   'Laporan Profil UMKM & Observasi Lapangan', 'Hasil observasi awal ke UMKM mitra.', 25, 'reviewed',
   now() - interval '10 days'),
  ('aa000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001',
   'Laporan Business Model Canvas', 'Draft BMC untuk UMKM mitra.', 55, 'submitted',
   now() - interval '2 days'),
  ('aa000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002',
   'Laporan Profil UMKM & Observasi Lapangan', 'Observasi lapangan kelompok 2.', 40, 'submitted',
   now() - interval '5 days'),
  ('aa000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002',
   'Laporan Brand Guideline', 'Draft awal brand guideline.', 15, 'draft',
   now() - interval '1 days');

-- =============================================================================
-- 13. feedback — beberapa feedback dari dosen dan UMKM atas laporan di atas
-- =============================================================================

insert into public.feedback (laporan_id, pemberi_id, pemberi_role, jenis_feedback, isi_feedback) values
  ('aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'dosen',
   'catatan_dosen', 'Bagus, lanjutkan ke tahap berikutnya.'),
  ('aa000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'umkm',
   'validasi_umkm', 'Profil usaha sudah sesuai kondisi sebenarnya.'),
  ('aa000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'dosen',
   'catatan_dosen', 'Perbaiki bagian analisis kompetitor sebelum lanjut.');

commit;
