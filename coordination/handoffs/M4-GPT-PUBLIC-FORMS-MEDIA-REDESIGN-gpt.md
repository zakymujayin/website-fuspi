# Handoff — M4-GPT-PUBLIC-FORMS-MEDIA-REDESIGN — gpt

- Task ID: `M4-GPT-PUBLIC-FORMS-MEDIA-REDESIGN`
- Branch: `ai/gpt/m4-public-ia-menu-remap`
- Base SHA: `25f98e5`
- Head SHA: `04e1102`

## Result

The general complaint, protected PPKS, and facility-booking submission forms
now have clear card surfaces with royal-blue top accents. Booking and PPKS
file inputs use a dashed, tinted upload surface with a prominent browser
browse button with consistent 32px geometry and visible focus state; existing field names, accept rules,
multipart behavior, and sensitive-flow behavior are unchanged.

The admin Media Library now has a composed title surface, stronger upload card,
royal browse controls, navy active filters, clearer media cards, and intentional
empty/loading/PDF placeholder states. The homepage settings media picker now
uses the same card language for selected previews, picker panels, file upload,
and selection states.

## Files changed

- `src/components/public/complaint/complaint-submit-form.tsx`
- `src/components/public/ppks/ppks-report-form.tsx`
- `src/components/public/booking/booking-request-form.tsx`
- `src/app/[locale]/admin/media/page.tsx`
- `src/components/admin/media/media-upload.tsx`
- `src/components/admin/media/media-item-card.tsx`
- `src/components/admin/media/media-filter-tabs.tsx`
- `src/components/admin/media/media-grid-skeleton.tsx`
- `src/components/admin/media/media-state-notice.tsx`
- `src/components/admin/media/media-thumbnail.tsx`
- `src/components/admin/media/media-picker-upload-panel.tsx`
- `src/components/admin/home-nav/home-media-picker.tsx`
- `tests/m4/ui/public-forms-media-redesign.test.tsx`
- `coordination/tasks/M4-GPT-PUBLIC-FORMS-MEDIA-REDESIGN.md`
- `coordination/ownership.yml`
- `coordination/handoffs/M4-GPT-PUBLIC-FORMS-MEDIA-REDESIGN-gpt.md`

## Contract/schema/migration impact

None. No server action, storage boundary, PPKS privacy rule, booking rule,
translation, schema, shared token, or API changes.

## Verification

| Command | Result |
|---|---|
| `npx vitest run tests/m4/ui/public-forms-media-redesign.test.tsx tests/m3/ui/admin-media-upload.test.tsx tests/m3/ui/admin-media-library-browse.test.tsx tests/m4/ui/admin-media-picker-pagination.test.ts` | Passed; 4 files, 82 tests |
| `npm run lint` | Passed with one pre-existing warning in `src/components/public/academic-topic-shell.tsx:40` (`tAcademic` unused) |
| `npm run typecheck` | Passed |
| `npm run test` | Passed; 125 files, 1428 tests |
| `npm run build` | Passed; Next.js 16.2.10 generated 350 static pages |
| `git diff --check` | Passed |
| `TASK_MANIFEST=coordination/tasks/M4-GPT-PUBLIC-FORMS-MEDIA-REDESIGN.md TASK_BASE=25f98e5 npm run check:scope` | Passed; 0 changed files outside the lease |

## Untested areas

- No browser screenshot or authenticated media upload smoke test was run.
- Native browser rendering can still vary slightly by browser/OS, but all visible project inputs now use the same browse-button dimensions and alignment classes.

## Risks and follow-ups

- Native browser file-input button text remains controlled by the user's
  browser locale; the button surface and selected file text are styled, while
  upload validation remains server-authoritative.

## Requested shared changes

None.
