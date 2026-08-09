# M4 backend v1 inventory

Date: 2026-08-04

Task: `M4-GPT-BACKEND-V1-INVENTORY`

Base: `ffb0e6cc6d44bf8462692f00e62d81e913eb509c`

Auditor: GPT

## Executive result

FUSPI does **not** yet have a complete v1 backend. The PostgreSQL design is
broad and materially complete, but model presence is not runtime capability.
The accepted implementation is concentrated in Auth, Post, Media, Page, shared
security/storage/outbox primitives, and read isolation for Ticket/PPKS.

Repository inventory on the task base:

- 112 Prisma models, including 33 translation models, and 37 enums;
- one canonical PostgreSQL initialization migration plus one corrective ticket
  enum migration;
- 9 API route files;
- 11 shared contract files;
- 5 feature-domain files and 44 `src/lib` TypeScript files;
- 81 test files and 12 E2E files; and
- a 150-line structural seed covering only the initial ADMIN, FUSPI singleton,
  five study-program shells, base categories, home-section shells, statistics,
  quick links, placeholder media, and one slider.

The current migrations can materialize the full schema on a fresh PostgreSQL
database. They do not prove that every table has validation, authorization,
transactions, queries, mutations, API transport, privacy controls, or usable
operational workflows.

## Scope boundary

Included in backend v1:

- the custom CMS and public read models described by the documentation;
- Auth/RBAC, public/private/PPKS storage, audit/revision, outbox, rate limiting,
  ticket/PPKS, booking, governance, privacy, accessibility, search/directory,
  admission information, feedback, and operational readiness; and
- SILA phase 1 as configured HTTPS deep links only.

Explicitly excluded:

- Course/Curriculum structured catalog and bibliographic research expansion;
- SILA API consumption and SILA SSO;
- PMB application/payment/document workflows;
- historical-site content/media/URL import as a v1 gate;
- newsletter delivery campaigns, chatbot, virtual tour, and a full alumni
  module; and
- invented institutional content, contacts, statistics, policy, or SILA URL.

## Evidence scale

- **Accepted**: contract/domain/transport and relevant PostgreSQL/security proof
  exist.
- **Partial**: useful primitives or one boundary exist, but the required v1
  workflow is not end-to-end.
- **Schema only**: model/migration exists without production domain/API.
- **Operational gate**: primarily deployment, policy, or external evidence;
  code alone cannot close it.

## Capability matrix

| Capability and principal models | Schema/migration | Runtime/API evidence | State | Missing backend work |
| --- | --- | --- | --- | --- |
| Auth/session (`User`, `Account`, `Session`, `VerificationToken`, `Authenticator`) | Present | Credentials, Auth.js database sessions, password change, revocation, authorization, CSRF, rate limit, adversarial PostgreSQL tests | Accepted core | ADMIN user list/create/edit, safe self-lockout prevention transport, and audit-facing user management |
| Post, translations, category/tag relations | Present | Post contract, mutations, public queries, ADMIN transport/API, Media cover, revisions/audit, ownership, PostgreSQL/security/E2E | Accepted reference slice | Generic Category/Tag administration and cross-content taxonomy lookup |
| Media | Present | Validated public/private upload primitives, ADMIN library transport/API, safe projection, persistence and adversarial tests | Accepted public/admin core | Protected generic private download surface, reference inventory, and operational orphan/quota reporting |
| Page and translation hierarchy | Present | Domain CRUD/query, ADMIN contract/transport/API, optimistic locking, revision/audit and PostgreSQL/adversarial proof | Accepted backend | Public Page query/route contract is still needed for later UI; Page ADMIN UI is Claude-owned |
| Audit/revision (`ActivityLog`, `ContentRevision`) | Present | Shared safe audit and revision primitives used by Post/Page | Partial | Cross-resource revision list/diff/restore, retention, governance queries, and coverage for all publishable resources |
| Study programs (`StudyProgram`, translation, Post/Album pivots) | Present; five shells seeded in required order | No production domain or API | Schema only | Strict CRUD, ID-first translation workflow, logo/document relations, governance, public lookup, five-code invariants |
| People (`Lecturer`, `Staff`, translations) | Present | No production domain or API | Schema only | ADMIN CRUD/import validation, public safe directory/detail queries, media links, active filtering, institutional-email privacy |
| Research and community service plus lecturer pivots | Present | No production domain or API | Schema only | CRUD, filters, relations, documents, public list/detail; v1 excludes bibliographic expansion/import APIs |
| Units and services (`Unit`, `Service`, translations) | Present | No production domain/API | Schema only | CRUD, category/link validation, public listing/detail, governance, and SILA configured-link enforcement |
| Partnerships, scholarships, achievements, student activities | Present | No production domain/API | Schema only | CRUD/public queries, expiry rules, media/document relations, safe CSV export, filters, governance |
| Documents and albums (`Document`, `Album`, photos/pivots) | Present | Storage primitive exists; no resource domain/API | Schema only | CRUD, PDF/public-media safety, album ordering, reference-safe delete, public list/detail/download metadata |
| Navigation/home (`MenuItem`, `QuickLink`, `ExternalLink`, `HomeSlider`, `HomeSection`, `Statistic`) | Present; structural home shells partly seeded | No production domain/API | Schema only | Transactional reorder/hierarchy, URL safety, ID/EN/AR translations, exhaustive home snapshot query, revision/audit, cache invalidation |
| Site settings | Present; singleton seeded | No production domain/API | Schema only | Singleton update/read, branding/contact/social validation, media relations, revision/audit, safe public projection |
| Event/agenda | Present | No production domain/API | Schema only | CRUD/public queries, expiry/timezone, unique Booking publication, governance, safe calendar feed |
| FAQ and testimonial | Present | No production domain/API | Schema only | CRUD/public queries, publication consent for testimonial, ordering/active filters, translation fallback |
| Contact submissions (`FormSubmission`) | Present | Shared rate limit/outbox available; no workflow/API | Schema only | Honeypot/rate limit, safe create, privacy-notice binding, ADMIN inbox/status/export, outbox notification, retention/audit |
| Structured survey (`SurveyDefinition`, `SurveyQuestion`, `SurveySubmission`, `SurveyAnswer`) | Present | No production domain/API | Schema only | Versioned definitions, anonymous submission, validation, rate limit, aggregate reports and privacy-safe export |
| Ticket/PPKS (`Ticket`, reply, attachment, access log/history) | Present | Frozen contract, query-level isolation, AES-GCM/HMAC/PPKS storage/SLA/sequence/outbox primitives and strong read-boundary tests | Partial, security-critical | Public create/track cookie exchange/reply; staff/Satgas mutations; attachment upload/download; access audit on every action; SLA timeline; notification; CSV/aggregate; API routes |
| Booking (`Room`, translations/hours/blackout, `Booking`, history) | Present | Shared annual sequence, HMAC, storage, outbox primitives only | Schema only, critical | Room CRUD; availability; submit/track/cancel; Serializable approve/auto-approve with P2034 retry and overlap/buffer/blackout proof; calendar and Event publication APIs |
| Shared rate limit and notification outbox | Present | Persistent rate limiting, encrypted payload preparation, SMTP renderer/sender, worker claim/retry/idempotency and PostgreSQL proof | Accepted primitive | Authenticated operational status/retry surface, scheduler/systemd wiring, monitoring, and real SMTP proof |
| Redirect registry | Present | Safe graph/save/resolve primitive with PostgreSQL tests | Partial | ADMIN transport, hit accounting behavior, public integration, governance/export, and crawl verification |
| Glossary and translation governance | Present | No runtime | Schema only | Glossary CRUD; source-version stale propagation; review/publish transitions; fallback rules and dashboard queries |
| Global alert and service status (`SiteAlert`, endpoint/incident/update) | Present | No runtime/API | Schema only | Scheduled safe read, CRUD/timeline, incident-to-alert transaction, cache behavior, manual status management |
| Privacy/PDP (`PrivacyNotice`, `ConsentRecord`, `DataSubjectRequest`, `DataIncident`, `DataExportLog`, `RetentionPolicy`) | Present | Crypto/HMAC/private storage primitives exist; no workflow | Schema only, security-critical | Versioned notice, consent, tracked request, verification state, private expiring export, incident register, retention preview/two-ADMIN approval, audit and authorization |
| Accessibility governance (`AccessibilityIssue`, `AccessibilityRequest`) | Present | No runtime/API | Schema only | ADMIN issue workflow, public alternative-format request/tracking, rate limit, ownership and audit |
| Admission information | Present | No runtime/API | Schema only | Source/year/owner/review/expiry-enforced CRUD and safe public hub query; no PMB workflow |
| Directory and site search | Uses existing public resource models | Post public query only; no aggregate search/directory boundary | Missing runtime | Public-only aggregate search, type filters, locale fallback, no private tables, query rate/size bounds, safe snippets |
| Page feedback and analytics/RUM (`PageFeedback`) | Present | No runtime/API | Schema only | Consent-aware sanitized helpful feedback and non-PII aggregate CWV/event intake; token/sensitive URL exclusion |
| Subscriber | Present | Newsletter explicitly outside v1 | Not required v1 | No campaign or subscription endpoint in this delivery |
| SILA phase 1 | `Service.externalUrl` can hold configured public link | No dedicated contract check | Partial configuration boundary | Require `NEXT_PUBLIC_SILA_URL`, HTTPS/allowlist validation, no iframe/session/database sharing, safe aggregate outbound event only |
| Deployment, backup, health and restore | Schema/build tooling exists; no complete VPS evidence | Development tests only | Operational gate | VPS env contract, migration/seed runbook, systemd/outbox cron, reverse proxy/private storage, health check, backup/restore drill, TLS/CSP/monitoring and rollback proof |

## Current HTTP surface

The nine route files currently expose Auth.js, credential login, password
change, ADMIN Post, ADMIN Media/upload, and ADMIN Page. There are no production
HTTP transports yet for academic CMS resources, home/navigation, forms,
survey, tickets, booking, governance, privacy, accessibility, directory, or
search.

Server Components may call trusted domain queries directly later, but every
browser mutation, public anonymous workflow, private download, and external
operational callback still requires an explicit validated and authorized
boundary.

## Schema and migration conclusion

The canonical PostgreSQL migration represents the 112-model design and the
corrective migration changes ticket enums without rewriting the accepted
initial migration. No new table should be added merely because an
implementation is missing. Each future task must first prove whether the
existing model supports the documented invariant; only a GPT contract task may
add a corrective migration.

The initial seed is structural, synthetic, and identity-safe, but it is not a
content-ready production seed. This is correct: institutional people, claims,
statistics, policy text, contact details, and media require human approval.

## Absolute blockers

The following cannot be deferred to a cosmetic final review:

1. PPKS query/mutation/download isolation, encryption, access logs, token
   non-disclosure, and retention hold.
2. Booking approval concurrency at PostgreSQL Serializable isolation with
   parallel commit proof.
3. Privacy/private-export authorization and expiry.
4. No storage path/key or PII leakage through JSON, RSC, logs, outbox, CSV, or
   analytics.
5. Fresh migration/seed, SMTP/outbox, backup/restore, and VPS private-storage
   evidence before go-live.

## Decision

Proceed with the backend-first roadmap in
`coordination/milestones/M4-BACKEND-FIRST-ROADMAP.md`. Claude may finish the
already-started Page ADMIN UI, but no additional UI module should invent a
backend contract before the corresponding backend wave is accepted.
