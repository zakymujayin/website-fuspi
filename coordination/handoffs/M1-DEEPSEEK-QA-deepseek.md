# Handoff: M1-DEEPSEEK-QA — DeepSeek

## Metadata

| Field | Value |
|-------|-------|
| Task ID | M1-DEEPSEEK-QA |
| Milestone | M1 |
| Owner | deepseek (deepseek-v4-pro) |
| Branch | `ai/deepseek/m1-qa` |
| Base SHA | `77f2901` (planning-baseline-v1) |
| Head SHA | `6c71634` |
| Status | ready for review |

## Summary

M1 DeepSeek QA deliverables: synthetic foundation fixtures with locale-aware
factories, a threat-test inventory of 28 security test cases, locale/RTL
validation utilities and tests, extended identity contract tests, and
foundation-level E2E cases for RTL and locale routing.

All 65 tests pass, lint and typecheck clean, Prisma validate passes.

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `tests/foundation/fixtures/user.ts` | Added | User factory (ADMIN/EDITOR/PETUGAS/SATGAS_PPKS/inactive variants) |
| `tests/foundation/fixtures/post.ts` | Added | Post + PostTranslation factory with locale-aware helpers |
| `tests/foundation/fixtures/category.ts` | Added | Category + CategoryTranslation factory |
| `tests/foundation/fixtures/study-program.ts` | Added | StudyProgram factory covering all 5 v1 programs |
| `tests/foundation/fixtures/media.ts` | Added | Media factory (PUBLIC/PRIVATE/PPKS_PRIVATE variants) |
| `tests/foundation/fixtures/page.ts` | Added | Page + PageTranslation factory |
| `tests/foundation/fixtures/index.ts` | Added | Barrel export for all fixtures |
| `tests/foundation/threat-matrix.ts` | Added | 28 threat test cases across 9 categories (structured catalog) |
| `src/test/locale-helpers.ts` | Added | Locale utilities: `isRtlLocale()`, `getLocaleDirection()`, `localePermutations()`, `withAllLocales()` |
| `src/test/locale-validation.test.ts` | Added | 15 tests: locale contract, direction detection, HTML attributes, pairs |
| `src/test/identity-contracts.test.ts` | Added | 11 tests: FUDA exclusion, study program order/format/unicity |
| `src/test/fixtures.test.ts` | Added | 24 tests: factory correctness for all 6 entity types |
| `src/test/threat-matrix.test.ts` | Added | 12 tests: matrix completeness, filtering, category/severity coverage |
| `src/test/setup.ts` | Modified | Added fixture counter auto-reset in `afterEach` |
| `e2e/foundation/rtl-negative.spec.ts` | Added | 7 Playwright tests: RTL/LTR direction, locale switch, FUDA absence |
| `e2e/foundation/locale-routing.spec.ts` | Added | 5 Playwright tests: redirect, invalid locale, h1 presence, M0 tag |

Total: 16 files, 1459 insertions, 1 deletion.

## API/Schema/Migration Impact

None. No schema changes, no migration changes, no dependency changes.
Fixtures define local `Fixture*` interfaces that match schema shapes
without importing from Prisma generated types (avoids tsc resolution issues
while the schema is not yet migrated).

## Acceptance Commands & Results

```bash
$ npm run lint
# 0 errors, 0 warnings

$ npm run typecheck
# 0 errors

$ npm test
# 6 test files, 65 tests passed

$ npm run prisma:validate
# The schema at prisma is valid

$ npm run check:scope
# scope-check: TASK_MANIFEST is not set; coordinator/bootstrap mode
```

## Threat Matrix Summary

| Category | Count | Severities |
|----------|-------|------------|
| Authentication | 6 | critical×1, high×2, medium×2, low×1 |
| Authorization / IDOR | 5 | critical×3, high×2 |
| PPKS Privacy | 3 | critical×2, medium×1 |
| Upload Hardening | 3 | high×1, medium×2 |
| XSS / Content Injection | 2 | high×1, medium×1 |
| Locale / RTL | 5 | low×5 |
| CSRF | 1 | high×1 |
| SQL Injection | 1 | high×1 |
| Rate Limiting | 1 | high×1 |

- **Ready tests (non-DB):** 5 (locale/RTL identity checks)
- **Pending tests (require migration):** 23 (auth, IDOR, PPKS, upload, XSS, CSRF, SQLi, rate)

## Untested Areas & Risks

1. **DB-dependent tests are pending.** 23 of 28 threat tests require a
   live MariaDB connection and migrated schema (GPT M1 task). These are
   catalogued as `pending_migration` and blocked until `integration/m1-platform`
   is available.

2. **Playwright E2E tests not executed.** `e2e/foundation/` tests require
   `npm run dev` with functional routes — not feasible without M1-GPT
   platform integration. They will pass once the Next.js app serves all
   locale paths.

3. **Integration test skeleton.** No `*.integration.test.ts` files created yet.
   The `vitest.integration.config.ts` expects them at `src/**/*.integration.test.ts`.
   DB-level tests (translation transactions, optimistic locking, etc.) will
   be added when migration is available.

4. **Fixture interfaces are local, not Prisma-typed.** To avoid depending on
   generated Prisma client types (which require `node:process` and fail under
   jsdom/vitest), fixtures use local `Fixture*` interfaces. A future contract
   task should reconcile these with Prisma model types when the client is
   properly isolated for test environments.

## Follow-ups

- M1-GPT must complete schema migration and seed before `pending_migration`
  tests can be implemented.
- After M2 (platform security), implement the 23 pending threat tests against
  actual auth/session/encryption infrastructure.
- After M3 (reference slice Post + Media), add integration tests using the
  established patterns.

## Requested Contract/Dependency Changes

None.
