---
id: M4-GPT-HOME-NAV-CONTRACTS
milestone: M4
owner: gpt
reviewer: backend-wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 675d50578589ab5794ba0c05f9c29b834457932d
allowed_paths:
  - "src/contracts/home-nav.ts"
  - "tests/m4/contracts/home-nav-contracts.test.ts"
  - "coordination/handoffs/M4-GPT-HOME-NAV-CONTRACTS-gpt.md"
forbidden_paths:
  - ".env*"
  - "package*.json"
  - "prisma/**"
  - "src/generated/**"
  - "src/lib/**"
  - "src/features/**"
  - "src/app/**"
  - "src/components/**"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/README.md"
  - "docs/05-halaman-publik.md"
  - "docs/18-beranda-editable.md"
  - "docs/21-tata-kelola-privasi-alert.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md"
  - "prisma/schema.prisma"
  - "src/config/institution.ts"
  - "src/contracts/cms.ts"
  - "src/contracts/media.ts"
  - "src/contracts/platform.ts"
depends_on:
  - M4-GPT-PUBLIC-CONTENT-DOMAINS
contracts:
  - src/contracts/home-nav.ts
acceptance_commands:
  - npx vitest run tests/m4/contracts/home-nav-contracts.test.ts
  - npm run lint
  - npm run typecheck
  - npm run test
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-HOME-NAV-CONTRACTS.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: M
status: active
---

# Home and navigation contracts

Freeze strict ADMIN list/detail/command/reorder contracts and exhaustive safe
public snapshot contracts for MenuItem, QuickLink, ExternalLink, HomeSlider,
HomeSection, Statistic, and SiteSetting. Enforce deterministic hierarchy,
configured URL safety, PUBLIC assets, ID-first translations with EN/AR fallback,
singleton settings, governance/version intent, and non-technical result unions.
No schema, domain implementation, transport, seed content, or UI belongs here.
