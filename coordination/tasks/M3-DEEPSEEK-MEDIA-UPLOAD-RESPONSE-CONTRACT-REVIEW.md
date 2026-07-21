---
id: M3-DEEPSEEK-MEDIA-UPLOAD-RESPONSE-CONTRACT-REVIEW
milestone: M3
owner: deepseek-v4-pro
reviewer: human-owner
tester: deepseek-v4-pro
base_sha: ef33207
allowed_paths:
  - "coordination/reviews/M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-MEDIA-UPLOAD-RESPONSE-CONTRACT-REVIEW-deepseek.md"
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
  - "coordination/tasks/M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT.md"
  - "coordination/handoffs/M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT-gpt.md"
  - "src/contracts/media-admin.ts"
  - "src/contracts/media.ts"
  - "src/contracts/storage.ts"
  - "tests/m3/contracts/media-admin-transport-contract.test.ts"
  - "src/lib/content/media-persistence.ts"
depends_on:
  - M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT
contracts:
  - docs/04-panel-admin.md
  - docs/07-upload-media-hostinger.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npx vitest run tests/m3/contracts/media-admin-transport-contract.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-MEDIA-UPLOAD-RESPONSE-CONTRACT-REVIEW.md TASK_BASE=origin/coordination/m3-deepseek-media-upload-response-contract-review-assignment npm run check:scope
risk: high
token_class: S
status: assigned
---

# M3 DeepSeek Media Upload Response Contract Review

Perform one bounded, read-only adversarial review of GPT candidate `ef33207`
(implementation `2647529`). Do not implement fixes, edit source/tests/contracts, change
dependencies/schema/config, merge, or start the Media runtime/UI task.

## Review requirements

1. Confirm the response closes the 20-file metadata/single-ID contradiction with an explicitly
   all-or-nothing success shape rather than permitting ambiguous partial success.
2. Confirm CMS images accept exactly 1–20 results and public PDFs exactly one result.
3. Confirm indexes are zero-based, contiguous, ordered, unique, and bounded; Media IDs are strict
   and unique.
4. Confirm success exposes only policy, index, and Media ID. Reject filenames, URLs, keys, storage
   state/class, checksums, uploader identity, bytes, request metadata, and unknown fields.
5. Confirm failure reuses only frozen generic transport codes and cannot expose partial successes,
   per-file technical errors, paths, causes, stacks, Prisma details, or operational alerts.
6. Confirm existing single-item metadata update/delete responses and invariant disposition remain
   unchanged.
7. Confirm the new contract forces the later runtime to prevalidate every file before persistence
   and compensate every earlier commit before returning failure. Uncertain compensation must still
   route only through the existing fixed non-PII invariant disposition.
8. Inspect tests for false positives and missing boundary cases, including 0/1/20/21 images,
   1/2 PDFs, duplicate IDs, gap/order/index attacks, and strict output leakage.

## Verdict rule

- `APPROVE` when no reproducible Critical/High boundary defect or candidate-caused acceptance
  failure remains.
- `REQUEST_CHANGES` only for a reproducible ambiguity that permits partial-success concealment,
  count/index bypass, technical/storage disclosure, incompatibility with frozen upload metadata,
  or candidate-caused acceptance failure.
- Record Medium/Low observations as bounded follow-ups; do not reject for style or naming.

Write exact file/line findings, reproduction for every Critical/High issue, reviewed SHAs, command
results, residual risks, and verdict. Commit only the two allowed documentation files, push branch
`ai/deepseek/m3-media-upload-response-contract-review`, and stop.
