# Independent Runtime Review — M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME

- **Task ID:** M3-DEEPSEEK-MEDIA-UPLOAD-PERSISTENCE-REVIEW
- **Branch:** ai/deepseek/m3-media-upload-persistence-review
- **Frozen base:** origin/coordination/m3-deepseek-media-upload-persistence-review-assignment (4adb2ef)
- **GPT implementation SHA:** faa11e6
- **GPT handoff SHA:** 53b3df6
- **Reviewer model:** deepseek-v4-pro
- **Verdict:** APPROVE

## Scope

This review covers the six GPT candidate files:

- `src/lib/content/media-persistence.ts`
- `src/lib/storage/committed-file.ts`
- `src/lib/storage/index.ts`
- `tests/m3/runtime/media-persistence.test.ts`
- `tests/m3/runtime/media-persistence.integration.test.ts`
- `tests/platform/storage/committed-file.test.ts`

and their interactions with the frozen contracts: `src/contracts/auth.ts`,
`src/contracts/media.ts`, `src/contracts/storage.ts`,
`src/lib/auth/runtime/authorization.ts`, `src/lib/auth/permission-matrix.ts`,
`src/lib/storage/paths.ts`, `src/lib/storage/staged-file.ts`, `prisma/schema.prisma`.

## Findings

### No Critical or High defects found.

All 8 review criteria pass:

| # | Criterion | Verdict |
|---|---|---|
| 1 | Strict session/record parsing, active ADMIN/EDITOR enforcement, CREATE MEDIA permission, server-derived uploader/time | PASS |
| 2 | Staged key/checksum mismatch + caller injection + invalid metadata fail before DB create, clean staging | PASS |
| 3 | DB failure before commit → discard staging; commit failure → rollback row; post-callback failure → compensate both | PASS |
| 4 | Ordinary failures return frozen non-technical results; catastrophic cleanup throws only invariant error | PASS |
| 5 | Committed-file removal validates class/key coherence, canonical root containment, real directories, symlink escape; exact regular file only; idempotent for genuinely missing | PASS |
| 6 | Duplicate keys cannot overwrite existing files/rows; cleanup cannot delete unrelated Media/files | PASS |
| 7 | Persisted fields exclude bytes, paths, URLs, session data, private classes, encryption metadata, raw errors | PASS |
| 8 | Unit/filesystem/PostgreSQL tests cover false positives, cleanup leaks, rollback assertions; no unsafe shared paths | PASS |

### Detailed per-criterion analysis

**1. Session, record parsing, and authorization.** `actorFromSession`
(`media-persistence.ts:43-56`) validates the raw session via
`ActiveDatabaseSessionSchema.safeParse`, checks expiration
(`expiresAt <= now`), rejects non-ADMIN/non-EDITOR roles, and calls
`authorize(..., "CREATE", "MEDIA")` against the central permission matrix.
The uploader is set exclusively from `actor.userId` (`media-persistence.ts:113`),
and `createdAt: now` uses the injected clock (`media-persistence.ts:114`).
The record is parsed via `MediaValidatedRecordInputSchema.safeParse`
(`media-persistence.ts:87`), a `.strict()` schema (`media.ts:62`).
Unit test `media-persistence.test.ts:80-96` covers null, expired,
`isActive: false`, and PETUGAS sessions — all return `DISCARDED` with
`create` never called and `discard` called once. Unit test
`media-persistence.test.ts:117-145` verifies `uploaderId: "editor-1"` and
`createdAt: NOW` are server-derived, not caller-supplied.

**2. Staged mismatch and caller injection.** Lines 88-95 check three conditions
before any database access: (a) record passes schema validation, (b) staged
`storageKey` matches record `storageKey`, (c) staged `checksumSha256` matches
record `checksumSha256`. Any mismatch → `discardOrThrow(staged)`, return
`VALIDATION_FAILED / DISCARDED`. Unit test `media-persistence.test.ts:98-115`
covers uploaderId injection, staged key mismatch, and staged checksum mismatch
— all rejected with `create` not called and `discard` called once.

**3. Transaction compensation flow.** The `persistMediaUpload` function
(`media-persistence.ts:72-154`) uses three sentinel booleans (`commitAttempted`,
`fileCommitted`) inside the outer catch to determine the compensation path:

- `media.create` succeeds → `commitAttempted = true` (line 118)
- `staged.commit()` succeeds → `fileCommitted = true` (line 120)
- If the transaction succeeds: returns `COMMITTED` (lines 123-127)

In the catch block (lines 128-153):

| `fileCommitted` | `commitAttempted` | Action |
|---|---|---|
| `true` | — | Compensate: `removeCommittedFile` + `deleteMany`. If success → `DATABASE_WRITE_FAILED/DISCARDED`. If failure → throw `MediaPersistenceInvariantError` |
| `false` | `true` | `discardOrThrow(staged)` → `STORAGE_COMMIT_FAILED/DISCARDED` |
| `false` | `false` | `discardOrThrow(staged)` → `DATABASE_WRITE_FAILED/DISCARDED` |

The `discardOrThrow` helper (lines 64-70) attempts `staged.discard()` and throws
`MediaPersistenceInvariantError` if discard itself fails. Since `staged.commit()`
internally cleans up the temp file and sets state to `DISCARDED` before throwing
(`staged-file.ts:118-125`), a subsequent `discard()` is a no-op — no double-cleanup
risk.

Unit test `media-persistence.test.ts:147-171` covers both DB failure
(→ `DATABASE_WRITE_FAILED/DISCARDED`, commit not called, discard called) and
storage commit failure (→ `STORAGE_COMMIT_FAILED/DISCARDED`, discard called).
Unit test `media-persistence.test.ts:173-200` covers post-callback transaction
failure compensation: commit called, discard NOT called, `deleteMany` called
with `{storageKey, checksumSha256, uploaderId}`. Unit test
`media-persistence.test.ts:202-216` covers compensation failure: throws only
`MediaPersistenceInvariantError`, no technical details.

**4. Non-technical results.** All ordinary failures return through
`failure()` (`media-persistence.ts:32-41`), which parses through
`MediaPersistenceResultSchema`. The `storageState` is always `"NOT_STAGED"` or
`"DISCARDED"` — never `"COMMITTED"` on failure, never `"ORPHANED"`.
The invariant error (`media-persistence.ts:25-30`) carries only the fixed message
`"Media persistence cleanup requires operator attention."` with no path, key,
filename, SQL, or credential details.

**5. Committed-file removal.** `removeCommittedFile` (`committed-file.ts:23-56`)
enforces a strict defense-in-depth chain:

1. `StorageClassSchema.parse` validates the storage class enum (line 29)
2. `AnyStorageKeySchema.parse` validates the key format (line 30)
3. Class-key coherence: PPKS_PRIVATE ↔ `.enc` extension, otherwise ↔ `.webp`/`.pdf` (lines 31-33)
4. `resolveStoragePath` derives the canonical path, validates root is absolute,
   no null bytes, and rejects path traversal via `startsWith` check (line 36, `paths.ts:34-43`)
5. Root exists, is directory, is not symlink (lines 38-41)
6. Root realpath matches resolved path — no symlink redirection (line 41)
7. Parent directory exists, realpath matches — no symlink escape (lines 44-45)
8. Destination exists, is regular file, is not symlink (lines 47-49)
9. `unlink(destination)` (line 51)
10. Any unexpected error → `storageBoundaryError()` (lines 52-55)

Missing roots, parent directories, and destination files return silently
(lines 38, 44, 46) — making the function idempotent across all genuine
missing states.

Test `committed-file.test.ts:27-36` verifies removal + idempotency (second
call succeeds silently, file confirmed deleted). Test
`committed-file.test.ts:38-63` covers symlink parent escape (parent is a
symlink to an external directory → rejected), path traversal (`../target.webp` →
rejected by `resolveStoragePath` + `AnyStorageKeySchema`), and class/key
mismatch (`.enc` key with PUBLIC class → rejected). All three cases preserve
the target file.

**6. Duplicate key and unrelated data protection.** The `media.create` call
inside the database transaction targets the `storageKey @unique` column
(Prisma schema line 517). A duplicate key causes a Prisma `P2002` error,
which propagates as an untyped throw. Since `commitAttempted` is set AFTER
`create` (line 118), the catch block correctly treats this as `DATABASE_WRITE_FAILED`
and discards staging.

`removeCommittedFile` operates only on the exact resolved path from
`root + validatedStorageKey` — no globs, no directory removal, no wildcards.
`deleteMany` uses `{storageKey, checksumSha256, uploaderId}` — a narrow,
triple-matched filter that cannot accidentally delete unrelated rows.

Integration test `media-persistence.integration.test.ts:109-132` creates a
file+row, then attempts a second upload with the same key. The second attempt
returns `DATABASE_WRITE_FAILED/DISCARDED`. The original file is byte-identical
(verified via `readFile`), and the database count for that storageKey remains 1.

**7. Frozen metadata only.** The `media.create` data payload
(`media-persistence.ts:102-115`) includes: `storageKey, storageClass, checksumSha256,
originalName, mimeType, size, alt, isDecorative, width, height, uploaderId, createdAt`.
Absent: `bytes` (in-memory buffer), filesystem paths, public URLs, session fields
(beyond userId as uploaderId), `storageClass` values other than `"PUBLIC"`
(enforced by `MediaValidatedRecordInputSchema`), encryption metadata
(`encryptionNonce`, `encryptionTag`, `keyVersion`). Unit test
`media-persistence.test.ts:127-143` verifies the exact data shape.

**8. Test integrity.**

Unit tests (6 tests in `media-persistence.test.ts`, 8 passed):
- Session rejection: 4 states (null, expired, inactive, non-CMS role) — `create` not called, `discard` called
- Payload/staged mismatch: 3 cases (uploaderId injection, key mismatch, checksum mismatch)
- Successful persistence: exact data shape verified
- DB/storage failure: 2 cases (DB failure, commit failure)
- Post-callback compensation: commit called, `deleteMany` called, discard NOT called
- Compensation failure: invariant error, non-disclosing message

No mock substitution; tests exercise actual `persistMediaUpload` with mocked
Prisma client closures and mock `StagedUpload` objects.

Filesystem tests (2 tests in `committed-file.test.ts`, 8 passed):
- Valid removal + idempotency
- Symlink escape + path traversal + class/key mismatch

Tests use isolated `mkdtemp` directories with `afterEach` recursive cleanup
via `rm({recursive: true, force: true})`. No shared paths.

Integration tests (2 tests in `media-persistence.integration.test.ts`, 0/2
executable due to environmental limitation):
- Full commit flow with real DB + filesystem
- Duplicate key protection

Integration tests use marker-prefixed records (`m3-media-${Date.now()}`) and
isolated temp directories (`mkdtemp`). `afterAll` cleans DB records
(`originalName: {startsWith: marker}`) and temp dirs (`rm(base, {recursive: true, force: true})`).

## Environment limitation — integration tests

The PostgreSQL integration tests cannot run in this worktree because
`@prisma/adapter-pg` is not installed in `node_modules`. Sourcing
`/home/zhev/myproject/website-fuspi/.env` provides database credentials but
does not resolve the missing npm package.

Per `M3-DEEPSEEK-MEDIA-UPLOAD-PERSISTENCE-REVIEW.md:91-93`:

> If PostgreSQL execution is blocked solely by reviewer-worktree dependency
> setup, verify GPT's recorded 69/69 evidence and test design without
> classifying the environment as a candidate defect.

The GPT handoff (`M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME-gpt.md:67-68`) records:
- `npm test` — 432 passed, 69 database-gated skipped
- `npm run test:integration` — 69 passed

The integration test design has been verified via code review (see criterion 8).
Tests use marker-prefixed synthetic identifiers, isolated temp directories
(`mkdtemp` in `os.tmpdir()`), and deterministic `afterAll` cleanup.

## Medium observations (for follow-up)

### M01 — `discardOrThrow` is called before the database transaction for session/record failures

When `actorFromSession` fails or the record/staged metadata doesn't match,
`discardOrThrow(staged)` is called at lines 83-84 and 92-94. If there is no
staged file (e.g., the `staged` parameter was a fabricated object), `discard()`
will attempt to `unlink` a non-existent temp path and throw. However, in the
intended deployment flow, the `staged` parameter always comes from `stageUpload()`,
which creates a real temporary file. This is not a defect in the current
implementation but should be documented for any future testing/mocking scenarios.

*Affects: `src/lib/content/media-persistence.ts:83-84,92-94`*

### M02 — `deleteMany` compensation filter uses uploaderId

The defensive `deleteMany` in the post-callback compensation path
(`media-persistence.ts:136-141`) filters by `{storageKey, checksumSha256, uploaderId}`.
This means after a transaction failure, only a Media row matching the exact
triple is removed. If the Media row was committed by a DIFFERENT uploader with
the same key+checksum (impossible in practice due to `storageKey @unique`, but
conceptually if the row was created by another process after the failed
transaction's rollback), this `deleteMany` would leave that row intact. This is
correct behavior — the compensation targets only the row created by the failed
operation.

*Affects: `src/lib/content/media-persistence.ts:136-141`*

### M03 — Integration test `afterAll` cleanup order

The integration test cleanup (`media-persistence.integration.test.ts:83-88`)
deletes media by `originalName: startsWith(marker)`, then deletes users by
`email: startsWith(marker)`, then disconnects, then removes the temp directory.
The Media rows reference the User via `uploaderId`. Since `uploaderId` has
`onDelete: SetNull` (Prisma schema line 532), deleting users after media is
safe. However, if the test is interrupted between the media delete and user
delete, orphaned media rows with null uploaderId could remain. The marker-prefix
approach mitigates this (next run would clean them), but a future hardening
could order deletes: media first (with user reference), then users, to ensure
FK constraints are satisfied in any execution order.

*Affects: `tests/m3/runtime/media-persistence.integration.test.ts:83-88`*

## Acceptance command results

| Command | Result |
|---|---|
| `npx vitest run tests/platform/storage/committed-file.test.ts tests/m3/runtime/media-persistence.test.ts` | PASS — 8 passed |
| `npm run lint` | PASS — No issues found |
| `npm run typecheck` | FAIL — Pre-existing M2 issues only (missing packages, SLA enum mismatch); no candidate files affected |
| `npm test` | PARTIAL — 372 passed, 6 failed (all pre-existing M2 ticket enum/SLA); all 8 focused tests pass |
| `npm run test:integration` | FAIL — `@prisma/adapter-pg` not installed (environmental); GPT recorded 69/69 |
| `git diff --check` | PASS — No whitespace errors |
| Scope check | PASS — 0 changed file(s) within lease |

The 6 test failures are pre-existing M2 issues in `ticket-enum-contract.test.ts`
and `ticket-sla.test.ts`. No candidate file is involved. The typecheck failures
are pre-existing missing-dependency errors plus the SLA enum mismatch. The
integration test failure is solely due to `@prisma/adapter-pg` not being
installed in the reviewer worktree.

## Residual risks

| Risk | Severity | Mitigation |
|---|---|---|
| `@prisma/adapter-pg` missing prevents local integration test execution | Low | GPT recorded 69/69 passes; test design verified via review; CI provides isolated environment |
| Pre-existing M2 ticket enum/SLA failures in test suite | Low | Pre-existing issues; no candidate files affected |
| Filesystem and PostgreSQL cannot share a true atomic commit (two-phase) | Low | Explicitly documented in handoff; compensation + invariant error escalation is the accepted pattern |
| `StorageBoundaryError` wrapping hides underlying OS error details | Low | All paths throw the same opaque error type — intentional design for boundary hardening |

## Confirmation

- [x] No source, test, schema, dependency, or config files modified
- [x] No GPT branch modified
- [x] No integration branch modified
- [x] No M3 task execution beyond this review
- [x] Review based on frozen base `origin/coordination/m3-deepseek-media-upload-persistence-review-assignment` (4adb2ef)
- [x] Only the two allowed documentation files created
