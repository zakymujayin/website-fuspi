---
id: M4-GPT-PUBLIC-CONTENT-DOMAINS
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 70a755b20a987aef015de87a38aab15040e1a6b6
allowed_paths:
  - "src/features/public-content/**"
  - "tests/m4/runtime/public-content*.test.ts"
  - "tests/m4/runtime/public-content*.integration.test.ts"
  - "tests/security/public-content*.integration.test.ts"
  - "coordination/handoffs/M4-GPT-PUBLIC-CONTENT-DOMAINS-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/04-panel-admin.md"
  - "docs/05-halaman-publik.md"
  - "docs/11-dosen-arsip-pdf-album.md"
  - "docs/18-beranda-editable.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md"
  - "prisma/schema.prisma"
  - "src/contracts/public-content.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/media.ts"
  - "src/contracts/auth.ts"
  - "src/lib/audit.ts"
  - "src/lib/content-revision.ts"
  - "src/lib/optimistic-lock.ts"
  - "src/lib/security/sanitize.ts"
  - "src/lib/auth/authorization.ts"
  - "src/features/academic/content.ts"
  - "src/features/academic/people.ts"
depends_on:
  - M4-GPT-PUBLIC-CONTENT-CONTRACTS
  - M4-GPT-PUBLIC-CONTENT-CONTRACT-CORRECTION
  - M4-GPT-ACTIVITY-CAPTION-SCHEMA-CORRECTION
contracts:
  - src/contracts/public-content.ts
acceptance_commands:
  - "npx vitest run tests/m4/runtime/public-content*.test.ts --exclude '**/*.integration.test.ts'"
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/public-content*.integration.test.ts tests/security/public-content*.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-CONTENT-DOMAINS.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: ready
---

# Public content domains

Implement ADMIN-only list/detail/create/update/delete/reorder and trusted public
list/detail queries for all ten frozen B2 resources, plus formula-safe
Partnership export. Validate and sanitize before writes; keep parent,
translations, relations, audit and revision work transactional; enforce PUBLIC
image/PDF references, optimistic locking where versioned, consent, active/
publication/expiry, and ID-first locale fallback. Public missing, hidden,
expired, untranslated and unsafe records must be indistinguishable. No browser
route belongs in this task.
