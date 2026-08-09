---
id: M4-GPT-HOME-NAV-DOMAINS
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 9ec5f7a04b54e4ab2059cfbec6168fdaded58ce1
allowed_paths:
  - "src/features/home-nav/**"
  - "tests/m4/runtime/home-nav*.test.ts"
  - "tests/m4/runtime/home-nav*.integration.test.ts"
  - "tests/security/home-nav*.integration.test.ts"
  - "coordination/handoffs/M4-GPT-HOME-NAV-DOMAINS-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/05-halaman-publik.md"
  - "docs/18-beranda-editable.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "prisma/schema.prisma"
  - "src/config/institution.ts"
  - "src/contracts/home-nav.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/post.ts"
  - "src/contracts/public-content.ts"
  - "src/lib/content-revision.ts"
  - "src/lib/audit.ts"
  - "src/lib/security/sanitize.ts"
depends_on:
  - M4-GPT-HOME-NAV-SCHEMA-CORRECTION
contracts:
  - src/contracts/home-nav.ts
acceptance_commands:
  - "npx vitest run tests/m4/runtime/home-nav*.test.ts --exclude '**/*.integration.test.ts'"
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/home-nav*.integration.test.ts tests/security/home-nav*.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-HOME-NAV-DOMAINS.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: active
---

# Home and navigation domains

Implement strict ADMIN list/detail/create/update/delete/reorder boundaries and
the trusted public Home/Nav snapshot for all seven frozen resources. Enforce
ADMIN-before-DB, PUBLIC media, safe configured URLs, deterministic menu trees,
cycle/depth/location rules, structural HomeSection keys, singleton settings,
versioned revision/audit, ID-first publication/fallback, section content
completeness and item limits, and cache invalidation signals. No browser route,
transport, seed content, or UI belongs here.
