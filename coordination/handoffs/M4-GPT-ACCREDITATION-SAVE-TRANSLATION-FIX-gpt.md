# Handoff: M4-GPT-ACCREDITATION-SAVE-TRANSLATION-FIX

- task ID: `M4-GPT-ACCREDITATION-SAVE-TRANSLATION-FIX`
- branch: `ai/gpt/m4-public-ia-menu-remap`
- base SHA: `831e02f`
- head SHA: `c31828b`

## Summary

- Fixed the accreditation editor's missing `AdminHomeNav.saving` translation error.
- Reused the existing localized `AdminPageEditor.submitting` key for the pending save state in ID, EN, and AR.
- Added a regression assertion so the form does not call the missing key again.

## API/schema/migration impact

- None. This is a client-side translation lookup change only; the accreditation payload, API route, storage, and database are unchanged.

## Verification

- `npx vitest run tests/m4/ui/accreditation-page.test.tsx tests/m4/runtime/academic-accreditation.test.ts` — passed (8 tests)
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed (124 files, 1426 tests)
- `git diff --check` — passed
- `TASK_MANIFEST=coordination/tasks/M4-GPT-ACCREDITATION-SAVE-TRANSLATION-FIX.md TASK_BASE=831e02f npm run check:scope` — passed

## Untested areas and follow-up

- No browser E2E run was needed; the existing translation resources are static and typecheck plus regression coverage validate the lookup.
