---
id: M0-GPT-FOUNDATION
milestone: M0
owner: gpt-integrator
reviewer: human
tester: gpt-integrator
base_sha: 2ada6c9
allowed_paths:
  - "**"
forbidden_paths:
  - ".env"
  - ".env.local"
depends_on: []
contracts:
  - docs/02-database-schema.md
  - docs/12-multibahasa-rtl.md
  - docs/20-test-acceptance-go-live.md
  - docs/24-implementation-plan-multi-model.md
acceptance_commands:
  - npm run ci:merge
  - npm run test:e2e
risk: high
token_class: L
status: merged
---

# M0 GPT Foundation

Bootstrap repo, frozen platform/schema, locale/RTL smoke route, quality gates, governance, and AI handoff prerequisites. Hostinger account-dependent checks are recorded rather than guessed.
