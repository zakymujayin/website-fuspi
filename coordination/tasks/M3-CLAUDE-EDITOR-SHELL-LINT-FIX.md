---
id: M3-CLAUDE-EDITOR-SHELL-LINT-FIX
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek
base_sha: e4d5b5c
allowed_paths:
  - "src/components/admin/posts/post-editor-shell.tsx"
  # Source-coupled: this test greps the shell source for the version-adoption code, so it changes
  # with the shell. Extended in-task rather than deferred to keep `npm test` green.
  - "tests/m3/ui/admin-post-autosave.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-EDITOR-SHELL-LINT-FIX-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "prisma/**"
  - "src/contracts/**"
  - "src/lib/**"
  - "src/app/api/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "src/components/admin/posts/post-editor-form.tsx"
acceptance_commands:
  - npx tsc --noEmit
  - npm run lint
  - npx playwright test e2e/m3/admin-post-editor.spec.ts --project=chromium --workers=1
risk: medium
token_class: S
status: ready
---

# M3 Claude editor-shell lint fix

Clear the carried lint failure: `react-hooks/set-state-in-effect` in `post-editor-shell.tsx`. The
shell adopts a newer server `version` after a `router.refresh()` via
`useEffect(() => { setVersion(initialVersion); }, [initialVersion])`, which the rule flags and which
fails `npm run lint` (exit 1), blocking CI and the M3 exit gate.

## Fix (behavior-preserving)

Replace the effect with the React-sanctioned "adjust state during render when a prop changes"
pattern, so no `useEffect` sets state:

```tsx
const [version, setVersion] = useState(initialVersion);
const [prevInitial, setPrevInitial] = useState(initialVersion);
if (initialVersion !== prevInitial) {
  setPrevInitial(initialVersion);
  setVersion(initialVersion);
}
```

Behavior must stay identical: the shell adopts the server version when `initialVersion` advances
(publication/delete refresh) but keeps an autosave-advanced local version between refreshes.

## Verification

- `npx tsc --noEmit` — 0 errors.
- `npm run lint` — exit 0 (the `set-state-in-effect` error gone).
- Re-run the autosave browser proof to confirm the shared version still works: autosave 1→2 over the
  30s interval, then a manual save 2→3 with no `VERSION_CONFLICT`. Run at
  `PLAYWRIGHT_BASE_URL=http://localhost:3004` (Origin must match `AUTH_URL`).

## Stand-in note

Authored by the Claude stand-in during the 2026-07-23…07-29 window (ADR-0002). Codex must re-review
on return.
