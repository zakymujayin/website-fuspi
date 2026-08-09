# HANDOFF — M2-GPT-AUTH-RUNTIME

- Task: `M2-GPT-AUTH-RUNTIME`
- Branch: `ai/gpt/m2-auth-runtime`
- Base SHA: `d61ea002b31dc8881560685e35a8872d28c6415d`
- Implementation SHA: `42fcbc5`
- Owner: GPT Platform
- Reviewer/tester: DeepSeek Delivery & QA
- Status: ready for independent review; not merged

## Summary

Implemented the server-only M2 authentication runtime with opaque eight-hour MariaDB
sessions, deterministic public failures, HMAC-keyed persisted login limiting, active-session
revalidation, frozen-matrix authorization, transactional password/role/deactivation
revocation, and a reusable same-origin guard.

The implementation adds:

- `/api/auth/credentials` as the reviewed server-owned Credentials login endpoint;
- `/api/auth/[...nextauth]` for Auth.js database-session read/refresh/logout behavior;
- Auth.js Prisma adapter filtering for expired/inactive users;
- opaque 32-byte session tokens with production `__Secure-` cookie contract;
- exact attempts 1–5 `INVALID_CREDENTIALS`, attempt 6/block
  `TRY_AGAIN_LATER` behavior;
- one cost-12 bcrypt comparison for known, unknown, and inactive account paths;
- session-token revalidation inside the same transaction as password, role, and
  deactivation mutations;
- default-deny ownership/ticket-scope authorization;
- unit and MariaDB integration coverage using reserved `.test` fixtures.

## Auth.js beta limitation and chosen boundary

Installed `next-auth@5.0.0-beta.31` / `@auth/core@0.41.2` explicitly rejects a
Credentials-only configuration with `session.strategy = "database"`. Its Credentials
callback also always executes the JWT encode path. The implementation therefore does not
add a fake provider, enable JWT, patch `node_modules`, or mislabel a JWT as a database
session.

Following ADR-0002's authorized fallback, FUSPI verifies Credentials and creates the
`Session` row/cookie through its server-owned endpoint. Auth.js is configured with the
Prisma adapter and database strategy for session lookup, refresh, and logout. The public
cookie contains only the opaque database token. This limitation must remain visible during
independent review and future Auth.js upgrades.

## Files changed

- `src/auth.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/auth/credentials/route.ts`
- `src/lib/auth/runtime/adapter.ts`
- `src/lib/auth/runtime/authorization.ts`
- `src/lib/auth/runtime/config.ts`
- `src/lib/auth/runtime/cookie.ts`
- `src/lib/auth/runtime/credentials.ts`
- `src/lib/auth/runtime/csrf.ts`
- `src/lib/auth/runtime/password.ts`
- `src/lib/auth/runtime/rate-limit.ts`
- `src/lib/auth/runtime/session.ts`
- `src/lib/security/hmac.ts`
- `src/types/next-auth.d.ts`
- `tests/platform/auth-runtime/auth-runtime.test.ts`
- `tests/platform/auth-runtime/auth-runtime.integration.test.ts`
- `coordination/handoffs/M2-GPT-AUTH-RUNTIME-gpt.md`

## API, schema, migration, and dependency impact

- New HTTP API: `POST /api/auth/credentials`.
  - Success: frozen `LoginResult` and opaque session cookie.
  - Invalid account/password/inactive: `401 INVALID_CREDENTIALS`.
  - Blocked attempt: `429 TRY_AGAIN_LATER` plus fixed `Retry-After`.
  - Sanitized infrastructure failure: `503 AUTH_UNAVAILABLE`.
  - Missing/untrusted Origin: empty `403`.
- Auth.js catch-all route is now present for session/logout endpoints.
- No Prisma schema or migration change.
- No generated-client change.
- No dependency, root config, environment contract, proxy, UI, or message change.
- Existing `TOKEN_HMAC_SECRET`, `IP_HASH_SECRET`, `AUTH_SECRET`, `AUTH_URL`, `User`,
  `Session`, and `RateLimitBucket` contracts are consumed unchanged.

## Acceptance evidence

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run prisma:validate` | PASS |
| `npm test` | PASS — 133 passed, 8 integration-only skipped |
| `npm run test:integration` | PASS — 8 passed (Auth runtime + existing platform DB) |
| `npm run build` | PASS — ID/EN/AR plus both dynamic auth routes |
| `npm audit --audit-level=high` | PASS exit 0 — 5 pre-existing Moderate, 0 High/Critical |
| `git diff --check` | PASS |
| task `npm run check:scope` | PASS — 16 implementation files within lease |

Production-build HTTP smoke evidence:

- unauthenticated Auth.js session endpoint: `200` with `null` body;
- cross-origin Credentials POST: empty `403`;
- same-origin malformed Credentials POST: `401 {ok:false, code:INVALID_CREDENTIALS}`;
- temporary server stopped after the checks.

## Security invariants verified

- The raw email and IP are not stored in `RateLimitBucket`; only separate HMAC digests are
  combined into `keyHash`.
- Existing, unknown, and inactive accounts produce identical five-failure/one-blocked code
  sequences and exactly one comparison per attempt.
- Unknown users use one fixed valid cost-12 dummy hash; inactive users still compare their
  real hash.
- Successful login creates one opaque session row expiring after exactly 28,800 seconds.
- Session validation removes expired/inactive rows and reads the current database role.
- Password change updates the cost-12 hash, clears `mustChangePassword`, and deletes every
  session in the same transaction.
- Role change and deactivation validate the actor session and revoke target sessions inside
  the same transaction; stale/non-admin attempts are denied without mutation.
- Result objects contain no email, password, hash, session token, raw IP, or database error.

## Untested areas and residual risks

1. DeepSeek must independently convert the relevant blocked M2 threat cases into executable
   adversarial tests, including timing-distribution tolerance and concurrent limiter calls.
2. Browser-level successful login, CSRF, logout, cookie persistence, and accessibility wait
   for the leased DeepSeek/Claude tasks; no login UI exists in this task.
3. `next-auth` remains beta. A future upgrade must retest whether native Credentials database
   sessions become supported before removing the custom endpoint.
4. Five Moderate advisories remain in pre-existing Prisma dev-tool and Next/PostCSS chains;
   `npm audit fix --force` would apply breaking downgrades and was not used.
5. The project uses standalone Next output; local `next start` emitted the known standalone
   warning although the smoke server served the tested routes. Deployment must use the
   generated standalone server as already planned.

## Follow-ups

- DeepSeek: independent code review plus executable tests for `auth.session-revocation`,
  `auth.rate-limit`, `auth.csrf`, and `lib.authorization` after this branch enters its review
  assignment.
- Claude: login/password/session UX only after this runtime is reviewed and merged.
- GPT: address reviewer findings on this branch; do not open shared upload/crypto work or M3
  from this handoff.
