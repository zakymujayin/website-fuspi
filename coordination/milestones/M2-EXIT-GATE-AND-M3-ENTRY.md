# M2 Exit Gate and M3 Entry Contract

Status: **M2 development acceptance candidate; M3 pending final merged CI**

This is the only transition rule from M2 to M3. The durable evidence audit is
`coordination/reviews/M2-EXIT-GATE-EVIDENCE-gpt.md`. M2 development acceptance requires the
merged platform/security/accessibility suites to pass. VPS operations and human assistive-
technology sign-off remain mandatory deployment/go-live gates, but do not block building M3.

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
- Login ID/EN/AR, password change, and admin WCAG A/AA axe scans: **PASS with zero violations**.
- Consolidated security review: **PASS with zero confirmed Critical/High defect**.
- Dependency audit: **PASS with zero known vulnerabilities after narrow pinned overrides**.
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
- VPS SMTP delivery, five-minute worker scheduling, persistent public/private filesystem,
  backup/restore, and secret/permission configuration have no staging evidence:
  **BLOCKED for deployment/go-live; not an M3 development blocker**.
- Human NVDA/VoiceOver listening acceptance requires a person and staging browser/device:
  **BLOCKED for deployment/go-live; automated semantics, keyboard, focus, and axe pass**.

## 4. Required closure sequence

Completed: the threat registry now records `covered`, `partial`, or `blocked`, links evidence,
and binds every future route-level case to M3 or M4 without claiming it is executable.

Completed locally:

1. Consolidated, separately leased integrator security review found no Critical/High defect.
2. Automated axe, keyboard, focus, live-region, RTL, mobile, and semantic screen-reader contracts
   pass for the implemented auth/admin flow.
3. Bcrypt rejection timing distributions overlap within the recorded tolerance.
4. Lint, typecheck, Prisma validation, 380 unit tests, 54 PostgreSQL integration tests,
   production build, 170 Playwright tests, and dependency audit pass locally.

Remaining transition action: merge this closure task and require the final integration CI to pass.
VPS operations and human NVDA/VoiceOver then remain tracked under the deployment/go-live gate.

## 5. M3 activation

Only the GPT integrator may change this document's status to `M2 development accepted; M3 ready`,
create the M3 integration branch, and issue M3 task manifests with a frozen base SHA. Until the
closure task is merged and its final integration CI is green:

- do not create M3 feature branches;
- do not lease M3 source paths;
- do not implement Post/Media/Tiptap/public archive work;
- do not reinterpret an M2 closure item as permission to build a later feature.

When opened, M3 remains the Post + Media + i18n reference vertical slice defined in
`docs/24-implementation-plan-multi-model.md`.
