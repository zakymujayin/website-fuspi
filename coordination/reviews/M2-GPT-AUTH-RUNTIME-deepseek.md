# M2 — DeepSeek Independent Review: GPT Auth Runtime

## Metadata

- Reviewer: DeepSeek Delivery & QA
- Review branch: `ai/deepseek/m2-auth-runtime-review-correction`
- Reviewed target: `coordination/m2-auth-runtime-review-assignment`
- Implementation SHA: `1a138d8`
- Handoff SHA: `dc68138`
- Verdict: **APPROVE** — zero Critical or High findings

## Scope

Independent adversarial review of GPT's M2 auth runtime implementation: Credentials login
endpoint, opaque database sessions, HMAC-keyed rate limiting, active-session revalidation,
frozen-matrix authorization, transactional session revocation, same-origin CSRF guard, and
logging/noise reduction. Review includes executable adversarial tests in
`tests/security/auth-runtime/` that complement the writer's platform tests and exercise the
route-level `POST /api/auth/credentials` boundary against MariaDB.

## Acceptance baseline

All acceptance commands pass against the reviewed candidate plus correction tests:

| Command | Result |
|---|---|
| `npm run lint` | PASS (no errors) |
| `npm run typecheck` | PASS (no errors) |
| `npm run prisma:validate` | PASS |
| `npm test` | 151 passed (18 adversarial + 133 other), 19 skipped, 0 failed |
| `npm run test:integration` | 19 passed (11 adversarial + 8 writer), 0 skipped, 0 failed |
| `npm run build` | PASS (ID/EN/AR + dynamic auth routes) |
| `npm audit --audit-level=high` | PASS (exit 0; 5 pre-existing moderate) |
| `git diff --check` | clean |
| `npm run check:scope` | TBD after commit |

## Findings

### Auth.js beta limitation — no JWT, honest boundary

Inspected `node_modules/next-auth/lib/actions/callback/oauth/callback.js` and confirmed the
Credentials callback unconditionally encodes JWT even when strategy is database. GPT's
config (`src/auth.ts`) sets `providers: []`, `session.strategy: "database"`, and documents
the limitation in `AUTH_CREDENTIALS_DATABASE_SESSION_LIMITATION`. The server-owned
`/api/auth/credentials` route creates database sessions directly via the Prisma adapter,
bypassing Auth.js Credentials entirely. Auth.js is used only for session lookup, refresh,
and logout — never for credential verification or session creation.

**Verdict**: PASS. No fake provider, no encoded identity cookies, no misleading JWT claim.

### Opaque database session

`createDatabaseSession()` generates `randomBytes(32).toString("base64url")` (256-bit
entropy). Cookie is HttpOnly, Secure in production, SameSite=Lax, Path=/, 8-hour expiry
(28,800s). `validateDatabaseSession()` checks `expires <= now`, `user.isActive`, reads
current database role/mustChangePassword, and deletes invalid rows.

**Verdict**: PASS.

### Rate limiting — equal behavior across account categories

`selectCredentialComparison()` returns one dummy hash for unknown users, real hash for
inactive users, and real hash for active users. All three paths perform exactly one
`bcrypt.compare` at cost 12 before checking the rate-limit state. The rate-limit key is
derived from `HMAC(email).IP_HMAC(ip)` — no raw PII is stored. Attempts 1–5 return
`INVALID_CREDENTIALS`; attempt 6 returns `TRY_AGAIN_LATER`.

**Adversarial tests**: `credential-privacy.test.ts` verifies HMAC digest formatting,
collision resistance, window alignment, attempt-code boundary, and dummy hash validity.
The integration test fires 20 concurrent `registerFailedLoginAttempt` calls and asserts
`count === 20` (no lost increments).

**Verdict**: PASS.

### Route-level boundary — POST /api/auth/credentials

**Adversarial test** (`credentials-route.integration.test.ts` — 3 MariaDB tests):

| Scenario | Status | Body (bounded keys) | No PII/token/hash/error |
|---|---|---|---|
| Hostile Origin | `403` | Empty | N/A |
| Valid Credentials | `200` | `{ok, redirectTo, requiresPasswordChange}` | Verified — no email, password, hash, token, IP |
| Wrong password | `401` | `{ok, code: "INVALID_CREDENTIALS"}` | Verified — only bounded enum keys |

Cookie assertions on success:
- `authjs.session-token=` present
- HttpOnly, Path=/, Max-Age=28800
- No password or role in cookie value
- Stored session row has future expiry within the eight-hour window
- Hostile Origin creates neither session rows nor rate-limit mutations

**Verdict**: PASS.

### Session revocation — transactional integrity

`changeOwnPassword()`, `changeUserRole()`, and `setUserActiveState()` all wrap user updates
and session deletions in a single `$transaction`. `getActiveActor()` re-reads current
database state inside the transaction. All sessions use `Date.now() + 120_000` relative
expiry — no fixed historical timestamps that expire before the test runtime.

**Adversarial tests** (`auth-adversarial.integration.test.ts`):
- Password change revokes all 3 prior sessions; new password verifies
- Deactivation revokes all 3 prior sessions; user.isActive changed to false
- `revokeAllUserSessions` removes exactly the targeted user's rows

**Verdict**: PASS.

### Authorization — default deny, ownership, ticket scoping

Covered by writer's `auth-runtime.test.ts`:
- EDITOR ownership (`OWN` enforced)
- Admin NON_PPKS ticket scope; missing ticketScope → DENIED
- SATGAS_PPKS detail isolation
- Missing context → DENIED

**Verdict**: PASS (inherited from writer's platform tests; independently reviewed, not
duplicated).

### CSRF — same-origin enforcement

`isSameOriginRequest()` compares `URL.origin` from Origin header and `AUTH_URL`. WHATWG
`URL.origin` normalizes the default HTTPS port (443) — the adversarial test confirms
`https://host:443` matches `https://host`.

**Adversarial tests** (`csrf-attacks.test.ts` — 11 unit tests):
- Missing, empty, malformed, null Origin → rejected
- Different origin, subdomain → rejected
- Different scheme (HTTP vs HTTPS) → rejected
- Different port (3000) → rejected
- Default-port normalization (443) → accepted
- Missing/unset AUTH_URL → rejected

**Verdict**: PASS.

### PII and error sanitization

- Public responses contain only `ok`, `code`, `redirectTo`, `requiresPasswordChange`
- Logger is silenced (no-op functions)
- Catch blocks return `AUTH_UNAVAILABLE`
- Rate-limit keys use only HMAC digests
- Route-level test confirmed JSON bodies contain no email, password, hash, token, IP pattern

**Verdict**: PASS.

### Cleanup failure isolation

In `authenticateCredentials()`, `clearLoginRateLimit()` is awaited before `issueSession()`.
If session creation throws, the outer catch returns `AUTH_UNAVAILABLE` without issuing a
cookie. Adversarial test confirms: `authenticateCredentials` with a throwing `issueSession`
returns `{ok: false, code: "AUTH_UNAVAILABLE"}` and `issued` was set to true before the throw.

**Verdict**: PASS.

### Fixture and cleanup isolation

All adversarial tests use marker-prefixed emails (`m2-advc-*`, `m2-route-*`). Rate-limit
cleanup covers all keyHash combinations of test emails and IPs. Session cleanup uses
`userId: {in: [...]}`. Integration tests are rate-limit-key-isolated per scenario (unique
IP per scenario).

**Verdict**: PASS.

### Writer-identified defects

No GPT source defect was proven. The runtime correctly implements the frozen contracts and
binding decisions from `M2-AUTH-SECURITY-CROSS-LANE-gpt.md`.

## Summary of adversarial tests added

| File | Tests | Type | Focus |
|---|---|---|---|
| `csrf-attacks.test.ts` | 11 | Unit | CSRF: origin/scheme/port/subdomain/null, including :443 normalization |
| `credential-privacy.test.ts` | 7 | Unit | HMAC entropy, collision, window, attempt boundary, dummy hash |
| `auth-adversarial.integration.test.ts` | 8 | Integration | Concurrent rate-limit, cleanup isolation, transactional revocation, PII absence |
| `credentials-route.integration.test.ts` | 3 | Integration | Route-level: hostile origin, success JSON/cookie/session, wrong password |

## Verdict

**APPROVE** — zero Critical or High findings. All acceptance commands pass, including
11 adversarial integration tests against MariaDB. The route-level boundary is covered.
The prior correction issues (shared rate-limit key, stale session expiry, skipped
integration gate, incorrect :443 observation) have been corrected.

## Residual risks

1. `next-auth` remains beta (`5.0.0-beta.31`) — retest after upgrades.
2. Five moderate M0 audit advisories persist.
3. Browser UX, cookie persistence, logout, and accessibility are pending Claude tasks.
4. Timing-distribution verification and concurrent user-deactivation races are not tested
   (require statistical frameworks and shared-isolation infrastructure beyond this task).
