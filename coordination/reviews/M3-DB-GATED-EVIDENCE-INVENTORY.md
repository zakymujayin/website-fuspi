# M3 DB-gated Evidence Inventory (derived, not described)

Generated from the actual `it(...)` / `test(...)` names in every file gated behind
`RUN_PLATFORM_DB_TESTS`. Regenerate with:

```bash
for f in $(grep -rl "RUN_PLATFORM_DB_TESTS" tests/ | sort); do
  echo "### $f"; grep -oE "(it|test)\(\"[^\"]{0,110}" "$f" | sed "s/^\(it\|test\)(\"/  - /"; echo
done
```

Verified state at `RUN_PLATFORM_DB_TESTS=true npm test`: **63 files passed, 744 passed, 0 failed**.

### tests/m3/runtime/media-admin-transport.integration.test.ts  (4 cases)
  - scopes picker/update/delete and blocks referenced Media
  - uploads a validated image and returns only the frozen batch response
  - commits the 20-image boundary and exactly one public PDF
  - compensates an earlier commit when a later batch item fails

### tests/m3/runtime/media-persistence.integration.test.ts  (2 cases)
  - commits the file and Media row with the session-derived uploader
  - duplicate database keys discard staging without overwriting the committed file

### tests/m3/runtime/post-admin-transport.integration.test.ts  (2 cases)
  - scopes EDITOR list/detail to owned Berita while ADMIN can see both Berita
  - deletes only an owned Berita with optimistic version and records an audit event

### tests/m3/runtime/post-mutations.integration.test.ts  (8 cases)
  - creates parent, relations, sanitized locales, and revisions atomically as EDITOR
  - uses the server clock for scheduling and permits ADMIN to use actor-visible shared media
  - rejects missing references and another EDITOR's Media without partial writes
  - replaces translations and tags atomically and rejects stale updates without partial changes
  - returns identical non-disclosing results for missing and another owner's Post
  - allows optimistic autosave only for an owned draft
  - enforces legal publication transitions and preserves scheduled visibility semantics
  - rolls back optimistic claims and content changes on a slug conflict

### tests/m3/runtime/post-public-queries.integration.test.ts  (5 cases)
  - shows only matching published Posts at or before the server clock
  - resolves exact AR/EN content and deterministic Indonesian fallback
  - filters category/tag without duplicates and paginates with stable ordering
  - builds canonical public cover URLs and hides private cover metadata
  - makes missing, future, wrong-type, wrong-slug, and unusable-locale details indistinguishable

### tests/platform/annual-sequence.integration.test.ts  (3 cases)
  - allocates 20 unique gap-free values for one counter
  - keeps ticket and booking counters independent under parallel load
  - starts a new Jakarta calendar year at one without changing the old counter

### tests/platform/auth-bridge/auth-bridge.integration.test.ts  (4 cases)
  - revalidates active cookies and rejects then removes expired sessions
  - rejects cross-origin and missing-session password mutations
  - keeps wrong-current-password failures generic and non-destructive
  - changes the password, revokes every session, and returns only a safe locale redirect

### tests/platform/auth-runtime/auth-runtime.integration.test.ts  (6 cases)
  - creates an opaque eight-hour database session consumable by the Auth.js adapter
  - returns identical failure sequences for existing, unknown, and inactive accounts
  - rejects expired and inactive sessions and removes their rows
  - changes password atomically and revokes every prior session
  - revokes sessions transactionally on role change and deactivation
  - rejects stale sessions and non-admin security mutations without changing data

### tests/platform/optimistic-lock.integration.test.ts  (4 cases)
  - allows exactly one of two parallel claims for the same version
  - does not distinguish stale and missing records or call mutation on conflict
  - commits the version and translation mutation atomically
  - rolls back both the version claim and downstream writes on failure

### tests/platform/outbox-worker.integration.test.ts  (3 cases)
  - claims eligible rows once across parallel workers and recovers stale locks
  - schedules a generic final failure and never reclaims attempt five
  - requires current lock ownership to complete or fail a row

### tests/platform/platform-db.integration.test.ts  (2 cases)
  - writes revision, audit, and outbox atomically
  - enforces revision and outbox idempotency constraints

### tests/platform/redirect-registry.integration.test.ts  (4 cases)
  - upserts by source idempotently and resolves one safe hop
  - rejects active chains while allowing an inactive edge
  - serializes opposite concurrent edges so exactly one is accepted
  - fails closed on a stored chain and does not increment hitCount

### tests/platform/shared-rate-limit.integration.test.ts  (3 cases)
  - allows exactly five of 25 simultaneous contact requests
  - stores only the HMAC digest and keeps policy scopes independent
  - starts a clean counter at the next fixed window

### tests/platform/ticket-enum-contract.integration.test.ts  (2 cases)
  - has exact complaint, priority, and status labels in the database catalog
  - defaults new Ticket priorities to SEDANG

### tests/platform/ticket-sla.integration.test.ts  (1 cases)
  - loads only active date-only rows in the inclusive range

### tests/security/auth-bridge/auth-bridge-adversarial.integration.test.ts  (6 cases)
  - rejects mismatched password confirmation as PASSWORD_POLICY
  - rejects same-as-current password as PASSWORD_POLICY
  - rejects a common password as PASSWORD_POLICY
  - accepts form-urlencoded password change body
  - wrong current password exposes no PII or account data
  - rejects body with extra unknown properties

### tests/security/auth-runtime/auth-adversarial.integration.test.ts  (8 cases)
  - rate-limit keyHash does not store raw email or IP
  - rate-limit counter is not lost under concurrent same-window increments
  - login failure never issues a cookie when the session issuer throws
  - deactivating a user revokes all their sessions in the same transaction
  - password change revokes every prior session inside the same transaction
  - selectCredentialComparison returns exactly one dummy hash for unknown users
  - inactive users still trigger one real bcrypt comparison
  - revokeAllUserSessions removes every row for a given user

### tests/security/auth-runtime/credentials-route.integration.test.ts  (3 cases)
  - hostile-origin request returns 403 and creates no session or rate-limit mutation
  - successful login returns 200, cookie, and expected JSON shape
  - wrong password returns 401 with sanitized public shape

