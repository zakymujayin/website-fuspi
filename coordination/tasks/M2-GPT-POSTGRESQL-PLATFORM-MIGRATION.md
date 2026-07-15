---
id: M2-GPT-POSTGRESQL-PLATFORM-MIGRATION
milestone: M2
title: Replace the MariaDB platform contract with PostgreSQL on VPS
risk: high
writer_model: gpt
reviewer_model: human-owner
tester_model: gpt
base_branch: integration/m2-security
base_sha: d2fb5c52fda9d93663aac9ef21079bcc622a6a77
depends_on: []
spec_refs:
  - coordination/adr/ADR-0003-postgresql-vps-platform.md
  - docs/01-arsitektur.md
  - docs/02-database-schema.md
  - docs/20-test-acceptance-go-live.md
  - docs/24-implementation-plan-multi-model.md
allowed_paths:
  - .env.example
  - .github/workflows/ci.yml
  - README.md
  - package.json
  - package-lock.json
  - prisma.config.ts
  - prisma/schema.prisma
  - prisma/seed.ts
  - prisma/migrations/**
  - prisma/migrations-mariadb-archive/**
  - src/lib/db/**
  - tests/platform/db-config.test.ts
  - tests/platform/platform-db.integration.test.ts
  - tests/platform/auth-bridge/auth-bridge.integration.test.ts
  - tests/platform/auth-runtime/auth-runtime.integration.test.ts
  - tests/security/auth-runtime/auth-adversarial.integration.test.ts
  - tests/security/auth-runtime/credentials-route.integration.test.ts
  - docs/README.md
  - docs/01-arsitektur.md
  - docs/02-database-schema.md
  - docs/07-upload-media-hostinger.md
  - docs/08-deploy-hostinger.md
  - docs/09-fitur-cms-editor.md
  - docs/13-celah-fitur-keamanan-operasional.md
  - docs/20-test-acceptance-go-live.md
  - docs/24-implementation-plan-multi-model.md
  - docs/25-m0-foundation-capability.md
  - coordination/adr/ADR-0003-postgresql-vps-platform.md
  - coordination/milestones/M1-CODE-COMPLETE.md
  - coordination/milestones/M2-EXIT-GATE-AND-M3-ENTRY.md
  - coordination/handoffs/M2-GPT-POSTGRESQL-PLATFORM-MIGRATION-gpt.md
readonly_paths:
  - AGENTS.md
  - src/generated/prisma/**
  - src/lib/auth/**
  - src/contracts/**
forbidden_paths:
  - src/app/**
  - src/components/**
  - messages/**
  - e2e/**
contracts:
  - PostgreSQL is the sole Prisma provider.
  - The application uses a non-superuser role and explicit connection pooling.
  - Historical MariaDB migrations remain archived and are not executable.
  - Existing Auth.js database-session behavior and public UI contracts do not change.
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm run test
  - npm run test:integration
  - npm run build
  - npm run test:e2e
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-POSTGRESQL-PLATFORM-MIGRATION.md TASK_BASE=coordination/m2-postgresql-platform-migration npm run check:scope
token_class: L
status: merged
---

## Intent

Cut the pre-production FUSPI platform over from MariaDB/Hostinger assumptions to one tested,
documented PostgreSQL-on-VPS contract without changing auth behavior or feature scope.

## Acceptance criteria

- Dependency and runtime code contain no MariaDB driver or MySQL datasource provider.
- A fresh PostgreSQL database can deploy the baseline migration and run the seed twice without
  duplicate records or errors.
- Unit and non-skipped database integration tests pass on PostgreSQL.
- CI provisions PostgreSQL and validates migration, seed idempotency, tests, and build.
- Current planning/deployment documents consistently describe PostgreSQL and VPS operations.
- Historical evidence remains identifiable as historical and is not rewritten.

## Handoff requirements

Create `coordination/handoffs/M2-GPT-POSTGRESQL-PLATFORM-MIGRATION-gpt.md` with the exact
database version, migration/seed evidence, commands, files, risks, and head SHA.
