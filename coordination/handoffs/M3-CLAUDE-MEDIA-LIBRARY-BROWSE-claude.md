# M3-CLAUDE-MEDIA-LIBRARY-BROWSE — Handoff

- **Task**: M3-CLAUDE-MEDIA-LIBRARY-BROWSE
- **Branch**: `ai/claude/m3-media-library-browse`
- **Base SHA**: `4f01bbbfe01843583456d86bf46e8b60c82a65c3` (`origin/coordination/m3-claude-media-library-browse-assignment`)
- **Head SHA**: `9a36cd9866fc21239b1d7c34872cc67dde69505d`

## Summary

Implements the first bounded admin Media presentation at `/{locale}/admin/media`: a
read-only, server-rendered library grid with ALL/IMAGE/PDF filters, bounded server
pagination (fixed `pageSize=24`), useful metadata per item, and loading/empty/unavailable
states. Upload, picker dialogs, metadata editing, copy-to-clipboard, deletion, Tiptap
integration, Post editor work, and browser E2E are intentionally out of scope, per manifest.

The page is a Server Component that runs the same protected-route session decision as the
existing admin landing page, then consumes only
`listAdminMedia(getPrismaClient(), session, query, UPLOAD_PUBLIC_URL)` — no direct Prisma
access, no internal HTTP call, no widened contracts, no UI-inferred ownership.

## Files changed

- `src/app/[locale]/admin/media/page.tsx` — Server Component route: session/locale gate,
  query normalization, `listAdminMedia` call, header/filter/grid/pagination/state composition.
- `src/app/[locale]/admin/media/loading.tsx` — translated header + skeleton grid fallback.
- `src/components/admin/media/media-query.ts` — pure query normalization (`parseAdminMediaPage`,
  `parseAdminMediaKind`), fixed `ADMIN_MEDIA_PAGE_SIZE`, href builder, pagination windowing.
- `src/components/admin/media/media-format.ts` — Asia/Jakarta date/time, binary byte size, and
  locale-aware dimension formatting.
- `src/components/admin/media/media-thumbnail-resolver.ts` — pure conversion of a validated
  `AdminMediaItem.url` to a same-origin local `/uploads/...` `next/image` source, or an
  intentional placeholder (`pdf` / `placeholder`) when it cannot be proven safe.
- `src/components/admin/media/media-thumbnail.tsx` — presentational thumbnail: `next/image`
  for a resolved local image, decorative Lucide icon placeholder otherwise.
- `src/components/admin/media/media-item-card.tsx` — one grid item: filename, type badge, size
  + dimensions, accessibility state/alt text (images only), uploader label when present,
  Jakarta-formatted `<time>`.
- `src/components/admin/media/media-grid.tsx` — semantic `<ul>/<li>` responsive grid
  (4 → 2 → 1 columns).
- `src/components/admin/media/media-filter-tabs.tsx` — ALL/IMAGE/PDF filter links, locale- and
  filter-preserving hrefs, `aria-current="page"` on the active filter.
- `src/components/admin/media/media-pagination.tsx` — windowed prev/next pagination,
  `rtl:rotate-180` chevrons, filter- and locale-preserving hrefs.
- `src/components/admin/media/media-state-notice.tsx` — empty vs. unavailable notice
  (`role="alert"` only for unavailable), always an `<h2>` under the page's own `<h1>`.
- `src/components/admin/media/media-grid-skeleton.tsx` — shape-matching loading skeleton,
  `aria-hidden` grid + `sr-only` status text.
- `messages/id.json`, `messages/en.json`, `messages/ar.json` — new `AdminMediaLibrary`
  namespace (title/description, filters, counts, accessibility/uploader/time labels,
  pagination, empty/unavailable copy). Arabic copy is genuine MSA; all markup uses logical
  direction utilities only (no `ml/mr/pl/pr`, `left/right`, `text-left/right`).
- `tests/m3/ui/admin-media-library-browse.test.tsx` — deterministic tests (see below).
- `coordination/handoffs/M3-CLAUDE-MEDIA-LIBRARY-BROWSE-claude.md` — this handoff.

No files outside `allowed_paths` were touched. `next.config.ts`, `src/lib/**`,
`src/components/ui/**`, `src/components/public/**`, and the admin layout were read for
context only (per `readonly_paths`) and never edited.

## API / schema / migration impact

None. No Prisma schema, contract, migration, dependency, or shared/global-style change.
`listAdminMedia`, `AdminMediaListResult`, and `AdminMediaItem` are consumed exactly as
frozen in `src/contracts/media-admin.ts` and `src/lib/content/media-admin-transport.ts`
(both read-only for this task) — no widened fields, no fabricated data (no uploader
email/ID, no reference counts, no delete eligibility, no totals outside the returned shape).

## Commands run and results

All commands run from the task worktree (`~/myproject/fuspi-claude`), against a locally
provisioned PostgreSQL 17 database (`fuspi_dev_claude`, schema synced via `prisma db push`
against the already-frozen `prisma/schema.prisma` — no schema file was edited):

```
npx vitest run tests/m3/ui/admin-media-library-browse.test.tsx   → 45 passed
npm run lint                                                     → 0 errors, 0 warnings
npm run typecheck (tsc --noEmit)                                 → 0 errors
npm test                                                          → 581 passed, 75 skipped (unrelated suites)
npm run test:integration                                          → 82 passed (20 files)
npm run build                                                     → success (exit 0)
git diff --check                                                  → clean
TASK_MANIFEST=coordination/tasks/M3-CLAUDE-MEDIA-LIBRARY-BROWSE.md \
TASK_BASE=origin/coordination/m3-claude-media-library-browse-assignment \
npm run check:scope                                               → "16 changed file(s) are within lease"
```

`npm run build` emits one pre-existing Turbopack NFT-tracing warning on `next.config.ts`
(import trace: `src/lib/storage/staged-file.ts` → `src/lib/content/media-admin-transport.ts`
→ `src/app/api/admin/media/route.ts`). This trace runs through the pre-existing API route,
not through any file added in this task, and the build still exits `0`; it is not a
regression introduced here.

The new route registers as `ƒ /[locale]/admin/media` (dynamic, server-rendered) in the
build output, alongside the existing `/[locale]/admin` route.

## Untested areas, risks, follow-ups

- **No Playwright/browser E2E** for this route — out of scope per manifest (deliberately
  excluded alongside picker/upload/edit/delete). Manual verification of the 360/390/768/
  1024/1440px breakpoints and real Arabic RTL rendering in a browser was not performed in
  this session; only `renderToStaticMarkup`-based assertions and a physical-direction-utility
  grep across every file in `allowed_paths` were run (docs/03 §Responsif checklist could not
  be fully executed without a browser).
- **axe/automated accessibility scan** was not run against a live page; accessibility was
  verified structurally (semantic `<ul>/<li>`, `aria-current`, `role="alert"` vs. none,
  single `<h1>`/`<h2>` ownership, `rtl:rotate-180` chevrons, no physical-direction utility
  classes) rather than with a live audit tool.
- **EDITOR-role ownership scoping** (uploader-owned view) is enforced entirely inside the
  already-tested, read-only `listAdminMedia`/`ownershipWhere` transport (covered by
  `tests/m3/runtime/media-admin-transport*.test.ts`, not touched here); this task adds no
  new authorization logic and relies on that existing, already-passing coverage.
- **Real thumbnail rendering against a live upload host** was not visually verified (no
  running dev server with actual uploaded files in this session); the URL→local-path
  conversion logic (`media-thumbnail-resolver.ts`) is covered by deterministic unit tests
  covering relative, same-origin-absolute, cross-origin, missing-config, and PDF/placeholder
  cases instead.
- **Environment note (not a code risk)**: `test:integration` requires `DATABASE_URL` to
  point at an existing, migrated PostgreSQL database. The worktree's `fuspi_dev_claude`
  database did not exist at the start of this session; it was created and synced via
  `createdb` + `prisma db push` (data/DB operation only — no file under `prisma/**` or any
  other forbidden path was modified) purely to run the mandatory acceptance commands.

## Requested contract/dependency change

None.
