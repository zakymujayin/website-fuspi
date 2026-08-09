# Handoff — M3-CLAUDE-POST-ADMIN-LIST

- **Task ID:** `M3-CLAUDE-POST-ADMIN-LIST`
- **Branch:** `ai/claude/m3-post-admin-list`
- **Base SHA:** `08196f5`
- **Author:** Claude Sonnet 5, standing in for the Claude lane while Codex and DeepSeek are both out
  of usage limit (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).

## Independence caveat

The manifest names GPT as reviewer and DeepSeek as tester. Neither can run. The same model wrote
this UI, wrote its tests, and will merge it as integrator. **No independent party reviewed it.**
Runtime evidence below is reproducible so a real reviewer can re-check it on return.

## Summary

Read-only admin Post list at `/[locale]/admin/posts`, reusing the presentation pattern frozen by
`M3-CLAUDE-MEDIA-LIBRARY-BROWSE`. Presentation only — no new query, action, route handler, or
server behaviour. Reads through the already-merged `listAdminPosts` transport.

## Files changed

- `src/app/[locale]/admin/posts/page.tsx` — Server Component route
- `src/app/[locale]/admin/posts/loading.tsx` — streamed loading shell
- `src/components/admin/posts/post-query.ts` — fail-closed search-param normalization, href builder,
  pagination maths, frozen-transport query builder
- `src/components/admin/posts/post-safe-load.ts` — route-level failure boundary
- `src/components/admin/posts/post-format.ts` — Asia/Jakarta instants, locale availability
- `src/components/admin/posts/post-status-badge.tsx` — publication-state badge
- `src/components/admin/posts/post-filter-tabs.tsx` — status filter
- `src/components/admin/posts/post-list.tsx` — rows
- `src/components/admin/posts/post-pagination.tsx` — windowed pagination
- `src/components/admin/posts/post-state-notice.tsx` — empty vs unavailable
- `src/components/admin/posts/post-list-skeleton.tsx` — loading skeleton
- `messages/{id,en,ar}.json` — additive `AdminPostList` namespace only
- `tests/m3/ui/admin-post-list.test.tsx` — 49 tests

## Deviation from the manifest — read this

The manifest's scope item 2 said the filter covers "draft / scheduled / published / archived".
**That was wrong against the frozen contract and was not implemented as written.**
`AdminPostListQuerySchema.status` accepts only `ALL | DRAFT | PUBLISHED | ARCHIVED`; `SCHEDULED` is
a *publication state*, not a filterable status — the contract derives it for a `PUBLISHED` row whose
`publishedAt` is in the future. Implemented accordingly: four filter tabs, and `SCHEDULED` shown as
a distinct badge. Verified at runtime (a future-dated post renders "Terjadwal" / "مجدول").

## API / schema / migration impact

None. No contract, schema, migration, dependency, config, or `src/lib/**` change.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS — no issues |
| `npx tsc --noEmit` | PASS — no errors |
| `npx vitest run tests/m3/ui/admin-post-list.test.tsx` | PASS — 49/49 |
| `npm test` | PASS — 44 files, 628 passed, 0 failed |
| `npm run build` | PASS — `/[locale]/admin/posts` registered |

### Tests were mutation-checked, not just observed green

The suite passed on first run, so two deliberate mutations confirmed it can fail:

1. disabling the unknown-query-key rejection in `normalizeAdminPostQuery` → 1 test failed;
2. changing `JAKARTA_TIME_ZONE` to `UTC` → 1 test failed.

Both were reverted and the suite returned to 49/49.

### Runtime evidence (PostgreSQL-backed, not just unit tests)

Dev server on `127.0.0.1:3004` against the isolated `fuspi_m3_media_library_qa_audit` database with
three synthetic posts (published, draft, and future-dated i.e. scheduled):

- authenticated ADMIN sees all three rows and the "3 berita" count;
- `?status=DRAFT` returns only the draft, count "1 berita";
- hostile `?status=DRAFT&pageSize=999&evil=1` collapses to canonical page-1/ALL (3 rows) — the
  fail-closed rule holds against an unknown key combined with a valid one;
- `/ar/admin/posts` renders `dir="rtl"` with genuine Arabic copy including مجدول and مسودة;
- unauthenticated request leaks **no** post title; it streams the loading shell and then redirects,
  matching the Media route's behaviour.

This runtime pass is what proved the dynamic ``t(`state.${state}`)`` key resolves — unit tests
could not have caught a next-intl failure there.

All synthetic fixtures were deleted afterwards; the database and worktree were left clean.

## Untested areas and risks

- **No browser/axe/viewport E2E.** Only unit plus manual runtime checks. The Media Library slice got
  an 84/84 Playwright suite; this one has none yet and needs an equivalent QA task.
- EDITOR ownership scoping is enforced by the already-merged transport and was **not** re-verified
  here with an EDITOR session — only ADMIN was exercised at runtime. An ownership/IDOR browser test
  remains on the M3 exit list.
- `totalPagesFor` and `buildPaginationItems` are duplicated from the Media module. The manifest
  forbade touching `src/components/admin/media/**`, so extraction into a shared primitive needs its
  own task; the duplicate is currently identical and will drift if either side changes.
- `sort` and `search` are contract-supported but deliberately not exposed in v1; the transport query
  pins `sort: UPDATED_DESC`, `search: ""`.

## Follow-ups

1. DeepSeek (or stand-in) QA task: PostgreSQL-backed Playwright suite for this route, including
   EDITOR-vs-ADMIN ownership, axe WCAG A/AA on ID and AR, and viewport checks.
2. Extract shared admin pagination primitives out of the Media and Post modules.
3. Post editor UI (create/edit, autosave, publish/schedule/archive) — the remaining M3 exit gap.

## Requested contract/dependency change

None.
