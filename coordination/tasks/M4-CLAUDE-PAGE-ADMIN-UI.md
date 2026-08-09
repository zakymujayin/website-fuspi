---
id: M4-CLAUDE-PAGE-ADMIN-UI
milestone: M4
owner: claude
reviewer: wave-review
tester: claude
base_branch: integration/m4-features
base_sha: 30368e45f9b13c7b33b856eb25a73be36b8ac537
allowed_paths:
  - "src/app/[locale]/admin/layout.tsx"
  - "src/app/[locale]/admin/pages/**"
  - "src/components/admin/pages/**"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m4/ui/page-admin/**"
  - "e2e/m4/page-admin.spec.ts"
  - "coordination/handoffs/M4-CLAUDE-PAGE-ADMIN-UI-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/features/**"
  - "src/lib/**"
  - "src/app/api/**"
  - "src/components/ui/**"
  - "src/app/globals.css"
  - "src/proxy.ts"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/03-design-system.md"
  - "docs/04-panel-admin.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "coordination/milestones/M4-FEATURES-ENTRY.md"
  - "src/contracts/page-admin.ts"
  - "src/contracts/media-admin.ts"
  - "src/app/[locale]/admin/posts/**"
  - "src/components/admin/posts/**"
  - "src/components/admin/media/**"
  - "src/components/ui/**"
  - "src/lib/auth/runtime/request-session.ts"
  - "src/lib/auth/runtime/redirect.ts"
depends_on:
  - M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT
contracts:
  - src/contracts/page-admin.ts
acceptance_commands:
  - "npx vitest run tests/m4/ui/page-admin"
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - "npx playwright test e2e/m4/page-admin.spec.ts"
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-CLAUDE-PAGE-ADMIN-UI.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: medium
token_class: L
status: assigned
---

# M4 Claude Page admin UI

Build the production ADMIN Page CMS in parallel with GPT's runtime. Deliver a Page
list plus create/edit flows under `/[locale]/admin/pages`, using only the frozen
`page-admin` contract and `/api/admin/pages` endpoints. Production UI must not
contain mock content; synthetic objects are allowed only in tests.

Follow the accepted Post admin experience without copying Post-only behavior:
no Page autosave or scheduling. Include bounded filter/search/sort/pagination,
clear loading/empty/unavailable states, ID-required and optional EN/AR editor
tabs, automatic RTL editing for Arabic, neutral slug, parent, order, optional
hero image picker via the existing Media API, publication actions, optimistic
version handling, delete confirmation, accessible field errors, and responsive
keyboard-safe controls. Use installed shadcn primitives and semantic tokens;
do not change global CSS or UI primitives.

The UI may call the frozen HTTP endpoints directly so it can compile before the
parallel backend branch merges. Server-rendered route shells must still enforce
the existing protected-route decision before rendering Page controls. Add a
clear Page entry to the existing admin layout without altering public
navigation. Test ID/EN/AR, RTL, loading/error/empty, payload strictness,
conflict/non-disclosure surfaces, keyboard interaction, and mobile layout.

Commit a complete handoff and push the Claude task branch. Do not edit backend,
contract, schema, dependencies, proxy, global styles, or shared UI primitives.
Review is performed once after the complete Page backend and UI are integrated.
