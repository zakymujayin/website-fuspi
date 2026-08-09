---
id: M1-REVIEW-GPT-PLATFORM
milestone: M1
owner: deepseek
reviewer: human-integrator
tester: deepseek
base_sha: 553ed1b
target_branch: ai/gpt/m1-platform
target_head: 99bf1d1
allowed_paths:
  - "coordination/reviews/M1-GPT-PLATFORM-deepseek.md"
forbidden_paths:
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "package.json"
  - "package-lock.json"
readonly_paths:
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/db/**"
  - "src/lib/audit/**"
  - "src/lib/outbox/**"
  - "tests/platform/**"
depends_on:
  - M1-GPT-PLATFORM
contracts:
  - docs/02-database-schema.md
  - docs/20-test-acceptance-go-live.md
  - docs/21-tata-kelola-privasi-alert.md
acceptance_commands:
  - npm run prisma:validate
  - npm run lint
  - npm run typecheck
  - npm test
risk: high
token_class: M
status: ready
---

# Review M1 GPT Platform

Perform a read-only adversarial review of `origin/ai/gpt/m1-platform` against the three contracts. Review the complete diff `553ed1b...99bf1d1`, both SQL migrations, delete behavior, nullable uniqueness, translation/governance coverage, secret/PII handling, seed idempotency, adapter security, revision/audit/outbox primitives, and negative tests.

Do not fix the GPT branch. Write exactly one report at `coordination/reviews/M1-GPT-PLATFORM-deepseek.md` containing:

- verdict: `APPROVE`, `REQUEST_CHANGES`, or `BLOCK`;
- findings ordered Critical/High/Medium/Low with file and line;
- commands and exact results;
- migration/seed database engine used;
- untested MariaDB/Hostinger risks;
- target head SHA reviewed.

Any Critical/High finding or failed command requires `REQUEST_CHANGES`/`BLOCK`. Push the review branch; do not merge it or the GPT branch.
