---
id: M2-GPT-SHARED-RATE-LIMIT
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: 29a8c1a
allowed_paths:
  - "src/contracts/operations.ts"
  - "src/lib/rate-limit/**"
  - "tests/platform/shared-rate-limit.test.ts"
  - "tests/platform/shared-rate-limit.integration.test.ts"
  - "coordination/handoffs/M2-GPT-SHARED-RATE-LIMIT-gpt.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env*"
  - "prisma/**"
  - "src/generated/**"
  - "src/app/**"
  - "src/components/**"
  - "src/features/**"
  - "src/lib/auth/**"
  - "src/lib/storage/**"
  - "src/proxy.ts"
readonly_paths:
  - "prisma/schema.prisma"
  - "src/lib/db/client.ts"
  - "src/lib/security/hmac.ts"
  - "src/lib/auth/runtime/rate-limit.ts"
depends_on:
  - M2-GPT-CRYPTO-HMAC-PRIMITIVES
contracts:
  - docs/02-database-schema.md
  - docs/13-celah-fitur-keamanan-operasional.md
  - docs/14-sistem-tiket-pengaduan-ppks.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run test:integration
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-SHARED-RATE-LIMIT.md TASK_BASE=origin/coordination/m2-gpt-shared-rate-limit-assignment npm run check:scope
risk: high
token_class: M
status: assigned
---

# M2 GPT Shared Persistent Rate Limit

Implement the reusable PostgreSQL fixed-window limiter for non-login public surfaces. The
existing login limiter remains unchanged.

## Required implementation

1. Freeze policies for CONTACT/SURVEY (5/hour), PPKS submission (10/day), autocomplete
   (60/minute), ticket tracking per IP (10/15 minutes), and tracking per ticket number
   (5/15 minutes).
2. Accept only a 64-character HMAC-SHA-256 key, fixed policy, and valid UTC instant. Provide a
   helper that derives the key through the existing HMAC primitive; never persist raw IP,
   ticket number, email, token, or form data.
3. Consume a bucket atomically in one PostgreSQL upsert. Exactly `limit` requests per fixed
   window are allowed under concurrency; later requests return one generic `RATE_LIMITED`
   result and bounded retry seconds.
4. Keep different policies and windows independent. Persist only keyHash, scope, windowStart,
   count, and blockedUntil. Do not log identifiers or technical errors.
5. Add unit tests for every frozen policy, UTC boundary calculation, validation, and generic
   results. Add PostgreSQL tests with at least 25 simultaneous requests to a 5-request policy,
   raw-identifier absence, policy isolation, and next-window reset.
6. Do not add routes, proxy-IP parsing, Turnstile, UI/copy, auth changes, schema/migrations,
   dependencies, or domain submissions.
