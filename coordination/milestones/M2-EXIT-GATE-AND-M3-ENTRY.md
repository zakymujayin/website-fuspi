# M2 Exit Gate and M3 Entry Contract

Status: **M2 platform code complete; M2 acceptance blocked; M3 blocked**

This is the only transition rule from M2 to M3. The durable evidence audit is
`coordination/reviews/M2-EXIT-GATE-EVIDENCE-gpt.md`. A passing suite does not open M3 when
required route-level or staging evidence is absent.

## 1. Delivered platform baseline

The following M2 platform capabilities are merged on `integration/m2-security`:

- PostgreSQL migration and Prisma platform contract;
- opaque Auth.js database sessions, credential rejection, revocation, password/session UX,
  layered authorization contracts, CSRF protection, safe login destinations, and shared rate
  limiting;
- AES-GCM/HMAC primitives, content/CSV sanitization, public/private upload boundaries, and
  ciphertext-only PPKS attachment storage;
- optimistic locking, annual sequence and SLA/Holiday primitives;
- transactional outbox worker, SMTP adapter/runner, and lockfile correction;
- safe one-hop redirect registry with serialized PostgreSQL writes.

The obsolete revision sequence previously recorded here is complete. Historical manifests with
`ready` status are design/revision records; later merged runtime or takeover manifests are the
delivery authority. They must not be treated as active work unless the integrator issues a new
lease.

## 2. Evidence states

- **PASS** means the exact platform invariant has executable evidence on the integration head.
- **PARTIAL** means the platform primitive is tested but the final feature route/action does not
  exist yet; the route-level adversarial case remains mandatory in its owning milestone.
- **BLOCKED** means evidence requires external staging, manual specialist review, or an
  unimplemented feature boundary. A blocked item must never be relabeled as passed from local
  assumptions.

## 3. M2 exit checklist

### Passing platform gates

- Opaque eight-hour database sessions, credential timing/equality, login throttling, inactive
  rejection, password/role/deactivation revocation, and safe auth redirect: **PASS**.
- Shared authorization matrix and server-side auth boundary: **PASS at contract/platform level**.
- CSRF enforcement on the implemented auth mutation boundaries: **PASS**.
- Upload type/size/pixel/path/storage boundaries, AES-GCM tamper detection, key rotation, HMAC,
  persistent rate limiting, CSV formula escaping, annual-sequence concurrency, outbox locking,
  retry/idempotency primitives, sanitizer, and redirect safety: **PASS at platform level**.
- ID/EN/AR auth UX, Arabic RTL, keyboard order, focus behavior, mobile overflow, generic errors,
  and client-side credential privacy: **PASS in Playwright**.
- Fresh PostgreSQL migration, double seed, lint, typecheck, unit, integration, and production
  build: **PASS in GitHub Actions**.

### Mandatory evidence not yet complete

- Post ownership mutation IDOR belongs to the M3 Post vertical slice and has no route/action to
  attack yet: **PARTIAL; mandatory M3 gate**.
- Ticket query scoping, PPKS detail/download isolation, TicketAccessLog, PPKS CSV/email privacy,
  and ticket+outbox atomic creation belong to the M4 sensitive ticket slice: **PARTIAL; mandatory
  M4 blocker before that slice merges**.
- Final upload endpoint rollback/orphan cleanup belongs to the M3 Media slice: **PARTIAL;
  mandatory M3 gate**.
- CSRF coverage for future Post, Media, ticket, booking, and user-management mutations remains
  mandatory when those boundaries are introduced: **PARTIAL; per-feature merge blocker**.
- Automated axe coverage and a manual screen-reader pass for the auth flow are not recorded:
  **BLOCKED until evidence exists**.
- VPS SMTP delivery, five-minute worker scheduling, persistent public/private filesystem,
  backup/restore, and secret/permission configuration have no staging evidence:
  **BLOCKED on deployment environment**.
- The milestone requirement for an independent final threat-surface review has not been
  satisfied for the consolidated M2 head: **BLOCKED until a fresh read-only review is recorded**.

## 4. Required closure sequence

Completed: the threat registry now records `covered`, `partial`, or `blocked`, links evidence,
and binds every future route-level case to M3 or M4 without claiming it is executable.

Remaining sequence:

1. Run a fresh independent, read-only threat-surface review against the consolidated integration
   head. GPT fixes only confirmed Critical/High defects under new manifests.
2. Record automated axe plus manual keyboard/screen-reader evidence for the implemented auth flow.
3. Record VPS staging evidence for SMTP, scheduler, persistent storage, backup/restore, and
   production-like secrets/permissions.
4. Re-run the complete integration and browser suites at the final M2 head and attach the CI URL.

These are closure activities, not authorization to add M3 or M4 feature code.

## 5. M3 activation

Only the GPT integrator may change this document's status to `M2 accepted; M3 ready`, create the
M3 integration branch, and issue M3 task manifests with a frozen base SHA. Until every M2 closure
item above has durable evidence:

- do not create M3 feature branches;
- do not lease M3 source paths;
- do not implement Post/Media/Tiptap/public archive work;
- do not reinterpret an M2 closure item as permission to build a later feature.

When opened, M3 remains the Post + Media + i18n reference vertical slice defined in
`docs/24-implementation-plan-multi-model.md`.
