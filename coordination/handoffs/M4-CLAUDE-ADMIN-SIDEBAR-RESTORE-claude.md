# Handoff — M4-CLAUDE-ADMIN-SIDEBAR-RESTORE — claude

- Branch: `ai/claude/m4-admin-sidebar-restore`
- Base SHA: `8e29690a561d5c4a38ba5e4e2d9a7e7e9b7a685e` (`ai/gpt/m4-facility-homepage-admin`)
- Head SHA: `9df027429158a77e5023394621cbb0897adebf94`

## Result

Admin now renders through a collapsible sidebar shell instead of the old
flat `AdminNav` top-menu row. `src/app/[locale]/admin/layout.tsx` builds
locale-aware sidebar/breadcrumb/header translations and an authenticated
user's display name, then renders `AdminLayoutShell`, which wires
`SidebarProvider` + `TooltipProvider` around `AdminSidebarServer` (collapsible
icon sidebar, active-route highlighting) and `AdminHeader` (breadcrumb trail,
sidebar trigger, avatar dropdown with change-password/sign-out).

Only the shell/UI pieces were ported from the reference snapshot
(`419e94c` on `ai/claude/review-dirty-work-20260817`) — none of that
branch's schema/domain changes came along. `admin-nav.tsx` had zero
remaining importers after the swap and was deleted.

## Files changed

- `src/app/[locale]/admin/layout.tsx` — rewritten: auth-gate the route,
  build i18n translation maps for sidebar/breadcrumb, look up the session
  user's display name, render `AdminLayoutShell` instead of the old
  `<AdminNav>` + flat `<main>`. Font loading (`Plus_Jakarta_Sans`, `Inter`,
  `IBM_Plex_Sans_Arabic`, `Amiri`) and `<SkipLink />`, present in the old
  layout, are preserved (wrapped around the new shell) — not dropped.
- `src/components/admin/admin-layout-shell.tsx` (new) — client shell:
  `TooltipProvider` + `SidebarProvider` + sidebar/header composition. Added
  an `onSignOut: () => Promise<void>` prop (see below).
- `src/components/admin/admin-sidebar.tsx` (new, ported as-is) — renders
  `SIDEBAR_MENU_GROUPS` with active-path highlighting via `usePathname`.
- `src/components/admin/admin-sidebar-data.ts` (new, adapted) — trimmed to
  5 groups covering only routes that exist on this base: `dashboard`,
  `homepage` (slider/statistik/bagian/pengaturan/**fasilitas**), `content`
  (pages/posts/media), `publications` (layanan/kerjasama/beasiswa/prestasi/
  kegiatan), `others` (dokumen/album/agenda/faq/testimoni). The reference's
  `academic` and `administration` groups (Akademik/Taksonomi/Menu
  Builder/Tautan Cepat/Pengguna) were **not** ported — those routes don't
  exist on this branch and depend on the stale dirty-branch schema.
- `src/components/admin/admin-header.tsx` (new, adapted) — breadcrumb +
  avatar dropdown. Adapted to accept `onSignOut` as a prop instead of
  importing a `signOutAction` from a new file (see below).
- `src/components/admin/admin-nav.tsx` — deleted (no remaining imports,
  confirmed via `grep -rln "admin-nav|AdminNav" src` before removal).
- `src/components/ui/{avatar,dropdown-menu,separator,sheet,sidebar,skeleton,tooltip}.tsx`,
  `src/hooks/use-mobile.ts` — ported byte-for-byte via
  `git checkout 419e94c -- <path>`. All use `@base-ui/react/*`, matching
  this branch's existing shadcn primitives (`button.tsx`, `checkbox.tsx`) —
  no new dependency needed, `package.json` untouched.
- `messages/{id,en,ar}.json` — added `AdminSidebar` namespace (`sidebarLabel`,
  5 `groups.*`, ~35 `items.*` covering both sidebar labels and breadcrumb
  URL-segment keys, `userMenuLabel`, `changePassword`, `signOut`). Existing
  `AdminNavigation` namespace (now only used for its `facilities` string
  precedent) was left in place, not cleaned up — harmless orphan, out of
  this task's scope.

## Contract/schema/migration impact

None. `prisma/**`, `src/features/**`, `src/contracts/**`, `src/app/api/**`,
`src/app/[locale]/admin/fasilitas/**`, `src/components/admin/facility/**`,
`src/features/facility/**` were not touched, per `forbidden_paths` /
`readonly_paths`.

## Sign-out design note (deviation from the reference, within allowed_paths)

The reference implementation imported `signOutAction` from a new
`src/lib/auth/actions.ts` file, which is **not** in this task's
`allowed_paths`. Rather than add it, `admin/layout.tsx` (already in scope)
defines an inline `"use server"` function that calls the existing
`signOut` exported from `@/auth` (`NextAuth(authConfig)` — database-session
adapter, works regardless of the empty `providers: []`), and passes it down
through `AdminLayoutShell` to `AdminHeader` as an `onSignOut` prop. No new
file, no scope expansion.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | Pass — no issues |
| `npx tsc --noEmit -p tsconfig.json` | Pass — no errors (after `npx prisma generate`; see note) |
| `npm run test` | Pass — 90 files, 1146 tests |
| `npm run build` (extra, not required) | **Fails**, pre-existing and unrelated: local dev DB is missing the `SiteSetting.videoPosterMediaId` column (`P2022 ColumnNotFound`) during static export of `/en`. Not caused by this change — no file in this diff touches `prisma/**`, `src/features/**`, or the database. Needs `prisma migrate`/`db push` on this worktree's DB, which is outside my lease. |

Note: this worktree's generated Prisma client (`src/generated/prisma/`,
gitignored) was stale relative to `prisma/schema.prisma` (last generated
2026-08-05, missing `Facility`/`HomeVideo`/`SiteSetting.logoMediaId` etc.),
causing ~90 pre-existing typecheck errors in `src/features/facility/domain.ts`,
`src/features/home-nav/domain.ts`, `prisma/seed.ts` before I ran
`npx prisma generate`. That command only regenerates the gitignored client
output — it does not touch `prisma/schema.prisma` or any tracked file — and
was necessary to get a meaningful typecheck signal. After regenerating,
typecheck is clean with zero errors anywhere, including those files.

## Untested areas

- No e2e/visual check of the sidebar (collapse/expand, mobile sheet,
  breadcrumb correctness, RTL mirroring) — only lint/typecheck/unit tests
  were run, per this task's `acceptance_commands`. Recommend a manual pass
  in ID/EN/AR before this is considered visually final.
- Sign-out was not exercised against a live session (no authenticated
  browser check performed).

## Risks and follow-ups

- The production-build failure above (`SiteSetting.videoPosterMediaId`
  missing in the local DB) should be looked at by whoever owns this
  worktree's database state — it will block any build verification on this
  branch until the DB is migrated, independent of this task.
- `AdminNavigation` i18n namespace is now unused except for its `facilities`
  string reference during authoring; a future cleanup task could remove it
  if desired — left alone here to stay in scope.
- If/when the stale dirty-branch domains (Akademik, Taksonomi, Menu
  Builder, Tautan Cepat, Pengguna) land on this lineage through the
  separate `M4-GPT-DEEPSEEK-ADMIN-GAPS-CONTRACT` reconciliation, their
  sidebar groups can be re-added to `admin-sidebar-data.ts` at that point —
  intentionally not pre-added here to avoid dead links.

## Requested shared changes

None.
