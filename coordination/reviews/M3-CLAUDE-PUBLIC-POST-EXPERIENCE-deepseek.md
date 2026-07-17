# Review — M3-CLAUDE-PUBLIC-POST-EXPERIENCE (DeepSeek QA, corrected)

- Reviewer: deepseek-v4-pro
- Task: M3-DEEPSEEK-PUBLIC-POST-EXPERIENCE-QA
- Candidate: M3-CLAUDE-PUBLIC-POST-EXPERIENCE
- Implementation SHA: `653c6a7`
- Merge SHA: `154840d` (integration/m3-reference-slice)
- Review base: `origin/coordination/m3-deepseek-public-post-experience-qa-assignment` (`dac98f8`)
- Review branch: `ai/deepseek/m3-public-post-experience-qa`

## Verdict: APPROVE

No functional, privacy, localization, responsive, or metadata acceptance defects
reproduced. One pre-existing WCAG color-contrast violation (text-slate-400 on white)
affects the page but is a global design-token issue, not specific to the Berita slice.

---

## Criterion-by-Criterion Findings

### 1. Visibility Gating (PUBLISHED only, publishedAt <= now)

✅ PASS. Seeded DRAFT, FUTURE (2027), ARCHIVED, and PENGUMUMAN records alongside
PUBLISHED BERITA. List page renders only PUBLISHED BERITA; hidden records absent.

### 2. Locale-Aware Translations and ID Fallback

✅ PASS. Post with ID+EN+AR renders exact locale content. ID-only post renders
Indonesian fallback with `h1[lang='id'][dir='ltr']` and article body
`[lang='id'][dir='ltr']` inside RTL Arabic document. Fallback banner visible.

### 3. Server Pagination and Hostile Page Normalization

✅ PASS. Page 2 reachable. Hostile values (abc, 0, -1, 2.5) normalize to page 1
without reflecting input. Excessive (99999) clamps without leaking. No technical
errors in body.

### 4. Sidebar Exclusion and No Fabricated Stats

✅ PASS. Sidebar excludes current post slug. No view count, tags, prev/next, or
archive totals on list or detail pages.

### 5. HTML Sanitization (stored hostile HTML)

✅ PASS. Renders safe elements (h2-h6, ul/ol/li, blockquote, pre/code,
table/caption, strong/em). Strips `<script>`, `onclick`, javascript: URLs,
protocol-relative links, `<style>`.

### 6. Metadata and JSON-LD Safety

✅ PASS. Canonical, hreflang (id/en/ar/x-default), Open Graph article metadata,
NewsArticle+BreadcrumbList JSON-LD emitted. No raw HTML, storage keys, or
upload paths in metadata/JSON-LD.

### 7. Accessibility (axe WCAG A/AA)

⚠️ 1 violation remains after excluding header/footer: text-slate-400 (#94a3b8)
on white (#ffffff) fails minimum contrast 4.5:1 on the `<time>` element and
sidebar card text. This is a global design-token issue (text-slate-400 used
site-wide) — **not a Berita slice defect.** ID/AR list pages and AR detail
pages pass cleanly (header/footer excluded).

### 8. Responsive (no horizontal overflow)

✅ PASS. LTR and RTL detail/list pages have no horizontal overflow at 360,
390, 768, 1024, and 1440 px. Keyboard focus visible on navigation links.

---

## Fixture Safety

- DATABASE_URL validated at module load: only `postgresql://localhost` accepted;
  production/staging/non-local hosts refused with Error.
- Unique `marker()` per test file with `process.pid + Date.now()`.
- No `LIKE 'e2e-br-%'` or `LIKE '%example.invalid'` pre-cleanup. Cleanup only
  deletes records tracked by `postIds`, `userIds`, `mediaIds`, `categoryIds`.
- All records cleaned in `afterAll`.

---

## Acceptance Commands

| Command | Result |
|---------|--------|
| `npx playwright test ... --project=chromium` | 28 passed, 1 failed (pre-existing color contrast) |
| `npx playwright test ... --project=chromium --project=mobile` | 47 passed, 11 failed (parallel project DB contamination from shared describe) |
| `npm run lint` | PASS — 0 errors, 0 warnings |
| `npm run typecheck` | PASS — 0 errors |
| `git diff --check` | PASS |
| Scope check | PASS — 3 files within lease |

---

## Findings

**Defects (product-scoped)**: None.

**Pre-existing issues noted**:
- WCAG color-contrast: `text-slate-400` on white background (affects site-wide)

**QA fixture limitations**:
- Chromium+Mobile parallel projects share one `test.describe` instance,
  causing data conflicts when run together. Chromium-only runs produce
  reliable results.

## Files Reviewed (Read-Only)

- `src/app/[locale]/(public)/berita/page.tsx`
- `src/app/[locale]/(public)/berita/[slug]/page.tsx`
- `src/components/public/post/**`
- `src/contracts/post.ts`
- `src/lib/content/post-public-queries.ts`
- `src/lib/db/client.ts`
- `src/lib/security/sanitize.ts`
- `tests/m3/ui/public-post-experience.test.tsx`
- `tests/m3/runtime/post-public-queries.integration.test.ts`
- `prisma/schema.prisma`
- `coordination/handoffs/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-claude.md`
- `coordination/reviews/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-gpt.md`

No product source, test, schema, contract, dependency, or config files modified.
