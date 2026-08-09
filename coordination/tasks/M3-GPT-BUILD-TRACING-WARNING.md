---
id: M3-GPT-BUILD-TRACING-WARNING
milestone: M3
owner: gpt
reviewer: deepseek
tester: deepseek
base_sha: 3d7b160
allowed_paths:
  - "next.config.ts"
  - "src/lib/storage/staged-file.ts"
  - "coordination/handoffs/M3-GPT-BUILD-TRACING-WARNING-gpt.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "prisma/**"
  - "src/contracts/**"
  - "src/proxy.ts"
  - "messages/**"
  - "tests/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "src/lib/content/media-admin-transport.ts"
  - "src/app/api/admin/media/route.ts"
  - "src/lib/storage/paths.ts"
  - "node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md"
  - "node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md"
acceptance_commands:
  - npm run lint
  - npx tsc --noEmit
  - "RUN_PLATFORM_DB_TESTS=true npm test"
  - npm run build
  - git diff --check
risk: high
token_class: M
status: ready
---

# M3 GPT build tracing warning

`npm run build` emits one Turbopack warning. The workspace pre-commit checklist requires zero build
warnings, so this blocks the M3 exit gate. It is **bundle bloat, not breakage** — the build
succeeds — which is why it was deferred rather than guessed at by the integrator stand-in.

## Exact warning (reproduced 2026-07-25, head `3d7b160`)

```text
Turbopack build encountered 1 warnings:
./next.config.ts
Encountered unexpected file in NFT list
A file was traced that indicates that the whole project was traced unintentionally...

Import trace:
  App Route:
    ./next.config.ts
    ./src/lib/storage/staged-file.ts
    ./src/lib/content/media-admin-transport.ts
    ./src/app/api/admin/media/route.ts
```

## Root cause (diagnosed, not yet fixed)

`src/lib/storage/staged-file.ts` builds paths with `path.join` / `realpath` / `mkdir` from a
**runtime-configurable** storage root (`UPLOAD_DIR`, `UPLOAD_PRIVATE_DIR`, `PPKS_PRIVATE_DIR`, via
`parseStorageRoots`). The `output: "standalone"` file tracer cannot resolve those dynamic paths
statically, decides it may need the whole project, and over-includes it into the media route's NFT
list. The uploaded files live on the host filesystem under those roots at runtime — **nothing under
those paths should ever be bundled** — so the over-tracing is pure waste.

## Why the integrator stand-in did not fix it

1. `next.config.ts` and `src/lib/storage/staged-file.ts` are both GPT hotspots, and `staged-file.ts`
   enforces storage-boundary security (symlink + `realpath` checks). A tracing change there is easy
   to get subtly wrong.
2. Both candidate fixes risk **dropping a file the media route needs at runtime in the standalone
   output** — a regression that `npm run build` will not catch and that cannot be fully validated
   without booting the standalone server. That validation is required here (see below).

## Candidate fixes (both docs read; pick and justify one)

Docs consulted: `output.md` and `turbopack.md` under `node_modules/next/dist/docs/`. Confirmed
`outputFileTracingExcludes` / `outputFileTracingIncludes` / `outputFileTracingRoot` exist in
`next/dist/server/config-schema.js` (Next 16.2.10).

- **A — `outputFileTracingExcludes` in `next.config.ts`.** Keyed by route glob (e.g.
  `/api/admin/media/*`, `/api/admin/posts/*`), value is a project-root file glob to exclude from the
  trace. Lowest touch to the security file, but **must not** exclude anything the route genuinely
  loads. Enumerate what the over-trace actually pulled before excluding, so a needed file is not
  dropped.
- **B — inline `turbopackIgnore` on the dynamic path ops in `staged-file.ts`.** The warning text
  suggests `path.join(/*turbopackIgnore: true*/ …)`, but `turbopack.md` documents that magic comment
  for `import()`/`require()`, not `path.join` — **verify it actually suppresses this NFT warning
  before relying on it**; it may be a no-op here. If used, it must be a comment-only annotation with
  **zero** change to the security logic.

Do not merely suppress the warning with `turbopackIgnoreIssue` — that hides the signal without fixing
the over-trace.

## Mandatory validation — build-green is not sufficient

Because the failure mode is a runtime regression in standalone mode:

1. `npm run build` must emit **zero** warnings.
2. Boot the produced standalone server (`node .next/standalone/server.js` with the env set) and
   exercise the media admin route end to end — list and an upload commit — proving no file the route
   needs was excluded from the bundle.
3. `RUN_PLATFORM_DB_TESTS=true npm test` and `npm run test:integration` stay green (storage and media
   transport tests unchanged).

Record the standalone smoke-test commands and their raw output in the handoff.

## Stand-in note

Codex is out of usage limit (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`). This
is a security-adjacent root-config hotspot with a validation step the integrator stand-in cannot
fully perform blind, so it is packaged for Codex rather than guessed at. If a stand-in does attempt
it, the standalone smoke test above is non-negotiable, and it must be re-reviewed by Codex.
