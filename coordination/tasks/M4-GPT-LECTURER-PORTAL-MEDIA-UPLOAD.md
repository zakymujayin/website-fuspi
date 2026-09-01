---
id: M4-GPT-LECTURER-PORTAL-MEDIA-UPLOAD
milestone: M4
owner: gpt-5.3-codex
reviewer: human
tester: gpt-5.3-codex
base_sha: d55ff7ef0b5b2488055b45c93bf8d2c96c400e12
allowed_paths:
  - "coordination/tasks/M4-GPT-LECTURER-PORTAL-MEDIA-UPLOAD.md"
  - "coordination/handoffs/M4-GPT-LECTURER-PORTAL-MEDIA-UPLOAD-gpt.md"
  - "src/app/[locale]/portal-dosen/page.tsx"
  - "src/app/api/portal/lecturer/media/upload/route.ts"
  - "src/components/portal/profile-form.tsx"
  - "src/contracts/lecturer-portal.ts"
  - "src/contracts/media.ts"
  - "src/features/lecturer-portal/domain.ts"
  - "src/features/lecturer-portal/media-upload.ts"
  - "src/lib/content/media-persistence.ts"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/platform/lecturer-portal/lecturer-portal.test.ts"
  - "tests/security/lecturer-portal-adversarial.integration.test.ts"
forbidden_paths:
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "package.json"
  - "package-lock.json"
  - "src/config/institution.ts"
  - "src/lib/ppks-support.ts"
  - "next-env.d.ts"
depends_on:
  - "M4-GPT-LECTURER-PORTAL-LOGIN-REDIRECT"
contracts:
  - "Trusted lecturer sessions may upload only own public profile photo/CV media through a portal route."
  - "Lecturer profile saves must not attach media uploaded by another user or media with the wrong type."
acceptance_commands:
  - "npx vitest run tests/platform/lecturer-portal/lecturer-portal.test.ts"
  - "set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/security/lecturer-portal-adversarial.integration.test.ts"
  - "npm run lint"
  - "npm run typecheck"
  - "npm run test"
  - "npm run build"
  - "git diff --check"
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-LECTURER-PORTAL-MEDIA-UPLOAD.md TASK_BASE=d55ff7ef0b5b2488055b45c93bf8d2c96c400e12 npm run check:scope"
risk: high
token_class: M
status: active
---

# Scope

Implement the remaining lecturer portal media gap: lecturers can upload their own public profile photo and CV PDF from `/portal-dosen`, while server-side profile saves enforce media ownership and MIME type.

Also run a live browser login verification with a synthetic lecturer account after implementation.
