# PRD.md — CEdPreneur

## Purpose
CEdPreneur ("Creative Edupreneur Ecosystem") connects **campus, students, and UMKM (small/micro business) partners** around a practical entrepreneurship course. Lecturers design projects, students execute them in groups for a real UMKM partner, and the UMKM partner gives mentoring/feedback — with an Admin overseeing the whole academic/operational setup. Tagline: *Create · Collaborate · Commercialize.*

## Roles

### Admin
Owns the academic/operational setup: manages user accounts (all roles), master data (mata kuliah, kelas, UMKM), the relations between classes/lecturers/UMKM/projects, and monitors overall progress and reporting. Not shown on the public role-picker login screen, but the routes exist and are reachable directly.

### Dosen (lecturer)
Designs practical-entrepreneurship projects tied to a class, assigns/oversees student groups, and mentors them — giving feedback and reviewing progress.

### Mahasiswa (student)
Executes the assigned project as part of a group: tracks project progress, uploads deliverables/progress updates, and can view their assigned UMKM mitra's profile.

### Mitra UMKM (business partner)
The real business the student group is working with. Reviews student progress and gives mentoring/feedback; manages their own business profile.

## MVP feature scope per role

- **Admin**: dashboard, pengguna (user CRUD-style pages), data master (mata kuliah/kelas/UMKM), relasi kelas, monitoring, rekap data.
- **Dosen**: dashboard, project (list, create, create kelompok, kelompok detail), mentoring & feedback (list + detail per kelompok).
- **Mahasiswa**: dashboard (task/feedback summary, project detail, track-of-project timeline, notes), project (progress, upload), profile mitra (read-only view of the assigned UMKM).
- **Mitra UMKM**: dashboard, mentoring & feedback (list + detail per kelompok), profile usaha (view + edit).

## Mahasiswa flow (primary user journey)
```
Login (/login/mahasiswa)
  → Dashboard (/mahasiswa/dashboard) — task/feedback summary, track of project, notes
  → Project (/mahasiswa/project) — progress tracking, upload deliverables
  → Profile Mitra (/mahasiswa/profile-mitra) — view assigned UMKM partner
```

## Current implementation state
- **Backend is real and live: Supabase (Postgres + Auth + Storage + Edge Functions).** Every screen in the MVP scope above reads/writes the real database through Row Level Security (RLS) policies scoped per role — no dummy data drives any page anymore.
- Login is real Supabase Auth per role: Admin/UMKM sign in by email, Dosen by NIP, Mahasiswa by NIM (NIP/NIM are resolved to a login email via two `SECURITY DEFINER` RPCs — `get_login_email_by_nip`/`get_login_email_by_nim` — since that lookup runs before a session exists and table RLS alone can't allow it pre-auth).
- Admin-only mutations (create/update/delete/reset-password/change-role) go through Supabase Edge Functions (`supabase/functions/*`) that re-verify the caller is actually an admin server-side — `verify_jwt: true` alone does not do this.
- `data/*.ts` (except `data/users.ts`) and most of the original `lib/*Storage.ts`/`useDosen*`/`useUmkm*` dummy hooks from the pre-migration build are now dead code, superseded by real `lib/use*.ts` Supabase-backed hooks (`useAdminUsers`, `useAdminMonitoring`, `useAdminMasterData`, `useDosenKelompokBimbingan`, `useMahasiswaKelompok`, `useUmkmKelompok`, etc.). `data/users.ts`'s `CURRENT_USER` is the one deliberate exception — `lib/auth.ts#getCurrentUser` still uses it as an SSR-safe placeholder for `RoleLayout`'s initial render, before the real account name loads client-side.
- Concepts referenced in earlier/dummy-era docs but that don't exist in the real schema (milestones, revision numbers, ketuntasan pass/fail badges, per-user "kelas roster" pre-assignment) have been intentionally dropped in favor of what the real tables actually model — see `SCHEMA.md`.
- High-fidelity visual design is being brought in screen-by-screen from Figma (see `DESIGN.md`), replacing earlier rough/manual layouts.
