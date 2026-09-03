---
id: M4-GPT-PRODI-CMS-ADMIN-NAV
milestone: M4
title: Add study-program CMS editor and collapsible admin navigation
risk: medium
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 83ea28e9058624cd93258e2702db5b137e54192a
depends_on: []
spec_refs:
  - docs/04-panel-admin.md
  - docs/18-beranda-editable.md
  - docs/22-calon-mahasiswa-akademik-discoverability.md
allowed_paths:
  - src/app/[locale]/admin/program-studi/**
  - src/app/api/admin/academic/people/route.ts
  - src/components/admin/academic/**
  - src/components/admin/admin-sidebar.tsx
  - src/components/admin/admin-sidebar-data.ts
  - src/components/admin/admin-layout-shell.tsx
  - src/app/[locale]/(public)/prodi/[slug]/page.tsx
  - tests/m4/ui/program-studi-admin.test.tsx
  - tests/m4/ui/admin-sidebar-groups.test.tsx
  - coordination/tasks/M4-GPT-PRODI-CMS-ADMIN-NAV.md
  - coordination/handoffs/M4-GPT-PRODI-CMS-ADMIN-NAV-gpt.md
  - coordination/ownership.yml
readonly_paths:
  - src/contracts/academic.ts
  - src/features/academic/people.ts
  - prisma/schema.prisma
  - messages/id.json
  - messages/en.json
  - messages/ar.json
  - src/config/institution.ts
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/**
  - src/generated/**
  - src/contracts/**
  - src/features/**
  - src/proxy.ts
acceptance_commands:
  - npx vitest run tests/m4/ui/program-studi-admin.test.tsx tests/m4/ui/admin-sidebar-groups.test.tsx
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PRODI-CMS-ADMIN-NAV.md TASK_BASE=83ea28e9058624cd93258e2702db5b137e54192a npm run check:scope"
status: active
---

# Study-program CMS and admin navigation

Give administrators a supported UI for correcting and maintaining the three
active FUSPI study-program records, and make the long admin navigation usable
through accessible expandable groups. Keep identity fields locked to the
institution contract and submit edits through the existing validated academic
transport.
