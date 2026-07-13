---
id: M2-GPT-AUTH-CONTRACT
milestone: M2
owner: gpt
reviewer: deepseek
tester: deepseek
base_sha: ebd2a6d
allowed_paths:
  - "package.json"
  - "package-lock.json"
  - ".env.example"
  - "src/contracts/auth.ts"
  - "src/lib/auth/permission-matrix.ts"
  - "tests/platform/auth-contracts/**"
  - "coordination/adr/ADR-0002-auth-dependency-contract.md"
  - "coordination/handoffs/M2-GPT-AUTH-CONTRACT-gpt.md"
forbidden_paths:
  - "prisma/**"
  - "src/app/**"
  - "src/components/**"
  - "src/proxy.ts"
  - "src/lib/storage/**"
  - "src/lib/security/**"
  - "messages/**"
readonly_paths:
  - "src/generated/prisma/**"
  - "src/lib/db/**"
  - "coordination/milestones/M1-CODE-COMPLETE.md"
depends_on:
  - M1-GPT-PLATFORM-HARDENING
contracts:
  - docs/01-arsitektur.md
  - docs/06-autentikasi-role.md
  - docs/20-test-acceptance-go-live.md
  - docs/25-m0-foundation-capability.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - npm test
  - npm run build
  - npm audit --audit-level=high
risk: high
token_class: M
status: ready
---

# M2 GPT Auth and RBAC Contract Freeze

Freeze the dependency and typed contract boundary before any Auth.js route, proxy, or UI implementation:

1. Verify the current official Auth.js v5/Next.js 16 compatibility and select an exact safe package combination. Record rejected combinations, peer constraints, audit results, and the reason for every added dependency in ADR-0002.
2. Add only the minimum dependencies required for the later Credentials + database-session implementation. Do not add OAuth providers, JWT fallback, UI packages, or mail transport unless the contract demonstrably requires them.
3. Define Zod schemas and TypeScript contracts for credentials input, generic login result/error codes, active database session metadata, password-change input, and server-side authorization context. Never expose email existence, password hashes, raw session tokens, PII, or technical errors.
4. Define one exhaustive permission matrix for ADMIN, EDITOR, PETUGAS, and SATGAS_PPKS consistent with docs 06. Include ownership/scope requirements as data, not route-specific conditionals.
5. Add table-driven contract tests. This task must not create Auth.js config, login routes/pages, proxy behavior, session persistence, or schema changes.

Before changing dependency/framework assumptions, inspect the relevant Next.js 16 guides under `node_modules/next/dist/docs/`. Commit code and the required handoff; do not merge it.
