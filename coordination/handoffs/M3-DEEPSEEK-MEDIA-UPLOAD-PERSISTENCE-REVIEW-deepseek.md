# Handoff — M3-DEEPSEEK-MEDIA-UPLOAD-PERSISTENCE-REVIEW

- Task ID: `M3-DEEPSEEK-MEDIA-UPLOAD-PERSISTENCE-REVIEW`
- Branch: `ai/deepseek/m3-media-upload-persistence-review`
- Frozen base SHA: `4adb2ef`
  (`origin/coordination/m3-deepseek-media-upload-persistence-review-assignment`)
- GPT implementation SHA: `faa11e6`
- GPT handoff SHA: `53b3df6`
- Head SHA: recorded by the following documentation commit

## Verdict

**APPROVE** — No reproducible Critical or High runtime defect found.

## Summary

Performed an independent adversarial review of the six GPT candidate files
against the 8 review criteria. All criteria pass.

The runtime correctly enforces: strict session/record parsing, central
CREATE MEDIA permission, server-derived uploader/time, staged key/checksum
validation before database access, three-branch transaction compensation
(DB failure → discard staging, commit failure → rollback + discard,
post-callback failure → remove committed file + defensive deleteMany),
frozen non-technical result shapes, and invariant error escalation for
catastrophic cleanup uncertainty.

The committed-file helper implements defense-in-depth path validation:
class-key coherence, canonical root containment, realpath-based symlink
detection, regular-file-only checks, and idempotent missing-target handling.

## Files changed

- `coordination/reviews/M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME-deepseek.md`
- `coordination/handoffs/M3-DEEPSEEK-MEDIA-UPLOAD-PERSISTENCE-REVIEW-deepseek.md`

## Acceptance evidence

| Command | Result |
|---|---|
| `npx vitest run tests/platform/storage/committed-file.test.ts tests/m3/runtime/media-persistence.test.ts` | PASS — 8 passed |
| `npm run lint` | PASS |
| `npm run typecheck` | FAIL — pre-existing M2 issues; no candidate files affected |
| `npm test` | PARTIAL — 372 passed, 6 failed (pre-existing M2); all 8 focused tests pass |
| `npm run test:integration` | FAIL — `@prisma/adapter-pg` not installed (environmental); GPT recorded 69/69 |
| `git diff --check` | PASS |
| Scope check | PASS |

## Key findings

- Session validation enforces active, unexpired ADMIN/EDITOR sessions via
  `ActiveDatabaseSessionSchema` + `expiresAt` check + role gate + `CREATE MEDIA`
  permission through the central `authorize()` + permission matrix.
- `uploaderId` is derived exclusively from `actor.userId`; `createdAt` from
  the injected server clock; caller injection of uploader or time is rejected
  by the `.strict()` `MediaValidatedRecordInputSchema`.
- Staged `storageKey` and `checksumSha256` are cross-checked against the parsed
  record before any database access. Mismatch → discard staging, no DB call.
- Three-branch transaction compensation:
  - DB create fails → discard staging, return `DATABASE_WRITE_FAILED/DISCARDED`
  - File commit fails after DB create → transaction rolls back, discard staging,
    return `STORAGE_COMMIT_FAILED/DISCARDED`
  - Transaction fails after file commit → `removeCommittedFile` + defensive
    `deleteMany`; if compensation fails → `MediaPersistenceInvariantError`
- Only frozen public metadata persisted; bytes, paths, URLs, encryption metadata,
  and raw errors are excluded.
- `removeCommittedFile` validates class-key coherence, canonical root containment,
  symlink escape (via `realpath`), regular-file-only, and idempotency.
- Duplicate storage keys do not overwrite existing files or rows; second attempt
  returns `DATABASE_WRITE_FAILED/DISCARDED`.
- Unit/filesystem tests use isolated temp directories with recursive cleanup;
  no shared paths.

## Medium observations

Three Medium follow-ups recorded in the review document:

1. M01 — `discardOrThrow` called before DB transaction for session/record failures
2. M02 — `deleteMany` compensation filter uses uploaderId (correct but noted)
3. M03 — Integration test cleanup order between media and user deletes

None block integration.

## Environment limitation

`npm run test:integration` fails because `@prisma/adapter-pg` is not installed
in this worktree's `node_modules`. GPT's recorded evidence (69/69 integration
passes) is accepted per the manifest's environmental limitation clause. The
integration test design has been verified via code review.

## Untested areas, risks, and follow-ups

- Multipart parsing, magic-byte validation, CSRF, rate/quantity limits,
  HTTP route/Server Action, and upload UI remain deferred.
- Media list, ownership-scoped detail, reference report, deletion, and
  30-day orphan reconciliation remain separate tasks.
- Filesystem and PostgreSQL cannot share true atomic commit; explicit
  compensation + invariant error escalation is the accepted pattern.
- Operational transport must catch `MediaPersistenceInvariantError`, return
  a generic response, and create a non-PII alert.

## Contract/dependency requests

None. No schema, contract, dependency, config, or integration branch change
requested.

## Confirmation

- [x] No source, test, schema, dependency, or config files modified
- [x] Only the two allowed documentation files created
- [x] No GPT branch, integration branch, or other agent branch modified
- [x] No merge performed
- [x] Review based on frozen base SHA `4adb2ef`
