---
id: M2-GPT-CRYPTO-HMAC-PRIMITIVES
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: b6d1284
allowed_paths:
  - "src/contracts/security.ts"
  - "src/lib/security/**"
  - "tests/platform/security/**"
  - "coordination/handoffs/M2-GPT-CRYPTO-HMAC-PRIMITIVES-gpt.md"
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
  - "src/contracts/platform.ts"
  - "prisma/schema.prisma"
  - "coordination/milestones/M2-EXIT-GATE-AND-M3-ENTRY.md"
depends_on:
  - M2-GPT-POSTGRESQL-PLATFORM-MIGRATION
contracts:
  - docs/13-celah-fitur-keamanan-operasional.md
  - docs/14-sistem-tiket-pengaduan-ppks.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-CRYPTO-HMAC-PRIMITIVES.md TASK_BASE=origin/coordination/m2-gpt-crypto-hmac-assignment npm run check:scope
risk: high
token_class: M
status: ready
---

# M2 GPT Cryptography and HMAC Primitives

Create the small, audited primitive layer required before any PPKS or public tracking
workflow may persist sensitive data.

## Required implementation

1. Define a strict AES-256-GCM envelope contract with canonical base64url fields,
   96-bit nonces, 128-bit authentication tags, and a positive key version.
2. Implement encryption and decryption with mandatory, domain-separated additional
   authenticated data (AAD), random nonce generation, explicit key resolution by version,
   and one generic public failure for malformed, unknown-key, or tampered envelopes.
3. Add typed JSON helpers with schema validation and bounded plaintext size. Never place
   plaintext, keys, ciphertext, nonces, tags, or raw crypto errors in thrown messages.
4. Generate public tracking tokens from exactly 32 random bytes. Store/compare only
   domain-separated HMAC-SHA-256 digests and use timing-safe verification.
5. Harden the existing HMAC helper without changing its currently consumed digest format.
6. Add adversarial unit tests for round-trip, nonce uniqueness, AAD/purpose binding, key
   rotation, every envelope component tamper, malformed input, size bounds, token format,
   domain separation, invalid secret, invalid digest, and generic-error leakage.

This task creates primitives only. It must not add routes, database writes, PPKS queries,
storage behavior, schema migrations, environment contracts, or UI.
