# HANDOFF — M4-GPT-PRODI-CMS-ADMIN-NAV

- task ID: M4-GPT-PRODI-CMS-ADMIN-NAV
- branch: `ai/gpt/m4-public-ia-menu-remap`
- base SHA: `83ea28e9058624cd93258e2702db5b137e54192a`
- implementation commit: `453c5ee`
- handoff commit: pending

## Summary

- Added an ADMIN-only Program Studi CMS list at `/[locale]/admin/program-studi`.
- Added an ADMIN-only editor at `/[locale]/admin/program-studi/[id]/edit` for official accreditation, validity date, contact, and ID/EN/AR programme narrative fields.
- Kept code, slug, degree (`S1`), and programme order read-only and constrained to the three FUSPI contract programmes.
- Submits through the existing validated `/api/admin/academic/people` transport, preserving sanitization, optimistic versioning, revision history, and audit logging.
- Corrected academic mutation revalidation to refresh the actual `/prodi/[slug]` public route and the new admin list.
- Reduced the public vision type scale and centered degree/accreditation/validity facts.
- Added a dedicated Academic sidebar group and accessible expandable/collapsible group headers. The active group remains visible after navigation.

## Files changed

- `src/app/[locale]/admin/program-studi/page.tsx`
- `src/app/[locale]/admin/program-studi/[id]/edit/page.tsx`
- `src/components/admin/academic/program-studi-editor-form.tsx`
- `src/components/admin/academic/program-studi-types.ts`
- `src/components/admin/admin-sidebar.tsx`
- `src/components/admin/admin-sidebar-data.ts`
- `src/app/api/admin/academic/people/route.ts`
- `src/app/[locale]/(public)/prodi/[slug]/page.tsx`
- `tests/m4/ui/program-studi-admin.test.tsx`
- `tests/m4/ui/admin-sidebar-groups.test.tsx`
- `coordination/tasks/M4-GPT-PRODI-CMS-ADMIN-NAV.md`
- `coordination/ownership.yml`

## API/schema/migration impact

- No schema, dependency, migration, contract, or seed changes.
- Existing `StudyProgramInputSchema` and academic mutation endpoint remain the source of truth.
- The new UI edits existing rows only; no create/delete controls are exposed because v1 identity is fixed to IAT, IH, and AFI.

## Verification

- `npx vitest run tests/m4/ui/program-studi-admin.test.tsx tests/m4/ui/admin-sidebar-groups.test.tsx` — passed, 6 tests.
- `npm run test` — passed, 118 files / 1,410 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed with one pre-existing warning in `src/components/public/academic-topic-shell.tsx` (`tAcademic` unused).
- `npm run prisma:validate` — passed.
- `npm run build` — passed after allowing access to fetch the existing Google Fonts used by the project.
- `git diff --check` — passed.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-PRODI-CMS-ADMIN-NAV.md TASK_BASE=83ea28e9058624cd93258e2702db5b137e54192a npm run check:scope` — passed.

## Untested areas, risks, and follow-ups

- Runtime browser interaction and authenticated save flow were not run against a live database/session in this worktree.
- The editor preserves existing logo/document IDs but does not yet include media/document picker controls; those can be added as a follow-up without changing the academic mutation contract.
- Existing homepage section rendering still has code-defined component order and some hardcoded service/CTA presentation; this task addresses Program Studi content editing and admin navigation only.

## Requested contract/dependency change

- None.
