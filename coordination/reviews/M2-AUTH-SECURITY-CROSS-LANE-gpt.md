# M2 — GPT Cross-Lane Review: Auth UX and Security Test Design

## Metadata

- Reviewer: GPT Platform / Integrator
- Integration branch: `integration/m2-security`
- Reviewed branches:
  - `ai/claude/m2-auth-ux-spec` at `9817ebc`
  - `ai/deepseek/m2-security-test-design` at `6648c06`
- Verdict: **revision required; do not merge either branch yet**

This document is the binding platform answer to the questions raised by Claude and the
semantic gaps found in DeepSeek's test plan. It does not activate M3. The revision tasks
named below remain M2 work.

## A. Binding authentication decisions

### A1. Login enumeration and rate limiting

The login failure surface has only these public failure codes:

- `INVALID_CREDENTIALS` for unknown email, wrong password, inactive user, and deleted user;
- `TRY_AGAIN_LATER` after the same rate-limit threshold has been reached;
- `AUTH_UNAVAILABLE` for a sanitized system failure.

The rate-limit counter **must be incremented for unknown email, inactive user, and wrong
password alike**. The compound key is derived from HMAC(normalized email) and HMAC(client
IP); deriving it must not query whether the user exists. The fifth/sixth-attempt behavior,
status, response shape, headers, and public copy must be the same for an existing and a
non-existing account. No remaining-attempt count is exposed.

### A2. Timing-equalized credential rejection

The Credentials implementation must always perform one `bcrypt.compare`-equivalent
operation at cost 12 after the user lookup:

- found user: compare against that user's stored hash;
- unknown user: compare against a valid constant dummy bcrypt hash generated with cost 12;
- inactive user: still perform the real hash comparison, then return the same public failure.

Do not generate the dummy hash per request. Keep one valid non-secret hash constant in the
server module. Tests compare distributions with a documented tolerance; they must not claim
perfect nanosecond equality.

### A3. Session invalidation and unsaved work

`proxy.ts` remains optimistic navigation UX and is never the authorization boundary. Every
loader, Server Action, Route Handler, download, and export revalidates the database session
and active user.

- Server Actions and APIs return a typed, sanitized session-invalid result where the caller
  can safely handle it. They never return raw Auth.js or database errors.
- Server-rendered protected navigation may redirect to login after the same server-side
  validation.
- For a normally expired session on a non-sensitive CMS form, a later UI task may preserve
  unsaved state **in memory only** behind a re-authentication lock. It must not promise
  recovery until that behavior has an executable test.
- For a revoked session, inactive user, role change, or permission loss, security wins:
  protected data is locked immediately and the UI must not offer “copy my work”.
- PPKS/private content always uses the strict path: hard lock, no client draft, no copy
  escape hatch, no local/session storage persistence.
- When the platform cannot prove that an invalid session is merely expired, it uses the
  stricter revoked-session behavior.

The login page may use one generic “session ended, sign in again” message. It does not need
to reveal the revocation reason.

### A4. Mandatory password change

The frozen `PasswordChangeInputSchema` includes `currentPassword`, `newPassword`, and
`confirmPassword`. Claude's UX specification must include all three fields. The current
password is masked, never logged, and is revalidated server-side. A successful change clears
`mustChangePassword` and revokes every prior session transactionally before a new session is
issued or the user signs in again.

### A5. M2/M3 boundary

Auth UX acceptance, login enumeration, redirect safety, session revocation, upload/security
primitives, and their executable adversarial tests are all **M2**. References in either
handoff that assign these tests or fixes to M3 are incorrect and must be changed to M2.

M3 remains the Post + Media + i18n reference vertical slice. No M3 branch, manifest, or path
lease is active.

## B. Required Claude corrections

Claude must complete `M2-CLAUDE-AUTH-UX-SPEC-REVISION`:

1. incorporate A1–A5 without changing platform code or inventing new security behavior;
2. add the current-password field and accessible ID/EN/AR intent;
3. replace the unconditional “preserve/copy draft after revocation” requirement with A3;
4. change every M3 reference for auth implementation/testing to M2;
5. keep Arabic copy labeled as intent pending native-speaker review;
6. update its durable handoff and run the revision manifest's scope check.

## C. Required DeepSeek corrections

DeepSeek must complete `M2-DEEPSEEK-SECURITY-TEST-DESIGN-REVISION`:

1. add an explicit execution-readiness state and a validator/meta-test that rejects a case
   marked ready when its dependency is unavailable;
2. keep every current case blocked until its implementation dependency is merged;
3. replace all FUSPI/production-like fixture emails with reserved test domains and make the
   PII guard reject `@fuspi.uinbanten.ac.id`;
4. test equal rate-limit behavior for existing, non-existing, and inactive accounts;
5. correct the outbox tampering case: changing `idempotencyKey` cannot be rejected by the
   unique constraint merely because the old key exists;
6. freeze guessed PPKS detail access to one result: `404`, no detail payload, with a denied
   access audit entry; aggregate statistics use a separate authorized query;
7. replace ambiguous alternatives such as “403 or redacted” with one deterministic outcome;
8. keep all follow-ups in M2 and update the durable handoff.

## D. Merge verdict

The two revision branches may enter the merge queue only when:

- their task-specific scope checks pass;
- all manifest acceptance commands pass;
- the files contain no FUDA identity or production PII;
- GPT verifies the revised documents against this decision;
- worker branches are committed and pushed with updated handoffs.
