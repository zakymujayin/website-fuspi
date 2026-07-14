# HANDOFF — M2-GPT-AUTH-CONTRACT

- Task: `M2-GPT-AUTH-CONTRACT`
- Branch: `ai/gpt/m2-auth-contract`
- Manifest base SHA: `ebd2a6d`
- Task branch base SHA: `18a26dd` (M2 coordination commit)
- Implementation SHA: `35c1e58`
- Independent-review correction SHA: `3ff020c`
- Owner: GPT Platform
- Reviewer/tester requested: DeepSeek
- Status: review findings closed; ready for reviewer confirmation; not merged

## Summary

- Pinned `next-auth@5.0.0-beta.31` and `@auth/prisma-adapter@2.11.2` after checking official Auth.js guidance, npm peer metadata, Next.js 16 local docs, and the dependency audit.
- Added strict Zod contracts for login input/result, generic protected-action session invalidation, safe internal redirects, password change, minimal active database-session metadata, and authorization context.
- Added one exhaustive, deep-frozen role/resource/action permission matrix. Deny is the default for every combination, editor ownership is explicit, ADMIN/PETUGAS cannot access PPKS detail or its access log, and SATGAS_PPKS cannot access CMS/booking/non-PPKS tickets.
- Added table-driven contract tests and ADR-0002. No Auth.js config, route, proxy, UI, session persistence, or schema was implemented.

## Dependency, API, schema, and migration impact

- Added exactly two direct runtime dependencies; both are pinned without ranges and resolve to `@auth/core@0.41.2`.
- Pinned the pre-existing password primitive to exact `bcryptjs@3.0.3`; no new password package was added.
- Nodemailer and WebAuthn optional peers were deliberately not installed.
- New internal APIs: `src/contracts/auth.ts` and `src/lib/auth/permission-matrix.ts`.
- No Prisma schema or migration change. Existing Auth.js-compatible User/Session/Account tables remain untouched.

## Verification

Passed against the existing isolated local database environment:

- `npm run lint`
- `npm run typecheck`
- `npm run prisma:validate`
- `npm test`: 101 passed, 2 database-only tests skipped in the unit run
- `npm run build`: production build passed for ID/EN/AR routes
- `npm audit --audit-level=high`: exit 0, zero High/Critical; five pre-existing Moderate findings remain in Next/PostCSS and Prisma dev tooling
- `TASK_MANIFEST=coordination/tasks/M2-GPT-AUTH-CONTRACT.md TASK_BASE=18a26dd npm run check:scope`: 7 changed files, all within lease

## Independent review closure

DeepSeek review `fc4ad81` returned `APPROVE` with five Medium and three Low findings. Correction
`3ff020c` closes all eight:

- adds AuthorizationContext/TicketDataScope valid and invalid coverage;
- adds successful LoginResult and strict credentials/password parsing coverage;
- asserts non-ADMIN CHANGE_ROLE denial and NON_PPKS ticket scope;
- deep-freezes and mutation-tests every permission-matrix level;
- pins `bcryptjs` exactly;
- adds inactive/missing-expiry/invalid-type session rejection tests;
- rejects C1 redirect controls in addition to C0/DEL;
- adds and tests the generic `SessionInvalidResultSchema` required by the cross-lane decision.

## Contract decisions requiring reviewer attention

1. Auth.js Credentials does not persist data automatically. The implementation task must prove database-session creation/revocation and may need a custom session path; JWT fallback remains forbidden.
2. Every active role may change only its own password; ADMIN may reset any user password. This exception does not grant SATGAS_PPKS general User-module access.
3. Permission results encode ownership and data scope. The future `authorize()` implementation must enforce both and must not treat `allowed: true` alone as sufficient.
4. Proxy remains optimistic redirect UX. Database-backed validation is required in the DAL, actions, route handlers, downloads, and exports.

## Untested areas and risks

- Auth.js remains beta. No runtime handler or Credentials flow exists yet, so installation compatibility is proven only by typecheck/build, not authentication E2E.
- The Prisma adapter has not yet been exercised against the generated Prisma 7 client or a MariaDB staging database.
- Password common-list/email-equality policy, rate limiting, cookie flags, session creation, transactional revocation, CSRF, and inactive-user rejection belong to subsequent implementation tasks.
- Five Moderate dependency advisories remain; no force fix was applied because npm proposes incompatible platform downgrades.

## Primary external references checked

- https://authjs.dev/getting-started/installation?framework=next-js
- https://authjs.dev/getting-started/authentication/credentials
- https://authjs.dev/getting-started/adapters/prisma
