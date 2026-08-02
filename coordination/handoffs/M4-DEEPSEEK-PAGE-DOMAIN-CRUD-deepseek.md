# M4-DEEPSEEK-PAGE-DOMAIN-CRUD — DeepSeek Handoff

- **Task ID:** M4-DEEPSEEK-PAGE-DOMAIN-CRUD
- **Branch:** `ai/deepseek/m4-page-domain-crud`
- **Base SHA:** `81a95d6a8e8cd4698353d7f083e53dd0dda0ec5e` (origin/integration/m4-features)
- **Implementation Head SHA:** `677dfd7feat(m4): implement Page domain CRUD layer with tests`
- **Database:** `fuspi_dev_deepseek` (PostgreSQL 16.14, isolated local)

## Summary

Implemented the non-sensitive Page domain service/query/mutation layer following
the accepted M3 Post behavioral pattern, using the frozen Prisma Page/PageTranslation
schema as the data contract. Rebased cleanly onto `origin/integration/m4-features`
at `81a95d6`. The public-shell integration (`ai/claude/m4-public-shell-hardening`)
was not modified.

## Files Changed (6 files, +2289 lines)

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
| `npx vitest run tests/m4/content/pages --exclude '**/*.integration.test.ts'` | **16 passed, 0 skipped** |
| `npm run lint` | PASS — 0 errors, 0 warnings |
| `npm run typecheck` | PASS — clean |
| `npm run prisma:validate` | PASS — schema valid |
| `RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/content/pages` | **10 passed, 0 skipped** |
| `npm test` | **53 files, 805 tests — ALL PASS** |
| `npm run test:integration` | **21/22 files, 96/99 tests PASS** (3 failures in `credentials-route.integration.test.ts` are pre-existing M2 auth HMAC-secret issue unrelated to Page domain; all Page and other domain tests pass) |
| `npm run build` | PASS — 34/34 static pages |
| `git diff --check` | PASS — clean |
| `TASK_MANIFEST=... TASK_BASE=... npm run check:scope` | PASS — 6 changed files within lease |

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

## Test Coverage (Unit — 16 tests, 0 skipped)

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

## Integration Test Coverage (10 tests, 0 skipped, PostgreSQL)

- Atomic creation with sanitized locales, revisions, and activity
- Non-ADMIN role rejection
- Missing references and non-public hero media rejection (no partial writes)
- Translation replacement and stale update rejection
- Identical non-disclosing results
- Legal publication transitions (DRAFT → PUBLISHED → ARCHIVED → DRAFT)
- Rollback on slug conflict
- Hierarchy cycle rejection in real data
- Child-page deletion prevention
- Safe orphan deletion with audit (CREATE + DELETE audit records)

## Untested Areas / Risks

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
