# M5-CLAUDE-LEADERSHIP-PORTRAITS

- task ID: M5-CLAUDE-LEADERSHIP-PORTRAITS
- branch: ai/claude/m5-lecturer-profile-redesign
- base SHA: efa5eda
- head SHA: 8a8e4ed4a6c1a81e148ed25c317074a40dd8dae0

## Summary

Replaced the leadership portraits with the two supplied images:

- Slamet Sucipto (Kepala Bagian Umum)
- Dr. Ade Fakih Kurniawan (Wakil Dekan III)

Both images were converted to WebP at 800×1067 (3:4) and the second source
was cropped from the bottom so the source screenshot controls are not visible.

## Files changed

- `src/lib/data/dummy-leadership.ts`
- `public/images/leadership/kabag-umum-slamet-sucipto.webp`
- `public/images/leadership/wd3-ade-fakih.webp`

## API/schema/migration impact

None. This is a static public asset/data update only.

## Verification

- `git diff --check` — passed
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed (135 files, 1,460 tests)

## Untested areas, risks, and follow-ups

- No browser screenshot or production upload test was run; the assets were
  inspected locally after conversion.

