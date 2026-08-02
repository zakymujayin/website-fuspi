---
id: M4-GPT-CLAUDE-PUBLIC-SHELL-INTEGRATION
milestone: M4
owner: gpt
reviewer: gpt
tester: gpt
base_branch: integration/m4-features
base_sha: 184c64c9ad5eac262de9417edcdc447eab82b824
allowed_paths:
  - "src/app/[locale]/(public)/layout.tsx"
  - "src/components/public/site-header.tsx"
  - "src/components/public/site-footer.tsx"
  - "src/components/public/desktop-nav.tsx"
  - "src/components/public/mobile-nav.tsx"
  - "src/components/public/language-switcher.tsx"
  - "src/components/public/brand-mark.tsx"
  - "src/components/public/skip-link.tsx"
  - "src/components/public/shell/**"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m4/ui/public-shell-hardening.test.tsx"
  - "e2e/m4/public-shell-hardening.spec.ts"
  - "coordination/handoffs/M4-CLAUDE-PUBLIC-SHELL-HARDENING-claude.md"
  - "coordination/tasks/M4-CLAUDE-PUBLIC-SHELL-HARDENING.md"
  - "coordination/tasks/M4-GPT-CLAUDE-PUBLIC-SHELL-INTEGRATION.md"
  - "coordination/reviews/M4-CLAUDE-PUBLIC-SHELL-HARDENING-gpt.md"
  - "coordination/handoffs/M4-GPT-CLAUDE-PUBLIC-SHELL-INTEGRATION-gpt.md"
  - "coordination/milestones/M4-FEATURES-ENTRY.md"
  - "coordination/ownership.yml"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/config/**"
  - "src/lib/**"
  - "src/proxy.ts"
  - "src/app/globals.css"
  - "src/components/ui/**"
  - "src/components/public/nav-items.ts"
  - "src/components/public/nav-items.test.ts"
  - "src/app/api/**"
  - "src/app/[locale]/admin/**"
  - "src/features/content/pages/**"
  - "tests/m4/content/pages/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/README.md"
  - "docs/05-halaman-publik.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "src/components/public/nav-items.ts"
  - "src/config/institution.ts"
  - "src/i18n/navigation.ts"
  - "src/i18n/routing.ts"
depends_on:
  - M4-GPT-PPKS-QUERY-ISOLATION
  - M4-CLAUDE-PUBLIC-SHELL-HARDENING
contracts:
  - src/components/public/nav-items.ts
  - src/config/institution.ts
acceptance_commands:
  - "test \"$(git rev-parse origin/ai/claude/m4-public-shell-hardening)\" = 6944dee5a3d7944481bb6895b89612c90a4e08c3"
  - "npx vitest run tests/m4/ui/public-shell-hardening.test.tsx src/components/public/nav-items.test.ts"
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npx prisma validate
  - npm run build
  - "npx playwright test e2e/m4/public-shell-hardening.spec.ts --project=chromium --project=mobile --workers=1"
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-CLAUDE-PUBLIC-SHELL-INTEGRATION.md TASK_BASE=184c64c9ad5eac262de9417edcdc447eab82b824 npm run check:scope"
risk: medium
token_class: M
status: active
---

# M4 Claude public-shell integration

Record the independent GPT verdict for Claude's reviewed public-shell head,
transfer its lease to the serial merge queue, integrate it into
`integration/m4-features`, run post-merge acceptance, publish durable evidence,
and release the lease. This task must not merge M4 to `main` or modify the
concurrent DeepSeek Page-domain lease.

