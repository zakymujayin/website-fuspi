# Handoff — M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW

- Task ID: `M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW`
- Branch: `ai/deepseek/m3-post-public-query-runtime-review`
- Frozen base SHA: `47e7cbe`
  (`origin/coordination/m3-deepseek-post-public-query-runtime-review-assignment`)
- GPT implementation SHA: `cfe176e`
- GPT handoff SHA: `0704d84`
- Head SHA: recorded by the following documentation commit

## Verdict

**APPROVE** — No reproducible Critical or High runtime defect found.

## Summary

Performed an independent adversarial review of the three GPT candidate files
(`src/lib/content/post-public-queries.ts`,
`tests/m3/runtime/post-public-queries.test.ts`,
`tests/m3/runtime/post-public-queries.integration.test.ts`) against the 12
review criteria defined in
`M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW.md`. All criteria pass.

The runtime correctly enforces: strict schema parsing, server-clock visibility
boundary, mandatory Indonesian translation with locale fallback, neutral-slug
category/tag filtering, bounded pagination with deterministic ordering, frozen
public field projection, upload-base validation, cover Media gating (only
PUBLIC WebP with valid key/dimensions/alt), and Zod output gating.

## Files changed

- `coordination/reviews/M3-GPT-POST-PUBLIC-QUERY-RUNTIME-deepseek.md`
- `coordination/handoffs/M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW-deepseek.md`

## Acceptance evidence

| Command | Result |
|---|---|
| `npx vitest run tests/m3/runtime/post-public-queries.test.ts` | PASS — 6 passed |
| `npm run lint` | PASS |
| `npm run typecheck` | FAIL — pre-existing M2 issues; no candidate files affected |
| `npm test` | PARTIAL — 364 passed, 6 failed (pre-existing M2); all 6 M3 query unit tests pass |
| `npm run test:integration` | FAIL — `@prisma/adapter-pg` not installed (environmental); GPT recorded 67/67 |
| `git diff --check` | PASS |
| Scope check | PASS |

## Key findings

- All 12 review criteria pass without Critical or High defects.
- Caller injection of `status`, `preview`, `publishedBefore`, `fallbackLocale`,
  and `uploadOrigin` is rejected before database access.
- Visibility is fixed: matching type, PUBLISHED, non-null publishedAt ≤ server UTC clock,
  and mandatory published Indonesian translation.
- Exact locale preferred; EN/AR falls back only to Indonesian; requested Indonesian
  never falls back. EN-only posts are invisible for all locale requests.
- Category/tag filters use neutral slugs without duplicating parent rows.
  Pagination, total, and hasNextPage are bounded and consistent via
  `$transaction([findMany, count])`.
- Only frozen public fields escape: `authorName` (not `authorId`),
  `categorySlug` (not `categoryId`), `cover: url` (not `storageKey`/`storageClass`).
- Cover URLs are HTTPS or root-relative, joined only from the trusted upload base
  and validated storage key.
- Only PUBLIC WebP cover Media with valid dimensions and alt text is exposed;
  everything else → `cover: null` without disclosing metadata.
- Corrupt detail → `NOT_FOUND` (indistinguishable from missing). Corrupt list
  → `QUERY_UNAVAILABLE` (conservative fail-closed). Database errors → non-technical
  stable codes.
- Integration tests cannot run locally due to missing `@prisma/adapter-pg`
  (environmental limitation). GPT recorded 67/67 passes; test design verified
  via code review.

## Medium observations

Three Medium follow-ups recorded in the review document:

1. M01 — Conservative list fail-closed behavior (acknowledged in handoff)
2. M02 — Integration test pagination ordering with identical timestamps
3. M03 — SafePublicMediaUrlSchema path extraction nuance

None block integration.

## Environment limitation

`npm run test:integration` fails because `@prisma/adapter-pg` is not installed
in this worktree's `node_modules`. GPT's recorded evidence (67/67 integration
passes) is accepted per the manifest's environmental limitation clause. The
integration test design has been verified via code review.

## Untested areas, risks, and follow-ups

- HTTP/Server Action transport, cache policy, metadata, hreflang, JSON-LD,
  public routes remain deferred.
- Public UI, loading/error states, RTL rendering, accessibility remain
  deferred to Claude lane.
- Search, related Posts, sitemap integration, preview, admin queries,
  and Media persistence remain deferred.
- The conservative list fail-closed behavior may need log-and-skip hardening
  for production.

## Contract/dependency requests

None. No schema, contract, dependency, config, or integration branch change
requested.

## Confirmation

- [x] No source, test, schema, dependency, or config files modified
- [x] Only the two allowed documentation files created
- [x] No GPT branch, integration branch, or other agent branch modified
- [x] No merge performed
- [x] Review based on frozen base SHA `47e7cbe`
