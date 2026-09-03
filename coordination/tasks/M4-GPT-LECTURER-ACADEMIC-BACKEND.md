---
id: M4-GPT-LECTURER-ACADEMIC-BACKEND
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 26640d7d8f9f1f17fc3bf951d0dd28f98cb0a3e2
allowed_paths:
  - "prisma/schema.prisma"
  - "prisma/migrations/20260904150000_add_lecturer_hki_teaching_assignments/migration.sql"
  - "src/contracts/lecturer-academic.ts"
  - "src/features/academic/lecturer-academic-records.ts"
  - "src/app/api/admin/academic/lecturer-records/route.ts"
  - "src/app/[locale]/(public)/dosen/[id]/page.tsx"
  - "src/components/public/lecturer-academic-records.tsx"
  - "tests/m4/contracts/lecturer-academic-contracts.test.ts"
  - "tests/m4/runtime/lecturer-academic-records.test.ts"
  - "coordination/tasks/M4-GPT-LECTURER-ACADEMIC-BACKEND.md"
  - "coordination/handoffs/M4-GPT-LECTURER-ACADEMIC-BACKEND-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "src/generated/**"
  - "src/components/ui/**"
  - "src/app/globals.css"
  - "coordination/ownership.yml"
readonly_paths:
  - "AGENTS.md"
  - "docs/02-database-schema.md"
  - "docs/04-panel-admin.md"
  - "docs/11-dosen-arsip-pdf-album.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/22-calon-mahasiswa-akademik-discoverability.md"
  - "src/contracts/academic-public.ts"
  - "src/contracts/lecturer-portal.ts"
depends_on:
  - M4-GPT-LECTURER-PUBLIC-PROFILE-ENHANCEMENT
contracts:
  - src/contracts/lecturer-academic.ts
acceptance_commands:
  - npm run prisma:validate
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
risk: high
token_class: L
status: complete
---

# Lecturer academic backend

Add ADMIN-only CRUD and two-phase CSV import for lecturer intellectual property
and teaching assignments. Extend the public lecturer detail query with safe
published records and maintain the existing locale-safe profile presentation.
