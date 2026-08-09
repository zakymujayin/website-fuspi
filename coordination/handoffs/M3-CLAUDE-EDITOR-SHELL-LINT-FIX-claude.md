# Handoff — M3-CLAUDE-EDITOR-SHELL-LINT-FIX

- **Task:** M3-CLAUDE-EDITOR-SHELL-LINT-FIX (clear the CI-blocking `set-state-in-effect` lint error)
- **Branch:** `ai/claude/m3-editor-shell-lint-fix`
- **Base SHA:** `3b8c58a` (integration with the task manifest)
- **Head SHA:** `32d81c8`
- **Author:** Claude, standing in for the Claude/UI lane during the 2026-07-23…07-29 window (ADR-0002).

## Summary

`npm run lint` was failing (exit 1) on `react-hooks/set-state-in-effect` in
`src/components/admin/posts/post-editor-shell.tsx` — a pre-existing error from the autosave merge
(`656480a`), surfaced while gating the feature #4 E2E merge. The shell adopted a newer server
`version` after a `router.refresh()` via `useEffect(() => { setVersion(initialVersion); },
[initialVersion])`, which the rule forbids.

Replaced it with the React-sanctioned "adjust state during render when a prop changes" pattern:

```tsx
const [version, setVersion] = useState(initialVersion);
const [prevInitialVersion, setPrevInitialVersion] = useState(initialVersion);
if (initialVersion !== prevInitialVersion) {
  setPrevInitialVersion(initialVersion);
  setVersion(initialVersion);
}
```

No behavior change: the shell still adopts the server version when `initialVersion` advances
(publication/delete refresh) and keeps an autosave-advanced local version between refreshes. One file
changed, `-4/+8` lines (the `useEffect` import is also dropped).

## Results

- `npx tsc --noEmit` — **0 errors**.
- `npm run lint` — **exit 0** (the `set-state-in-effect` error is gone; the whole project lints clean).
- `npx playwright test e2e/m3/admin-post-editor.spec.ts --project=chromium --workers=1` against the
  **fixed** shell (Claude worktree dev server, QA DB, `AUTH_URL=localhost:3004`) — **15/15 passed**
  (1.0m), including the autosave shared-version proof: autosave 1→2 over the real 30s interval, then
  a manual save 2→3 with **no `VERSION_CONFLICT`**. This is the load-bearing regression check that the
  render-time version adoption still shares one version across autosave, manual save, publication, and
  delete.

## Coupled test change (same task)

The unit test that source-asserts the shell wiring
(`tests/m3/ui/admin-post-autosave.test.tsx`) checked for `}, [initialVersion]);` — the removed
effect's closing line. Because that assertion reads the shell source directly, it is inseparable from
this change, so it was updated in the same task: the "adopts a newer server version" case now asserts
`initialVersion !== prevInitialVersion` (the render-time adoption) instead of the effect. The task's
`allowed_paths` was extended to include this test file for that reason. `setVersion(initialVersion)`
and `useState(initialVersion)` are unchanged and still asserted.

- `npx vitest run tests/m3/ui/admin-post-autosave.test.tsx` — **10/10**.
- `npm test` (full suite) — **49 files, 738/738 passed**.

## Untested areas / risks / follow-ups

- `npm run build` was not re-run here (this is a client-component internal edit that cannot change the
  build graph, and running build + test together OOMs this machine); the carried Turbopack build
  warning is unaffected and still owned by GPT.
- **Independence.** Authored/self-reviewed by the stand-in; Codex must re-review on return.

## Contract / dependency changes

None. Single client-component internal change; no props, schema, API, or dependency change.
