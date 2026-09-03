# Handoff: M4-GPT-FILE-INPUT-ALIGNMENT

- task ID: `M4-GPT-FILE-INPUT-ALIGNMENT`
- branch: `ai/gpt/m4-public-ia-menu-remap`
- base SHA: `04e1102`
- head SHA: `202759b`

## Summary

- Normalized visible native file-picker buttons to a consistent 32px height.
- Added matching inline-flex alignment, box sizing, line height, padding, radius, cursor, and royal-blue hover treatment.
- Covered public PPKS/booking inputs, admin media inputs, certificate upload, and lecturer import.
- Kept the portal upload input visually hidden because it already uses an accessible custom button.

## API/schema/migration impact

- None. This is presentation-only; file names, accept rules, upload handlers, and storage boundaries are unchanged.

## Verification

- `npx vitest run tests/m4/ui/file-input-alignment.test.ts tests/m4/ui/public-forms-media-redesign.test.tsx` — passed (5 tests)
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed (125 files, 1428 tests)
- `git diff --check` — passed
- `TASK_MANIFEST=coordination/tasks/M4-GPT-FILE-INPUT-ALIGNMENT.md TASK_BASE=04e1102 npm run check:scope` — passed

## Untested areas and follow-up

- No browser screenshot or authenticated upload smoke test was run. Native browser/OS file-input rendering may still differ slightly, while the project-side button geometry is now consistent.
