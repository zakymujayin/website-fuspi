# Handoff — M2-GPT-UPLOAD-STORAGE-BOUNDARIES — GPT

- Branch: `ai/gpt/m2-upload-storage-boundaries`
- Base SHA: `4e007e4`
- Implementation head SHA: `4deef42`

## Result

Added a provider-neutral upload and staged-filesystem boundary:

- magic-byte detection through `file-type`, strict declared/detected MIME agreement, and
  feature-policy size/type limits;
- JPEG/PNG/WebP decoding with Sharp pixel limits, single-frame enforcement, auto-rotate,
  bounded resize, and deterministic WebP output;
- bounded PDF signature/terminal validation and rejection of active PDF actions;
- hostile/double-extension/null-byte/path/bidi filename rejection, metadata-only display
  name normalization, SHA-256 checksums, and server-generated 32-byte opaque keys;
- absolute, complete, non-overlapping PUBLIC/PRIVATE/PPKS roots with canonical containment;
- exclusive staged writes, restrictive permissions, pre-commit checksum verification,
  fail-closed state transitions, hard-link no-overwrite commit, cleanup, and symlink checks;
- plaintext `PPKS_PRIVATE` writes are rejected by the writable upload contract.

No route, database mutation, migration, environment variable, download behavior,
authorization, or PPKS plaintext persistence was added.

## Files changed

- `src/contracts/storage.ts`
- `src/lib/storage/error.ts`
- `src/lib/storage/index.ts`
- `src/lib/storage/paths.ts`
- `src/lib/storage/staged-file.ts`
- `src/lib/storage/validate-upload.ts`
- `tests/platform/storage/upload-storage-boundaries.test.ts`
- `coordination/handoffs/M2-GPT-UPLOAD-STORAGE-BOUNDARIES-gpt.md`

## Contract/schema/migration impact

- New Zod upload policy, storage key, checksum, and validated-upload contracts.
- New pure validation and filesystem staging API.
- No Prisma/schema/migration, package, lockfile, or environment-contract change.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 299 passed, 34 DB-gated skipped |
| `npx vitest run tests/platform/storage/upload-storage-boundaries.test.ts` | PASS — 36 passed |
| `npm run build` with documented build-only PostgreSQL/Auth/HMAC environment | PASS on retry |
| `npm audit --audit-level=high` | PASS — exit 0; 0 High/Critical, 5 Moderate transitive advisories |
| `git diff --check` | PASS |

The first Node-focused suite found a real collision cleanup flaw: a failed hard-link to an
existing storage key could remove the existing file. Cleanup now removes a destination only
after this process successfully linked it, and the unchanged collision test passes. The
first clean build timed out while downloading existing Google Fonts; the identical retry
completed production compilation, typechecking, static generation, and route collection.

## Untested areas

- No route/database transaction is present, so database rollback plus staged-file discard
  remains for the later upload action integration task.
- Private range downloads, authorization, headers, and reference-aware deletion are later
  tasks.
- PPKS encrypted streaming is intentionally blocked rather than implemented here.

## Risks and follow-ups

- Filesystem roots are trusted operator configuration. Runtime checks reject symlink roots
  and generated path components, but OS ownership/permissions remain deployment controls.
- Raw images are rewritten to WebP; later database consumers must persist the returned MIME,
  size, dimensions, checksum, and storage key rather than browser metadata.
- Five existing Moderate transitive advisories remain because automated fixes require
  breaking dependency downgrades.

## Requested shared changes

None. The next GPT task should add encrypted PPKS attachment staging using the existing
AES-GCM/key-version contract without enabling a plaintext fallback.
