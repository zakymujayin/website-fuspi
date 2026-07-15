---
id: M2-GPT-NPM10-FINAL-LOCK-CORRECTION
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: 3306400
allowed_paths:
  - "package-lock.json"
  - "coordination/handoffs/M2-GPT-NPM10-FINAL-LOCK-CORRECTION-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "e2e/**"
readonly_paths:
  - "coordination/handoffs/M2-GPT-FINAL-CLOSURE-AND-M3-ENTRY-gpt.md"
depends_on:
  - M2-GPT-FINAL-CLOSURE-AND-M3-ENTRY
contracts:
  - package.json
acceptance_commands:
  - NPM_CONFIG_CACHE=/tmp/fuspi-npm10-final-cache npx --yes npm@10.9.4 ci --dry-run
  - npm run lint
  - npm run typecheck
  - npm test
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-NPM10-FINAL-LOCK-CORRECTION.md TASK_BASE=origin/coordination/m2-gpt-npm10-final-lock-assignment npm run check:scope
risk: medium
token_class: S
status: assigned
---

# M2 GPT npm 10 Final Lock Correction

Regenerate only `package-lock.json` with npm 10.9.4 so the dependency contract already merged by
the final closure task passes GitHub Actions `npm ci`. Do not change package versions, runtime,
schema, tests, or the previous task handoff.
