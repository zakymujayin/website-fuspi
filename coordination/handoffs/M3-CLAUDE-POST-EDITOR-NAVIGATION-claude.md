# Handoff — M3-CLAUDE-POST-EDITOR-NAVIGATION

- **Task ID:** `M3-CLAUDE-POST-EDITOR-NAVIGATION`
- **Branch:** `ai/claude/m3-post-editor-navigation`
- **Base SHA:** `4821d9b`
- **Author:** Claude Sonnet 5, standing in for the Claude lane while Codex and DeepSeek are out of
  usage limit (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).

## Summary

Wires the previously unreachable editor routes into the list UI:

- a "write news" action in the list header → `/admin/posts/new`;
- a per-row "edit" link → `/admin/posts/{id}/edit`, **gated on `capabilities.update`** from the
  frozen `AdminPostSummarySchema`, so a row the actor cannot update offers no edit affordance.

## Files changed

- `src/app/[locale]/admin/posts/page.tsx` — header create action; passes the new labels
- `src/components/admin/posts/post-list.tsx` — `capabilities` on the item type, per-row edit link
- `messages/{id,en,ar}.json` — `createAction`, `edit`, `editLabelFor`
- `tests/m3/ui/admin-post-list.test.tsx` — fixtures updated; read-only assertion re-scoped; 7 new
  navigation tests

## MERGE IS BLOCKED — companion QA task required

`npx playwright test e2e/m3/admin-post-list-browse.spec.ts --project=chromium --project=mobile`
→ **78 passed, 2 failed** (one per project).

The failing case is `keyboard focus order accounts for skip link and reaches the first filter`
(`e2e/m3/admin-post-list-browse.spec.ts:552`). It asserts the tab stop immediately after the skip
link is the first filter link. The header create action now sits between them in DOM order, so the
filter is the **second** stop.

**This is a stale test assumption, not a defect.** A create action in the page header, before the
filter row, is the correct reading and tab order; the test encoded the pre-navigation layout.

Per this task's manifest ("Do not edit `e2e/**` … if it cannot pass, stop and report rather than
editing the QA lane's files") the spec was left untouched. The integrator must land a companion
QA-lane task updating that assertion before merging this branch. Do not merge this alone.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npx vitest run tests/m3/ui/admin-post-list.test.tsx` | PASS — 56/56 |
| `npm test` | PASS — 676 passed, 0 failed |
| `npm run build` | PASS |
| `npx playwright test …admin-post-list-browse…` | **78 passed, 2 failed** — see above |
| `git diff --check` | clean |

### The capability gate is test-enforced

Mutating `{item.capabilities.update ? (` to `{true ? (` — i.e. ignoring the server's decision and
always showing the edit link — fails 2 of 56 tests. Reverted after checking.

TypeScript also forced every test fixture to declare `capabilities`, so a row cannot silently omit
it and fall through to a default.

## Notes

- The edit link is keyed by `postId`, never `slug`; the unit test now asserts the slug is absent from
  `innerHTML` (not just `textContent`), which also protects the E2E slug-disclosure assertion.
- Each edit link carries a per-row `aria-label` (`Sunting berita: {title}`), so 20 rows do not
  present 20 identical "edit" links to assistive technology.
- A stale `.next/standalone/` directory again polluted vitest collection (it made the suite report a
  phantom failing file). Deleted locally. This is the second occurrence; it is a symptom of
  `vitest.config.ts` having no `include` restriction — already recorded as a minor config follow-up.

## Untested areas

- No E2E covers the new links themselves (clicking through to the editor). That belongs with the
  companion QA task or the editor E2E suite that is still outstanding.
- `capabilities.publish` and `capabilities.delete` are returned by the transport but unused; no
  publish/delete affordance exists yet by design.

## Requested contract/dependency change

None.
