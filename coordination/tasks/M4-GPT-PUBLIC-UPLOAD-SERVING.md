---
id: M4-GPT-PUBLIC-UPLOAD-SERVING
milestone: M4
title: Serve public uploaded media from configured upload directory
risk: medium
writer_model: gpt
reviewer_model: unassigned
tester_model: gpt
base_branch: ai/gpt/m4-facility-homepage-admin
base_sha: e951a79
depends_on:
  - M4-GPT-FACILITY-HOMEPAGE-ADMIN
spec_refs:
  - docs/08-deploy-hostinger.md
  - docs/09-fitur-cms-editor.md
allowed_paths:
  - "coordination/tasks/M4-GPT-PUBLIC-UPLOAD-SERVING.md"
  - "coordination/handoffs/M4-GPT-PUBLIC-UPLOAD-SERVING-gpt.md"
  - "src/app/uploads/[...path]/route.ts"
  - "tests/m3/runtime/public-upload-route.test.ts"
contracts:
  - src/contracts/storage.ts
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run prisma:validate
token_class: S
status: review
---

## Intent

Admin media upload commits files into `UPLOAD_DIR`, while public/admin image
views emit `/uploads/{storageKey}` URLs. In local dev there is no static route
serving `UPLOAD_DIR`, so valid uploaded media returns 404. Add a public,
read-only route for validated PUBLIC storage keys only.
