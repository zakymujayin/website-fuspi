# FUSPI Multi-Model Agent Rules

## Identity contract

- The product is **FUSPI — Fakultas Ushuluddin dan Pemikiran Islam**, not FUDA.
- The only v1 study programs are, in order: IAT, IH, AFI, SAA, and TASPI. Use `src/config/institution.ts` as the code contract.
- FUDA and `fuda.uinbanten.ac.id` may appear only when explicitly labeled as an external reference. Never copy FUDA identity, domain, email, programs, seed data, metadata, or public copy into FUSPI.
- Do not guess the SILA public domain. Read it from `NEXT_PUBLIC_SILA_URL` when integration is authorized.

<!-- BEGIN:nextjs-agent-rules -->
This project uses Next.js 16. APIs, conventions, async params/searchParams, caching, and `proxy.ts` may differ from older versions. Before changing framework behavior, read the relevant guide under `node_modules/next/dist/docs/` and heed deprecations.
<!-- END:nextjs-agent-rules -->

## Read first

1. `docs/README.md` for source-of-truth precedence and v1 scope.
2. `docs/24-implementation-plan-multi-model.md` for lane ownership and merge rules.
3. Your assigned `coordination/tasks/<TASK-ID>.md`.
4. Only the feature documents listed in that manifest.

Do not read all project documents into every prompt. Do not start without a task manifest and active path lease.

## Non-negotiable workflow

- Work only in your model-specific Git worktree and task branch.
- Change only `allowed_paths`; treat `readonly_paths` as context and never touch `forbidden_paths`.
- Do not edit another agent's branch, worktree, task status, lease, or handoff.
- Do not merge to `integration/*` or `main`. Commit your task and write a handoff.
- Do not resolve shared-file conflicts with `ours`, `theirs`, force checkout, or copy-paste between worktrees.
- A schema, dependency, root config, auth, proxy, env-contract, navigation-registry, or shared-contract change requires a GPT-owned contract task first.
- Never edit an already-merged migration. Add a corrective migration.
- Preserve user changes and stop on unknown dirty files.

## Lane ownership

- GPT: platform/contracts, dependencies, Prisma, auth/RBAC, storage/crypto, PPKS, booking concurrency, privacy, CI, release integration.
- Claude: design system, public UI/routes, shared UI primitives, RTL, accessibility, visual/performance frontend.
- DeepSeek: non-sensitive CMS/admin CRUD, frozen-contract domain queries/actions/validation, import, fixtures, and tests.

The task manifest overrides default ownership only when it explicitly grants paths, but two active leases may never overlap.

## Coding conventions

- Server Components by default; Client Components only for browser state/interactions.
- Validate at every trust boundary with shared Zod schemas.
- Check session, permission, ownership, and record scope in every loader/action/route handler; `proxy.ts` is UX, not authorization.
- Use transactions for parent+translations and concurrency-sensitive operations.
- Store timestamps in UTC; display business time in `Asia/Jakarta`.
- ID is mandatory content locale; EN/AR may fallback. Arabic must be RTL from the first implementation.
- Use logical direction utilities (`ms/me/ps/pe/start/end/text-start`), never physical left/right utilities except assets that must not mirror.
- Do not expose PII, tokens, private storage keys, PPKS content, or technical errors in logs, analytics, email, JSON, RSC payloads, or UI.

## shadcn/UI rules

- Use `npx shadcn@latest` for shadcn operations and inspect project context with `npx shadcn@latest info`.
- Use installed components and semantic tokens before custom markup/styles.
- Forms use `FieldGroup` + `Field`; overlays require accessible titles; toast uses Sonner; loading uses Skeleton/Spinner.
- Use `gap-*`, not `space-x/y-*`; use `size-*` for equal dimensions; use `cn()` for conditional classes.
- Icons inside buttons use `data-icon`; do not hard-code icon size inside shadcn controls.
- Only the Claude/UI lane changes global tokens, UI primitives, or `globals.css` unless a task explicitly grants it.

## Required verification

Run every command in `acceptance_commands`. Minimum for code changes:

```bash
npm run lint
npm run typecheck
npm run test
```

Also run Prisma validation for schema/data work, integration tests for server behavior, Playwright/axe for UI flows, and adversarial tests for security-sensitive changes.

## Handoff

Create `coordination/handoffs/<TASK-ID>-<model>.md` containing:

- task ID, branch, base SHA, head SHA;
- summary and files changed;
- API/schema/migration impact;
- exact commands and results;
- untested areas, risks, and follow-ups;
- any requested contract/dependency change.

Chat summaries are not durable state. A task is not done without its committed handoff.
