---
id: M2-GPT-REDIRECT-REGISTRY-SAFETY
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: cf503f2
allowed_paths:
  - "src/contracts/operations.ts"
  - "src/lib/redirect/**"
  - "tests/platform/redirect-registry.test.ts"
  - "tests/platform/redirect-registry.integration.test.ts"
  - "coordination/handoffs/M2-GPT-REDIRECT-REGISTRY-SAFETY-gpt.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env*"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/**"
  - "src/components/**"
  - "src/features/**"
  - "src/lib/auth/**"
  - "src/lib/storage/**"
  - "src/proxy.ts"
readonly_paths:
  - "prisma/schema.prisma"
  - "src/contracts/auth.ts"
  - "src/lib/db/client.ts"
depends_on:
  - M2-GPT-POSTGRESQL-PLATFORM-MIGRATION
contracts:
  - docs/02-database-schema.md
  - docs/13-celah-fitur-keamanan-operasional.md
  - docs/20-test-acceptance-go-live.md
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-REDIRECT-REGISTRY-SAFETY.md TASK_BASE=origin/coordination/m2-gpt-redirect-registry-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M2 GPT Redirect Registry Safety

Implement the safe one-hop registry primitive used later by WordPress migration and request
resolution. Do not implement importer, middleware/proxy routing, or admin UI.

## Required implementation

1. Validate canonical local source paths and locale-final destination paths. Reject domains,
   protocol-relative paths, missing leading slash, query/hash, backslash, controls, traversal,
   encoded slash/backslash/dot traversal, duplicate separators, and reserved `/api`/`/_next`
   sources. Status is exactly 301.
2. Reject source=destination, active redirect chains, and loops. Inactive records do not take
   part in the active graph but their paths remain strictly validated.
3. Serialize registry writes with a PostgreSQL transaction advisory lock so two concurrent
   writes cannot each create half of a loop. Upsert idempotently by source path.
4. Return bounded conflict codes without exposing database errors or unrelated registry rows.
5. Resolve only an active, still-safe, one-hop redirect. Fail closed if stored data is malformed
   or its destination has become another active source. Increment hitCount only for a safe
   resolution.
6. Add adversarial unit tests and PostgreSQL tests for idempotent save, chain/loop rejection,
   parallel opposite-edge writes (exactly one accepted), inactive isolation, fail-closed
   resolution, and hitCount.
7. No route, proxy, importer, UI, schema/migration, dependency, environment, or external URL
   support is allowed.
