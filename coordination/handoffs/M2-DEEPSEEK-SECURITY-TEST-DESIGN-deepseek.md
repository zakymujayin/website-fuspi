# M2 DeepSeek Security Test Design — Handoff

## Task ID
M2-DEEPSEEK-SECURITY-TEST-DESIGN-REVISION

Parent task: `M2-DEEPSEEK-SECURITY-TEST-DESIGN`

## Original Branch
`ai/deepseek/m2-security-test-design`

## Base SHA
`c8550d8` (`coordination/m2-revision-assignment`)

## Head SHA (original implementation)
`d995fc4`

## Revision Branch
`ai/deepseek/m2-security-test-design-revision`

## Revision implementation SHAs

- `b4d536b` — applies the original GPT cross-lane corrections
- `8bbfb77` — hardens PII validation and aligns nonce/outbox cases with frozen contracts

## Revision Summary

GPT cross-lane review (`coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md`) identified eight corrections. All applied:

1. **Execution readiness state** — added `executable: boolean` field to `M2SecurityTestCase`; exported `VALID_DEPENDENCIES` set and `validateM2Readiness()` function; 4 meta-tests prove rejection of ready cases with missing dependencies.
2. **All cases blocked** — every case has `executable: false`; meta-test asserts zero ready cases.
3. **FUSPI domain in PII guard** — removed `fuspi.uinbanten.ac.id` from PII exclusion regex; added dedicated FUSPI_DOMAIN_PATTERN test that rejects production FUSPI emails.
4. **Equal rate-limit** — M2-AUTH-006 now requires identical behaviour for existing, non-existing, and inactive accounts; M2-AUTH-007 references dummy bcrypt and statistical timing tolerance.
5. **Outbox tampering corrected** — M2-OBX-002 tests encrypted payload tampering (decryption integrity failure), not key-change/unique-constraint collision.
6. **PPKS detail access frozen** — M2-IDOR-003 outcome is deterministic 404 with zero bytes, denied-access audit entry; aggregate statistics via separate authorized query.
7. **Ambiguous alternatives removed** — M2-ENC-004 now verifies server-owned `crypto.randomBytes(12)` nonce generation without inventing a global uniqueness index; all "X or Y" expected outcomes use one deterministic result.
8. **Follow-ups remain M2** — no M3 references in test plan or handoff.

## Summary

Created a typed M2 security test-plan registry with 32 currently blocked cases spanning all required areas. Revision from GPT cross-lane review added execution readiness validation, fixed rate-limit coverage, replaced production-like fixture identity, corrected outbox and PPKS cases, and eliminated ambiguous outcomes.

### `tests/security/m2-threat-plan.ts`
- `M2SecurityTestCase` interface with 12 fields including `executable: boolean`
- `VALID_DEPENDENCIES` — canonical set of 10 known dependency contracts
- `validateM2Readiness()` — rejects cases marked executable when dependency is unavailable
- 32 test cases covering all required areas (same count, updated content)
- Export functions: getM2Plan, getM2ByArea, getM2BySeverity, getM2ByTestLevel, getM2ByDependsOn, countM2BySeverity, getM2Dependencies, validateM2Readiness

### `tests/security/m2-threat-plan.test.ts`
- 26 meta-tests (was 20) including:
  - 4 new execution readiness validator tests
  - FUSPI production domain rejection test
- Updated PII guard to extract every email and allow only the exact reserved domain `example.invalid`; it separately rejects production FUSPI/FUDA domains, real-looking Indonesian phone numbers, and secret-like material

## Files Changed
| File | Status | Notes |
|---|---|---|
| `tests/security/m2-threat-plan.ts` | Added (revised) | 32 cases, 8 exports, execution readiness |
| `tests/security/m2-threat-plan.test.ts` | Added (revised) | 26 meta-tests, exact reserved-domain/PII guard |
| `coordination/handoffs/M2-DEEPSEEK-SECURITY-TEST-DESIGN-deepseek.md` | Added (revised) | Revision details documented |

## Acceptance Commands Results

### Original implementation (`d995fc4`)
| Command | Result |
|---|---|
| `npm run lint` | PASS (no errors) |
| `npm run typecheck` | PASS (no errors) |
| `npm test` | 108 passed, 2 skipped, 0 failed |

### Revision
| Command | Result |
|---|---|
| `npm run lint` | PASS (no errors) |
| `npm run typecheck` | PASS (no errors) |
| `npm test` | 114 passed (26 threat-plan meta-tests), 2 skipped, 0 failed |
| `git diff --check` | clean |
| `npm run check:scope` | 3 changed file(s) are within lease |

## API/Schema/Migration Impact
None. Test plan definitions only. No schema, migration, or implementation code changed.

## Implementation Dependencies
All 32 test cases reference one of 10 known contract IDs (declared in `VALID_DEPENDENCIES`). All cases marked `executable: false`. They become actionable only after GPT merges the corresponding M2 security implementation.

## Risks & Untested Areas
- Test cases are typed definitions, not executable tests. They become actionable only after GPT merges the corresponding security helpers.
- No E2E tests can be run until the complete auth/RBAC/upload/PPKS stack is in place.
- Concurrency tests (M2-SEQ-*) require MariaDB Serializable isolation — verified compatible with MariaDB 10.11.14 during M1 hardening.
- Timing-equalized rejection (M2-AUTH-007) requires a pre-generated dummy bcrypt hash constant in the platform module.

## Follow-ups (all M2)
- GPT should verify all 10 dependency contracts in `dependsOn` match the actual implementation module names.
- After M2 platform merge, convert each test case into an executable Vitest/Playwright test.
- When a dependency contract is fulfilled, mark the corresponding cases `executable: true` and re-run `validateM2Readiness`.
