---
id: M4-GPT-ADMIN-USERS-TAXONOMY-RUNTIME
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: bc087587f72177bd69c70e30c3a8f0dff21eaa93
allowed_paths:
  - "src/features/admin/foundation.ts"
  - "src/app/api/admin/users/route.ts"
  - "src/app/api/admin/taxonomies/route.ts"
  - "tests/m4/runtime/admin-foundation-transport.test.ts"
  - "tests/m4/runtime/admin-foundation-transport.integration.test.ts"
  - "tests/security/admin-foundation-adversarial.integration.test.ts"
  - "coordination/handoffs/M4-GPT-ADMIN-USERS-TAXONOMY-RUNTIME-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/components/**"
  - "src/app/[locale]/**"
  - "src/lib/**"
  - "messages/**"
  - "e2e/**"
  - ".github/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/04-panel-admin.md"
  - "docs/06-autentikasi-role.md"
  - "docs/12-multibahasa-rtl.md"
  - "src/contracts/admin-foundation.ts"
  - "src/contracts/auth.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/platform.ts"
  - "src/lib/audit/**"
  - "src/lib/auth/runtime/**"
  - "src/lib/db/**"
  - "src/app/api/admin/pages/route.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-ADMIN-USERS-TAXONOMY-CONTRACTS
contracts:
  - src/contracts/admin-foundation.ts
acceptance_commands:
  - npx vitest run tests/m4/runtime/admin-foundation-transport.test.ts
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/admin-foundation-transport.integration.test.ts tests/security/admin-foundation-adversarial.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ADMIN-USERS-TAXONOMY-RUNTIME.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: merged
---

# M4 GPT ADMIN user and taxonomy runtime

Implement ADMIN-only PostgreSQL runtime and HTTP transport for User and
Category/Tag against the frozen contract.

Required behavior:

- validate active ADMIN database sessions, expiry and `mustChangePassword`
  before lookup;
- strict duplicate-aware query handling, CSRF-first bounded JSON commands,
  deterministic statuses and `Cache-Control: no-store`;
- hash initial passwords with cost 12, always force first-login password
  change, reject unsafe/common/email-equal passwords, and never return hashes;
- atomically prevent self demotion/deactivation and loss of the last active
  ADMIN; revoke target sessions on role/active changes; use `updatedAt`
  optimistic comparison; record sanitized audit entries;
- atomically create/update Category/Tag with translations, never create empty
  EN/AR rows, map unique conflicts safely, reject referenced deletes, and
  expose bounded usage counts;
- revalidate ADMIN content paths only after success; and
- unexpected failures are generic and contain no Prisma detail or sensitive
  data.

Prove PostgreSQL rollback, concurrency conflicts, self/last-ADMIN protection,
session revocation, role rejection before DB access, existing-versus-missing
non-disclosure, Category/Tag references, translation atomicity, hostile query
and command rejection, no-store and failure-only no-revalidation.
