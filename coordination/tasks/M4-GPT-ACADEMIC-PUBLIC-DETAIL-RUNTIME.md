---
id: M4-GPT-ACADEMIC-PUBLIC-DETAIL-RUNTIME
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: ba61d2f3aa1687578af1f36948d691ab9d3b1d88
allowed_paths:
  - "src/features/academic/public-detail.ts"
  - "tests/m4/runtime/academic-public-detail.test.ts"
  - "tests/m4/runtime/academic-public-detail.integration.test.ts"
  - "tests/security/academic-public-detail-adversarial.integration.test.ts"
  - "coordination/handoffs/M4-GPT-ACADEMIC-PUBLIC-DETAIL-RUNTIME-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "src/contracts/academic-public.ts"
  - "src/contracts/academic.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/media.ts"
  - "src/features/academic/people.ts"
  - "src/features/academic/content.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-ACADEMIC-PUBLIC-DETAIL-CONTRACTS
contracts:
  - src/contracts/academic-public.ts
acceptance_commands:
  - npx vitest run tests/m4/runtime/academic-public-detail.test.ts
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/academic-public-detail.integration.test.ts tests/security/academic-public-detail-adversarial.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACADEMIC-PUBLIC-DETAIL-RUNTIME.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: merged
---

# Academic public detail runtime

Implement trusted slug+locale detail queries for all six academic resources.
Resolve only PUBLISHED requested locale or PUBLISHED Indonesian fallback;
active-filter StudyProgram, Lecturer, Staff and Unit; independently filter
related lecturers; validate media, documents and legacy URLs; and return the
same NOT_FOUND result for absent, inactive, untranslated or unsafe records.
