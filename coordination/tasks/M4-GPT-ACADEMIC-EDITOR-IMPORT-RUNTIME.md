---
id: M4-GPT-ACADEMIC-EDITOR-IMPORT-RUNTIME
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 0514c09dd3ac13e85de01469bbc4efa57b9332b4
allowed_paths:
  - "src/features/academic/editor-import.ts"
  - "src/app/api/admin/academic/editor/route.ts"
  - "src/app/api/admin/academic/people/import/route.ts"
  - "tests/m4/runtime/academic-editor-import.test.ts"
  - "tests/m4/runtime/academic-editor-import.integration.test.ts"
  - "tests/security/academic-editor-import-adversarial.integration.test.ts"
  - "coordination/handoffs/M4-GPT-ACADEMIC-EDITOR-IMPORT-RUNTIME-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/components/**"
  - "src/app/[locale]/**"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "src/contracts/academic.ts"
  - "src/contracts/academic-editor.ts"
  - "src/features/academic/people.ts"
  - "src/features/academic/content.ts"
  - "src/lib/auth/runtime/**"
  - "src/lib/db/**"
  - "prisma/schema.prisma"
depends_on:
  - M4-GPT-ACADEMIC-EDITOR-IMPORT-CONTRACTS
contracts:
  - src/contracts/academic.ts
  - src/contracts/academic-editor.ts
acceptance_commands:
  - npx vitest run tests/m4/runtime/academic-editor-import.test.ts
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/academic-editor-import.integration.test.ts tests/security/academic-editor-import-adversarial.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-ACADEMIC-EDITOR-IMPORT-RUNTIME.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: closed
---

# Academic editor detail and people import runtime

Implement ADMIN-only detail loading for all six academic resources and bounded
Lecturer/Staff import PREVIEW/COMMIT. Validate actor before record lookup so
existing/missing resources are non-disclosing. Return only the frozen detail
contract and public-safe assets.

PREVIEW performs all reference/media/identity checks without writes. COMMIT
repeats validation inside one Serializable transaction, creates every row plus
translations/audit, or rolls back the whole batch. Results are deterministic,
formula-safe, and never include storage keys, Prisma errors, or partial IDs on
failure.
