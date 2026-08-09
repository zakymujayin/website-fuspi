# FUSPI Homepage Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the FUSPI public homepage and header to match the visual rhythm of `uinssc.ac.id`, populate it with dummy content and imagery, while keeping the existing color palette and fonts.

**Architecture:** Two-tier header (top utility bar + main header) + full-width hero slider + alternating visually distinct sections (navy/slate/white) + animated stats + dummy data modules + updated footer. Server Components by default; lightweight Client Components only for slider and counters.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, next-intl, shadcn/ui primitives, Lucide icons.

---

## File Inventory

### New files
- `src/components/public/top-bar.tsx`
- `src/components/public/hero-slider.tsx`
- `src/components/public/advantage-card.tsx`
- `src/components/public/stats-section.tsx`
- `src/components/public/vision-mission-section.tsx`
- `src/components/public/facility-grid.tsx`
- `src/components/public/news-announcements-events.tsx`
- `src/lib/data/dummy-news.ts`
- `src/lib/data/dummy-announcements.ts`
- `src/lib/data/dummy-events.ts`
- `src/lib/data/dummy-facilities.ts`
- `src/lib/data/dummy-partners.ts`
- `src/lib/data/dummy-dean.ts`
- `src/lib/data/dummy-hero-slides.ts`

### Modified files
- `src/components/public/site-header.tsx`
- `src/components/public/desktop-nav.tsx`
- `src/components/public/mobile-nav.tsx`
- `src/components/public/nav-items.ts`
- `src/components/public/language-switcher.tsx`
- `src/components/public/shell/sticky-header.tsx`
- `src/app/[locale]/(public)/page.tsx`
- `src/app/[locale]/(public)/layout.tsx`
- `src/components/public/site-footer.tsx`
- `messages/id.json`
- `messages/en.json`
- `messages/ar.json`

### Generated/downloaded assets
- `public/images/hero/slide-1.jpg` (download from uinbanten.ac.id)
- `public/images/hero/slide-2.jpg`
- `public/images/hero/slide-3.jpg`
- `public/images/dean/dean-portrait.jpg` (generate)
- `public/images/facilities/*.jpg`

---

## Task 1: Top Utility Bar

**Files:**
- Create: `src/components/public/top-bar.tsx`
- Modify: `src/components/public/site-header.tsx`

- [ ] **Step 1: Create TopBar component**
  Height ~40px, navy-900 bg, white text. Left: Mail icon + `surat@uinbanten.ac.id`. Right: PMB, SIAKAD, E-Learning, GKM links + LanguageSwitcher.

- [ ] **Step 2: Integrate TopBar into SiteHeader**
  Place above the existing 72px main header. Keep StickyHeader wrapping both.

- [ ] **Step 3: Verify no visual regressions**
  Run `npm run lint` and `npm run typecheck`.

---

## Task 2: Header Main Bar Simplification

**Files:**
- Modify: `src/components/public/site-header.tsx`
- Modify: `src/components/public/nav-items.ts`
- Modify: `src/components/public/desktop-nav.tsx`
- Modify: `src/components/public/mobile-nav.tsx`

- [ ] **Step 1: Update primaryNav**
  Keep Profil and Publikasi dropdowns; keep Program Studi; replace Academics/Research/Services/Contact with Akademik, Riset & PkM, Layanan, Kontak.

- [ ] **Step 2: Remove utilityLinks from main header area**
  PMB/SIAKAD/E-Learning/GKM now live in top bar.

- [ ] **Step 3: Adjust desktop/mobile nav spacing**
  Ensure 72px main header remains clean and not crowded.

---

## Task 3: Dummy Data Modules

**Files:**
- Create: `src/lib/data/dummy-news.ts`
- Create: `src/lib/data/dummy-announcements.ts`
- Create: `src/lib/data/dummy-events.ts`
- Create: `src/lib/data/dummy-facilities.ts`
- Create: `src/lib/data/dummy-partners.ts`
- Create: `src/lib/data/dummy-dean.ts`
- Create: `src/lib/data/dummy-hero-slides.ts`

- [ ] **Step 1: Write each module with typed exports**
  Include localized content for `id`, `en`, `ar` where applicable.

- [ ] **Step 2: Add realistic FUSPI-specific copy**
  News titles about Quran, Hadith, Islamic philosophy; events about seminars; facilities about library/mosque/classrooms.

---

## Task 4: Hero Slider

**Files:**
- Create: `src/components/public/hero-slider.tsx`
- Modify: `src/app/[locale]/(public)/page.tsx`

- [ ] **Step 1: Implement slider Client Component**
  Use `useState`/`useEffect` for autoplay, manual arrows/dots, pause on hover, keyboard support.

- [ ] **Step 2: Add overlay and text layout**
  Navy-900/40 overlay, left-aligned text, responsive sizing.

- [ ] **Step 3: Wire dummy slides**
  Read from `dummy-hero-slides.ts`.

---

## Task 5: Advantages, Stats, Vision-Mission, Facilities, Partners Components

**Files:**
- Create: `src/components/public/advantage-card.tsx`
- Create: `src/components/public/stats-section.tsx`
- Create: `src/components/public/vision-mission-section.tsx`
- Create: `src/components/public/facility-grid.tsx`
- Create: `src/components/public/news-announcements-events.tsx`

- [ ] **Step 1: Build each section as Server Component (except stats animation)**

- [ ] **Step 2: Stats animation Client Component**
  Use IntersectionObserver to animate numbers once.

- [ ] **Step 3: Ensure responsive grids**
  1/2/3/5 column breakpoints.

---

## Task 6: Assemble Homepage

**Files:**
- Modify: `src/app/[locale]/(public)/page.tsx`
- Modify: `src/app/[locale]/(public)/layout.tsx`

- [ ] **Step 1: Replace existing sections with new ones**
  Order: Hero → Advantages → Dean Welcome → Stats → Vision-Mission → Study Programs → News/Announcements/Agenda → Facilities → Partners → CTA.

- [ ] **Step 2: Update layout scroll-mt**
  Account for combined header height (~112px).

- [ ] **Step 3: Keep existing data fetching as fallback**
  Use DB data when available; dummy data only when DB empty (or override for demo as decided).

---

## Task 7: i18n Messages

**Files:**
- Modify: `messages/id.json`
- Modify: `messages/en.json`
- Modify: `messages/ar.json`

- [ ] **Step 1: Add Home section keys**
  heroSlide labels, advantage titles, stats labels, vision/mission text, facility captions, etc.

- [ ] **Step 2: Add Nav keys for new labels**
  `pmb`, `siakad`, `elearning`, `gkm` already exist; ensure Arabic/English equivalents.

---

## Task 8: Imagery

**Files:**
- Download to `public/images/hero/` and `public/images/facilities/`
- Generate `public/images/dean/dean-portrait.jpg`

- [ ] **Step 1: Download UIN Banten images**
  Use curl/python to fetch from `https://uinbanten.ac.id/wp-content/uploads/...`.

- [ ] **Step 2: Generate dean portrait**
  Use image-generation skill (professional Indonesian male academic, neutral background).

- [ ] **Step 3: Add .gitkeep or update .gitignore if needed**
  Ensure generated/downloaded images can be committed.

---

## Task 9: Footer Enhancement

**Files:**
- Modify: `src/components/public/site-footer.tsx`

- [ ] **Step 1: Add real UIN Banten addresses**
  Kampus 1, 2, 3 addresses.

- [ ] **Step 2: Add social media icons row**
  YouTube/Instagram placeholder links.

---

## Task 10: Testing & Verification

- [ ] **Step 1: Run lint**
  `npm run lint`

- [ ] **Step 2: Run typecheck**
  `npm run typecheck`

- [ ] **Step 3: Run tests**
  `npm run test`

- [ ] **Step 4: Run build**
  `npm run build`

- [ ] **Step 5: Update affected tests/snapshots**
  Especially `tests/m4/ui/public-shell-hardening.test.tsx`.

---

## Spec Coverage Check
- Two-tier header → Task 1, 2
- Hero slider → Task 4
- Advantages → Task 5
- Dean welcome → Task 5, 8
- Stats → Task 5
- Vision-mission → Task 5
- Study programs → Task 6 (existing)
- News/announcements/agenda → Task 5, 6
- Facilities → Task 5, 8
- Partners → Task 5
- CTA → Task 6
- Footer → Task 9
- Dummy data → Task 3
- i18n → Task 7
- Tests → Task 10

## Placeholder Scan
No TBD/TODO/similar placeholders found.
