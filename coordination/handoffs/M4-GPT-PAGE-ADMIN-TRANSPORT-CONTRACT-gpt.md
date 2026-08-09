# M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT handoff

## Identity

- Task: `M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT`
- Branch: `ai/gpt/m4-page-admin-transport-contract`
- Frozen Page-domain base: `bb55b642d643d0d0ecd8b3e29b012218e773ae34`
- Assignment/branch base: `bb256e9bfafa78f8b085346aae1dd61d77d6022c`
- Implementation head: `35595759ca8738b174ec4f6c6c003c7ba2f4b2ff`
- Handoff head: this document's commit, immediately after the implementation
  head; resolve from the remote branch tip.

## Summary

The ADMIN-only Page CMS transport boundary is frozen without opening runtime,
HTTP routes, UI, schema, or configuration. The contract:

- normalizes only singular, bounded Page list search parameters;
- reuses the accepted Page list/domain schemas rather than forking limits;
- exposes a strict editor view with coherent safe public hero metadata;
- accepts exactly CREATE, UPDATE, PUBLICATION, and optimistic DELETE commands;
- converts Date-bearing domain results into strict JSON-safe responses; and
- maps all Page domain failures to stable, non-technical transport codes.

No client input can carry actor, role, content owner, scope, capability,
arbitrary status, selector, schedule, autosave, or force-delete authority.

## Files changed

- `src/contracts/page-admin.ts`
- `tests/m4/contracts/page-admin-transport-contract.test.ts`
- `coordination/handoffs/M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT-gpt.md`

## API, schema, and migration impact

- Adds a TypeScript/Zod boundary only; no HTTP endpoint is opened.
- No Prisma schema or migration change.
- No dependency, environment contract, navigation, proxy, public route, or UI
  change.
- Existing Page and Media contracts remain byte-unchanged.

## Verification

All commands ran from `/home/zhev/myproject/fuspi-gpt`.

| Command | Result |
|---|---|
| `npx vitest run tests/m4/contracts/page-admin-transport-contract.test.ts` | PASS — 1 file, 10/10 tests |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 54 files, 824/824 tests |
| `npm run prisma:validate` | Initial invocation could not resolve absent `DATABASE_URL`; rerun with a local-only synthetic `fuspi_dev_gpt` URL: PASS, schema valid. No database connection or mutation was performed. |
| `npm run build` | PASS — Next.js 16.2.10, 34/34 static pages generated |
| `git diff --check origin/integration/m4-features...HEAD` | PASS |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-PAGE-ADMIN-TRANSPORT-CONTRACT.md TASK_BASE=origin/integration/m4-features npm run check:scope` | PASS — 2 implementation files within lease before this handoff commit |

`next build` rewrote the generated route reference in `next-env.d.ts`; it was
restored through the required patch workflow. The final branch contains no
`next-env.d.ts` change.

## Untested areas, risks, and follow-ups

- Runtime session/role/password-change enforcement, CSRF, bounded body parsing,
  status mapping, no-store headers, route revalidation, and unexpected-error
  handling remain closed for the next GPT runtime task.
- PostgreSQL integration and browser tests are not applicable to this
  contract-only change; the accepted Page domain integration evidence remains
  unchanged.
- The contract intentionally follows the frozen domain's PUBLIC-media rule for
  `heroMediaId`; it does not introduce a new MIME rule outside that contract.
- Independent review is required before a Page runtime task may depend on this
  boundary. Do not merge this branch to integration or `main` from the writer
  lane.
