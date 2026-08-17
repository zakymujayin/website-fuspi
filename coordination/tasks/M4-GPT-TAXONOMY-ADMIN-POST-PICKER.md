---
id: M4-GPT-TAXONOMY-ADMIN-POST-PICKER
milestone: M4
title: Add taxonomy admin UI and wire category/tag pickers into Post editor
risk: medium
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: 8aa05b3
depends_on:
  - M4-CLAUDE-ADMIN-SIDEBAR-RESTORE
spec_refs:
  - docs/04-panel-admin.md
  - docs/09-fitur-cms-editor.md
allowed_paths:
  - "coordination/tasks/M4-GPT-TAXONOMY-ADMIN-POST-PICKER.md"
  - "coordination/handoffs/M4-GPT-TAXONOMY-ADMIN-POST-PICKER-gpt.md"
  - "src/app/[locale]/admin/taksonomi/**"
  - "src/components/admin/taxonomy/**"
  - "src/components/admin/posts/post-editor-form.tsx"
  - "src/components/admin/posts/post-editor-payload.ts"
  - "src/components/admin/posts/post-editor-shell.tsx"
  - "src/components/admin/posts/post-editor-view.ts"
  - "src/app/[locale]/admin/posts/new/page.tsx"
  - "src/app/[locale]/admin/posts/[postId]/edit/page.tsx"
  - "src/components/admin/admin-sidebar-data.ts"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-post-editor.test.tsx"
  - "tests/m3/ui/admin-post-autosave.test.tsx"
  - "tests/m3/ui/admin-post-cover-picker.test.tsx"
  - "tests/m4/ui/taxonomy-admin-form.test.tsx"
contracts:
  - src/contracts/admin-foundation.ts
  - src/contracts/post-admin.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run prisma:validate
token_class: M
status: review
---

## Intent

The taxonomy backend and `/api/admin/taxonomies` route exist, but there is no
admin UI and the Post editor still hardcodes `categoryId: null` and `tagIds: []`
for creates. Add category/tag management pages and a Post editor picker so new
and edited posts can persist taxonomy assignments through the existing frozen
contracts.
