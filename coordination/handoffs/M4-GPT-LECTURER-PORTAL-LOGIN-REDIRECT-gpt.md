# M4-GPT-LECTURER-PORTAL-LOGIN-REDIRECT Handoff

- Task: `M4-GPT-LECTURER-PORTAL-LOGIN-REDIRECT`
- Branch: `feat/lecturer-portal-complaint-booking`
- Base SHA: `3a7fc8e905b38c0a081212f2a9c52ec864defb65`
- Head SHA: `67896cdcb38884c6ae91a280ef07e90f70ccf14b`

## Summary

Reviewed the lecturer self-service login/profile mechanism and fixed the remaining
role-aware redirect gaps. Credential login already sent `DOSEN` accounts to
`/portal-dosen`; this task extends the same role routing to already-authenticated
visits to `/login` and to the mandatory password-change completion path.

Current flow:

1. Admin imports lecturers and may provision linked `DOSEN` accounts.
2. Provisioned accounts are linked through `Lecturer.userId`, receive a temporary
   password, and start with `mustChangePassword=true`.
3. Login creates an opaque database session and routes `DOSEN` accounts to
   `/[locale]/portal-dosen`.
4. Password rotation clears `mustChangePassword`, revokes prior sessions,
   issues a fresh session, and now routes `DOSEN` accounts to the portal instead
   of the admin fallback.
5. Portal pages and actions load/write only by the signed-in `userId`, never by a
   lecturer id supplied by the request.

## Files Changed

- `src/lib/auth/runtime/redirect.ts`
  - Added `resolveActiveLoginSessionDestination`.
- `src/app/[locale]/(auth)/login/page.tsx`
  - Uses role-aware redirect for already-authenticated sessions.
- `src/app/api/auth/password/route.ts`
  - Captures the changed user's role inside the password-change transaction and
    uses role-aware post-login routing for the success destination.
- `tests/platform/lecturer-portal/lecturer-portal.test.ts`
  - Added coverage for active lecturer sessions and password-rotation redirects.
- `coordination/tasks/M4-GPT-LECTURER-PORTAL-LOGIN-REDIRECT.md`
  - Added task manifest.
- `coordination/handoffs/M4-GPT-LECTURER-PORTAL-LOGIN-REDIRECT-gpt.md`
  - This handoff.

## API / Schema / Migration Impact

No schema, migration, env, cookie, or public API contract changes. The JSON shape
of login/password responses is unchanged; only safe redirect selection changed.

## Verification

- `npx vitest run tests/platform/lecturer-portal/lecturer-portal.test.ts`
  - Passed: 1 file, 17 tests.
- `npx vitest run tests/platform/auth-bridge/auth-bridge.test.ts tests/platform/auth-runtime/auth-runtime.test.ts`
  - Passed: 2 files, 19 tests.
- `set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/security/lecturer-portal-adversarial.integration.test.ts tests/security/lecturer-provisioning-adversarial.integration.test.ts tests/platform/auth-runtime/auth-runtime.integration.test.ts`
  - Initial sandbox run failed with `connect EPERM 127.0.0.1:5432`.
  - Escalated run passed: 3 files, 20 tests.
- `npm run lint`
  - Passed.
- `npm run typecheck`
  - Passed.
- `npm run test`
  - Passed: 114 files, 1385 tests.
- `npm run build`
  - Passed.
- `set -a && . ./.env && set +a && npx tsx -e <lecturer account readiness query>`
  - Local DB counts: 12 lecturers, 1 linked lecturer account, 5 unlinked lecturers with email, 6 unlinked lecturers without email, 1 `DOSEN` user still requiring password change.
- `git diff --check`
  - Passed.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-LECTURER-PORTAL-LOGIN-REDIRECT.md TASK_BASE=3a7fc8e905b38c0a081212f2a9c52ec864defb65 npm run check:scope`
  - Pre-commit escalated run passed but reported 0 committed files because changes were still in the working tree.
  - Final post-commit escalated run passed: 6 changed files are within lease.

## Untested Areas / Risks / Follow-ups

- No live browser login was performed with a real lecturer password in this task.
- The portal profile form preserves existing photo/CV media ids but still has no
  lecturer-facing media upload picker.
- Six local lecturer rows have no email, so they cannot be auto-provisioned until
  admin data is completed.
