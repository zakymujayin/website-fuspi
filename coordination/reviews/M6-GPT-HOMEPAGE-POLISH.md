# Approved homepage refinement review — 5 September 2026

Baseline: `4595aefdfdb4bd662f86d81833f8adefbfa2922b`. This pass refines the approved design; section order, CMS composition, institutional copy, route definitions, and responsive breakpoints remain intact. It does not introduce a new homepage concept or typography system.

## Measured changes

| Measurement | Approved baseline | Refined |
| --- | ---: | ---: |
| ID footer at 1440px | 479px | 400px |
| ID footer at 390px | 1074px | 982px |
| Embedded map height | 160px | 160px |
| Header-induced main-content displacement | 0px | 0px |
| Sticky logo top | 9.5px | 9.5px |
| Horizontal overflow across 18 width/locale cases | 0 | 0 |

The footer is a further 16.5% shorter on desktop and 8.6% shorter at 390px. At 360px its height is 986px. Its compactness comes from shared navigation rows, grouped channels, and optical spacing, not smaller text or deleted destinations. The verified map query, external map action, contact, social links, and legal bar remain available.

## Refinement decisions

- Header: existing 36px utility-bar retraction and complete 76px navigation bar are retained. The official logo stays contained and centered. A deep Royal faculty tab connects the identity area to the top of the existing Hero. It occupies no document-flow height. Mobile groups Search and Menu together; the faculty name moves into the compact tab on the homepage. The abbreviation is not reintroduced.
- Color: the existing blue palette gains a more substantial blue-gray service surface, a stronger About/alumni tint, and a quiet academic surface. Hero photography, white newsroom/facilities, Royal statistics/CTA, and navy footer retain their roles. No competing accent color is added.
- Identity: one geometric linework system appears only in About and CTA, at 5–6% opacity. The custom SVG marks share 1.5px strokes and manuscript/architectural geometry; they are code-native assets, not generated photographs.
- Quick Access: the same six destinations form an icon-led utility strip. All labels remain visibly present, including on focus and touch devices; icon-only interpretation is never required. External links have explicit accessible names.
- Dean: actual portrait and complete message remain. Existing sentence boundaries separate the introductory passage from the final quoted message. No words or credentials are invented. A thin blue portrait field, larger name hierarchy, and portrait/message/identity/CTA reveal sequence strengthen the leadership moment.
- About/programs: the existing comparison rows stay in IAT/IH/AFI order. Manuscript, transmission, and reasoning marks introduce discipline identity without changing the program content or links.
- Services: the existing service index remains. Framed functional icons and Royal hover/focus surfaces add depth while maintaining equal visibility and enhanced text contrast.
- Testimonials: real CMS media is displayed when provided. The current reviewed entries do not supply portraits; no stock identities are substituted. A shared grid cell reserves the tallest quote's geometry. Seven-second autoplay runs only while the section and browser tab are visible; hover, focus, manual navigation, and reduced motion stop it. Previous/next, pause/resume, selection buttons, and slide status remain available. Manual selection pauses persistently until explicit resume.
- Motion: one shared IntersectionObserver replaces per-item observers and the old 1.2-second off-screen timeout. SSR/no-JS content is visible. Initial-viewport content is not hidden or delayed. Offscreen entries reveal once with 18–22px movement, 600ms easing, and bounded 70ms staggers. Images use 0.985 scale; partners/footer use fade only. Keyboard focus reveals immediately. Numeric statistics also render their real final values without JavaScript.
- Supporting sections: news keeps its featured/supporting structure; facilities retain their five-photo mosaic; video retains the main player and thumbnail index; academic features and lecturer portraits use restrained sequencing; achievements reveal image before text. No new sections or grid concepts are introduced.

## Section quality gate

These scores are a self-review against this refinement brief, based on rendered desktop/mobile inspection and browser checks. They are not an independent design rating or comprehensive WCAG certification. Institutional = credibility; hierarchy = visual hierarchy; interaction includes appropriate restraint for informational sections.

| Section | Institutional | Hierarchy | Typography | Color | Depth | Balance | Interaction | Accessibility | Responsive | Polish |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Header / faculty tab | 9.5 | 9 | 9 | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 |
| Hero | 9.5 | 9.5 | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Quick Access | 9 | 9 | 9 | 9 | 9 | 9 | 9.5 | 9 | 9 | 9 |
| Dean’s Welcome | 9.5 | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9.5 |
| Statistics | 9.5 | 9 | 9 | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 |
| About FUSPI | 9.5 | 9 | 9 | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 |
| Study Programs | 9.5 | 9 | 9 | 9 | 9 | 9 | 9.5 | 9 | 9 | 9 |
| News | 9.5 | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Announcements | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Agenda | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Services | 9.5 | 9 | 9 | 9.5 | 9.5 | 9 | 9.5 | 9 | 9 | 9 |
| Facilities | 9.5 | 9.5 | 9 | 9 | 9.5 | 9.5 | 9 | 9 | 9 | 9 |
| Partners | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Video Gallery | 9 | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Life After FUSPI / Testimonials | 9 | 9.5 | 9 | 9.5 | 9 | 9 | 9.5 | 9 | 9 | 9 |
| Academic Highlights | 9.5 | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Academics / Lecturers | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Achievements | 9.5 | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |
| Final CTA | 9 | 9.5 | 9 | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 |
| Footer | 9.5 | 9.5 | 9 | 9.5 | 9 | 9.5 | 9 | 9 | 9 | 9 |
| Footer Map / Location | 9.5 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 |

Dean-specific review: leadership presence 9.5; institutional credibility 9.5; portrait treatment 9; typography hierarchy 9; quote hierarchy 9.5; spacing 9; visual balance 9; color treatment 9; responsive quality 9; accessibility 9; motion polish 9.

## Search scope and preserved contracts

The existing public API is connected through a keyboard-accessible top sheet with real results, bounded input, loading/empty/error/retry states, focus restoration, request cancellation, a 15-second timeout, validated response shape, encoded paths, and pagination. Search is explicitly labeled for six supported resources: study programs, lecturers, documents, events, services, and partnerships. Each request selects one resource, avoiding the pre-existing API's mixed-resource pagination limitation.

POST results cannot safely be linked because the existing API omits BERITA/PENGUMUMAN/KOLOM subtype. This pass does not guess detail URLs, probe pages, or change the backend contract. Article search is therefore not included in the panel. A separate authorized canonical-href/subtype contract task is needed to add it. Existing article navigation and article content remain unchanged.

Read-only code cross-review found a pagination edge case (returning to page one could use unsubmitted input); this was corrected and given a browser regression test. Search-button hover contrast was corrected after an enhanced-contrast scan. A header regression test's hard-coded 400px scroll assumption was adjusted to the reachable document offset because the smaller footer makes the short test route shorter; the sticky threshold and geometry assertions remain intact.

Shell contrast scans wait for finite entrance transitions to settle instead of sampling a deliberately transparent animation frame. Separate motion tests still verify pending visibility, once-only entrance, keyboard access, reduced motion, and no-JavaScript rendering.

## Evidence

- Local final screenshots and machine-readable geometry: `/tmp/fuspi-qa-polish/`.
- Initial refinement captures: `/tmp/fuspi-qa-polish-review/`.
- Baseline captures: `/tmp/fuspi-qa-after/`.
- Viewports: 1440, 1280, 1024, 768, 390, 360px in ID/EN/AR.
- Six homepage scans at 1440/390px and three open-search scans at 390px: no A/AA/AAA-tagged axe findings after corrections.
- Search and active service-hover captures at 1440/390px: `/tmp/fuspi-qa-search/`; both enhanced-contrast scans returned no findings.
- Browser verification includes actual API results, empty/unavailable/retry behavior, keyboard focus, pagination, malformed URL rejection, seven-second autoplay, pause conditions, stable quote geometry, once-only reveal, reduced motion, and visible no-JS content.
- Final command results and commit identifiers are recorded in the task handoff.

No blanket WCAG AAA certification is claimed. Full assistive-technology and non-Chromium browser matrices were not run. Google Maps and YouTube internal controls remain third-party UI. The requested skills informed the audit, visual detail, complete delivery, and restrained motion; their conflicting random-layout, font-swap, heavy-GSAP, stock-asset, and oversized-spacing prescriptions were not applied. The existing shadcn primitives and semantic variable overrides were reused; no UI primitive or global token was rewritten.
