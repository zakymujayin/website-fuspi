---
id: M4-GPT-ACCREDITATION-PRESENTATION-FIX
milestone: M4
title: Simplify accreditation presentation and expose missing values
risk: low
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 7ed31f6
depends_on:
  - M4-GPT-ACCREDITATION-CMS-REDESIGN
allowed_paths:
  - src/app/[locale]/(public)/akademik/akreditasi/page.tsx
  - tests/m4/runtime/academic-accreditation.test.ts
  - tests/m4/ui/accreditation-page.test.tsx
  - coordination/tasks/M4-GPT-ACCREDITATION-PRESENTATION-FIX.md
  - coordination/handoffs/M4-GPT-ACCREDITATION-PRESENTATION-FIX-gpt.md
  - coordination/ownership.yml
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/**
  - messages/**
  - src/app/globals.css
acceptance_commands:
  - npx vitest run tests/m4/runtime/academic-accreditation.test.ts tests/m4/ui/accreditation-page.test.tsx
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACCREDITATION-PRESENTATION-FIX.md TASK_BASE=7ed31f6 npm run check:scope"
status: active
---

# Accreditation presentation fix

Remove the extra dark welcome banner because the page title already names the
resource. Keep the page title and the program list. Always render the standard
accreditation fields, including a clear localized empty state for a decree
number that has not yet been entered in the CMS.
