# M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING Handoff

- Task: `M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING`
- Branch: `feat/lecturer-portal-complaint-booking`
- Base SHA: `13909c53f04c91871ed3af70381460908e82b373`
- Head SHA: `602ed2e85c16dc777fe3b3ae24d0c13b5b8622fc`

## Summary

Diagnosed missing public homepage Berita Terbaru and Sorotan Akademik/Kolom sections.
The components and database data were intact, but the homepage route was being served
from a stale prerender cache. The route is now forced to request-time rendering so
CMS-controlled sections read current database state on each request.

## Files Changed

- `src/app/[locale]/(public)/page.tsx`
  - Added `export const dynamic = "force-dynamic";`.
- `tests/m4/runtime/homepage-cms-dynamic-rendering.test.ts`
  - Added a guard test for the homepage dynamic rendering contract.
- `coordination/tasks/M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING.md`
  - Added task manifest and path lease.
- `coordination/handoffs/M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING-gpt.md`
  - This handoff.

## API / Schema / Migration Impact

None. No API, Prisma schema, migration, auth, crypto, or env contract changes.

## Verification

- `set -a && . ./.env && set +a && npx tsx -e <homepage CMS query check>`
  - Confirmed `NEWS` and `COLUMN` are visible and published.
  - Confirmed public post query returns 5 news items, 5 dean columns, 5 lecturer columns, and 2 student columns.
- `curl -I http://localhost:3004/id` before fix/server refresh
  - Confirmed stale response headers: `x-nextjs-cache: HIT`, `x-nextjs-prerender: 1`.
- `npx vitest run tests/m4/runtime/homepage-cms-dynamic-rendering.test.ts`
  - Passed: 1 file, 1 test.
- `npm run lint`
  - Passed.
- `npm run typecheck`
  - Passed.
- `npm run test`
  - Passed: 114 files, 1384 tests.
- `npm run build`
  - Passed.
  - Route table now reports `ƒ /[locale]` as dynamic server-rendered on demand.
- `node --import tsx -e <Playwright visibility check>`
  - Passed: `Berita Terbaru` visible, `Sorotan Akademik` visible.
- `git diff --check`
  - Passed.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING.md TASK_BASE=13909c53f04c91871ed3af70381460908e82b373 npm run check:scope`
  - Pre-commit sandbox run failed with `spawnSync git EPERM`; escalated run succeeded pre-commit but reported 0 committed files because changes were still in working tree.
  - Final post-commit result must be recorded after commit.

## Untested Areas / Risks / Follow-ups

- No production deployment was performed in this task.
- Existing static public list pages such as `/kolom` remain outside this lease. The reported issue concerned homepage sections only.
- Dev server cache may need a restart after this change if a stale local `next dev` process is already running.
