# M2 Exit Gate Evidence Audit

Audit date: 2026-07-15 (Asia/Jakarta)

Audited integration head: `8d804f1f09bdb81d0469f3f8ecbb226f2f84e3a6`

Assignment head: `f5a7a13`

Decision: **platform code complete; milestone acceptance and M3 entry remain blocked**

## Automated evidence

| Gate | Result | Durable evidence |
| --- | --- | --- |
| GitHub integration pipeline | PASS | Run `29431120389` for `8d804f1`: migration deploy, double seed, lint, typecheck, Prisma validate, unit, PostgreSQL integration, and build all succeeded. |
| Unit suite | PASS | `npm test`: 376 passed; database-gated cases skipped by the unit configuration and executed by the integration configuration. |
| PostgreSQL integration suite | PASS | `npm run test:integration`: 54 passed against PostgreSQL. |
| Production build | PASS | `npm run build`. |
| Browser/UX suite | PASS | `npm run test:e2e`: 166 passed across desktop Chromium and Pixel 7 projects. |
| Dependency severity gate | PASS | `npm audit --audit-level=high`: zero High/Critical; five Moderate remain visible and are not represented as zero findings. |
| Redirect registry acceptance | PASS | Unit and PostgreSQL adversarial coverage includes invalid local paths, chain/loop rejection, concurrent opposite edges, fail-closed resolution, and hit counting. |

GitHub evidence: https://github.com/zakymujayin/website-fuspi/actions/runs/29431120389

## Platform invariant mapping

### Authentication and authorization

- `tests/platform/auth-runtime/auth-runtime.integration.test.ts` proves opaque eight-hour
  sessions, equal failure sequences, inactive/expired rejection, password revocation, role-change
  revocation, deactivation revocation, and rejection of unauthorized security mutations.
- `tests/security/auth-runtime/auth-adversarial.integration.test.ts` covers shared rate-limit
  concurrency, HMAC privacy, dummy/real bcrypt selection, issuer failure, and transactional
  revocation.
- `tests/security/auth-runtime/credential-privacy.test.ts` covers cost-12 dummy bcrypt and bounded
  public error sequencing.
- `tests/security/auth-runtime/csrf-attacks.test.ts` covers missing, malformed, null, cross-origin,
  subdomain, scheme, and port attacks for the implemented auth boundary.
- `tests/security/auth-bridge/` and `e2e/auth/` cover generic responses, safe server destinations,
  password/session flows, credential privacy, locale, RTL, keyboard, focus, and mobile layout.

This does not prove IDOR on Post or ticket routes that do not exist. Contract permission tests
cannot substitute for a query/action-level negative test.

### Storage, encryption, and content safety

- `tests/platform/storage/upload-storage-boundaries.test.ts` covers MIME mismatch, size/pixel
  ceilings, malformed/active PDF, distinct absolute roots, restrictive staging, tamper cleanup,
  collision behavior, symlink escape, and fail-closed PPKS plaintext storage.
- `tests/platform/storage/ppks-attachment-crypto.test.ts` covers ciphertext-only writes, filename
  privacy, fresh nonce, key versioning, tamper rejection, plaintext mutation rejection, cleanup,
  collision behavior, and symlink escape.
- `tests/platform/security/crypto-hmac-primitives.test.ts` covers versioned AES-GCM envelopes,
  nonce generation, key selection, opaque tracking tokens, domain-separated HMAC, and constant
  digest verification.
- `tests/platform/security/content-sanitizer.test.ts` covers rich-text active content removal and
  CSV formula-injection escaping.

This is primitive/storage evidence. It does not prove rollback around a future Media database
insert or privacy behavior of future PPKS routes, RSC payloads, exports, and emails.

### Concurrency, delivery, and redirect

- `tests/platform/annual-sequence.integration.test.ts` proves 20-way unique/gap-free allocation,
  independent ticket/booking kinds, and Jakarta year rollover.
- `tests/platform/outbox-worker.integration.test.ts`, `tests/platform/outbox-worker.test.ts`, and
  `tests/platform/outbox-smtp.test.ts` cover bounded claiming, stale-lock recovery, retry/final
  failure behavior, aggregate-only output, recipient validation, escaped templates, and generic
  provider failures.
- `tests/platform/redirect-registry.integration.test.ts` and
  `tests/platform/redirect-registry.test.ts` cover the one-hop redirect platform invariant.

No local test can prove that a VPS scheduler actually runs every five minutes, that uploads
survive deploy/rollback, or that a real SMTP provider delivers without duplicate scheduling.

## Threat-registry reconciliation

Reconciled by `M2-GPT-THREAT-REGISTRY-RECONCILIATION`. The 36 cases now have an explicit
execution state, owning milestone, evidence paths, and a bounded explanation:

- 14 `covered` M2 cases are executable and link to present tests;
- 12 `partial` cases link to tested platform primitives but remain non-executable until their
  final M3/M4 route or action exists;
- 10 `blocked` M3/M4 feature cases claim no executable evidence.

Meta-tests reject missing evidence paths, inconsistent state/boolean combinations, unknown
milestones, and any attempt to label an M3/M4 case executable.

## Remaining blockers

1. Independent consolidated-head threat-surface review.
2. Automated axe and recorded manual screen-reader acceptance for auth.
3. VPS staging proof for SMTP, scheduler, persistent storage, backup/restore, and secret/file
   permissions.

Until those three blockers are closed, the correct status is `M2 platform code complete; M2
acceptance blocked; M3 blocked`.
