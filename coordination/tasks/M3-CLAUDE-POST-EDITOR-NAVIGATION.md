---
id: M3-CLAUDE-POST-EDITOR-NAVIGATION
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: 6fd9050
allowed_paths:
  - "src/app/[locale]/admin/posts/page.tsx"
  - "src/components/admin/posts/post-list.tsx"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/admin-post-list.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-POST-EDITOR-NAVIGATION-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/api/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "src/contracts/post-admin.ts"
  - "src/app/[locale]/admin/posts/new/page.tsx"
  - "src/app/[locale]/admin/posts/[postId]/edit/page.tsx"
  - "e2e/m3/admin-post-list-browse.spec.ts"
contracts:
  - src/contracts/post-admin.ts
depends_on:
  - M3-CLAUDE-POST-EDITOR-BASIC
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - npm test
  - npm run build
  - "npx playwright test e2e/m3/admin-post-list-browse.spec.ts --project=chromium --project=mobile"
  - git diff --check
risk: low
token_class: S
status: ready
---

# M3 Claude Post editor navigation

`M3-CLAUDE-POST-EDITOR-BASIC` shipped `/admin/posts/new` and `/admin/posts/[postId]/edit`, but the
list page was outside that lease so **neither route is reachable from the UI**. This task wires them.

## Scope

1. A "write news" action in the list page header linking to `/admin/posts/new`.
2. A per-row "edit" link to `/admin/posts/{id}/edit`.
3. **Gate the edit link on `capabilities.update`** from the frozen `AdminPostSummarySchema`. The
   transport already returns per-item capabilities; an editor who cannot update a row must not be
   offered an edit affordance. Do not widen what the server allows — this is presentation of an
   existing decision.
4. Translated labels in ID/EN/AR, with accessible names that distinguish rows (an "edit" link
   repeated 20 times needs a per-row accessible name).
5. Update the list unit test: it currently asserts the list renders *no* mutation affordance. That
   intent changes — a navigation link is now expected, while still no `button`/`form` (the list
   itself performs no mutation).

## Out of scope

Delete, publish, archive, duplicate, or any affordance that mutates from the list. Bulk actions.
Changing the editor routes themselves.

## Constraints

- Use `Link` from `@/i18n/navigation` so the active locale is preserved.
- Keep the 40px control-height contract; logical direction utilities only.
- Do not put the post `slug` into the DOM — `e2e/m3/admin-post-list-browse.spec.ts` asserts the slug
  never appears, and the edit route is keyed by `postId`. Keep it that way.
- Do not edit `e2e/**`. The existing browser suite must keep passing unchanged; if it cannot, stop
  and report rather than editing the QA lane's files.

## Stand-in note

Codex and DeepSeek are out of usage limit
(`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`); the standing independence caveat
applies.
