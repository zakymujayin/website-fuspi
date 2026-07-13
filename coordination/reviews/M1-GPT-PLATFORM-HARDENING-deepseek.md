# M1 GPT Platform Hardening — DeepSeek Review

## Verdict: APPROVE

Tidak ada temuan Critical atau High. Semua acceptance command lulus di MariaDB 10.11.14. Keempat hardening item menutup temuan actionable dari review sebelumnya dengan benar dan aman dalam scope allowed paths.

---

## Target Information

| Field | Value |
|---|---|
| Reviewed branch | `origin/ai/gpt/m1-platform-hardening` |
| Target head SHA | `2bb9835` |
| Hardening commit SHA | `76f42ba` |
| Base (pre-hardening review) | `7ce46c8` (DeepSeek M1-GPT-PLATFORM review) |
| Database engine | MariaDB 10.11.14 (Ubuntu 24.04) |
| Node.js | v24.16.0 |

---

## Acceptance Commands Results

| Command | Result |
|---|---|
| `npm run prisma:generate` | PASS (7.8.0 client generated) |
| `npm run prisma:validate` | PASS (schema valid) |
| `npm run lint` | PASS (no errors) |
| `npm run typecheck` | PASS (no errors) |
| `npm test` | PASS (10 files, 88 passed, 2 skipped) |
| `npm run test:integration` | PASS (1 file, 2 passed, requires DATABASE_URL) |
| `npm run build` | PASS (production build, all 3 locales) |

---

## Hardening Item Review

### 1. Seed uses shared database URL parser (APPROVED)

`prisma/seed.ts` now imports and delegates to `parseDatabaseUrl` from `src/lib/db/config.ts`, replacing the inline `new URL()` + manual destructuring. This eliminates the adapter-setting drift risk identified in the previous review. IPv6 loopback, port defaulting, connection-limit validation, and SSL parsing now flow through the single config parser.

### 2. Integration test discoverability (APPROVED)

- `package.json`: `test:integration` script now uses `RUN_PLATFORM_DB_TESTS=true` prefix instead of `--passWithNoTests`. The env-var gate is explicit and prevents accidental database test execution.
- `vitest.integration.config.ts`: added `tests/**/*.integration.test.ts` to the include pattern, so the platform database integration test is discovered alongside any `src/` integration tests.

**Informational note (Low):** The integration test requires `DATABASE_URL` available in the shell environment. Vitest's integration config does not automatically load `.env.local` when running via `vitest run`. This is a pre-existing test-infrastructure concern, not introduced by this hardening. The `--passWithNoTests` fallback is correctly removed.

### 3. Negative boundary tests (APPROVED)

Three new tests were added:

- **`tests/platform/audit.test.ts:41-53`** — Verifies recursive depth truncation (`MAX_DEPTH=6`) at the documented boundary: a 7-level nested object gets `[TRUNCATED_DEPTH]`, and an array of 51 items is truncated to 50. The test correctly exercises the `visit()` depth counter and array slicing.
- **`tests/platform/revision-outbox.test.ts:46-57`** — Verifies that `findForbiddenKey` recursively traverses arrays of objects and raises the correct path (`snapshot.metadata.blocks[0].content.passwordHash`) for a sensitive key nested inside an array inside an object.
- **`tests/platform/db-config.test.ts:27`** — Verifies that a bracketed IPv6 loopback URL (`[::1]`) resolves `allowPublicKeyRetrieval: true`, consistent with Node.js 24.x URL parser behavior (hostname retains brackets for `mysql:` protocol).

### 4. CODEOWNERS real owner (APPROVED)

`.github/CODEOWNERS` replaces the placeholder `@fuspi-maintainer` with the repository owner handle `@zakymujayin` across all 9 entries. No syntax issues.

---

## Findings

### Low — DATABASE_URL not auto-loaded by vitest integration config

**File:** `vitest.integration.config.ts` (pre-existing, not introduced by hardening)
**Description:** When `npm run test:integration` is executed without an explicit shell `DATABASE_URL` export, the integration test fails with `"DATABASE_URL is required to create a Prisma client."` The `.env.local` file containing the DATABASE_URL is not automatically picked up by vitest's integration configuration. This is a pre-existing test-infrastructure gap in the M0/M1 scaffold, not a regression from the hardening change. The `--passWithNoTests` flag previously masked this by silently succeeding with zero tests. Recommend adding `envDir` or a setup file in a follow-up test-infrastructure task.

### Medium — Database engine mismatch resolved

**Resolution:** Dev environment upgraded from MySQL 8.0.46 to MariaDB 10.11.14. Prisma schema pushed, unit tests (88 passed), and integration tests (2 passed) all green on MariaDB. Matches production Hostinger target. No remaining engine gap.

---

## Allowed Paths Compliance

| Path | Changed? | In lease? |
|---|---|---|
| `.github/CODEOWNERS` | Yes | Yes |
| `package.json` | Yes | Yes |
| `prisma/seed.ts` | Yes | Yes |
| `src/lib/db/config.ts` | Yes | Yes |
| `tests/platform/**` | Yes (3 files) | Yes |
| `vitest.integration.config.ts` | Yes | Yes |
| `coordination/handoffs/M1-GPT-PLATFORM-HARDENING-gpt.md` | Yes | Yes |
| `prisma/schema.prisma` | No | Forbidden (respected) |
| `prisma/migrations/**` | No | Forbidden (respected) |

No forbidden paths were touched. No schema or migration edits.

---

## Untested Areas & Risks

1. The `[::1]` local-host detection depends on Node.js URL parser behavior (hostname preserves brackets for `mysql:` protocol). Node.js 20.9+ (minimum required) has been verified to match this behavior, but older runtimes or polyfill environments may return `::1` without brackets, causing `allowPublicKeyRetrieval: false` on IPv6 loopback.
2. The integration test cleanup (`afterAll`) assumes `prisma` was successfully created in `beforeAll`. If DATABASE_URL is missing, the `beforeAll` throws, leaving `prisma` undefined, and the `afterAll` crashes with a `TypeError`. This is a test-safety issue, not a production code defect.
3. ~~Database engine gap~~ — resolved. Dev now runs MariaDB 10.11.14, matching Hostinger production target.

---

## Summary

4/4 hardening items implemented correctly. 8 files changed, 47 insertions, 24 deletions. All acceptance commands green. No contract or schema changes. The branch is safe to merge into the integration queue.

**Verdict:** APPROVE
