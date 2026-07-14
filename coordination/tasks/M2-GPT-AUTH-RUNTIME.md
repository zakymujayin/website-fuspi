---
id: M2-GPT-AUTH-RUNTIME
milestone: M2
owner: gpt
reviewer: deepseek
tester: deepseek
base_sha: b5fb376
allowed_paths:
  - "src/auth.ts"
  - "src/app/api/auth/**"
  - "src/lib/auth/runtime/**"
  - "src/lib/security/hmac.ts"
  - "src/types/next-auth.d.ts"
  - "tests/platform/auth-runtime/**"
  - "coordination/handoffs/M2-GPT-AUTH-RUNTIME-gpt.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env.example"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/auth.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/proxy.ts"
  - "src/app/[locale]/**"
  - "src/components/**"
  - "messages/**"
readonly_paths:
  - "prisma/schema.prisma"
  - "src/contracts/auth.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/db/**"
  - "tests/security/m2-threat-plan.ts"
  - "coordination/adr/ADR-0002-auth-dependency-contract.md"
  - "coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md"
  - "coordination/reviews/M2-AUTH-UX-SPEC-claude.md"
  - "coordination/reviews/M2-GPT-AUTH-CONTRACT-deepseek.md"
depends_on:
  - M2-GPT-AUTH-CONTRACT
  - M2-REVIEW-GPT-AUTH-CONTRACT
contracts:
  - docs/06-autentikasi-role.md
  - docs/20-test-acceptance-go-live.md
  - coordination/adr/ADR-0002-auth-dependency-contract.md
  - coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run test:integration
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-AUTH-RUNTIME.md TASK_BASE=origin/integration/m2-security npm run check:scope
risk: critical
token_class: L
status: assigned
---

# M2 GPT Auth Runtime

Implement the server-only Auth.js Credentials and authorization runtime against the frozen
contract and existing MariaDB schema. Do not implement login/password UI, change navigation,
change `proxy.ts`, add dependencies, alter Prisma, or begin M3.

## Required framework inspection

Before changing framework behavior, read the installed Next.js 16 guides:

- `node_modules/next/dist/docs/01-app/02-guides/authentication.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md`

Also inspect the installed `next-auth@5.0.0-beta.31` and
`@auth/prisma-adapter@2.11.2` types/source. Do not rely on examples from older Auth.js or
Next.js releases.

## Runtime requirements

1. Configure Auth.js Credentials with the existing Prisma client/adapter and an eight-hour
   opaque database session. There is no JWT fallback. Expose the App Router Auth.js route
   handler and typed server helpers only.
2. Prove with MariaDB integration tests that successful credentials authentication creates
   a `Session` row and an opaque cookie whose production contract is `HttpOnly`, `Secure`,
   `SameSite=Lax`, `Path=/`, and eight-hour expiry. If the pinned adapter does not create a
   database session for Credentials automatically, implement the minimal server-owned
   creation/revocation path; never put identity, role, or authorization state in a JWT.
3. Normalize and validate all credentials with the frozen Zod schema. Unknown, inactive,
   deleted, and wrong-password accounts return the same `INVALID_CREDENTIALS` result and
   never expose account existence or raw Auth.js/database errors.
4. Perform exactly one cost-12 bcrypt comparison after lookup: the real stored hash for a
   known user, the frozen valid dummy hash for an unknown/deleted user, and the real hash
   before rejecting an inactive user. Do not generate the dummy hash per request.
5. Implement an atomic MariaDB-backed login limiter using the existing `RateLimitBucket`.
   Derive its compound key from separate HMACs of normalized email and client IP without
   querying account existence. Attempts 1–5 return `INVALID_CREDENTIALS`; attempt 6 and the
   blocked window return `TRY_AGAIN_LATER`, with identical public shape/headers for known,
   unknown, and inactive accounts. Do not expose remaining attempts or store raw email/IP.
6. Revalidate the database `Session`, expiry, current `User.isActive`, current role, and
   `mustChangePassword` on every protected server helper call. Return only the frozen typed
   session-invalid result or a server-only active-session object; never serialize tokens,
   hashes, email, or raw errors.
7. Implement layered `authorize()` behavior from the frozen permission matrix, including
   ownership and ticket data scope. Default deny missing/invalid context. `proxy.ts` remains
   outside this task and must not be treated as an authorization boundary.
8. Implement server-only password change and security-state mutation primitives. Verify the
   current password, enforce the frozen input plus the email/common-password policy, hash at
   cost 12, clear `mustChangePassword`, and delete every existing session in the same
   transaction. Role change and deactivation primitives must also revoke all sessions in the
   same transaction. Do not create admin UI or public password reset.
9. Provide a reusable same-origin/CSRF guard for future mutations. Reject untrusted or
   missing origins deterministically without leaking configured hosts or technical errors.
10. Do not log credentials, email, IP, session tokens, password hashes, HMAC input/output,
    cookies, authorization headers, or database errors. Fixtures use reserved `.test`
    domains and synthetic IPs only.

## Required tests

- Unit tests cover validation, safe redirects, dummy/real comparison selection, exact
  rate-limit boundary, sanitized errors, CSRF origin handling, authorization ownership and
  ticket scopes, and no secret/PII in returned objects.
- MariaDB integration tests cover opaque session creation/expiry, inactive and expired
  session rejection, password/role/deactivation revocation, atomic password change,
  limiter persistence, and known/unknown/inactive response equivalence.
- Tests clean up their synthetic rows and do not mutate migrations or shared seed data.
- Record any Auth.js beta behavior or pinned-adapter limitation precisely in the handoff.

Commit the implementation and its required handoff, push the GPT task branch, and stop.
Do not merge, issue DeepSeek/Claude work, or start M3.
