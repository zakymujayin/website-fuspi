---
id: M4-GPT-ACTIVITY-CAPTION-SCHEMA-CORRECTION
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 921261a6854922820f1dbe2320523e24516c6438
allowed_paths:
  - "prisma/schema.prisma"
  - "prisma/migrations/20260804201000_add_activity_image_caption/**"
  - "src/generated/prisma/**"
  - "tests/m4/schema/activity-caption-schema.test.ts"
  - "tests/m4/schema/activity-caption-schema.integration.test.ts"
  - "coordination/handoffs/M4-GPT-ACTIVITY-CAPTION-SCHEMA-CORRECTION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/migrations/20260714182351_init_postgresql/**"
  - "prisma/migrations/20260715193000_correct_ticket_enums/**"
  - "prisma/migrations/20260804194500_public_content_schema_correction/**"
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
  - "docs/02-database-schema.md"
  - "docs/04-panel-admin.md"
  - "src/contracts/public-content.ts"
depends_on:
  - M4-GPT-PUBLIC-CONTENT-SCHEMA-CORRECTION
contracts:
  - src/contracts/public-content.ts
acceptance_commands:
  - npm run prisma:validate
  - npm run prisma:generate
  - npx vitest run tests/m4/schema/activity-caption-schema.test.ts
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/schema/activity-caption-schema.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACTIVITY-CAPTION-SCHEMA-CORRECTION.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: medium
token_class: S
status: active
---

# Activity image caption schema correction

Add the missing nullable caption column to ActivityImage through one additive
immutable migration. Preserve all rows and change no other field or relation.
