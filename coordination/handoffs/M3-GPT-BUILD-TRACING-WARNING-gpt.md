# Handoff — M3-GPT-BUILD-TRACING-WARNING

- Task: `M3-GPT-BUILD-TRACING-WARNING`
- Branch: `ai/gpt/m3-build-tracing-warning`
- Base SHA: `a8435af88bb98e55db8b54ee6ba8e16dda46ebda`
- Implementation SHA: `b7324bb`
- Handoff SHA: recorded by the following documentation commit

## Summary

Removed the Turbopack standalone over-trace without changing storage-boundary behavior. Every
filesystem operation whose path comes from the runtime storage-root contract now carries the
supported `turbopackIgnore` directive. A local `destinationDirectory` preserves the existing
realpath equality check while giving the tracer a bare runtime path to ignore.

The original warning traced 873 files into the Media route NFT, including coordination, docs,
tests, E2E, Prisma, and unrelated source. The corrected
`.next/server/app/api/admin/media/route.js.nft.json` contains 235 files: 212 runtime dependencies,
7 source files, and the generated server/runtime entries. `npm run build` now emits zero warnings.

## Files changed

- `src/lib/storage/staged-file.ts`
- `coordination/handoffs/M3-GPT-BUILD-TRACING-WARNING-gpt.md`

## API, schema, migration, and dependency impact

- No API, schema, migration, dependency, environment-contract, or storage-key change.
- No change to symlink rejection, realpath enforcement, checksum verification, exclusive file
  creation, hard-link commit, permission modes, compensation, or discard behavior.
- `next.config.ts` is unchanged. A narrow `outputFileTracingExcludes` experiment did not prevent
  the pre-exclusion warning and was removed before commit.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 49 files, 738 tests |
| `npm run test:integration` with the isolated local PostgreSQL env | PASS — 20 files, 83 tests |
| `npm run prisma:validate` | PASS |
| `npm run build` with the local runtime env | PASS — compiled successfully, **zero warnings** |
| `git diff --check` | PASS |

### Standalone smoke test

Built with `output: "standalone"`, then booted:

```text
AUTH_URL=http://127.0.0.1:3101
UPLOAD_PUBLIC_URL=/uploads
PORT=3101
HOSTNAME=127.0.0.1
node .next/standalone/server.js
```

The generated server reported:

```text
▲ Next.js 16.2.10
- Local: http://127.0.0.1:3101
✓ Ready in 0ms
```

A synthetic local EDITOR session then exercised the actual standalone routes using the configured
local PostgreSQL database and `/tmp` storage roots:

```json
{"standalone":true,"list":{"status":200,"ok":true},"upload":{"status":200,"committed":true},"delete":{"status":200,"removed":true}}
```

The smoke created a 2×2 PNG in memory, uploaded it through
`POST /api/admin/media/upload`, verified the actor-owned Media row and committed storage key, then
deleted it through `POST /api/admin/media`. The synthetic session/user and any fallback row/file
were removed in `finally`.

## Untested areas, risks, and follow-ups

- The smoke verifies Linux standalone list/upload/delete behavior against local PostgreSQL and
  runtime storage roots. Hostinger/VPS filesystem permissions remain a deployment gate.
- The directives are required by the current Turbopack tracer. A future Next.js upgrade should
  rerun the zero-warning build and standalone Media smoke before removing them.
- Independent review and the separate M3 exit contract remain required before opening M4.
