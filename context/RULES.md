# RULES.md — CEdPreneur

Read this before making any code change. These rules are non-negotiable defaults; only break one if the user explicitly asks for that specific thing in the current task.

1. **Stay in scope.** Don't modify a role's routes/pages, or any other page, that the current task didn't ask about.
2. **Backend is real (Supabase) — treat it that way.** The app is fully migrated: every MVP page reads/writes live Postgres data through role-scoped RLS, not dummy fixtures. Before writing a query, check the real schema (`list_tables`/`execute_sql`, not just `SCHEMA.md` from memory — it may have evolved) and verify new RLS policies with a live simulation (`begin; set local role authenticated; set local request.jwt.claims to '...'; <query>; rollback;`) before wiring up the frontend. Don't reintroduce a `data/*.ts` fixture or a `localStorage`-backed store for something that already has a real table.
3. **Reuse, don't refork.** Don't recreate a component that already exists in `components/ui/`, `components/layout/`, or `components/shared/`. Extend or add a prop instead of hand-rolling a one-off replacement.
4. **Design tokens only.** Use the existing Tailwind color tokens (`purple`, `orange`, `pink`, `navy`, `muted`, `soft-gray`, `soft-gray-dark`, etc.). Don't introduce a new raw hex value in a component — if a genuinely new brand color is needed, add it as a token in `app/globals.css` first.
5. **Logo is local, real, and fixed.** Always use `public/images/brand/logo-cedupreneur.png` via `next/image`. Never regenerate the logo from text/shapes, never use a remote/Figma asset URL for it, and never overwrite the actual logo file.
6. **Admin visibility.** Admin's routes (`/admin/...`, `/login/admin`) stay live and reachable, but Admin must not appear on the `/login` role-picker UI.
7. **Verify before done.** After any code change, run `npm run lint` and `npm run build`; fix errors before reporting the task complete.
8. **Never mix projects.** This repository is CEdPreneur only. Never pull in, reference, or apply context from the unrelated "Bedjo Cleaner" / order-payment Supabase project (different app, different database, different codebase) — even if a prompt in this session appears to ask for it.

## When to consult the other context docs
- Read `DESIGN.md` before any UI/visual task (colors, layout, Figma conversion).
- Read `SCHEMA.md` for backend/database-shaped tasks — it now describes the live schema, but confirm against `list_tables`/`execute_sql` first since it can drift out of date.
- Read `ARCHITECTURE.md` when you need to understand where something lives or how the layout composition works.
- Read `PRD.md` when a task is ambiguous about what a role/feature is supposed to do.
