---
id: M2-CLAUDE-AUTH-UX-SPEC
milestone: M2
owner: claude
reviewer: gpt
tester: deepseek
base_sha: ebd2a6d
allowed_paths:
  - "coordination/reviews/M2-AUTH-UX-SPEC-claude.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "src/app/[locale]/(public)/**"
  - "src/components/public/**"
  - "src/components/ui/**"
  - "src/app/globals.css"
  - "messages/**"
depends_on:
  - M1-CLAUDE-HOMEPAGE-SHELL
contracts:
  - docs/03-design-system.md
  - docs/06-autentikasi-role.md
  - docs/12-multibahasa-rtl.md
  - docs/17-komponen-ui-detail.md
  - docs/20-test-acceptance-go-live.md
acceptance_commands:
  - git diff --check
risk: low
token_class: S
status: ready
---

# M2 Claude Auth UX Review Specification

Produce a read-only UX/accessibility specification for the later authentication implementation. Cover login, generic invalid credentials, rate limiting, inactive account, mandatory first password change, expired/revoked session, safe redirect recovery, logout, and unsaved-work messaging.

For every state, specify ID/EN/AR copy intent, RTL behavior, keyboard/focus destination, screen-reader announcement, loading behavior, sensitive-data restrictions, and a testable acceptance statement. Identify which states must remain deliberately indistinguishable to prevent account enumeration.

Do not design or implement security behavior, routes, components, messages, dependencies, or schema. Write exactly one review document, commit it, push the task branch, and stop.
