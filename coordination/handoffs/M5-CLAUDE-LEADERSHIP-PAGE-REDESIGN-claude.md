# Handoff — M5-CLAUDE-LEADERSHIP-PAGE-REDESIGN

- Task ID: `M5-CLAUDE-LEADERSHIP-PAGE-REDESIGN`
- Branch: `ai/claude/m5-lecturer-profile-redesign`
- Base SHA: `b936c4f`
- Implementation SHA: `8bcafcfd35dbf6202ae1876f36e3d76695802171`

## Summary

Redesigned the public leadership page at `/id/profil/pimpinan` with a clearer
editorial hierarchy and stronger contrast:

- Added a navy page-introduction band with readable white copy and the existing
  brass signature rule.
- Separated the dean's identity and welcome message into a bordered white
  feature surface with a tinted message block.
- Normalized leadership portrait presentation to a consistent 4:3 ratio so
  landscape and portrait source assets no longer create uneven crops/layouts.
- Rebuilt vice-dean entries as equal-height responsive cards and the head of
  administration as a compact horizontal profile on larger screens.
- Added a source-level visual contract test covering surfaces, responsive
  layout, semantic section labels, and RTL-safe direction utilities.

## Files changed

- `src/app/[locale]/(public)/profil/pimpinan/page.tsx`
- `tests/m5/ui/public-leadership-page.test.tsx`
- `coordination/tasks/M5-CLAUDE-LEADERSHIP-PAGE-REDESIGN.md`
- `coordination/handoffs/M5-CLAUDE-LEADERSHIP-PAGE-REDESIGN-claude.md`

## Follow-up requested by owner

- Removed the dean welcome-message block so the card focuses on identity and
  position.
- Changed all leadership photos to `object-contain` inside the shared editorial
  frame so source portraits are not cropped or stretched.
- Added locale-aware `Lihat LHKPN` / `View LHKPN` / `عرض LHKPN` CTA linking to
  KPK's official e-Announcement search page:
  `https://elhkpn.kpk.go.id/portal/user/check_search_announ`.
- Reduced the oversized dark hero into a compact light editorial header so the
  page hierarchy starts with the leadership profiles rather than the banner.
- Changed the vice-dean and administration image surfaces to a neutral slate
  frame and enlarged the administration media column for a more balanced card.
- Added the locale-aware LHKPN CTA to the dean, vice-dean, and administration
  profile groups; vice-dean links are bottom-aligned for consistent card rows.
- Applied the requested redesign pass: compact royal-tinted introduction,
  framed dean feature panel, subtle tinted section surface, two-up vice-dean
  cards with a wide third profile row, neutral image framing, and restrained
  depth/hover treatment.

## API/schema/migration impact

None. Existing leadership data, locale fallback, image paths, and page
semantics remain unchanged.

## Verification

- `npx vitest run tests/m5/ui/public-leadership-page.test.tsx` — passed (5)
- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run test` — passed (140 files, 1,494 tests)
- `git diff --check` — passed

## Untested areas and risks

- Live browser screenshot verification was not possible from this sandbox:
  `localhost:3004` is held by an existing Next dev process but refuses
  cross-process sandbox connections. A temporary visual server hit the same
  Next dev lock. The page was therefore verified through static source tests,
  lint, typecheck, and the full test suite.
- Existing concurrent worktree changes in
  `src/app/[locale]/(public)/dosen/[id]/page.tsx`,
  `src/components/public/research-media-icons.tsx`, and `next-env.d.ts` were
  left untouched.

## Requested contract/dependency changes

None.
