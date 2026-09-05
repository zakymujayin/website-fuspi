# Handoff — M6-GPT-HOMEPAGE-COHERENCE

- Task ID: `M6-GPT-HOMEPAGE-COHERENCE`
- Branch: `ai/gpt/m6-homepage-coherence`
- Base SHA: `79345e5758f4f456f9ca8adaf129874111a51d69`
- Head SHA: `3b1d523`
- Scope: refinement of the approved homepage. No structural redesign, no section reordering, no backend/CMS/API/route change.

## Summary

The homepage keeps its approved structure, order and Modern Institutional Academic direction. What changed is the presentation layer: three explicit systems now live in `home-design.module.css` (rhythm, heading family, divider policy) and every homepage section is routed through them, so the page reads as one designed surface instead of a set of independently styled blocks.

### 1. One section-heading family

`HomeSectionHeading` (`home-section-heading.tsx`) is now the only way a homepage section titles itself. Eyebrow, title and description are one connected block that always share a column; only the CTA may move to the opposite side. The old "title far left / description far right" split is gone from every section that had it: About FUSPI, Academic Highlights, Achievements, Partners, Video, Services, Newsroom, Facilities, and the two sub-headings (Announcements/Agenda, Dosen & Peneliti, Program Studi) which now use the same family with `as="h3" compact`.

`HomeSectionLink` (`home-section-link.tsx`) is the single section CTA: royal blue, medium weight, one arrow, one hover (rule reveals, arrow travels). It replaced five different ad-hoc treatments.

> It is split from the heading module on purpose: the heading is pure presentation, so `video-section` and other components can use it without pulling in the localized router. Merging them back breaks `tests/m4/ui/public-home-video-section.test.tsx`, which cannot resolve `next/navigation` under jsdom.

### 2. Divider policy

Exactly three behaviours are allowed and the CSS header documents them:

- `.headingAccent` — a 56px royal rule, used only on the page's important headings (About, Services, Academic, Dean).
- `.rowList` — one quiet `--slate-200` hairline *between* repeated rows, never above the first or below the last. Shared by the academic aside, news aside, achievements aside, announcements and agenda, so all secondary lists scan identically.
- Nothing.

Removed: `border-t-2 border-royal-500` full-width rules (services, news aside, video, programs), `border-t border-slate-900` group rules (academic, lecturers, ledger headings), the per-row `border-b` on achievements and columns, the partners section's `border-y`, the quick-access `border-inline-start` separators, and the Dean byline rule. The one full-width rule that remains is `.railDivide`, which exists specifically to separate Academic Highlights from Dosen & Peneliti.

### 3. Dean's welcome

Same structure. The portrait lost its frame: a 4:5 crop with a 1px hairline and a soft shadow, lifted off a restrained Royal Blue offset panel that carries the FUSPI motif in its lower corner, at `lg:col-span-5` instead of `4` for more presence. The offset panel lives inside the element's own padding so it can never cause horizontal overflow at small widths.

Message hierarchy is now heading → accent rule → key message → supporting text → name/title → CTA. The split uses only the dean's real CMS text: the closing sentence leads as the key message (serif accent, reserved for human voice), the earlier sentences support it. Nothing was invented.

### 4. Quick Access, Services, About

- **Quick Access**: light royal tiles with framed icons on a royal-tinted band; hover/focus fills Royal Blue with a white icon and label. Icon-led utility concept unchanged, separators dropped.
- **Services**: row architecture unchanged. Depth comes from a lifted index surface, a featured first entry, framed icons and a full royal fill on hover, not from cards.
- **About FUSPI**: copy and the study programs now sit side by side and optically centred, so the section reads as one identity statement. Ornament anchors the trailing edge at 7%.

### 5. Study-program icons

`ManuscriptMark` / `TransmissionMark` / `ReasoningMark` were redrawn on one construction rule (40x40, 1.5 stroke, no fills): a ruled manuscript folio with a margin rosette (IAT), a chain of narrators each carrying a line of recorded text (IH), and the eight-point FUSPI lattice reasoning outward from a centre (AFI). The first IH draft was a converging node network that collapsed into a blot at 36px; it was redrawn on a single axis.

### 6. Ornament

One motif for the whole site, declared once as `--fuspi-motif`: an interlaced square + rotated-square lattice built on the same geometry as the AFI mark. Used in four places only — About (7%), Academic Highlights (6%), final CTA (7%), Footer (5%) — each masked so it fades out rather than tiling to a hard edge, and in the corner of the Dean's offset panel.

### 7. Lecturer rail (`lecturer-rail.tsx`, new)

Replaces the 4-column grid that wrapped long academic names. Roughly 3 profiles on desktop, 2 on tablet, ~1.15 on mobile. Native CSS scroll-snap does the dragging, so swipe works with no new dependency. Provides previous/next, pagination, an `aria-live` position, arrow-key navigation from a focused card, and the existing "Lihat Semua" CTA. Navigation targets `scrollIntoView({inline: "start"})` on the leading card of a page rather than a computed offset, so scroll padding and snapping cannot desynchronise the indicator.

Names use `white-space: nowrap` at ≥1280px (verified: "Dr. H. Endang Saeful Anwar, Lc., M.A" fits on one line at 17px) with controlled wrapping below that breakpoint. Font size was not reduced. Portraits share one crop rule (`object-position: 50% 18%`) and one restrained tonal wash; the ratio opens as the card widens (1:1 below 640px, 5:4 above) so the image keeps a steady 250-320px visual height instead of towering over the name on a wide card.

Autoplay: 7s, never arms under `prefers-reduced-motion`, pauses on hover, on focus within, and when the tab is hidden, and stops for good once a visitor navigates by hand.

### 8. Facility lightbox (`facility-gallery.tsx`, new)

The mosaic is unchanged. Each tile gains a hover/focus expand cue and opens a real `<dialog>` via `showModal()`, so focus trapping, Escape and background inertness come from the platform. Gallery navigation (previous/next buttons, arrow keys, touch swipe), a `n dari m` counter, the facility caption and a labelled close control are all inside the overlay. Scroll is locked with scrollbar-gutter compensation so the page neither scrolls nor shifts, and the position is restored exactly on close along with focus to the originating thumbnail.

The overlay renders no `<img>` until it is opened, so it costs nothing at page load, and it then reuses the original the mosaic already fetched rather than requesting a second asset.

Without JavaScript each tile still resolves to `/profil/fasilitas`, so no control is ever dead.

### 9. Footer

Compact architecture, map size and information density unchanged. The faculty name is now a single balanced lockup (`text-wrap: balance`, 22ch measure) rendering as "Fakultas Ushuluddin / dan Pemikiran Islam" — no manual break, and the conjunction never sits alone. Section labels moved to tracked small caps; spacing was tightened, not shrunk.

## Files changed

New:
- `src/components/public/home-section-link.tsx`
- `src/components/public/lecturer-rail.tsx`
- `src/components/public/facility-gallery.tsx`
- `e2e/m4/homepage-coherence.spec.ts`
- `coordination/tasks/M6-GPT-HOMEPAGE-COHERENCE.md`, this handoff

Modified:
- `src/components/public/home-design.module.css` (the three systems, plus every section's surface)
- `src/components/public/home-section-heading.tsx`
- `src/components/public/institutional-icons.tsx`
- `src/components/public/{dean-welcome,faculty-intro,services,facilities,achievements,academic-voices,partners,video}-section.tsx`
- `src/components/public/{home-quick-access,home-newsroom,site-footer}.tsx`
- `messages/{id,en,ar}.json` (12 new `Home` keys, interaction labels and two supporting lines only)

## API / schema / migration impact

None. No Prisma schema, migration, API route, page route, URL, navigation registry, auth, or env-contract change. No dependency added or removed.

`package.json` / `package-lock.json` / `skills-lock.json` carry pre-existing modifications (a `gsap` / `@gsap/react` addition) from before this lease. They were left untouched, and nothing in this task uses GSAP.

## Commands and results

```
npx tsc --noEmit                    TypeScript: No errors found
npm run lint                        ESLint: No issues found
npm run test                        140 files, 1496 tests passed
npm run build                       Compiled successfully, 357 static pages, 0 warnings
npx playwright test e2e/m4/homepage-coherence.spec.ts \
  e2e/m4/homepage-curated-refinement.spec.ts \
  e2e/m4/homepage-polish.spec.ts --project=chromium --workers=2      25 passed
  (same three specs)              --project=mobile  --workers=1      25 passed
npx playwright test e2e/m4/public-shell-hardening.spec.ts \
                                    --project=chromium --workers=2   48 passed
git diff --check                    clean
```

Playwright note: running both projects at once with default workers saturates the dev server and produces spurious `timedOut` failures. Run the projects separately, or with `--workers=2`.

Visual review completed at 1440 / 1280 / 1024 / 768 / 390 / 360 across ID, EN and AR, including RTL mirroring of the heading accent rule, service rows, kickers, rail order, pagination and lightbox controls.

## Regressions found and fixed during this task

1. **Header brand name broke.** The CSS module rewrite dropped `.brandName` and `.searchPanel`, which belong to the public shell, not to the homepage sections. `homepage-polish.spec.ts` caught it (`class="undefined …"`, brand name hidden at ≥1400px). Both rules are restored verbatim under a labelled "Public shell" block so they are not folded into the section systems again. A class-coverage check (every `styles.*` reference resolves to a defined rule) is worth keeping in mind for any future edit to this file.
2. **Server → client function props.** The rail and gallery initially received label formatters from their server parents, which React refuses to serialize. Both now call `useTranslations("Home")` directly, as `stats-section.tsx` does.
3. **Lightbox image covered its own controls.** `max-block-size: 100%` did not resolve against the grid stage, so a tall photo grew over the footer and swallowed clicks on previous/next. The image is now clamped against the viewport minus the shell's chrome, which also keeps its box tight to the photo so the surrounding letterbox stays real backdrop. `homepage-coherence.spec.ts` asserts the image never overlaps a control.

## Follow-up round (reported after first review)

4. **Rail autoplay dragged the viewport to the section.** `scrollIntoView` walks every ancestor scroller, including the document, so each 7s tick pulled the page down to the rail even when the visitor was reading elsewhere. Navigation now measures the leading card against the rail and moves only `rail.scrollLeft`, which still lands exactly on a snap position in either writing direction. Covered by "autoplay advances the rail without dragging the page to it".
5. **Rail portraits were too large.** A 4:5 ratio on ~395px cards produced a 494px image above a one-line name. The ratio now opens with the card (1:1 below 640px, 5:4 above), giving 247-316px across every breakpoint. Note for anyone tempted to express this as a tall ratio plus `max-block-size`: clamping the height of a box that has an `aspect-ratio` shrinks its **width** to match, so the portrait ends up narrower than the card it sits in. The spec asserts the portrait still fills its card.
6. **Header faculty name split as "Fakultas Ushuluddin dan / Pemikiran Islam".** It now balances to "Fakultas Ushuluddin" / "dan Pemikiran Islam", matching the footer, via `text-wrap: balance` on `.brandName` — which already lives in this module, so no header component was touched. Both lockups are asserted by measuring the conjunction's line box.
7. **Lightbox scroll lock was order-sensitive.** Locking hung off the dialog's `close` event while unlocking ran in a separate path. It is now one symmetric effect keyed on whether the gallery is open, so stepping between images does not re-run it and no close path — button, Escape, backdrop or unmount — can strand `body { overflow: hidden }`.

## Untested areas, risks and follow-ups

- **Autoplay timing is not asserted directly.** The rail's 7s advance is covered only through its `data-autoplay` state (reduced motion, hover, focus, manual takeover). A clock-driven test like the testimonials one would close this; it was left out to keep the suite fast.
- **Touch swipe in the lightbox is untested.** Playwright's mobile project reports `hasTouch` but the suite drives the tap controls, which remain available regardless. The gesture is a plain `touchstart`/`touchend` delta with a 45px threshold.
- **`safe-area-inset` padding in the lightbox shell is unverified on a real notched device**; it degrades to the `max()` fallback in the emulator.
- **Program summaries now show the curated academic descriptor** (`Home.advantage.*.description`) instead of the CMS `secondaryText`, which for the current data is `"S1 · IAT"` and restates the code already shown in the identity column. The degree level is therefore no longer surfaced in this section; it remains on `/prodi`. Revert the one-line `summary` expression in `faculty-intro-section.tsx` if the level must appear on the homepage.
- **The About eyebrow yields to the title when the CMS names the section "Tentang FUSPI"**, which is the current data. If the CMS title is later changed to something else, the eyebrow reappears automatically.
- **Lecturer portrait backgrounds still differ** (one warm wood, two navy studio). Ratio, crop, head position, container and tonal wash are unified, which is as far as presentation can go; genuinely matching them needs re-shot or re-masked source images. Pushing the overlay harder would start altering how people look.
- **Facility captions come from the CMS** and the longest one wraps to two lines inside the mosaic overlay at 1024px. It is legible, but a shorter caption reads better in the small tiles.

## Section order (database change, applied on request)

Section order is **data, not code**: `HomeSection.order` (`prisma/schema.prisma:1307`), editable at `/admin/beranda/bagian`. The `orderOf(...)` numbers in `page.tsx` are only fallbacks for a missing row.

The task manifest lists section order as locked. The reviewer inspected the live order, asked for an opinion, and then explicitly authorised the change; it was applied to the **development database only**. Production still carries the old order and needs the same update (admin UI or the SQL below).

Applied values:

| Key | Was | Now |
|---|---|---|
| HERO | 0 | 0 |
| QUICKLINK | 1 | 10 |
| INTRO / PRODI | 4 / 5 | 20 / 21 |
| STATS | 3 | 30 |
| DEAN | 2 | 40 |
| COLUMN | 15 | 50 |
| NEWS / ANNOUNCEMENT / AGENDA | 9 / 6 / 13 | 60 / 61 / 62 |
| ACHIEVEMENT | 16 | 70 |
| TESTIMONIAL | 14 | 80 |
| FACILITY | 8 | 90 |
| VIDEO / VIDEO_GALLERY | 11 / 12 | 100 / 101 |
| SERVICE | 7 | 110 |
| PARTNERSHIP | 10 | 120 |
| CTA | 17 | 130 |

Rationale: the faculty's two strongest assets were buried. Academic Highlights + Dosen & Peneliti sat at position 12 (below the video gallery and partner logos) and student achievements at 13, while the partner logo strip sat at 9, interrupting the flow. The new order groups the page into identity (3-5: what we are, the numbers, the dean's voice), output (6-9: scholarship, news, student results, alumni results), place (10-11), utility and credibility (12-13), then the ask. Gaps of 10 leave room to insert a section later without renumbering everything again.

Verified by reading back the rendered headings: Hero, Akses cepat, Tentang FUSPI, FUSPI dalam Angka, Sambutan Dekan, Sorotan Akademik, Berita Terbaru, Prestasi dan Inspirasi, Jejak setelah FUSPI, Sarana dan Prasarana, Galeri Video, Layanan, Kerja Sama, CTA. E2E was skipped at the reviewer's request; no code changed, so lint/typecheck/unit results above still stand.

**Trap for whoever edits this next.** Three rendered sections are composed from several keys, and `orderOf` takes the **minimum** order among the visible ones:

- Berita Terbaru = min(NEWS, ANNOUNCEMENT, AGENDA)
- Tentang FUSPI = min(INTRO, PRODI)
- Galeri Video = min(VIDEO, VIDEO_GALLERY)

Before this change, ANNOUNCEMENT (6) governed the newsroom while NEWS was 9, so editing "Berita" in the admin UI moved nothing. The keys in each group are now numbered adjacently, which removes the surprise, but the rule still applies.

Rollback:

```sql
UPDATE "HomeSection" SET "order" = 0 WHERE key = 'HERO';
UPDATE "HomeSection" SET "order" = 1 WHERE key = 'QUICKLINK';
UPDATE "HomeSection" SET "order" = 2 WHERE key = 'DEAN';
UPDATE "HomeSection" SET "order" = 3 WHERE key = 'STATS';
UPDATE "HomeSection" SET "order" = 4 WHERE key = 'INTRO';
UPDATE "HomeSection" SET "order" = 5 WHERE key = 'PRODI';
UPDATE "HomeSection" SET "order" = 6 WHERE key = 'ANNOUNCEMENT';
UPDATE "HomeSection" SET "order" = 7 WHERE key = 'SERVICE';
UPDATE "HomeSection" SET "order" = 8 WHERE key = 'FACILITY';
UPDATE "HomeSection" SET "order" = 9 WHERE key = 'NEWS';
UPDATE "HomeSection" SET "order" = 10 WHERE key = 'PARTNERSHIP';
UPDATE "HomeSection" SET "order" = 11 WHERE key = 'VIDEO';
UPDATE "HomeSection" SET "order" = 12 WHERE key = 'VIDEO_GALLERY';
UPDATE "HomeSection" SET "order" = 13 WHERE key = 'AGENDA';
UPDATE "HomeSection" SET "order" = 14 WHERE key = 'TESTIMONIAL';
UPDATE "HomeSection" SET "order" = 15 WHERE key = 'COLUMN';
UPDATE "HomeSection" SET "order" = 16 WHERE key = 'ACHIEVEMENT';
UPDATE "HomeSection" SET "order" = 17 WHERE key = 'CTA';
```

Note that `prisma/seed.ts` still seeds the old order, so a reseed reverts this.

## Requested contract / dependency changes

None.
