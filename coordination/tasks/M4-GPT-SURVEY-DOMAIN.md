---
id: M4-GPT-SURVEY-DOMAIN
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: b6f8f2887f3196bc4c7632f1eac17695dd7faaef
allowed_paths:
  - "src/features/survey/**"
  - "src/app/api/admin/surveys\/** src\/app\/api\/public/surveys/**"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
readonly_paths:
  - "prisma/schema.prisma"
  - "src/lib/db/**"
  - "src/contracts/**"
risk: medium
token_class: L
status: merged
---

Implemented domain logic and API routes.

Files:
- src/features/survey/domain.ts
- src/app/api/admin/surveys\/route.ts src\/app\/api\/public/surveys/route.ts
