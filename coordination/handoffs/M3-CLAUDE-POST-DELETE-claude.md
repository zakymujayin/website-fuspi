# Handoff — M3-CLAUDE-POST-DELETE

- **Branch:** `ai/claude/m3-post-delete`  •  **Base:** integration `aa564f3`
- **Author:** Claude Sonnet 5 (ADR-0002 stand-in).

## Summary

Adds delete to the Post edit page, completing admin CRUD. Presentation only — submits the frozen
`DELETE` command to `POST /api/admin/posts`; no server/contract/API change.

## Files

- `src/components/ui/alert-dialog.tsx` — added via `npx shadcn@latest add alert-dialog` on the
  already-installed `@base-ui/react`. `button.tsx` overwrite declined; **package.json/lock untouched**.
- `src/components/admin/posts/post-delete-action.tsx` — destructive panel gated on
  `capabilities.delete`, with a confirmation `AlertDialog` (accessible title, per AGENTS.md). Confirm
  submits `{action:"DELETE", payload:{postId, expectedVersion}}` same-origin, reuses the editor's
  failure mapping, navigates to the list on success, keeps the dialog open with an inline error on
  failure (e.g. `VERSION_CONFLICT`).
- `src/app/[locale]/admin/posts/[postId]/edit/page.tsx` — renders the panel, gated on
  `capabilities.delete`.
- `messages/{id,en,ar}.json` — `AdminPostDelete` (error copy identical to the editor).
- `tests/m3/ui/admin-post-delete.test.tsx` — 8 tests.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm test` | 45 files, **689 passed** (681 + 8) |
| `npm run build` | PASS |

### Runtime (real browser + PostgreSQL, single page — per manifest)

- Edit page for an ADMIN-owned DRAFT renders the delete section (`Hapus berita`), **0 page errors**.
- Clicking delete opens an `alertdialog` with the accessible title "Hapus berita ini?".
- Confirming "Ya, hapus" → navigates to `/id/admin/posts`; the DB row is gone (count 0).
- The delete recorded an `ActivityLog` audit event (transport behaviour), confirming the audited
  path ran.

## Out of scope / notes

- Bulk delete, undo/restore, and list-level delete remain out.
- A browser E2E for the confirm→delete flow is a natural DeepSeek follow-up.
- The confirm action is a plain Button (not a base-ui Close) so a failed delete surfaces its error
  inside the open dialog rather than closing silently.

## Requested contract/dependency change

None.
