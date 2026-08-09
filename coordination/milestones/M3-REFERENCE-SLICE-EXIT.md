# M3 reference slice exit

Status: **ACCEPTED**

Tested source head: `dccb123de207eb91779345e612ae88953948f479`

M3 establishes the reusable Post + Media + i18n reference pattern for later CMS modules. The slice
includes public list/detail, ID/EN/AR fallback, Arabic RTL, metadata/JSON-LD, admin ownership-scoped
list/editor, full Post CRUD and publication lifecycle, 30-second autosave serialization, Tiptap
sanitization, cover selection, Media upload/list/delete, accessibility, and responsive behavior.

## Acceptance summary

- clean migration and idempotent seed;
- 738 unit tests and 83 PostgreSQL integration tests;
- zero-warning production build;
- 262/262 M3 Playwright cases on Chromium and mobile;
- authenticated production-standalone Media login/list/upload/delete, all HTTP 200;
- no unresolved Critical/High finding;
- process-correct replacement of the unleased build candidate;
- historical R1 reviews quarantined and R2 manifest timing recorded without retroactive validity.

The detailed verdict is
`coordination/reviews/M3-FINAL-ACCEPTANCE-gpt.md`.

## Changelog

- froze the end-to-end Post/Media contract and runtime pattern;
- completed accessible public Berita and admin Post/Media experiences;
- serialized all Post editor mutations around optimistic versions;
- corrected Media keyboard focus evidence;
- removed unintended standalone repository tracing without weakening storage boundaries;
- reconciled temporary-control, review quarantine, queue sequencing, and exit evidence.

## Cost/token report

Provider token and billing counters were not written to repository state and are unavailable to the
integrator; no value is fabricated. Durable task history shows Claude carried the UI/public volume,
DeepSeek supplied domain QA and independent technical review, and GPT owned contracts, corrections,
runtime replay, and integration. For M4, capture provider counters at each task handoff rather than
attempting milestone reconstruction.

## Residual risks and next boundary

- WebKit/browser-matrix expansion is deferred beyond the mandated M3 projects.
- VPS filesystem permissions and reverse-proxy behavior remain staging/deployment evidence.
- M4 remains closed. It requires a separately committed entry contract, fresh assignments, and
  non-overlapping leases.
- Integration-to-`main` remains a human-owner action and has not been performed.
