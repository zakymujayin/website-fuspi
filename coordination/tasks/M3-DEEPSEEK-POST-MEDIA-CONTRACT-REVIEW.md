---
id: M3-DEEPSEEK-POST-MEDIA-CONTRACT-REVIEW
milestone: M3
owner: deepseek-v4-pro
reviewer: human-owner
tester: deepseek-v4-pro
base_sha: a44989c
allowed_paths:
  - "coordination/reviews/M3-GPT-POST-MEDIA-CONTRACT-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-POST-MEDIA-CONTRACT-REVIEW-deepseek.md"
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
  - "coordination/tasks/M3-GPT-POST-MEDIA-CONTRACT.md"
  - "coordination/handoffs/M3-GPT-POST-MEDIA-CONTRACT-gpt.md"
  - "src/contracts/post.ts"
  - "src/contracts/media.ts"
  - "src/contracts/auth.ts"
  - "src/contracts/platform.ts"
  - "src/contracts/storage.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "tests/m3/contracts/post-contract.test.ts"
  - "tests/m3/contracts/media-contract.test.ts"
depends_on:
  - M3-GPT-POST-MEDIA-CONTRACT
contracts:
  - docs/04-panel-admin.md
  - docs/06-autentikasi-role.md
  - docs/07-upload-media-hostinger.md
  - docs/09-fitur-cms-editor.md
  - docs/12-multibahasa-rtl.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npx vitest run tests/m3/contracts
  - npm run lint
  - npm run typecheck
  - npm test
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-POST-MEDIA-CONTRACT-REVIEW.md TASK_BASE=origin/coordination/m3-deepseek-post-media-contract-review-assignment npm run check:scope
risk: high
token_class: S
status: merged
---

# M3 DeepSeek Independent Post + Media Contract Review

Perform one bounded, read-only adversarial review of GPT candidate `a44989c` (implementation
`6bf5e3c`). Do not implement fixes, edit contracts/tests, change dependencies/schema/config, merge,
or start the M3 runtime/UI tasks.

## Review requirements

1. Confirm every untrusted Post/Media schema is strict and cannot accept caller-controlled role,
   ownership, author/uploader, status, storage class, publication clock, preview, force-delete, or
   other authorization bypass fields.
2. Confirm trusted ADMIN/EDITOR scopes cannot represent EDITOR-any access and are clearly server-
   session-derived rather than request payloads.
3. Check mandatory ID content, optional EN/AR, exact/fallback metadata, neutral slug, duplicate
   parent rejection, bounded pagination, and absence of private identifiers in public results.
4. Verify create/update/autosave version requirements, legal publication transitions, future-only
   scheduling, and `PUBLISHED + publishedAt <= server now` public visibility.
5. Verify Media accessibility rules, image/PDF size and dimension coherence, hashed storage-key
   extension matching, HTTPS/canonical public URL output, and the invariant that normal failures
   cannot report an orphaned staged file.
6. Inspect all tests for false positives, missing high-risk negative cases, and divergence from the
   existing Prisma/M2 storage/auth/optimistic-lock contracts.
7. Separate runtime work from contract defects. Database queries, Auth session checks, Tiptap
   sanitization execution, multipart handling, staged-file operations, and E2E belong to later
   tasks and are not grounds to reject this contract unless the frozen shape makes them unsafe or
   impossible.

## Verdict rule

- `APPROVE` when no reproducible Critical/High contract defect or failing acceptance remains.
- `REQUEST_CHANGES` only for a reproducible Critical/High contract defect, contract/spec
  contradiction that blocks safe implementation, or a failing acceptance command.
- Record Medium/Low hardening observations as bounded follow-ups for the runtime task; do not start
  an iterative review loop over non-blocking preferences.

Write findings ordered by severity with exact file/line references, exact reviewed SHAs, command
results, residual risks, and the verdict. Commit only the two allowed documentation files, push
the review branch, and stop.
