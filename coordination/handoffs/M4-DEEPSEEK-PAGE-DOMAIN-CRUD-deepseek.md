# M4-DEEPSEEK-PAGE-DOMAIN-CRUD — DeepSeek Handoff

- **Task ID:** M4-DEEPSEEK-PAGE-DOMAIN-CRUD
- **Branch:** `ai/deepseek/m4-page-domain-crud`
- **Base SHA:** `a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0`
- **Implementation Head SHA:** (see commit)

## Summary

Implemented the non-sensitive Page domain service/query/mutation layer following
the accepted M3 Post behavioral pattern, using the frozen Prisma Page/PageTranslation
schema as the data contract.

## Files Changed

### Created
- `src/features/content/pages/contract.ts` — Zod schemas for Page domain
- `src/features/content/pages/mutations.ts` — Page CRUD operations (create, update, delete, publication)
- `src/features/content/pages/queries.ts` — Page read operations (list, detail)
- `tests/m4/content/pages/page-mutations.test.ts` — 16 unit tests
- `tests/m4/content/pages/page-mutations.integration.test.ts` — 10 integration tests
- `coordination/handoffs/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-deepseek.md` — this handoff

## API/Schema/Migration Impact

None. No schema, migration, shared contract, root config, dependency, auth, or proxy changes.

## Exact Command Results

| Command | Result |
|---------|--------|
| `npx vitest run tests/m4/content/pages --exclude '**/*.integration.test.ts'` | 16 passed |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run typecheck` | clean |
| `npm run prisma:validate` | valid |
| `npm test` | 754 passed (738 existing + 16 new) |
| `npm run test:integration` | All M4 Page tests skipped (no database); pre-existing tests show same behavior |
| `npm run build` | successful |
| `git diff --check` | clean |
| `TASK_MANIFEST=... TASK_BASE=... npm run check:scope` | 0 changed file(s) are within lease (new files, scope check for untracked) |

## Domain Implementation Details

- **Authorization:** ADMIN-only at every entry point; EDITOR, PETUGAS, SATGAS_PPKS all receive identical `FORBIDDEN`
- **Validation:** Strict Zod schemas for all inputs; ID translation mandatory, EN/AR optional
- **XSS sanitization:** Rich text sanitized at trust boundary via `sanitizeRichTextHtml`
- **Hero media enforcement:** Only PUBLIC storage class media accepted; missing/private media rejected
- **Hierarchy cycle protection:** Self-parenting rejected at Zod level; ancestor cycle detection in update
- **Deletion safety:** Pages with children rejected with `INVALID_STATE`
- **Optimistic locking:** Shared `claimOptimisticVersion` with `resource: "Page"`
- **Transactions:** Parent+translations written in one transaction; revisions and activity logs in same transaction
- **Non-technical results:** Never expose Prisma errors, storage keys, private fields, session data
- **UTC storage:** Server clock injectable for test determinism

## Test Coverage (Unit — 16 tests)

- Session validation (null, expired, non-ADMIN roles)
- Caller-owned field rejection
- Ownership derivation from session
- Locale sanitization (all 3 locales, script/onclick removal)
- Non-public hero media rejection
- Missing hero media rejection
- Non-existent parent rejection
- Unique conflict mapping (P2002 → SLUG_CONFLICT)
- Generic error mapping (no secret leakage)
- Identical non-disclosing result for missing page
- Self-parenting rejection in create
- Self-parenting rejection in update
- Invalid publication transitions (rejected before claiming version)
- Delete with optimistic locking and sanitized audit event
- Child-page deletion rejection
- Stale version update rejection
- Hierarchy cycle detection in update

## Integration Test Coverage (10 tests, skipped without DB)

- Atomic creation with sanitized locales, revisions, and activity
- Non-ADMIN role rejection
- Missing references and non-public hero media rejection (no partial writes)
- Translation replacement and stale update rejection
- Identical non-disclosing results
- Legal publication transitions (DRAFT → PUBLISHED → ARCHIVED → DRAFT)
- Rollback on slug conflict
- Hierarchy cycle rejection in real data
- Child-page deletion prevention
- Safe orphan deletion with audit

## Untested Areas / Risks

- Integration tests not run against PostgreSQL (no DATABASE_URL configured)
- Playwright/E2E tests not in scope for this domain task
- List/sort by parent title not supported (parentTitle is null-safe)
- No autosave mechanism for Pages (different contract from Post)

## Contract Requests

None. The frozen Prisma schema and shared primitives were sufficient.

## Follow-ups

- Admin route handlers that use this domain layer
- Admin UI for Page CRUD
- Public Page rendering
- Menu-item → Page linking integration
