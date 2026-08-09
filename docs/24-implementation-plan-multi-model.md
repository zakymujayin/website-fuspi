# 24 — Implementation Plan Multi-Model: GPT + Claude + DeepSeek

Dokumen ini adalah rencana eksekusi v1 Website & CMS FUSPI oleh tiga agent CLI yang berjalan simultan. Tujuannya bukan membuat tiga model mengerjakan file yang sama, tetapi membangun tiga lane paralel dengan kontrak beku, kepemilikan path, review silang, dan merge queue tunggal.

Kontrak identitas tidak boleh dinegosiasikan ulang: target adalah **FUSPI — Fakultas Ushuluddin dan Pemikiran Islam**, dengan tepat lima prodi **IAT, IH, AFI, SAA, TASPI**. Situs yang ditunjuk pemilik hanya referensi struktur informasi dan tidak boleh menjadi sumber identitas atau copy. Kontrak kode berada di `src/config/institution.ts`; CI wajib gagal bila daftar tersebut berubah tanpa keputusan pemilik proyek.

Target v1 mengikuti `README` dan mengecualikan Course/Curriculum, profil riset bibliografis penuh, API SILA read-only, serta SSO SILA yang sudah ditetapkan sebagai fase 2/3.

## A. Model dan kebijakan biaya

### Model default

| Lane | Default harian | Eskalasi | Penggunaan |
|---|---|---|---|
| GPT / Integrator | `gpt-5.6-terra`, reasoning `medium` | `gpt-5.6-sol`, `high/max` | kontrak, platform, security, integrasi, release |
| Claude / Experience | `claude-sonnet-5`, adaptive thinking default | `claude-opus-4-8` | frontend, design system, RTL, accessibility, review UX kritis |
| DeepSeek / Delivery & QA | `deepseek-v4-pro`, non-thinking/low | model sama, thinking `medium/high` | CRUD berbasis kontrak, import, fixture, test, negative cases |

Fallback bila client Codex belum menyediakan GPT-5.6: `gpt-5.3-codex` reasoning `high`.

### Aturan biaya seimbang

- DeepSeek dan Claude menangani 60–70% volume kerja; GPT Terra 25–35%; GPT Sol/Claude Opus maksimal 5–10% dan hanya pada gate berisiko tinggi.
- Jangan memakai Sol/Opus untuk CRUD, styling kecil, seed, fixture, dokumentasi mekanis, atau perbaikan lint sederhana.
- Mulai dari reasoning `medium`/adaptive. Naikkan setelah ada bukti: dua percobaan gagal, konflik lintas modul, invariant security, concurrency, atau migration risk.
- Satu model mengimplementasikan; model lain meninjau diff/test. Jangan meminta tiga model menghasilkan implementasi alternatif yang sama.
- Context packet hanya berisi `AGENTS.md`, task manifest, 2–5 dokumen relevan, kontrak/type, dan test terkait—bukan seluruh 4.598 baris dokumentasi setiap task.
- Gunakan prompt prefix stabil dan prompt caching. Output agent dibatasi menjadi patch/commit, hasil test, risiko, dan handoff; hindari penjelasan panjang.
- Harga API adalah alat perbandingan, bukan estimasi biaya langganan CLI. Catat token/cost per task dari dashboard provider dan review tiap akhir milestone.

Referensi model resmi:

- OpenAI models: https://developers.openai.com/api/docs/models
- Claude model selection: https://platform.claude.com/docs/en/about-claude/models/choosing-a-model
- DeepSeek models/pricing: https://api-docs.deepseek.com/quick_start/pricing

## B. Struktur Git yang mencegah tabrakan

### Baseline wajib

Baseline dokumentasi lokal sudah dibuat; identitas lama dikoreksi sebelum M0 dibekukan. Sebelum agent fitur bekerja:

1. Validasi ulang seluruh dokumentasi terhadap kontrak identitas FUSPI dan buat commit M0.
2. Pastikan tag `planning-baseline-v1` menunjuk baseline FUSPI, bukan identitas referensi.
3. Tambahkan remote GitHub privat dan push `main` setelah URL diberikan pemilik proyek.
4. Lindungi `main`: tidak ada direct push, wajib PR, required CI, dan minimal satu approval manusia.
5. Buat integration branch per milestone: `integration/m0-foundation`, `integration/m1-platform`, dan seterusnya.

Original checkout `/home/zhev/myproject/website-fuspi` hanya untuk `main` dan operator manusia. Buat satu worktree integration (operator/GPT integrator, tidak untuk feature coding) dan tiga worktree model:

```bash
git worktree add ../fuspi-integration -b integration/m0-foundation main
git worktree add ../fuspi-gpt -b ai/gpt/m0-platform integration/m0-foundation
git worktree add ../fuspi-claude -b ai/claude/m0-experience integration/m0-foundation
git worktree add ../fuspi-deepseek -b ai/deepseek/m0-qa integration/m0-foundation
```

Setelah milestone berganti, tiap worktree membuat branch task baru dari `origin/integration/<milestone>`; jangan memakai branch panjang lintas milestone.

Isolasi runtime agar tiga agent tidak bertabrakan di luar Git:

- Port dev: GPT `3001`, Claude `3004`, DeepSeek `3003`.
- Database: `fuspi_dev_gpt`, `fuspi_dev_claude`, `fuspi_dev_deepseek`; test database unik per CI job.
- Upload/tmp: `/tmp/fuspi-gpt`, `/tmp/fuspi-claude`, `/tmp/fuspi-deepseek`.
- Setiap worktree memiliki `.env.local` dan `node_modules` sendiri; package-download cache boleh dibagi.
- Jangan menjalankan migration pada database worktree model lain atau database staging/production dari task branch.

### Kepemilikan path

| Pemilik tunggal | Path/kategori |
|---|---|
| GPT | `package*.json`, config root, `.github/**`, `prisma/**`, migration/seed, `.env.example`, `src/proxy.ts`, auth/RBAC, storage/crypto, outbox/rate-limit, `src/contracts/**`, route operasional sensitif |
| Claude | `src/app/[locale]/(public)/**`, `src/components/public/**`, `src/components/ui/**`, `globals.css`, design tokens, public messages ID/EN/AR, test visual/accessibility |
| DeepSeek | admin content non-sensitif, `src/components/admin/**`, action/query/validation domain CMS yang kontraknya sudah beku, fixture netral, validasi kesiapan konten, unit/integration test domain |

Hotspot berikut selalu serial dan hanya diubah GPT/integrator: dependency lockfile, Prisma schema/migration, root layout, navigation registry, shared contract/type, Auth config, proxy, CI, env contract. Global CSS dan UI primitives hanya Claude. Agent lain membuat request contract; tidak mengedit hotspot sendiri.

### Task manifest dan path lease

Setiap task memiliki satu file immutable-scope `coordination/tasks/<ID>.md` yang dibuat integrator sebelum agent mulai:

```yaml
id: M3-CMS-PAGE-01
milestone: M3
owner: deepseek-v4-pro
reviewer: gpt-5.6-terra
tester: claude-sonnet-5
base_sha: <integration branch SHA>
allowed_paths: []
forbidden_paths: []
depends_on: []
contracts: []
acceptance_commands: []
risk: low|medium|high|critical
token_class: S|M|L
status: assigned
```

- Satu path hanya boleh muncul pada satu task lease aktif.
- Scope tidak diperluas diam-diam. Owner meminta contract/change task baru.
- CI `scope-check` membandingkan changed paths dengan allowed paths.
- Task selesai dengan `HANDOFF`: commit SHA, file berubah, test, keputusan, risiko, dan follow-up. Jangan kirim state penting hanya melalui chat.
- Hanya coordinator/integrator mengubah status `ready → active → review → queued → merged`; worker tidak mengedit status task atau lease agent lain.

### Branch, PR, dan merge queue

- Branch: `ai/<model>/<milestone>-<task-id>`.
- Commit: Conventional Commits dan satu tujuan per commit; generated file dipisah dari handwritten change.
- PR menargetkan `integration/<milestone>`, bukan `main`.
- Ukuran target maksimal ±500 LOC handwritten per PR; module besar dipecah contract → backend → UI → test/hardening.
- Writer tidak menjadi satu-satunya reviewer. Reviewer memberi comment; writer yang memperbaiki branch-nya.
- Merge queue hanya satu PR pada satu waktu: rebase integration terbaru → fast CI → review → merge → full CI → agent lain rebase.
- Tidak ada copy-paste file antar-worktree, force push ke branch orang lain, atau resolusi otomatis `ours/theirs`.
- Integration branch masuk `main` hanya setelah milestone gate lengkap dan approval manusia.

Pemeriksaan minimum coordinator sebelum queue:

```bash
git diff --name-only integration/<milestone>...ai/<model>/<task>
git diff --check integration/<milestone>...ai/<model>/<task>
```

Writer melakukan rebase dan `ci:quick` di branch sendiri. Bila rebase memerlukan push ulang, `--force-with-lease` hanya boleh digunakan pada branch task milik writer; tidak pernah pada `integration/*` atau `main`.

## C. Peran tetap tiga model

### GPT — Platform Owner & Integrator

- Menjadi satu-satunya pemilik kontrak lintas lane, schema, security, concurrency, dependency, CI, dan release integration.
- Menulis modul operasional sensitif: pengaduan/PPKS, booking transaction core, privacy, private storage, token, audit, dan outbox.
- Menggunakan Terra harian; Sol hanya untuk schema freeze, auth/PPKS, booking concurrency, migration failure, dan final security gate.
- Tidak mengambil alih styling/CRUD hanya karena PR lain lambat; koordinasikan ulang task agar ownership tetap jelas.

### Claude — Public Experience Owner

- Memegang design system, public shell, homepage, route publik, responsive behavior, i18n/RTL visual, accessibility, structured data presentation, dan performance frontend.
- Sonnet 5 menjadi default. Opus 4.8 hanya untuk review read-only pada PPKS UX, privacy UX, booking critical flow, dan pre-go-live accessibility/architecture.
- Tidak mengubah schema/action/security contract. Gunakan mock typed contract sampai backend merge.

### DeepSeek — CMS Delivery & QA Owner

- Menghasilkan CRUD/admin berulang dari reference slice, validation/query domain, seed/fixture netral, negative test, concurrency test harness, content-readiness check, dan laporan crawl.
- V4 Pro non-thinking/low untuk boilerplate; thinking medium untuk integration tests; high untuk adversarial security test atau content-readiness edge cases.
- Tidak mengubah migration/schema/dependency. Semua kebutuhan field baru diajukan sebagai contract task ke GPT.

## D. Definition of Ready dan Done

Task baru boleh mulai bila:

- Dependency dan contract PR sudah merge.
- Base SHA dan allowed paths tercatat.
- Acceptance criteria dan commands dapat dijalankan.
- Tidak ada lease aktif pada path yang sama.
- Fixture/mocks tidak mengandung data pribadi produksi.

Task dianggap selesai bila:

- Code, test, lint, typecheck, dan domain acceptance lulus.
- Locale ID/EN/AR dan RTL diperiksa bila ada UI/text.
- Security/ownership diperiksa server-side bila ada data/action.
- Tidak ada secret, PII, token, generated junk, atau perubahan di luar lease.
- HANDOFF dan PR summary lengkap; reviewer berbeda menyetujui.

## E. Fase implementasi dan alokasi model

### M0 — Baseline, scaffold, dan feasibility spike (serial → paralel terbatas)

**Lead:** GPT-5.6 Sol `high` hanya untuk freeze arsitektur; lanjut Terra `medium`.

**Claude:** Sonnet 5, read-only design/i18n review.

**DeepSeek:** V4 Pro low, inventaris test dan dependency matrix.

Pekerjaan:

- Initial commit/tag/remote/protection, governance files, worktrees, task manifests, PR template, CODEOWNERS, scope-check.
- Scaffold Next.js di root repo, pin Node/dependency/lockfile, next-intl `[locale]`, Vitest, Playwright, lint/typecheck/build, PostgreSQL test.
- Feasibility spike VPS: Node runtime, PostgreSQL, public/private filesystem, Sharp, pdf.js, SMTP, worker scheduler, Serializable transaction dan full-text search.
- Materialisasikan `docs/02` menjadi satu `prisma/schema.prisma` kanonik sebelum lane lain memakai model data.

Gate: clean install/build; `/id`, `/en`, `/ar`; Prisma validate; CI hijau; capability VPS/PostgreSQL tercatat. Tidak ada worktree feature sebelum gate ini.

### M1 — Fondasi paralel

**GPT Terra high:** schema final, migration awal, seed idempotent, contracts/types, audit/revision/outbox primitives.

**Claude Sonnet 5:** design tokens, fonts, logical CSS, public/admin shell visual, messages dasar, RTL.

**DeepSeek V4 Pro medium:** test harness PostgreSQL, fixtures sintetis, threat-test matrix, serta matriks halaman/menu/kepemilikan konten awal.

Gate: database kosong migrate+seed dan rerun tanpa duplikasi; shell 360–1440 px + RTL; unit/integration foundation hijau.

### M2 — Platform security dan shared capabilities

**GPT Sol high (writer):** Auth.js database session, revocation, permission matrix, optimistic locking, upload public/private/PPKS, AES-GCM, token/IP HMAC, rate limit, annual sequence, SLA/Holiday, outbox worker, sanitizer dan redirect safety.

**DeepSeek V4 Pro thinking high (tester):** IDOR, session revocation, upload spoof/path traversal, encryption tamper, sequence parallel, outbox idempotency, CSV injection.

**Claude Sonnet 5 (reviewer):** login/session expiry/error/accessibility flow; tidak menulis security core.

Gate: seluruh security integration test wajib lulus. Claude Opus 4.8 dipakai satu kali untuk review read-only threat surface; writer memperbaiki temuan.

### M3 — Reference vertical slice Post + Media + i18n

**GPT Terra high:** frozen contract, service/action/query, ownership, revision, publish/schedule/autosave conflict.

**Claude Sonnet 5:** Tiptap UI, media picker presentation, admin/public list-detail, archive/sidebar, metadata/hreflang/JSON-LD, RTL/responsive.

**DeepSeek V4 Pro medium/high:** fixtures, unit/integration/E2E/negative tests untuk ADMIN/EDITOR, fallback locale, XSS dan IDOR.

Gate: satu slice end-to-end lulus dan menjadi template. Setelah gate, module lain tidak boleh membuat pola CRUD/action baru tanpa contract change.

### M4 — Tiga lane feature berjalan simultan

#### Lane GPT: operasional sensitif

Model: Terra high untuk implementation; Sol high hanya invariant kritis.

- Contact/survey primitives yang berbagi platform.
- Tiket umum + PPKS: query isolation, audit access, tracking, reply, private attachment, SLA, email.
- Room/booking: overlap Serializable, tracking/cancel, calendar API, publish Event.
- Alert/status, privacy request/retention/export, accessibility request.
- SILA hanya deep link v1.

#### Lane Claude: public experience

Model: Sonnet 5 adaptive; Opus tidak dipakai untuk coding rutin.

- Header/footer/menu, homepage editable, archive/detail seluruh tipe.
- Prodi, dosen/staff, research/PkM, partnership, album/PDF, dokumen, FAQ.
- Direktori, calon mahasiswa, search UI, consent/feedback, structured data.
- Mobile, RTL, WCAG, reduced motion, performance budget frontend.

#### Lane DeepSeek: CMS/admin dan volume delivery

Model: V4 Pro low/medium; high pada import/reconciliation tests.

- Admin CRUD Page/prodi/dosen/staff/research/PkM/beasiswa/prestasi/kegiatan/partnership/service/document/album/FAQ/testimonial.
- Menu/reorder, HomeSection, SiteSetting, governance dashboard, translation state, import massal.
- Unit/integration tests, seed/fixtures, CSV safety dan error cases untuk semua module.

Aturan M4: setiap module PR kecil mengikuti reference slice. Schema request merge lebih dulu oleh GPT; Claude/DeepSeek rebase sebelum melanjutkan.

Gate: suite per lane hijau; PPKS isolation dan booking concurrency adalah blocker absolut.

### M5 — Integrasi, kesiapan konten, dan hardening

**GPT Terra high (integrator):** cross-module contracts, navigation, search aggregation, outbox/status integration, CSP/security headers.

**DeepSeek V4 Pro high:** validasi kelengkapan konten, media integrity, internal-link crawl, fixture neutrality, empty-state, dan laporan kesiapan.

**Claude Sonnet 5:** visual regression, content sampling, ID/EN/AR/RTL, accessibility dan CWV tuning.

Gate: checklist halaman/menu/konten awal disetujui; nol broken internal URL/media; seluruh role/locale E2E hijau. Course/Curriculum, API SILA dan SSO tetap tidak masuk v1.

### M6 — Staging, restore, security, dan go-live

**GPT Sol max satu kali:** final security/release audit dan rollback review.

**Claude Opus 4.8 read-only satu kali:** final UX/accessibility/PPKS trauma-informed review.

**DeepSeek V4 Pro high:** full regression, load/concurrency, restore verification, smoke checklist.

Pekerjaan:

- Deploy staging identik produksi; SMTP/cron/storage/redeploy.
- Backup + restore drill DB/public/private/PPKS; encryption key terpisah.
- Lighthouse/axe/manual keyboard/screen-reader, CSP/headers, disk monitoring.
- Persetujuan institusional PPKS, privacy/retention, serta materi awal manual.
- Cutover, production smoke test, registry redirect aman, dan rollback window.

Gate: semua kondisi `20-test-acceptance-go-live.md` terpenuhi dan manusia memberi approval. Agent tidak melakukan go-live sendiri.

## F. Writer–Reviewer–Tester matrix

| Risk | Writer | Reviewer | Tester |
|---|---|---|---|
| UI/public | Claude Sonnet 5 | GPT Terra | DeepSeek Pro |
| CRUD/admin | DeepSeek Pro | Claude Sonnet 5 | GPT Terra |
| Schema/auth/security/PPKS | GPT Sol | Claude Opus read-only | DeepSeek Pro high |
| Booking concurrency | GPT Sol | Claude Opus read-only | DeepSeek Pro high |
| Content readiness/crawl | DeepSeek Pro high | GPT Terra/Sol | Claude content sampling |
| Release | GPT Sol | Claude Opus | DeepSeek full regression + manusia |

Reviewer tidak melakukan silent fix pada branch writer. Bila review menemukan contract bug, buka task kontrak baru milik GPT; bila implementation bug, writer memperbaiki branch yang sama.

## G. CI bertingkat dan merge policy

- **Fast CI per PR:** scope-check, secret scan, format/lint, typecheck, affected unit tests, Prisma validate bila relevan.
- **Domain CI:** PostgreSQL integration, E2E domain, locale/RTL, axe untuk UI, security tests untuk action/upload.
- **Full CI setelah merge queue:** build production, semua unit/integration/E2E, migration fresh DB, seed idempotency.
- **Nightly:** browser matrix, crawl/broken link, visual regression, fixture-neutrality/content-readiness check, dependency/security scan.
- **Milestone:** restore drill (M6), performance field/lab gate, PPKS isolation, booking parallel approval, dan persetujuan konten awal manual.

PR tidak dapat merge bila scope-check gagal, reviewer adalah writer, migration lama diedit, generated client dicampur manual, atau CI flaky di-rerun tanpa issue/penjelasan.

## H. Failure dan recovery rules

- Agent gagal dua kali pada task yang sama: hentikan, tulis failure handoff + log ringkas, lalu eskalasi reasoning/model; jangan terus menghabiskan token.
- Branch tertinggal: owner rebase dari integration dan menyelesaikan konflik hanya pada owned paths.
- Konflik hotspot: hentikan kedua PR; integrator membuat contract PR kecil. Tidak ada agent lain menyelesaikan hotspot.
- CI flaky: quarantine hanya dengan issue, owner, expiry; test kritis security/concurrency tidak boleh di-quarantine.
- Salah migration: jangan edit migration yang sudah merge; tambah corrective migration.
- Security leak/secret: hentikan semua lane, revoke/rotate, bersihkan log/artifact, audit history, baru lanjut.
- Model outage/quota: task tetap pada lane/path yang sama; boleh mengganti tier/provider hanya setelah handoff dan branch bersih, tidak dengan dua writer bersamaan.

## I. Deliverable per milestone

Setiap milestone menghasilkan:

1. Integration branch hijau dan tag `mN-accepted`.
2. Changelog fitur dan keputusan kontrak.
3. Test/evidence report.
4. Cost/token report per model dan rekomendasi penyesuaian milestone berikutnya.
5. Daftar risiko/blocker institusional.

Ukuran keberhasilan bukan jumlah kode yang dihasilkan tiga model, melainkan jumlah acceptance gate yang lulus tanpa defect Critical/High, tanpa konflik ownership, dan tanpa pekerjaan ulang akibat kontrak yang berubah diam-diam.
