# M2 — DeepSeek Independent Review: GPT Auth and RBAC Contract (Corrected)

## Metadata

- Reviewer: DeepSeek Delivery & QA
- Review branch: `ai/deepseek/m2-review-gpt-auth-contract`
- Reviewed target: `coordination/m2-auth-contract-review-assignment`
- Original assignment implementation SHA: `046d5aa`
- **Correction implementation SHA: `bdc3a67`**
- **Review assignment head SHA: `1f2c4d9`**
- Verdict: **APPROVE** — all prior findings closed; zero residual blockers

## Re-review summary

This is a follow-up adversarial review of GPT's corrected M2 Auth/RBAC contract after
findings M1–M5 and L1–L3 from the initial review (`fc4ad81` / `53c9e7f`) were addressed
in commit `bdc3a67`. The correction added 203 lines across 7 files. Each finding was
verified independently against the corrected snapshot.

## Finding status

### Medium (M1–M5) — all CLOSED

| ID | Previous finding | Resolution | Evidence |
|---|---|---|---|
| M1 | AuthorizationContextSchema and TicketDataScopeSchema untested | ✅ CLOSED | `bdc3a67` adds dedicated test at `tests/platform/auth-contracts/auth-contracts.test.ts:128–155`: constructs valid AuthorizationContext, rejects missing actor, rejects out-of-range ticketScope (`"ALL"`), rejects extra keys via `.strict()`, and validates TicketDataScopeSchema rejects `"ALL"` |
| M2 | Missing `ok: true` login result test | ✅ CLOSED | `bdc3a67` adds test at line 42–47: `LoginResultSchema.parse({ok: true, redirectTo: "/id/admin", requiresPasswordChange: false})` |
| M3 | No strict-parsing rejection test for credentials/password schemas | ✅ CLOSED | `bdc3a67` adds `rememberMe` rejection at line 35–39 and `email` rejection at lines 88–93 |
| M4 | No explicit CHANGE_ROLE denial for non-ADMIN roles | ✅ CLOSED | `bdc3a67` adds test at lines 173–185: loops EDITOR/PETUGAS/SATGAS_PPKS asserting `allowed: false, ownership: NONE, dataScope: NONE`; asserts ADMIN has `allowed: true, ownership: ANY` |
| M5 | Matrix immutability not verified | ✅ CLOSED | `bdc3a67` adds `freezePermissionMatrix()` in `permission-matrix.ts:30-40` deep-freezing every level; test at lines 220–233 verifies `Object.isFrozen` at every depth and proves mutation throws |

### Low (L1–L3) — all CLOSED

| ID | Previous finding | Resolution | Evidence |
|---|---|---|---|
| L1 | `bcryptjs` uses caret range | ✅ CLOSED | `package.json` now reads `"bcryptjs": "3.0.3"` — pinned without range |
| L2 | ActiveDatabaseSessionSchema missing rejection test | ✅ CLOSED | `bdc3a67` adds three rejection assertions at lines 109–119: `isActive: false`, `expiresAt: undefined`, `mustChangePassword: "false"` |
| L3 | No assertion for TICKET dataScope NON_PPKS | ✅ CLOSED | `bdc3a67` adds at line 200: `getPermissionRule(role, "VIEW", "TICKET").dataScope === "NON_PPKS"` for ADMIN and PETUGAS |

### Additional corrections verified

| Area | Status | Evidence |
|---|---|---|
| SafeInternalPath rejects C1 control characters U+0080–U+009F | ✅ | `auth.ts:32` expands regex from `[\u0000-\u001f\u007f]` to `[\u0000-\u001f\u007f-\u009f]`; test at line 70 adds `"/id/admin\u0085hidden"` rejection |
| SessionInvalidResultSchema provides safe public shape | ✅ | `auth.ts:48–53` exports new schema with `ok: literal(false)` + `code: literal("SESSION_INVALID")` + `.strict()`; test at lines 49–56 validates parse and rejects extra keys |
| No PII, tokens, hashes, or technical errors in public output | ✅ | All public schemas (`LoginCredentialsSchema`, `LoginResultSchema`, `SessionInvalidResultSchema`, `SafeInternalPathSchema`, `ActiveDatabaseSessionSchema`) expose zero PII/hash/token fields |
| PPKS isolation, EDITOR ownership, ticket scope, default-deny intact | ✅ | Matrix cell-by-cell audit confirms zero change to grants; only `freezePermissionMatrix` was added |
| Matrix cannot be mutated through nested role/resource/action assignment | ✅ | `permission-matrix.ts` type is now `Readonly<Record<AuthRole, Readonly<Record<AuthResource, Readonly<Record<AuthAction, PermissionRule>>>>>`; runtime freeze at every level |
| No M3 changes | ✅ | Diff shows only M2 files: `src/contracts/auth.ts`, `src/lib/auth/permission-matrix.ts`, `tests/platform/auth-contracts/auth-contracts.test.ts`, `package.json`, `package-lock.json`, ADR, handoff |

## Acceptance baseline (corrected target)

All acceptance commands pass against the corrected candidate at `1f2c4d9`:

| Command | Result |
|---|---|
| `npm run lint` | PASS (no errors) |
| `npm run typecheck` | PASS (no errors) |
| `npm run prisma:validate` | PASS |
| `npm test` | 101 passed, 2 skipped, 0 failed |
| `npm run build` | PASS (ID/EN/AR routes) |
| `npm audit --audit-level=high` | PASS (exit 0; 5 pre-existing moderate) |
| `git diff --check` | clean |
| `npm run check:scope` | 2 changed file(s) are within lease |

## Dependency re-review

| Dependency | Version | Pinned | Status |
|---|---|---|---|
| `next-auth` | `5.0.0-beta.31` | Yes | Unchanged; beta risk acknowledged in ADR-0002 |
| `@auth/prisma-adapter` | `2.11.2` | Yes | Unchanged |
| `bcryptjs` | `3.0.3` | **Yes** (was `^3.0.3`) | ✅ Now pinned per ADR-0002 requirement |

Zero new High/Critical advisories. Five moderate from pre-existing M0 chains persist.

## Schema re-review

All prior schema findings verified unchanged or improved:

- `SafeInternalPathSchema`: now blocks C0 + C1 control characters (U+0000–U+009F). ✅
- `LoginResultSchema`: discriminated union unchanged; structural open-redirect prevention intact. ✅
- `SessionInvalidResultSchema`: new export — strictly-typed session-invalid path with zero PII. ✅
- `PasswordChangeInputSchema`: unchanged; 12-char minimum, confirmation+difference enforcement, `.strict()`. ✅
- `ActiveDatabaseSessionSchema`: unchanged; `isActive: literal(true)` type-level rejection of inactive sessions. ✅
- `AuthorizationContextSchema` + `TicketDataScopeSchema`: unchanged; now fully test-covered. ✅

## Permission matrix re-review

- Grant rules unchanged from `046d5aa` to `bdc3a67`. ✅
- `DENY` default, PPKS isolation, EDITOR ownership, ticket scoping all intact. ✅
- Type system now enforces `Readonly` at every nesting level. ✅
- `freezePermissionMatrix()` freezes role→resource→action at every depth. ✅
- Tests prove mutation via assignment throws in strict mode. ✅

## Binding decision compliance (re-verified)

| Cross-lane decision | Status |
|---|---|
| A1 — Three public failure codes only | ✅ `PublicLoginFailureCodeSchema` unchanged |
| A2 — Dummy bcrypt timing work | ⬜ Implementation concern, not contract |
| A3 — Session-invalid result typed | ✅ `SessionInvalidResultSchema` added |
| A3 — Strict revoked/PPKS behavior | ✅ `isActive: literal(true)` unchanged |
| A4 — Password change requires currentPassword | ✅ Unchanged |
| A4 — `mustChangePassword` in session | ✅ Unchanged |
| A5 — No M3 references | ✅ Diff confirms zero M3 changes |

## Verdict

**APPROVE** — the corrected contracts, permission matrix, and tests at `1f2c4d9` / `bdc3a67`
meet all binding decisions from the cross-lane review. All eight findings (M1–M5, L1–L3)
are closed with evidence. Zero High or Critical findings remain. No blockers for the M2
merge queue.

## Residual risks (post-correction)

1. `next-auth` remains beta (`5.0.0-beta.31`) — implementation must integration-test
   Credentials database-session creation with Prisma adapter on MariaDB.
2. Five moderate audit advisories from pre-existing M0 chains persist without actionable fix.

## API/Schema/Migration Impact

None. Review-only task. No source, dependency, schema, or config was changed.
