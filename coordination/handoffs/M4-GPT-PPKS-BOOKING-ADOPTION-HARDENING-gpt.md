# Handoff — M4-GPT-PPKS-BOOKING-ADOPTION-HARDENING — GPT

- Branch: feat/lecturer-portal-complaint-booking
- Base SHA: 10e00330e59764268bb223023b2883d08ac77680
- Head SHA: 70cfbfe4c16454b4afae34177573b6080cb057c3

## Result

Implemented the cross-lane adoption hardening requested for PPKS, booking,
route-role authorization, and lecturer import. PPKS intake now accepts up to
three validated PDF/image attachments, encrypts them before storage, stores
them only under `PPKS_PRIVATE_DIR`, and exposes a protected download route for
`SATGAS_PPKS` with `TicketAccessLog` records. PPKS notification email is an
outbox message with an empty payload and generic copy only.

Booking now has an admin approval page wired to `executeBookingCommand`, with
approve/reject/cancel actions, and public tracking can cancel a waiting or
approved booking using the booking number plus tracking token. `decideProtectedRoute`
now accepts centralized role requirements and is used by admin and lecturer
portal layouts.

Lecturer import accepts CSV or XLSX uploads via `read-excel-file`; the vulnerable
`xlsx` package is not present. The FUSPI study-program contract is five programs
in order: IAT, IH, AFI, SAA, TASPI.

## Files changed

- PPKS intake/download/notifications: `src/components/public/ppks/*`,
  `src/app/api/admin/ppks/attachments/[id]/route.ts`,
  `src/app/[locale]/admin/pengaduan/ppks/[id]/page.tsx`,
  `src/features/tickets/workflow.ts`, `src/lib/outbox/templates.ts`,
  `.env.example`.
- Booking approval/cancellation: `src/features/booking/domain.ts`,
  `src/components/admin/booking/*`,
  `src/app/[locale]/admin/peminjaman/page.tsx`,
  `src/components/public/booking/*`,
  `src/app/[locale]/(public)/peminjaman/lacak/page.tsx`,
  `src/components/admin/admin-sidebar-data.ts`.
- Role guard and identity/import contracts:
  `src/lib/auth/runtime/request-session.ts`,
  `src/app/[locale]/admin/layout.tsx`,
  `src/app/[locale]/portal-dosen/layout.tsx`,
  `src/config/institution.ts`,
  `src/features/academic/lecturer-csv-import.ts`,
  `src/components/admin/lecturer-import/*`,
  locale catalogs and tests.
- Task manifest: `coordination/tasks/M4-GPT-PPKS-BOOKING-ADOPTION-HARDENING.md`.

## Contract/schema/migration impact

- No Prisma schema or migration changes were made in this task.
- Added dependency: `read-excel-file@9.3.10`.
- Added env contract: `PPKS_NOTIFICATION_EMAIL=""`.
- Removed the PPKS public action's committed development fallback for
  `IP_HASH_SECRET`; missing HMAC/encryption/tracking secrets fail closed.
- `src/config/ppks-support.ts` was not populated with institutional Satgas
  contacts.

## Yang TIDAK boleh Anda kerjakan

Do not fill `src/config/ppks-support.ts` with plausible-looking Satgas PPKS
phone numbers, emails, URLs, or regulatory/service details. `docs/14` D4 forbids
guessing here. The owner must verify faculty and university Satgas contacts
directly with Satgas PPKS UIN SMH Banten before those fields are populated.

## PPKS invariants

Weakening any one of these requires a conscious written decision:

1. PPKS reports must never enter the general complaint category path.
2. PPKS subject, description, reporter identity, replies, and attachments stay
   encrypted at rest.
3. PPKS attachments are stored outside public storage and are served only by a
   protected route.
4. Only `SATGAS_PPKS` can read PPKS detail or download PPKS attachments.
5. `ADMIN` and `PETUGAS` may see only aggregate PPKS information, never subject,
   description, identity, replies, or attachments.
6. Public PPKS tracking returns status metadata only, not report content,
   identity, or attachments.
7. Every authorized or denied PPKS detail/download access is auditable in
   `TicketAccessLog`.
8. PPKS intake has no development fallback for crypto/HMAC secrets; missing or
   invalid secrets fail closed.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run prisma:validate` | Passed |
| `npm run test` | Passed: 111 files, 1361 tests |
| `npx vitest run tests/platform/lecturer-portal/lecturer-csv-import.test.ts tests/platform/auth-bridge/auth-bridge.test.ts tests/platform/storage/ppks-attachment-crypto.test.ts` | Passed: 3 files, 45 tests |
| `set -a && . ./.env && set +a && npm run test:integration -- tests/security/ppks-intake-adversarial.integration.test.ts tests/security/public-booking-flow.integration.test.ts tests/security/public-complaint-flow.integration.test.ts` | Passed: 3 files, 45 tests |
| `set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/security/` | Passed: 17 files, 115 tests |
| `npm run build` | Passed; production build includes `/api/admin/ppks/attachments/[id]` and `/[locale]/admin/peminjaman` |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-PPKS-BOOKING-ADOPTION-HARDENING.md TASK_BASE=main npm run check:scope` | Passed: 74 changed files within lease |
| `npm ls read-excel-file xlsx` | Passed: `read-excel-file@9.3.10`; no `xlsx` package installed |
| `npm audit --json` | Failed with existing dependency advisories: 21 total, including Next/Auth/Prisma/sharp; no `xlsx` advisory because `xlsx` is absent |
| `set -a && . ./.env && set +a && npm run test:integration` | Failed outside task target: 7 legacy integration files, 17 tests, 3 suites. Failures are tied to non-isolated seeded/global DB fixtures and unrelated M3/M4 content suites, while `tests/security/` passes. |
| `git diff --check` | Passed |

## Untested areas

- Browser click-path for admin booking approval was not Playwright-tested.
- Browser file-upload/download flow for PPKS attachments was covered at domain
  and route build level, not by an end-to-end browser session.
- SMTP delivery was not exercised; outbox template and payload shape were tested
  through security integration.

## Risks and follow-ups

- `npm audit` reports critical/high advisories in existing direct dependencies
  (`next-auth`, `@auth/prisma-adapter`, `next`, `prisma`, `sharp`). Resolving
  them is a separate dependency contract change.
- Full integration currently assumes a cleaner or fixture-isolated database for
  older content/academic suites. The task-targeted security integration suite
  passes with `.env` loaded.
- `PPKS_NOTIFICATION_EMAIL` must be configured only after the project owner
  confirms the correct Satgas recipient.

## Requested shared changes

- Decide and schedule a dependency/security update task for the `npm audit`
  advisories.
- Decide whether old non-security integration suites should be refactored to
  use marker-scoped data or a reset database before being treated as merge gates.
