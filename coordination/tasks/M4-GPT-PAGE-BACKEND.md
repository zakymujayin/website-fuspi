---
id: M4-GPT-PAGE-BACKEND
milestone: M4
owner: gpt
reviewer: wave-review
tester: gpt
base_branch: integration/m4-features
base_sha: 30368e45f9b13c7b33b856eb25a73be36b8ac537
allowed_paths:
  - "src/features/content/pages/admin-transport.ts"
  - "src/app/api/admin/pages/route.ts"
  - "src/app/api/admin/pages/[pageId]/route.ts"
  - "tests/m4/runtime/page-admin-transport.test.ts"
  - "tests/m4/runtime/page-admin-transport.integration.test.ts"
  - "tests/security/admin-page-transport-adversarial.integration.test.ts"
  - "coordination/handoffs/M4-GPT-PAGE-BACKEND-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/components/**"
  - "src/app/[locale]/**"
  - "src/proxy.ts"
  - "messages/**"
  - "e2e/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/04-panel-admin.md"
  - "docs/06-autentikasi-role.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md"
  - "coordination/milestones/M4-FEATURES-ENTRY.md"
  - "src/contracts/page-admin.ts"
  - "src/contracts/media.ts"
  - "src/features/content/pages/contract.ts"
  - "src/features/content/pages/queries.ts"
  - "src/features/content/pages/mutations.ts"
  - "src/lib/auth/runtime/**"
  - "src/lib/content/post-admin-transport.ts"
  - "src/app/api/admin/posts/**"
  - "src/lib/db/**"
depends_on:
  - M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT
contracts:
  - src/contracts/page-admin.ts
  - src/features/content/pages/contract.ts
acceptance_commands:
  - npx vitest run tests/m4/runtime/page-admin-transport.test.ts
  - "RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/m4/runtime/page-admin-transport.integration.test.ts tests/security/admin-page-transport-adversarial.integration.test.ts"
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PAGE-BACKEND.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: L
status: active
---

# M4 GPT Page backend

Deliver the production ADMIN-only Page transport/runtime boundary needed by the
parallel Claude UI. Implement `GET/POST /api/admin/pages` and
`GET /api/admin/pages/[pageId]` following the accepted Post reference slice and
the frozen Page admin contract.

Required behavior: active ADMIN database session only; reject expired,
inactive, non-ADMIN, and `mustChangePassword` sessions before Page access;
strict duplicate-aware query normalization; same-origin CSRF before reading a
bounded JSON mutation body; safe list/editor output including PUBLIC hero view;
CREATE/UPDATE/PUBLICATION/DELETE delegation; deterministic HTTP status; explicit
`Cache-Control: no-store`; success-only ID/EN/AR admin/public revalidation; and
generic unexpected failures without technical or private data.

Prove session/role/password-change rejection, existing-versus-missing
non-disclosure, hostile query/body rejection before database mutation, every
command and failure mapping, safe hero projection, optimistic conflict,
transaction behavior, no-store, and no revalidation on failure. Do not change
the frozen contracts/domain, schema, dependencies, UI, messages, or public
routes. Commit the handoff and push the GPT task branch. Backend and UI are
reviewed together after the complete Page implementation is integrated.
