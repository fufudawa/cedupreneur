# ARCHITECTURE.md — CEdPreneur

## What this is
CEdPreneur is a web app built with **Next.js (App Router) + TypeScript + Tailwind CSS v4**. It is a 4-role Edupreneur/UMKM platform connecting campus and industry:

- **Admin** — manages users, master data, class-UMKM relations, monitoring, and reporting.
- **Dosen** (lecturer) — designs student projects and mentors groups.
- **Mahasiswa** (student) — works on projects, uploads progress, views mitra (partner) profile.
- **Mitra UMKM** (business partner) — mentors/gives feedback to student groups, manages own business profile.

The project is currently **frontend-only**: no backend or Supabase integration. All data comes from local dummy fixtures.

## Folder structure

```
app/            Route pages (Next.js App Router)
components/     Reusable UI, layout, and shared components
data/           Dummy/fixture data (no API calls)
lib/            Small helpers and integration placeholders
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
Dummy data only — `users`, `akademik` (mata kuliah, kelas), `umkm`, `projects` (projects, groups, progress, feedback). Imported directly via `@/data`. No fetches, no API routes.

### `lib/`
- `lib/auth.ts` — placeholder; `getCurrentUser(role)` returns the dummy logged-in user for a given role.
- `lib/supabaseClient.ts` — placeholder only, not wired up to any real Supabase project.
- `lib/utils.ts` — small helpers (e.g. `cn` for class merging).

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
