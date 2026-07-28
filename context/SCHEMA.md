# SCHEMA.md — CEdPreneur

> **Status: planning documentation only.** None of this is implemented. There is no database, no migrations, and no Supabase project wired up yet. This file exists so that when backend work eventually starts, there's a shared mental model of the intended data shape — it is not a spec to execute against today.
>
> Do **not** write SQL, migrations, or any Supabase schema from this file unless a task explicitly asks for backend/database implementation work.

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

## Notes for future implementation
- This list mirrors the shape already reflected in the current dummy fixtures under `data/` (`users`, `akademik`, `umkm`, `projects` → projects/groups/progress/feedback) — implementation should reconcile field names with those fixtures rather than inventing a parallel shape.
- Role-based access (RLS-equivalent) will need to mirror the branch/role checks already implicit in the UI (e.g. a dosen only manages their own kelas' projects, a mahasiswa only sees their own kelompok).
- This schema is unrelated to, and must not be confused with, any other project's database schema.
