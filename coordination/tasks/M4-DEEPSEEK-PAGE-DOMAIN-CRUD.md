---
id: M4-DEEPSEEK-PAGE-DOMAIN-CRUD
milestone: M4
owner: deepseek
reviewer: claude
tester: gpt
base_branch: integration/m4-features
base_sha: a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0
allowed_paths:
  - "src/features/content/pages/**"
  - "tests/m4/content/pages/**"
  - "coordination/handoffs/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-deepseek.md"
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
  - "tests/m4/ui/**"
  - "tests/m4/tickets/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/04-panel-admin.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/milestones/M4-FEATURES-ENTRY.md"
  - "prisma/schema.prisma"
  - "src/contracts/auth.ts"
  - "src/contracts/operations.ts"
  - "src/contracts/platform.ts"
  - "src/lib/auth/**"
  - "src/lib/audit/**"
  - "src/lib/content/post-admin-transport.ts"
  - "src/lib/content/post-mutations.ts"
  - "src/lib/db/**"
  - "src/lib/security/sanitize.ts"
depends_on:
  - M3-GPT-PROCESS-RECONCILIATION-AND-EXIT
contracts:
  - prisma/schema.prisma
  - src/contracts/auth.ts
  - src/contracts/operations.ts
  - src/contracts/platform.ts
acceptance_commands:
  - "npx vitest run tests/m4/content/pages --exclude '**/*.integration.test.ts'"
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/content/pages"
  - npm test
  - npm run test:integration
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-DEEPSEEK-PAGE-DOMAIN-CRUD.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: queued
---

# M4 DeepSeek Page domain CRUD

Implement the non-sensitive `Page` domain service/query/mutation layer only,
using the accepted M3 Post implementation as the behavioral pattern and the
existing Prisma `Page`/`PageTranslation` models as the frozen data contract.
Admin routes, components, message files, and public Page rendering are later
tasks.

## Required outcome

1. Strict feature-local Zod boundaries cover list, detail, create, update,
   publish/draft/archive as supported by the frozen enum, and delete inputs and
   non-technical results. ID translation is mandatory; EN/AR are optional.
2. Every entry point validates an active database session and permits only
   `ADMIN`. EDITOR, PETUGAS, and SATGAS_PPKS receive the same non-disclosing
   forbidden result regardless of Page existence.
3. Parent Page and all supplied translations are written in one transaction.
   Slugs are canonical and unique. Parent references must exist; self-parenting
   and ancestry cycles are rejected.
4. Rich text is sanitized at the trust boundary. A hero reference, when
   supplied, must exist and use public storage. Never return raw Prisma errors,
   storage keys, private fields, session data, or technical details.
5. Update/delete use the existing optimistic-lock primitive. A stale version
   cannot overwrite a newer record. Revisions and activity logs follow the M3
   pattern and share the business transaction.
6. List/query behavior is bounded and deterministic: server pagination,
   normalized search/status/sort, Indonesian title as the admin source label,
   safe parent summary, and no arbitrary Prisma selector/order input.
7. PostgreSQL integration tests prove transaction rollback, auth/role
   rejection, nonexistent-versus-forbidden behavior, translation replacement,
   slug conflict, hierarchy-cycle rejection, XSS sanitization, public-media
   enforcement, optimistic conflict, audit/revision creation, and safe delete
   behavior with children.

Do not add a shared contract, migration, route, action file outside the feature,
UI, fixture that looks like real institutional content, or configuration
change. If the frozen schema or shared primitive is insufficient, document the
exact contract request in the handoff and stop that portion. Commit the required
handoff and stop.
