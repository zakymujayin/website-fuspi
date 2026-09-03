---
id: M4-GPT-ACCREDITATION-SAVE-TRANSLATION-FIX
milestone: M4
title: Fix missing saving translation in accreditation editor
risk: low
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 831e02f
depends_on:
  - M4-GPT-ACCREDITATION-CMS-REDESIGN
allowed_paths:
  - src/components/admin/academic/program-studi-editor-form.tsx
  - tests/m4/ui/accreditation-page.test.tsx
  - coordination/tasks/M4-GPT-ACCREDITATION-SAVE-TRANSLATION-FIX.md
  - coordination/handoffs/M4-GPT-ACCREDITATION-SAVE-TRANSLATION-FIX-gpt.md
  - coordination/ownership.yml
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/**
  - messages/**
  - src/app/globals.css
acceptance_commands:
  - npx vitest run tests/m4/ui/accreditation-page.test.tsx tests/m4/runtime/academic-accreditation.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACCREDITATION-SAVE-TRANSLATION-FIX.md TASK_BASE=831e02f npm run check:scope"
status: active
---

# Accreditation editor save translation fix

Use an existing localized editor submission label for the accreditation form's
pending save state. Do not add or alter message files when an equivalent key is
already available in all supported locales.
