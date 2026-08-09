---
id: M4-GPT-HOME-NAV-DOMAINS
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: b6f8f2887f3196bc4c7632f1eac17695dd7faaef
allowed_paths:
  - "src/features/home-nav/**"
  - "src/app/api/admin/home-nav/**"
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
readonly_paths:
  - "src/contracts/home-nav.ts"
  - "src/contracts/cms.ts"
  - "prisma/schema.prisma"
  - "src/lib/db/**"
depends_on:
  - M4-GPT-HOME-NAV-CONTRACTS
  - M4-GPT-HOME-NAV-SCHEMA-CORRECTION
contracts:
  - src/contracts/home-nav.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
risk: high
token_class: L
status: merged
---

# Home and navigation domains

Implemented strict ADMIN list/detail/create/update/delete/reorder boundaries and the trusted public Home/Nav snapshot for all seven frozen resources:
MenuItem, QuickLink, ExternalLink, HomeSlider, HomeSection, Statistic, SiteSetting.

Key files:
- `src/features/home-nav/domain.ts` — 56.7K domain logic
- `src/app/api/admin/home-nav/route.ts` — ADMIN API
