# M2 — DeepSeek Independent Review: GPT Auth Bridge

## Metadata

- Reviewer: DeepSeek Delivery & QA
- Review branch: `ai/deepseek/m2-auth-bridge-review`
- Reviewed target: `coordination/m2-deepseek-auth-bridge-review-assignment`
- Implementation SHA: `e615950`
- Handoff SHA: `898fc3c`
- Verdict: **APPROVE** — zero Critical or High findings

## Scope

Independent adversarial review of GPT's M2 auth bridge: locale-safe redirect
normalization, dev/prod cookie-name isolation, session revalidation without actor-data
serialization, `POST /api/auth/password` route boundary, transactional password mutation
with session revocation, and public-result schema enforcement.

Review includes 33 adversarial unit tests and 11 adversarial integration tests (MariaDB)
under `tests/security/auth-bridge/` exercising edge cases not covered by the writer's
platform tests.

## Acceptance baseline

| Command | Result |
|---|---|
| `npm run lint` | PASS (no errors) |
| `npm run typecheck` | PASS (no errors) |
| `npm test` | 196 passed, 34 skipped, 0 failed |
| `npm run test:integration` | 34 passed (11 adversarial + 23 existing), 0 skipped, 0 failed |
| `npm run build` | PASS |
| `npm audit --audit-level=high` | PASS (exit 0; 5 pre-existing moderate) |
| `git diff --check` | clean |
| `npm run check:scope` | 0 changed files outside lease |

## Findings

### Target 1 — Locale normalization edge cases

**Adversarial tests** (`auth-bridge-adversarial.test.ts` — 17 tests):

- Double-encoded protocol-relative attacks (`%252f%252fattacker...`) → fallback.
- Incomplete percent encodings (`%2`, `%%41`, `%GG`) → fallback.
- Query-only / hash-only / consecutive-slashes / non-recognised first segment → fallback.
- Unicode homoglyph locale prefix (`/аг/admin`) → fallback.
- Non-string locale hints (null, undefined, boolean, number, array, object) → defaults to `id`.
- Very long locale strings → defaults to `id`.
- `resolveAuthLocale` prioritises explicit localeHint over redirect-candidate inference.
- Query and fragment preserved after locale swap.

**Verdict**: PASS. Normalization is safe against hostile encoded and malformed inputs; no
injection or traversal survives.

### Target 2 — Cookie-name isolation and session rejection

**Adversarial tests** (4 tests):

- Dev cookie `authjs.session-token` and prod cookie `__Secure-authjs.session-token` are
  independent; one cannot be read as the other.
- `readSessionToken` returns `undefined` for missing cookies in both environments.
- `readSessionToken` handles empty-string cookie values without throwing.

Platform tests already cover expired-session rejection, inactive-user rejection, and
forced-password routing without actor serialization.

**Verdict**: PASS.

### Target 3 — Password route input validation

**Unit tests** (7 tests):

- Mismatched confirmation → `PasswordChangeInputSchema` rejects (confirmPassword issue).
- Same-as-current password → rejects (newPassword issue).
- Short password (< 12 chars) → rejects.
- Non-object input (null, string, number, array) → rejects.
- Extra unknown keys → `.strict()` rejects.
- Valid input → accepted.

**Integration tests** (11 tests, MariaDB):

| Scenario | Status | Code | Session preserved? |
|---|---|---|---|
| Mismatched confirmation | 400 | `PASSWORD_POLICY` | Yes |
| Same-as-current password | 400 | `PASSWORD_POLICY` | Yes |
| Common password (`password1234`) | 400 | `PASSWORD_POLICY` | Yes |
| Null body | 400 | `PASSWORD_POLICY` | — |
| String body | 400 | `PASSWORD_POLICY` | — |
| Number body | 400 | `PASSWORD_POLICY` | — |
| Array body | 400 | `PASSWORD_POLICY` | — |
| Empty object `{}` | 400 | `PASSWORD_POLICY` | — |
| Form-urlencoded body | **200** | Success → revocation | No |
| Wrong current password | 400 | `INVALID_CREDENTIALS` | Yes (no PII) |
| Extra unknown keys | 400 | Rejected | — |

Key observations:
- `PASSWORD_POLICY` failures never destroy active sessions, never set cookies.
- Form-urlencoded bodies are accepted (same as platform's `readInput` → `formData()`).
- Wrong-password responses contain only `{ok, code}` — no hash, email, userId, or
  marker.
- Extra-keys rejection proves `.strict()` is enforced end-to-end.

**Verdict**: PASS.

### Target 4 — Public result schema enforcement

**Adversarial tests** (5 tests):

- `PasswordChangeResultSchema` rejects extra keys on success (e.g. leaked sessionToken).
- `PasswordChangeResultSchema` rejects extra keys on failure (e.g. exposed reason string).
- `PasswordChangeResultSchema` rejects unknown failure codes.
- `PasswordChangeFailureCodeSchema` defines exactly four codes.
- Non-object payloads (null, string, undefined) rejected.

**Verdict**: PASS. The frozen contract prevents accidental PII or internal error leakage
through JSON responses.

### Target 5 — Route-level body sanitization

The route correctly normalizes all failure paths:
- CSRF → empty 403.
- Missing session → 401 `{ok: false, code: "SESSION_INVALID"}` + cookie expiry.
- Wrong password → 400 `{ok: false, code: "INVALID_CREDENTIALS"}` — session preserved.
- Password policy → 400 `{ok: false, code: "PASSWORD_POLICY"}` — session preserved.
- `NOT_AUTHORIZED` → mapped to public `SESSION_INVALID` + cookie expiry (hides internal
  auth state).
- Infrastructure → 503 `{ok: false, code: "AUTH_UNAVAILABLE"}`.
- `Cache-Control: no-store` set on every response.

**Verdict**: PASS.

### Writer-identified defects

No GPT source defect was proven. The bridge correctly implements the frozen contracts
from `src/contracts/auth.ts` and the binding decisions in the GPT handoff.

## Low-severity hardening notes (non-blocking follow-up)

1. **L — Inactive user rejected by session validation, not credential check**:
   `validateDatabaseSession` checks `record.user.isActive` and returns
   `SESSION_INVALID`. A session that becomes invalid mid-life due to deactivation
   produces a login redirect, not a credential-layer error. This is functionally
   correct but worth documenting: login→deactivate→next-request gets redirected,
   not blocked at password change. No exposure risk.

2. **L — `changeOwnPassword` accepts the user's email as password if ≥ 12 chars**
   and not in the common-password list: `passesAdditionalPasswordPolicy` compares
   `normalized !== email.toLowerCase()`. If the email is 12+ characters it can be
   used as a password. Already a M2 scope limitation; consistent with the relaxed
   policy stance documented in M2-GPT-AUTH-BRIDGE.

3. **L — No explicit rate limit on password-change endpoint**: while CSRF is
   enforced and session revalidation is required, a locked-out attacker with a
   valid session could brute-force the current password via the change-password
   route. Acceptable for M2 given the session requirement and the 30-minute rate-
   limit block on the login endpoint; consider adding per-session password-attempt
   tracking in a future milestone.

## Summary of adversarial tests added

| File | Tests | Type |
|---|---|---|
| `tests/security/auth-bridge/auth-bridge-adversarial.test.ts` | 33 | Unit |
| `tests/security/auth-bridge/auth-bridge-adversarial.integration.test.ts` | 11 | Integration (MariaDB) |

## Verdict

**APPROVE** — zero Critical or High findings. All 33 adversarial unit tests and 11
adversarial integration tests pass against MariaDB. The auth bridge correctly handles
malformed bodies, policy failures, hostile redirects, and schema enforcement at the
public contract boundary.

## Residual risks

1. `next-auth` remains beta (`5.0.0-beta.31`).
2. Five moderate M0 audit advisories persist.
3. No password-attempt rate limit on the change-password route.
4. Claude UI tasks (change-password page, session-expired UX) pending.
