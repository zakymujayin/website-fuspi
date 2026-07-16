---
id: M3-DEEPSEEK-MEDIA-UPLOAD-PERSISTENCE-REVIEW
milestone: M3
owner: deepseek-v4-pro
reviewer: human-owner
tester: deepseek-v4-pro
base_sha: 53b3df6
allowed_paths:
  - "coordination/reviews/M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-MEDIA-UPLOAD-PERSISTENCE-REVIEW-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "e2e/**"
  - "messages/**"
readonly_paths:
  - "coordination/tasks/M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME.md"
  - "coordination/handoffs/M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME-gpt.md"
  - "src/lib/content/media-persistence.ts"
  - "src/lib/storage/committed-file.ts"
  - "src/lib/storage/staged-file.ts"
  - "src/lib/storage/paths.ts"
  - "tests/m3/runtime/media-persistence.test.ts"
  - "tests/m3/runtime/media-persistence.integration.test.ts"
  - "tests/platform/storage/committed-file.test.ts"
  - "src/contracts/auth.ts"
  - "src/contracts/media.ts"
  - "src/contracts/storage.ts"
  - "src/lib/auth/runtime/authorization.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME
contracts:
  - docs/07-upload-media-hostinger.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npx vitest run tests/platform/storage/committed-file.test.ts tests/m3/runtime/media-persistence.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-MEDIA-UPLOAD-PERSISTENCE-REVIEW.md TASK_BASE=origin/coordination/m3-deepseek-media-upload-persistence-review-assignment npm run check:scope
risk: high
token_class: M
status: merged
---

# M3 DeepSeek Independent Media Upload Persistence Review

Perform one bounded, read-only adversarial review of GPT candidate `53b3df6`
(implementation `faa11e6`). Do not implement fixes, edit source/tests/contracts, change
dependencies/schema/config, merge, or start another M3 task.

## Review requirements

1. Confirm strict session and record parsing, active/unexpired ADMIN/EDITOR enforcement, central
   `CREATE MEDIA` permission use, and server-only uploader/time derivation.
2. Confirm staged key/checksum mismatch, caller uploader/path/URL/private metadata injection, and
   invalid accessibility/MIME/dimension metadata fail before database creation and clean staging.
3. Confirm database failure before file commit discards staging; file commit failure rolls back the
   Media row; and post-callback transaction failure compensates both committed file and any
   ambiguously committed matching row.
4. Confirm ordinary failures return only frozen non-technical results. Catastrophic cleanup
   uncertainty must throw only the fixed-message invariant error and never falsely claim
   `DISCARDED`.
5. Confirm committed-file removal validates storage-class/key coherence, canonical root
   containment, real directories, and symlink escape; removes only an exact regular file; and is
   idempotent only for genuinely missing roots/parents/files.
6. Confirm duplicate keys cannot overwrite existing files or rows and cleanup cannot delete
   unrelated Media/files.
7. Confirm persisted fields exclude bytes, absolute paths, URLs, session data, private classes,
   encryption metadata, and raw technical errors.
8. Inspect unit/filesystem/PostgreSQL tests for false positives, cleanup leaks, unsafe shared temp
   paths, missing rollback assertions, and environment-only failures.

## Verdict rule

- `APPROVE` when no reproducible Critical/High defect or candidate-caused acceptance failure
  remains.
- `REQUEST_CHANGES` only for reproducible Critical/High authorization, path-escape, overwrite,
  orphan-file, dangling-row, privacy, or transaction-compensation defects.
- Record Medium/Low observations once as bounded follow-ups. Do not create another review cycle
  for style, naming, hypothetical transport work, or deferred list/delete/UI behavior.

Run all acceptance commands. If PostgreSQL execution is blocked solely by reviewer-worktree
dependency setup, verify GPT's recorded 69/69 evidence and test design without classifying the
environment as a candidate defect. Never use production/staging data.

Write exact file/line findings, reproduction for every Critical/High issue, command results,
reviewed SHAs, residual risks, and verdict. Commit only the two allowed documentation files, push
the review branch, and stop.
