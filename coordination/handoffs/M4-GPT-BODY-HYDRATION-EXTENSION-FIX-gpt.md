# Handoff — M4-GPT-BODY-HYDRATION-EXTENSION-FIX — gpt

- Branch: ai/gpt/m4-facility-homepage-admin
- Base SHA: b4af3bda9b529abdd426134f333b6b997bba2c0c
- Head SHA: see branch HEAD (`git rev-parse HEAD`) after final commit

## Result

The root locale layout now suppresses hydration warnings on the document body.
This covers browser extensions that inject attributes such as
`cz-shortcut-listen` before React hydrates, which was surfacing as a Next.js
development overlay while saving editor forms.

## Files changed

- `src/app/[locale]/layout.tsx`
- `tests/foundation/locale-layout-hydration.test.ts`
- `coordination/tasks/M4-GPT-BODY-HYDRATION-EXTENSION-FIX.md`

## API/schema/migration impact

- No API, schema, migration, or auth changes.
- The change is limited to React hydration warning handling on the root
  `<body>` element.

## Verification

| Command | Result |
|---|---|
| `npx vitest run tests/foundation/locale-layout-hydration.test.ts` | Passed, 1 file / 1 test |
| `git diff --check` | Passed |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run test` | Passed, 93 files / 1157 tests |

## Untested areas

- Browser extension behavior was inferred from the reported body attribute in
  the Next.js overlay. It was not reproduced through an actual extension in
  Playwright.

## Risks and follow-ups

- This suppresses root body attribute mismatch noise. It does not hide actual
  save API errors, validation failures, or component-level hydration defects.
- Disabling the extension that injects `cz-shortcut-listen` should also remove
  the warning in development browsers.

## Requested contract/dependency changes

- None.
