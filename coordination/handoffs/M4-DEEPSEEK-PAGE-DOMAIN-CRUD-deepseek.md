# M4-DEEPSEEK-PAGE-DOMAIN-CRUD — DeepSeek Handoff

- **Task ID:** M4-DEEPSEEK-PAGE-DOMAIN-CRUD
- **Branch:** `ai/deepseek/m4-page-domain-crud`
- **Base SHA:** `049cb759beb393b44f6fe91217d357761cffffb5` (origin/integration/m4-features)
- **Database:** `fuspi_dev_deepseek` (PostgreSQL 16.14, isolated local)

## Summary

Implemented the non-sensitive Page domain service/query/mutation layer following
the accepted M3 Post behavioral pattern, using the frozen Prisma Page/PageTranslation
schema as the data contract.

### Corrections applied this cycle

- **TITLE_ASC**: Fixed to sort by `t."title" ASC, p."id" ASC` (alphabetical Indonesian title, ID as deterministic tiebreaker) on both search and non-search paths. Previously sorted by `p.order ASC`.
- **getPageDetail**: Now parses `pageId` via `PageIdSchema.safeParse` instead of a bare `typeof` check, rejecting malformed/oversize/control-character IDs before any DB query.
- **Create self-parenting**: Removed the spurious `parentId === slug` check in `PageCreateInputSchema`. Page IDs are server-generated UUIDs; slueg equality with a valid parent ID is a legitimate reference. Update-time `pageId === parentId` and ancestor-cycle detection remain intact.
- **RETURN_TO_DRAFT audit**: Now records `action: "UPDATE"` with `metadata: {operation: "RETURN_TO_DRAFT", version}` instead of incorrectly using `"ARCHIVE"`. Only `ARCHIVE` intent uses `action: "ARCHIVE"`.
- **Integration runner**: All 104 integration tests now pass with `.env.local` loaded; the previously reported 3 M2 auth failures were a runner-configuration issue, not M2 defects.

## Files Changed (6 files, within lease)

- `src/features/content/pages/contract.ts` — Zod schemas (removed create-time self-parent check)
- `src/features/content/pages/mutations.ts` — CRUD operations (RETURN_TO_DRAFT audit fix)
- `src/features/content/pages/queries.ts` — Read layer (TITLE_ASC fix, PageIdSchema gate)
- `tests/m4/content/pages/page-mutations.test.ts` — 23 unit tests (mutation + query)
- `tests/m4/content/pages/page-mutations.integration.test.ts` — 15 integration tests
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
| `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/content/pages` | **15 passed, 0 skipped** |
| `npm test` | **53 files, 812 tests — ALL PASS** |
| `npm run test:integration` (with .env.local loaded) | **22 files, 104 tests — ALL PASS** |
| `npm run build` | PASS — 34/34 static pages |
| `git diff --check` | PASS |
| `TASK_MANIFEST=... TASK_BASE=... npm run check:scope` | PASS — 6 changed files within lease |

## Domain Implementation Details

- **Authorization:** ADMIN-only at every entry point; EDITOR, PETUGAS, SATGAS_PPKS all receive identical rejection
- **Validation:** Strict Zod schemas for all inputs; ID translation mandatory, EN/AR optional
- **XSS sanitization:** Rich text sanitized at trust boundary via `sanitizeRichTextHtml`
- **Hero media enforcement:** Only PUBLIC storage class media accepted
- **Hierarchy cycle protection:** Self-parenting rejected at update Zod level; ancestor cycle detection in update
- **Deletion safety:** Pages with children rejected with `INVALID_STATE`
- **Optimistic locking:** Shared `claimOptimisticVersion` with `resource: "Page"`
- **Transactions:** Parent+translations written in one transaction; revisions and activity logs in same transaction
- **Non-technical results:** Never expose Prisma errors, storage keys, private fields, session data
- **UTC storage:** Server clock injectable for test determinism

## Test Coverage

### Unit — 23 tests, 0 skipped
- Mutation: session/role rejection, caller-owned field rejection, ownership derivation, locale sanitization, hero media enforcement, parent validation, error mapping, self-parent (update), publication transitions, delete with lock, child-page protection, stale version, hierarchy cycles
- Query: session/role rejection, list with parent titles/hasChildren/locale list, detail success, missing detail, malformed ID rejection (empty, oversize, control-char, invalid-start), invalid query without touching DB

### Integration — 15 tests, 0 skipped, PostgreSQL
- Atomic creation with sanitized locales, revisions, and activity
- Non-ADMIN role rejection
- Missing references and non-public hero media rejection
- Translation replacement and stale update rejection
- Identical non-disclosing results
- Legal publication transitions with accurate audit actions (CREATE → PUBLISH → ARCHIVE → UPDATE(RETURN_TO_DRAFT))
- Rollback on slug conflict
- Hierarchy cycle rejection
- Child-page deletion prevention
- Safe orphan deletion with audit
- Slug-equals-parentId regression (allowed at create time)
- TITLE_ASC sort with deterministic tiebreak and pagination
- Status filtering and search
- Parent summary, locale list, and hasChildren in list results
- Query auth rejection, detail success, and missing Page ID

## Untested Areas / Risks

- Playwright/E2E tests not in scope for this domain task
- No autosave mechanism for Pages (different contract from Post)

## Contract Requests

None.

## Follow-ups

- Admin route handlers that use this domain layer
- Admin UI for Page CRUD
- Public Page rendering
- Menu-item → Page linking integration
