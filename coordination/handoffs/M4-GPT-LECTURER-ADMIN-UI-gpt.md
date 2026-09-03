# Handoff — M4-GPT-LECTURER-ADMIN-UI — gpt

- Branch: `ai/gpt/m4-public-ia-menu-remap`
- Base SHA: `9c810960612f143e6a3c3ed4f50de2140ae568e`
- Head SHA: `eddb922`

## Result

Added an ADMIN lecturer directory and editor UI under `/[locale]/admin/dosen`.
Administrators can search/filter lecturers, add a lecturer, edit profile and
study-program assignment, toggle public visibility, and delete with an
accessible confirmation dialog. The UI is localized for ID/EN/AR and applies
RTL to the Arabic profile editor.

## Files changed

- `src/app/[locale]/admin/dosen/page.tsx`
- `src/app/[locale]/admin/dosen/baru/page.tsx`
- `src/app/[locale]/admin/dosen/[id]/edit/page.tsx`
- `src/components/admin/lecturer/lecturer-types.ts`
- `src/components/admin/lecturer/lecturer-list.tsx`
- `src/components/admin/lecturer/lecturer-editor-form.tsx`
- `src/components/admin/lecturer/lecturer-delete-action.tsx`
- `src/components/admin/admin-sidebar-data.ts`
- `tests/m4/ui/taxonomy-admin-form.test.tsx` (updated stale sidebar invariant)

## Contract/schema/migration impact

No schema, migration, dependency, auth, route-handler, or shared contract
changes. Uses the existing `LECTURER` contract and
`/api/admin/academic/people` CREATE/UPDATE/DELETE endpoint. Prodi options are
restricted to the three codes from `src/config/institution.ts`.

## Verification

| Command | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass; one pre-existing warning remains in `src/components/public/academic-topic-shell.tsx` |
| `npm test` | pass; 126 files, 1430 tests |
| `npm run build` | pass; all lecturer admin routes compiled |
| `git diff --check` | pass |

## Untested areas

- Browser-level authenticated interaction with a live database was not run.
- Media replacement remains delegated to the existing Media Library/import
  workflow; this UI preserves the current photo reference.

## Risks and follow-ups

- Existing lecturer update domain behavior does not use a version field, so the
  form intentionally sends `expectedVersion: null` as required by the frozen
  contract.
- Delete is correctly rejected by the backend when the lecturer is still used
  by research, community service, or posts; the UI surfaces that safe failure.

## Requested shared changes

None.
