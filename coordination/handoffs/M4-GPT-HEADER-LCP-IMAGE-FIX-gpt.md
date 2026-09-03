# Handoff: M4-GPT-HEADER-LCP-IMAGE-FIX

- task ID: `M4-GPT-HEADER-LCP-IMAGE-FIX`
- branch: `ai/gpt/m4-public-ia-menu-remap`
- base SHA: `5197cd7`
- head SHA: `506ae37`

## Summary

- Identified the reported `/uploads/...webp` asset as the configured BAN-PT accreditation logo in the public header identity cluster.
- Added an explicit `loading` mode to the shared public fallback image wrapper.
- Marked all configured header identity logos as `loading="eager"`, while leaving content images below the fold unchanged.
- Removed the deprecated `priority` usage from the header identity badge path.

## API/schema/migration impact

- None. This is a client-side image loading hint only; media URLs, validation, storage, and public data queries are unchanged.

## Verification

- `npx vitest run tests/m4/ui/header-lcp-image.test.ts tests/m4/ui/site-logo-header.test.ts` — passed (6 tests)
- `npm run lint` — passed with one pre-existing warning in `src/components/public/academic-topic-shell.tsx:40` (`tAcademic` unused)
- `npm run typecheck` — passed
- `npm run test` — passed (126 files, 1430 tests)
- `git diff --check` — passed
- `TASK_MANIFEST=coordination/tasks/M4-GPT-HEADER-LCP-IMAGE-FIX.md TASK_BASE=5197cd7 npm run check:scope` — passed

## Untested areas and follow-up

- No browser performance trace was run. The reported asset is now eager in the header; actual LCP should be confirmed once the page is loaded in the target browser and viewport.
