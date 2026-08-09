# Handoff — M3-CLAUDE-POST-AUTOSAVE

- **Branch:** `ai/claude/m3-post-autosave`  •  **Base:** integration `ad0c093`
- **Author:** Claude Sonnet 5 (ADR-0002 stand-in). **Highest-risk stateful task — re-review by Codex.**

## Summary

Adds 30-second draft autosave to the Post editor (edit mode) using the frozen `AUTOSAVE` transport
command. Presentation only — no schema/contract/dependency change.

## The correctness problem and how it is solved

The editor form, publication actions, and delete each received `expectedVersion` independently from
the server page. Autosave bumps the version, which would make the other actions stale and fail with
`VERSION_CONFLICT` after any autosave.

**Fix:** a new client `PostEditorShell` owns a single `version` state (seeded from the view) and
passes it to all three surfaces. Autosave reports its bump up via `onVersionChange`; publication and
delete refresh the server, and the shell adopts the newer `initialVersion` via an effect. One shared
version, one source of truth.

## Files

- `src/components/admin/posts/post-editor-shell.tsx` — **new**; owns the shared `version`.
- `src/components/admin/posts/post-editor-form.tsx` — autosave loop: a `ADMIN_POST_AUTOSAVE_INTERVAL_MS`
  interval that, when the draft is dirty (snapshot mismatch) and no manual submit is in flight, POSTs
  the `AUTOSAVE` command, reports the new version, and shows an `aria-live` status
  (saving/saved-at-time/conflict/error). Latest draft/version read through a ref so the timer is not
  rebuilt per keystroke. A `VERSION_CONFLICT` stops autosaving (stale local version).
- `src/components/admin/posts/post-editor-payload.ts` — `buildAutosavePayload` (mutable fields +
  `AUTOSAVE_DRAFT` intent; carried fields preserved exactly like UPDATE).
- `src/app/[locale]/admin/posts/[postId]/edit/page.tsx` — renders `<PostEditorShell>` instead of the
  three components directly.
- `messages/{id,en,ar}.json` — `AdminPostEditor.autosave.*`.
- `tests/m3/ui/admin-post-autosave.test.tsx` — payload + shared-version wiring (10 tests).

## Verification

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` / `eslint` | exit 0 |
| `npm test` | **738 passed** |
| `npm run build` | Compiled successfully |

### Runtime (real browser + PostgreSQL) — the load-bearing check

Fixture: BERITA DRAFT `as-post`, version 1, owned by an ADMIN. Edited the ID content, **waited for the
real 30s timer**:

1. Autosave fired → status "Tersimpan otomatis 04:18 PM"; DB `version` 1 → **2**, content persisted.
2. Edited again and clicked **Simpan perubahan** (manual save) → navigated to the list with **no
   VERSION_CONFLICT**; DB `version` 2 → **3**, content = final value.
3. 0 page errors throughout.

Step 2 is the proof of the shared-version design: the manual save locked against version 2 (the
autosave bump), not the stale load version 1. Without the shell it would have used version 1 and
conflicted. Fixture removed afterward (Post, translation, session, revisions).

## Untested areas / risks

- The 30s cadence is verified once against the live timer; unit tests assert wiring, not timing.
- Autosave silently skips an invalid draft (e.g. empty required ID title) — by design; the manual save
  surfaces the field errors. Not separately browser-tested.
- Concurrent edit from a second tab → `VERSION_CONFLICT` path shows the reload message; exercised only
  by the failure-mapping unit test, not a live two-tab run.

## Requested contract/dependency change

None.
