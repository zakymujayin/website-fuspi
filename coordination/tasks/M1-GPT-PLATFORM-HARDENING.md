---
id: M1-GPT-PLATFORM-HARDENING
milestone: M1
owner: gpt
reviewer: deepseek
tester: deepseek
base_sha: d196558
allowed_paths:
  - ".github/CODEOWNERS"
  - "package.json"
  - "prisma/seed.ts"
  - "src/lib/db/config.ts"
  - "tests/platform/**"
  - "vitest.integration.config.ts"
  - "coordination/handoffs/M1-GPT-PLATFORM-HARDENING-gpt.md"
forbidden_paths:
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
  - "package-lock.json"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
readonly_paths:
  - "coordination/reviews/M1-GPT-PLATFORM-deepseek.md"
  - "src/lib/audit/**"
  - "src/lib/db/client.ts"
  - "src/lib/db/revision.ts"
  - "src/lib/outbox/**"
depends_on:
  - M1-GPT-PLATFORM
contracts:
  - docs/20-test-acceptance-go-live.md
  - coordination/reviews/M1-GPT-PLATFORM-deepseek.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run test:integration
risk: medium
token_class: S
status: ready
---

# M1 GPT Platform Hardening

Close the actionable findings from the approved DeepSeek review before M1 is tagged:

1. Make the seed use the shared database URL parser/configuration so loopback IPv6 (`::1`) and future adapter settings cannot drift.
2. Make `npm run test:integration` actually discover and execute the platform database integration tests, with an explicit safe opt-in and no silent zero-test success when the database gate is requested.
3. Add focused negative boundary tests for recursive forbidden revision keys and audit depth/array limits. Do not broaden production security behavior unless a test proves a defect.
4. Replace the CODEOWNERS placeholder with the repository owner handle `@zakymujayin`.

Do not edit schema or existing migrations. Use only an isolated local test database. Commit the implementation and required handoff; do not merge it.
