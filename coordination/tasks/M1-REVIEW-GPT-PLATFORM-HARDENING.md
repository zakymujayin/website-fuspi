---
id: M1-REVIEW-GPT-PLATFORM-HARDENING
milestone: M1
owner: deepseek
reviewer: human-integrator
tester: deepseek
base_sha: b9fdaff
target_branch: ai/gpt/m1-platform-hardening
target_head: 2bb9835
allowed_paths:
  - "coordination/reviews/M1-GPT-PLATFORM-HARDENING-deepseek.md"
forbidden_paths:
  - ".github/CODEOWNERS"
  - "package.json"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "vitest.integration.config.ts"
readonly_paths:
  - ".github/CODEOWNERS"
  - "package.json"
  - "prisma/seed.ts"
  - "src/lib/db/config.ts"
  - "tests/platform/**"
  - "vitest.integration.config.ts"
depends_on:
  - M1-GPT-PLATFORM-HARDENING
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

# Review M1 GPT Platform Hardening

Perform a read-only review of `b9fdaff...2bb9835`. Confirm that:

- seed and runtime share one database URL configuration path;
- IPv4, hostname, and bracketed IPv6 loopback behavior is tested correctly;
- `npm run test:integration` discovers and executes the platform DB suite when supplied an isolated migrated database;
- the new audit/revision boundary tests assert real behavior without weakening limits;
- no schema, migration, dependency, lockfile, UI, or generated-code change slipped into the task;
- CODEOWNERS refers to the actual repository owner.

Do not fix the GPT branch. Write exactly one report at `coordination/reviews/M1-GPT-PLATFORM-HARDENING-deepseek.md` with verdict, severity-ordered findings, commands/results, database engine, and reviewed target SHA. Any failed acceptance command or Critical/High issue requires `REQUEST_CHANGES` or `BLOCK`.
