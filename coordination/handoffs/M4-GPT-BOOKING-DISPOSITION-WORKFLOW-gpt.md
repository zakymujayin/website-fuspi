# Handoff — M4-GPT-BOOKING-DISPOSITION-WORKFLOW — GPT

- Branch: `feat/lecturer-portal-complaint-booking`
- Base SHA: `862e1a5e652c85f1ba03c89b55489d57bf213b5e`
- Head SHA: commit containing this handoff; exact final SHA must be read from `git rev-parse HEAD` after commit because embedding the self SHA changes the SHA.

## Result

Implemented the room/facility borrowing workflow requested by project owner:

- Public applicants must upload an official PDF application letter before submission.
- New workflow statuses model the manual process: `DIAJUKAN`, `DISPOSISI_DEKAN`, `CEK_KETERSEDIAAN`, `PERLU_REVISI`, then final statuses.
- Admin/Petugas UI now guides staff through letter verification, dean disposition target selection, availability check, revision request, approval, rejection, and cancellation.
- Approval rechecks approved-booking conflicts inside a serializable transaction before setting `DISETUJUI`.
- Public multipart API now stages the PDF server-side instead of accepting a raw private storage key from clients.
- Admin/Petugas can download the submitted letter through a protected no-store route.

## Files changed

- `coordination/tasks/M4-GPT-BOOKING-DISPOSITION-WORKFLOW.md`
- `prisma/schema.prisma`
- `prisma/migrations/20260831090000_booking_disposition_workflow/migration.sql`
- `prisma/migrations/20260831090100_booking_status_default_submitted/migration.sql`
- `src/features/booking/domain.ts`
- `src/components/public/booking/booking-server-actions.ts`
- `src/components/public/booking/booking-request-form.tsx`
- `src/app/[locale]/(public)/peminjaman/ajukan/page.tsx`
- `src/app/api/public/bookings/route.ts`
- `src/app/api/admin/bookings/[id]/application/route.ts`
- `src/components/admin/booking/booking-admin-actions.ts`
- `src/components/admin/booking/booking-decision-form.tsx`
- `src/app/[locale]/admin/peminjaman/page.tsx`
- `messages/id.json`
- `messages/en.json`
- `messages/ar.json`
- `tests/security/public-booking-flow.integration.test.ts`

## Contract/schema/migration impact

- Added `BookingStatus` enum values: `DIAJUKAN`, `DISPOSISI_DEKAN`, `CEK_KETERSEDIAAN`, `PERLU_REVISI`.
- Changed new-booking default status from `MENUNGGU` to `DIAJUKAN`.
- `submitBooking` now requires a validated private `applicationStorageKey`.
- `executeBookingCommand` supports `VERIFY_STAFF`, `DISPOSE`, and `REQUEST_REVISION`.
- `APPROVE` no longer accepts `applicationStorageKey`; the submitted letter must already exist.
- Public `/api/public/bookings` POST now requires `multipart/form-data` with `applicationLetter`.
- New protected route: `/api/admin/bookings/[id]/application`.

## Verification

| Command | Result |
|---|---|
| `npm run prisma:validate` | Passed |
| `npm run prisma:generate` | Passed |
| `npm run lint` | Failed once on `prefer-const`, fixed; passed on rerun |
| `npm run typecheck` | Failed once on conflict-check typing, fixed; passed on rerun |
| `npm run test` | Passed: 111 files, 1361 tests |
| `set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/security/public-booking-flow.integration.test.ts` | Failed once under sandbox `EPERM`, passed with DB access after applying migrations: 1 file, 13 tests |
| `set -a && . ./.env && set +a && npx prisma migrate deploy` | Applied the two new booking workflow migrations to local PostgreSQL |
| `npm run build` | Passed; new admin application-letter route included in route manifest |
| `git diff --check` | Passed |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-BOOKING-DISPOSITION-WORKFLOW.md TASK_BASE=862e1a5e652c85f1ba03c89b55489d57bf213b5e npm run check:scope` | Passed: 18 changed files within lease |

## Untested areas

- Browser-level Playwright interaction was not added for the admin queue because there is no existing booking-specific e2e fixture in this task.
- Role-specific Dekan/Wadek/Kabag routing is intentionally not implemented; current implementation uses existing `ADMIN`/`PETUGAS` authority and records the disposition target in workflow history.

## Risks and follow-ups

- If the institution wants separate Dekan/Wadek/Kabag login permissions, create a GPT-owned RBAC contract task before adding new `Role` enum values or route policies.
- Existing legacy `MENUNGGU` bookings remain processable through staff verification or legacy approval path to avoid stranding old data.
- A future detail page can split the queue if volume grows, but the current one-page UI keeps daily processing fast.

## Requested shared changes

- None.
