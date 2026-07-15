---
id: M2-GPT-UPLOAD-STORAGE-BOUNDARIES
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: fe7d186
allowed_paths:
  - "src/contracts/storage.ts"
  - "src/lib/storage/**"
  - "tests/platform/storage/**"
  - "coordination/handoffs/M2-GPT-UPLOAD-STORAGE-BOUNDARIES-gpt.md"
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
  - "src/proxy.ts"
readonly_paths:
  - "src/contracts/security.ts"
  - "src/lib/security/encryption.ts"
  - "prisma/schema.prisma"
depends_on:
  - M2-GPT-CONTENT-SANITIZER
contracts:
  - docs/07-upload-media-hostinger.md
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
  - TASK_MANIFEST=coordination/tasks/M2-GPT-UPLOAD-STORAGE-BOUNDARIES.md TASK_BASE=origin/coordination/m2-gpt-upload-storage-assignment npm run check:scope
risk: high
token_class: M
status: ready
---

# M2 GPT Upload and Storage Boundaries

Build the provider-neutral filesystem and validation boundary before any upload route or
database mutation is allowed to accept files.

## Required implementation

1. Define strict upload contracts for PUBLIC and PRIVATE media, detected MIME, sanitized
   display filename, size, checksum, dimensions, and opaque storage key.
2. Detect file content with `file-type`; never trust browser MIME or filename extension.
   Allow only JPEG, PNG, WebP, and structurally bounded PDF in this task. Reject SVG, HTML,
   executable content, unknown bytes, MIME/extension disagreement, double extensions,
   null bytes, oversize input, and PDF lacking terminal structure.
3. Inspect images with `sharp`, enforce a pixel-area ceiling, and reject malformed or
   unsupported images without exposing decoder details.
4. Normalize display filenames as metadata only. Generate opaque storage keys internally;
   user input must never become a path segment.
5. Parse three absolute, distinct, non-overlapping storage roots. Resolve every key beneath
   its assigned root and reject traversal, separators outside the contract, symlinks, or
   root escape.
6. Implement staged filesystem writes with exclusive creation, restrictive permissions,
   explicit commit/discard, checksum verification, and cleanup on failure. PUBLIC and
   PRIVATE are supported; plaintext `PPKS_PRIVATE` writes must fail closed until the next
   encrypted-attachment task consumes the crypto contract.
7. Add adversarial tests using synthetic files and temporary directories. No production or
   real PPKS data may be used.

This task must not add routes, database writes, migrations, environment variables, public
download behavior, authorization, or PPKS plaintext persistence.
