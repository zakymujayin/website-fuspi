# Handoff: M4-GPT-LECTURER-UI-FIDELITY

- Task ID: `M4-GPT-LECTURER-UI-FIDELITY`
- Branch: `ai/gpt/m4-public-ia-menu-remap`
- Base SHA: `3ee798ea61de953521239434fc8311a66b71fe58`
- Implementation head SHA: `2056eec6548406c51fa07a7e4150e55f7093c57e`

## Summary

- Restored a compact five-column desktop lecturer directory with fixed column proportions and a separate mobile card presentation.
- Added a single tabbed lecturer editing workspace so profile, education/publications, and HKI/teaching sections no longer form one long stacked page.
- Kept all existing profile and academic-record managers mounted behind accessible `tab`/`tabpanel` controls.
- Removed duplicate back navigation and excess section separators from the editor sections.

## Files changed

- `src/components/admin/lecturer/lecturer-admin-workspace.tsx`
- `src/components/admin/lecturer/lecturer-editor-form.tsx`
- `src/components/admin/lecturer/lecturer-relations-manager.tsx`
- `src/components/admin/lecturer/lecturer-academic-records-manager.tsx`
- `src/components/admin/lecturer/lecturer-list.tsx`
- `src/app/[locale]/admin/dosen/[id]/edit/page.tsx`
- `tests/m4/ui/admin-lecturer-ui-fidelity.test.tsx`

## API/schema/migration impact

None. This task changes presentation and composition only.

## Verification

- `npx vitest run tests/m4/ui/admin-lecturer-ui-fidelity.test.tsx tests/m4/ui/admin-lecturer-profile-editor.test.tsx` — passed, 2 files / 6 tests.
- `npm run lint` — passed with one pre-existing warning in `src/components/public/academic-topic-shell.tsx` (`tAcademic` unused).
- `npm run typecheck` — passed.
- `npm test` — passed, 133 files / 1,450 tests.
- `git diff --check` — passed.

## Untested areas, risks, and follow-ups

- No browser screenshot or Playwright visual assertion was added; visual fidelity was implemented against the supplied admin directory reference.
- The three tab panels are server-loaded and client-hidden when inactive; their existing forms/actions remain unchanged.
- The existing lint warning in `academic-topic-shell.tsx` remains outside this task scope.

## Requested contract/dependency changes

None.
