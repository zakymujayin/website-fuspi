---
id: M2-GPT-CONTENT-SANITIZER
milestone: M2
owner: gpt
reviewer: human-owner
tester: gpt
base_sha: b9bdc84
allowed_paths:
  - "src/lib/security/sanitize.ts"
  - "tests/platform/security/content-sanitizer.test.ts"
  - "coordination/handoffs/M2-GPT-CONTENT-SANITIZER-gpt.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - ".env*"
  - "prisma/**"
  - "src/app/**"
  - "src/components/**"
  - "src/contracts/**"
  - "src/features/**"
  - "src/lib/auth/**"
  - "src/lib/storage/**"
  - "src/proxy.ts"
readonly_paths:
  - "tests/foundation/threat-matrix.ts"
  - "tests/security/m2-threat-plan.ts"
depends_on:
  - M2-GPT-CRYPTO-HMAC-PRIMITIVES
contracts:
  - docs/09-fitur-cms-editor.md
  - docs/13-celah-fitur-keamanan-operasional.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - npm audit --audit-level=high
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-GPT-CONTENT-SANITIZER.md TASK_BASE=origin/coordination/m2-gpt-content-sanitizer-assignment npm run check:scope
risk: high
token_class: S
status: ready
---

# M2 GPT Content and CSV Sanitizer

Freeze a single reusable output-sanitization boundary before CMS rendering, imports, or
exports are implemented.

## Required implementation

1. Sanitize editor HTML with the installed `isomorphic-dompurify` dependency and an
   explicit minimal allowlist suitable for institutional rich text.
2. Remove scripts, event handlers, unsafe URL schemes, active/embed elements, inline
   styles, forms, SVG/MathML, and unknown attributes while preserving safe semantic text.
3. Reject non-string and over-limit input through one generic error without reflecting
   attacker content.
4. Provide CSV formula-injection protection for cells whose first effective character is
   `=`, `+`, `-`, `@`, tab, carriage return, line feed, or Unicode BOM. Preserve safe cells.
5. Add an adversarial XSS/CSV corpus covering encoded and mixed-case attacks, malformed
   markup, link/image protocols, Tiptap-like tables/code/lists, and output idempotence.

This task creates pure helpers only. It does not render content, alter editor UI, import
WordPress data, add routes, or change dependencies.
