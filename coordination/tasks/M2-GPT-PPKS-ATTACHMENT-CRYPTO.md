---
id: M2-GPT-PPKS-ATTACHMENT-CRYPTO
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: f064923
allowed_paths:
  - "src/contracts/storage.ts"
  - "src/lib/storage/**"
  - "tests/platform/storage/ppks-attachment-crypto.test.ts"
  - "coordination/handoffs/M2-GPT-PPKS-ATTACHMENT-CRYPTO-gpt.md"
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
  - "src/lib/security/**"
  - "src/proxy.ts"
readonly_paths:
  - "src/contracts/security.ts"
  - "src/lib/security/encryption.ts"
  - "prisma/schema.prisma"
depends_on:
  - M2-GPT-UPLOAD-STORAGE-BOUNDARIES
  - M2-GPT-CRYPTO-HMAC-PRIMITIVES
contracts:
  - docs/07-upload-media-hostinger.md
  - docs/14-sistem-tiket-pengaduan-ppks.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-PPKS-ATTACHMENT-CRYPTO.md TASK_BASE=origin/coordination/m2-gpt-ppks-attachment-assignment npm run check:scope
risk: critical
token_class: M
status: ready
---

# M2 GPT Encrypted PPKS Attachment Boundary

Add the only permitted path from validated PPKS attachment bytes to encrypted storage.

## Required implementation

1. Add a dedicated PPKS attachment validator using the frozen magic-byte, PDF, image,
   filename, size, and transformation rules. It must return `PPKS_PRIVATE` and replace the
   user filename with a generic download name so filenames cannot expose identity.
2. Encrypt every validated attachment in memory with AES-256-GCM, a fresh 96-bit nonce,
   128-bit tag, positive key version, and mandatory AAD binding ticket ID, attachment ID,
   and purpose. Plaintext must never be staged or written to disk.
3. Generate a separate opaque `.enc` storage key. Store only ciphertext in the PPKS root;
   expose only metadata compatible with `TicketAttachment` plus commit/discard operations.
4. Decrypt only through a key-version resolver and the same ticket/attachment AAD. Unknown
   key, wrong context, malformed metadata, modified ciphertext/nonce/tag, or oversize data
   must produce one generic failure with no plaintext, key, path, or crypto detail.
5. Preserve the plaintext SHA-256 checksum for authorized post-decryption verification and
   independently verify ciphertext before commit.
6. Reuse the staged filesystem guarantees: exclusive creation, no overwrite, restrictive
   permissions, symlink rejection, and cleanup on every failure.
7. Add synthetic adversarial tests for no-plaintext-on-disk, key rotation, nonce uniqueness,
   AAD swapping, every tamper component, filename privacy, collision, discard, and symlink.

This task must not add download routes, authorization, database writes, schema migrations,
environment parsing, logging, email, UI, or any plaintext fallback.
