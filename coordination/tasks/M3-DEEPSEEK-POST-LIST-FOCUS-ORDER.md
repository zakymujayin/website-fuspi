---
id: M3-DEEPSEEK-POST-LIST-FOCUS-ORDER
milestone: M3
owner: deepseek
reviewer: gpt
tester: deepseek
base_sha: 4821d9b
allowed_paths:
  - "e2e/m3/admin-post-list-browse.spec.ts"
  - "coordination/handoffs/M3-DEEPSEEK-POST-LIST-FOCUS-ORDER-deepseek.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
readonly_paths:
  - "AGENTS.md"
  - "src/app/[locale]/admin/posts/page.tsx"
  - "src/components/admin/posts/post-list.tsx"
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - "npx playwright test e2e/m3/admin-post-list-browse.spec.ts --project=chromium --project=mobile"
  - git diff --check
risk: low
token_class: S
status: ready
---

# M3 Post list focus-order assertion update

Companion to `M3-CLAUDE-POST-EDITOR-NAVIGATION` (`ai/claude/m3-post-editor-navigation` @ `e1ec7c8`).
**Neither branch may merge alone** — the UI change and this assertion must land together.

## Why

That task adds a "write news" action to the list page header. The header precedes the filter row in
DOM order, so the tab sequence is now:

```
skip link → create action → first filter → …
```

`e2e/m3/admin-post-list-browse.spec.ts:552`
(`keyboard focus order accounts for skip link and reaches the first filter`) asserts the first filter
is focused immediately after the skip link. It now fails once per project — 78 passed, 2 failed.

**The UI is correct and the assertion is stale.** A create action in the page header, ahead of
filters, is the right reading and tab order. Do not ask the UI lane to move the control to satisfy
the test.

## Required work

1. Update that test to walk the real order: skip link, then the create action, then the first filter.
   Assert the create action is reached and is a link to the new-post route, then continue to the
   filter as before.
2. Keep the existing visible-focus-indicator check on whichever control it lands on; do not drop it.
3. Add coverage that the per-row edit link exists and points at `/admin/posts/{id}/edit`, and that a
   row without `capabilities.update` renders no edit link. Fixtures already contain both an ADMIN
   (sees all) and EDITOR-A/EDITOR-B split, so a non-updatable row is reachable without new fixtures —
   confirm before adding any.
4. Do not weaken any assertion, and do not assert on the post `slug`; the slug must stay absent from
   the DOM.

## Verification

`npx playwright test e2e/m3/admin-post-list-browse.spec.ts --project=chromium --project=mobile` must
pass with zero failures **against the Claude branch merged in**, not against `integration` alone —
the UI change is what makes the new order real. Coordinate with the integrator for a combined run.

## Stand-in note

Codex and DeepSeek are out of usage limit
(`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`); the standing independence caveat
applies.
