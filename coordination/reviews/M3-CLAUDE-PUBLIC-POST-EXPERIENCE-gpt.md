# Review — M3 Claude Public Post Experience

- Candidate implementation: `bc34582`
- Candidate handoff: `e79f0a5`
- Assignment base: `27bbed9`
- Reviewer: GPT integrator
- Verdict: **REQUEST_CHANGES**

## Decision

The candidate is structurally sound, stays within its lease, consumes the frozen public Post
query without direct Prisma reads, and passes its automated manifest commands. It is not ready to
merge because two reference-slice acceptance requirements are not actually exercised by the
current tests: fallback-language direction and usable rich-text presentation.

The correction remains on the same Claude task branch and inside the existing lease. Do not open
a replacement implementation, dependency/config task, or DeepSeek E2E task until these bounded
findings are corrected.

## Blocking findings

### M3-UI-01 — Indonesian fallback inherits Arabic RTL and Arabic language semantics

Severity: **Medium — M3 RTL/accessibility gate blocker**

- `src/app/[locale]/(public)/berita/page.tsx:109-121`
- `src/app/[locale]/(public)/berita/[slug]/page.tsx:187-218`
- `src/components/public/post/post-sidebar-latest.tsx:47-52`
- `src/components/public/post/post-card-horizontal.tsx:45-62`

The UI shows a fallback notice but does not apply the contract's `resolvedLocale` to the fallback
title, excerpt, caption, or article body. On `/ar/...`, Indonesian fallback content therefore
inherits `dir="rtl"` and `lang="ar"` from the document. This produces incorrect bidirectional
layout and screen-reader pronunciation. Sidebar fallback items have the same issue.

Required correction:

- carry each result's `translation.resolvedLocale` into list cards and sidebar items;
- wrap the translated content region with its real `lang` and `dir` (`id`/`en` = `ltr`, `ar` =
  `rtl`) while leaving shell labels in the requested locale;
- apply the same semantics to detail H1, translated metadata/caption, and article body;
- add a test that renders Indonesian fallback inside an Arabic ancestor and asserts
  `lang="id" dir="ltr"`; the existing arrow-only RTL test is insufficient.

### M3-UI-02 — `prose-fuspi` is undefined, so sanitized article HTML is visually unformatted

Severity: **Medium — reference design gate blocker**

- `src/components/public/post/post-article-body.tsx:13-16`
- `src/app/globals.css:292` (read-only evidence: only `prose-measure` exists)

`PostArticleBody` names `prose-fuspi`, but neither Tailwind Typography nor a local
`prose-fuspi` utility exists. Tailwind preflight consequently removes useful default margins and
list presentation while tables, blockquotes, links, headings, figures, and images receive no
article styling. The page does not yet satisfy the manifest's "safe article prose" requirement.

Required correction:

- style every sanitizer-allowed rich-text family within the leased component using Tailwind
  descendant selectors: paragraphs, H2-H6, ordered/unordered lists, list items, blockquotes,
  links, figures/figcaptions, images, tables, headings, `pre`, `code`, `hr`, and long words;
- use logical direction-safe styling and horizontal containment for wide tables/code without
  editing `globals.css` or adding a dependency;
- add focused render assertions for list markers/spacing, links, blockquote, responsive table
  containment, and long text.

## Required Web Interface Guidelines corrections

- `src/components/public/post/post-card-horizontal.tsx:45,52` — use `min-w-0` for the flex content
  and an `h2` under the page H1; current `h3` skips a heading level.
- `src/components/public/post/post-sidebar-latest.tsx:47` — add `min-w-0`/word handling so a long
  title cannot force horizontal overflow at 360 px.
- `src/components/public/post/post-breadcrumb.tsx:32-36` — add long-title wrapping/containment.
- `src/app/[locale]/(public)/berita/[slug]/not-found.tsx:22` — use one visible H1 for the standalone
  not-found page instead of a paragraph.
- `src/components/public/post/post-meta-row.tsx:40` — render a machine-readable `dateTime` on
  `<time>` while retaining the locale-formatted label.
- Validate `NEXT_PUBLIC_SITE_URL` once as an HTTP(S) origin before calling `new URL` in
  `generateMetadata` or the detail page. A malformed truthy value currently permits an exception
  for relative covers and invalid JSON-LD/canonical output. Emit absolute structured data only
  when that origin is valid.

## Acceptance evidence

| Command | Result |
| --- | --- |
| Focused UI suite | PASS — 37 passed |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 469 passed, 69 skipped |
| `npm run build` | PASS |
| `git diff --check` | PASS |
| Scope | PASS by manual path comparison; sandbox wrapper returned `spawnSync git EPERM` after Git itself returned the exact 29 in-lease files |

Automated green status does not override the two missing acceptance cases above. After the writer
corrects them, rerun every manifest command, update the existing handoff with the new
implementation SHA and evidence, commit, push the same branch, and stop for re-review.
