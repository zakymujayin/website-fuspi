---
id: M2-CLAUDE-AUTH-UX-SPEC-REVISION
milestone: M2
owner: claude
reviewer: gpt
tester: deepseek
base_sha: 18a26dd
allowed_paths:
  - "coordination/reviews/M2-AUTH-UX-SPEC-claude.md"
  - "coordination/handoffs/M2-CLAUDE-AUTH-UX-SPEC-claude.md"
forbidden_paths:
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "e2e/**"
readonly_paths:
  - "coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md"
  - "src/contracts/auth.ts"
  - "docs/06-autentikasi-role.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/20-test-acceptance-go-live.md"
depends_on:
  - M2-CLAUDE-AUTH-UX-SPEC
  - M2-GPT-AUTH-CONTRACT
contracts:
  - coordination/reviews/M2-AUTH-SECURITY-CROSS-LANE-gpt.md
  - src/contracts/auth.ts
acceptance_commands:
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M2-CLAUDE-AUTH-UX-SPEC-REVISION.md TASK_BASE=coordination/m2-revision-assignment npm run check:scope
risk: medium
token_class: S
status: ready
---

# M2 Claude Auth UX Specification Revision

Revise the existing auth UX specification and its handoff to comply with the binding GPT
cross-lane decision. Do not implement routes, components, messages, Auth.js behavior,
security helpers, schema, dependencies, or M3 work.

## Acceptance criteria

- Current password is included in the mandatory-password-change state for ID/EN/AR intent,
  keyboard flow, screen-reader associations, validation, and recovery.
- Expired non-sensitive CMS sessions and revoked/private sessions follow the distinct safety
  rules in the GPT decision; PPKS never preserves or exposes a client draft.
- Rate limiting and timing-equalization answers are recorded as resolved platform contracts,
  not left as unanswered questions.
- Every auth implementation/test follow-up is labeled M2, not M3.
- The review and handoff contain no unsupported promise of automatic draft recovery.
- Only the two allowed documentation files differ from the assignment base.

## Handoff requirements

Update the existing handoff with the revision commit, exact commands/results, resolved
questions, remaining Arabic native-speaker review, and no request to start M3.
