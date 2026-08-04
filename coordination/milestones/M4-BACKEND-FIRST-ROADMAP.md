# M4–M6 backend-first roadmap

Owner direction: finish the complete FUSPI v1 backend before opening the
remaining UI implementation. This roadmap supersedes the earlier expectation
that all M4 feature families progress through three coding lanes in parallel;
worktree, lease, contract, test, integration, and human-to-main rules remain in
force.

## Completion contract

“Backend complete” means every included capability has:

1. a frozen strict Zod contract;
2. authenticated/authorized or intentionally public domain queries/mutations;
3. transactional and optimistic/concurrency behavior where required;
4. a safe transport for browser/public/private operations;
5. PostgreSQL integration proof and adversarial proof proportional to risk;
6. audit/revision/outbox/retention behavior where required;
7. ID-first translation and safe ID fallback for public reads;
8. no PII, token, ciphertext metadata, storage key, or technical-error leak;
9. a committed handoff and serial merge to `integration/m4-features`; and
10. final fresh-database, full-suite, build, migration/seed, and VPS-readiness
    evidence.

Schema presence alone is never completion.

## Execution rules

- GPT is the backend writer and integrator for this owner-directed delivery
  mode. Each item still receives its own bounded manifest and path lease.
- Contract and corrective-schema tasks land before their implementation tasks.
- Existing accepted migrations are immutable. Any required database correction
  is additive.
- Claude finishes the already-active Page ADMIN UI. No subsequent UI begins
  until the relevant backend group and its contract catalog are accepted.
- Review is batched per backend group. Security-critical PPKS, booking, privacy,
  and private-storage evidence remains immediate.
- Course/Curriculum, bibliographic research expansion, SILA API/SSO, PMB
  workflows, historical import, and newsletter campaigns remain outside v1.

## Ordered waves

### B0 — Shared CMS and operational contracts

1. `M4-GPT-BACKEND-V1-INVENTORY` — evidence matrix and this roadmap.
2. `M4-GPT-CMS-SHARED-CONTRACTS` — pagination/filter/locale/translation,
   revision/audit result shapes, reorder, public safe media/document views, and
   deterministic transport errors.
3. `M4-GPT-ADMIN-USERS-TAXONOMY` — ADMIN user management with self-lockout
   prevention plus Category/Tag CRUD and lookup.
4. `M4-GPT-PUBLIC-PAGE-QUERY` — published Page hierarchy/detail safe read for
   the later public renderer.

Gate: contracts compile; Auth/Post/Media/Page regressions remain green; no
shared selector or Prisma error crosses a trust boundary.

### B1 — Academic and institutional CMS

5. `M4-GPT-ACADEMIC-DIRECTORY-CONTRACTS` — StudyProgram, Lecturer, Staff,
   Research, CommunityService, Unit, and their relation/public-view contracts.
6. `M4-GPT-STUDY-PROGRAM-DOMAIN` — enforce exactly IAT/IH/AFI/SAA/TASPI code
   order, ID publication requirement, documents/logo, governance and public
   reads.
7. `M4-GPT-PEOPLE-DIRECTORY-DOMAIN` — Lecturer/Staff CRUD, safe public fields,
   active filtering, media, and import validation/dry-run without external sync.
8. `M4-GPT-RESEARCH-PKM-UNIT-DOMAIN` — CRUD, relations, filters and public
   reads; bibliographic phase-2 fields are not expanded.

Expected browser surface: versioned ADMIN list/detail/command endpoints and
trusted public list/detail query modules for each resource family.

Gate: parent+translations transact atomically; ID mandatory; inactive/private
records never enter public views; imports are formula-safe and rollback cleanly.

### B2 — Public content, files, and homepage data

9. `M4-GPT-PUBLIC-CONTENT-CONTRACTS` — Service, Partnership, Scholarship,
   Achievement, StudentActivity, Document, Album, Event, FAQ, Testimonial.
10. `M4-GPT-PUBLIC-CONTENT-DOMAINS` — CRUD/public reads, ordering, expiry,
    publication consent, safe PDF/media references and CSV exports.
11. `M4-GPT-HOME-NAV-CONTRACTS` — MenuItem, QuickLink, ExternalLink,
    HomeSlider, HomeSection, Statistic, SiteSetting and exhaustive public home
    snapshot.
12. `M4-GPT-HOME-NAV-DOMAINS` — transactional reorder/hierarchy, URL safety,
    singleton settings, revision/audit, ID/EN/AR home data and invalidation.
13. `M4-GPT-REDIRECT-PROTECTED-FILE-TRANSPORT` — redirect administration/hit
    behavior, authorized private downloads, safe public document metadata, and
    storage reference/orphan reporting.

Gate: no home copy or institutional claims are seeded; every visible section
comes from valid CMS data; referenced media cannot be deleted; private storage
is never directly addressable.

### B3 — Contact, survey, admission, discovery, and feedback

14. `M4-GPT-FORM-SURVEY-CONTRACTS` — contact submission, versioned survey,
    privacy-notice reference, rate-limit and report/export contracts.
15. `M4-GPT-FORM-SURVEY-DOMAINS` — public submission, ADMIN inbox/report,
    encrypted/minimal outbox payloads, retention and formula-safe export.
16. `M4-GPT-ADMISSION-DOMAIN` — source/year/owner/review/expiry-enforced CMS and
    public hub query without implementing PMB workflows.
17. `M4-GPT-DIRECTORY-SEARCH-DOMAIN` — aggregate public-only search/directory,
    locale fallback, bounded snippets and explicit private-model exclusion.
18. `M4-GPT-CONSENT-FEEDBACK-RUM` — versioned consent, Page feedback, and
    aggregate non-PII web-vital/goal-event intake respecting denial.

Gate: hostile input/rate-limit/privacy tests pass; search cannot query tickets,
bookings, submissions, users, tokens, or private storage.

### B4 — Ticket and PPKS complete workflow

19. `M4-GPT-TICKET-MUTATION-CONTRACTS` — general/PPKS create, track, reply,
    assign, status/priority, close, attachment, export and aggregate boundaries.
20. `M4-GPT-TICKET-PUBLIC-WORKFLOW` — anonymous create, annual number, one-time
    token display, POST exchange to 30-minute HttpOnly cookie, tracking/reply,
    rate limiting and outbox.
21. `M4-GPT-TICKET-STAFF-WORKFLOW` — PETUGAS general-ticket mutations,
    assignment, history/SLA, public versus internal replies and safe export.
22. `M4-GPT-PPKS-WORKFLOW` — SATGAS-only mutation/detail/search/download,
    encrypted fields/attachments, denied and allowed access logging, generic
    errors, retention hold and aggregate-only ADMIN view.
23. `M4-GPT-TICKET-TRANSPORT-HARDENING` — all routes/downloads, CSV safety,
    outbox privacy, IDOR/enumeration/aggregate/RSC/log/error adversarial suite.

Gate: zero Critical/High finding; every existing-versus-missing probe is
non-disclosing; ADMIN/PETUGAS cannot open PPKS; PostgreSQL and encrypted-file
tests pass. Institutional PPKS approval remains a go-live gate.

### B5 — Room and booking complete workflow

24. `M4-GPT-BOOKING-CONTRACTS` — Room/hours/blackout, availability, submit,
    tracking/cancel, approval/rejection/change, calendar and Event publication.
25. `M4-GPT-ROOM-DOMAIN` — ADMIN CRUD, translations, operating hours,
    blackout, capacity/buffer and public safe room/availability reads.
26. `M4-GPT-BOOKING-PUBLIC-WORKFLOW` — validated Jakarta-local submission,
    annual number, token/cookie tracking, cancellation, private request letter,
    rate limit and outbox.
27. `M4-GPT-BOOKING-APPROVAL-CONCURRENCY` — Serializable overlap transaction,
    P2034 retry, buffer/blackout/operating-hours/capacity checks, auto-approval,
    history and idempotent Event publication.
28. `M4-GPT-BOOKING-TRANSPORT-HARDENING` — ADMIN/PETUGAS APIs, public calendar,
    exports, IDOR/privacy tests and real parallel-commit PostgreSQL proof.

Gate: two conflicting approvals can never commit; private events expose only
“Terpakai”; timezone and cancellation boundaries are proven.

### B6 — Governance, alert, status, privacy, and accessibility

29. `M4-GPT-GOVERNANCE-CONTRACTS` — ownership/review/expiry, translation stale,
    glossary, revision diff/restore and weekly digest.
30. `M4-GPT-GOVERNANCE-DOMAIN` — cross-resource due-state queries, owner
    changes, safe restore-as-new-revision, glossary and digest idempotency.
31. `M4-GPT-ALERT-STATUS-DOMAIN` — scheduled alerts, endpoint/incident/update
    timeline, incident-to-alert transaction and public cache-safe reads.
32. `M4-GPT-PRIVACY-CONTRACTS` — notices, consent, tracked data requests,
    verification, incidents, expiring exports, retention preview/approval.
33. `M4-GPT-PRIVACY-DOMAIN` — ADMIN-only sensitive workflow, token tracking,
    private export/download audit, retention holds and two-ADMIN disposition.
34. `M4-GPT-ACCESSIBILITY-DOMAIN` — issue management and public alternative
    format request/tracking, separate from PDP requests.

Gate: permission tests precede every private query; PPKS hold overrides erasure;
expired export cannot download; alert schedules and revision restore are proven.

### B7 — Operations, VPS, and backend freeze

35. `M5-GPT-OUTBOX-OPS` — authenticated worker status/retry, scheduler/systemd
    contract, health endpoint, sanitized telemetry and SMTP integration proof.
36. `M5-GPT-SEED-CONTENT-READINESS` — fresh migrate/seed, idempotency,
    structural completeness, five-program identity and no invented content.
37. `M5-GPT-BACKEND-CROSS-MODULE-HARDENING` — API catalog, navigation data
    contract, broken-link/media-reference checks, full security regression and
    performance bounds.
38. `M6-GPT-VPS-DEPLOY-RESTORE` — PostgreSQL/storage/keys/outbox/reverse-proxy
    deployment, backup and isolated restore drill, disk thresholds and rollback.
39. `M6-GPT-BACKEND-FINAL-ACCEPTANCE` — fresh database, every automated suite,
    build, migration/seed, SMTP, private storage, concurrency, PPKS, privacy,
    health and durable evidence report.
40. `M6-GPT-FRONTEND-CONTRACT-FREEZE` — publish the exact route/API/query/error
    catalog and fixtures Claude will use for all remaining UI.

Gate: backend final acceptance is green and all unresolved institutional items
are explicitly classified as go-live blockers rather than hidden code TODOs.

## Integration cadence

Each numbered task is implemented and tested on a GPT task branch, then merged
serially to `integration/m4-features`. Full unit/integration/build runs occur at
the end of every wave, while focused PostgreSQL/security tests run on every
task. The branch moves to M5/M6 naming only when the corresponding functional
boundary is genuinely reached; `main` remains human-controlled.

## UI handoff

The final Claude prompt must cite the frozen API catalog and accepted backend
SHA. It must not ask Claude to infer missing endpoints, fabricate dashboard
statistics, bypass auth with mocks, or hardcode institutional content. Page
ADMIN UI is the sole current exception because its backend contract and
implementation are already accepted.
