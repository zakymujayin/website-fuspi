---
id: M4-GPT-LECTURER-ADMIN-PROFILE-EDITOR
milestone: M4
title: Give ADMIN full lecturer academic-record editing and finish directory UI
risk: high
writer_model: gpt
reviewer_model: human
tester_model: gpt
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 32f321b7a71772ab7c04c9482f40848924df3412
depends_on: []
spec_refs:
  - docs/04-panel-admin.md
  - docs/11-dosen-arsip-pdf-album.md
allowed_paths:
  - coordination/tasks/M4-GPT-LECTURER-ADMIN-PROFILE-EDITOR.md
  - coordination/handoffs/M4-GPT-LECTURER-ADMIN-PROFILE-EDITOR-gpt.md
  - coordination/ownership.yml
  - src/features/academic/lecturer-relations.ts
  - src/components/admin/lecturer/lecturer-relations-actions.ts
  - src/components/admin/lecturer/lecturer-relations-manager.tsx
  - src/components/admin/lecturer/lecturer-types.ts
  - src/components/admin/lecturer/lecturer-list.tsx
  - src/app/[locale]/admin/dosen/page.tsx
  - src/app/[locale]/admin/dosen/[id]/edit/page.tsx
  - tests/m4/ui/admin-lecturer-profile-editor.test.tsx
  - tests/m4/runtime/admin-lecturer-relations.test.ts
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/**
  - src/contracts/**
  - src/components/ui/**
  - src/app/globals.css
  - messages/**
acceptance_commands:
  - npx vitest run tests/m4/ui/admin-lecturer-profile-editor.test.tsx
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run prisma:validate
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M4-GPT-LECTURER-ADMIN-PROFILE-EDITOR.md TASK_BASE=32f321b7a71772ab7c04c9482f40848924df3412 npm run check:scope
status: complete
---

## Intent

Let ADMIN maintain a lecturer's education history and publications from the
same edit workspace as the main profile, while making the admin directory
usable on smaller screens and clearer about each lecturer's academic records.

## Acceptance criteria

- ADMIN-only server actions can create, update, and delete education and
  publication rows scoped to the selected lecturer.
- The editor page shows existing records and add forms for both collections.
- Public and lecturer self-service behavior stays unchanged.
- The directory has a readable mobile presentation and useful record-count
  context without changing the database contract.
