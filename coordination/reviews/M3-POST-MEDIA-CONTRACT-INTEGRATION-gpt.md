# M3 Post + Media Contract Integration Acceptance

- Integration branch: `integration/m3-reference-slice`
- GPT implementation SHA: `6bf5e3c`
- GPT handoff SHA: `a44989c`
- DeepSeek review SHA: `01b2a60`
- DeepSeek handoff SHA: `e2dd854`
- Contract merge SHA: `706bbe4`
- Review merge SHA: `6eacab4`
- Independent verdict: **APPROVE**

## Decision

The Post + Media contract is frozen and accepted for M3 runtime implementation. DeepSeek found no
reproducible Critical or High contract defect. Its four Medium observations are runtime or future
contract follow-ups and do not justify another contract-review loop.

The reviewer handoff described its frozen base as `87a8fae`; the actual frozen review ref is merge
commit `fa10566`, whose first parent is assignment commit `87a8fae` and whose second parent is GPT
candidate `a44989c`. The reviewed candidate and final diff are therefore unambiguous. The review
branch changed only its two leased documentation files.

## Integration verification

The first clean-worktree run failed only because the ignored Prisma client had not yet been
generated after `npm ci`. After running `npm run prisma:generate` against the already-merged
PostgreSQL schema, the acceptance evidence was:

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npx vitest run tests/m3/contracts` | PASS — 30 passed |
| `npm test` | PASS — 410 passed, 54 database-gated skipped |
| `git diff --check` | PASS |

No source, schema, dependency, generated client, environment contract, route, or UI correction was
needed to accept the candidate.

## Mandatory runtime follow-ups

- Construct actor identity and ownership only from the revalidated server database session.
- Sanitize every translation's rich text before persistence and test stored-XSS rejection.
- Preserve optimistic version conflicts and legal publication transitions inside one transaction.
- Build public media URLs only from the canonical server environment value.
- Make media database/file persistence compensating and fail closed without reporting an orphaned
  staged file.
- Resolve the Medium observations from the DeepSeek review in the owning runtime task; request a
  new GPT contract task only when an exported shape truly must change.
