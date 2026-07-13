# M2 DeepSeek Security Test Design — Handoff

## Task ID
M2-DEEPSEEK-SECURITY-TEST-DESIGN

## Branch
`ai/deepseek/m2-security-test-design`

## Base SHA
`18a26dd` (integration/m2-security)

## Head SHA
TBD after commit

## Summary

Created a typed, executable M2 security test plan with 32 test cases spanning all required areas. Two files added:

### `tests/security/m2-threat-plan.ts` (29.2 KB)
- `M2SecurityTestCase` interface with 11 fields: id, area, severity, actor, precondition, attack, invariant, expectedOutcome, requiredFixture, dependsOn, testLevel
- 32 test cases covering:
  - **Session Revocation** (M2-AUTH-001 to M2-AUTH-004): password change, deactivation, role change, stolen cookie
  - **Inactive User** (M2-AUTH-005): stale-session rejection
  - **Login Enumeration** (M2-AUTH-006, M2-AUTH-007): rate limiting, timing side-channel
  - **Ownership IDOR** (M2-IDOR-001): cross-editor post access
  - **Role Escalation** (M2-IDOR-002): self-role-change prevention
  - **PPKS IDOR** (M2-IDOR-003, M2-IDOR-004): ADMIN/PETUGAS firewall
  - **CSRF** (M2-CSRF-001): cross-origin Server Action protection
  - **Upload Path Traversal** (M2-UPLOAD-001): path sanitization, canonical check
  - **Upload MIME Spoof** (M2-UPLOAD-002): magic byte validation
  - **Upload Decompression Bomb** (M2-UPLOAD-003): pixel limit enforcement
  - **Upload Null Byte** (M2-UPLOAD-004, M2-UPLOAD-006): null byte rejection, Unicode safety
  - **Encryption Tampering** (M2-ENC-001 to M2-ENC-004): ciphertext, tag, key version, nonce reuse
  - **PPKS Isolation** (M2-PPKS-001 to M2-PPKS-004): CSV export, TicketAccessLog, search filter, log immutability
  - **Concurrency** (M2-SEQ-001 to M2-SEQ-003): parallel tickets, year boundary, cross-kind isolation
  - **Outbox** (M2-OBX-001 to M2-OBX-003): idempotency, encrypted payload, atomic transaction
  - **CSV Injection** (M2-CSV-001 to M2-CSV-003): formula injection, benign passthrough
  - **PPKS Email Privacy** (M2-EMAIL-001): no sensitive data in SMTP
  - **Upload Atomicity** (M2-UPLOAD-005): file/DB rollback on failure
- Severity distribution: 12 critical, 14 high, 2 medium, 4 low
- Test level distribution: 4 unit, 27 integration, 1 e2e
- 10 dependency contracts declared: auth.session-revocation, auth.rate-limit, auth.csrf, lib.authorization, lib.upload, lib.ppks-encryption, lib.ppks-isolation, lib.outbox, lib.sanitizer, db.annual-sequence
- Export functions: getM2Plan, getM2ByArea, getM2BySeverity, getM2ByTestLevel, getM2ByDependsOn, countM2BySeverity, getM2Dependencies

### `tests/security/m2-threat-plan.test.ts` (6.5 KB)
- 20 meta-tests validating the plan:
  - Minimum 30 cases, no duplicate IDs, all fields filled
  - ID naming convention check, valid severity/level enums
  - Critical/High invariants present
  - No real PII, no FUDA domain references
  - All dependsOn references are known contracts
  - All required areas covered
  - Severity/level balance validation
  - Filter/aggregation function correctness

## Files Changed
| File | Status | Lines |
|---|---|---|
| `tests/security/m2-threat-plan.ts` | Added | 32 cases, 30+ export functions |
| `tests/security/m2-threat-plan.test.ts` | Added | 20 meta-tests |

## Acceptance Commands Results
| Command | Result |
|---|---|
| `npm run lint` | PASS (no errors) |
| `npm run typecheck` | PASS (no errors) |
| `npm test` | 108 passed, 2 skipped, 0 failed |

## API/Schema/Migration Impact
None. This is a test plan definition only. No schema, migration, or implementation code changed.

## Implementation Dependencies
All 32 test cases reference one of 10 known contract IDs. No test case is executable yet — they await M2 GPT platform security implementation.

## Risks & Untested Areas
- Test cases are definitions, not executable tests. They become actionable only after GPT merges the corresponding security helpers.
- No E2E tests can be run until the complete auth/RBAC/upload/PPKS stack is in place.
- Concurrency tests (M2-SEQ-*) require MariaDB Serializable isolation — verified compatible with MariaDB 10.11.14 during M1 hardening.

## Follow-ups
- GPT should verify all 10 dependency contracts in `dependsOn` match the actual implementation module names.
- After M2 platform merge, convert each test case into an executable Vitest/Playwright test.
