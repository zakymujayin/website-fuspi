# M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING Handoff

- Task: `M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING`
- Branch: `feat/lecturer-portal-complaint-booking`
- Base SHA: `5ea3e30f015801b85325a12139b43fb08403ca36`
- Head SHA: `f5f9f2c117d17e5a4a092a0bfcc92d64cf75075f`

## Summary

Diagnosed the repeated missing public homepage Berita Terbaru and Sorotan Akademik
sections under `npm run dev`. The components, `HomeSection` visibility, and published
CMS data were intact, but the homepage route could still be served from a prerender
snapshot even with `export const dynamic = "force-dynamic"`.

Next 16 documents `connection()` as the stable request-time rendering marker when a
route does not otherwise use request-time APIs. The homepage now calls `await
connection()` before the CMS/database queries so the news and column sections are
resolved after an incoming request, not during prerender.

## Files Changed

- `src/app/[locale]/(public)/page.tsx`
  - Added `connection()` from `next/server`.
  - Calls `await connection()` after locale setup and before `getPrismaClient()`.
- `tests/m4/runtime/homepage-cms-dynamic-rendering.test.ts`
  - Strengthened the guard test so it requires both `force-dynamic` and `connection()`
    before the homepage CMS query setup.
- `coordination/tasks/M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING.md`
  - Updated the task base SHA and scope-check command for this corrective continuation.
- `coordination/handoffs/M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING-gpt.md`
  - This handoff.

## API / Schema / Migration Impact

None. No API, Prisma schema, migration, auth, crypto, or env contract changes.

## Verification

- `set -a && . ./.env && set +a && npx tsx -e <homepage CMS query check>`
  - Confirmed `NEWS` and `COLUMN` are visible and published.
  - Confirmed public post query returns 5 news items, 5 dean columns, 5 lecturer columns, and 2 student columns.
- `curl -I http://localhost:3004/id` before fix
  - Confirmed stale response headers: `x-nextjs-cache: HIT`, `x-nextjs-prerender: 1`.
- `npx vitest run tests/m4/runtime/homepage-cms-dynamic-rendering.test.ts`
  - Passed: 1 file, 1 test.
- Clean dev-server verification after `rm -rf .next`
  - `set -a && . ./.env && set +a && PORT=3004 npm run dev`
  - `curl -s -L -o /tmp/fuspi-home-id-clean.html -w '%{http_code} %{size_download}\n' http://localhost:3004/id`
  - Passed: `200 371538`.
- `node --import tsx --input-type=module -e <Playwright visibility check>`
  - Passed: `Berita Terbaru` visible once.
  - Passed: `Sorotan Akademik` visible once.
- `npm run lint`
  - Passed.
- `npm run typecheck`
  - Passed.
- `npm run test`
  - Passed: 114 files, 1387 tests.
- `npm run build`
  - Passed.
  - Route table now reports `ƒ /[locale]` as dynamic server-rendered on demand.
- `git diff --check`
  - Passed.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-HOMEPAGE-CMS-DYNAMIC-RENDERING.md TASK_BASE=5ea3e30f015801b85325a12139b43fb08403ca36 npm run check:scope`
  - Pre-commit sandbox run failed with `spawnSync git EPERM`; escalated pre-commit run reported 0 committed files because changes were still in working tree.
  - Final post-commit result is recorded below.

## Untested Areas / Risks / Follow-ups

- No production deployment was performed in this task.
- Existing static public list pages such as `/kolom` remain outside this lease. The reported issue concerned homepage sections only.
- If a local `next dev` process was already serving stale output before this patch, restart it once after pulling the commit.
