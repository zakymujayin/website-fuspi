---
id: M4-GPT-CMS-SHARED-CONTRACTS
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 63be1c2cb5ac4e9e20a270aafb9d16982d6ad928
allowed_paths:
  - "src/contracts/cms.ts"
  - "tests/m4/contracts/cms-shared-contracts.test.ts"
  - "coordination/handoffs/M4-GPT-CMS-SHARED-CONTRACTS-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/**"
  - "src/components/**"
  - "src/features/**"
  - "src/lib/**"
  - "messages/**"
  - "e2e/**"
  - ".github/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/02-database-schema.md"
  - "docs/04-panel-admin.md"
  - "docs/06-autentikasi-role.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md"
  - "src/contracts/auth.ts"
  - "src/contracts/media.ts"
  - "src/contracts/operations.ts"
  - "src/contracts/page-admin.ts"
  - "src/contracts/platform.ts"
  - "src/contracts/post-admin.ts"
  - "src/features/content/pages/contract.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-BACKEND-V1-INVENTORY
contracts:
  - src/contracts/platform.ts
  - src/contracts/media.ts
acceptance_commands:
  - npx vitest run tests/m4/contracts/cms-shared-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-CMS-SHARED-CONTRACTS.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: M
status: merged
---

# M4 GPT shared CMS contracts

Freeze small, reusable trust-boundary schemas for the remaining FUSPI CMS
backend without replacing the accepted resource-specific Post/Page contracts.

Required primitives:

- safe CMS identifier, bounded search, pagination, and sort direction;
- duplicate-preserving raw query normalization input shape;
- ID-required translation locale sets and translation workflow metadata;
- strict reorder batches with unique IDs and contiguous zero-based positions;
- safe internal path, HTTPS external URL, and nullable configured-link rules;
- safe public document/media references that never expose storage keys;
- resource/revision summaries without snapshot secrets;
- deterministic common ADMIN transport failure codes and page metadata; and
- schemas must be strict, bounded, transform-safe, and free of arbitrary Prisma
  selectors/order objects.

Prove duplicate/unknown query rejection, invalid locale sets, non-contiguous or
duplicate reorder rejection, encoded/control-character URL attacks, unsafe
media/document shapes, prototype/unknown fields, bounds, and serializable safe
outputs. Do not change schema, generated code, existing contracts, runtime,
routes, UI, messages, dependencies, or configuration.
