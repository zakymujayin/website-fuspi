# Handoff — M2-GPT-CONTENT-SANITIZER — GPT

- Branch: `ai/gpt/m2-content-sanitizer`
- Base SHA: `49d605f`
- Implementation head SHA: `09b01a3`

## Result

Added a pure output-sanitization boundary for later CMS/import/export consumers:

- `sanitizeRichTextHtml` applies an explicit semantic-tag/attribute allowlist through the
  installed `isomorphic-dompurify` package;
- active elements, scripts, event handlers, styles, unknown attributes, SVG/MathML, forms,
  embeds, unsafe schemes, data images, protocol-relative URLs, and mixed-content HTTP
  resources are removed;
- input is capped at 1 MiB and all invalid/oversize failures use one non-reflective error;
- `protectCsvFormulaCell` prefixes spreadsheet control/formula starts while preserving
  safe text exactly.

No route, renderer, editor, importer, exporter, database, dependency, or UI was changed.

## Files changed

- `src/lib/security/sanitize.ts`
- `tests/platform/security/content-sanitizer.test.ts`
- `coordination/handoffs/M2-GPT-CONTENT-SANITIZER-gpt.md`

## Contract/schema/migration impact

- New pure helper contract only.
- No Prisma schema, migration, dependency, environment, API, or shared UI impact.

## Verification

| Command | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 263 passed, 34 DB-gated skipped |
| `npx vitest run tests/platform/security/content-sanitizer.test.ts` | PASS — 34 passed |
| `npm run build` with documented build-only PostgreSQL/Auth/HMAC environment | PASS |
| `npm audit --audit-level=high` | PASS — exit 0; 0 High/Critical, 5 Moderate transitive advisories |
| `git diff --check` | PASS |

The first focused corpus run correctly exposed that a globally strict URI regex removed
safe non-URI attributes while DOMPurify still specially allowed image data URIs. The final
implementation instead sanitizes into an isolated DOM fragment and validates `href`/`src`
per attribute. The unchanged corpus then passed 34/34.

## Untested areas

- This task does not yet connect the helper to CMS rendering, WordPress import, or CSV
  exports; those consumers require separate leased tasks.
- Browser CSP remains a separate defense-in-depth task.

## Risks and follow-ups

- Safe rich text deliberately excludes iframe/embed/video markup. Later video rendering
  must use a typed component and validated provider ID, not raw editor HTML.
- The sanitizer permits HTTPS external links/images plus application-relative paths.
  Consumers may impose a stricter same-origin media policy.
- Five existing Moderate transitive advisories have only breaking automated fixes and were
  not force-applied.

## Requested shared changes

None.
