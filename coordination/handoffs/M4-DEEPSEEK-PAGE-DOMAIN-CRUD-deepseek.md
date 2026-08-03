# M4-DEEPSEEK-PAGE-DOMAIN-CRUD — DeepSeek Handoff

- **Task ID:** M4-DEEPSEEK-PAGE-DOMAIN-CRUD
- **Branch:** `ai/deepseek/m4-page-domain-crud`
- **Base SHA:** `049cb759beb393b44f6fe91217d357761cffffb5` (origin/integration/m4-features)
- **Implementation Head SHA:** `db5e7d2cc1a622e7b8bd8b79dbf6297904fb0b26`
- **Database:** `fuspi_dev_deepseek` (PostgreSQL 16.14, isolated local)

## Summary

Implemented the non-sensitive Page domain service/query/mutation layer following
the accepted M3 Post behavioral pattern, using the frozen Prisma Page/PageTranslation
schema as the data contract.

### Corrections applied

- **TITLE_ASC**: Sorts by `t."title" ASC, p."id" ASC` (alphabetical Indonesian title, ID as deterministic tiebreaker) on both search and non-search paths. Previously sorted by `p.order ASC`.
- **getPageDetail**: Parses `pageId` via `PageIdSchema.safeParse` instead of a bare `typeof` check, rejecting malformed/oversize/control-character IDs before any DB query.
- **Create self-parenting**: Removed the `parentId === slug` check in `PageCreateInputSchema`. Page IDs are server-generated CUIDs; slug equality with a valid parent ID is a legitimate reference. Update-time `pageId === parentId` and ancestor-cycle detection remain intact.
- **RETURN_TO_DRAFT audit**: Records `action: "UPDATE"` with `metadata: {operation: "RETURN_TO_DRAFT", version}` instead of incorrectly using `"ARCHIVE"`. Only `ARCHIVE` intent uses `action: "ARCHIVE"`.
- **Integration runner**: All tests pass with `.env.local` sourced; earlier auth failures were a runner-configuration issue.

## Files Changed (6 files, within lease)

- `src/features/content/pages/contract.ts` — Zod schemas
- `src/features/content/pages/mutations.ts` — CRUD operations
- `src/features/content/pages/queries.ts` — Read layer
- `tests/m4/content/pages/page-mutations.test.ts` — 23 unit tests
- `tests/m4/content/pages/page-mutations.integration.test.ts` — 16 integration tests
- `coordination/handoffs/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-deepseek.md` — this handoff

## API/Schema/Migration Impact

None. No schema, migration, shared contract, root config, dependency, auth, or proxy changes.

## Exact Command Results

| Command | Result |
|---------|--------|
| `npx vitest run tests/m4/content/pages --exclude '**/*.integration.test.ts'` | **23 passed, 0 skipped** |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run prisma:validate` | PASS |
| `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/content/pages` | **16 passed, 0 skipped** |
| `npm test` | **53 files, 812 tests** |
| `npm run test:integration` (with .env.local sourced) | **22 files, 105 tests** |
| `npm run build` | PASS — 34/34 static pages |
| `git diff --check` | PASS |
| `TASK_MANIFEST=... TASK_BASE=... npm run check:scope` | PASS — 6 files within lease |

## Domain Implementation Details

- **Authorization:** ADMIN-only at every entry point
- **Validation:** Strict Zod schemas; ID translation mandatory, EN/AR optional
- **XSS sanitization:** Rich text sanitized at trust boundary
- **Hero media:** Only PUBLIC storage class accepted
- **Hierarchy cycles:** Self-parenting at update level; ancestor-cycle detection
- **Deletion safety:** Children block enforced
- **Optimistic locking:** Shared `claimOptimisticVersion` with `resource: "Page"`
- **Transactions:** Parent+translations in one transaction

## Test Coverage

### Unit — 23 tests
Session/role rejection, field rejection, ownership derivation, locale sanitization,
hero media enforcement, parent validation, error mapping, self-parent (update),
publication transitions, delete with lock, child-page protection, stale version,
hierarchy cycles, list with parent/hasChildren/locale, detail success/missing,
malformed/oversize/control-char ID rejection, invalid query without DB touch.

### Integration — 16 tests (PostgreSQL)
Atomic creation, role rejection, missing references, translation replacement,
non-disclosing results, publication transitions with audit assertions, slug
conflict rollback, hierarchy cycle, child-page deletion prevention, safe
orphan delete, slug-equals-parentID regression, TITLE_ASC sort with pageId
tiebreak, TITLE_ASC pagination (11+ items, pageSize 10, page 1/2, no overlaps),
status/search filtering, parent summary/locale/hasChildren, query auth/detail.

## Untested Areas / Risks

- Playwright/E2E tests not in scope
- No autosave mechanism for Pages

## Contract Requests

None.

## Follow-ups

- Admin route handlers that use this domain layer
- Admin UI for Page CRUD
- Public Page rendering
- Menu-item → Page linking integration
