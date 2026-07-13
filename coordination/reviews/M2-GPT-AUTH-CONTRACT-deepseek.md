# M2 — DeepSeek Independent Review: GPT Auth and RBAC Contract

## Metadata

- Reviewer: DeepSeek Delivery & QA
- Review branch: `ai/deepseek/m2-review-gpt-auth-contract`
- Reviewed target: `coordination/m2-auth-contract-review-assignment`
- Assignment implementation SHA: `046d5aa`
- Assignment handoff SHA: `81b0ee2`
- Original GPT implementation SHA: `35c1e58`
- Original GPT handoff SHA: `145b462`
- Verdict: **APPROVE** with residual medium risks

## Scope

This is an adversarial, read-only review of the auth dependency contract, Zod schemas,
permission matrix, and table-driven tests delivered by GPT in
`coordination/m2-auth-contract-review-assignment`. No source, dependency, schema, config, or
test belonging to the target was edited. Only review output and handoff files were created.

## Acceptance baseline

All acceptance commands passed against the unmodified target:

| Command | Result |
|---|---|
| `npm run lint` | PASS (no errors) |
| `npm run typecheck` | PASS (no errors) |
| `npm run prisma:validate` | PASS |
| `npm test` | 97 passed, 2 skipped, 0 failed |
| `npm run build` | PASS (ID/EN/AR routes) |
| `npm audit --audit-level=high` | PASS (exit 0; 5 pre-existing moderate) |
| `git diff --check` | clean |
| `npm run check:scope` | 0 changed file(s) are within lease |

## Dependency review

| Dependency | Version | Pinned | Peer compat | Notes |
|---|---|---|---|---|
| `next-auth` | `5.0.0-beta.31` | Yes (no range) | Next `^16.0.0`, React `^19.0.0` — compatible with project Next `16.2.6` / React `19.2.4` | Beta; ADR-0002 acknowledges and requires integration tests before merge |
| `@auth/prisma-adapter` | `2.11.2` | Yes (no range) | Resolves to `@auth/core@0.41.2` | No Nodemailer/WebAuthn peers installed — correct for Credentials-only |
| `bcryptjs` | `^3.0.3` | No (caret range) | — | Utility; ranged pin inconsistent with ADR preamble but not a contract risk |

**Audit findings**: Zero High/Critical. Five Moderate from pre-existing M0 chains
(@hono/node-server via Prisma dev tooling; postcss via Next.js internals). None originate
from Auth.js, `@auth/core`, or the Prisma adapter. `npm audit fix --force` is rejected
because its downgrade proposals break the frozen platform.

## Schema review

### `LoginCredentialsSchema` (`src/contracts/auth.ts:10–15`)

- Email: trim, lowercase, email, max 320 — cleans input without leaking state.
- Password: min 1, max 128 — accepts any non-empty string; strength policy belongs to implementation.
- `.strict()` — rejects extra fields.
- **No PII, hashes, tokens, or technical errors.** ✓

### `PublicLoginFailureCodeSchema` (`src/contracts/auth.ts:17–21`)

- Exact set: `INVALID_CREDENTIALS`, `TRY_AGAIN_LATER`, `AUTH_UNAVAILABLE`.
- Matches the three binding failure codes from `M2-AUTH-SECURITY-CROSS-LANE-gpt.md` section A1. ✓
- No account-existence signal (`EMAIL_NOT_FOUND`, `ACCOUNT_LOCKED`, etc.) is possible. ✓

### `SafeInternalPathSchema` (`src/contracts/auth.ts:23–34`)

- Enforces leading `/`, rejects `//`, rejects `\`, rejects C0 control characters.
- Covers the four attack vectors tested: external URL, protocol-relative, backslash escape, newline injection. ✓
- **Gap**: C1 control characters (U+0080–U+009F) are not rejected. Risk is negligible for redirect paths
  because `startsWith("/")` and no-`\` constraints already block most encoding attacks.

### `LoginResultSchema` (`src/contracts/auth.ts:36–46`)

- Discriminated union: `ok: true` → `redirectTo` + `requiresPasswordChange`; `ok: false` → `code`.
- No session token, raw user data, or internal error details. ✓
- `redirectTo` is always `SafeInternalPathSchema` — open redirect is structurally prevented. ✓

### `PasswordChangeInputSchema` (`src/contracts/auth.ts:48–70`)

- Three required fields: `currentPassword`, `newPassword`, `confirmPassword`. ✓
- `newPassword` minimum 12 — matches docs/06 requirement. ✓
- `superRefine` enforces `newPassword === confirmPassword` and `newPassword !== currentPassword`. ✓
- Does not check email-equality or common-password list — these are policy checks correctly left to implementation.
- `.strict()` — rejects extra fields. ✓

### `ActiveDatabaseSessionSchema` (`src/contracts/auth.ts:72–80`)

- `isActive: z.literal(true)` — type-level guarantee that inactive sessions are structurally rejected. ✓
- Exposes only `userId`, `role`, `isActive`, `mustChangePassword`, `expiresAt`. ✓
- No `sessionToken`, `passwordHash`, or raw PII. ✓
- `.strict()` — proven by test that rejects a payload with `sessionToken`. ✓

### `TicketDataScopeSchema` + `AuthorizationContextSchema` (`src/contracts/auth.ts:82–101`)

- Three ticket scopes: `NON_PPKS`, `PPKS_AGGREGATE`, `PPKS_DETAIL` — map cleanly to permission matrix dataScope values. ✓
- Authorization context bundles actor session, optional resource owner, and optional ticket scope. ✓
- `resourceOwnerId` is nullable and optional — correctly models both "no owner" and "not applicable" states. ✓
- `.strict()` on both schemas. ✓

## Permission matrix review

Matrix file: `src/lib/auth/permission-matrix.ts` (107 lines).

### Default-deny construction

- `DENY` constant is `Object.freeze({allowed: false, ownership: "NONE", dataScope: "NONE"})`. ✓
- `createDeniedMatrix()` fills every role×resource×action cell with DENY before grants. ✓
- `grant()` only sets `allowed: true` for explicitly granted cells. ✓
- Imported array helpers (`AUTH_ACTIONS`, `AUTH_RESOURCES`) are used for iteration; `PERMISSION_MATRIX` is the only exported runtime object. ✓

### Cell-by-cell verification

| Role | Resource | Actions granted | Ownership | DataScope | Verdict |
|---|---|---|---|---|---|
| ADMIN | POST | VIEW,CREATE,UPDATE,DELETE,PUBLISH,SCHEDULE | ANY | ALL | ✓ |
| ADMIN | MEDIA | VIEW,CREATE,UPDATE,DELETE,DOWNLOAD | ANY | ALL | ✓ |
| ADMIN | CMS | VIEW,CREATE,UPDATE,DELETE,PUBLISH,SCHEDULE | ANY | ALL | ✓ |
| ADMIN | USER | VIEW,CREATE,UPDATE,DELETE,CHANGE_ROLE,CHANGE_PASSWORD | ANY | ALL | ✓ |
| ADMIN | BOOKING | VIEW,CREATE,UPDATE,DELETE,ASSIGN,EXPORT,DOWNLOAD,APPROVE | ANY | ALL | ✓ |
| ADMIN | TICKET | VIEW,UPDATE,ASSIGN,EXPORT,DOWNLOAD,REPLY | ANY | NON_PPKS | ✓ |
| ADMIN | PPKS_AGGREGATE | VIEW | ANY | PPKS_AGGREGATE | ✓ |
| ADMIN | PPKS_TICKET | (none — DENY) | — | — | ✓ |
| ADMIN | PPKS_ACCESS_LOG | (none — DENY) | — | — | ✓ |
| ADMIN | AUDIT_LOG | VIEW,EXPORT | ANY | ALL | ✓ |
| EDITOR | POST | VIEW,CREATE,UPDATE,DELETE,PUBLISH,SCHEDULE | OWN | ALL | ✓ |
| EDITOR | MEDIA | VIEW,CREATE,UPDATE,DELETE,DOWNLOAD | OWN | ALL | ✓ |
| EDITOR | USER | CHANGE_PASSWORD | OWN | ALL | ✓ |
| EDITOR | all others | (none — DENY) | — | — | ✓ |
| PETUGAS | BOOKING | VIEW,CREATE,UPDATE,DELETE,ASSIGN,EXPORT,DOWNLOAD,APPROVE | ANY | ALL | ✓ |
| PETUGAS | TICKET | VIEW,UPDATE,ASSIGN,EXPORT,DOWNLOAD,REPLY | ANY | NON_PPKS | ✓ |
| PETUGAS | PPKS_AGGREGATE | VIEW | ANY | PPKS_AGGREGATE | ✓ |
| PETUGAS | USER | CHANGE_PASSWORD | OWN | ALL | ✓ |
| PETUGAS | all others | (none — DENY) | — | — | ✓ |
| SATGAS_PPKS | PPKS_AGGREGATE | VIEW | ANY | PPKS_AGGREGATE | ✓ |
| SATGAS_PPKS | PPKS_TICKET | VIEW,UPDATE,ASSIGN,EXPORT,DOWNLOAD,REPLY | ANY | PPKS_DETAIL | ✓ |
| SATGAS_PPKS | PPKS_ACCESS_LOG | VIEW | ANY | PPKS_ACCESS_LOG | ✓ |
| SATGAS_PPKS | USER | CHANGE_PASSWORD | OWN | ALL | ✓ |
| SATGAS_PPKS | all others | (none — DENY) | — | — | ✓ |

### Key security invariants confirmed

1. **PPKS isolation**: ADMIN and PETUGAS have no access to `PPKS_TICKET` or `PPKS_ACCESS_LOG`. SATGAS_PPKS has no access to `CMS`, `BOOKING`, `TICKET`, `POST`, or `MEDIA`. ✓
2. **EDITOR ownership**: Post/Media actions require `OWN`. EDITOR has zero CMS, TICKET, or BOOKING access. ✓
3. **Password change**: Every active role can change its own password (`OWN`). ADMIN can change any password (`ANY`). SATGAS_PPKS password change does not grant general User access. ✓
4. **PPKS aggregate**: ADMIN, PETUGAS, and SATGAS_PPKS see aggregates only — no detail fields. ✓
5. **Ticket scope enforcement**: ADMIN and PETUGAS see `NON_PPKS` tickets only; SATGAS_PPKS sees `PPKS_DETAIL`. ✓
6. **Scheduling**: EDITOR has `PUBLISH` and `SCHEDULE` on own posts. ✓
7. **Role change**: Only ADMIN has `CHANGE_ROLE`. No self-escalation path exists. ✓
8. **Delete on PPKS_TICKET**: Not granted — ticket deletion is not part of the PPKS workflow. ✓

## Test review

File: `tests/platform/auth-contracts/auth-contracts.test.ts` (127 lines, 9 tests).

### What is covered well

- LoginCredentials normalization and `.strict()` rejection of extra codes in LoginResult. ✓
- SafeInternalPathSchema rejects external URL, `//`, `\`, and newline. ✓
- PasswordChangeInputSchema accepts matching passwords, rejects mismatched confirmation. ✓
- ActiveDatabaseSessionSchema only permits five known keys and rejects `sessionToken`. ✓
- Permission matrix has full coverage of every role×resource×action. ✓
- EDITOR ownership (`OWN`) asserted; EDITOR denied for CMS and TICKET. ✓
- All four roles can change own password; ADMIN is `ANY`. ✓
- PPKS_TICKET and PPKS_ACCESS_LOG are fully denied for ADMIN and PETUGAS. ✓
- SATGAS_PPKS limited to PPKS resources plus own password; CMS/BOOKING/TICKET all denied. ✓

### Findings

**M1 — AuthorizationContextSchema and TicketDataScopeSchema untested** (Medium)

`src/contracts/auth.ts:82–101` exports `TicketDataScopeSchema`, `AuthorizationContextSchema`, and
`AuthorizationContext` type. None appear in any test file. The schemas are structurally sound —
they compose individually-tested sub-schemas — but the assembled context has zero coverage.
A future `authorize()` implementation that constructs an AuthorizationContext cannot verify the
contract through existing tests.

**Recommendation**: Add one table-driven test that constructs valid and invalid
AuthorizationContext payloads (missing actor, invalid role, out-of-range ticketScope, extra
keys rejected by `.strict()`).

---

**M2 — Missing `ok: true` login result test** (Medium)

`tests/platform/auth-contracts/auth-contracts.test.ts:29–32` tests `ok: false` with
`INVALID_CREDENTIALS` and proves `EMAIL_NOT_FOUND` is rejected. No test verifies `ok: true`
shape (`redirectTo` + `requiresPasswordChange`). The discriminated union is validated by
TypeScript but a runtime parse test would catch schema drift.

**Recommendation**: Add a test parsing `{ok: true, redirectTo: "/id/admin", requiresPasswordChange: false}`.

---

**M3 — No negative test for strict parsing on credentials/password schemas** (Medium)

Both `LoginCredentialsSchema` and `PasswordChangeInputSchema` use `.strict()`. The test file
does not validate that extra keys (e.g. `{email: "x@y.z", password: "p", rememberMe: true}`)
are rejected. The Auth contracts test line 20–27 tests normalization but not strictness.

**Recommendation**: Add `.safeParse` assertions that reject extra fields on both schemas.

---

**M4 — Missing CHANGE_ROLE denial test for non-ADMIN roles** (Medium)

`AUTH_ACTIONS` includes `CHANGE_ROLE`. The matrix grants it only to ADMIN on USER/ANY.
No test explicitly asserts that EDITOR, PETUGAS, and SATGAS_PPKS are denied `CHANGE_ROLE`.
The "full coverage" test at line 71–78 only checks that every cell *exists*; it doesn't assert
specific denials for every action.

**Recommendation**: Add explicit assertions that non-ADMIN roles are denied `CHANGE_ROLE` on USER.

---

**M5 — Matrix immutability not verified** (Medium)

`PERMISSION_MATRIX` is built with `Object.freeze` on individual rules (lines 32–36, 56) but
the outer container is a plain object without `Object.freeze`. A test should verify that
attempting to mutate a permission result throws or is silently rejected, preventing
accidental corruption.

**Recommendation**: Add a mutation test: attempt to set `PERMISSION_MATRIX["EDITOR"]["CMS"]["VIEW"]` and verify the original value is unchanged or the assignment throws in strict mode.

---

**L1 — `bcryptjs` uses caret range while auth packages are pinned** (Low)

`package.json:48`: `"bcryptjs": "^3.0.3"`. ADR-0002 requires "Pin, without ranges" for auth
dependencies. While `bcryptjs` is a utility (not an auth framework), it directly affects
password verification and should be pinned for reproducible security builds.

**Recommendation**: Pin to `"3.0.3"` (remove caret) or document the deliberate exception.

---

**L2 — ActiveDatabaseSessionSchema missing rejection test** (Low)

`tests/platform/auth-contracts/auth-contracts.test.ts:55–67` tests only the happy path and
the `sessionToken` rejection. Missing tests: `isActive: false` (should fail literal check),
missing `expiresAt` (should fail), wrong type for `mustChangePassword` (should fail).

**Recommendation**: Add `.safeParse` failure assertions for common invalid shapes.

---

**L3 — No test for Ticket NON_PPKS dataScope** (Low)

The test at line 98–109 verifies PPKS isolation by checking `PPKS_TICKET` is denied for
ADMIN/PETUGAS, and `PPKS_AGGREGATE` has `dataScope: "PPKS_AGGREGATE"`. No test verifies
that TICKET (non-PPKS) carries `dataScope: "NON_PPKS"` for ADMIN and PETUGAS.

**Recommendation**: Add an assertion on `getPermissionRule("ADMIN", "VIEW", "TICKET").dataScope`.

## Contract-vs-implementation boundary

The contracts correctly stop at the interface layer. The following are NOT contract gaps —
they belong to subsequent M2 implementation tasks:

- Auth.js `auth()` handler, Credentials provider, `authorize()` callback
- Database session creation, revocation, and transactional cookie management
- Rate limiting, HMAC key derivation, dummy bcrypt constant
- Proxy/middleware configuration
- `authorize()` function that reads the permission matrix
- UI forms, error messages, redirect behavior
- Seed users, password hashing, `mustChangePassword` enforcement
- CSRF token validation

## Binding decision compliance

| Cross-lane decision (section) | Represented in contract | Verdict |
|---|---|---|
| A1 — Three public failure codes only | `PublicLoginFailureCodeSchema` | ✓ |
| A1 — Rate-limit counter incremented for unknown/inactive/wrong | Not a contract concern (implementation) | — |
| A2 — Dummy bcrypt constant for timing equalization | Not a contract concern (implementation) | — |
| A3 — Proxy is UX, not authorization | Contract docs/ADR guide, not schema | ✓ |
| A3 — Typed session-invalid result | `LoginResultSchema` `ok: false` path | ✓ |
| A3 — Strict revoked/PPKS behavior | `ActiveDatabaseSessionSchema` `isActive: literal(true)` | ✓ |
| A4 — Password change requires currentPassword | `PasswordChangeInputSchema` | ✓ |
| A4 — `mustChangePassword` in session | `ActiveDatabaseSessionSchema.mustChangePassword` | ✓ |
| A5 — All M2, no M3 references | ADR-0002 and handoff | ✓ |

## Verdict

**APPROVE** — the contracts and permission matrix are correct, well-typed, and implementable.
Five medium findings exist in test coverage (M1–M5) and three low observations (L1–L3); none
is a blocker for the merge queue. The author should address findings M1–M5 before the M2
implementation task consumes these contracts.

## Residual risks

1. `next-auth` remains beta; the implementation task must integration-test Credentials
   database-session creation with the Prisma adapter on MariaDB.
2. Medium test coverage gaps (M1–M5) mean the authorization context, strict parsing, role
   change denial, and matrix immutability are enforced by TypeScript/types only, not by
   runtime assertions.
3. `bcryptjs` caret range creates a non-reproducible build surface for password operations.
4. Five moderate audit advisories from pre-existing chains persist; none are actionable
   without breaking changes.
