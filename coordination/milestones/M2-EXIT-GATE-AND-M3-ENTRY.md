# M2 Exit Gate and M3 Entry Contract

Status: **M2 active; M3 blocked**

This is the only transition rule from M2 to M3. A completed design document or passing unit
suite alone does not open M3. The coordinator opens M3 only after every gate below has durable
evidence on `integration/m2-security`.

## 1. Immediate parallel work

Claude and DeepSeek may work simultaneously because their revision leases do not overlap:

- Claude: `coordination/tasks/M2-CLAUDE-AUTH-UX-SPEC-REVISION.md`
- DeepSeek: `coordination/tasks/M2-DEEPSEEK-SECURITY-TEST-DESIGN-REVISION.md`

Each worker rebases its task branch onto `coordination/m2-revision-assignment`,
changes only `allowed_paths`, commits, updates its own handoff, pushes, and stops. Neither
worker reviews, merges, or begins a second task without a new manifest.

## 2. Remaining M2 delivery sequence

After the two revisions merge, the integrator creates fresh, non-overlapping manifests in
this order:

1. GPT implements Auth.js Credentials database sessions, login rate limiting, timing-equalized
   rejection, revocation, password change, safe redirect, layered authorization, and CSRF.
2. DeepSeek converts the now-unblocked auth cases into executable integration/adversarial
   tests against the frozen runtime API.
3. Claude implements the login/password-change/session UX only after the runtime contract and
   message keys are leased; Claude does not implement security decisions.
4. GPT implements the remaining shared M2 capabilities: optimistic locking, public/private
   upload boundaries, PPKS AES-GCM primitives, HMAC tokens/IP, annual sequence, outbox worker,
   sanitizer, and redirect safety.
5. DeepSeek enables and executes each security case only after its dependency is merged.
6. Claude performs the read-only accessibility/session-flow review; critical findings return
   to the owning writer.

## 3. M2 exit checklist

All items are mandatory:

- Auth.js uses opaque database sessions for eight hours; no JWT fallback.
- Unknown, wrong-password, and inactive login paths are enumeration- and timing-resistant.
- Session revocation, password change, role change, and inactive-user checks pass PostgreSQL
  integration tests.
- Permission matrix, ownership, ticket scope, PPKS isolation, and IDOR negative tests pass.
- CSRF, safe redirect, upload spoof/traversal/bomb, crypto tamper, HMAC, rate-limit, CSV,
  annual-sequence concurrency, and outbox idempotency tests pass.
- PPKS/private content never persists in public storage, logs, email, analytics, RSC payloads,
  or client draft storage.
- ID/EN/AR login UX, Arabic RTL, keyboard, focus, and screen-reader acceptance pass.
- Fresh PostgreSQL migration + double seed remains idempotent and the full integration suite is
  green.
- VPS-dependent SMTP, worker scheduling, and persistent public/private filesystem capabilities have
  staging evidence before M2 is declared fully accepted; local assumptions are not enough.
- All worker handoffs are committed, reviewed by another model, merged one at a time, and the
  final integration head passes full CI.

## 4. M3 activation

Only the GPT integrator may change this document's status to `M2 accepted; M3 ready`, create
the M3 integration branch, and issue M3 task manifests with a frozen base SHA. Until then:

- do not create M3 feature branches;
- do not lease M3 source paths;
- do not implement Post/Media/Tiptap/public archive work;
- do not reinterpret an M2 follow-up as M3 work.

When opened, M3 remains the Post + Media + i18n reference vertical slice defined in
`docs/24-implementation-plan-multi-model.md`; it is not a place to finish missing M2 security.
