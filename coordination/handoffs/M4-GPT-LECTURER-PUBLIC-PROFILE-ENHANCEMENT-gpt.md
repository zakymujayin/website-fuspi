# Handoff — M4-GPT-LECTURER-PUBLIC-PROFILE-ENHANCEMENT

- **Task ID:** M4-GPT-LECTURER-PUBLIC-PROFILE-ENHANCEMENT
- **Branch:** `ai/gpt/m4-public-ia-menu-remap`
- **Base SHA:** `32f321b7a71772ab7c04c9482f40848924df3412`
- **Head SHA:** `2060939`

## Summary

Refined the public lecturer detail page into a compact academic-record layout.
The page now renders published research and community-service relations, adds
honest HKI and teaching-assignment sections, and exposes a semester selector
ready for real teaching assignments. The public course catalog now filters its
semester groups interactively without a full page reload.

## Files changed

- `src/app/[locale]/(public)/dosen/[id]/page.tsx`
- `src/app/[locale]/(public)/akademik/mata-kuliah/page.tsx`
- `src/components/public/lecturer-academic-records.tsx`
- `src/components/public/academic-course-catalog.tsx`
- `messages/id.json`
- `messages/en.json`
- `messages/ar.json`
- `coordination/tasks/M4-GPT-LECTURER-PUBLIC-PROFILE-ENHANCEMENT.md`

## API/schema impact

No schema, migration, API, or permission changes. Existing published
`Research` and `CommunityService` relations are read through the lecturer
detail query and external links are validated as safe HTTPS URLs before render.
HKI and teaching assignment arrays are intentionally empty until their
contract/schema and ADMIN CRUD/import workflow are implemented. The UI accepts
those records without another layout change.

## Verification

- `npm run lint` — passed; one pre-existing unused-variable warning in `academic-topic-shell.tsx`.
- `npm run typecheck` — passed.
- `npm run test` — passed: 128 files, 1,437 tests.
- `npm run build` — passed: Next.js 16.2.10 compiled and generated 356 pages.
- `git diff --check` — passed.
- Live smoke check with `curl`: `/id/dosen/dr-masykur-m-hum` and `/id/akademik/mata-kuliah` returned HTTP 200.

## Risks and follow-ups

- HKI persistence, ADMIN editing, and schedule upload/mapping are not in the
  current baseline schema and therefore are not fabricated in this UI task.
- Teaching assignment data should be added through a GPT-owned contract task,
  with ADMIN-only CSV/XLSX preview, stable lecturer identity mapping, conflict
  reporting, and atomic publish/rollback behavior.
- Existing working-tree changes in the admin lecturer editor were not touched.
