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
- Frontend only. All screens render against **dummy/fixture data** in `data/` — no live database.
- **Backend/Supabase is not integrated yet.** `lib/supabaseClient.ts` and `lib/auth.ts` are placeholders; login forms are UI-only (no real authentication).
- High-fidelity visual design is being brought in screen-by-screen from Figma (see `DESIGN.md`), replacing earlier rough/manual layouts.
