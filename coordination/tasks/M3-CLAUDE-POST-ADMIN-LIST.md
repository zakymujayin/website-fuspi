---
id: M3-CLAUDE-POST-ADMIN-LIST
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: a5756f2
allowed_paths:
  - "src/app/[locale]/admin/posts/page.tsx"
  - "src/app/[locale]/admin/posts/loading.tsx"
  - "src/components/admin/posts/**"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-post-list.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-POST-ADMIN-LIST-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/proxy.ts"
  - ".github/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/03-design-system.md"
  - "docs/04-panel-admin.md"
  - "docs/12-multibahasa-rtl.md"
  - "src/contracts/post-admin.ts"
  - "src/lib/content/post-admin-transport.ts"
  - "src/app/[locale]/admin/media/page.tsx"
  - "src/components/admin/media/**"
contracts:
  - src/contracts/post-admin.ts
depends_on:
  - M3-GPT-POST-ADMIN-TRANSPORT-RUNTIME
  - M3-CLAUDE-MEDIA-LIBRARY-BROWSE
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - npm run build
  - git diff --check
risk: medium
token_class: M
status: ready
---

# M3 Claude Post Admin List

Deliver the read-only admin Post list at `/[locale]/admin/posts`, reusing the presentation pattern
frozen by `M3-CLAUDE-MEDIA-LIBRARY-BROWSE`. The Post admin transport contract and runtime are
already merged; this task adds **presentation only** and must not introduce new server behaviour.

## Scope

1. Server Component list page reading through the frozen `post-admin` transport. No new query,
   action, or route handler.
2. Status filter (draft / scheduled / published / archived) mirroring the Media `kind` filter,
   including `aria-current` on the active tab and reset-to-page-1 semantics.
3. Pagination reusing the Media pagination component behaviour, including RTL chevron handling.
4. Per-row display: title, status badge, locale availability (ID/EN/AR), author, and Jakarta-time
   published/updated timestamp.
5. EDITOR sees only their own posts; ADMIN sees all. Ownership scoping is enforced server-side by
   the existing transport — the UI must not widen it.
6. Empty, loading, and unavailable states must be safe and must not use `role="alert"` for the
   ordinary empty case.
7. ID/EN/AR copy with Arabic RTL from the first implementation. Logical direction utilities only.

## Explicitly out of scope

Create/edit forms, rich-text editing, autosave, publish/schedule/archive mutations, delete, and the
media picker. Each needs its own manifest. Do not add mutation affordances that are not wired.

## Constraints

- Server Components by default; Client Components only where interaction demands it.
- No schema, contract, dependency, config, or `src/lib/**` change. Raise a GPT contract task if the
  frozen transport is insufficient rather than widening it here.
- Do not expose author email, session token, storage key, or technical error text.
- Reuse installed shadcn primitives and semantic tokens; no new global CSS.

## Stand-in note

Codex and DeepSeek are out of usage limit (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).
The named reviewer and tester cannot run. Any approval recorded by the stand-in carries the same
independence caveat as the Media Library slice and must be re-verified on their return.
