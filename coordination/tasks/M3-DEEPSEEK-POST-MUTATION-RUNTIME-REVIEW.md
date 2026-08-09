---
id: M3-DEEPSEEK-POST-MUTATION-RUNTIME-REVIEW
milestone: M3
owner: deepseek-v4-pro
reviewer: human-owner
tester: deepseek-v4-pro
base_sha: 9ee3ffb
allowed_paths:
  - "coordination/reviews/M3-GPT-POST-MUTATION-RUNTIME-deepseek.md"
  - "coordination/handoffs/M3-DEEPSEEK-POST-MUTATION-RUNTIME-REVIEW-deepseek.md"
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
  - "coordination/tasks/M3-GPT-POST-MUTATION-RUNTIME.md"
  - "coordination/handoffs/M3-GPT-POST-MUTATION-RUNTIME-gpt.md"
  - "coordination/reviews/M3-GPT-POST-MEDIA-CONTRACT-deepseek.md"
  - "coordination/reviews/M3-POST-MEDIA-CONTRACT-INTEGRATION-gpt.md"
  - "src/lib/content/post-mutations.ts"
  - "tests/m3/runtime/post-mutations.test.ts"
  - "tests/m3/runtime/post-mutations.integration.test.ts"
  - "src/contracts/auth.ts"
  - "src/contracts/post.ts"
  - "src/lib/auth/runtime/authorization.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "src/lib/db/optimistic-lock.ts"
  - "src/lib/db/revision.ts"
  - "src/lib/security/sanitize.ts"
  - "prisma/schema.prisma"
depends_on:
  - M3-GPT-POST-MUTATION-RUNTIME
contracts:
  - docs/04-panel-admin.md
  - docs/06-autentikasi-role.md
  - docs/09-fitur-cms-editor.md
  - docs/12-multibahasa-rtl.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npx vitest run tests/m3/runtime/post-mutations.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-DEEPSEEK-POST-MUTATION-RUNTIME-REVIEW.md TASK_BASE=origin/coordination/m3-deepseek-post-mutation-runtime-review-assignment npm run check:scope
risk: high
token_class: M
status: merged
---

# M3 DeepSeek Independent Post Mutation Runtime Review

Perform one bounded, read-only adversarial review of GPT candidate `9ee3ffb` (implementation
`3f4f3f6`). Do not implement fixes, edit source/tests/contracts, change dependencies/schema/config,
merge, or start another M3 task.

## Review requirements

1. Confirm untrusted payloads are parsed by the frozen strict schemas and actor/owner/role/status/
   publication time cannot be supplied by the caller.
2. Confirm only active, unexpired ADMIN/EDITOR sessions enter the module. Actor identity and
   ownership must derive only from the session argument expected to come from database
   revalidation, never from a trusted-scope object or payload.
3. Confirm the central permission matrix is used and EDITOR pre-reads plus conflict-sensitive
   guarded writes are owner-scoped. Missing and another-owner IDs must have indistinguishable
   public results.
4. Confirm category/tag/cover Media checks happen in the owning transaction. EDITOR must not use
   another uploader's Media; ADMIN may use valid public Media.
5. Confirm every supplied ID/EN/AR rich-text value is sanitized before Prisma and revision
   persistence. No raw content may reach a write.
6. Confirm parent, translations, tag relations, optimistic claim, and revisions commit or roll
   back atomically. A stale version, slug conflict, reference failure, or downstream exception
   must not leave a version increment or partial content.
7. Confirm autosave is owned-draft-only and cannot publish, schedule, archive, or mutate another
   actor's Post.
8. Confirm create and publication commands use a server-owned UTC clock, enforce the frozen legal
   transitions, and represent re-scheduled published content with a future `publishedAt`.
9. Confirm root plus per-locale revision snapshots preserve sanitized state without storage keys,
   sessions, credentials, tokens, technical errors, or a multi-locale size contradiction.
10. Confirm only frozen non-technical result shapes escape. Inspect unique/error mapping for any
    reproducible case that could return an unsafe or materially incorrect result.
11. Inspect unit and PostgreSQL integration tests for false positives, missing high-risk negative
    cases, incorrect cleanup, and divergence from Prisma/Auth/optimistic/revision contracts.
12. Keep HTTP transport, CSRF, public queries, Media filesystem persistence, UI autosave debounce,
    RTL, and E2E separate. They are later tasks, not grounds to reject this server-only runtime
    unless the implementation makes their safe completion impossible.

## Verdict rule

- `APPROVE` when no reproducible Critical/High runtime defect or candidate-caused acceptance
  failure remains.
- `REQUEST_CHANGES` only for a reproducible Critical/High defect, an authorization/transaction/XSS
  invariant failure, a frozen-contract contradiction that makes later safe implementation
  impossible, or a candidate-caused failing acceptance command.
- Record Medium/Low hardening observations as bounded follow-ups. Do not request another review
  cycle for code style, task size, naming preferences, or non-blocking future transport/query/UI
  work.

The configured local PostgreSQL role may not allow creation of a separate reviewer database. If
`npm run test:integration` cannot run solely for that environmental reason, verify the committed
test design and GPT's recorded 62/62 integration evidence, record the limitation, and do not
misclassify it as a candidate defect. Never use production or staging data.

Write findings ordered by severity with exact file/line references, reproduction for every
Critical/High finding, reviewed SHAs, command results, residual risks, and the verdict. Commit only
the two allowed documentation files, push the review branch, and stop.
