---
id: M3-CLAUDE-PUBLIC-POST-EXPERIENCE
milestone: M3
owner: claude
reviewer: gpt
tester: deepseek-v4-pro
base_sha: d152db7
allowed_paths:
  - "src/app/[locale]/(public)/berita/page.tsx"
  - "src/app/[locale]/(public)/berita/loading.tsx"
  - "src/app/[locale]/(public)/berita/[slug]/page.tsx"
  - "src/app/[locale]/(public)/berita/[slug]/loading.tsx"
  - "src/app/[locale]/(public)/berita/[slug]/not-found.tsx"
  - "src/components/public/post/**"
  - "messages/id.json"
  - "messages/en.json"
  - "messages/ar.json"
  - "tests/m3/ui/public-post-experience.test.tsx"
  - "coordination/handoffs/M3-CLAUDE-PUBLIC-POST-EXPERIENCE-claude.md"
forbidden_paths:
  - ".env*"
  - "package.json"
  - "package-lock.json"
  - "next.config.ts"
  - "prisma/**"
  - "src/generated/**"
  - "src/contracts/**"
  - "src/lib/content/**"
  - "src/lib/db/**"
  - "src/lib/auth/**"
  - "src/lib/storage/**"
  - "src/lib/security/**"
  - "src/app/globals.css"
  - "src/app/[locale]/layout.tsx"
  - "src/app/[locale]/(public)/layout.tsx"
  - "src/components/ui/**"
  - "src/components/public/site-header.tsx"
  - "src/components/public/site-footer.tsx"
  - "src/components/public/nav-items.ts"
  - "src/app/api/**"
  - "src/app/[locale]/admin/**"
  - "tests/m3/runtime/**"
  - "tests/security/**"
  - "e2e/**"
readonly_paths:
  - "AGENTS.md"
  - "docs/03-design-system.md"
  - "docs/05-halaman-publik.md"
  - "docs/12-multibahasa-rtl.md"
  - "docs/17-komponen-ui-detail.md"
  - "docs/19-halaman-berita-detail.md"
  - "docs/20-test-acceptance-go-live.md"
  - "docs/24-implementation-plan-multi-model.md"
  - "coordination/reviews/M3-POST-PUBLIC-QUERY-RUNTIME-INTEGRATION-gpt.md"
  - "coordination/reviews/M3-MEDIA-UPLOAD-PERSISTENCE-INTEGRATION-gpt.md"
  - "src/contracts/post.ts"
  - "src/contracts/media.ts"
  - "src/lib/content/post-public-queries.ts"
  - "src/lib/db/client.ts"
  - "src/lib/security/sanitize.ts"
  - "src/i18n/navigation.ts"
  - "src/i18n/routing.ts"
  - "src/components/public/section-heading.tsx"
  - "src/components/ui/container.tsx"
  - "src/app/[locale]/layout.tsx"
  - "src/app/[locale]/(public)/layout.tsx"
  - "src/app/globals.css"
  - "node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md"
  - "node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md"
  - "node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md"
depends_on:
  - M3-GPT-POST-PUBLIC-QUERY-RUNTIME
  - M3-DEEPSEEK-POST-PUBLIC-QUERY-RUNTIME-REVIEW
  - M3-GPT-MEDIA-UPLOAD-PERSISTENCE-RUNTIME
  - M3-DEEPSEEK-MEDIA-UPLOAD-PERSISTENCE-REVIEW
contracts:
  - src/contracts/post.ts
  - src/lib/content/post-public-queries.ts
acceptance_commands:
  - npx vitest run tests/m3/ui/public-post-experience.test.tsx
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - git diff --check
  - TASK_MANIFEST=coordination/tasks/M3-CLAUDE-PUBLIC-POST-EXPERIENCE.md TASK_BASE=origin/coordination/m3-claude-public-post-experience-assignment npm run check:scope
risk: medium
token_class: L
status: merged
---

# M3 Claude Public Post Experience

Implement the first public-facing reference slice for **Berita** only:
`/[locale]/berita` and `/[locale]/berita/[slug]`. Build reusable Post presentation components,
but do not open Pengumuman, Informasi, Kolom, homepage integration, admin editor, Media upload UI,
transport/actions, or any other M3/M4 feature.

Before changing framework behavior, read the three listed Next.js 16 guides in
`node_modules/next/dist/docs`. `params` and `searchParams` are promises. Keep route files as Server
Components; add a Client Component only when a real browser interaction requires it.

## Data and trust-boundary requirements

1. Consume `listPublicPosts` and `getPublicPostDetail` read-only through `getPrismaClient()`.
   Always pass `type: "BERITA"`, the validated route locale, the neutral slug, the server
   `UPLOAD_PUBLIC_URL`, and normalized bounded page input. Do not query Prisma directly.
2. Catch missing environment/database/query failures at the route boundary and show a translated,
   non-technical unavailable or empty state. Never render a database URL, storage key, exception,
   filesystem path, stack, query detail, or raw technical code.
3. Treat `PublicPostView` as the only public data shape. Do not add author/category/tag/view fields
   by direct database reads and do not change the frozen query or contracts.
4. Re-sanitize stored `translation.value.content` with the existing
   `sanitizeRichTextHtml` immediately before `dangerouslySetInnerHTML`. If sanitization fails,
   fail closed to the same translated non-technical unavailable state.
5. Display the exact-locale content first. When `translation.isFallback` is true, render one calm
   translated banner explaining that Indonesian content is being shown. Preserve the neutral
   slug across ID/EN/AR links.

## List route requirements

1. Add a page header/breadcrumb, responsive horizontal Post cards, server pagination, loading
   skeleton, empty state, and query-unavailable state. Page size is 10. Invalid, repeated, array,
   zero, negative, fractional, or excessive `page` input must normalize safely without reflecting
   untrusted text.
2. Cards show same-origin validated cover image when available, category slug when available,
   title, author when available, `Asia/Jakarta` publication date formatted for the active locale,
   excerpt when available, and a clear detail link.
3. Use `next/image` only when the validated cover URL belongs to the configured public site
   origin and can be converted to a local `/uploads/...` path. Do not change `next.config.ts` or
   render an unconfigured remote image; use an accessible visual placeholder instead.
4. Do not fabricate archive totals, search, category counts, popular tags, or filters that the
   frozen query contract does not provide.

## Detail route requirements

1. Unknown, invalid, unpublished, future, wrong-type, or unavailable slugs resolve through
   `notFound()` or the translated non-technical unavailable state as appropriate. Do not reveal
   whether a draft/private record exists.
2. Render breadcrumb, H1, author/date/category metadata, optional cover/caption, locale-aware
   reading-time estimate, safe article prose, and a responsive sidebar with up to five latest
   Berita items obtained through `listPublicPosts`; exclude the current ID in presentation.
3. Do not fabricate view count, previous/next posts, tags, related-post ranking, archive totals,
   or category names. Those require later contracts.
4. Add localized dynamic metadata using the resolved translation: title/meta title,
   excerpt/meta description, canonical, ID/EN/AR hreflang plus `x-default`, Open Graph article
   fields, published time, optional author, and same-origin cover when safe.
5. Add escaped `NewsArticle` and `BreadcrumbList` JSON-LD. Never place raw article HTML, storage
   keys, untrusted technical values, or an unsafe URL in structured data.

## Experience requirements

1. Follow the installed FUSPI tokens and existing public shell. Do not change global tokens,
   `globals.css`, shadcn primitives, header/footer, navigation registry, or root layouts.
2. Use logical direction utilities only. Directional arrows must mirror in Arabic; images,
   logos, and non-directional icons must not. No horizontal scroll at 360, 390, 768, 1024, or
   1440 px.
3. Preserve semantic landmarks owned by the public layout: do not add another `<main>`. Maintain
   one H1, visible focus states, descriptive link names, meaningful alt behavior, skeletons hidden
   appropriately from assistive technology, and WCAG AA contrast.
4. Add only the UI strings required by this slice to all three message files. Arabic copy and
   layout must work from the first commit; do not leave English placeholders in AR.
5. Prefer static Server Components. A share/copy/Web Share client widget is out of scope for this
   bounded task and must not be added merely to satisfy the broader future design document.

## Focused verification

Add deterministic tests for:

- locale-aware Jakarta date and reading-time presentation;
- exact translation versus one fallback banner;
- page normalization and pagination links;
- same-origin cover conversion versus safe placeholder;
- safe re-sanitization of stored XSS content;
- unavailable/empty state copy without technical disclosure;
- Arabic direction-safe markup and mirrored directional icons;
- metadata/JSON-LD helpers excluding raw HTML and storage keys.

Finish with a committed handoff and stop. Do not merge, edit task status/lease, start a DeepSeek
QA task, or implement admin/transport/Media UI work.
