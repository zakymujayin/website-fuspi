---
id: M4-GPT-ACCREDITATION-CMS-REDESIGN
milestone: M4
title: Move accreditation to CMS and redesign public page
risk: high
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: d594836
depends_on:
  - M4-GPT-PRODI-CMS-ADMIN-NAV
allowed_paths:
  - prisma/schema.prisma
  - prisma/migrations/20260904120000_add_study_program_accreditation_details/migration.sql
  - src/generated/prisma/**
  - src/contracts/academic.ts
  - src/contracts/academic-public.ts
  - src/features/academic/people.ts
  - src/features/academic/public-detail.ts
  - src/app/api/admin/academic/people/route.ts
  - src/app/[locale]/(public)/akademik/akreditasi/page.tsx
  - src/app/[locale]/admin/program-studi/[id]/edit/page.tsx
  - src/components/admin/academic/**
  - tests/m4/contracts/academic-accreditation-contracts.test.ts
  - tests/m4/runtime/academic-accreditation.test.ts
  - tests/m4/ui/accreditation-page.test.tsx
  - coordination/tasks/M4-GPT-ACCREDITATION-CMS-REDESIGN.md
  - coordination/handoffs/M4-GPT-ACCREDITATION-CMS-REDESIGN-gpt.md
  - coordination/ownership.yml
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/migrations-mariadb-archive/**
  - src/proxy.ts
  - src/app/globals.css
  - messages/**
acceptance_commands:
  - npx prisma validate
  - npx prisma generate
  - npx vitest run tests/m4/contracts/academic-accreditation-contracts.test.ts tests/m4/runtime/academic-accreditation.test.ts tests/m4/ui/accreditation-page.test.tsx
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACCREDITATION-CMS-REDESIGN.md TASK_BASE=d594836 npm run check:scope"
status: active
---

# Accreditation CMS and public page

Use `StudyProgram` as the only source for the public accreditation page. Store
the agency, decree number, expiry, and one public PDF certificate per active
study program. Do not create or display a faculty accreditation block until
the faculty supplies official data. Keep IAT, IH, and AFI constrained by the
institution contract and preserve locale fallback and public media validation.
