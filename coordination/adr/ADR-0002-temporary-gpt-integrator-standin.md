# ADR-0002: Temporary GPT/Integrator stand-in

- Status: accepted
- Date: 2026-07-23
- Owner: human coordinator (zaky)

## Decision

Codex's usage limit is exhausted; Codex is not expected to be active again until 2026-07-29. To
keep M3 moving, the human coordinator directed Claude Sonnet 5 to stand in as integrator and for
GPT-lane review/merge duties for this window only (2026-07-23 through 2026-07-29):

- Merge-queue operation: rebase, run acceptance commands, review, merge, close leases.
- Review and merge already-completed GPT contract/handoff branches that were only waiting on
  integrator action (no new authorship of GPT-lane implementation unless explicitly requested).
- Commits made in this capacity use distinct author identities (`Claude Sonnet 5 (Reviewer)`,
  `Claude (temp GPT/Integrator stand-in)`) so git history stays distinguishable from Codex's own
  commits once it returns.

This does not change `AGENTS.md` lane ownership or `coordination/ownership.yml` permanently. It is
a temporary operational substitution, not a redesign of the cross-model review process.

## Consequences

- Cross-model independence is reduced during this window: the same model (Claude) may both author
  Claude-lane work and review/merge GPT-lane work it did not implement. Docs-only/contract-review
  merges (no new GPT implementation authored by Claude) are lower risk and were prioritized first.
- New cross-lane contract decisions opened during this window (schema, auth, proxy, dependency,
  navigation registry) should be treated as provisional and re-checked by Codex on 2026-07-29.
- This ADR should be marked superseded or closed once Codex resumes the integrator role.
