---
id: M2-GPT-SMTP-NPM10-LOCK-CORRECTION
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: 96f02b9
allowed_paths:
  - "package-lock.json"
  - "coordination/handoffs/M2-GPT-SMTP-NPM10-LOCK-CORRECTION-gpt.md"
forbidden_paths:
  - "package.json"
  - ".env*"
  - "prisma/**"
  - "src/**"
  - "tests/**"
  - "scripts/**"
  - ".github/**"
readonly_paths:
  - "package.json"
  - ".github/workflows/ci.yml"
depends_on:
  - M2-GPT-SMTP-OUTBOX-RUNNER
contracts:
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - NPM_CONFIG_CACHE=/tmp/fuspi-npm10-cache npx --yes npm@10.9.4 ci --dry-run
  - npm ci --dry-run
  - npm audit --audit-level=high
  - npm run lint
  - npm run typecheck
  - npm test
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-SMTP-NPM10-LOCK-CORRECTION.md TASK_BASE=origin/coordination/m2-gpt-smtp-npm10-lock-assignment npm run check:scope
risk: medium
token_class: S
status: merged
---

# M2 SMTP npm 10 Lockfile Correction

Regenerate only `package-lock.json` with npm 10.9.4 so the Node 22 GitHub runner accepts
`npm ci`. Preserve every package version and the patched SMTP runtime alias.

## Required implementation

1. Run npm 10.9.4 `install --package-lock-only` without changing `package.json`.
2. Confirm npm 10 and the local npm release both accept clean-install dry runs.
3. Confirm the patched SMTP alias remains `nodemailer@9.0.3`, no vulnerable direct
   Nodemailer 7 runtime is installed, and High/Critical audit count remains zero.
4. Do not change source, tests, workflow, schema, environment, or dependency versions.
