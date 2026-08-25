---
id: M4-GPT-POST-COVER-PICKER-FIX
milestone: M4
title: Fix post editor cover picker when upload public URL is unset
risk: low
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: 4455a2c1ccb7e145d13a6bcc5abae7d3edd482da
depends_on: []
spec_refs:
  - docs/07-upload-media-hostinger.md
allowed_paths:
  - "coordination/tasks/M4-GPT-POST-COVER-PICKER-FIX.md"
  - "coordination/handoffs/M4-GPT-POST-COVER-PICKER-FIX-gpt.md"
  - "src/app/[locale]/admin/posts/**"
  - "src/app/api/admin/media/route.ts"
  - "tests/m3/ui/admin-post-cover-picker.test.tsx"
acceptance_commands:
  - npx vitest run tests/m3/ui/admin-post-cover-picker.test.tsx tests/m3/ui/admin-post-editor.test.tsx
  - npm run lint
  - npm run typecheck
status: active
---

## Intent

The post editor cover picker should continue to load and render media previews in
local or staging environments where `UPLOAD_PUBLIC_URL` is not explicitly set.
Use the existing `/uploads` public route fallback instead of passing an empty
upload base through post edit/create and the admin media API.
