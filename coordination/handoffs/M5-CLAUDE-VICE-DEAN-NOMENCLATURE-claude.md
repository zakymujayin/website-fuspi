# M5-CLAUDE-VICE-DEAN-NOMENCLATURE

- task ID: M5-CLAUDE-VICE-DEAN-NOMENCLATURE
- branch: ai/claude/m5-lecturer-profile-redesign
- base SHA: a97b0bedadf11e0c5ed5473b76b4b64f1f63691f
- head SHA: cd96817369d4bcf1107941856cd61318f2aaa0c2

## Summary

Updated the three public Vice Dean position labels to match the nomenclature
shown in the supplied reference image, including English and Arabic labels.

## Files changed

- `src/lib/data/dummy-leadership.ts`

## API/schema/migration impact

None. This is a static public-content copy change only.

## Verification

- `git diff --check` — passed
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed (135 files, 1,460 tests)

## Untested areas, risks, and follow-ups

- Visual browser verification was not run; only text data changed.

