# Handoff — M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME

- Task ID: `M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME`
- Branch: `ai/gpt/m3-media-upload-persistence-runtime`
- Frozen base SHA: `1480360`
  (`origin/coordination/m3-gpt-media-upload-persistence-runtime-assignment`)
- Implementation SHA: `faa11e6`
- Handoff SHA: recorded by the following documentation commit

## Summary

Implemented the server-only persistence coordinator for already validated and staged public CMS
images/PDFs. It binds active ADMIN/EDITOR authorization, frozen Media metadata, a PostgreSQL
transaction, staged-file commit, and compensating cleanup into one non-disclosing boundary.

A new narrowly scoped committed-file helper removes only a validated storage-class/key beneath its
canonical root, rejects symlink/root escape, and treats a genuinely missing target idempotently.
The existing M2 staged-file state machine was not weakened or rewritten.

## Files changed

- `src/lib/content/media-persistence.ts`
- `src/lib/storage/committed-file.ts`
- `src/lib/storage/index.ts`
- `tests/m3/runtime/media-persistence.test.ts`
- `tests/m3/runtime/media-persistence.integration.test.ts`
- `tests/platform/storage/committed-file.test.ts`
- `coordination/handoffs/M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME-gpt.md`

## Runtime behavior

- Session input is parsed with `ActiveDatabaseSessionSchema`; inactive, expired, malformed, and
  non-CMS roles are rejected.
- The central permission matrix authorizes `CREATE MEDIA`; uploader identity derives only from the
  revalidated session.
- Record input is parsed with `MediaValidatedRecordInputSchema`; caller uploader/path/URL/private
  metadata injection is rejected.
- Staged storage key and checksum must exactly match the parsed record.
- Database failure before storage commit discards the staged file.
- Storage commit failure rolls back the owning database transaction and cleans staging/destination.
- A transaction failure after filesystem commit removes the committed file and defensively deletes
  any ambiguously committed matching Media row.
- Ordinary cleaned failures return only frozen `MediaPersistenceResultSchema` shapes.
- If committed-file/row compensation cannot be confirmed, the runtime throws only
  `MediaPersistenceInvariantError` with a fixed non-technical message. It never falsely reports
  `DISCARDED`.
- Only frozen public Media metadata is persisted; bytes, filesystem paths, public URLs, session
  fields, private classes, and encryption metadata are excluded.

## API, schema, migration, and dependency impact

- Adds server-only `persistMediaUpload`.
- Adds server-only `removeCommittedFile`.
- Adds `MediaPersistenceInvariantError` for catastrophic compensation failure.
- No multipart transport, route, Server Action, UI, Media list/delete, orphan cron, schema,
  migration, generated client, dependency, lockfile, environment, auth, or contract change.

## Verification

| Command | Result |
| --- | --- |
| Focused filesystem/runtime suites | PASS — 8 passed |
| Targeted PostgreSQL/filesystem suite | PASS — 2 passed |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run prisma:validate` with configured PostgreSQL env | PASS |
| `npm test` | PASS — 432 passed, 69 database-gated skipped |
| `npm run test:integration` with configured PostgreSQL env | PASS — 69 passed |
| `git diff --check` | PASS |
| Task scope-check against frozen assignment | PASS — 6 implementation files within lease before this handoff |

All filesystem tests use isolated temporary roots and deterministic recursive cleanup. PostgreSQL
tests use synthetic marker-prefixed records and remove them after the suite. No production or
staging data was used.

## Security and failure evidence

- Caller-controlled uploader and unknown metadata fail before database access.
- Staged key/checksum mismatch is discarded.
- Duplicate storage keys do not overwrite the existing row or committed file.
- Symlink parent escape, malformed key, and storage-class/key mismatch are rejected.
- Missing committed files are cleaned idempotently.
- Database and storage errors never expose Prisma, SQL, database URLs, absolute paths, original
  filenames, checksums, or raw causes.
- Synthetic post-callback transaction failure exercises committed-file plus ambiguous-row
  compensation.
- Synthetic compensation failure proves only the dedicated fixed-message invariant error escapes.

## Untested areas, risks, and follow-ups

- Multipart parsing, magic-byte validation invocation, CSRF, HTTP status mapping, and rate/quantity
  limits belong to the later upload Route Handler task.
- Media list, ownership-scoped detail, reference report, deletion, and 30-day orphan reconciliation
  remain separate tasks.
- Filesystem and PostgreSQL cannot share a true atomic commit. This implementation uses explicit
  compensation and escalates uncertain cleanup as an invariant error instead of claiming success
  or clean failure.
- Operational transport must catch `MediaPersistenceInvariantError`, return a generic response,
  and create a non-PII alert without logging raw request/file metadata.

## Contract/dependency requests

None.

## Confirmation

- No route, action, UI, list/delete behavior, schema, dependency, environment, or M4 work started.
- No file outside the manifest lease changed.
- The branch requires one independent DeepSeek adversarial review before integration.
