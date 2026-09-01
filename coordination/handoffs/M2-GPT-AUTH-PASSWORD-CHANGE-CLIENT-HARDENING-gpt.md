# M2-GPT-AUTH-PASSWORD-CHANGE-CLIENT-HARDENING Handoff

- Task: `M2-GPT-AUTH-PASSWORD-CHANGE-CLIENT-HARDENING`
- Branch: `feat/lecturer-portal-complaint-booking`
- Base SHA: `5ea8ec17b11632c353e754621800db27da0e579d`
- Head SHA: `TBD`

## Summary

Hardened the password-change client flow after reports that the UI could show
an expired-session state without a success notification and the new password did
not appear to apply.

The server/API path already changed a DOSEN password correctly in direct
verification. The client now shows a localized success status, keeps the form
locked, and follows the server-issued redirect with `window.location.assign()`
after a short delay. This forces the next page to load as a fresh document with
the replacement session cookie that the password API just issued.

## Files Changed

- `src/components/auth/password-change-form.tsx`
  - Adds a visible success status.
  - Uses document navigation after successful password rotation.
  - Keeps duplicate-submit guard locked until the document unloads.
- `messages/id.json`, `messages/en.json`, `messages/ar.json`
  - Adds localized success copy and success button text.
- `tests/m2/ui/password-change-form.test.tsx`
  - Covers the success status, locked button state, no-store same-origin fetch,
    and `window.location.assign()` redirect.
- `coordination/tasks/M2-GPT-AUTH-PASSWORD-CHANGE-CLIENT-HARDENING.md`
  - Corrective task manifest and path lease.
- `coordination/handoffs/M2-GPT-AUTH-PASSWORD-CHANGE-CLIENT-HARDENING-gpt.md`
  - This handoff.

## API / Schema / Migration Impact

None. No server auth contract, password policy, Prisma schema, migration, cookie
name, hashing, or session revocation behavior changed.

## Verification

- Direct API DOSEN password-change probe
  - Login returned `200` with `requiresPasswordChange: true`.
  - Password endpoint returned `200`.
  - Database showed `mustChangePassword: false`, new password hash matched, and
    a replacement session was issued.
- Seed account probe
  - `dosen.demo@fuspi.uinbanten.ac.id` exists, is active, has role `DOSEN`,
    still matches `WelcomeDosenDemo321@_`, and is linked to an active lecturer
    profile.
- Browser E2E DOSEN flow on `npm run dev` port 3004
  - Logged in as synthetic DOSEN.
  - Reached `/id/change-password`.
  - Saw success status after submit.
  - Landed on `/id/portal-dosen`.
  - Database showed `mustChangePassword: false`, new password matched, and one
    session row remained.
- `npx vitest run tests/m2/ui/password-change-form.test.tsx`
  - Passed: 1 file, 1 test.
- `npm run lint`
  - Passed.
- `npm run typecheck`
  - Passed.
- `npm run test`
  - Passed: 115 files, 1388 tests.
- `npm run build`
  - Passed.
- `set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/platform/auth-bridge/auth-bridge.integration.test.ts tests/security/auth-bridge/auth-bridge-adversarial.integration.test.ts`
  - Initial sandbox run failed with `connect EPERM 127.0.0.1:5432`.
  - Escalated run passed: 2 files, 15 tests.
- `git diff --check`
  - Passed.
- `TASK_MANIFEST=coordination/tasks/M2-GPT-AUTH-PASSWORD-CHANGE-CLIENT-HARDENING.md TASK_BASE=5ea8ec17b11632c353e754621800db27da0e579d npm run check:scope`
  - To run after commit.

## Untested Areas / Risks / Follow-ups

- No production deployment was performed.
- Arabic copy remains functional draft text pending native review, consistent
  with the existing auth UI handoff caveat.
