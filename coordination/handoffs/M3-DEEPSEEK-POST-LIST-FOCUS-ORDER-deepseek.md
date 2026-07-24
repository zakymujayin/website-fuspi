# Handoff — M3-DEEPSEEK-POST-LIST-FOCUS-ORDER

- **Task ID:** `M3-DEEPSEEK-POST-LIST-FOCUS-ORDER`
- **Branch:** `ai/deepseek/m3-post-list-focus-order`
- **Base SHA:** `d2958e5`
- **Companion UI branch merged in for verification:** `ai/claude/m3-post-editor-navigation` @ `e1ec7c8`
- **Author:** Claude Sonnet 5, standing in for the DeepSeek QA lane while Codex and DeepSeek are out
  of usage limit (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).

## Summary

Updates the stale keyboard focus-order assertion and adds coverage for the newly wired editor
navigation. **This branch contains the UI change merged in**, because the new tab order only exists
with it — verifying against `integration` alone would have proved nothing.

## Changes to `e2e/m3/admin-post-list-browse.spec.ts`

1. `keyboard focus order …` renamed and rewritten to walk the real sequence:
   skip link → **create action** → first filter. The visible-focus-indicator check is kept **and now
   applied to both** the create action and the first filter, rather than dropped.
2. New `Editor navigation affordances` block (4 cases):
   - ADMIN sees exactly one create action pointing at `/id/admin/posts/new`;
   - every visible row has an edit link matching `/id/admin/posts/<id>/edit`, and **no href contains
     the slug marker** — the editor route is keyed by post id;
   - edit links carry distinct, non-empty per-row `aria-label`s;
   - clicking the create action reaches `/admin/posts/new`, and clicking a row's edit link opens an
     owned post's editor with a visible `h1`.

No assertion was weakened or removed. Nothing asserts on the slug except to prove its absence.

## Note on scope item 3

The manifest suggested proving a row *without* `capabilities.update` renders no edit link, using the
existing ADMIN/EDITOR-A/EDITOR-B fixtures. **Not added, deliberately.** Ownership scoping means an
EDITOR never *sees* another owner's rows at all, and ADMIN can update everything — so with the
current fixtures no session is ever shown a row it cannot update. Asserting it would require either
a new role/permission fixture or an artificial row, which is outside this lease. The capability gate
is already covered at unit level in `tests/m3/ui/admin-post-list.test.tsx` (mutating the gate to
always-true fails 2 tests). Recorded as a follow-up for whoever adds richer permission fixtures.

## Verification

All commands run with `set -a && . ./.env.local && set +a` first.

| Command | Result |
| --- | --- |
| `npm run lint` | PASS — no issues |
| `npx tsc --noEmit` | PASS — no errors |
| `npx playwright test e2e/m3/admin-post-list-browse.spec.ts --project=chromium --project=mobile` | **PASS — 88/88** (was 80 before the 4 new cases; 78 passed / 2 failed immediately before this fix) |
| `npx playwright test e2e/m3/ --project=chromium --project=mobile` | **PASS — 232/232** |
| `git diff --check` | clean |

## Merge instruction

Merging this branch brings the UI change with it. Do **not** merge
`ai/claude/m3-post-editor-navigation` separately — it fails the browser suite on its own, which is
why its own handoff marks it merge-blocked.

## Requested contract/dependency change

None.
