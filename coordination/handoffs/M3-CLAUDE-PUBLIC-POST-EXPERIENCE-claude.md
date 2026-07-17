# Handoff — M3-CLAUDE-PUBLIC-POST-EXPERIENCE

- **Task ID:** M3-CLAUDE-PUBLIC-POST-EXPERIENCE
- **Branch:** `ai/claude/m3-public-post-experience`
- **Assignment branch (lease base):** `origin/coordination/m3-claude-public-post-experience-assignment`
- **Base SHA:** `27bbed9e75e338db5fe0b1d703aab33a96ee0bd9`
- **Original implementation SHA:** `bc3458257ab5b451f34a6281fab12cc7dfabf04c`
- **Original handoff SHA:** `e79f0a5`
- **Reviewed by:** GPT integrator — `coordination/reviews/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-gpt.md` on `origin/integration/m3-reference-slice` — verdict **REQUEST_CHANGES**
- **Correction implementation SHA:** `3f0cda753dd3a95dce96d5e42cac29dea3656021`
- **Correction handoff SHA:** recorded by the commit that adds this update (see branch head)

## Correction pass — closure of review findings

### M3-UI-01 — Indonesian fallback inherited Arabic RTL/language semantics — **FIXED**

`translation.resolvedLocale` is now carried into every place translated content
renders, independent of the page's requested locale:

- `PostCardHorizontal` (list cards) takes a `resolvedLocale` prop and wraps the
  title (`h2`) and excerpt (`p`) with `lang={resolvedLocale} dir={...}`.
- `PostSidebarLatest` items each take `resolvedLocale`; the title `span` is
  wrapped the same way.
- The detail page wraps the `H1`, the cover `figcaption`, and passes
  `resolvedLocale` into `PostArticleBody`, which wraps its root element with
  `lang`/`dir`.
- Direction is computed from a new `LOCALE_DIRECTION` map in `locale.ts`
  (`id`/`en` → `ltr`, `ar` → `rtl`) — the single source of truth for content
  direction, separate from the page's own `dir`.
- Shell labels (breadcrumb static labels, buttons, pagination) are untouched —
  they still come from `getTranslations()` in the page's requested locale.
- New tests render each of the three content types inside an
  `<div dir="rtl" lang="ar">` ancestor and assert the inner element's own
  `lang="id" dir="ltr"`, proving the override rather than relying on the
  absence of a conflicting attribute (`tests/m3/ui/public-post-experience.test.tsx`,
  "exact translation versus one calm fallback banner" describe block).

### M3-UI-02 — `prose-fuspi` undefined, sanitized HTML unstyled — **FIXED**

`PostArticleBody` no longer references `prose-fuspi`. It now carries a
`ARTICLE_PROSE_CLASSES` list of Tailwind arbitrary descendant-variant
utilities (`[&_p]:...`, `[&_h2]:...`, etc.) covering every tag
`sanitizeRichTextHtml`'s `ALLOWED_TAGS` permits: `p`, `h2`–`h6`, `ul`/`ol`/`li`,
`blockquote`, `a`, `figure`/`figcaption`, `img`, `table`/`caption`/`th`/`td`,
`pre`/`code`, `hr`. Tables get `block` + `overflow-x-auto` + `max-w-full` so a
wide table scrolls inside itself instead of the page; `pre` gets the same
treatment for wide code; `break-words` is applied per text-bearing tag so a
single very long word cannot force horizontal overflow. Every directional
utility used is logical (`ps-6`, `border-s-4`, `text-start`) — none of the
physical opposites. No `globals.css` edit, no dependency added. New
"rich-text article body styling" tests render one HTML fixture containing
every covered tag family and assert both the parsed content and the presence
of the specific descendant-selector classes on the wrapper.

### Web Interface Guidelines corrections — **FIXED**

- `PostCardHorizontal` now renders an `h2` (was `h3`) under the page's `h1`.
- `min-w-0` added to the card's content column, the sidebar's text column,
  and `break-words` added to card title/excerpt, sidebar title, and
  breadcrumb items, so a long title cannot force horizontal overflow at
  360 px.
- `not-found.tsx` now renders `<h1>{t("notFound.title")}</h1>` instead of a
  `<p>` — one standalone heading on that page.
- `PostMetaRow`'s `<time>` now takes a required `dateTimeIso` prop and
  renders `dateTime={dateTimeIso}` alongside the existing locale-formatted
  label; both list cards and the detail page pass `publishedAt.toISOString()`.
- `text-balance` added to the card `h2`, the detail `h1`, the `not-found.tsx`
  `h1`, and the article body's `h2` (article `h3`–`h6` keep normal wrapping,
  since `text-balance` is meant for short heading-like text).

### URL robustness — **FIXED**

- New `src/components/public/post/site-origin.ts` exports
  `validateSiteOrigin(raw)`, which parses `NEXT_PUBLIC_SITE_URL` exactly once,
  returns `null` for anything that isn't a real `http:`/`https:` origin
  (including a malformed-but-truthy string that would otherwise make
  `new URL(path, origin)` throw), and returns the clean origin otherwise.
- Both `page.tsx` files now compute `const siteOrigin = validateSiteOrigin(...)`
  once and pass that (never the raw env var) into `resolveCoverImageSrc`,
  `buildLocaleAlternates`, and the direct `new URL(cover.src, siteOrigin)`
  calls used for the absolute OG/JSON-LD image URL — the one place that could
  previously throw on a malformed-but-truthy origin.
- `hreflang.ts` and `cover-image.ts` now accept `siteOrigin: string | null`
  (pre-validated) instead of re-validating internally at multiple layers.
- `resolveCoverImageSrc` now also rejects a resolved local path that isn't
  under `/uploads/`, even if it's relative and technically same-origin —
  tightening the contract beyond the raw schema's `/uploads/` marker search.
- New tests cover: valid origin acceptance, malformed-truthy rejection,
  non-HTTP(S) protocol rejection, empty/missing rejection, a
  no-throw assertion for `resolveCoverImageSrc`/`buildLocaleAlternates` given
  a malformed origin, and a `/uploads`-constraint rejection for a relative
  same-origin path outside `/uploads/`.

## Summary (unchanged from the original implementation)

Implements the first public-facing Berita reference slice: `/[locale]/berita`
(list) and `/[locale]/berita/[slug]` (detail), plus a reusable
`src/components/public/post/**` presentation layer. Both routes are Server
Components that consume `listPublicPosts` / `getPublicPostDetail` read-only
through `getPrismaClient()`, always passing `type: "BERITA"`, the validated
route locale, the neutral slug, `process.env.UPLOAD_PUBLIC_URL`, and bounded
page input (fixed page size 10). No Prisma access, contract, schema, or
dependency file was touched.

- **Intentional scope reduction (unchanged):** the list page does not render
  the Category/Archive/Search sidebar widgets described in `docs/19-B`/`19-D`
  — the frozen query contract has no category-count, archive, or search
  capability, and the manifest forbids fabricating those. The manifest's own
  "List route requirements" never mention a sidebar.
- Category is still shown as the frozen `categorySlug` verbatim
  (`humanizeCategorySlug` only de-hyphenates it for display), not rendered as
  a link — `/berita/kategori/[slug]` does not exist in this task.
- Sidebar still shows up to 5 latest Berita via `listPublicPosts`, current
  post excluded in presentation (the contract has no `excludeId` filter).
- `translation.value.content` is still re-sanitized with
  `sanitizeRichTextHtml` immediately before render
  (`sanitizeStoredContentOrNull`), failing closed to the translated
  unavailable state on sanitization failure.
- `generateMetadata` and the page still share one `getPublicPostDetail` call
  via `React.cache`.

## API / schema / migration impact

None. No changes to `prisma/**`, `src/generated/**`, `src/contracts/**`,
`src/lib/content/**`, `src/lib/db/**`, `next.config.ts`, `package.json`, or
`package-lock.json`. `listPublicPosts` / `getPublicPostDetail` are consumed
exactly as published, with no direct Prisma queries.

## Files changed since the assignment branch base

```
M  messages/ar.json
M  messages/en.json
M  messages/id.json
A  src/app/[locale]/(public)/berita/[slug]/loading.tsx
M  src/app/[locale]/(public)/berita/[slug]/not-found.tsx
M  src/app/[locale]/(public)/berita/[slug]/page.tsx
A  src/app/[locale]/(public)/berita/loading.tsx
M  src/app/[locale]/(public)/berita/page.tsx
M  src/components/public/post/cover-image.ts
A  src/components/public/post/format.ts
M  src/components/public/post/hreflang.ts
A  src/components/public/post/json-ld.ts
M  src/components/public/post/locale.ts
A  src/components/public/post/pagination.ts
M  src/components/public/post/post-article-body.tsx
M  src/components/public/post/post-breadcrumb.tsx
M  src/components/public/post/post-card-horizontal.tsx
A  src/components/public/post/post-cover-image.tsx
A  src/components/public/post/post-detail-skeleton.tsx
A  src/components/public/post/post-fallback-banner.tsx
A  src/components/public/post/post-json-ld.tsx
A  src/components/public/post/post-list-skeleton.tsx
M  src/components/public/post/post-meta-row.tsx
M  src/components/public/post/post-sidebar-latest.tsx
A  src/components/public/post/post-state-notice.tsx
A  src/components/public/post/sanitize.ts
A  src/components/public/post/site-origin.ts
M  tests/m3/ui/public-post-experience.test.tsx
A  coordination/handoffs/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-claude.md
```

`M` = touched again in the correction pass; `A` = added in the original
implementation and unchanged since. All paths are inside this task's
`allowed_paths`.

## Verification (correction pass, run against `3f0cda7`)

| Command | Result |
| --- | --- |
| `npx vitest run tests/m3/ui/public-post-experience.test.tsx` | PASS — 52/52 |
| `npm run lint` | PASS — 0 errors, 0 warnings |
| `npm run typecheck` | PASS — 0 errors |
| `npm test` | PASS — 484 passed, 69 database-gated skipped, 0 failed |
| `npm run build` | PASS — `/[locale]/berita` and `/[locale]/berita/[slug]` compile as dynamic routes |
| `git diff --check` | PASS — no whitespace errors |
| `TASK_MANIFEST=... TASK_BASE=origin/coordination/m3-claude-public-post-experience-assignment npm run check:scope` | PASS — "30 changed file(s) are within lease" |

Manual smoke test against a running `next dev --port 3004` (still no Berita
rows seeded in this worktree's local database — schema not pushed here):

- `/id/berita`, `/ar/berita/does-not-exist` → both `200`, no crash.
- Confirmed `not-found.tsx` renders `<h1>` by reading the file directly, since
  this worktree's database has no `Post` table — `getPublicPostDetail` throws
  before `notFound()` is ever reached, so the live route instead shows the
  "unavailable" state (same environment limitation noted in the original
  handoff, not a regression from this pass; the automated test suite is the
  authoritative check for this fix).

This worktree's local `.env.local` `DATABASE_URL` fix (`mysql://` →
`postgresql://…`) and the one-time `npm run prisma:generate` from the
original pass are unchanged and still in effect; neither is part of this
commit (the former is gitignored, the latter is a build artifact).

## Untested areas, risks, follow-ups

- No Berita rows exist in this worktree's local database, so the "real data"
  rendering path (populated cards with a genuine fallback banner, a real
  cover image, a real long title/table/code block in an article) was only
  exercised by the unit tests and fixture-shaped data in
  `tests/m3/ui/public-post-experience.test.tsx`, not a live end-to-end
  request. Integration/E2E coverage against seeded PUBLISHED Berita rows is
  DeepSeek's task per the writer/reviewer/tester matrix.
- The "unavailable" (environment/DB-failure) branch of the detail page still
  has no `H1` of its own — this was not part of either review's findings
  (only the standalone `not-found.tsx` was), so it is left as-is; flagging it
  here in case a future accessibility pass wants to address it.
- Skeleton pulse timing still uses Tailwind's default `animate-pulse` (~2s)
  rather than the `1.5s` in `docs/17-H`; a custom timing utility would touch
  `globals.css`, out of this task's `allowed_paths`. Cosmetic only.
- `text-balance`/responsive table-scroll/long-word containment were verified
  by unit assertions on rendered markup and class presence (jsdom has no
  real layout engine), not a visual/Playwright check —
  `tests/security/**` and `e2e/**` are outside this task's `allowed_paths`.
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
- Did not merge, edit task status/lease, rebase integration, or start a
  DeepSeek QA task.
