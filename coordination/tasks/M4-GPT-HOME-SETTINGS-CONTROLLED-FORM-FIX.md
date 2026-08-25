---
id: M4-GPT-HOME-SETTINGS-CONTROLLED-FORM-FIX
milestone: M4
title: Fix Base UI uncontrolled default value warning in home settings
risk: low
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: 21acd89e5295eac4100d79ca32b63478164f0e3c
depends_on:
  - M4-GPT-HOME-SETTINGS-VIDEO-VALIDATION-FIX
spec_refs:
  - docs/04-panel-admin.md
allowed_paths:
  - "coordination/tasks/M4-GPT-HOME-SETTINGS-CONTROLLED-FORM-FIX.md"
  - "coordination/handoffs/M4-GPT-HOME-SETTINGS-CONTROLLED-FORM-FIX-gpt.md"
  - "src/app/[locale]/admin/beranda/pengaturan/page.tsx"
  - "src/components/admin/home-nav/site-setting-editor-form.tsx"
  - "tests/m4/contracts/home-nav-contracts.test.ts"
acceptance_commands:
  - npx vitest run tests/m4/contracts/home-nav-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
status: active
---

## Intent

Saving Admin Home Settings should not trigger Base UI uncontrolled FieldControl
warnings. Text fields must keep stable controlled state across refreshes and
locale tab changes.
