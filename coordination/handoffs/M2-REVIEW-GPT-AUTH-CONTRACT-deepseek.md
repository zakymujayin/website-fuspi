# HANDOFF — M2-REVIEW-GPT-AUTH-CONTRACT

- Task: `M2-REVIEW-GPT-AUTH-CONTRACT`
- Branch: `ai/deepseek/m2-review-gpt-auth-contract`
- Base SHA: `81b0ee2` (assignment handoff from `coordination/m2-auth-contract-review-assignment`)
- Head SHA: `53c9e7f`
- Owner: DeepSeek Delivery & QA
- Reviewer: GPT
- Status: ready for review; not merged

## Summary

Independent adversarial review of GPT's M2 Auth/RBAC contract (`046d5aa`, handoff `81b0ee2`).
Verdict: **APPROVE** with five medium and three low residual findings.

### Review output

- `coordination/reviews/M2-GPT-AUTH-CONTRACT-deepseek.md` — full review with file/line references,
  cell-by-cell matrix verification, dependency audit, schema compliance, test gap analysis,
  and binding decision checklist.

### Key findings

| ID | Severity | Area | Summary |
|---|---|---|---|
| M1 | Medium | Tests | AuthorizationContextSchema and TicketDataScopeSchema have zero test coverage |
| M2 | Medium | Tests | No `ok: true` login result parse test |
| M3 | Medium | Tests | No strict-parsing rejection test for credentials/password schemas |
| M4 | Medium | Tests | No explicit CHANGE_ROLE denial test for non-ADMIN roles |
| M5 | Medium | Tests | Matrix immutability not verified |
| L1 | Low | Dependency | `bcryptjs` uses caret range while auth packages are pinned |
| L2 | Low | Tests | ActiveDatabaseSessionSchema missing rejection test for invalid shapes |
| L3 | Low | Tests | No assertion for TICKET dataScope = NON_PPKS |

## Verified invariants

- All three binding failure codes from cross-lane review are the only public codes.
- SafeInternalPathSchema blocks external URLs, `//`, backslash, and control characters.
- ActiveDatabaseSessionSchema rejects inactive sessions at the type level (literal true).
- LoginResultSchema structurally prevents open redirects.
- PasswordChangeInputSchema requires all three fields and enforces confirmation+difference.
- Permission matrix is default-deny; PPKS isolation, EDITOR ownership, ticket scoping confirmed cell-by-cell.
- SATGAS_PPKS has zero CMS/BOOKING/TICKET/POST/MEDIA access.
- ADMIN/PETUGAS have zero PPKS_TICKET/PPKS_ACCESS_LOG access.
- Every binding decision from `M2-AUTH-SECURITY-CROSS-LANE-gpt.md` sections A1–A5 is addressable by the contracts.

## API/Schema/Migration Impact

None. Review-only task. No source, dependency, schema, or config was changed.

## Acceptance Commands Results

| Command | Result |
|---|---|
| `npm run lint` | PASS (no errors) |
| `npm run typecheck` | PASS (no errors) |
| `npm run prisma:validate` | PASS |
| `npm test` | 97 passed, 2 skipped, 0 failed |
| `npm run build` | PASS (ID/EN/AR routes) |
| `npm audit --audit-level=high` | PASS (exit 0; 5 pre-existing moderate) |
| `git diff --check` | clean |
| `npm run check:scope` | 2 changed file(s) are within lease |

## Untested areas and risks

- Auth.js beta version — must be integration-tested with Prisma adapter on MariaDB before merge.
- Medium test gaps (M1–M5) mean authorization context assembly, strict parsing, and matrix immutability are enforced by types only.
- `bcryptjs` caret range (`^3.0.3`) is inconsistent with the pinned auth packages.
- Five moderate audit advisories from pre-existing M0 chains persist without actionable fix.

## Follow-ups

- GPT writer should address findings M1–M5 in `tests/platform/auth-contracts/auth-contracts.test.ts` before the M2 implementation task begins.
- Findings L1–L3 are non-blocking; can be addressed concurrently with implementation.
- After M2 platform merge, the `authorize()` implementation must consume `AuthorizationContextSchema` and verify runtime behavior matches the frozen matrix.
