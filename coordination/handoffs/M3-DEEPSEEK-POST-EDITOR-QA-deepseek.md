# Handoff — M3-DEEPSEEK-POST-EDITOR-QA

- **Branch:** `ai/deepseek/m3-post-editor-qa`  •  **Base:** integration `8f65473`
- **Author:** Claude Sonnet 5 (ADR-0002 stand-in for the DeepSeek QA lane).

## Summary

Added `e2e/m3/admin-post-editor.spec.ts`: PostgreSQL-backed browser QA of the first mutation UI.
**APPROVE** after the three product defects this QA exposed were fixed and merged (see the review).

## Files changed

- `e2e/m3/admin-post-editor.spec.ts` — 8 cases × chromium + mobile
- `coordination/reviews/M3-CLAUDE-POST-EDITOR-BASIC-deepseek.md`
- `coordination/handoffs/M3-DEEPSEEK-POST-EDITOR-QA-deepseek.md`

## Defects this QA forced (all fixed, all merged)

| # | Lane | Defect | Fix task |
|---|------|--------|----------|
| 1 | Claude | editor pages crash on load (functions across the RSC boundary) | `M3-CLAUDE-POST-EDITOR-RSC-FIX` |
| 2 | Claude | successful save does not navigate (unprefixed router path) | `M3-CLAUDE-POST-EDITOR-NAV-FIX` |
| 3 | GPT | `getAdminPostEditor` NOT_FOUND for any cover-bearing post | `M3-GPT-EDITOR-COVER-VIEW-FIX` |

None of these was caught by unit tests or by the editor's original API-only verification; all three
needed a browser driving the real form.

## Verification (raw)

```text
chromium                          → 8 passed (28.0s)
chromium + mobile (mandated)      → 16 passed (35.0s)
npx tsc --noEmit                  → no errors
npm run lint                      → no issues
```

Database verified clean (0 posts/media/users under the marker, 0 advisory locks) after the run.

## Fixture and isolation

- Isolated `test/qa/e2e/audit` database enforced; per-project markers (`…-${project}-${Date.now()}`).
- Shared advisory lock `883112045` with the other M3 browser suites; `beforeAll` raises the hook
  timeout to 300s to wait for the other project; `afterAll` releases the lock after FK-safe cleanup.

## Untested / follow-ups

- `SAVE_DRAFT`-only editor, so no publish/schedule/archive/autosave UI to test yet.
- Stored-XSS end-to-end via the form is not reachable (drafts aren't public); covered at other
  layers per the review.
