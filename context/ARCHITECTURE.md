# ARCHITECTURE.md — CEdPreneur

## What this is
CEdPreneur is a web app built with **Next.js (App Router) + TypeScript + Tailwind CSS v4**. It is a 4-role Edupreneur/UMKM platform connecting campus and industry:

- **Admin** — manages users, master data, class-UMKM relations, monitoring, and reporting.
- **Dosen** (lecturer) — designs student projects and mentors groups.
- **Mahasiswa** (student) — works on projects, uploads progress, views mitra (partner) profile.
- **Mitra UMKM** (business partner) — mentors/gives feedback to student groups, manages own business profile.

The backend is **real Supabase** (Postgres + Auth + Storage + Edge Functions) — every page in the MVP scope reads/writes live data through role-scoped RLS policies. See `PRD.md`'s "Current implementation state" for how auth/mutations are wired.

## Folder structure

```
app/            Route pages (Next.js App Router)
components/     Reusable UI, layout, and shared components
data/           Legacy dummy fixtures — mostly dead code now (see note below)
lib/            Real Supabase-backed hooks/clients + a handful of pure helpers
supabase/       Edge Functions (supabase/functions/*) + seed.sql + config
types/          Shared TypeScript types
public/         Static assets (including the real brand logo)
context/        This documentation set
```

### `app/`
- `app/<role>/...` — route pages per role (`admin`, `dosen`, `mahasiswa`, `umkm`).
- Each role has its own `app/<role>/layout.tsx`, which wraps all pages under that role in `<RoleLayout role="...">`. Pages themselves must not render their own sidebar/header — that would double up the layout chrome.
- `app/login/...` — role-picker page (`/login`) plus one login page per role (`/login/admin`, `/login/dosen`, `/login/mahasiswa`, `/login/umkm`). Admin's login route exists but is intentionally not listed on the role-picker UI.
- Dynamic routes (`[id]`) use Next 16's async `params: Promise<{ id: string }>` and must `await params`; missing dummy records should call `notFound()`.

### `components/`
- `components/ui/` — low-level reusable primitives: `Button`, `Card` (+ `CardHeader`/`CardTitle`), `Input`, `Select`, `Textarea`, `Table`, `Badge`, `ProgressBar`, `Timeline`, `UploadBox`. Always reuse these instead of hand-rolled `<button>`/`<table>`/etc.
- `components/layout/` — app chrome: `Sidebar`, `Header`, `DashboardLayout`, `RoleLayout`, and `menu.tsx` (per-role sidebar menu config, including icons).
- `components/shared/` — cross-page composed pieces: `PageHeader`, `StatCard`, `LoginForm`, `RoleLoginCard`, `BrandMark`, `icons.tsx`.

### `data/`
Leftover from the pre-Supabase build. No page imports from `@/data` anymore except indirectly via `lib/auth.ts`, which still uses `data/users.ts`'s `CURRENT_USER` as an SSR-safe placeholder object for `RoleLayout`'s very first render (before the real account name loads client-side) — that's the one deliberate survivor. The rest (`akademik`, `umkm`, `projects`, `dosenDashboard`, `dosenProject`) are dead code kept around rather than deleted; verify with a repo-wide import search before assuming any of them are load-bearing.

### `lib/`
- `lib/auth.ts` — real Supabase Auth: `loginWithEmail`/`loginWithNip`/`loginWithNim`, `getCurrentProfile()`, `requireRole()`, `signOut()`. `getCurrentUser(role)` is the one remaining dummy-backed export (see `data/` note above).
- `lib/supabaseClient.ts` — the real Supabase JS client, configured against the live project.
- `lib/use<Role><Thing>.ts` (e.g. `useAdminUsers`, `useAdminMonitoring`, `useAdminMasterData`, `useDosenKelompokBimbingan`, `useMahasiswaKelompok`, `useUmkmKelompok`, `useKelasUmkm`) — the real per-page/per-role Supabase data hooks; this is where almost all query logic lives.
- `lib/utils.ts` — small helpers (e.g. `cn` for class merging).

### `supabase/`
- `supabase/functions/*` — Edge Functions for admin-only user management (`create-user`, `update-user`, `delete-user`, `reset-user-password`, `change-user-role`). Each has its own `requireAdmin()` check re-verifying the caller's role server-side — `verify_jwt: true` in isolation is not sufficient.
- `supabase/seed.sql`, `supabase/config.toml` — local project config/seed.

### `types/`
`Role`, `User`, `MataKuliah`, `Kelas`, `Project`, `Group`, `Progress`, `Feedback`, `Umkm`.

### `public/`
Static assets. The real brand logo lives at `public/images/brand/logo-cedupreneur.png` and must be read via `next/image` — never recreated from text/shapes.

## Layout composition
Every role page renders inside `RoleLayout` → `DashboardLayout`, which composes:
- `Sidebar` (logo + per-role menu items with icons + logout link)
- `Header` (gradient bar with semester/mata kuliah text + user chip)
- `<main>` for the page's own content

A page component should only render its content (cards, forms, tables) — the surrounding chrome is already provided by the layout.
