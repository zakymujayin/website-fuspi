---
id: M3-GPT-PROCESS-RECONCILIATION-AND-EXIT
milestone: M3
owner: gpt
reviewer: deepseek
tester: gpt
base_sha: a8408b17a581862d6cc92c493939e58549f56a77
allowed_paths:
  - "coordination/ownership.yml"
  - "coordination/tasks/M3-GPT-PROCESS-RECONCILIATION-AND-EXIT.md"
  - "coordination/tasks/M3-GPT-BUILD-TRACING-WARNING-R3.md"
  - "coordination/tasks/M3-GPT-CLAUDE-OPERATIONAL-CONTROL.md"
  - "coordination/tasks/M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION.md"
  - "coordination/tasks/M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION.md"
  - "coordination/reviews/M3-DEEPSEEK-REVIEW-QUARANTINE.md"
  - "coordination/reviews/M3-EXIT-GATE-EVIDENCE-MAP.md"
  - "coordination/reviews/M3-FINAL-ACCEPTANCE-gpt.md"
  - "coordination/milestones/M3-REFERENCE-SLICE-EXIT.md"
  - "coordination/handoffs/M3-GPT-PROCESS-RECONCILIATION-AND-EXIT-gpt.md"
forbidden_paths:
  - ".env*"
  - "AGENTS.md"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "playwright.config.ts"
  - "prisma/**"
  - "src/**"
  - "messages/**"
  - "tests/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/README.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/adr/ADR-0004-claude-operational-control-handoff.md"
  - "coordination/milestones/M3-REFERENCE-SLICE-ENTRY.md"
  - "coordination/reviews/M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION-deepseek.md"
  - "coordination/reviews/M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION-deepseek.md"
  - "coordination/reviews/M3-GPT-BUILD-TRACING-WARNING-deepseek.md"
  - "coordination/handoffs/M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION-gpt.md"
  - "coordination/handoffs/M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION-gpt.md"
  - "coordination/handoffs/M3-GPT-BUILD-TRACING-WARNING-R3-gpt.md"
  - "src/config/institution.ts"
depends_on:
  - M3-GPT-MEDIA-FOCUS-ORDER-CORRECTION
  - M3-GPT-AUTOSAVE-MUTATION-SERIALIZATION
  - M3-GPT-BUILD-TRACING-WARNING-R3
contracts:
  - docs/20-test-acceptance-go-live.md
  - docs/24-implementation-plan-multi-model.md
  - coordination/milestones/M3-REFERENCE-SLICE-ENTRY.md
acceptance_commands:
  - git diff --check
  - npm run lint
  - npm run typecheck
  - npm run prisma:validate
  - "RUN_PLATFORM_DB_TESTS=true npm test"
  - npm run test:integration
  - npm run build
  - "PLAYWRIGHT_BASE_URL=http://localhost:3004 npx playwright test e2e/m3 --project=chromium --project=mobile --workers=1"
  - "TASK_MANIFEST=coordination/tasks/M3-GPT-PROCESS-RECONCILIATION-AND-EXIT.md TASK_BASE=origin/coordination/m3-final-exit-assignment npm run check:scope"
risk: high
token_class: L
status: merged
---

# M3 process reconciliation and exit

Reconstruct the M3 merge queue from the authoritative remote head, preserve all historical evidence,
replace the unleased build candidate, replay mandatory evidence on fresh GPT-owned runtime state,
and issue the M3 exit contract only if the final integration head is green.

## Queue and evidence rules

1. Treat the local ahead-only integration head as non-authoritative audit state.
2. Merge Media focus, autosave serialization, and build R3 one at a time. Push and run the
   proportional post-merge gate before taking the next candidate.
3. Never merge the three quarantined R1 review commits or the unleased original build candidate.
4. Record that the R2 review manifests postdate their review commits. Do not describe those
   historical reviews as prospectively leased.
5. Consume DeepSeek's independent technical findings only after verifying branch structure,
   candidate diff, and patch identity. GPT independently replays all mandatory runtime evidence.
6. Use a fresh GPT-owned PostgreSQL database, port, and temporary storage; record exact commands,
   exit codes, test counts, build warning count, NFT contents, and standalone HTTP results.
7. Update the evidence map from draft to final only at the tested remote integration head.
8. Tag `m3-accepted` only after the exit contract and handoff are committed on the green integration
   head. Do not merge to `main`, open M4, deploy, or perform any production action.
