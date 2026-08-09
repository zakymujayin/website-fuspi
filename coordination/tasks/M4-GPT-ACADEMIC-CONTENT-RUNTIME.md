---
id: M4-GPT-ACADEMIC-CONTENT-RUNTIME
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 43408edf4a777c9117f6ba1d085b1b031a5c2c48
allowed_paths:
  - "src/features/academic/content.ts"
  - "src/app/api/admin/academic/content/route.ts"
  - "tests/m4/runtime/academic-content.test.ts"
  - "tests/m4/runtime/academic-content.integration.test.ts"
  - "tests/security/academic-content-adversarial.integration.test.ts"
  - "coordination/handoffs/M4-GPT-ACADEMIC-CONTENT-RUNTIME-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/components/**"
  - "src/app/[locale]/**"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/04-panel-admin.md"
  - "docs/11-dosen-arsip-pdf-album.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "src/contracts/academic.ts"
  - "src/contracts/cms.ts"
  - "src/features/academic/people.ts"
  - "src/config/institution.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-ACADEMIC-DIRECTORY-CONTRACTS
  - M4-GPT-ACADEMIC-PEOPLE-RUNTIME
contracts:
  - src/contracts/academic.ts
acceptance_commands:
  - npx vitest run tests/m4/runtime/academic-content.test.ts
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/academic-content.integration.test.ts tests/security/academic-content-adversarial.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACADEMIC-CONTENT-RUNTIME.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: merged
---

# M4 GPT academic content runtime

Implement ADMIN CRUD/list plus safe public queries for Research,
CommunityService, and Unit against the frozen academic contract. Mutate parent,
translations, and lecturer relations atomically. Enforce ADMIN session,
same-origin bounded transport, exact relation scope, safe external HTTPS links,
ID activation for Unit, governance/audit/revision where the schema supports it,
safe unique conflicts, and reference-safe deletion.

Public queries must return only publishable records/translations with ID fallback
and never leak phone, private identifiers, inactive Units, technical errors, or
arbitrary Prisma selectors. Prove rollback, relation replacement, locale
fallback, non-disclosure, and hostile inputs against PostgreSQL.
