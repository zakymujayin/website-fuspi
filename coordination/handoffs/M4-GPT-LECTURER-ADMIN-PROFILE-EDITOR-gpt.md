# Handoff — M4-GPT-LECTURER-ADMIN-PROFILE-EDITOR

- Task ID: `M4-GPT-LECTURER-ADMIN-PROFILE-EDITOR`
- Branch: `ai/gpt/m4-public-ia-menu-remap`
- Base SHA: `32f321b7a71772ab7c04c9482f40848924df3412`
- Implementation head SHA: `4f438b6292a7c2d734a5944e7367eafb33d4269e`

## Summary

ADMIN can now manage a lecturer's education history and publications from the
existing lecturer edit workspace. The mutation layer validates an active ADMIN
session, scopes every relation operation to the selected lecturer, uses a
Serializable transaction, and records activity log entries. The lecturer list
also exposes education/publication counts and a mobile card layout with a
public-profile shortcut.

## Files changed

- `src/features/academic/lecturer-relations.ts`
- `src/components/admin/lecturer/lecturer-relations-actions.ts`
- `src/components/admin/lecturer/lecturer-relations-manager.tsx`
- `src/components/admin/lecturer/lecturer-list.tsx`
- `src/components/admin/lecturer/lecturer-types.ts`
- `src/app/[locale]/admin/dosen/page.tsx`
- `src/app/[locale]/admin/dosen/[id]/edit/page.tsx`
- `tests/m4/runtime/admin-lecturer-relations.test.ts`
- `tests/m4/ui/admin-lecturer-profile-editor.test.tsx`
- `coordination/tasks/M4-GPT-LECTURER-ADMIN-PROFILE-EDITOR.md`
- `coordination/ownership.yml`

## API/schema impact

No Prisma schema, migration, dependency, shared contract, or public API route
changes. New server actions call a dedicated ADMIN-only domain function and
reuse the frozen lecturer education/publication input schemas.

## Verification

- `npx vitest run tests/m4/ui/admin-lecturer-profile-editor.test.tsx tests/m4/runtime/admin-lecturer-relations.test.ts` — **7 passed**
- `npm run typecheck` — **passed**
- `npm run lint` — **passed with one pre-existing warning** in `src/components/public/academic-topic-shell.tsx` (`tAcademic` unused)
- `npm test` — **127 files / 1,434 tests passed**
- `npm run prisma:validate` — **passed**
- `npm run build` — **passed**
- `git diff --check` — **passed**
- `TASK_MANIFEST=coordination/tasks/M4-GPT-LECTURER-ADMIN-PROFILE-EDITOR.md TASK_BASE=32f321b7a71772ab7c04c9482f40848924df3412 npm run check:scope` — run before staging reported no tracked diff; final committed diff is limited to the manifest paths.

## Untested areas / follow-ups

- A live browser session with a seeded ADMIN and lecturer record was not run in
  this task; the server action and UI contracts are covered by unit/static tests.
- The existing ADMIN main-profile form still follows the frozen academic people
  contract; portal-only fields outside that contract remain lecturer-managed.
