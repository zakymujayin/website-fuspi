# HANDOFF — M2-GPT-PASSWORD-SESSION-UI

- Task: `M2-GPT-PASSWORD-SESSION-UI`
- Branch: `ai/gpt/m2-password-session-ui`
- Base SHA: `d7944d0`
- Implementation SHA: `46f3066`
- Handoff SHA: `695fbf4`
- Head SHA at handoff finalization: `43285f7`
- Owner/tester: GPT Platform
- Reviewer: human owner
- Status: ready for integration review; not merged

## Summary

- Added localized, server-protected `/{locale}/change-password` and its smallest client
  form against the frozen password API contract.
- Added the smallest `/{locale}/admin` Server Component landing page. Both pages revalidate
  the opaque database session at the page boundary, enforce forced-password routing, and
  serialize no actor identifier, role, or account data.
- Login now sends its locale explicitly. A stale cookie produces a generic notice only
  after database revalidation; a missing cookie does not claim expiration; raw query
  reasons are ignored.
- Password UI handles policy, wrong current password, invalid session, infrastructure
  failure, malformed/hostile API results, password visibility, focus recovery, duplicate
  submit, safe server destinations, and ID/EN/AR RTL behavior.
- Added PostgreSQL-backed Playwright fixtures and 30 browser cases across desktop/mobile.

The visual direction follows the existing “Dignified Academic Modern” auth shell and its
semantic shadcn tokens. No global token, primitive, dependency, runtime, schema, proxy, or
security contract was changed.

## Files changed

- `src/app/[locale]/(auth)/change-password/page.tsx`
- `src/app/[locale]/(auth)/login/page.tsx`
- `src/app/[locale]/admin/layout.tsx`
- `src/app/[locale]/admin/page.tsx`
- `src/components/auth/login-form.tsx`
- `src/components/auth/password-change-form.tsx`
- `src/components/auth/password-field.tsx`
- `messages/id.json`
- `messages/en.json`
- `messages/ar.json`
- `e2e/auth/password-session.spec.ts`
- `coordination/handoffs/M2-GPT-PASSWORD-SESSION-UI-gpt.md`

## API, schema, migration, dependency impact

- API/schema/migration/dependency: none.
- Existing frozen `LoginResultSchema`, `PasswordChangeInputSchema`,
  `PasswordChangeResultSchema`, session reader, protected-route decision, and redirect
  normalizer are consumed unchanged.
- Database writes in Playwright are synthetic `example.invalid` fixtures only and are
  deleted after each project suite.

## Verification

All database commands used isolated PostgreSQL 16.14 on loopback port `55432` with the
documented auth test secrets.

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 200 passed, 34 database tests skipped by unit config |
| `npm run test:integration` | PASS — 34 passed, 0 failed/skipped |
| `npm run build` | PASS; admin, change-password, and login are dynamic routes |
| `npx playwright test e2e/auth/login.spec.ts e2e/auth/password-session.spec.ts --workers=1` | PASS — 76 passed across Chromium desktop/mobile |
| `npm audit --audit-level=high` | PASS (exit 0); 0 High/Critical, 5 Moderate |
| `git diff --check` | PASS |
| `TASK_MANIFEST=coordination/tasks/M2-GPT-PASSWORD-SESSION-UI.md TASK_BASE=origin/coordination/m2-gpt-password-session-ui-assignment npm run check:scope` | PASS — 11 implementation files within lease before handoff |

The first browser run exposed missing semantic `h1` elements because `CardTitle` renders a
`div`; the implementation now nests explicit localized `h1` elements. The corrected
password/session suite passed 28/28, followed by the exact final combined command at 76/76.
An initial Playwright fixture import also showed that the generated Prisma client ESM cannot
be loaded by Playwright's test-module loader; the fixture now uses the installed PostgreSQL
driver only for isolated setup/cleanup while the application still exercises Prisma.

## Risks and follow-ups

- Arabic copy remains draft pending native-language review.
- This is intentionally not the full admin shell. It closes the protected route and provides
  one safe password entry point; content modules remain later milestones.
- The existing five Moderate dependency advisories remain unchanged; their automated fixes
  require breaking Prisma/Next downgrades and were not applied.
- Browser coverage uses PostgreSQL 16.14 locally; the merged CI gate must revalidate the
  branch on PostgreSQL 17.
- No M3 work was started.
