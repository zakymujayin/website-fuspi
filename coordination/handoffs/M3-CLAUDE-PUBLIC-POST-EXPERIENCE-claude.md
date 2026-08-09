# Handoff — M3-CLAUDE-PUBLIC-POST-EXPERIENCE

- **Task ID:** M3-CLAUDE-PUBLIC-POST-EXPERIENCE
- **Branch:** `ai/claude/m3-public-post-experience`
- **Assignment branch (lease base):** `origin/coordination/m3-claude-public-post-experience-assignment`
- **Base SHA:** `27bbed9e75e338db5fe0b1d703aab33a96ee0bd9`
- **Original implementation SHA:** `bc3458257ab5b451f34a6281fab12cc7dfabf04c`
- **Original handoff SHA:** `e79f0a5`
- **Reviewed by:** GPT integrator — `coordination/reviews/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-gpt.md` on `origin/integration/m3-reference-slice` — verdict **REQUEST_CHANGES**
- **Correction implementation SHA:** `3f0cda753dd3a95dce96d5e42cac29dea3656021`
- **Correction handoff SHA:** `09cfb83`
- **Correction re-review:** same review document, "Correction re-review — 3f0cda7 / 09cfb83" section — two exact residuals, no other design decision reopened
- **Final (micro-correction) implementation SHA:** `653c6a7eef1393c13cf5253c86301987e82d46a7`
- **Final handoff SHA:** recorded by the commit that adds this update (see branch head)

## Micro-correction pass — closure of the two re-review residuals

### Residual 1 — Breadcrumb fallback title still inherited page `dir`/`lang` — **FIXED**

`PostBreadcrumbItem` now takes an optional `resolvedLocale`. When set, that
crumb gets its own `lang`/`dir` via the existing `LOCALE_DIRECTION` map,
independent of the page's own direction; when unset (the default for shell
labels), the crumb renders with no `lang`/`dir` override, same as before.

- `src/components/public/post/post-breadcrumb.tsx`: `PostBreadcrumbItem`
  gains `resolvedLocale?: AppLocale`; both the current-page `span` and the
  linked-crumb `Link` spread `{ lang, dir }` computed from it when present.
- `src/app/[locale]/(public)/berita/[slug]/page.tsx`: the title crumb now
  passes `resolvedLocale: post.translation.resolvedLocale`. The Beranda/Berita
  shell crumbs are untouched — they keep coming from `getTranslations()` in
  the page's requested locale, as the residual explicitly required.
- New test renders the breadcrumb inside `<div dir="rtl" lang="ar">` with an
  Indonesian-fallback title crumb and asserts that crumb's own `lang="id"
  dir="ltr"`, while the shell crumbs have no `lang`/`dir` attribute at all.

### Residual 2 — `PostStateNotice` title was a `<p>`, so the detail unavailable state had no H1 — **FIXED**

`PostStateNotice` now takes a required `headingAs: "h1" | "h2"` prop and
renders `title` in that tag instead of always using a paragraph.

- Detail route, env/DB-failure branch (returns *before* the article `H1`
  renders — the only heading-bearing content on that response): `headingAs="h1"`.
- Detail route, in-article unavailable fallback (renders *after* the article
  `H1` already exists): `headingAs="h2"`.
- List route, both the query-unavailable and empty-archive states (the page
  already has its own `H1` via `SectionHeading`): `headingAs="h2"`.
- New tests assert: `headingAs="h1"` renders an `<h1>` and no `<h2>`;
  `headingAs="h2"` renders an `<h2>` and no `<h1>`; and a combined render of
  the detail page's two simultaneous notices (h1 before the article, h2
  inside it) still yields exactly one `<h1>` and one `<h2>` in the tree.

## Correction pass (3f0cda7) — closure of the original two blocking findings

### M3-UI-01 — Indonesian fallback inherited Arabic RTL/language semantics — **FIXED**

`translation.resolvedLocale` is carried into every place translated content
renders, independent of the page's requested locale:

- `PostCardHorizontal` (list cards) takes a `resolvedLocale` prop and wraps the
  title (`h2`) and excerpt (`p`) with `lang={resolvedLocale} dir={...}`.
- `PostSidebarLatest` items each take `resolvedLocale`; the title `span` is
  wrapped the same way.
- The detail page wraps the `H1`, the cover `figcaption`, and passes
  `resolvedLocale` into `PostArticleBody`, which wraps its root element with
  `lang`/`dir`.
- Direction is computed from a `LOCALE_DIRECTION` map in `locale.ts`
  (`id`/`en` → `ltr`, `ar` → `rtl`) — the single source of truth for content
  direction, separate from the page's own `dir`.
- Shell labels (breadcrumb static labels, buttons, pagination) are untouched —
  they still come from `getTranslations()` in the page's requested locale.
- Tests render each content type inside a `<div dir="rtl" lang="ar">`
  ancestor and assert the inner element's own `lang="id" dir="ltr"`.

### M3-UI-02 — `prose-fuspi` undefined, sanitized HTML unstyled — **FIXED**

`PostArticleBody` no longer references `prose-fuspi`. It carries an
`ARTICLE_PROSE_CLASSES` list of Tailwind arbitrary descendant-variant
utilities (`[&_p]:...`, `[&_h2]:...`, etc.) covering every tag
`sanitizeRichTextHtml`'s `ALLOWED_TAGS` permits: `p`, `h2`–`h6`, `ul`/`ol`/`li`,
`blockquote`, `a`, `figure`/`figcaption`, `img`, `table`/`caption`/`th`/`td`,
`pre`/`code`, `hr`. Tables get `block` + `overflow-x-auto` + `max-w-full` so a
wide table scrolls inside itself instead of the page; `pre` gets the same
treatment; `break-words` is applied per text-bearing tag. Every directional
utility is logical (`ps-6`, `border-s-4`, `text-start`). No `globals.css`
edit, no dependency added.

### Web Interface Guidelines corrections — **FIXED**

- `PostCardHorizontal` renders an `h2` (was `h3`) under the page's `h1`.
- `min-w-0` on the card content column and sidebar text column, `break-words`
  on card title/excerpt, sidebar title, and breadcrumb items.
- `not-found.tsx` renders `<h1>{t("notFound.title")}</h1>` instead of a `<p>`.
- `PostMetaRow`'s `<time>` renders `dateTime={dateTimeIso}` alongside the
  locale-formatted label.
- `text-balance` on the card `h2`, detail `h1`, `not-found.tsx` `h1`, and the
  article body's `h2`.

### URL robustness — **FIXED**

- `src/components/public/post/site-origin.ts` exports `validateSiteOrigin(raw)`,
  validating `NEXT_PUBLIC_SITE_URL` once as a real `http:`/`https:` origin
  before any `new URL(path, origin)` call; returns `null` for anything else,
  including a malformed-but-truthy value that would otherwise throw.
- Both `page.tsx` files compute the validated origin once and pass it (never
  the raw env var) into `resolveCoverImageSrc`, `buildLocaleAlternates`, and
  the direct `new URL(cover.src, siteOrigin)` calls for the absolute OG/JSON-LD
  image.
- `resolveCoverImageSrc` also rejects a resolved local path that isn't under
  `/uploads/`, even when relative and same-origin.

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
  capability, and the manifest forbids fabricating those.
- Category is shown as the frozen `categorySlug` verbatim
  (`humanizeCategorySlug` only de-hyphenates it for display), not rendered as
  a link — `/berita/kategori/[slug]` does not exist in this task.
- Sidebar shows up to 5 latest Berita via `listPublicPosts`, current post
  excluded in presentation (the contract has no `excludeId` filter).
- `translation.value.content` is re-sanitized with `sanitizeRichTextHtml`
  immediately before render (`sanitizeStoredContentOrNull`), failing closed
  to the translated unavailable state on sanitization failure.
- `generateMetadata` and the page share one `getPublicPostDetail` call via
  `React.cache`.

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
M  src/components/public/post/post-state-notice.tsx
A  src/components/public/post/sanitize.ts
A  src/components/public/post/site-origin.ts
M  tests/m3/ui/public-post-experience.test.tsx
A  coordination/handoffs/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-claude.md
```

`M` = touched again in this micro-correction pass; files touched only in the
earlier correction pass or the original implementation keep their original
marker. All paths are inside this task's `allowed_paths`. Files touched only
in this pass: `src/app/[locale]/(public)/berita/[slug]/page.tsx`,
`src/app/[locale]/(public)/berita/page.tsx`,
`src/components/public/post/post-breadcrumb.tsx`,
`src/components/public/post/post-state-notice.tsx`,
`tests/m3/ui/public-post-experience.test.tsx`.

## Verification (micro-correction pass, run against `653c6a7`)

| Command | Result |
| --- | --- |
| `npx vitest run tests/m3/ui/public-post-experience.test.tsx` | PASS — 55/55 |
| `npm run lint` | PASS — 0 errors, 0 warnings |
| `npm run typecheck` | PASS — 0 errors |
| `npm test` | PASS — 487 passed, 69 database-gated skipped, 0 failed |
| `npm run build` | PASS — `/[locale]/berita` and `/[locale]/berita/[slug]` compile as dynamic routes |
| `git diff --check` | PASS — no whitespace errors |
| `TASK_MANIFEST=... TASK_BASE=origin/coordination/m3-claude-public-post-experience-assignment npm run check:scope` | PASS — "30 changed file(s) are within lease" |

This worktree's local `.env.local` `DATABASE_URL` fix (`mysql://` →
`postgresql://…`) and the one-time `npm run prisma:generate` from the first
pass are unchanged and still in effect; neither is part of this commit (the
former is gitignored, the latter is a build artifact). The database still has
no `Post` table locally, so a live curl smoke test cannot reach either the
`not-found.tsx` route or a populated detail page — the automated test suite
is the authoritative check for both residual fixes in this pass, same
limitation as the prior two passes.

## Untested areas, risks, follow-ups

- No Berita rows exist in this worktree's local database, so the "real data"
  rendering path (populated cards with a genuine fallback banner, a real
  cover image, a real long title/table/code block in an article, a real
  breadcrumb fallback title) was only exercised by the unit tests and
  fixture-shaped data in `tests/m3/ui/public-post-experience.test.tsx`, not a
  live end-to-end request. Integration/E2E coverage against seeded PUBLISHED
  Berita rows is DeepSeek's task per the writer/reviewer/tester matrix.
- Skeleton pulse timing still uses Tailwind's default `animate-pulse` (~2s)
  rather than the `1.5s` in `docs/17-H`; a custom timing utility would touch
  `globals.css`, out of this task's `allowed_paths`. Cosmetic only.
- `text-balance`/responsive table-scroll/long-word containment/heading-level
  correctness were verified by unit assertions on rendered markup (jsdom has
  no real layout engine), not a visual/Playwright check — `tests/security/**`
  and `e2e/**` are outside this task's `allowed_paths`.
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
- Did not reopen any other design decision from the correction re-review.
- Did not merge, edit task status/lease, rebase integration, or start a
  DeepSeek QA task.
