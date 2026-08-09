---
id: M4-GPT-DEEPSEEK-PAGE-DOMAIN-INTEGRATION
milestone: M4
owner: gpt
reviewer: claude
tester: gpt
base_branch: integration/m4-features
base_sha: 049cb759beb393b44f6fe91217d357761cffffb5
allowed_paths:
  - "src/features/content/pages/**"
  - "tests/m4/content/pages/**"
  - "coordination/handoffs/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-deepseek.md"
  - "coordination/tasks/M4-DEEPSEEK-PAGE-DOMAIN-CRUD.md"
  - "coordination/tasks/M4-GPT-DEEPSEEK-PAGE-DOMAIN-INTEGRATION.md"
  - "coordination/reviews/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-claude.md"
  - "coordination/reviews/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-gpt.md"
  - "coordination/handoffs/M4-GPT-DEEPSEEK-PAGE-DOMAIN-INTEGRATION-gpt.md"
  - "coordination/milestones/M4-FEATURES-ENTRY.md"
  - "coordination/ownership.yml"
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
  - "src/lib/**"
  - "src/proxy.ts"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/README.md"
  - "docs/04-panel-admin.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "prisma/schema.prisma"
  - "src/contracts/auth.ts"
  - "src/contracts/operations.ts"
  - "src/contracts/platform.ts"
  - "src/lib/auth/**"
  - "src/lib/audit/**"
  - "src/lib/db/**"
  - "src/lib/security/sanitize.ts"
depends_on:
  - M4-DEEPSEEK-PAGE-DOMAIN-CRUD
contracts:
  - prisma/schema.prisma
  - src/contracts/auth.ts
  - src/contracts/operations.ts
  - src/contracts/platform.ts
acceptance_commands:
  - "test \"$(git rev-parse origin/ai/deepseek/m4-page-domain-crud)\" = 2b320598188effe4cc89be1872418d24bbb8b946"
  - "npx vitest run tests/m4/content/pages --exclude '**/*.integration.test.ts'"
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/content/pages"
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run test:integration
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-DEEPSEEK-PAGE-DOMAIN-INTEGRATION.md TASK_BASE=049cb759beb393b44f6fe91217d357761cffffb5 npm run check:scope"
risk: high
token_class: M
status: merged
---

# M4 GPT Page-domain integration

Freeze the independent Claude approval and GPT test evidence, transfer the
Page-domain lease into the serial GPT merge queue, merge only the exact reviewed
DeepSeek head into `integration/m4-features`, run post-merge acceptance, publish
durable evidence, and release the lease. This task must not merge M4 to `main`.
