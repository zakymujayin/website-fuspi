# FUSPI Homepage Redesign — Design Spec

## Goal
Redesign the public homepage and header of the FUSPI (Fakultas Ushuluddin dan Pemikiran Islam) website so it no longer looks generic/white-box. Use the structure and visual rhythm of https://uinssc.ac.id as a reference, keep the existing FUSPI color palette, and populate every section with realistic dummy content and imagery so the site feels complete.

## Constraints
- Do **not** change the color palette: Royal Blue `#4169E1`, Navy `#16204A`, Brass `#C79A3A`, plus existing slate neutrals.
- Do **not** change fonts: Plus Jakarta Sans, Inter, IBM Plex Sans Arabic, Amiri.
- Keep Server Components by default; Client Components only for browser state/interactions.
- Preserve RTL support and logical direction utilities.
- Work only in the model-specific worktree/branch (`deepseek/continue-fuspi-20260805`).

## Reference
- https://uinssc.ac.id — two-tier header, hero slider, advantages, rector welcome, stats, study programs, news/announcements, facilities, partners, CTA, multi-column footer.
- https://uinbanten.ac.id — source of real UIN Banten campus/news imagery for dummy content.

## 1. Header & Navigation

### Top utility bar
- Height ~36–40px, background `navy-900`, text white/slate-300.
- Left: email address (`surat@uinbanten.ac.id` as dummy public contact).
- Right: external system links + language switcher:
  - PMB → https://pmb.uinbanten.ac.id
  - SIAKAD → https://siakad.uinbanten.ac.id
  - E-Learning → https://elearning.uinbanten.ac.id
  - GKM → /gkm
  - Language switcher dropdown with inline ID / EN / AR flags.

### Main header
- Height 72px, white background, bottom border slate-200.
- Left: `BrandMark` (placeholder logo remains until asset arrives; keep the FUSPI wordmark).
- Center: primary navigation items:
  - **Profil** (dropdown)
    - Sejarah, Visi dan Misi, Struktur Organisasi, Pimpinan, Dosen, Fasilitas, Kontak
  - **Program Studi** (dropdown: IAT, IH, AFI, SAA, TASPI)
  - Akademik
  - Riset & PkM
  - Layanan
  - **Publikasi** (dropdown)
    - Berita, Pengumuman, Kolom, Agenda, Album, Dokumen
  - Kontak
- Right: search trigger (icon only, links to /berita or opens a simple overlay later) + mobile hamburger.

### Mobile header
- Top bar collapses into a compact row or moves inside the drawer.
- Drawer contains primary nav, utility links, and language switcher.

## 2. Homepage Sections

### Section 0 — Hero Slider
- Full-width, min-height 520px (mobile) / 620px (desktop).
- 3 slides with real UIN Banten imagery + subtle dark overlay (`navy-900/40`).
- Each slide: eyebrow label, headline, subheadline, primary CTA, secondary CTA.
- Auto-advance every 6s, pause on hover/focus, manual dots + arrows.
- Dummy slides:
  1. “Selamat Datang di FUSPI” — kajian keislaman integratif.
  2. “Lima Program Studi Unggulan” — dari Al-Qur’an hingga tasawuf.
  3. “PMB 2026/2027 Telah Dibuka” — bergabung dengan FUSPI.

### Section 1 — Keunggulan / Quick Highlights
- Background white or slate-50.
- 6 icon cards in a row (3×2 on mobile, 6 on desktop).
- Icons from Lucide, colored `royal-600` on `royal-50` circles.
- Items: Kajian Al-Qur’an & Tafsir, Ilmu Hadis, Aqidah & Filsafat Islam, Studi Agama-Agama, Tasawuf & Psikoterapi, Pendidikan Integratif.

### Section 2 — Sambutan Dekan
- Background `slate-50`.
- Two-column layout: generated dean portrait (left) + quote + name/position (right).
- Below the quote: a “Selengkapnya” link to /profil/pimpinan.
- Dummy copy from existing `deanFallbackMessage` but expanded and warmer.

### Section 3 — Statistik Fakultas
- Background `navy-900` with subtle radial gradient accent.
- 4–6 counters with Lucide icons.
- Values: 5 Program Studi, 60+ Dosen, 15+ Tenaga Kependidikan, 1200+ Mahasiswa, 20+ Mitra.
- Animate numbers on scroll (IntersectionObserver Client Component).

### Section 4 — Visi, Misi & Tujuan
- Background white.
- Large vision card on left, mission list on right, goals below.
- Dummy content tailored for FUSPI:
  - Visi: menjadi fakultas kajian ushuluddin dan pemikiran Islam yang kredibel, kontekstual, dan berdaya saing global.
  - Misi: pendidikan berkualitas, penelitian keislaman, pengabdian masyarakat, kerja sama, dan pembentukan karakter.

### Section 5 — Program Studi
- Background `slate-50`.
- 5 cards (IAT, IH, AFI, SAA, TASPI).
- Each card: number, code, title, short description, link.
- Keep existing institution.studyPrograms mapping; descriptions from i18n.

### Section 6 — Berita, Pengumuman & Agenda
- Background white.
- Three-column layout on desktop:
  - Berita: 2 featured cards with cover image, category, date, title.
  - Pengumuman: 3 date-tile list items.
  - Agenda: 3 date-tile list items.
- All dummy content with realistic dates/titles.

### Section 7 — Galeri / Fasilitas
- Background `slate-50`.
- 4-6 image cards with captions: Perpustakaan, Ruang Kelas, Masjid Kampus, Laboratorium Bahasa, Aula Fakultas, Lapangan.
- Use UIN Banten images or generated placeholders.

### Section 8 — Mitra Kerja Sama
- Background white.
- Grayscale logo grid with 6 dummy partner logos (text-only badges if no images).

### Section 9 — CTA
- Background `navy-900`.
- Centered text: “Siap bergabung bersama FUSPI?” + description + brass CTA button linking to /kontak or /calon-mahasiswa.

### Section 10 — Footer
- Keep existing 5-column footer structure.
- Enrich address with UIN Banten campus addresses.
- Add social links row.

## 3. Dummy Assets

### Imagery sources
- Hero/facility/news images: hot-link or download from `https://uinbanten.ac.id/wp-content/uploads/...` for demo only.
- Dean portrait: generate with an image-generation skill (professional Indonesian male academic in suit/jacket, neutral studio background).
- Partner logos: text badges using institution short name + placeholder shapes.

### Dummy data files
Create the following local data modules so the page is populated without DB records:
- `src/lib/data/dummy-news.ts`
- `src/lib/data/dummy-announcements.ts`
- `src/lib/data/dummy-events.ts`
- `src/lib/data/dummy-facilities.ts`
- `src/lib/data/dummy-partners.ts`
- `src/lib/data/dummy-dean.ts`
- `src/lib/data/dummy-hero-slides.ts`

## 4. Components to Create / Modify

### New components
- `src/components/public/top-bar.tsx` — utility bar.
- `src/components/public/hero-slider.tsx` — full-width slider (Client Component).
- `src/components/public/advantage-card.tsx` — icon + title + description.
- `src/components/public/stats-section.tsx` — animated counters (Client Component).
- `src/components/public/vision-mission-section.tsx`.
- `src/components/public/facility-grid.tsx`.
- `src/components/public/news-announcements-events.tsx`.

### Modified components
- `src/components/public/site-header.tsx` — add top bar, simplify main header.
- `src/components/public/desktop-nav.tsx` — improve dropdown spacing/typography.
- `src/components/public/mobile-nav.tsx` — include top-bar links.
- `src/app/[locale]/(public)/page.tsx` — assemble new sections.
- `src/app/[locale]/(public)/layout.tsx` — update scroll offset to total header height (~112px).
- Messages files (`messages/id.json`, `en.json`, `ar.json`) — add new keys.

## 5. Interaction Details
- Slider: autoplay, pause on hover, keyboard accessible, visible focus states.
- Counters: trigger once when 50% visible.
- Nav dropdowns: hover on pointer devices, click/tap on touch, keyboard Esc closes.
- All CTAs use existing `Link` component; external links open in new tab with `rel="noopener noreferrer"`.

## 6. Accessibility
- Skip link remains.
- Section headings use correct hierarchy.
- Decorative images marked appropriately.
- Color contrast maintained with existing palette.
- RTL: slider arrows, counters, and card grids respond to direction.

## 7. Testing
- `npm run lint`
- `npm run typecheck`
- `npm run test` (update affected snapshots/tests)
- `npm run build`
- Manual visual check of LTR and RTL.

## 8. Follow-ups / Risks
- Hot-linked demo images may break or have CORS issues in production; they should be replaced with CMS uploads before go-live.
- Generated dean portrait must not impersonate a real person; keep generic.
- New Client Components need to be lightweight to avoid layout shift.
