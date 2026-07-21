# Handoff — M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME

- Task ID: `M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME`
- Branch: `ai/gpt/m3-media-admin-transport-runtime`
- Frozen assignment SHA: `2a0564d`
- Implementation SHA: `4c83d8f`
- Final branch head: documentation commit containing this handoff; exact SHA reported after push

## Summary

Implemented the server-only Media Library runtime: ownership-scoped picker listing, strict metadata
commands, bounded multipart image/PDF upload, all-or-nothing batch persistence compensation,
reference-aware delete, and rollback-safe committed-file quarantine.

## Files changed

- `src/app/api/admin/media/route.ts`
- `src/app/api/admin/media/upload/route.ts`
- `src/lib/content/media-admin-transport.ts`
- `src/lib/storage/committed-file.ts`
- `src/lib/storage/index.ts`
- `tests/m3/runtime/media-admin-transport.test.ts`
- `tests/m3/runtime/media-admin-transport.integration.test.ts`
- `tests/platform/storage/committed-file.test.ts`
- `tests/security/admin-media-transport-adversarial.integration.test.ts`
- `coordination/handoffs/M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME-gpt.md`

## Runtime behavior

- `GET /api/admin/media` rejects repeated/unknown selectors and returns only strict public picker
  items. ADMIN sees all public Media; EDITOR is filtered by `uploaderId` in the Prisma query.
- `POST /api/admin/media` accepts only strict JSON `UPDATE_METADATA` and `DELETE` commands.
- `POST /api/admin/media/upload` checks same-origin and database session before consuming a bounded
  multipart stream, then accepts exactly one metadata field plus repeated file fields.
- Missing/inactive/expired/must-change-password/PETUGAS/SATGAS sessions fail closed.
- Uploads prevalidate every magic byte, MIME, extension, filename, image pixel bound, PDF structure,
  and accessibility intent before staging or persistence.
- One or 20 images and exactly one PDF return only the frozen ordered batch response.
- A later-item failure discards remaining staging and removes every earlier committed row/file.
- Metadata update is public-image-only and ownership scoped.
- Delete checks all 13 direct Prisma relations, four stored rich-content tables, Document storage
  keys, and three public document URL fields. References return only `MEDIA_IN_USE`.
- Delete atomically renames a validated public file into a root-local `.deleting` quarantine during
  the database transaction, restores it on rollback, and unlinks it only after commit.
- Missing files, rollback uncertainty, staging cleanup uncertainty, and compensation uncertainty
  emit only the fixed `MEDIA_PERSISTENCE_INVARIANT` signal and return generic `UNAVAILABLE`.
- Every response explicitly uses `Cache-Control: no-store`; only successful mutations revalidate
  ID/EN/AR admin Media paths.

## Verification

| Command | Result |
| --- | --- |
| Targeted runtime/storage/HTTP suites | PASS — 30 tests |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 536 passed; 75 database-gated skipped |
| `npm run test:integration` | PASS — 20 files, 82 passed |
| `npm run prisma:validate` | PASS |
| `npm run build` | PASS — 25 routes/pages including both Media APIs |
| `git diff --check` | PASS |

The first full integration attempt used synthetically configured HMAC secrets shorter than the
platform minimum; 79 tests passed and three M2 auth tests rejected that environment. Re-running the
unchanged suite with 64-byte synthetic HMAC secrets passed 82/82.

## API/schema/dependency impact

- Adds two uncached admin API routes and one server-only transport module.
- Extends the existing server-only committed-file helper with staged quarantine deletion.
- No Prisma schema/migration, generated client, dependency, lockfile, environment contract, proxy,
  shared Zod contract, UI, message, or public route change.

## Risks and follow-up

- Next production build passes but Turbopack emits one existing-style NFT tracing warning because
  the upload route imports storage helpers with dynamically configured absolute roots. Deployment
  review must verify the standalone artifact does not trace unrelated project files.
- Filesystem and PostgreSQL still cannot share one atomic commit. Explicit compensation and fixed
  invariant alerting cover known failure windows; process crashes require the separate 30-day
  orphan/quarantine reconciliation task and verified backups.
- The frozen failure contract still has no `RATE_LIMITED` code. A bounded contract task is required
  before browser rollout; no existing code was overloaded.
- Claude Media Library UI and browser ownership/IDOR QA remain deferred until this runtime merges.

## Confirmation

- All changed paths are within the active manifest lease.
- No production/staging data or another lane's database/storage was used.
- No FUDA identity, domain, email, seed, metadata, or public copy was introduced.
- No merge or UI task was started.
