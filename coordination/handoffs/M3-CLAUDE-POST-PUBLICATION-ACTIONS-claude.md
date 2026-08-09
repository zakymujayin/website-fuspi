# Handoff — M3-CLAUDE-POST-PUBLICATION-ACTIONS

- **Branch:** `ai/claude/m3-post-publication-actions`  •  **Base:** integration `8ce35bd`
- **Author:** Claude Sonnet 5 (ADR-0002 stand-in).

## Summary

Completes the Post lifecycle in the edit page: **publish-now, schedule, return-to-draft, archive**.
Presentation only — submits the existing `PUBLICATION` command to `POST /api/admin/posts`; no server,
contract, or API change.

## Files

- `src/components/admin/posts/post-publication-transitions.ts` — mirrors the frozen
  `ALLOWED_TRANSITIONS` (with a comment pointing at `src/contracts/post.ts`); server stays authority.
- `src/components/admin/posts/post-publication-actions.tsx` — client panel: current-state badge,
  valid actions, a `datetime-local` schedule input (sent as ISO with offset, future-only client-side),
  reuses the editor's failure-code mapping, refreshes on success.
- `src/app/[locale]/admin/posts/[postId]/edit/page.tsx` — renders the panel above the editor form,
  gated on `capabilities.publish`.
- `messages/{id,en,ar}.json` — `AdminPostPublication` (error copy identical to the editor).
- `tests/m3/ui/admin-post-publication-actions.test.tsx` — 12 tests.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm test` | 44 files, **681 passed** (was 669 + 12) |
| `npm run build` | PASS |

Transition test mutation-checked (allowing PUBLISH_NOW from PUBLISHED → 2 tests fail), reverted.

### Runtime (real browser + PostgreSQL, single page — per manifest)

- Edit page for a DRAFT ADMIN post renders the panel (h2 "Status penerbitan"), **0 page errors**.
- **PUBLISH_NOW** via the panel's exact command shape: `{ok:true}`, DB `DRAFT v1 → PUBLISHED v2`,
  `publishedAt` set.
- For the now-PUBLISHED post the panel shows exactly `Kembalikan ke draf | Arsipkan | Jadwalkan` and
  **not** `Terbitkan sekarang` — matching `ALLOWED_TRANSITIONS[PUBLISHED]`.
- **ARCHIVE**: `PUBLISHED v2 → ARCHIVED v3`, `{ok:true}`.

Server-side publication transitions are already covered by
`tests/m3/runtime/post-mutations.integration.test.ts`; this task adds the UI and reuses that path.

## Notes / out of scope

- Delete, autosave, rich text, and the media/category/tag pickers remain separate.
- The create page stays draft-only by design.
- Local full e2e was not run (documented machine memory limit); a browser E2E for this panel is a
  natural DeepSeek follow-up.

## Requested contract/dependency change

None.
