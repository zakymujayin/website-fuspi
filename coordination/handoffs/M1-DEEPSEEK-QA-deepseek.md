# Handoff: M1-DEEPSEEK-QA — DeepSeek

## Metadata

| Field | Value |
|-------|-------|
| Task ID | M1-DEEPSEEK-QA |
| Milestone | M1 |
| Owner | deepseek (deepseek-v4-pro) |
| Branch | `ai/deepseek/m1-qa` |
| Base SHA | `77f2901` (planning-baseline-v1) |
| Head SHA | (see commit log) |
| Status | ready for re-review (v2 — integrator review fixes applied) |

## Summary

M1 DeepSeek QA deliverables: synthetic foundation fixtures with locale-aware
factories, a threat-test inventory of 28 security test cases, locale/RTL
validation utilities and tests, extended identity contract tests, and
foundation-level E2E cases for RTL and locale routing.

All 65 unit tests and all 30 E2E tests pass, lint and typecheck clean,
Prisma validate passes.

## v2 Fixes (per integrator review)

| # | File | Fix |
|---|------|-----|
| 1 | `e2e/foundation/locale-routing.spec.ts` | Removed non-deterministic `/` redirect and `/ru/something` tests. Replaced with explicit locale-path tests (`/id`, `/en`, `/ar`) that do not depend on browser Accept-Language. |
| 2 | `e2e/foundation/rtl-negative.spec.ts` | Changed `getByText("FUSPI")` (ambiguous when multiple elements contain FUSPI) to `expect(body).toContainText("FUSPI")`. |
| 3 | `tests/foundation/fixtures/study-program.ts` | Removed duplicated program list. Now imports `institution.studyPrograms` from `src/config/institution.ts` as the single source of truth. |
| 4 | `src/test/setup.ts` | Replaced dynamic `await import()` with empty `catch {}` with explicit static imports. Fixture import failures are now surfaced as test errors instead of being silently swallowed. |

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `tests/foundation/fixtures/user.ts` | Added | User factory (ADMIN/EDITOR/PETUGAS/SATGAS_PPKS/inactive variants) |
| `tests/foundation/fixtures/post.ts` | Added | Post + PostTranslation factory with locale-aware helpers |
| `tests/foundation/fixtures/category.ts` | Added | Category + CategoryTranslation factory |
| `tests/foundation/fixtures/study-program.ts` | Added | StudyProgram factory deriving from `src/config/institution.ts` |
| `tests/foundation/fixtures/media.ts` | Added | Media factory (PUBLIC/PRIVATE/PPKS_PRIVATE variants) |
| `tests/foundation/fixtures/page.ts` | Added | Page + PageTranslation factory |
| `tests/foundation/fixtures/index.ts` | Added | Barrel export for all fixtures |
| `tests/foundation/threat-matrix.ts` | Added | 28 threat test cases across 9 categories |
| `src/test/locale-helpers.ts` | Added | Locale utilities |
| `src/test/locale-validation.test.ts` | Added | 15 tests: locale contract, direction, HTML attrs |
| `src/test/identity-contracts.test.ts` | Added | 11 tests: FUDA exclusion, study program validation |
| `src/test/fixtures.test.ts` | Added | 24 tests: factory correctness for 6 entity types |
| `src/test/threat-matrix.test.ts` | Added | 12 tests: matrix completeness, filtering, coverage |
| `src/test/setup.ts` | Modified | Explicit static imports for fixture counter reset |
| `e2e/foundation/rtl-negative.spec.ts` | Added | 7 tests: RTL/LTR direction, locale switch, FUDA absence |
| `e2e/foundation/locale-routing.spec.ts` | Added | 5 tests: explicit locale paths, h1, M0 tag visibility |

## Acceptance Commands & Results (v2)

```bash
$ npm run lint
# 0 errors, 0 warnings

$ npm run typecheck
# 0 errors

$ npm test
# 6 test files, 65 tests passed

$ npm run test:e2e
# 30 tests passed (15 × 2 browsers: chromium + mobile)

$ npm run prisma:validate
# The schema at prisma is valid
```

### E2E Results Detail

```
Running 30 tests using 4 workers
  ✓ e2e/foundation/locale-routing.spec.ts — 5 tests × 2 browsers = 10 passed
  ✓ e2e/foundation/rtl-negative.spec.ts — 7 tests × 2 browsers = 14 passed
  ✓ e2e/locales.spec.ts — 3 tests × 2 browsers = 6 passed
  30 passed (12.6s)
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

1. **23 DB-dependent threat tests are pending.** Require M1-GPT schema migration.
2. **Integration test skeleton.** No `*.integration.test.ts` files yet. DB-level tests
   will be added when migration is available.
3. **Fixture interfaces are local, not Prisma-typed.** A future contract task should
   reconcile these with Prisma model types.

## Requested Contract/Dependency Changes

None.
