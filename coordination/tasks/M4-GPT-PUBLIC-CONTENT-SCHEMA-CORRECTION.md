---
id: M4-GPT-PUBLIC-CONTENT-SCHEMA-CORRECTION
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 3adc1f1dd729b7ce7b2da656f27011cb5813f4b7
allowed_paths:
  - "prisma/schema.prisma"
  - "prisma/migrations/20260804194500_public_content_schema_correction/**"
  - "src/generated/prisma/**"
  - "tests/m4/schema/public-content-schema.test.ts"
  - "tests/m4/schema/public-content-schema.integration.test.ts"
  - "coordination/handoffs/M4-GPT-PUBLIC-CONTENT-SCHEMA-CORRECTION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/migrations/20260714182351_init_postgresql/**"
  - "prisma/migrations/20260715193000_correct_ticket_enums/**"
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
  - "docs/05-halaman-publik.md"
  - "docs/11-dosen-arsip-pdf-album.md"
  - "docs/18-beranda-editable.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md"
depends_on:
  - M4-GPT-ACADEMIC-PUBLIC-DETAIL-RUNTIME
contracts:
  - docs/02-database-schema.md
  - docs/04-panel-admin.md
  - docs/18-beranda-editable.md
acceptance_commands:
  - npm run prisma:validate
  - npm run prisma:generate
  - npx vitest run tests/m4/schema/public-content-schema.test.ts
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/schema/public-content-schema.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-CONTENT-SCHEMA-CORRECTION.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: M
status: merged
---

# Public content schema correction

Add only the missing durable v1 fields and relations required before freezing
B2 contracts: Service icon; Partnership country/order and optional public
Document evidence; Scholarship optional public Document; Achievement optional
public image Media; and Testimonial graduation year plus explicit publication
consent timestamp. Add an immutable corrective migration and generated client
output. Preserve every existing row with nullable fields and safe defaults; do
not edit either accepted migration.
