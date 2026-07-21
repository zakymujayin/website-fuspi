---
id: M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT
milestone: M3
owner: gpt
reviewer: deepseek-v4-pro
tester: deepseek-v4-pro
base_sha: d0f5c6f
allowed_paths:
  - "src/contracts/media-admin.ts"
  - "tests/m3/contracts/media-admin-transport-contract.test.ts"
  - "coordination/handoffs/M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/app/**"
  - "src/components/**"
  - "src/lib/**"
  - "src/generated/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/04-panel-admin.md"
  - "docs/06-autentikasi-role.md"
  - "docs/07-upload-media-hostinger.md"
  - "docs/09-fitur-cms-editor.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/tasks/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT.md"
  - "coordination/reviews/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-deepseek.md"
  - "src/contracts/media.ts"
  - "src/contracts/storage.ts"
  - "src/lib/content/media-persistence.ts"
depends_on:
  - M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT
  - M3-DEEPSEEK-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT-REVIEW
contracts:
  - src/contracts/media.ts
  - src/contracts/media-admin.ts
acceptance_commands:
  - npx vitest run tests/m3/contracts/media-admin-transport-contract.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-GPT-MEDIA-UPLOAD-RESPONSE-CONTRACT.md TASK_BASE=origin/coordination/m3-gpt-media-upload-response-contract-assignment npm run check:scope
risk: high
token_class: S
status: assigned
---

# M3 GPT Media Upload Response Contract

Close one frozen-contract gap before opening the Media admin runtime. The existing multipart
metadata contract permits up to 20 CMS images in one request, while the existing mutation response
can represent only one `mediaId`. Freeze a minimal all-or-nothing batch upload response without
starting a Route Handler, persistence orchestration, UI, schema, dependency, or environment change.

## Required contract

1. Add a strict upload response discriminated by `ok`.
2. Success must include the server-confirmed upload policy and an ordered array containing only
   zero-based input index plus `mediaId`.
3. `CMS_IMAGE` success accepts 1–20 items. `PUBLIC_PDF` success accepts exactly one item.
4. Item indexes must be unique, contiguous, and ordered from zero; Media IDs must be unique.
5. Failure must reuse only the frozen generic Media transport failure codes and must not expose
   partial successes, filenames, paths, storage keys/classes/state, checksums, uploader identity,
   request metadata, technical causes, stacks, or operational alerts.
6. A success response means the entire request committed. The later runtime must validate every
   file before the first persistence write and compensate every already-committed item if a later
   item fails. Uncertain compensation must use the existing persistence-invariant disposition.
7. Keep single-item metadata update/delete responses unchanged.

## Executable evidence

- Accept 20 ordered CMS image identifiers and exactly one PDF identifier.
- Reject empty/21-item image results, multi-item PDF results, duplicate/out-of-order/gapped indexes,
  duplicate Media IDs, unknown keys, storage internals, and partial-success fields.
- Accept frozen generic failures and reject failure payload leakage.
- Preserve every existing Media admin contract test.

Commit the contract, tests, and durable handoff on branch
`ai/gpt/m3-media-upload-response-contract`, push it, and stop. Do not start runtime work or merge.
