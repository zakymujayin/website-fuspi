---
id: M4-GPT-HOME-NAV-SCHEMA-CORRECTION
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: e9dd1c46571c1fa6198559ee6df1787263709501
allowed_paths:
  - "prisma/schema.prisma"
  - "prisma/migrations/20260804214500_home_nav_schema_correction/**"
  - "src/generated/prisma/**"
  - "tests/m4/schema/home-nav-schema-correction.test.ts"
  - "tests/m4/schema/home-nav-schema-correction.integration.test.ts"
  - "coordination/handoffs/M4-GPT-HOME-NAV-SCHEMA-CORRECTION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/migrations/20260714182351_init_postgresql/**"
  - "prisma/migrations/20260715193000_correct_ticket_enums/**"
  - "prisma/migrations/20260804194500_public_content_schema_correction/**"
  - "prisma/migrations/20260804201000_add_activity_image_caption/**"
  - "src/contracts/**"
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
  - "docs/18-beranda-editable.md"
  - "prisma/schema.prisma"
  - "src/contracts/home-nav.ts"
depends_on:
  - M4-GPT-HOME-NAV-CONTRACTS
contracts:
  - src/contracts/home-nav.ts
acceptance_commands:
  - npm run prisma:validate
  - npm run prisma:generate
  - npx vitest run tests/m4/schema/home-nav-schema-correction.test.ts
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/schema/home-nav-schema-correction.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-HOME-NAV-SCHEMA-CORRECTION.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: S
status: active
---

# Home and navigation schema correction

Additively align Prisma with the frozen Home/Nav contract: add INTRO and
SERVICE HomeSection keys, Statistic.suffix, a PUBLIC video poster Media relation
on SiteSetting, and a restrictive MenuItem.pageId foreign key to Page. Preserve
all existing rows and migrations. Prove the migration on PostgreSQL and do not
add seed content, domain behavior, transport, or UI.
