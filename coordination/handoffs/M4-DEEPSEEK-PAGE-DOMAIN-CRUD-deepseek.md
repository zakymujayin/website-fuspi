# M4-DEEPSEEK-PAGE-DOMAIN-CRUD — DeepSeek Handoff

- **Task ID:** M4-DEEPSEEK-PAGE-DOMAIN-CRUD
- **Branch:** `ai/deepseek/m4-page-domain-crud`
- **Base SHA:** `049cb759beb393b44f6fe91217d357761cffffb5` (origin/integration/m4-features)
- **Previously Reviewed Implementation:** `db5e7d2cc1a622e7b8bd8b79dbf6297904fb0b26`
- **Previous Correction Head:** `f79eaeacd0b379d26e77592d8c8b3c2061c59cb4`
- **Final Corrected Implementation Head SHA:** `e09cf6eef84fbb4b5ce8020eedc1c4cb669b09a0`
- **Database:** `fuspi_dev_deepseek` (PostgreSQL 16, isolated local)

## Full Branch Diff (6 files)

```
coordination/handoffs/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-deepseek.md
src/features/content/pages/contract.ts
src/features/content/pages/mutations.ts
src/features/content/pages/queries.ts
tests/m4/content/pages/page-mutations.integration.test.ts
tests/m4/content/pages/page-mutations.test.ts
```

## Correction Pass Summary

Final correction pass — all mandatory items addressed.

### 1. Post-sanitization validation
- `sanitizeTranslations` re-validates every sanitized locale through `PageTranslationInputSchema.safeParse()`.
- Any sanitized content exceeding schema limits (e.g., `content > 1,000,000` chars after entity expansion) throws `ContentSanitizationError`, caught as `VALIDATION_FAILED` *before* the database transaction opens.
- Unit test: 205,000 `&` chars expand to `&amp;` × 205,000 = 1,025,000 chars during DOM serialization → rejected as `VALIDATION_FAILED`; `$transaction` never called.
- Unit test: `updatePage` with 205,000 `&` chars → same post-sanitization rejection; `$transaction` never called.
- Removed false-positive unit test using `"x".repeat(1_000_010)` — payload failed at initial `PageTranslationInputSchema` with `max(1_000_000)`, never reaching the sanitizer. Replaced with standalone `updatePage` ampersand regression.
- Integration test: 205,000 `&` chars → sanitized to 1,025,000 chars → `VALIDATION_FAILED`; verified `page.count`, `contentRevision.count`, and `activityLog.count` unchanged; slug remains free.

### 2. Integration-test cleanup
- **storageKey**: Made unique per run using `${marker}-public-${"c".repeat(32)}.webp` and `${marker}-private-${"d".repeat(32)}.webp` — no unique-constraint collisions between parallel test runs.
- **ContentRevision for deleted pages**: The `afterAll` hook merges `createdPageIds` Set with surviving page IDs: `const allIds = [...new Set([...pageIds, ...createdPageIds])]`.
- **Page deleteMany uses allIds**: `page.deleteMany({where: {id: {in: allIds}}})` ensures Pages whose slug matches a parent CUID (e.g., slug = parentId reference test) are also cleaned up, not just those found by slug prefix query.

### 3. Pagination-test isolation
- Page titles use `${marker}` prefix — no global keyword collision with other fixtures.
- Search filter uses `marker` variable.
- Total assertion uses exact `toBe(11)` since marker is unique.
- Title assertions use dynamic `titles` array.

### 4. Non-disclosure coverage
- Integration test: for each of `EDITOR`, `PETUGAS`, `SATGAS_PPKS`, `updatePage`, `deletePage`, and `mutatePagePublication` all return `FORBIDDEN` identically for both an existing Page ID and a nonexistent Page ID — no information disclosure before reaching the DB mutation layer.

### 5. Handoff notes

#### Next-transport requirement
The Page transport (Next.js route handler) **must reject sessions with `mustChangePassword` before delegating** to this domain layer. The current `listPages`/`getPageDetail` queries already reject `mustChangePassword` sessions in their actor guard; mutations currently allow password-change-required actors through if they're ADMIN. Transport-layer enforcement is the correct place for this check.

#### Low residual findings (Claude review, NOT addressed in this pass)
These were noted by Claude's review but are NOT fixed:

1. **TITLE_ASC multi-query snapshot may fail-closed during concurrent writes** — `listPages` issues a raw SQL query followed by a `findMany`; another client could insert/update between the two, causing silently dropped rows. The `id` tiebreak helps but this remains a snapshot-isolation gap.
2. **`children` select loads all child IDs** — `PAGE_SELECT` includes `children: {select: {id: true}}` which fetches every child row ID into the list result even though only `hasChildren: boolean` is needed.
3. **P2002 non-slug mapping may return `SLUG_CONFLICT`** — `isUniqueConstraintError` maps ALL P2002 errors to `SLUG_CONFLICT`. A unique constraint violation on any other column (e.g., a future unique index) would be incorrectly reported.

## Files Changed

### Original implementation (5 source files)
- `src/features/content/pages/contract.ts` — Page contract types, schemas, and input validation
- `src/features/content/pages/mutations.ts` — createPage, updatePage, deletePage, mutatePagePublication with post-sanitization re-validation
- `src/features/content/pages/queries.ts` — listPages, getPageDetail with actor guards
- `tests/m4/content/pages/page-mutations.test.ts` — 25 unit tests
- `tests/m4/content/pages/page-mutations.integration.test.ts` — 18 integration tests

### Correction-delta (3 files)
- `tests/m4/content/pages/page-mutations.test.ts` — removed false-positive `x.repeat(1_000_010)` test, added standalone `updatePage` ampersand regression
- `tests/m4/content/pages/page-mutations.integration.test.ts` — storageKey uniqueness, afterAll orphan cleanup with `allIds` in `page.deleteMany`, post-sanitize entity-expansion regression test, exact pagination total
- `coordination/handoffs/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-deepseek.md` — this handoff

## API/Schema/Migration Impact

None. No production code changes in this correction pass.

## Exact Command Results

| Command | Result |
|---------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run prisma:validate` | PASS |
| `npx vitest run tests/m4/content/pages --exclude '**/*.integration.test.ts'` | **25 passed** |
| `npm run test` | **53 files, 814 tests** |
| `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts` | **22 files, 107 tests** |
| `npm run build` | PASS — 34/34 static pages |
| Focused integration run ×3 | **18 passed** each run |
| Orphan ContentRevision (before/after 3 runs) | **46 / 46** — zero orphan growth |
| Orphan ActivityLog (before/after 3 runs) | **17 / 17** — zero orphan growth |
| Total Pages (before/after 3 runs) | **25 / 25** — zero net growth |
| `git diff --check` | PASS |
| `git status --short` | CLEAN |

## Worktree Status

```
ai/deepseek/m4-page-domain-crud...origin/ai/deepseek/m4-page-domain-crud [ahead 1 vs 07d1add (handoff pending)]
Clean working tree.
```

23 local task branches. No conflict with GPT lanes (`integration/m4-features`, `ai/gpt/m4-entry-and-assignment`, `ai/gpt/m4-ppks-query-isolation`) or Claude lanes (`ai/claude/m4-public-shell-hardening`).

## Contract Requests

None.

## Follow-ups

- Admin route handlers (`/api/admin/pages`) that wire in this domain layer
- Transport-level `mustChangePassword` rejection for Page mutations
- Public Page rendering
- Menu-item → Page linking
