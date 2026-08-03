---
id: M4-DEEPSEEK-PAGE-ADMIN-TRANSPORT-CONTRACT-REVIEW
milestone: M4
owner: deepseek
reviewer: human-owner
tester: deepseek
base_branch: ai/gpt/m4-page-admin-transport-contract
base_sha: 5396c762fa73b49c07d69606dc6f1fb8200846a4
allowed_paths:
  - "coordination/reviews/M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT-deepseek.md"
  - "coordination/handoffs/M4-DEEPSEEK-PAGE-ADMIN-TRANSPORT-CONTRACT-REVIEW-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "e2e/**"
  - "messages/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/04-panel-admin.md"
  - "docs/06-autentikasi-role.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/tasks/M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT.md"
  - "coordination/handoffs/M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT-gpt.md"
  - "src/contracts/page-admin.ts"
  - "src/contracts/media.ts"
  - "src/features/content/pages/contract.ts"
  - "src/features/content/pages/mutations.ts"
  - "src/features/content/pages/queries.ts"
  - "tests/m4/contracts/page-admin-transport-contract.test.ts"
  - "tests/m4/content/pages/**"
depends_on:
  - M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT
contracts:
  - src/contracts/page-admin.ts
  - src/contracts/media.ts
  - src/features/content/pages/contract.ts
acceptance_commands:
  - npx vitest run tests/m4/contracts/page-admin-transport-contract.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - "DATABASE_URL=postgresql://fuspi_local:local_only@127.0.0.1:5432/fuspi_dev_deepseek npm run prisma:validate"
  - "DATABASE_URL=postgresql://fuspi_local:local_only@127.0.0.1:5432/fuspi_dev_deepseek npm run build"
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-DEEPSEEK-PAGE-ADMIN-TRANSPORT-CONTRACT-REVIEW.md TASK_BASE=origin/coordination/m4-deepseek-page-admin-transport-contract-review-assignment npm run check:scope"
risk: high
token_class: M
status: assigned
---

# M4 DeepSeek independent Page admin transport contract review

Perform a bounded, read-only adversarial review of GPT candidate
`5396c762fa73b49c07d69606dc6f1fb8200846a4` (implementation
`35595759ca8738b174ec4f6c6c003c7ba2f4b2ff`). Do not implement fixes, edit
source/tests/contracts, merge, or start Page transport runtime/UI work.

## Review requirements

1. Confirm raw list normalization has deterministic defaults and rejects
   repeated arrays, unknown keys, actor/role/owner/scope, arbitrary selectors,
   invalid integers, unsupported sort/status, oversized search, and control
   text before a runtime query can be built.
2. Confirm the list result composes the accepted Page result without widening
   limits and rejects private identity, storage, revision, malformed instant,
   duplicate, pagination, locale-order, and technical fields.
3. Confirm the editor result carries the accepted ID-required/optional EN/AR
   mutable state plus only a coherent `PublicMediaViewSchema` hero. Missing,
   mismatched, unsafe, private, and malformed hero/detail shapes must fail.
4. Confirm CREATE/UPDATE/PUBLICATION/DELETE directly compose the accepted Page
   schemas. No actor, role, owner, capability, arbitrary status, schedule,
   autosave, force delete, missing version, or alternate locale may enter.
5. Confirm success is converted from the Date-bearing Page domain result to an
   offset-aware JSON string and all domain failures are exhaustively mapped to
   fixed non-technical transport codes. `FORBIDDEN` must not disclose target
   existence; Media and parent failures remain generic.
6. Inspect the focused tests for false positives, unreachable assertions,
   incomplete error mapping, unsafe positive fixtures, divergence from the
   frozen Page limits, and output shapes that would force runtime/UI widening.
7. Confirm the complete candidate diff contains only the three leased files,
   no FUSPI identity violation, no forbidden file, and no `next-env.d.ts`
   change.

## Verdict rule

Return exactly `APPROVE` when no reproducible Critical/High boundary defect or
candidate-caused acceptance failure remains. Return exactly
`CHANGES_REQUESTED` for a reproducible fail-open/injection, unsafe disclosure,
non-JSON response, incomplete domain mapping, or contract divergence that
blocks runtime. Record Medium/Low follow-ups without widening the verdict rule.

Write exact reviewed SHAs, findings by severity, command results, residual
risks, and verdict to both allowed documentation files. Commit and push only
those files on the assigned review branch, then stop.
