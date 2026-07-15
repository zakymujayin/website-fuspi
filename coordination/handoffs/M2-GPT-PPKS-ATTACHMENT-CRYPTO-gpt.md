# Handoff — M2-GPT-PPKS-ATTACHMENT-CRYPTO — GPT

- Branch: `ai/gpt/m2-ppks-attachment-crypto`
- Base SHA: `6e284e8`
- Implementation head SHA: `c641c63`

## Result

Added the only permitted encrypted staging path for validated PPKS attachments:

- dedicated validation reuses the frozen upload boundary, selects `PPKS_PRIVATE`, replaces
  user-supplied filenames with generic download names, and generates an opaque `.enc` key;
- AES-256-GCM encryption uses a fresh 96-bit nonce, 128-bit tag, positive key version, and
  mandatory AAD that binds the ticket ID, attachment ID, and PPKS attachment purpose;
- plaintext remains in memory and only ciphertext is staged under the PPKS root;
- returned metadata is compatible with `TicketAttachment` and retains the plaintext SHA-256
  checksum, while staged ciphertext is independently checksummed before commit;
- decryption requires a key-version resolver and the identical AAD context, verifies the
  decrypted plaintext checksum, and collapses all validation/crypto failures to one generic
  error message;
- the existing exclusive/no-overwrite, restrictive-permission, symlink-safe staged-file
  boundary is reused, including cleanup on failure.

No route, database write, Prisma migration, environment parser, authorization behavior,
logging, email, UI, or plaintext fallback was added.

## Files changed

- `src/contracts/storage.ts`
- `src/lib/storage/error.ts`
- `src/lib/storage/index.ts`
- `src/lib/storage/paths.ts`
- `src/lib/storage/ppks-attachment.ts`
- `src/lib/storage/staged-file.ts`
- `src/lib/storage/validate-upload.ts`
- `tests/platform/storage/ppks-attachment-crypto.test.ts`
- `coordination/handoffs/M2-GPT-PPKS-ATTACHMENT-CRYPTO-gpt.md`

## Contract/schema/migration impact

- Added Zod contracts for encrypted PPKS keys, validated PPKS attachments, and persisted
  attachment crypto metadata.
- Added public storage APIs for validate/encrypt-stage/decrypt operations.
- No Prisma/schema/migration, package, lockfile, environment-contract, route, or auth change.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 315 passed, 34 DB-gated skipped |
| `npx vitest run tests/platform/storage/upload-storage-boundaries.test.ts tests/platform/storage/ppks-attachment-crypto.test.ts` | PASS — 52 passed |
| `npm run build` with documented build-only PostgreSQL/Auth/HMAC environment | PASS |
| `npm audit --audit-level=high` | PASS — exit 0; 0 High/Critical, 5 Moderate transitive advisories |
| `git diff --check` | PASS |
| `TASK_MANIFEST=coordination/tasks/M2-GPT-PPKS-ATTACHMENT-CRYPTO.md TASK_BASE=origin/coordination/m2-gpt-ppks-attachment-assignment npm run check:scope` | PASS — 9 changed files within lease |

The focused regression suite initially exposed an adapter regression after the low-level
staging input became stricter: the existing upload adapter forwarded metadata fields into a
strict filesystem schema. The adapter now selects only filesystem fields, and all 36 frozen
upload-boundary tests plus all 16 new adversarial PPKS tests pass.

## Untested areas

- No database transaction or upload route exists in this task, so coordinated database
  rollback and staged-file discard remain for a later integration task.
- Authorized download/read handling, `TicketAccessLog`, and response headers are not present.
- Production keyring/environment resolution and production filesystem permissions require
  deployment validation.

## Risks and follow-ups

- Later routes must authorize every operation, bind the exact ticket/attachment IDs, and
  write the required access audit without exposing storage paths or crypto metadata.
- Generic download names are deliberate privacy controls; later UI must not reconstruct or
  persist a user-supplied filename.
- Ciphertext has GCM authentication and a staging checksum, but operators must still protect
  key material and encrypted storage with OS-level access controls and backups.
- Five existing Moderate transitive advisories remain because automated fixes require
  breaking dependency downgrades.

## Requested shared changes

None. A later GPT-owned contract task may integrate these primitives with authorized PPKS
upload/download flows and database transactions; it must not introduce plaintext fallback.
