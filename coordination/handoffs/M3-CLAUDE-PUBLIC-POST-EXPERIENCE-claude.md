# Handoff — M3-CLAUDE-PUBLIC-POST-EXPERIENCE

- **Task ID:** M3-CLAUDE-PUBLIC-POST-EXPERIENCE
- **Branch:** `ai/claude/m3-public-post-experience`
- **Assignment branch (lease base):** `origin/coordination/m3-claude-public-post-experience-assignment`
- **Base SHA:** `27bbed9e75e338db5fe0b1d703aab33a96ee0bd9`
- **Implementation SHA:** `bc3458257ab5b451f34a6281fab12cc7dfabf04c`
- **Handoff SHA:** recorded by the commit that adds this file (see branch head after this commit)

## Summary

Implements the first public-facing Berita reference slice: `/[locale]/berita`
(list) and `/[locale]/berita/[slug]` (detail), plus a reusable
`src/components/public/post/**` presentation layer. Both routes are Server
Components that consume `listPublicPosts` / `getPublicPostDetail` read-only
through `getPrismaClient()`, always passing `type: "BERITA"`, the validated
route locale, the neutral slug, `process.env.UPLOAD_PUBLIC_URL`, and bounded
page input (fixed page size 10). No Prisma access, contract, schema, or
dependency file was touched.

### List route (`/[locale]/berita`)

- Breadcrumb (Beranda › Berita), `SectionHeading` H1, responsive horizontal
  `PostCardHorizontal` list, server pagination, loading skeleton, empty
  state, and query-unavailable state.
- `page` search param is structurally validated (`parsePageCandidate`) then
  clamped to the real last page once `total` is known
  (`clampPageToTotalPages`) — invalid, repeated/array, zero, negative,
  fractional, and excessive input all normalize to a safe page without ever
  reflecting the untrusted value back into the page. Verified live: `page=abc`,
  `page=-5`, `page=99999`, and `page=2&page=3` all return `200` with a
  normalized page, no crash, no echoed input.
- **Intentional scope reduction:** the list page does not render the
  Category/Archive/Search sidebar widgets described in `docs/19-B`/`19-D`.
  The frozen query contract has no category-count, archive, or search
  capability, and the manifest explicitly forbids fabricating those — so the
  list page is a single main column. This matches the manifest's own "List
  route requirements," which never mention a sidebar.
- Cover image: `next/image` is used only when `resolveCoverImageSrc` proves
  the validated `PublicMediaView.url` is same-origin with
  `NEXT_PUBLIC_SITE_URL` (or already a local `/uploads/...` path); anything
  else — cross-origin, no configured origin, non-`image/webp`, missing
  dimensions — renders an `aria-hidden` placeholder instead. `next.config.ts`
  was never touched.
- Category is shown as the frozen `categorySlug` verbatim
  (`humanizeCategorySlug` only de-hyphenates it for display) — no name
  lookup, no fabricated label, and it is not rendered as a link (no
  `/berita/kategori/[slug]` route exists in this task).

### Detail route (`/[locale]/berita/[slug]`)

- Unknown/invalid/unpublished/future/wrong-type/unavailable slugs resolve
  through `notFound()` → `not-found.tsx`; a thrown `getPrismaClient()`
  (e.g. missing `DATABASE_URL`) instead renders the translated unavailable
  state, since that is an environment failure, not a content one.
- Breadcrumb, H1, author/date/category meta, locale-aware Jakarta reading
  time (`estimateReadingMinutes`, ~200 words/minute), optional cover +
  caption, sanitized article body, and a sticky "Berita Terbaru" sidebar
  (up to 5 latest Berita via `listPublicPosts`, current post excluded in
  presentation — the contract has no `excludeId` filter).
- `translation.value.content` is re-sanitized with the existing
  `sanitizeRichTextHtml` immediately before render
  (`sanitizeStoredContentOrNull`); on sanitization failure it fails closed to
  the same translated unavailable state instead of throwing.
- Dynamic metadata: title/description from `metaTitle ?? title` /
  `metaDesc ?? excerpt`, canonical + ID/EN/AR + `x-default` hreflang
  (`buildLocaleAlternates`), Open Graph article fields (published time,
  author, same-origin cover only), escaped `NewsArticle` + `BreadcrumbList`
  JSON-LD (`serializeJsonLd` escapes `<` so injected text cannot break out of
  the `<script>` tag). JSON-LD is only rendered when `NEXT_PUBLIC_SITE_URL`
  is configured, since it requires an absolute URL.
- `generateMetadata` and the page share one `getPublicPostDetail` call via
  `React.cache`.

### Shared building blocks (`src/components/public/post/**`)

Pure, unit-tested helpers (`format.ts`, `pagination.ts`, `cover-image.ts`,
`hreflang.ts`, `json-ld.ts`, `sanitize.ts`, `locale.ts`) plus presentational
components (`post-card-horizontal`, `post-cover-image`, `post-meta-row`,
`post-fallback-banner`, `post-state-notice`, `post-breadcrumb`,
`post-pagination`, `post-sidebar-latest`, `post-article-body`,
`post-json-ld`, `post-list-skeleton`, `post-detail-skeleton`). All are
written to be reused as-is for `/pengumuman` and `/kolom` in a later task
(docs/19-G), which this task does not open.

### i18n

Added one `Post` namespace (22 keys, structurally identical) to
`messages/id.json`, `messages/en.json`, `messages/ar.json` — no English
placeholders left in the Arabic catalog; verified with a structural key-diff
script (see Verification). Only logical direction utilities are used
throughout (`rtl:rotate-180` on breadcrumb/pagination/card arrows); a
repo-wide regex scan for `ml-`/`mr-`/`pl-`/`pr-`/`text-left`/`text-right`/
`left-`/`right-`/`border-l`/`border-r`/`rounded-l-`/`float-left` across every
new file returns zero matches (also asserted by the new test suite).

## API / schema / migration impact

None. No changes to `prisma/**`, `src/generated/**`, `src/contracts/**`,
`src/lib/content/**`, `src/lib/db/**`, `next.config.ts`, `package.json`, or
`package-lock.json`. `listPublicPosts` / `getPublicPostDetail` are consumed
exactly as published, with no direct Prisma queries.

## Verification

All commands run from a clean worktree after `bc34582`:

| Command | Result |
| --- | --- |
| `npx vitest run tests/m3/ui/public-post-experience.test.tsx` | PASS — 37/37 |
| `npm run lint` | PASS — 0 errors, 0 warnings |
| `npm run typecheck` | PASS — 0 errors |
| `npm test` | PASS — 469 passed, 69 database-gated skipped, 0 failed |
| `npm run build` | PASS — `/[locale]/berita` and `/[locale]/berita/[slug]` compile as dynamic routes |
| `git diff --check` | PASS — no whitespace errors |
| `TASK_MANIFEST=... TASK_BASE=origin/coordination/m3-claude-public-post-experience-assignment npm run check:scope` | PASS — "28 changed file(s) are within lease" |

Manual smoke test against a running `next dev --port 3004` (no Berita rows
seeded in this worktree's local database — schema not pushed here):

- `/id/berita`, `/en/berita`, `/ar/berita` → `200`, render the translated
  unavailable/empty state, no stack trace or technical string in the body.
- `/ar/berita` and `/ar/berita/does-not-exist` → `dir="rtl"` on `<html>`.
- `/id/berita?page=abc|-5|99999|2&page=3` → all `200`, normalized page, no
  crash, no reflected raw input.
- `/en/berita/does-not-exist` → renders the `not-found.tsx` copy ("News
  article not found").

This worktree's local `.env`/`.env.local` `DATABASE_URL` still had a stale
`mysql://` scheme left over from before the project's Postgres migration
(`2e04f3b`); I updated only the protocol/port in my own gitignored,
untracked `.env.local` (`postgresql://postgres:postgres@127.0.0.1:5432/...`)
so `npm run build` could run locally. This file is not part of this commit.
I also had to run `npm run prisma:generate` once — the checked-in
`prisma/schema.prisma` already defines `TicketPriority` as
`RENDAH/SEDANG/TINGGI/URGENT` (commit `2473d2b`), but this worktree's
gitignored `src/generated/prisma` client was stale from before that fix,
which was breaking `npm run typecheck`/`npm run build`/`npm test` on
`src/lib/sla/ticket.ts` and `tests/platform/ticket-sla*.test.ts` — files
entirely outside this task's `allowed_paths`. I confirmed via `git stash`
that these failures reproduce with none of my changes applied, i.e. this is
pre-existing local dependency/build-artifact drift, not a defect in this
task's code, and regenerating the client (no `prisma/schema.prisma` edit)
was the fix.

## Untested areas, risks, follow-ups

- No Berita rows exist in this worktree's local database, so the "real
  data" rendering path (populated cards, populated sidebar, an actual
  fallback banner, a real cover image) was only exercised by the unit tests
  and fixture-shaped data in `tests/m3/ui/public-post-experience.test.tsx`,
  not by a live end-to-end request. Integration/E2E coverage against seeded
  PUBLISHED Berita rows is DeepSeek's task per the writer/reviewer/tester
  matrix.
- Skeleton pulse timing uses Tailwind's default `animate-pulse` (~2s) rather
  than the `1.5s` in `docs/17-H`; adding a custom timing utility would touch
  `globals.css`, which is out of this task's `allowed_paths`. Cosmetic only.
- JSON-LD and absolute canonical/OG URLs degrade to root-relative when
  `NEXT_PUBLIC_SITE_URL` is unset; this worktree's local env has it pointing
  at port `3000` while the dev server runs on `3004` (pre-existing env file
  drift, not touched here beyond the `DATABASE_URL` fix noted above).
- Accessibility/RTL/responsive verification (360/390/768/1024/1440px, axe,
  keyboard) was static-analysis only (regex scan for physical-direction
  utilities + manual `dir="rtl"` smoke check); no Playwright/axe run was
  performed — `tests/security/**` and `e2e/**` are outside this task's
  `allowed_paths`.
- No contract or dependency change is requested.

## Confirmation

- Did not touch Prisma/schema/migration, dependencies/lockfile,
  `next.config.ts`, contracts, `src/lib/content/**`, `src/lib/db/**`,
  auth/storage/security runtime, `globals.css`/UI primitives,
  header/footer/navigation, admin, API routes, or Media transport.
- Did not fabricate view count, tags, archive counts, previous/next
  navigation, search, or related-post ranking.
- Did not open Pengumuman, Informasi, Kolom, homepage integration, admin
  editor, or Media upload UI.
- Did not merge, edit task status/lease, or start a DeepSeek QA task.
