---
id: M4-GPT-BODY-HYDRATION-EXTENSION-FIX
milestone: M4
title: Suppress browser-extension body attribute hydration noise
risk: low
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: b4af3bda9b529abdd426134f333b6b997bba2c0c
depends_on:
  - M4-GPT-POST-COVER-PICKER-FIX
spec_refs:
  - node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/layout.md
allowed_paths:
  - "coordination/tasks/M4-GPT-BODY-HYDRATION-EXTENSION-FIX.md"
  - "coordination/handoffs/M4-GPT-BODY-HYDRATION-EXTENSION-FIX-gpt.md"
  - "src/app/[locale]/layout.tsx"
  - "tests/foundation/locale-layout-hydration.test.ts"
acceptance_commands:
  - npx vitest run tests/foundation/locale-layout-hydration.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
status: active
---

## Intent

Browser extensions may inject attributes such as `cz-shortcut-listen` onto the
document body before React hydrates. The root locale layout should suppress this
known body-level attribute mismatch so the development overlay does not appear
while editors are saving content.
