---
id: M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT
milestone: M4
owner: gpt
reviewer: deepseek
tester: claude
base_branch: integration/m4-features
base_sha: bb55b642d643d0d0ecd8b3e29b012218e773ae34
allowed_paths:
  - "src/contracts/page-admin.ts"
  - "tests/m4/contracts/page-admin-transport-contract.test.ts"
  - "coordination/handoffs/M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/**"
  - "src/components/**"
  - "src/config/**"
  - "src/features/**"
  - "src/lib/**"
  - "src/proxy.ts"
  - "messages/**"
  - "e2e/**"
  - "tests/m4/content/pages/**"
  - "coordination/ownership.yml"
  - "coordination/tasks/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/04-panel-admin.md"
  - "docs/06-autentikasi-role.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/milestones/M4-FEATURES-ENTRY.md"
  - "coordination/tasks/M4-DEEPSEEK-PAGE-DOMAIN-CRUD.md"
  - "coordination/handoffs/M4-DEEPSEEK-PAGE-DOMAIN-CRUD-deepseek.md"
  - "coordination/tasks/M3-GPT-POST-MEDIA-ADMIN-TRANSPORT-CONTRACT.md"
  - "src/contracts/auth.ts"
  - "src/contracts/media.ts"
  - "src/contracts/platform.ts"
  - "src/contracts/post-admin.ts"
  - "src/features/content/pages/contract.ts"
  - "src/features/content/pages/mutations.ts"
  - "src/features/content/pages/queries.ts"
  - "prisma/schema.prisma"
depends_on:
  - M4-DEEPSEEK-PAGE-DOMAIN-CRUD
  - M4-GPT-DEEPSEEK-PAGE-DOMAIN-INTEGRATION
contracts:
  - src/contracts/auth.ts
  - src/contracts/media.ts
  - src/contracts/platform.ts
  - src/features/content/pages/contract.ts
acceptance_commands:
  - npx vitest run tests/m4/contracts/page-admin-transport-contract.test.ts
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run prisma:validate
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT.md TASK_BASE=origin/integration/m4-features npm run check:scope"
risk: high
token_class: M
status: review
---

# M4 GPT Page admin transport contract

Freeze the server/client boundary for the ADMIN-only Page CMS before any Page
Route Handler, Server Action, admin UI, public Page renderer, or browser test is
opened. This is a contract-only task. The accepted Page domain contract and
runtime are frozen and must not be modified.

## Boundary principles

1. Page administration is ADMIN-only. Actor identity, role, ownership, session
   expiry, password-change state, and capabilities are server-derived and must
   never be accepted from URL, query, or command payloads.
2. Compose the accepted feature-local Page schemas without forking their field
   limits, locale rules, publication transitions, optimistic version, or
   hierarchy semantics.
3. Every schema is strict, bounded, JSON-safe, and fails closed. Outbound dates
   are offset-aware ISO strings; never expose Prisma objects or raw `Date`.
4. Public responses must not contain user/content-owner IDs, session data,
   storage keys, checksums, filesystem paths, revision snapshots, raw technical
   errors, or private Media fields.

## Required contract

Create `src/contracts/page-admin.ts` and focused tests covering:

1. A canonical list query and raw search-parameter schema for `page`,
   `pageSize`, status, bounded search, and the accepted Page sort allowlist.
   Repeated/array values, unknown keys, arbitrary selectors, ownership scope,
   and hostile values fail closed rather than being collapsed.
2. A safe bounded list result based on the accepted Indonesian-title Page
   summary. If capabilities are exposed, they are output-only, strict, and
   server-derived.
3. A safe editor bootstrap/detail view containing the multilingual mutable Page
   state, status/version/timestamps, and an optional safe PUBLIC hero Media
   view. A hero ID and hero view must be coherent. No private storage metadata.
4. Strict command envelopes for CREATE, UPDATE, PUBLICATION, and optimistic
   DELETE. Do not add autosave, schedule, arbitrary status assignment, force
   delete, client actor/role/capability, or a second Page domain vocabulary.
5. A JSON-safe mutation response adapter from `PageMutationResultSchema`.
   Preserve stable validation, not-found, version-conflict, invalid-state,
   slug-conflict, hierarchy-cycle, invalid-parent, and invalid-media outcomes;
   normalize auth/CSRF/request/internal failures without exposing technical
   detail.

## Adversarial evidence

Tests must prove rejection of unknown keys; actor/role/owner/scope/capability
injection; arbitrary selectors/sorts; repeated query values; oversized or
control-character search; invalid translation/locale shapes; direct status
assignment; delete without optimistic version; malformed timestamps; unsafe
hero views; and technical/private fields in output. Positive ID/EN/AR Page
shapes and every command must pass.

## Out of scope and handoff

Do not implement transport runtime, CSRF/body parsing, routes, revalidation,
admin components, messages, public Page routes, schema, dependency, or config
changes. Run every acceptance command, create the required handoff with exact
base/head SHAs and command results, commit and push branch
`ai/gpt/m4-page-admin-transport-contract`, then stop for independent review.
