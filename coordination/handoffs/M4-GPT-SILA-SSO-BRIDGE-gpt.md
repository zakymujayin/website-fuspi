# M4-GPT-SILA-SSO-BRIDGE — GPT Handoff

## Task

- Task ID: `M4-GPT-SILA-SSO-BRIDGE`
- Branch: `feat/lecturer-portal-complaint-booking`
- Base SHA: `fdf1669eb9afb16c146c471d0f6652e9ff9f8bc0`
- Implementation head SHA: `903f760cb7c880fdcb68fbb51df408ba52f54d88`

## Summary

Implemented the FUSPI-side SILA SSO bridge as an OIDC authorization-code + PKCE
flow that is disabled by default. The bridge exposes:

- `GET /api/auth/sila/start`
- `GET /api/auth/sila/callback`

The start route creates a signed HttpOnly state cookie and redirects to the
configured SILA authorization endpoint. The callback route verifies state,
exchanges the code server-side, reads userinfo, and issues a normal FUSPI
database session only when the SILA email claim matches an already-provisioned,
active FUSPI account. FUSPI role and destination decisions remain based on the
FUSPI database, not provider/client claims.

The login page now shows a “Sign in with SILA” option only when all SSO env vars
are valid. Local credentials remain available for emergency/admin access.

## Files Changed

- `.env.example`
- `docs/23-integrasi-sila-e-layanan.md`
- `messages/id.json`
- `messages/en.json`
- `messages/ar.json`
- `src/contracts/auth.ts`
- `src/lib/auth/runtime/sila-sso.ts`
- `src/app/api/auth/sila/start/route.ts`
- `src/app/api/auth/sila/callback/route.ts`
- `src/app/[locale]/(auth)/login/page.tsx`
- `src/components/auth/login-form.tsx`
- `tests/platform/auth-bridge/sila-sso.test.ts`
- `coordination/tasks/M4-GPT-SILA-SSO-BRIDGE.md`

## API / Schema / Migration Impact

- Added two auth route handlers under `/api/auth/sila/*`.
- Added optional SSO env contract:
  - `SILA_SSO_ENABLED`
  - `SILA_SSO_AUTHORIZATION_URL`
  - `SILA_SSO_TOKEN_URL`
  - `SILA_SSO_USERINFO_URL`
  - `SILA_SSO_CLIENT_ID`
  - `SILA_SSO_CLIENT_SECRET`
  - `SILA_SSO_SCOPES`
  - `SILA_SSO_EMAIL_CLAIM`
  - `SILA_SSO_IDENTIFIER_CLAIM`
  - `SILA_SSO_TIMEOUT_MS`
- No Prisma schema or migration change.
- No dependency change.

## Security Invariants

- SSO is fail-closed unless explicitly enabled and fully configured.
- No SILA database/session/secret is shared with FUSPI.
- No automatic FUSPI account creation or role escalation from SILA claims.
- State is signed with `AUTH_SECRET`, stored in an HttpOnly cookie, and expires
  after 10 minutes.
- Authorization code is exchanged server-side with PKCE.
- Provider tokens and userinfo claims are never serialized to the UI response.
- Callback failures redirect with generic reason codes only.
- Existing FUSPI database session and role routing remain the final authority.

## Verification

- `npx shadcn@latest info` — passed; confirmed Next.js 16.2.10, shadcn
  base-nova, lucide icons, RTL enabled, installed `button`, `field`, `input`,
  `separator`, `spinner`.
- `npx vitest run tests/platform/auth-bridge/sila-sso.test.ts` — passed; 5 tests.
- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test` — passed; 112 files, 1372 tests.
- `npm run prisma:validate` — passed.
- `npm run build` — passed; Next.js built 329 static pages and route handlers,
  including `/api/auth/sila/start` and `/api/auth/sila/callback`.
- `git diff --check` — passed.
- `TASK_MANIFEST=coordination/tasks/M4-GPT-SILA-SSO-BRIDGE.md TASK_BASE=fdf1669eb9afb16c146c471d0f6652e9ff9f8bc0 npm run check:scope` — passed
  with escalation after sandbox `spawnSync git EPERM`; 13 changed files within
  lease.

## Untested Areas / Follow-ups

- No live SILA SSO round-trip was executed because `/home/zhev/myproject/e-layanan`
  currently has Auth.js credentials login and no official OIDC/SAML/CAS provider
  contract.
- Codex in the SILA repo should implement or expose the matching OIDC endpoints,
  then run a cross-app staging test for start, callback, revoked user, changed
  group, expired code/state, logout, and emergency local admin access.
- If SILA uses SAML instead of OIDC, this FUSPI bridge must be adapted through a
  separate contract task rather than patched ad hoc.
