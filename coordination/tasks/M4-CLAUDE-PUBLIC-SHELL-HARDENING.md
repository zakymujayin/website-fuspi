---
id: M4-CLAUDE-PUBLIC-SHELL-HARDENING
milestone: M4
owner: claude
reviewer: gpt
tester: deepseek
base_branch: integration/m4-features
base_sha: a8f06ffddbcdebfaa84913fd05692b4f06aa3ce0
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
  - "tests/m4/content/**"
  - "tests/m4/tickets/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/05-halaman-publik.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "docs/26-fuspi-public-ia-design-brief.md"
  - "coordination/milestones/M4-FEATURES-ENTRY.md"
  - "src/components/public/nav-items.ts"
  - "src/config/institution.ts"
  - "src/i18n/navigation.ts"
  - "src/i18n/routing.ts"
  - "src/components/ui/container.tsx"
  - "node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md"
  - "node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md"
depends_on:
  - M3-GPT-PROCESS-RECONCILIATION-AND-EXIT
contracts:
  - src/components/public/nav-items.ts
  - src/config/institution.ts
acceptance_commands:
  - "npx vitest run tests/m4/ui/public-shell-hardening.test.tsx src/components/public/nav-items.test.ts"
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - "npx playwright test e2e/m4/public-shell-hardening.spec.ts --project=chromium --project=mobile --workers=1"
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-CLAUDE-PUBLIC-SHELL-HARDENING.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: medium
token_class: L
status: merged
---

# M4 Claude public shell hardening

Harden the accepted public shell as a bounded presentation task. Preserve the
frozen component-local navigation data and all URL/route contracts; a complete
CMS-backed navigation registry is a later GPT contract task.

## Required outcome

1. The three-layer desktop shell and combined mobile drawer remain semantically
   equivalent. The mobile drawer presents language choice before the navigation
   groups and keeps every target at least 44px.
2. Desktop menu, mobile drawer, language switcher, skip link, and footer work by
   keyboard with visible focus, correct focus return, Escape behavior, and
   accessible names. Do not add duplicate `main`, `header`, or footer landmarks.
3. Implement the specified compact/sticky header behavior after scrolling more
   than 100px without layout shift or hydration mismatch. Respect
   `prefers-reduced-motion`.
4. Arabic works RTL from the first render: logical direction utilities only,
   drawer enters from inline-end, directional indicators mirror, and no
   non-directional brand/media asset is mirrored.
5. No horizontal page overflow at 360, 390, 768, 1024, or 1440px. Desktop and
   mobile navigation remain usable at zoom and with long EN/AR labels.
6. External-link semantics are safe and clearly announced without changing,
   inventing, or hard-coding any destination. Do not add SILA until a configured
   URL contract is authorized.
7. Add deterministic component and Playwright/axe coverage for ID/EN/AR,
   keyboard, focus, reduced motion, scroll state, RTL, landmarks, and viewports.

Use installed primitives and tokens. Do not change global CSS, shadcn
primitives, navigation data, schema, contracts, dependencies, routes, or backend
logic. Commit the required handoff and stop.
