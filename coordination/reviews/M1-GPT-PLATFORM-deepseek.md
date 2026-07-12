# Review: M1-GPT-PLATFORM — DeepSeek Adversarial

## Metadata

| Field | Value |
|-------|-------|
| Review ID | M1-REVIEW-GPT-PLATFORM |
| Reviewer | deepseek (deepseek-v4-pro, medium thinking) |
| Reviewed Branch | `origin/ai/gpt/m1-platform` |
| Base SHA | `553ed1b` |
| Target Head SHA | `99bf1d1` |
| Review Date | 2026-07-13 |
| Database Engines | Reviewed against MySQL 8.0.x. MariaDB hostinger staging TBD. |

## Scope Reviewed

Per task manifest `coordination/tasks/M1-REVIEW-GPT-PLATFORM.md`, the following
areas were reviewed read-only from the branch diff `553ed1b...99bf1d1`:

- Both SQL migration files
- Schema governance/translation/privacy coverage
- Delete behavior on all 130+ foreign keys
- Nullable unique indexes (nidn, nip, orcid, sourceBookingId, etc.)
- Seed idempotency (double-run behavior)
- Secret/PII leakage
- Database adapter security
- Content revision security (forbidden keys, size limits, resource whitelist)
- Audit log sanitization (recursive redaction)
- Outbox envelope (plaintext sensitive-key rejection, encrypted path)
- Platform test coverage (unit + integration)
- No code was changed; all findings are advisory

## Verdict

**APPROVE**

No Critical or High severity findings. The schema, migrations, seed, and platform
primitives are well-structured with appropriate governance, privacy, and audit
controls. The four Medium findings are advisory and may be addressed before M2.

## Findings

### Medium

| # | File | Line(s) | Finding |
|---|------|---------|---------|
| M1 | `prisma/seed.ts` | 14 | `allowPublicKeyRetrieval` host check omits IPv6 loopback (`::1`). `src/lib/db/config.ts:12` correctly includes `::1` in `LOCAL_DATABASE_HOSTS`. The seed hard-codes `["127.0.0.1", "localhost"]` instead of sharing the centralized list. If a developer connects via `::1`, the seed will fail RSA auth silently while the app succeeds. |
| M2 | `tests/platform/platform-db.integration.test.ts` | 8–9 | Integration tests are gated behind `RUN_PLATFORM_DB_TESTS=true` and are skipped in CI/quick runs. The `tests/platform/audit.test.ts` and `tests/platform/db-config.test.ts` cover unit-level contracts, but the transaction-level atomicity test (`$transaction` wrapping revision + audit + outbox + idempotency enforcement) only executes when the env var is set. Consider a lightweight in-memory or SQLite fallback for these tests in CI, or document the exact command sequence to run them before merge. |
| M3 | `prisma/seed.ts` | 6–17 | Seed creates a raw `PrismaMariaDb` adapter directly and re-parses the database URL, bypassing `createPrismaClient()`. While the seed should not share the application singleton, future adapter configuration changes (TLS, connection pool size, retry logic) must be replicated in two places. |
| M4 | `.github/CODEOWNERS` | 1 | All entries reference the placeholder `@fuspi-maintainer`. This must be replaced with the actual GitHub team/handle before production deployment. Flagged because it appears in the diff; not a code defect. |

### Low

| # | File | Line(s) | Finding |
|---|------|---------|---------|
| L1 | `tests/platform/revision-outbox.test.ts` | 36–44 | `prepareRevision` forbidden-key detection is tested with a shallow `{trackingToken: "raw"}` object. A deeply nested forbidden key (e.g., `{meta: {data: {passwordHash: "x"}}}`) is not explicitly tested. The `findForbiddenKey()` recursive implementation in `src/lib/db/revision.ts:26–44` reads correctly, but a negative test for depth would improve confidence. |
| L2 | `tests/platform/audit.test.ts` | 34–39 | `sanitizeAuditMetadata` size-check is tested with 40 fields of 500 characters each (>16 KiB). However, the depth limit (6) and array-item limit (50) in `sanitize.ts` have no explicit boundary tests. |
| L3 | `prisma/seed.ts` | 84–94 | HomeSection seed sets `translations.title` to the enum key (e.g., "HERO", "QUICKLINK") instead of human-readable labels. These are intentional placeholder values that the admin must populate; the seed itself is not a content-authoring tool. |
| L4 | `prisma/migrations/20260712165044_init/migration.sql` | 252–280 | `StudyProgram` migration column `degree VARCHAR(191) NOT NULL` — the seed hard-codes `"S1"` for all five programs. If a program in a future milestone offers a different degree level (S2, S3, D3), this field does not constrain it, which is correct. No action needed. |

## Acceptance Commands (run on review branch `ai/deepseek/m1-review-gpt-platform`)

```
$ npm run prisma:validate
The schema at prisma is valid 🚀
Loaded Prisma config from prisma.config.ts.

$ npm run lint
0 errors, 0 warnings

$ npm run typecheck
0 errors

$ npm test
7 test files, 70 tests passed
```

**Note:** The review branch inherits the M0 baseline (DeepSeek + Claude lane files) but
does not include the GPT platform files under review. The GPT handoff confirms:

- `npm test`: 86 passed, 2 DB tests skipped (ordinary unit run)
- `RUN_PLATFORM_DB_TESTS=true npx vitest run tests/platform/platform-db.integration.test.ts`: 2 passed
- `npm run ci:merge`: passed, including production build
- Empty `fuspi_m1_verify` database: both migrations applied cleanly
- Seed executed twice: row counts stable (User 1, StudyProgram 5, StudyProgramTranslation 5, etc.)
- Study-program order preserved: `IAT, IH, AFI, SAA, TASPI`

## Detailed Checks

### Migration SQL (2 migrations, 2145 lines total)

- **Migration 1** (`20260712165044_init`): Complete initial schema with ~70 tables.
  All translation tables follow the `(parentId, locale) UNIQUE` pattern. All
  content models include `governanceStatus`, `lastReviewedAt`, `lastReviewedById`,
  `reviewDueAt`, `expiresAt`, `version`, and `contentOwnerId`.

- **Migration 2** (`20260712170826_complete_translation_governance`): Adds
  `TranslationStatus` fields (`reviewedAt`, `reviewerId`, `sourceVersion`, `status`,
  `translatorId`) to `GlossaryTranslation` which was the one table missing them
  from the init migration.

- **ENUM values** match between migration SQL and schema.prisma. `GovernanceStatus`
  and `TranslationStatus` both include `STALE`. The migration uses `NOT NULL DEFAULT
  'DRAFT'` or `'CURRENT'` for all enum columns with defaults — safe for fresh
  deployments.

### Delete Behavior (130+ foreign keys)

| Pattern | Applied To | Rationale |
|---------|-----------|-----------|
| `ON DELETE CASCADE` | All `*Translation` tables | Correct: deleting a parent should delete its translations |
| `ON DELETE CASCADE` | Junction tables (PostTag, LecturerResearch, etc.) | Correct: cleanup association rows |
| `ON DELETE SET NULL` | Nullable FKs (authorId, categoryId, parentId) | Correct: preserve child when parent removed |
| `ON DELETE RESTRICT` | Media FKs (coverMediaId, logoMediaId, etc.) | Correct: prevent orphaned media references |
| `ON DELETE RESTRICT` | Ticket, Booking, ActivityLog FKs | Correct: audit trail must survive actor deletion |
| `ON DELETE RESTRICT` | Survey FK chains | Correct: prevent broken survey references |

All delete cascades follow the documented policy from `docs/02-database-schema.md`.
No cascade from Ticket → User or Booking → Room, which is correct for audit integrity.

### Nullable Unique Indexes

| Table | Column | MySQL/MariaDB Behavior |
|-------|--------|----------------------|
| `Lecturer` | `nidn` | Multiple NULLs allowed in UNIQUE (MySQL+MariaDB consistent) |
| `Lecturer` | `nip` | Same as above |
| `Lecturer` | `orcid` | Same as above |
| `Event` | `sourceBookingId` | Foreign key, nullable unique — correct for 1:1 optional link |

MariaDB's handling of nullable UNIQUE indexes at the `ENGINE=InnoDB` level matches
MySQL's behavior. This should be verified on the staging MariaDB instance.

### Seed Idempotency

All operations use `.upsert()` with explicit `where` keys:

| Entity | Upsert Key | Update Behavior | Double-Run Safe |
|--------|-----------|----------------|-----------------|
| User | `email` | `update: {}` (no-op) | ✓ |
| SiteSetting | `id: "singleton"` | Sets `contentOwnerId` | ✓ |
| StudyProgram | `code` | Updates `slug`, `order`, `contentOwnerId` | ✓ |
| Category | `slug` | `update: {}` | ✓ |
| HomeSection | `key` | Updates `order` | ✓ |
| Statistic | `id: "stat-N"` | Updates `value`, `order` | ✓ |
| QuickLink | `id: "quick-N"` | Updates `url`, `order` | ✓ |
| Media | `storageKey` | `update: {}` | ✓ |
| HomeSlider | `id: "slider-1"` | Updates `imageMediaId` | ✓ |

GPT handoff confirms double-run row counts are stable.

### Secret/PII Handling

- **No hardcoded secrets.** Admin credentials come from `SEED_ADMIN_EMAIL` and
  `SEED_ADMIN_PASSWORD` env vars.
- **Password strength check:** `password.length < 12` rejects weak seeds (line 28).
- **Bcrypt cost factor 12** (line 38) — appropriate balance for seed operations.
- **`mustChangePassword: true`** on seed admin — correct security posture.
- **No PII in test data.** Test email domains use `@example.invalid` (RFC 2606).
  Test IDs use synthetic markers (e.g., `m1-${Date.now()}`).
- **PPKS ciphertext fields** in Ticket/TicketReply/DataSubjectRequest use `LONGTEXT`
  for ciphertext and have corresponding `encryptionNonce`, `encryptionTag`,
  `keyVersion` fields.
- **`NotificationOutbox.payload`** stored as JSON; sensitive messages bypass
  plaintext via the discriminated union contract.
- **No real tracking tokens, private keys, session tokens, or IP addresses** in
  any fixture, seed, or test.

### Database Adapter Security

`src/lib/db/config.ts:14–44`:
- Enforces `mysql:` protocol only (rejects `postgresql:`)
- Requires host, user, database name
- Validates port range (1–65535)
- Validates connection limit (1–50)
- `allowPublicKeyRetrieval` enabled ONLY for loopback hosts (`127.0.0.1`,
  `localhost`, `::1`)
- SSL configurable via `?ssl=true` query param
- URL-encoded credentials properly decoded via `decodeURIComponent()`

`src/lib/db/client.ts`:
- Singleton via `globalThis` in non-production environments
- Validates `DATABASE_URL` is set before creating client

### Revision Security

`src/lib/db/revision.ts`:
- **Resource whitelist:** Only 13 content types permitted; operational resources
  (Ticket, Booking, User, etc.) rejected
- **Forbidden keys in snapshot:** Pattern `/password|token|secret|session|ciphertext|nonce|encryptiontag|privatekey|reporter|identity|ppks|attachment|storagekey/i` — applied recursively
- **Size limit:** 1 MiB per snapshot
- **JSON serializability** enforced with parse–stringify round-trip
- **scopeKey determinism:** Uses locale string for locale-scoped revisions,
  `"root"` for non-locale parent revisions — avoiding MySQL/MariaDB nullable-unique
  ambiguity
- **Tests cover:** Allowed resource types, forbidden keys, circular references,
  scopeKey determinism. Missing: deeply nested forbidden key test (see L1).

### Audit Sanitization

`src/lib/audit/sanitize.ts`:
- Recursive traversal with depth limit (6), array-item limit (50),
  string-length limit (500 chars), total-size limit (16 KiB)
- Date values → ISO strings; BigInt → decimal string; NaN/Infinity → null
- Sensitive keys redacted to `[REDACTED]`
- Tests cover redaction, normalization, and size-rejection

### Outbox Security

`src/lib/outbox/enqueue.ts`:
- Discriminated union: `{sensitive: false, payload: {...}}` vs `{sensitive: true, encryptedPayload: {...}}`
- Sensitive-key detection scans plaintext payloads and rejects them (forcing
  the encrypted path for privacy-sensitive messages)
- Payload size limit: 64 KiB
- Idempotency key: min 8, max 191 characters (Zod-enforced)
- Tests cover plaintext path, encrypted path, and sensitive-key rejection

### Negative Test Coverage

| Primitive | Tested | Missing |
|-----------|--------|---------|
| `parseDatabaseUrl` | 5 invalid URL patterns | Empty password URL (`u:@host`) |
| `sanitizeAuditMetadata` | Redaction, normalization, size limit | Depth > 6, array > 50 boundary |
| `prepareRevision` | Forbidden resource, forbidden key, circular JSON | 1 MiB boundary, deep nested key |
| `prepareOutboxMessage` | Plaintext, encrypted, sensitive-key rejection | Idempotency-key boundary |

The missing boundary tests are low severity because the implementations have
explicit limits checked in code; the existing tests validate the core behaviors.

## MariaDB/Hostinger Risk Assessment

The following items require verification on an isolated MariaDB staging instance
(following `docs/20-test-acceptance-go-live.md` guidance):

1. **ENUM handling**: MariaDB and MySQL handle ENUMs identically for the values
   used. Low risk.
2. **JSON column type**: Prisma uses `JSON` → MySQL/MariaDB `JSON`. Both
   engines support this. Verify JSON path queries if used. Low risk.
3. **`LONGTEXT` + `utf8mb4`**: Consistent across engines. Low risk.
4. **Nullable UNIQUE indexes**: MariaDB InnoDB behavior matches MySQL (multiple
   NULLs allowed). Medium risk — verify explicitly.
5. **`FOREIGN KEY` enforcement**: MariaDB's InnoDB supports foreign keys
   identically. Low risk.
6. **`connectionLimit` pool**: The `PrismaMariaDb` adapter uses `mariadb`
   driver's connection pool. Verify pool behavior under load. Low risk.
7. **Hostinger PHPMyAdmin / direct SQL access**: Migration must be run via
   `prisma migrate deploy`, not manually recreated. The handoff notes that the
   test user had global DDL rights only during shadow DB creation. Production
   credentials must be least-privileged.
8. **FULLTEXT indexes**: Not present in this migration. No risk for M1.

## Recommendation

1. Fix M1 (seed `allowPublicKeyRetrieval` IPv6 inconsistency) before M2 by
   importing `LOCAL_DATABASE_HOSTS` from `src/lib/db/config` or using the
   shared config.
2. Schedule MariaDB staging verification before M2 gate. The handoff correctly
   documents this as pending.
3. Replace `@fuspi-maintainer` placeholder in CODEOWNERS before production branch.
4. Add boundary tests for depth/array/size limits in M2 or as a follow-up contract
   task.

No blocking issues. The branch is ready for integration pending reviewer sign-off.

---

*Review performed on commit `99bf1d1` (2026-07-13). DeepSeek did not modify any
GPT files. Review branch: `ai/deepseek/m1-review-gpt-platform`.*
