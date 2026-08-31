# M4-GPT-FUSPI-TO-SILA-HANDOFF — GPT Handoff

## Task

- Task ID: `M4-GPT-FUSPI-TO-SILA-HANDOFF`
- Branch: `feat/lecturer-portal-complaint-booking`
- Base SHA: `d85e9f73f3a6b0614bc7942d7497feb83a765b7e`
- Implementation head SHA: `15e310e41bb9b805140818fdbfb7ee79a43ef68b`

## Summary

Added the FUSPI-side reverse handoff for the requested flow: a staff/lecturer
user who is already signed in to FUSPI can click the SILA service card and be
sent to SILA without re-entering username/password.

The homepage service card now points to:

```text
/api/auth/sila/launch?locale=<locale>&next=/dashboard
```

when reverse handoff env is fully configured. That route checks the FUSPI
database session, reloads the active user from FUSPI, signs a 60-second HS256
handoff token, and redirects to `SILA_HANDOFF_URL`. If reverse handoff is not
configured or the user has no valid FUSPI session, it falls back to the normal
SILA URL from `NEXT_PUBLIC_SILA_URL`.

## Files Changed

- `.env.example`
- `docs/23-integrasi-sila-e-layanan.md`
- `src/components/public/services-section.tsx`
- `src/lib/auth/runtime/sila-handoff.ts`
- `src/app/api/auth/sila/launch/route.ts`
- `tests/platform/auth-bridge/sila-handoff.test.ts`
- `coordination/tasks/M4-GPT-FUSPI-TO-SILA-HANDOFF.md`

## API / Schema / Migration Impact

- Added `GET /api/auth/sila/launch`.
- Added optional env contract:
  - `SILA_HANDOFF_ENABLED`
  - `SILA_HANDOFF_URL`
  - `SILA_HANDOFF_SHARED_SECRET`
  - `SILA_HANDOFF_ISSUER`
  - `SILA_HANDOFF_AUDIENCE`
  - `SILA_HANDOFF_TTL_SECONDS`
  - `SILA_HANDOFF_ALLOWED_ROLES`
- No Prisma schema or migration change.
- No dependency change.

## Security Invariants

- Reverse handoff is disabled by default and fail-closed until env is complete.
- FUSPI never sends a password, session cookie, database session token, or
  shared database reference to SILA.
- Handoff token is HS256 signed with a dedicated shared secret, not `AUTH_SECRET`.
- Token includes `iss`, `aud`, `sub`, `email`, `name`, `role`, `iat`, `exp`,
  and `jti`; default TTL is 60 seconds.
- Default FUSPI role allowlist excludes `EDITOR` and `SATGAS_PPKS`.
- SILA `next` is normalized as a SILA-internal path and hostile URLs fall back
  to `/dashboard`.
- SILA must still verify signature, expiry, role allowlist, active matching
  local user, and one-time `jti` consumption before issuing a SILA session.

## Verification

- `npx vitest run tests/platform/auth-bridge/sila-handoff.test.ts` — passed; 11 tests.
- `npx vitest run tests/platform/auth-bridge/sila-handoff.test.ts tests/platform/auth-bridge/sila-sso.test.ts` — passed; 16 tests.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test` — passed; 113 files, 1383 tests.
- `npm run build` — passed; Next.js generated 330 static pages and includes
  `/api/auth/sila/launch`.
- `git diff --check` — passed.

## SILA-Side Follow-up

The `/home/zhev/myproject/e-layanan` repo currently has an OIDC provider for
the opposite direction, but it does not yet have the inbound route that consumes
FUSPI handoff tokens and creates a SILA Auth.js JWT session.

SILA still needs:

- `GET /api/auth/fuspi/callback`
- verification for FUSPI HS256 token, `iss`, `aud`, `exp`, and role allowlist;
- lookup of an active SILA user by email;
- one-time `jti` storage/hash to block replay;
- issuance of a SILA Auth.js JWT session cookie;
- redirect to the validated SILA-internal `next`, normally `/dashboard`.

Without that SILA-side receiver, the FUSPI route can generate and send the
handoff, but SILA cannot yet complete the no-password dashboard login.
