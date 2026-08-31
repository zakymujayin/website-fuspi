# Handoff — M4-GPT-BOOKING-RBAC-SILA-READY — GPT

- Branch: `feat/lecturer-portal-complaint-booking`
- Base SHA: `0216f2838e45f9d1e669c81b0faea2d397dc80f7`
- Head SHA: commit containing this handoff; exact final SHA must be read from `git rev-parse HEAD` after commit because embedding the self SHA changes the SHA.

## Result

Added explicit institutional booking roles while keeping the auth boundary provider-neutral for future SILA SSO:

- Added application roles: `STAF_UMUM`, `DEKAN`, `WADEK`, `KABAG`.
- Centralized booking/admin-shell role schemas in `src/contracts/auth.ts`.
- Booking workflow authorization now enforces:
  - `STAF_UMUM`/legacy `PETUGAS`/`ADMIN`: verify formal application letter.
  - `DEKAN`/legacy `PETUGAS`/`ADMIN`: dispose to follow-up target.
  - `WADEK`/`KABAG`/legacy `PETUGAS`/`ADMIN`: final availability approval.
  - booking roles: reject, request revision, or cancel according to state.
- Booking-only roles can enter the admin shell but are redirected to `/admin/peminjaman` and see only the booking menu item.
- Future SILA integration remains an auth-provider concern: no SILA domain, URL, or external claim shape was guessed.

## Files changed

- `coordination/tasks/M4-GPT-BOOKING-RBAC-SILA-READY.md`
- `prisma/schema.prisma`
- `prisma/migrations/20260831102000_booking_institutional_roles/migration.sql`
- `src/contracts/auth.ts`
- `src/features/booking/domain.ts`
- `src/lib/auth/runtime/redirect.ts`
- `src/proxy.ts`
- `src/app/[locale]/admin/layout.tsx`
- `src/app/[locale]/admin/page.tsx`
- `src/app/[locale]/admin/peminjaman/page.tsx`
- `src/app/api/admin/bookings/[id]/application/route.ts`
- `src/components/admin/admin-layout-shell.tsx`
- `src/components/admin/admin-sidebar.tsx`
- `src/components/admin/booking/booking-decision-form.tsx`
- `tests/security/public-booking-flow.integration.test.ts`
- `tests/platform/lecturer-portal/lecturer-portal.test.ts`
- `tests/m4/contracts/admin-foundation-contracts.test.ts`
- `tests/m4/runtime/admin-foundation-transport.test.ts`
- `tests/security/admin-foundation-adversarial.integration.test.ts`

## Contract/schema/migration impact

- Added `Role` enum values through a corrective migration:
  - `STAF_UMUM`
  - `DEKAN`
  - `WADEK`
  - `KABAG`
- `AuthRoleSchema` accepts the new roles.
- `AdminShellRoleSchema`, `BookingAdminRoleSchema`, and `BookingOnlyAdminRoleSchema` define route/UI/domain role groups.
- `resolvePostLoginDestination` sends booking-only institutional roles to `/admin/peminjaman`.
- `proxy.ts` now adds upstream-only `x-fuspi-pathname` so admin layout can redirect booking-only roles away from non-booking admin pages.

## Verification

| Command | Result |
|---|---|
| `npm run prisma:validate` | Passed |
| `npm run prisma:generate` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npx vitest run tests/platform/lecturer-portal/lecturer-portal.test.ts tests/m4/contracts/admin-foundation-contracts.test.ts tests/m4/runtime/admin-foundation-transport.test.ts` | Passed: 3 files, 40 tests |
| `set -a && . ./.env && set +a && npx prisma migrate deploy` | Applied `20260831102000_booking_institutional_roles` to local PostgreSQL |
| `set -a && . ./.env && set +a && RUN_PLATFORM_DB_TESTS=true npx vitest run --config vitest.integration.config.ts tests/security/public-booking-flow.integration.test.ts` | Passed: 1 file, 14 tests |
| `npx vitest run --config vitest.integration.config.ts tests/security/admin-foundation-adversarial.integration.test.ts` | Passed: 1 file, 8 tests |
| `npm run test` | Passed: 111 files, 1367 tests |
| `npm run build` | Passed |
| `npx tsx -e "import {NextRequest} from 'next/server'; import proxy from './src/proxy'; const request = new NextRequest('https://example.test/id/admin/posts'); const response = proxy(request); console.log(response.status, request.headers.get('x-fuspi-pathname'));"` | Passed: `200 /id/admin/posts` |
| `git diff --check` | Passed |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-BOOKING-RBAC-SILA-READY.md TASK_BASE=0216f2838e45f9d1e669c81b0faea2d397dc80f7 npm run check:scope` | Passed: 20 changed files within lease |

## Untested areas

- Real SILA SSO was not implemented because no authorized SILA provider contract, callback URL, claim shape, signing metadata, or `NEXT_PUBLIC_SILA_URL` usage contract was provided.
- Browser-level Playwright coverage for role-specific admin menu rendering was not added in this slice.

## Risks and follow-ups

- When SILA integration is authorized, add a dedicated auth bridge that maps verified SILA identity/claims to these application roles. Do not trust client-supplied role names.
- Existing `PETUGAS` remains a legacy super-operator for the booking workflow to avoid stranding current staff accounts.
- If the institution wants per-Wadek distinctions later, add a separate field/assignment model rather than multiplying auth roles prematurely.

## Requested shared changes

- None.
