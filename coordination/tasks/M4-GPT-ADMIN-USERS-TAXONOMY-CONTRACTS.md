---
id: M4-GPT-ADMIN-USERS-TAXONOMY-CONTRACTS
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 42aa17beb910b61520c522395d5e8c532defd8da
allowed_paths:
  - "src/contracts/admin-foundation.ts"
  - "tests/m4/contracts/admin-foundation-contracts.test.ts"
  - "coordination/handoffs/M4-GPT-ADMIN-USERS-TAXONOMY-CONTRACTS-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/**"
  - "src/components/**"
  - "src/features/**"
  - "src/lib/**"
  - "messages/**"
  - "e2e/**"
  - ".github/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/02-database-schema.md"
  - "docs/04-panel-admin.md"
  - "docs/06-autentikasi-role.md"
  - "docs/12-multibahasa-rtl.md"
  - "coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md"
  - "src/contracts/auth.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/platform.ts"
  - "src/lib/auth/runtime/password.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-CMS-SHARED-CONTRACTS
contracts:
  - src/contracts/auth.ts
  - src/contracts/cms.ts
acceptance_commands:
  - npx vitest run tests/m4/contracts/admin-foundation-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ADMIN-USERS-TAXONOMY-CONTRACTS.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: M
status: active
---

# M4 GPT ADMIN user and taxonomy contracts

Freeze the ADMIN-only browser boundary for User management and reusable
Category/Tag taxonomy before implementing PostgreSQL runtime/routes.

User requirements:

- list/search/filter ADMIN users without password hash, session, credential,
  token, or authentication metadata;
- create with name, normalized email, strong initial password, role, active
  state, and mandatory first-login password change;
- update name/email/role/active state using expected `updatedAt` concurrency;
- no user delete command;
- command shape must carry the actor ID needed for runtime self-lockout checks,
  while the actor remains derived from the trusted session rather than body;
- safe deterministic result codes for self lockout, last-ADMIN protection,
  email conflict, concurrency and unavailable state.

Taxonomy requirements:

- Category and Tag list/editor/create/update/delete commands;
- neutral unique slug and exactly one required Indonesian translation with
  optional English/Arabic names; no empty translation rows;
- safe usage counts, in-use delete conflict, pagination, and deterministic
  results;
- strict schemas, bounded fields, duplicate-aware queries, no arbitrary Prisma
  selector/order input, and no technical error surface.

Do not change schema, generated code, existing contracts, auth runtime, routes,
UI, dependencies, configuration, messages, or migration.
