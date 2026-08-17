# M4-GPT-TAXONOMY-ADMIN-POST-PICKER Handoff

## Task

- Task ID: M4-GPT-TAXONOMY-ADMIN-POST-PICKER
- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: 8aa05b3
- Head SHA: 991f544
- Status: review

## Summary

Added the missing admin surface for existing taxonomy backend support and wired
category/tag selection into the Post editor. The admin sidebar now exposes
Taksonomi, `/admin/taksonomi` lists categories and tags, and create/edit/delete
forms call the existing `executeTaxonomyCommand` domain layer through a server
action.

Post create/update/autosave payloads now persist editable `categoryId` and
`tagIds` from the draft instead of hardcoding empty taxonomy assignments or
carrying hidden edit-only values.

## Files Changed

- `coordination/tasks/M4-GPT-TAXONOMY-ADMIN-POST-PICKER.md`
- `coordination/handoffs/M4-GPT-TAXONOMY-ADMIN-POST-PICKER-gpt.md`
- `messages/id.json`
- `messages/en.json`
- `messages/ar.json`
- `src/app/[locale]/admin/taksonomi/**`
- `src/app/[locale]/admin/posts/new/page.tsx`
- `src/app/[locale]/admin/posts/[postId]/edit/page.tsx`
- `src/components/admin/admin-sidebar-data.ts`
- `src/components/admin/taxonomy/**`
- `src/components/admin/posts/post-editor-form.tsx`
- `src/components/admin/posts/post-editor-payload.ts`
- `src/components/admin/posts/post-editor-shell.tsx`
- `src/components/admin/posts/post-editor-view.ts`
- `tests/m3/ui/admin-post-editor.test.tsx`
- `tests/m3/ui/admin-post-autosave.test.tsx`
- `tests/m3/ui/admin-post-cover-picker.test.tsx`
- `tests/m4/ui/taxonomy-admin-form.test.tsx`

## API, Schema, Migration Impact

- No Prisma schema change.
- No migration change.
- No contract change.
- No new API route. The UI uses the existing taxonomy domain/API contract.

## Verification

- `npx shadcn@latest info` passed.
- `npx shadcn@latest docs field button checkbox input textarea` completed.
- `node -e "JSON.parse(...messages...)"` passed for locale JSON files.
- `npx vitest run tests/m3/ui/admin-post-editor.test.tsx tests/m3/ui/admin-post-autosave.test.tsx tests/m3/ui/admin-post-cover-picker.test.tsx tests/m4/ui/taxonomy-admin-form.test.tsx` passed: 4 files, 65 tests.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run prisma:validate` passed.
- `npm run test` passed: 91 files, 1151 tests.

## Untested Areas and Risks

- Browser/manual E2E for taxonomy create/edit/delete was not run.
- The taxonomy list currently relies on the existing paged backend result and does
  not add a search box or pagination controls in this task.

## Follow-Ups

- Add admin list pagination/search for taxonomies if content volume exceeds the
  default backend page size.
- Add Playwright coverage for creating a category/tag and assigning it to a post.
