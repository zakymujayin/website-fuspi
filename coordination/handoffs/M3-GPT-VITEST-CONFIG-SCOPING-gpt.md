# Handoff — M3-GPT-VITEST-CONFIG-SCOPING

- **Task ID:** `M3-GPT-VITEST-CONFIG-SCOPING`
- **Branch:** `ai/gpt/m3-vitest-config-scoping`
- **Base SHA:** `d2958e5`
- **Author:** Claude Sonnet 5, standing in for the GPT lane while Codex is out of usage limit
  (`coordination/adr/ADR-0002-temporary-gpt-integrator-standin.md`).

## Change

`vitest.config.ts` (unit, jsdom) now excludes:

- `**/*.integration.test.ts` — owned by `vitest.integration.config.ts` (`environment: "node"`);
- `.next/**` — build output that a production build fills with copied specs.

Both exclusions carry an inline comment explaining why, so the next person does not "helpfully"
remove them.

## Counts before and after (as required by the manifest)

| Command | Before | After |
| --- | --- | --- |
| `npm test` | 45 passed, **18 skipped** (63 files); 669 passed, 75 skipped | **43 passed, 0 skipped** (43 files); **662 passed** |
| `npm run test:integration` | 20 files, 82 passed | **20 files, 82 passed** (unchanged) |

## The 7-test delta is duplication removed, not coverage lost — verified

`npm test` dropped 2 files / 7 tests. Those are the only two `*.integration.test.ts` files that do
**not** gate on `RUN_PLATFORM_DB_TESTS`, so they were previously executing twice — once under jsdom
via the unit config and once under node via the integration config:

- `tests/security/admin-media-transport-adversarial.integration.test.ts` (4 cases)
- `tests/security/admin-post-transport-adversarial.integration.test.ts` (3 cases)

Confirmed they still execute, under the environment they were written for:

```text
npx vitest run --config vitest.integration.config.ts \
  tests/security/admin-media-transport-adversarial.integration.test.ts \
  tests/security/admin-post-transport-adversarial.integration.test.ts
→ 2 passed (2 files), 7 passed (7 tests)
```

669 − 662 = 7, matching exactly. `test:integration` is unchanged at 20/82, so these files were
already counted there. CI runs `npm run test:integration`, so this security-adversarial coverage
remains in the pipeline.

## Effects

- The misleading `18 skipped` line is gone. It disappeared because those files are no longer
  *collected* here — not because anything stopped running.
- A stale `.next/` can no longer inject phantom failures into `npm test`. This had happened twice.
- Integration tests can no longer be accidentally run under jsdom, which is what produced the
  Buffer/`Uint8Array` realm failures that triggered a false alarm earlier in M3.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm test` | PASS — 43 files, 662 passed, 0 skipped |
| `npm run test:integration` | PASS — 20 files, 82 passed |
| `git diff --check` | clean |

## Risks

- Any future test named `*.integration.test.ts` will be picked up only by the integration config and
  runs under `node`. That is the intent, but it is now a naming convention with real consequences
  and is not enforced mechanically.

## Requested contract/dependency change

None.
