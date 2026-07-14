# Handoff — M2-GPT-AUTH-BRIDGE — GPT

- Task: `M2-GPT-AUTH-BRIDGE`
- Branch: `ai/gpt/m2-auth-bridge`
- Assignment/base SHA: `decb5ba`
- Implementation SHA: `e615950`
- Owner: GPT Platform
- Reviewer: DeepSeek Delivery & QA
- Status: ready for serial integration; M3 not started

## Summary

Closed the server-side gap between the merged login form and the existing M2 auth runtime:

- added strict public password-change and protected-route decision contracts;
- added locale-safe redirect normalization for ID, EN, and AR, including hostile encoded
  separator/control and auth-loop fallback handling;
- made the Credentials result normalize its destination server-side using a validated locale
  hint, while preserving the current UI's locale when the hint is not yet sent;
- added an async Next.js 16 request-cookie reader that revalidates the opaque database session;
- added a pure protected-route decision that routes invalid sessions to localized login and
  forced-password sessions to localized password change without serializing actor data;
- added `POST /api/auth/password` with same-origin CSRF, strict input handling, transactional
  password change/session revocation, deterministic public failures, safe post-change login
  destination, and cookie expiry;
- added unit and MariaDB integration coverage.

## Files changed

- `src/contracts/auth.ts`
- `src/app/api/auth/credentials/route.ts`
- `src/app/api/auth/password/route.ts`
- `src/lib/auth/runtime/credentials.ts`
- `src/lib/auth/runtime/redirect.ts`
- `src/lib/auth/runtime/request-session.ts`
- `tests/platform/auth-bridge/auth-bridge.test.ts`
- `tests/platform/auth-bridge/auth-bridge.integration.test.ts`
- `coordination/handoffs/M2-GPT-AUTH-BRIDGE-gpt.md`

## API, contract, schema, and dependency impact

- New API: `POST /api/auth/password`.
  - CSRF failure: empty `403`.
  - Missing/invalid session: `401 {ok:false,code:"SESSION_INVALID"}` and cookie expiry.
  - Wrong current password or policy failure: sanitized `400` code.
  - Infrastructure failure: sanitized `503 AUTH_UNAVAILABLE`.
  - Success: `{ok:true,redirectTo}` followed by client navigation; every database session is
    revoked transactionally and the browser cookie is expired.
- Credentials API accepts optional `locale=id|en|ar`; invalid hints default to ID. Until the
  UI sends it, a supported locale leading the validated destination is used, preserving the
  already-merged default locale behavior.
- Added public Zod result contracts only; active session identity remains server-only.
- No Prisma schema, migration, generated client, dependency, env contract, proxy, messages,
  or UI change.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run prisma:validate` with project env | PASS |
| `npm test` | PASS — 163 passed, 23 integration-only skipped |
| `npm run test:integration` against MariaDB 10.11 on port 3307 | PASS — 23/23 |
| focused auth-bridge integration suite | PASS — 4/4 |
| `npm run build` with project env | PASS — `/api/auth/password` emitted as dynamic route |
| `git diff --check` | PASS |
| task scope check against assignment branch | PASS — 8 implementation files within lease |

The first integration attempt ran inside a restricted sandbox and every Prisma suite timed
out before executing. A direct MariaDB query succeeded; rerunning with authorized local TCP
access and the complete project env passed both the focused and full suites. This was an
execution-environment restriction, not an application failure.

## Security behavior proven

- External, protocol-relative, encoded separator/control, backslash, API, and login/password
  loop destinations fall back to `/{locale}/admin`.
- Locale replacement happens only after internal-path validation.
- Production and development cookie names are read independently; the insecure development
  cookie is not accepted as the production cookie.
- Expired sessions are rejected and removed; active role, status, and forced-password state
  are read from MariaDB.
- Wrong-current-password responses contain only `ok` and `code`, preserve the active session,
  and expose no validation details or account data.
- Successful password mutation changes the cost-12 hash, clears `mustChangePassword`, revokes
  every session, returns no actor data, and expires the opaque cookie.

## Remaining M2 follow-ups

1. Claude UI task: implement `/{locale}/change-password` and a minimal guarded admin landing
   surface; send the active locale to both auth endpoints and consume only the frozen public
   results. Add session-expired/revoked UX without trusting a raw query reason.
2. DeepSeek: one bounded independent review of this bridge after integration; add a correction
   task only for a reproducible High/Critical or failing acceptance case.
3. GPT shared-capabilities task remains separate: upload boundaries, optimistic locking,
   PPKS crypto/HMAC, annual sequence, outbox, sanitizer, and redirect registry safety.
4. Arabic auth copy still requires native-speaker review before production release.

No M3 code, task, or branch was created.
