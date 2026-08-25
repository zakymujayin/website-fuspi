---
id: M4-GPT-HOME-SETTINGS-VIDEO-VALIDATION-FIX
milestone: M4
title: Fix home settings profile video validation payload
risk: low
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: f10ccc34f460f5d1810650616f2f5d0f5fa11657
depends_on:
  - M4-GPT-MEDIA-JPEG-PNG-LIST-RESILIENCE
spec_refs:
  - docs/04-panel-admin.md
allowed_paths:
  - "coordination/tasks/M4-GPT-HOME-SETTINGS-VIDEO-VALIDATION-FIX.md"
  - "coordination/handoffs/M4-GPT-HOME-SETTINGS-VIDEO-VALIDATION-FIX-gpt.md"
  - "src/components/admin/home-nav/site-setting-editor-form.tsx"
  - "src/features/home-nav/admin-detail.ts"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m4/contracts/home-nav-contracts.test.ts"
acceptance_commands:
  - npx vitest run tests/m4/contracts/home-nav-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
status: active
---

## Intent

Saving the Admin Home Settings profile video should not fail validation because
unchanged singleton media identifiers are omitted from the form payload. The UI
must also show a translated validation message instead of the raw i18n key.
