# SCHEMA.md — CEdPreneur

> **Status: implemented.** This schema is live in the real Supabase project — every entity below exists as a real table with RLS policies scoped per role. This file is a rough mental map, not the source of truth: schemas drift (columns get added, e.g. `dosen.jabatan`/`mata_kuliah_diampu`, `umkm.kontak`, `project.file_url`/`status`, `laporan_progress.file_url`/`tanggal_submit`, `feedback.jenis_feedback`). **Before writing a migration or a query that depends on exact column names, confirm against the live database** (`list_tables`, `execute_sql`) rather than trusting this list verbatim.
>
> Some concepts from the original dummy/frontend build were deliberately **not** carried into the real schema — there is no milestone table, no revision-number column, no ketuntasan pass/fail column, and no student-roster-ahead-of-kelompok table. Pages that used to model those in dummy data now either derive the equivalent from real rows (e.g. a laporan's own `status`) or dropped the concept entirely — see `PRD.md`'s "Current implementation state" for the fuller list.

## Planned entities

- **profiles** — one row per authenticated user; holds role (`admin` / `dosen` / `mahasiswa` / `umkm`) and links out to the role-specific detail table.
- **dosen** — lecturer-specific profile fields (NIP, prodi, etc.), linked to `profiles`.
- **mahasiswa** — student-specific profile fields (NIM, prodi, etc.), linked to `profiles`.
- **umkm** — business partner profile (nama usaha, pemilik, kategori, alamat, kontak, deskripsi, logo).
- **mata_kuliah** — course catalog entry (kode, nama, sks, semester).
- **kelas** — a class instance of a `mata_kuliah`, taught by a `dosen`, for a given tahun ajaran.
- **kelas_umkm** — join table linking a `kelas` to the UMKM partner(s) it works with.
- **project** — a practical-entrepreneurship project brief tied to a `kelas` and a `umkm`, owned/designed by a `dosen`.
- **kelompok** — a student group working on a `project`.
- **kelompok_anggota** — join table linking `mahasiswa` to a `kelompok` (with a ketua/leader flag).
- **laporan_progress** — weekly/periodic progress entries submitted by a `kelompok` against a `project` (status, description, attachments).
- **feedback** — mentoring feedback entries from either `dosen` or `umkm` directed at a `kelompok`.
- **activity_log** — audit trail of significant actions across the platform (who did what, when).

## Notes
- Real RLS is in place and mirrors the role checks the UI expects (e.g. a dosen only manages their own kelas'/projects' rows, a mahasiswa only sees their own kelompok) — enforced at the database level, not just hidden in the frontend.
- A few tables need `SECURITY DEFINER` RPCs instead of a plain RLS SELECT policy for cases where RLS alone can't work: pre-login NIP/NIM → email lookup (`get_login_email_by_nip`/`get_login_email_by_nim`, callable by `anon`) and atomic role changes (`admin_change_user_role`, admin-only, revoked from `anon`/`authenticated`).
- Watch for a recursive-RLS trap on `INSERT ... RETURNING`: if a table's SELECT policy determines visibility via a function that itself queries that same table, an insert immediately followed by PostgREST's implicit `RETURNING` can fail with `42501` even though `WITH CHECK` passes. Fix is a non-recursive SELECT policy scoped by a direct foreign key instead of the recursive helper function. Hit this on both `kelompok` and `project` — check for it before assuming a similar table's insert-then-select-back pattern will "just work."
- This schema is unrelated to, and must not be confused with, any other project's database schema.
