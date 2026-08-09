---
id: M3-DEEPSEEK-MEDIA-ADMIN-TRANSPORT-RUNTIME-REVIEW
milestone: M3
owner: deepseek-v4-pro
reviewer: human-owner
tester: deepseek-v4-pro
base_sha: 8ab07a8
allowed_paths:
  - "coordination/reviews/M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-MEDIA-ADMIN-TRANSPORT-RUNTIME-REVIEW-deepseek.md"
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
  - "coordination/tasks/M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME.md"
  - "coordination/handoffs/M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME-gpt.md"
  - "src/app/api/admin/media/route.ts"
  - "src/app/api/admin/media/upload/route.ts"
  - "src/lib/content/media-admin-transport.ts"
  - "src/lib/content/media-persistence.ts"
  - "src/lib/storage/committed-file.ts"
  - "src/lib/storage/index.ts"
  - "tests/m3/runtime/media-admin-transport.test.ts"
  - "tests/m3/runtime/media-admin-transport.integration.test.ts"
  - "tests/m3/runtime/media-persistence.test.ts"
  - "tests/m3/runtime/media-persistence.integration.test.ts"
  - "tests/platform/storage/committed-file.test.ts"
  - "tests/security/admin-media-transport-adversarial.integration.test.ts"
  - "src/contracts/auth.ts"
  - "src/contracts/media.ts"
  - "src/contracts/media-admin.ts"
  - "src/contracts/storage.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/auth/runtime/authorization.ts"
  - "src/lib/auth/runtime/csrf.ts"
  - "src/lib/auth/runtime/request-session.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-GPT-MEDIA-ADMIN-TRANSPORT-RUNTIME
contracts:
  - docs/04-panel-admin.md
  - docs/06-autentikasi-role.md
  - docs/07-upload-media-hostinger.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npx vitest run tests/m3/runtime/media-admin-transport.test.ts tests/m3/runtime/media-persistence.test.ts tests/platform/storage/committed-file.test.ts tests/security/admin-media-transport-adversarial.integration.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-MEDIA-ADMIN-TRANSPORT-RUNTIME-REVIEW.md TASK_BASE=origin/coordination/m3-deepseek-media-admin-runtime-review-assignment npm run check:scope
risk: critical
token_class: L
status: merged
---

# M3 DeepSeek Independent Media Admin Transport Runtime Review

Perform one bounded, read-only adversarial review of GPT candidate `8ab07a8`
(implementation `4c83d8f`). Do not implement fixes, edit source/tests/contracts, change
dependencies/schema/config, merge, or start Media UI/browser tasks.

GPT recorded 536/536 unit tests, 82/82 PostgreSQL integration tests, targeted 30/30, lint,
typecheck, Prisma validation, production build, diff check, and 10-path scope-check at this head.
Use only an isolated reviewer database/storage root if rerunning database/filesystem evidence.

## Review requirements

1. Confirm same-origin and database-session checks occur before mutation/upload body and filesystem
   work; every route rejects inactive/expired/password-change/non-CMS roles and sets no-store.
2. Confirm picker query and output are strict, public-only, database-scoped by EDITOR uploader, and
   never disclose email, uploader ID, keys, checksums, paths, private classes, or Prisma objects.
3. Confirm multipart is stream-bounded independently of Content-Length, has only one metadata field
   plus ordered files, enforces policy-specific size/count, and cannot inject actor/storage state.
4. Confirm every file is magic-byte/MIME/extension/name/accessibility/pixel/PDF validated before the
   first stage/row/committed write. SVG/HTML/executable/double-extension/path/control attacks fail.
5. Confirm staging and batch persistence are all-or-nothing. Later validation/stage/DB/file failure
   must leave no earlier row, public file, or staged file; compensation uncertainty must emit only
   the fixed non-PII invariant signal and generic response.
6. Confirm metadata update is public-image-only, permission/ownership scoped, accessibility-valid,
   transactional, and cross-owner/private/PDF/missing targets are non-disclosing.
7. Confirm delete checks all direct Prisma Media relations plus rich HTML, Document storage keys,
   and public document URL references. Public output must be only generic `MEDIA_IN_USE`.
8. Confirm quarantine deletion validates root/key/class/real paths, rejects symlink/traversal,
   atomically moves before row deletion, restores after rollback, removes after commit, rejects
   repeated lifecycle calls/destination replacement, and reports missing/uncertain state.
9. Confirm unexpected exceptions and invariant reporting never leak raw request/file metadata,
   names, bytes, paths, roots, checksums, users, sessions, SQL, Prisma messages, causes, or stacks.
10. Inspect all unit/PostgreSQL/filesystem/HTTP tests for false positives, missing critical negative
    cases, shared-state contamination, unsafe cleanup, and divergence from the frozen response.
11. Review the Turbopack NFT tracing warning recorded in the handoff. Reject only if candidate code
    demonstrably traces sensitive/unbounded files into the build artifact; otherwise record the
    bounded deployment verification follow-up.
12. Keep rate-limit contract, 30-day reconciliation automation, UI, Tiptap picker, and browser E2E
    separate unless this implementation makes their safe completion impossible.

## Verdict rule

- `APPROVE` only when no reproducible Critical/High authorization, IDOR, upload-bypass,
  partial-commit, file-loss, path/symlink escape, disclosure, or candidate-caused acceptance defect
  remains.
- `REQUEST_CHANGES` requires exact file/line evidence and reproduction for every Critical/High
  finding or a candidate-caused failing acceptance command.
- Record Medium/Low hardening findings as bounded follow-ups; do not reject for style, size, or the
  reviewer environment alone.

Write reviewed SHAs, severity-ordered findings, reproductions, exact command results, environment
limitations, residual risks, and verdict. Commit only the two allowed documentation files, push
branch `ai/deepseek/m3-media-admin-transport-runtime-review`, and stop.
