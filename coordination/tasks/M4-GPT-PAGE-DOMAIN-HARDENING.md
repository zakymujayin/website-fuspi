---
id: M4-GPT-PAGE-DOMAIN-HARDENING
milestone: M4
owner: gpt
reviewer: human
tester: gpt
base_branch: main
base_sha: a459ab1571418bc0e65ce9b54f62648be30d3607
allowed_paths:
  - "src/features/content/pages/mutations.ts"
  - "src/features/content/pages/queries.ts"
  - "tests/m4/content/pages/page-mutations.test.ts"
  - "tests/m4/content/pages/page-mutations.integration.test.ts"
  - "tests/m4/runtime/page-admin-transport.test.ts"
  - "coordination/tasks/M4-GPT-PAGE-DOMAIN-HARDENING.md"
  - "coordination/handoffs/M4-GPT-PAGE-DOMAIN-HARDENING-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/config/**"
  - "src/proxy.ts"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/04-panel-admin.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/tasks/M4-DEEPSEEK-PAGE-DOMAIN-CRUD.md"
  - "coordination/handoffs/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-deepseek.md"
  - "coordination/reviews/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-gpt.md"
  - "coordination/reviews/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-claude.md"
  - "coordination/tasks/M4-GPT-PAGE-BACKEND.md"
  - "coordination/handoffs/M4-GPT-PAGE-BACKEND-gpt.md"
depends_on:
  - M4-DEEPSEEK-PAGE-DOMAIN-CRUD
  - M4-GPT-DEEPSEEK-PAGE-DOMAIN-INTEGRATION
  - M4-GPT-PAGE-BACKEND
contracts:
  - src/features/content/pages/contract.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run prisma:validate
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/content/pages"
  - npm run build
  - git diff --check
risk: high
token_class: M
status: review
---

# M4 GPT Page domain hardening

Close the low-risk Page domain gaps left after DeepSeek's accepted Page CRUD
work and GPT runtime wiring: domain mutation rejection for
`mustChangePassword`, snapshot-consistent `TITLE_ASC` list reads, child-count
projection without fetching every child ID, and slug-only unique-conflict
mapping that still handles Prisma transaction/adapter wrappers.

Do not change schema, shared contracts, route handlers, UI, messages,
dependencies, or environment contracts.
