---
id: M3-GPT-BUILD-TRACING-WARNING-R3
milestone: M3
owner: gpt
reviewer: deepseek
tester: gpt
base_sha: 9bd65e969ef31247f94be95eff5d909b71ebfe1c
supersedes_candidate: 5535c1c44f4b758f27b318b8d501482507bdc06f
allowed_paths:
  - "src/lib/storage/staged-file.ts"
  - "coordination/handoffs/M3-GPT-BUILD-TRACING-WARNING-R3-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/contracts/**"
  - "src/proxy.ts"
  - "messages/**"
  - "tests/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "coordination/tasks/M3-GPT-BUILD-TRACING-WARNING.md"
  - "coordination/handoffs/M3-GPT-BUILD-TRACING-WARNING-gpt.md"
  - "coordination/reviews/M3-GPT-BUILD-TRACING-WARNING-deepseek.md"
  - "coordination/reviews/M3-DEEPSEEK-REVIEW-QUARANTINE.md"
  - "src/lib/content/media-admin-transport.ts"
  - "src/app/api/admin/media/route.ts"
  - "src/lib/storage/paths.ts"
  - "node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md"
  - "node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md"
depends_on:
  - M3-DEEPSEEK-BUILD-TRACING-REVIEW-R2
contracts:
  - docs/07-upload-media-hostinger.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - "RUN_PLATFORM_DB_TESTS=true npm test"
  - npm run test:integration
  - npm run build
  - git diff --check
  - "TASK_MANIFEST=coordination/tasks/M3-GPT-BUILD-TRACING-WARNING-R3.md TASK_BASE=origin/coordination/m3-build-r3-assignment npm run check:scope"
risk: high
token_class: M
status: merged
---

# M3 build-tracing warning R3 — process-correct reimplementation

Reimplement the tracing correction prospectively because the earlier candidate was authored while
its task was still `ready` and no active path lease existed. The earlier candidate remains immutable
audit evidence and must not be merged.

## Required work

1. Read the two bundled Next.js 16.2.10 tracing guides before changing framework behavior.
2. Apply only the minimal supported tracing annotations needed to prevent runtime-configured
   storage paths from sweeping the repository into the Media route NFT.
3. Preserve every storage-boundary, symlink, realpath, checksum, exclusive-create, permission,
   compensation, and discard invariant.
4. Prove the source diff is patch-equivalent to the independently reviewed correction or request a
   fresh review for any substantive difference.
5. Build with zero warnings and inspect the Media route NFT for narrow runtime-only contents.
6. Boot the standalone server and authenticate through its real credentials route, then exercise
   Media list, upload, and delete. A forged session cookie is not acceptable.
7. Use a fresh GPT-owned database and `/tmp/fuspi-gpt/` storage. Do not borrow another model's
   database, environment file, or upload directory.
