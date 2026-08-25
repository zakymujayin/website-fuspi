---
id: M4-GPT-MEDIA-UPLOAD-LIBRARY-FIX
milestone: M4
title: Fix admin media WebP upload, library load, and delete affordance
risk: medium
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: ee0c930c780e67130c37e8bd35ea647268edd6a1
depends_on:
  - M4-GPT-POST-COVER-PICKER-FIX
  - M4-GPT-BODY-HYDRATION-EXTENSION-FIX
spec_refs:
  - docs/07-upload-media-hostinger.md
allowed_paths:
  - "coordination/tasks/M4-GPT-MEDIA-UPLOAD-LIBRARY-FIX.md"
  - "coordination/handoffs/M4-GPT-MEDIA-UPLOAD-LIBRARY-FIX-gpt.md"
  - "src/app/[locale]/admin/media/page.tsx"
  - "src/app/api/admin/media/upload/route.ts"
  - "src/components/admin/media/**"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-media-upload.test.tsx"
  - "tests/m3/ui/admin-media-library-browse.test.tsx"
  - "tests/m3/runtime/media-admin-transport.test.ts"
acceptance_commands:
  - npx vitest run tests/m3/ui/admin-media-upload.test.tsx tests/m3/ui/admin-media-library-browse.test.tsx tests/m3/runtime/media-admin-transport.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
status: active
---

## Intent

Editors must be able to upload browser-provided `.webp` images, load already
uploaded Media Library items in local/staging environments without an explicit
`UPLOAD_PUBLIC_URL`, and delete unused public media through the existing
reference-aware admin media command.
