@AGENTS.md

# CEdPreneur — Project Conventions

Frontend-only scaffold (no Supabase/backend integration yet) for a 4-role Edupreneur UMKM platform: Admin, Dosen, Mahasiswa, UMKM. Next.js App Router + TypeScript + Tailwind CSS v4.

## Project context docs
Before making non-trivial changes, consult the relevant file(s) in `context/` — they are the detailed reference; this file only summarizes conventions:
- **`context/RULES.md` — read this first, every task.** It's the binding rulebook (scope discipline, no unrequested backend work, reuse components, design tokens only, logo handling, admin visibility, lint/build-before-done, and: never mix this project with the unrelated "Bedjo Cleaner"/order-payment Supabase project).
- **`context/DESIGN.md`** — read for any UI/visual task: color tokens, Figma-as-source-of-truth workflow, logo usage, component styling conventions.
- **`context/ARCHITECTURE.md`** — read when you need the folder/layout map (app/, components/, data/, lib/, types/) in more depth than below.
- **`context/PRD.md`** — read when a task is ambiguous about what a role or feature is supposed to do.
- **`context/SCHEMA.md`** — backend/database task only. It's planning documentation for a not-yet-implemented data model; don't write SQL/migrations from it unless explicitly asked to do backend work.

## Design tokens (app/globals.css)
Use these Tailwind color names, never raw hex in new code:
- `purple` `#5721E0`, `purple-dark` `#4318B3`
- `orange` `#FF6E00`, `orange-light` `#FF9142`
- `pink` `#E81A63`
- `navy` `#14054D` (headings/body text)
- `muted` `#5C6185` (secondary text)
- `soft-gray` `#F5F4F1` (page background), `soft-gray-dark` `#E0E0ED` (borders)
- `.header-gradient` and `.brand-gradient-text` utility classes exist for the purple→pink→orange gradient.

## Folder structure
- `app/<role>/...` — route pages. Each role has `app/<role>/layout.tsx` that wraps children in `<RoleLayout role="...">` — don't re-add Sidebar/Header manually inside a page.
- `components/ui/` — Button, Card (+CardHeader/CardTitle), Input, Select, Textarea, Table, Badge, ProgressBar, Timeline, UploadBox. Always reuse these instead of raw `<button>`/`<table>`/etc.
- `components/layout/` — Sidebar, Header, DashboardLayout, RoleLayout, menu.tsx (per-role sidebar menu config, incl. icons).
- `components/shared/` — cross-page pieces: PageHeader, StatCard, LoginForm, RoleLoginCard, BrandMark, icons.tsx.
- `types/` — Role, User, MataKuliah, Kelas, Project, Group, Progress, Feedback, Umkm.
- `data/` — dummy data only (users, akademik, umkm, projects). No API calls yet; import directly from `@/data`.
- `lib/auth.ts`, `lib/supabaseClient.ts` — placeholders, not wired up. Use `getCurrentUser(role)` from `lib/auth` to get the dummy logged-in user for a role.

## Page skeleton pattern
Every content page should follow this shape:
```tsx
import { PageHeader } from "@/components/shared";
import { Card, Table, Badge, Button } from "@/components/ui";

export default function SomePage() {
  return (
    <div>
      <PageHeader title="..." description="..." actions={<Button>...</Button>} />
      <Card>{/* table / form / stats */}</Card>
    </div>
  );
}
```
Use `StatCard` in a grid for dashboard summary numbers. Use `Table` with a `columns`/`data`/`keyExtractor` config rather than hand-rolled `<table>`. Dynamic routes (`[id]`) get `params: Promise<{ id: string }>` and must `await params` (Next 16 async params) — use `notFound()` if the dummy record isn't found.

## Working from Figma
This project has the Figma MCP connected. When implementing a design from a Figma link:
1. Call `get_design_context` with the frame's fileKey/nodeId.
2. Convert absolute-positioned px output into responsive Tailwind (flex/grid, relative units) — never ship raw Figma pixel-absolute layout.
3. Only download real vector assets (icons/logos/illustrations) into `public/`. Simple shapes (circles, ellipses, dot grids) should become plain Tailwind `div`s (`rounded-full`, `bg-color/opacity`), not image files.
4. Map Figma colors onto the existing token names above — extend `globals.css` tokens if a genuinely new brand color is needed, don't hardcode hex in components.
5. Real logos/images the user supplies go in `public/images/brand/` (see `logo-cedupreneur.png`) and are read via `next/image` — ask the user for the exact filename/path if unclear, don't invent one.

## Rules
- Don't touch other roles' routes when asked to change one page/section.
- Don't add Supabase/auth integration unless explicitly asked — keep using dummy data + placeholders.
- Don't remove reusable components; extend them instead of forking one-off styles.
- Admin has real routes (`/admin/...`, `/login/admin`) but is intentionally not listed on the `/login` role-picker UI.
- After any change: run `npm run lint` and `npm run build`, fix errors before reporting done.
