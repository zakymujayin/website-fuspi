# M2 Final Consolidated Security Review

Review date: 2026-07-15 (Asia/Jakarta)

Reviewer: GPT integrator in a dedicated closure task, separate from the feature delivery tasks

Base reviewed: `e3b8592`

Decision: **no confirmed Critical or High defect; M2 development security gate passes**

## Scope and method

The review traced the consolidated authentication/session, authorization, persistent rate-limit,
CSRF, safe redirect, AES-GCM/HMAC, upload/storage, PPKS attachment, outbox, sanitizer, sequence,
SLA, optimistic-lock, and redirect-registry boundaries. It also searched application code for
secret/PII logging, unsafe navigation, cookie weakness, unbounded input, raw database errors,
filesystem traversal, caller-controlled nonce, and non-atomic state changes.

The review used the executable threat registry rather than assuming every design row was runnable.
M3/M4 route cases remain non-executable merge blockers for their owning feature slices.

## Findings

### Critical

None found.

### High

None found.

### Moderate fixed in this task

1. `next@16.2.6` bundled a PostCSS version affected by `GHSA-qx2v-qp2m-jg93`. Next.js and
   `eslint-config-next` were patch-upgraded to `16.2.10`; because that stable package still pins
   PostCSS 8.4.31 internally, a narrow `next > postcss` override pins `8.5.19`.
2. Prisma CLI pulled `@hono/node-server` below its repeated-slash fix. A transitive override pins
   the compatible patched `1.19.13`. This package is development tooling, not the application
   runtime, but the vulnerable tree is no longer installed.

After both corrections, `npm audit` reports **0 vulnerabilities**. `npm run prisma:validate`,
Prisma generation, tests, and production build are required after the overrides to prove
compatibility.

### Deployment condition retained

`src/app/api/auth/credentials/route.ts` consumes reverse-proxy client IP headers for the compound
login limiter. On the VPS, Nginx/Caddy must discard inbound client-supplied `X-Real-IP` and
`X-Forwarded-For` values and set its own trusted values. This is a reverse-proxy/staging
configuration requirement and remains a deployment/go-live blocker; it does not justify inventing
an application IP address when the Web Request API has no authenticated peer address.

## Verified invariants

- Session tokens are opaque random 32-byte values; cookies are HttpOnly, production Secure,
  SameSite=Lax, Path=/, and expire after eight hours.
- Every session validation rechecks expiry and active-user state; password, role, and deactivation
  mutations revoke sessions transactionally.
- Existing, inactive, and unknown credential failures have identical public sequences and one
  cost-12 bcrypt operation. A new alternating median-distribution test closes `M2-AUTH-007`.
- Implemented mutations reject missing/malformed/cross-origin Origin headers.
- Redirects accept only validated internal admin paths and reject auth loops/external origins.
- AES-GCM uses internal random 96-bit nonces, authenticated context, strict key versions, bounded
  plaintext, and generic tamper errors.
- PPKS attachment staging persists ciphertext only; public/private roots are distinct and guarded
  against traversal, symlinks, collisions, and tampering.
- Outbox claims use PostgreSQL row locking and bounded retries; errors and runner output remain
  aggregate/generic.
- No application `console.*` path logs credentials, session tokens, PPKS content, ciphertext, or
  storage keys.

## Residual gates

- Route-level Post/Media IDOR, upload rollback, ticket/PPKS isolation, booking concurrency, and
  per-route CSRF remain mandatory in M3/M4 when those routes exist.
- Reverse-proxy trust, real SMTP, scheduler, persistent storage, backup/restore, and production
  permissions remain staging/go-live gates.
- This artifact is an independent integrator pass, not a claim of a second-model review.
