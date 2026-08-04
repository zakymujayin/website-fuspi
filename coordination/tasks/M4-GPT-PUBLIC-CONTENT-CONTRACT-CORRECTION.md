---
id: M4-GPT-PUBLIC-CONTENT-CONTRACT-CORRECTION
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 24f6c32094db5f845acd43e993b37a07b2933fd2
allowed_paths:
  - "src/contracts/public-content.ts"
  - "tests/m4/contracts/public-content-contracts.test.ts"
  - "coordination/handoffs/M4-GPT-PUBLIC-CONTENT-CONTRACT-CORRECTION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/lib/**"
  - "src/features/**"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md"
  - "src/contracts/cms.ts"
  - "src/features/content/pages/contract.ts"
depends_on:
  - M4-GPT-PUBLIC-CONTENT-CONTRACTS
contracts:
  - src/contracts/public-content.ts
acceptance_commands:
  - npx vitest run tests/m4/contracts/public-content-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-CONTENT-CONTRACT-CORRECTION.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: medium
token_class: S
status: active
---

# Public content delete version correction

Require a resource ID and nullable expected version on every DELETE command.
The runtime will require a non-null version for Service, Document, Event and
FAQ, and null for resources without version columns. Add strict regression
coverage; change no other contract surface.
