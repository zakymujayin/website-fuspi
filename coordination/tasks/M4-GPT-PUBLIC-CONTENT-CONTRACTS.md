---
id: M4-GPT-PUBLIC-CONTENT-CONTRACTS
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: e9cc83c2728457b043d0b42bb8c2040fbe945809
allowed_paths:
  - "src/contracts/public-content.ts"
  - "tests/m4/contracts/public-content-contracts.test.ts"
  - "coordination/handoffs/M4-GPT-PUBLIC-CONTENT-CONTRACTS-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/generated/**"
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
  - "docs/04-panel-admin.md"
  - "docs/05-halaman-publik.md"
  - "docs/11-dosen-arsip-pdf-album.md"
  - "docs/18-beranda-editable.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md"
  - "prisma/schema.prisma"
  - "src/contracts/academic-public.ts"
  - "src/contracts/academic.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/media.ts"
depends_on:
  - M4-GPT-ACADEMIC-PUBLIC-DETAIL-RUNTIME
  - M4-GPT-PUBLIC-CONTENT-SCHEMA-CORRECTION
contracts:
  - src/contracts/cms.ts
  - src/contracts/media.ts
acceptance_commands:
  - npx vitest run tests/m4/contracts/public-content-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-CONTENT-CONTRACTS.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: merged
---

# Public content contracts

Freeze strict ADMIN list/detail/command and public list/detail shapes for
Service, Partnership, Scholarship, Achievement, StudentActivity, Document,
Album, Event, FAQ, and Testimonial. Require deterministic pagination/filtering,
ID-first translations with safe fallback, public-safe media/PDF/link views,
expiry/active/consent boundaries, formula-safe export parameters, and
non-technical failures. No arbitrary Prisma selector or private storage field
may cross a contract.
