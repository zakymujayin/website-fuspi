---
id: M4-GPT-ACADEMIC-PEOPLE-RUNTIME
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 0fe94da01de7deab923a30f5b2b34c42ec3f5140
allowed_paths:
  - "src/features/academic/people.ts"
  - "src/app/api/admin/academic/people/route.ts"
  - "tests/m4/runtime/academic-people.test.ts"
  - "tests/m4/runtime/academic-people.integration.test.ts"
  - "tests/security/academic-people-adversarial.integration.test.ts"
  - "coordination/handoffs/M4-GPT-ACADEMIC-PEOPLE-RUNTIME-gpt.md"
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
  - "src/contracts/auth.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/media.ts"
  - "src/config/institution.ts"
  - "src/lib/auth/runtime/**"
  - "src/lib/db/**"
  - "src/app/api/admin/pages/route.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-ACADEMIC-DIRECTORY-CONTRACTS
contracts:
  - src/contracts/academic.ts
acceptance_commands:
  - npx vitest run tests/m4/runtime/academic-people.test.ts
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/academic-people.integration.test.ts tests/security/academic-people-adversarial.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACADEMIC-PEOPLE-RUNTIME.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: merged
---

# M4 GPT academic people runtime

Implement ADMIN CRUD/list and safe public queries for StudyProgram, Lecturer,
and Staff against the frozen academic contract. Parent+translations and relation
changes are transactional. Validate PUBLIC media, document references, exact
five-program identity/order, ID activation, optimistic versions where the
schema provides them, safe unique conflict mapping, reference-safe deletion,
ADMIN session/CSRF/body bounds/no-store, audit/revision, and success-only
ID/EN/AR revalidation.

Public queries must return active records only, publishable translation or ID
fallback, PUBLIC media only, institutional email only, and never phone, NIP,
NIDN, storage key, inactive records, or technical errors. Prove rollback,
identity invariants, media/document restrictions, existing-versus-missing
non-disclosure and hostile input against PostgreSQL.
