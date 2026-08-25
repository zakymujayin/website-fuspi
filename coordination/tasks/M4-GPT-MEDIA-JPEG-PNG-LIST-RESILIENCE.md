---
id: M4-GPT-MEDIA-JPEG-PNG-LIST-RESILIENCE
milestone: M4
title: Allow JPEG/PNG media upload and keep library listing resilient
risk: medium
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: 38bcf2abcc0d83c30365d25118e423ca36a39e35
depends_on:
  - M4-GPT-MEDIA-UPLOAD-LIBRARY-FIX
spec_refs:
  - docs/07-upload-media-hostinger.md
allowed_paths:
  - "coordination/tasks/M4-GPT-MEDIA-JPEG-PNG-LIST-RESILIENCE.md"
  - "coordination/handoffs/M4-GPT-MEDIA-JPEG-PNG-LIST-RESILIENCE-gpt.md"
  - "src/app/api/admin/media/upload/route.ts"
  - "src/components/admin/media/**"
  - "src/lib/content/media-admin-transport.ts"
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

Admin Media upload must accept JPEG/JPG/PNG/WebP images and convert them to WebP
through the existing storage validator. The Media Library list should not become
entirely unavailable because one persisted row has legacy or partially invalid
public media metadata.
