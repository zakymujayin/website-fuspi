# Handoff — M2-GPT-CRYPTO-HMAC-PRIMITIVES — GPT

- Branch: `ai/gpt/m2-crypto-hmac-primitives`
- Base SHA: `7b7aaa4`
- Implementation head SHA: `b5f5fc4`

## Result

Added the bounded server-side cryptographic primitive layer required before PPKS and
public tracking workflows may persist sensitive data:

- strict, versioned AES-256-GCM envelopes with canonical base64url encodings;
- mandatory domain/resource/field AAD and random 96-bit nonces;
- resolver-based key rotation and one generic protected-data failure surface;
- bounded byte and schema-validated JSON encryption/decryption helpers;
- opaque 32-byte public tracking tokens with purpose-separated HMAC-SHA-256 storage;
- timing-safe canonical digest comparison while retaining the existing undomained HMAC
  digest format used by authentication rate limiting.

No route, persistence, storage, schema, environment contract, dependency, or UI behavior
was added by this task.

## Files changed

- `src/contracts/security.ts`
- `src/lib/security/encryption.ts`
- `src/lib/security/hmac.ts`
- `src/lib/security/tracking-token.ts`
- `tests/platform/security/crypto-hmac-primitives.test.ts`
- `coordination/handoffs/M2-GPT-CRYPTO-HMAC-PRIMITIVES-gpt.md`

## Contract/schema/migration impact

- New TypeScript/Zod contract: `AesGcmEnvelopeSchema`, protected-data context/purpose,
  canonical tracking token, and HMAC digest schemas.
- Existing `createHmacDigest` output remains byte-for-byte compatible for existing ASCII
  inputs and secrets; minimum secret validation now measures UTF-8 bytes.
- No Prisma schema or migration change.
- No dependency or environment-variable change.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 229 passed, 34 DB-gated skipped |
| `npx vitest run tests/platform/security/crypto-hmac-primitives.test.ts` | PASS — 29 passed |
| `npm run build` with documented build-only PostgreSQL/Auth/HMAC environment | PASS — production build and route collection complete |
| `npm audit --audit-level=high` | PASS — exit 0; 0 High/Critical, 5 Moderate transitive advisories remain |
| `git diff --check` | PASS |
| `TASK_MANIFEST=coordination/tasks/M2-GPT-CRYPTO-HMAC-PRIMITIVES.md TASK_BASE=origin/coordination/m2-gpt-crypto-hmac-assignment npm run check:scope` | PASS — 5 implementation files within lease before this handoff |

The first build attempt used a cross-worktree `node_modules` symlink and Turbopack rejected
that test setup. A clean `npm ci` resolved it. A later sandboxed build could not fetch the
project's existing Google Fonts; the same build passed with network access. Neither retry
required a source or lockfile change.

## Untested areas

- No database integration is expected for this primitive-only task.
- No real PPKS record, attachment stream, outbox payload, or production key manager is
  connected yet; those require separate leased tasks.
- Timing-safe comparison is structurally tested for valid/invalid outcomes; it is not
  benchmarked as a remote timing oracle.

## Risks and follow-ups

- Callers must obtain keys through the later environment/keyring contract and must never
  log plaintext or raw crypto failures.
- Attachment encryption needs a separate streaming/storage implementation; the bounded
  in-memory helper intentionally caps protected payloads at 1 MiB.
- Five Moderate dependency advisories remain in existing Prisma/Next transitive tooling.
  Automated `--force` fixes propose breaking downgrades and were intentionally not applied.

## Requested shared changes

None. The next task may consume these frozen primitives for an environment keyring and
PPKS persistence boundary, but must not alter them without a new GPT-owned contract task.
