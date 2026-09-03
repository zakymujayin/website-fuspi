---
id: M4-GPT-LECTURER-UI-FIDELITY
milestone: M4
title: Restore clean lecturer admin layout fidelity
risk: medium
writer_model: gpt
reviewer_model: human
tester_model: gpt
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 3ee798ea61de953521239434fc8311a66b71fe58
depends_on: []
spec_refs:
  - docs/04-panel-admin.md
  - docs/17-komponen-ui-detail.md
allowed_paths:
  - coordination/tasks/M4-GPT-LECTURER-UI-FIDELITY.md
  - coordination/handoffs/M4-GPT-LECTURER-UI-FIDELITY-gpt.md
  - coordination/ownership.yml
  - src/components/admin/lecturer/lecturer-admin-workspace.tsx
  - src/components/admin/lecturer/lecturer-editor-form.tsx
  - src/components/admin/lecturer/lecturer-relations-manager.tsx
  - src/components/admin/lecturer/lecturer-academic-records-manager.tsx
  - src/components/admin/lecturer/lecturer-list.tsx
  - src/app/[locale]/admin/dosen/[id]/edit/page.tsx
  - tests/m4/ui/admin-lecturer-ui-fidelity.test.tsx
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/**
  - src/components/ui/**
  - src/app/globals.css
  - messages/**
acceptance_commands:
  - npx vitest run tests/m4/ui/admin-lecturer-ui-fidelity.test.tsx
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
status: complete
---

## Intent

Make the lecturer admin experience visually calm and scannable: desktop list
columns follow the approved compact directory reference, while the edit view
shows one purposeful workspace at a time.

## Acceptance criteria

- The admin directory keeps the compact five-column desktop table and remains
  usable on mobile.
- The edit route does not render three long form stacks simultaneously.
- All existing lecturer profile and academic-record actions remain mounted and
  reachable through accessible tabs.
