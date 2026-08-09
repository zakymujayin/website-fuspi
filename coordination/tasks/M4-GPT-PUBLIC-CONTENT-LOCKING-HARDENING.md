---
id: M4-GPT-PUBLIC-CONTENT-LOCKING-HARDENING
milestone: M4
title: Harden public content optimistic locking across all resources
risk: high
writer_model: gpt-5-codex
reviewer_model: deepseek-v4-pro
tester_model: gpt-5-codex
base_branch: integration/m4-features
base_sha: b6f8f2887f3196bc4c7632f1eac17695dd7faaef
depends_on:
  - M4-GPT-PUBLIC-CONTENT-DOMAINS
spec_refs:
  - docs/02-database-schema.md
  - docs/04-panel-admin.md
  - docs/21-tata-kelola-privasi-alert.md
allowed_paths:
  - prisma/schema.prisma
  - prisma/migrations/20260809113000_public_content_version_hardening/**
  - src/generated/**
  - src/features/public-content/admin-detail.ts
  - src/features/public-content/admin-query.ts
  - src/features/public-content/administration.ts
  - src/lib/db/revision.ts
  - tests/m4/runtime/public-content-administration.test.ts
  - tests/m4/runtime/public-content-domains.integration.test.ts
  - coordination/tasks/M4-GPT-PUBLIC-CONTENT-LOCKING-HARDENING.md
  - coordination/handoffs/M4-GPT-PUBLIC-CONTENT-LOCKING-HARDENING-gpt.md
readonly_paths:
  - docs/**
  - src/contracts/public-content.ts
  - src/features/public-content/shared.ts
forbidden_paths:
  - src/app/[locale]/(public)/**
  - src/components/public/**
  - src/components/ui/**
  - src/app/globals.css
contracts:
  - Public content admin mutation result versions are non-null for every resource after this task.
acceptance_commands:
  - npm run prisma:generate
  - npm run prisma:validate
  - npm run typecheck
  - npm run lint
  - npm test
  - npm run test:integration
  - git diff --check
token_class: M
status: active
---

## Intent

Close the public-content lost-update gap by making every public content resource use durable version columns, optimistic version claims, and content revisions for create/update/delete/reorder paths.

## Acceptance criteria

- Partnership, scholarship, achievement, student activity, album, and testimonial models have `version Int @default(1)` plus a migration.
- Admin list/detail returns current versions for all ten public content resources.
- Update/delete commands require `expectedVersion` for all ten resources and return `VERSION_CONFLICT` on stale claims.
- Create/update/delete/reorder writes content revisions for all versioned public content resources.
- Runtime tests cover stale version behavior for a formerly unversioned resource.

## Handoff requirements

Use `coordination/handoffs/M4-GPT-PUBLIC-CONTENT-LOCKING-HARDENING-gpt.md` and commit it with the task.
