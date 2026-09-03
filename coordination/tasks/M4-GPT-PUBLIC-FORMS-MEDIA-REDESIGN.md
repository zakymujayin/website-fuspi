---
id: M4-GPT-PUBLIC-FORMS-MEDIA-REDESIGN
milestone: M4
title: Redesign public forms and media surfaces
risk: medium
writer_model: gpt
reviewer_model: claude
tester_model: deepseek
base_branch: ai/gpt/m4-public-ia-menu-remap
base_sha: 25f98e5
depends_on: []
allowed_paths:
  - src/components/public/complaint/complaint-submit-form.tsx
  - src/components/public/ppks/ppks-report-form.tsx
  - src/components/public/booking/booking-request-form.tsx
  - src/app/[locale]/admin/media/page.tsx
  - src/app/[locale]/admin/media/loading.tsx
  - src/components/admin/media/media-upload.tsx
  - src/components/admin/media/media-grid.tsx
  - src/components/admin/media/media-item-card.tsx
  - src/components/admin/media/media-filter-tabs.tsx
  - src/components/admin/media/media-grid-skeleton.tsx
  - src/components/admin/media/media-state-notice.tsx
  - src/components/admin/media/media-thumbnail.tsx
  - src/components/admin/media/media-picker-upload-panel.tsx
  - src/components/admin/home-nav/home-media-picker.tsx
  - tests/m4/ui/public-forms-media-redesign.test.tsx
  - coordination/tasks/M4-GPT-PUBLIC-FORMS-MEDIA-REDESIGN.md
  - coordination/handoffs/M4-GPT-PUBLIC-FORMS-MEDIA-REDESIGN-gpt.md
  - coordination/ownership.yml
readonly_paths:
  - src/components/ui/input.tsx
  - src/components/ui/field.tsx
  - src/contracts/media-admin.ts
  - src/components/public/complaint/complaint-server-actions.ts
  - src/components/public/ppks/ppks-server-actions.ts
  - src/components/public/booking/booking-server-actions.ts
forbidden_paths:
  - .env*
  - package.json
  - package-lock.json
  - prisma/**
  - src/app/globals.css
  - src/components/ui/**
  - messages/**
  - src/lib/**
  - src/features/**
contracts: []
acceptance_commands:
  - npx vitest run tests/m4/ui/public-forms-media-redesign.test.tsx
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-FORMS-MEDIA-REDESIGN.md TASK_BASE=25f98e5 npm run check:scope"
status: active
---

## Intent

Give the public complaint, protected PPKS, and facility-booking forms a clear
card surface and a readable file-selection treatment. Refresh the admin Media
Library and the homepage settings media picker so selected media, upload, empty,
filter, and grid states have clear hierarchy and consistent surfaces.

## Acceptance criteria

- Public forms retain every field, name, accept rule, action, and sensitive-flow behavior.
- File inputs expose a prominent, keyboard-accessible browse affordance and a clear selected-file surface.
- The admin Media Library and homepage media picker use consistent cards, spacing, previews, and state styling.
- No server action, storage boundary, PPKS privacy rule, booking rule, translation, schema, or shared token changes.
