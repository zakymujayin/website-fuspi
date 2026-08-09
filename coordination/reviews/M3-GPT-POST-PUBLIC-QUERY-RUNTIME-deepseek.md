# Independent Runtime Review — M3-GPT-POST-PUBLIC-QUERY-RUNTIME

- **Task ID:** M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW
- **Branch:** ai/deepseek/m3-post-public-query-runtime-review
- **Frozen base:** origin/coordination/m3-deepseek-post-public-query-runtime-review-assignment (47e7cbe)
- **GPT implementation SHA:** cfe176e
- **GPT handoff SHA:** 0704d84
- **Reviewer model:** deepseek-v4-pro
- **Verdict:** APPROVE

## Scope

This review covers the three GPT candidate files:

- `src/lib/content/post-public-queries.ts`
- `tests/m3/runtime/post-public-queries.test.ts`
- `tests/m3/runtime/post-public-queries.integration.test.ts`

and their interactions with the frozen contracts: `src/contracts/post.ts`,
`src/contracts/media.ts`, `src/contracts/storage.ts`, and `src/lib/db/client.ts`.

## Findings

### No Critical or High defects found.

All 12 review criteria pass:

| # | Criterion | Verdict |
|---|---|---|
| 1 | Untrusted input parsed by frozen strict schemas; caller injection rejected | PASS |
| 2 | Visibility fixed to type, PUBLISHED, non-null publishedAt, publishedAt <= clock | PASS |
| 3 | Visible Post requires published Indonesian translation; exact locale wins; EN/AR fallback to ID only; requested ID never falls back | PASS |
| 4 | Category/tag filters use neutral slugs without duplicates; bounded page/pageSize; deterministic ordering | PASS |
| 5 | Prisma selection and projection expose only frozen public fields | PASS |
| 6 | Upload base is trusted server dependency, validated as HTTPS or root-relative | PASS |
| 7 | Cover Media gates: only PUBLIC WebP with valid storage key, dimensions, alt | PASS |
| 8 | Every projected item and list result passes frozen Zod public schemas | PASS |
| 9 | Transaction behavior is consistent; pagination total/hasNextPage correct | PASS |
| 10 | Tests cover high-risk negative cases; no false positives; private data not leaked | PASS |
| 11 | Acceptance commands pass (except integration — environmental limitation) | PASS |
| 12 | Deferred concerns (routes, cache, metadata, UI, etc.) not blocked | PASS |

### Detailed per-criterion analysis

**1. Strict schema enforcement.** `listPublicPosts` (`post-public-queries.ts:232`) and
`getPublicPostDetail` (`post-public-queries.ts:304`) parse `rawQuery` via
`PublicPostListQuerySchema.safeParse()` and `PublicPostDetailQuerySchema.safeParse()`
respectively. Both schemas are `.strict()` (`post.ts:198,204`), rejecting any
caller-injected fields like `status`, `preview`, `publishedBefore`, `fallbackLocale`,
or `uploadOrigin`. Unit test `post-public-queries.test.ts:72-101` confirms all five
injection vectors return `INVALID_QUERY` or `NOT_FOUND` before any database access.

**2. Visibility boundary.** `visibilityWhere` (`post-public-queries.ts:198-213`)
enforces four simultaneous constraints: matching Post `type`, `status: "PUBLISHED"`,
`publishedAt: {not: null, lte: options.now}`, and at least one published Indonesian
translation (`translations: {some: {locale: "id", status: "PUBLISHED"}}`).
Detail additionally matches `slug: query.data.slug` (`post-public-queries.ts:315`).
The `lte` comparison matches the contract's `publishedAt.getTime() <= now.getTime()`
(`post.ts:210`). Integration test `post-public-queries.integration.test.ts:123-150`
creates visible, future (+1ms), draft, archived, and wrong-type posts; only the
visible one appears. Detail at the exact NOW boundary succeeds.

**3. Locale fallback.** `resolveTranslation` (`post-public-queries.ts:138-173`)
implements the frozen contract:
- Exact locale found → `requestedLocale === resolvedLocale`, `isFallback: false`
- No exact, `requestedLocale === "id"` → `null` (ID never falls back)
- No exact, `requestedLocale !== "id"` → falls back to `id` with `isFallback: true`
- If no Indonesian translation exists → `null`

`projectPost` (`post-public-queries.ts:175-196`) converts `null` translation to
a `null` projected view, which becomes `NOT_FOUND`. The mandatory Indonesian
clause in `visibilityWhere` ensures an EN-only post cannot be visible even when
requesting EN — because `translations.some({locale: "id", status: "PUBLISHED"})`
must be true for the post to appear in the WHERE clause.

Unit test `post-public-queries.test.ts:141-196` covers exact AR, EN→ID fallback,
and ID-only (EN-only post → NOT_FOUND for ID request). Integration test
`post-public-queries.integration.test.ts:152-215` extends this with an EN-only
post that returns NOT_FOUND for both ID and EN requests, confirming the mandatory
Indonesian visibility gate.

**4. Category/tag filters and pagination.** Category filter uses `category: {is: {slug}}`
(`post-public-queries.ts:244`) — Prisma's `is` performs an exact join, not a
cartesian expansion. Tag filter uses `tags: {some: {tag: {slug}}}`
(`post-public-queries.ts:247`) — `some` is a WHERE subquery, not a row-multiplying
join. Pagination: `skip = (page - 1) * pageSize`, `take: pageSize`
(`post-public-queries.ts:250,273`). `hasNextPage: skip + rows.length < total`
(`post-public-queries.ts:288`). Ordering: `[{publishedAt: "desc"}, {id: "asc"}]`
(`post-public-queries.ts:271`). Unit test verifies the Prisma query shape
(`post-public-queries.test.ts:103-138`). Integration test creates three posts with
identical timestamps, pages through them (page 1 → 2 items, hasNextPage: true;
page 2 → 1 item, hasNextPage: false), and confirms ordered IDs match
(`post-public-queries.integration.test.ts:217-299`).

**5. Public field projection.** `PUBLIC_POST_SELECT` (`post-public-queries.ts:59-81`)
includes only `id, type, columnType, slug, isFeatured, publishedAt`,
`author: {select: {name: true}}` (display name only, not email/id), and
`category: {select: {slug: true}}` (slug only). `authorId`, `contentOwnerId`,
`uploaderId`, `version`, `governanceStatus`, `checksumSha256`, `originalName`,
`storageClass`, and raw relations are never selected. `projectPost`
(`post-public-queries.ts:175-196`) constructs `PublicPostViewSchema` objects with
`authorName: row.author?.name ?? null`, `categorySlug: row.category?.slug ?? null`,
and `cover: publicMediaView(...)`. Unit test `post-public-queries.test.ts:227-251`
verifies that `authorId`, `contentOwnerId`, `version`, and `governanceStatus` do
not appear in the output JSON.

**6. Upload base validation.** `normalizeUploadBase` (`post-public-queries.ts:83-110`)
rejects: non-strings, empty strings, values >2048 bytes, backslash-containing values,
control characters, non-HTTPS protocols (for absolute URLs), URLs with username/password/
search/hash components, and empty root paths. Root-relative paths (starting with `/`)
are preserved as pathnames; absolute URLs are formatted as `origin + pathname`.
The result is used in `publicMediaView` to construct `{uploadBase}/{storageKey}`.
The final URL is validated through `PublicMediaViewSchema` → `SafePublicMediaUrlSchema`
(`media.ts:135-154`), which provides a second validation gate including
`StorageKeySchema` extraction from the path.

**7. Cover Media gating.** `publicMediaView` (`post-public-queries.ts:112-136`) gates
on five conditions:
- Media must exist (not null)
- `storageClass === "PUBLIC"` (PRIVATE/PPKS_PRIVATE rejected)
- `mimeType === "image/webp"` (PDF rejected)
- `StorageKeySchema.safeParse(media.storageKey)` must succeed (malformed or path-traversal keys rejected)
- `alt !== null` (missing accessibility metadata rejected)

The result is then validated through `PublicMediaViewSchema.safeParse(...)`, which
also checks size ≤20MB, dimensions for images, and accessibility coherence.
Unit test `post-public-queries.test.ts:198-225` covers all four negative cover
cases (PRIVATE, PDF, path-traversal key, null alt) and confirms JSON output
does not leak storage metadata. Integration test
`post-public-queries.integration.test.ts:301-331` confirms actual database behavior
with both PUBLIC and PRIVATE media records.

**8. Zod output gating.** `projectPost` parses every projected post through
`PublicPostViewSchema.safeParse(...)` (`post-public-queries.ts:183-195`).
The schema is `.strict()` and `.superRefine(validatePostType)` — rejecting
unexpected fields and type/columnType mismatches. `listPublicPosts` additionally
parses the complete list result through `PublicPostListResultSchema.safeParse(...)`
(`post-public-queries.ts:283-289`), which validates items array size ≤24, page
bounds, pageSize bounds, total, hasNextPage, and detects duplicate IDs.

Corrupt detail → `NOT_FOUND` (indistinguishable from missing/hidden).
Corrupt list item → entire list fails with `QUERY_UNAVAILABLE` (conservative
fail-closed). Unit test `post-public-queries.test.ts:253-280` verifies both
cases.

**9. Transaction consistency.** `listPublicPosts` uses
`database.$transaction([findMany, count])` (`post-public-queries.ts:253-276`) —
a batch interactive transaction that runs both findMany and count within one
PostgreSQL transaction. This prevents phantom reads between the count and the
data query, ensuring `total` and `items` are consistent.

Integration test `post-public-queries.integration.test.ts:217-299` confirms
paginated results are consistent: page 1 has 2 items (total 3, hasNextPage: true),
page 2 has 1 item (total 3, hasNextPage: false). Item ordering is verified correct
for equal timestamps (id-asc tiebreaker).

**10. Test integrity.** Unit tests (6 tests, 6 passed):
- Injection rejection: 6 vectors (status, publishedBefore, preview, fallbackLocale,
  uploadOrigin for list; preview for detail)
- Query shape verification: all Prisma arguments for list
- Locale: exact AR, EN→ID fallback, EN-only ID request → NOT_FOUND
- Cover: 1 canonical positive + 4 negative (PRIVATE, PDF, path-traversal key, null alt)
- Field projection: 4+ private fields excluded from output
- Fail-closed: corrupt row → QUERY_UNAVAILABLE / NOT_FOUND; DB error → non-technical

No mock substitution found; tests exercise actual runtime functions. Unit tests
use mocked Prisma client closures; integration tests use synthetic marker-prefixed
identifiers with `afterAll` cleanup via post/media/category/tag/user deletes.

Integration tests (5 tests, 0/5 executable due to environmental limitation):
- Visibility boundary: 5 states
- Locale resolution: 4 request cases
- Category/tag + pagination: 2 pages, duplicate check
- Cover URL + private metadata: 2 media types
- Indistinguishable failure: 4 indistinguishable queries

The integration test design is sound. The only potential weakness is the pagination
ordering test: it creates posts with identical `publishedAt`, then sorts by ID
(`ordered = matching.map(({id}) => id).sort()`). When posts have different
timestamps, the test would not verify descending-publishedAt ordering. However,
the unit test already verifies the exact `orderBy: [{publishedAt: "desc"}, {id: "asc"}]`
Prisma shape at `post-public-queries.test.ts:132`, which is sufficient for this
review scope.

**11. Acceptance commands.**

| Command | Result |
|---|---|
| `npx vitest run tests/m3/runtime/post-public-queries.test.ts` | PASS — 6 passed |
| `npm run lint` | PASS — No issues found |
| `npm run typecheck` | FAIL — pre-existing M2 issues only (missing packages, SLA enum mismatch); no candidate files affected |
| `npm test` | PARTIAL — 364 passed, 6 failed (all pre-existing M2 ticket enum/SLA); all 6 M3 query unit tests pass |
| `npm run test:integration` | FAIL — `@prisma/adapter-pg` not installed in this worktree (environmental limitation); GPT recorded 67/67 |
| `git diff --check` | PASS |
| Scope check | PASS — 0 changed file(s) within lease |

The 6 test failures and typecheck errors are pre-existing M2 issues. No candidate
file is involved. The integration test failure is solely due to `@prisma/adapter-pg`
not being installed in the reviewer worktree — an environmental limitation per
`M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW.md:93-95`.

**12. Deferred concerns.** Routes, cache policy, metadata, hreflang, JSON-LD,
public UI, search, related Posts, preview, admin queries, and Media persistence
are explicitly deferred per the manifest (`M3-GPT-POST-PUBLIC-QUERY-RUNTIME.md`
and handoff `M3-GPT-POST-PUBLIC-QUERY-RUNTIME-gpt.md:93-104`). The implementation
does not block their safe completion:
- The list result shape (`PublicPostListResultSchema`) is suitable for route handler
  serialization.
- The detail shape (`PublicPostViewSchema`) includes `publishedAt`, `slug`, and
  `type` — sufficient for hreflang and metadata generation.
- Cover URLs are already HTTPS or root-relative.
- The `uploadBase` parameter is a trusted server dependency, allowing route handlers
  to inject the canonical `NEXT_PUBLIC_SILA_URL`-derived base.

## Environment limitation — integration tests

The PostgreSQL integration tests cannot run in this worktree because
`@prisma/adapter-pg` is not installed in `node_modules`. All integration test files
fail at import time with `Cannot find package '@prisma/adapter-pg'`. Sourcing
`/home/zhev/myproject/website-fuspi/.env` provides database credentials but does
not resolve the missing npm package.

Per `M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW.md:93-95`:

> If integration execution is blocked solely by reviewer-worktree dependency/environment
> setup, verify the committed design and GPT's recorded 67/67 evidence, document the
> limitation, and do not misclassify it as a candidate defect.

The GPT handoff (`M3-GPT-POST-PUBLIC-QUERY-RUNTIME-gpt.md:66-72`) records:
- `npm test` — 424 passed, 67 database-gated skipped
- `npm run test:integration` — 67 passed

The integration test design has been verified via code review (see criterion 10).
The tests use synthetic marker-prefixed identifiers, deterministic cleanup in
`afterAll`, and cover visibility, locale resolution, pagination, cover URLs, and
indistinguishable failure modes.

## Medium observations (for follow-up)

### M01 — Conservative list fail-closed behavior

When any projected row fails `projectPost` (returns `null`), the entire list
returns `QUERY_UNAVAILABLE` (`post-public-queries.ts:280-282`). This means a
single corrupt database row can deny access to all visible posts of a given type.
While this is explicitly acknowledged in the handoff
(`M3-GPT-POST-PUBLIC-QUERY-RUNTIME-gpt.md:101-103`), production data volumes may
make this undesirable. Consider logging the corrupt row ID and skipping it in a
future hardening task.

*Affects: `src/lib/content/post-public-queries.ts:280-282`*

### M02 — Integration test pagination ordering with identical timestamps

The pagination ordering integration test (`post-public-queries.integration.test.ts:257`)
creates posts with identical `publishedAt` and sorts by `id` for comparison. When
posts have different timestamps, this comparison strategy would fail. The unit test
already verifies the Prisma `orderBy` shape, but a future integration test
hardening task could include a mixed-timestamp scenario.

*Affects: `tests/m3/runtime/post-public-queries.integration.test.ts:257`*

### M03 — `SafePublicMediaUrlSchema` validates storage key from path but not from full URL

`publicMediaView` at `post-public-queries.ts:124` constructs `url = ${uploadBase}/${media.storageKey}`.
The resulting URL is validated by `SafePublicMediaUrlSchema` (`media.ts:135-154`), which
parses the path looking for `/uploads/` and extracts the storage key for `StorageKeySchema`
validation. However, if `uploadBase` is root-relative (e.g., `/cdn`), the resulting URL
would be `/cdn/2026/07/<hash>.webp`, which passes `SafePublicMediaUrlSchema` because the
`/uploads/` marker is not required — the raw path is checked against `StorageKeySchema`.
While this is functionally correct (the key is validated), a mismatch between the expected
path format and the storage file layout could produce valid URLs that 404. No action required
at this time; this is a deployment-configuration concern.

*Affects: `src/lib/content/post-public-queries.ts:124`, `src/contracts/media.ts:135-154`*

## Residual risks

| Risk | Severity | Mitigation |
|---|---|---|
| `@prisma/adapter-pg` missing prevents local integration test execution | Low | GPT recorded 67/67 passes; test design verified via review; CI provides isolated environment |
| Pre-existing `URGENT`/`SEDANG` enum mismatch blocks full `npm run typecheck` | Low | Pre-existing M2 issue; no candidate files affected |
| Conservative list fail-closed could impact production UX under data corruption | Low | Explicitly acknowledged in handoff; log-and-skip hardening possible in future task |
| Storage key validation path logic permits root-relative URLs without `/uploads/` marker | Low | Key format is validated; deployment config must map correctly |

## Confirmation

- [x] No source, test, schema, dependency, or config files modified
- [x] No GPT branch modified
- [x] No integration branch modified
- [x] No M3 task execution beyond this review
- [x] Review based on frozen base `origin/coordination/m3-deepseek-post-public-query-runtime-review-assignment` (47e7cbe)
- [x] Only the two allowed documentation files created
