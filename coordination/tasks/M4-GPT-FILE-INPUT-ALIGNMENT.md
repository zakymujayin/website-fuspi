---
id: M4-GPT-FILE-INPUT-ALIGNMENT
milestone: M4
title: Align visible native file-picker buttons
risk: low
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 04e1102
depends_on:
  - M4-GPT-PUBLIC-FORMS-MEDIA-REDESIGN
allowed_paths:
  - src/components/admin/academic/program-certificate-picker.tsx
  - src/components/admin/lecturer-import/lecturer-import-form.tsx
  - tests/m4/ui/file-input-alignment.test.ts
  - coordination/tasks/M4-GPT-FILE-INPUT-ALIGNMENT.md
  - coordination/handoffs/M4-GPT-FILE-INPUT-ALIGNMENT-gpt.md
  - coordination/ownership.yml
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/**
  - messages/**
  - src/components/ui/**
  - src/app/globals.css
acceptance_commands:
  - npx vitest run tests/m4/ui/file-input-alignment.test.ts tests/m4/ui/public-forms-media-redesign.test.tsx
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-FILE-INPUT-ALIGNMENT.md TASK_BASE=04e1102 npm run check:scope"
status: active
---

# Native file-picker alignment

Give every visible native file input the same 32px browse-button geometry and
alignment. Keep portal inputs visually hidden because those flows already use
an accessible custom button.
