# Lecturer Profile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the public lecturer detail page real visual containment and an academic-period teaching filter, split the admin lecturer editor into six single-subject tabs backed by tables and Sheets, and close the admin write path so it can set every lecturer column the schema and public page already support.

**Architecture:** Additive-nullable contract change in `src/contracts/academic.ts` flows through three existing lecturer write paths (`people.ts` create/update, `editor-import.ts` import) and one read-back path. The admin UI gains two reusable primitives (`record-table.tsx`, `lecturer-record-sheet.tsx`) that wrap the four **already-correct, unchanged** server actions. The public page inverts its ground/card relationship to make elevation visible.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Prisma, Zod, Tailwind CSS 4, shadcn/ui, next-intl, Vitest + jsdom, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-04-lecturer-profile-redesign-design.md`

## Global Constraints

- **No Prisma schema change and no migration.** Every column used by this plan already exists. If a task seems to need one, stop — it is a misread.
- **The four record server actions do not change.** `saveAdminEducationAction`, `saveAdminPublicationAction`, `saveAdminHkiAction`, `saveAdminTeachingAction` already handle create / update / delete via an `intent` field. Tasks 6–7 are a presentation swap.
- Identity: the product is **FUSPI — Fakultas Ushuluddin dan Pemikiran Islam**. Never write `fuda.uinbanten.ac.id`, FUDA branding, FUDA email, or FUDA public copy into the repo.
- Active study programs, in order: `IAT`, `IH`, `AFI`. `src/config/institution.ts` is the contract.
- Server Components by default. Client Components only for browser state.
- Validate at every trust boundary with shared Zod schemas. `proxy.ts` is UX, not authorization.
- ID is mandatory content locale; EN/AR may fall back. Arabic is RTL from the first implementation.
- Logical direction utilities only (`ms/me/ps/pe/start/end/text-start`). Never `ml/mr/pl/pr/text-left/text-right`.
- Use `gap-*` not `space-x/y-*`; `size-*` for equal dimensions; `cn()` for conditional classes.
- Icons inside shadcn buttons use `data-icon`; never hard-code icon size there.
- Forms use `FieldGroup` + `Field`. Overlays require an accessible title. Loading uses Skeleton/Spinner.
- No comments unless explaining non-obvious logic.
- Every task ends green on: `npm run lint`, `npm run typecheck`, `npm run test`.

---

### Task 1: Contract and writer parity for the admin lecturer path

The admin path can currently set only `googleScholarUrl` and `sintaUrl`. The schema, the public page, and the lecturer self-service portal all already support five more columns and two more translation fields. This task closes that gap.

**Files:**
- Modify: `src/contracts/academic.ts:77-101` (`PersonTranslationInputSchema`, `LecturerInputSchema`)
- Modify: `src/features/academic/people.ts:606-638` (`createLecturer`, `updateLecturer`)
- Modify: `src/features/academic/editor-import.ts:159-177` (LECTURER read-back), `:306-317` (`createImportRow`)
- Test: `tests/m4/runtime/academic-people.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `LecturerInputSchema` accepting `scopusUrl`, `linkedinUrl`, `instagramUrl`, `twitterUrl` (each `{kind: "EXTERNAL", href: string} | null`), `cvMediaId: string | null`, and per-locale `officeLocation: string | null`, `quote: string | null`. Tasks 5 and 8 build payloads against this shape.

**Reuse note:** do **not** write a new `validateCv`. `src/features/academic/people.ts:432` already has `validateCertificate(tx, mediaId)`, which resolves the media row and asserts it passes `publicPdfMedia(...)` — exactly the PDF check `cvMediaId` needs. Call it.

- [ ] **Step 1: Write the failing tests**

Append to `tests/m4/runtime/academic-people.test.ts`:

```typescript
describe("lecturer contract parity", () => {
  it("accepts the extended research-media and CV fields", () => {
    const parsed = LecturerInputSchema.safeParse({
      name: "Dr. Uji Coba, M.Hum.",
      slug: "uji-coba",
      nidn: null, nip: null, orcid: null,
      googleScholarUrl: null, sintaUrl: null,
      scopusUrl: {kind: "EXTERNAL", href: "https://www.scopus.com/authid/detail.uri?authorId=1"},
      linkedinUrl: null, instagramUrl: null, twitterUrl: null,
      email: null, phone: null,
      photoMediaId: null, cvMediaId: "cmtlyc9sc0000ap7nvy6bm0iv",
      studyProgramId: null, order: 0, isActive: true,
      translations: {id: {
        position: "Dekan", expertise: null, bio: null, officeHours: null,
        officeLocation: "Gedung FUSPI Lt. 2", quote: "خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ",
      }},
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data?.scopusUrl?.href).toBe("https://www.scopus.com/authid/detail.uri?authorId=1");
    expect(parsed.data?.cvMediaId).toBe("cmtlyc9sc0000ap7nvy6bm0iv");
    expect(parsed.data?.translations.id.officeLocation).toBe("Gedung FUSPI Lt. 2");
  });

  it("accepts explicit nulls for every new field", () => {
    const parsed = LecturerInputSchema.safeParse({
      name: "Dr. Uji Coba, M.Hum.",
      slug: "uji-coba",
      nidn: null, nip: null, orcid: null,
      googleScholarUrl: null, sintaUrl: null,
      scopusUrl: null, linkedinUrl: null, instagramUrl: null, twitterUrl: null,
      email: null, phone: null,
      photoMediaId: null, cvMediaId: null,
      studyProgramId: null, order: 0, isActive: true,
      translations: {id: {
        position: null, expertise: null, bio: null, officeHours: null,
        officeLocation: null, quote: null,
      }},
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects a non-https research-media link", () => {
    const parsed = LecturerInputSchema.safeParse({
      name: "Dr. Uji Coba, M.Hum.",
      slug: "uji-coba",
      nidn: null, nip: null, orcid: null,
      googleScholarUrl: null, sintaUrl: null,
      scopusUrl: {kind: "EXTERNAL", href: "http://insecure.example/profile"},
      linkedinUrl: null, instagramUrl: null, twitterUrl: null,
      email: null, phone: null,
      photoMediaId: null, cvMediaId: null,
      studyProgramId: null, order: 0, isActive: true,
      translations: {id: {
        position: null, expertise: null, bio: null, officeHours: null,
        officeLocation: null, quote: null,
      }},
    });

    expect(parsed.success).toBe(false);
  });
});
```

Add `LecturerInputSchema` to the file's imports:

```typescript
import {LecturerInputSchema} from "@/contracts/academic";
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/m4/runtime/academic-people.test.ts -t "lecturer contract parity"`
Expected: FAIL. The first test fails because `.strict()` rejects the unrecognized keys `scopusUrl` / `cvMediaId` / `officeLocation` / `quote`.

- [ ] **Step 3: Extend the contract**

In `src/contracts/academic.ts`, replace `PersonTranslationInputSchema` (`:77-82`):

```typescript
const PersonTranslationInputSchema = z.object({
  position: OptionalText(255),
  expertise: OptionalText(500),
  bio: OptionalText(100_000),
  officeHours: OptionalText(255),
  officeLocation: OptionalText(200),
  quote: OptionalText(500),
}).strict();
```

Replace `LecturerInputSchema` (`:86-101`):

```typescript
export const LecturerInputSchema = z.object({
  name: RequiredText(191),
  slug: SlugSchema,
  nidn: OptionalText(50),
  nip: OptionalText(50),
  orcid: z.string().trim().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/u).nullable(),
  googleScholarUrl: ExternalLinkSchema.nullable(),
  sintaUrl: ExternalLinkSchema.nullable(),
  scopusUrl: ExternalLinkSchema.nullable(),
  linkedinUrl: ExternalLinkSchema.nullable(),
  instagramUrl: ExternalLinkSchema.nullable(),
  twitterUrl: ExternalLinkSchema.nullable(),
  email: InstitutionalEmailSchema,
  phone: PhoneSchema,
  photoMediaId: CmsIdentifierSchema.nullable(),
  cvMediaId: CmsIdentifierSchema.nullable(),
  studyProgramId: CmsIdentifierSchema.nullable(),
  order: z.number().int().min(0).max(10_000),
  isActive: z.boolean(),
  translations: localizedInput(PersonTranslationInputSchema),
}).strict();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/m4/runtime/academic-people.test.ts -t "lecturer contract parity"`
Expected: PASS (3 tests).

- [ ] **Step 5: Persist the new columns in both writers**

In `src/features/academic/people.ts`, `createLecturer` — replace the `tx.lecturer.create` data block (`:611-616`):

```typescript
  if (!await validateCertificate(tx, input.cvMediaId)) return {ok: false, code: "MEDIA_INVALID"} as const;
  const row = await tx.lecturer.create({data: {
    name: input.name, slug: input.slug, nidn: input.nidn, nip: input.nip, orcid: input.orcid,
    googleScholarUrl: input.googleScholarUrl?.href ?? null, sintaUrl: input.sintaUrl?.href ?? null,
    scopusUrl: input.scopusUrl?.href ?? null, linkedinUrl: input.linkedinUrl?.href ?? null,
    instagramUrl: input.instagramUrl?.href ?? null, twitterUrl: input.twitterUrl?.href ?? null,
    email: input.email, phone: input.phone,
    photoMediaId: input.photoMediaId, cvMediaId: input.cvMediaId,
    studyProgramId: input.studyProgramId, order: input.order, isActive: input.isActive,
  }, select: {id: true}});
```

Place the new `validateCertificate` guard immediately after the existing `validatePhoto` guard at `:607`, before the study-program check.

In `updateLecturer` — add the same guard after `:625`, then replace the `tx.lecturer.update` data block (`:629-634`):

```typescript
  await tx.lecturer.update({where: {id}, data: {
    name: input.name, slug: input.slug, nidn: input.nidn, nip: input.nip, orcid: input.orcid,
    googleScholarUrl: input.googleScholarUrl?.href ?? null, sintaUrl: input.sintaUrl?.href ?? null,
    scopusUrl: input.scopusUrl?.href ?? null, linkedinUrl: input.linkedinUrl?.href ?? null,
    instagramUrl: input.instagramUrl?.href ?? null, twitterUrl: input.twitterUrl?.href ?? null,
    email: input.email, phone: input.phone,
    photoMediaId: input.photoMediaId, cvMediaId: input.cvMediaId,
    studyProgramId: input.studyProgramId, order: input.order, isActive: input.isActive,
  }});
```

`replaceLecturerTranslations` (`:474-490`) needs **no change** — it spreads `...value` from the translation input, so `officeLocation` and `quote` flow through automatically once the schema carries them.

- [ ] **Step 6: Close the import and read-back paths**

`src/features/academic/editor-import.ts` has a third lecturer write path and the read-back the edit form hydrates from. Both must carry the new fields or the admin form will silently drop them.

Read-back — replace the LECTURER `input` block (`:166-176`):

```typescript
        input: {
          name: row.name, slug: row.slug, nidn: row.nidn, nip: row.nip, orcid: row.orcid,
          googleScholarUrl: row.googleScholarUrl ? {kind: "EXTERNAL", href: row.googleScholarUrl} : null,
          sintaUrl: row.sintaUrl ? {kind: "EXTERNAL", href: row.sintaUrl} : null,
          scopusUrl: row.scopusUrl ? {kind: "EXTERNAL", href: row.scopusUrl} : null,
          linkedinUrl: row.linkedinUrl ? {kind: "EXTERNAL", href: row.linkedinUrl} : null,
          instagramUrl: row.instagramUrl ? {kind: "EXTERNAL", href: row.instagramUrl} : null,
          twitterUrl: row.twitterUrl ? {kind: "EXTERNAL", href: row.twitterUrl} : null,
          email: row.email, phone: row.phone,
          photoMediaId: row.photoMediaId, cvMediaId: row.cvMediaId,
          studyProgramId: row.studyProgramId, order: row.order, isActive: row.isActive,
          translations: localized(row.translations, (translation) => ({
            position: translation.position, expertise: translation.expertise,
            bio: translation.bio, officeHours: translation.officeHours,
            officeLocation: translation.officeLocation, quote: translation.quote,
          })),
        },
```

`createImportRow` — replace the `tx.lecturer.create` data block (`:308-314`):

```typescript
    const created = await tx.lecturer.create({data: {
      name: input.name, slug: input.slug, nidn: input.nidn, nip: input.nip, orcid: input.orcid,
      googleScholarUrl: input.googleScholarUrl?.href ?? null, sintaUrl: input.sintaUrl?.href ?? null,
      scopusUrl: input.scopusUrl?.href ?? null, linkedinUrl: input.linkedinUrl?.href ?? null,
      instagramUrl: input.instagramUrl?.href ?? null, twitterUrl: input.twitterUrl?.href ?? null,
      email: input.email, phone: input.phone,
      photoMediaId: input.photoMediaId, cvMediaId: input.cvMediaId,
      studyProgramId: input.studyProgramId, order: input.order, isActive: input.isActive,
      translations: {create: Object.entries(input.translations).map(([locale, value]) => ({locale: locale as Locale, ...value, ...translationState(locale as Locale, actorId, now)}))},
    }, select: {id: true}});
```

- [ ] **Step 7: Verify the CSV importer still accepts legacy files**

**This step is load-bearing, not a formality.** The new fields are `.nullable()`, not `.optional()` — a required key that accepts `null`, matching every existing field in this schema including `photoMediaId`. Under `.strict()`, a caller that *omits* the key fails. Two callers build their payload object with explicit keys and must both be checked:

- `src/features/academic/lecturer-csv-import.ts:182`
- `src/features/academic/editor-import.ts:243` — a **second** `LecturerInputSchema.parse` call, distinct from the read-back edited in Step 6

Add the new keys defaulted to `null` at each site. Do **not** loosen `.strict()` or switch the fields to `.optional()` to make this pass — `.strict()` is what stops an attacker-supplied extra key from riding along.

Run the existing suite to confirm no regression:

Run: `npx vitest run tests/platform/lecturer-portal/lecturer-csv-import.test.ts`
Expected: PASS, unchanged.

If it fails, the importer builds its candidate object with explicit keys — add the new keys defaulted to `null` rather than loosening `.strict()`.

- [ ] **Step 8: Run the full gate**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all pass. `typecheck` is the real check here — it proves every lecturer write path now supplies the fields Prisma expects.

- [ ] **Step 9: Commit**

```bash
git add src/contracts/academic.ts src/features/academic/people.ts src/features/academic/editor-import.ts tests/m4/runtime/academic-people.test.ts
git commit -m "feat: carry research media, CV, and office fields through the admin lecturer path"
```

---

### Task 2: Seed Dr. Masykur's record

Seeds a real, complete lecturer so the redesign is exercised against realistic volume (27 publications) instead of three-publication stubs.

**Files:**
- Create: `prisma/assets/lecturers/masykur.webp` (downloaded portrait, converted)
- Modify: `prisma/seed.ts:184-186` (comment), `:187` (`LECTURERS`), `:726-767` (seed loop)

**Interfaces:**
- Consumes: nothing from Task 1 (the seeder writes Prisma directly).
- Produces: a lecturer at slug `dr-masykur-m-hum` with `nip`, `scopusUrl`, `sintaUrl`, `googleScholarUrl`, 3 educations, 27 publications, and a photo — the fixture Tasks 4–5 are eyeballed against.

**Identity rule (from the spec, non-negotiable):** academic content is real and sourced; institutional identity is FUSPI's. Email becomes `masykur@fuspi.uinbanten.ac.id`, office becomes `Gedung FUSPI Lt. 2, Ruang Dekan`, position becomes `Dekan Fakultas Ushuluddin dan Pemikiran Islam`. No external faculty domain, branding, or copy enters the repo.

- [ ] **Step 1: Check how the existing seeder loads photo assets**

Run: `grep -n "seedMedia" -A 20 prisma/seed.ts | head -40`

Read the helper's signature and the directory it reads from. The portrait must be placed where that helper expects, and registered the same way `dekan-masykur.webp` already is. Match the existing call shape exactly — do not invent a second asset convention.

- [ ] **Step 2: Fetch and convert the portrait**

```bash
mkdir -p prisma/assets/lecturers
curl -sSL -o /tmp/masykur-source.jpeg \
  "https://fuda.uinbanten.ac.id/wp-content/uploads/2025/08/IMG_3611-scaled-e1762021246757.jpeg"
file /tmp/masykur-source.jpeg
```

Expected: `JPEG image data`. Convert to webp at portrait aspect (the identity card renders `aspect-[4/5]`):

```bash
npx sharp-cli --input /tmp/masykur-source.jpeg --output prisma/assets/lecturers/masykur.webp \
  resize 800 1000 --fit cover --position top
```

If `sharp-cli` is unavailable, use the `sharp` dependency already in `node_modules` via a one-off `npx tsx` script. Verify the result is under 200KB and visually correct before continuing.

- [ ] **Step 3: Amend the fictional-identity comment**

`prisma/seed.ts:184-186` currently states lecturer identities are fictional *on purpose*. That rule still holds for the invented demo lecturers, but Masykur is the inverse case, so the comment must state both rules rather than stand in contradiction:

```typescript
/* Demo lecturers. The invented identities below are fictional on purpose: the
   directory carries education history and publications, and attaching invented
   credentials to a real person would fabricate an academic record.
   Dr. Masykur is the exception and the inverse case — a real person whose record
   is reproduced from his published faculty profile, never invented. His academic
   content is sourced; his institutional identity (email, office, position) is
   FUSPI's, never another faculty's. */
```

- [ ] **Step 4: Add the record to `LECTURERS`**

Insert as the **first** entry so `order: 0` puts the dean at the top of the directory. Note this shifts `LECTURERS[0]` — which `:719` and `:749`/`:761` use to attach the `dosen.demo@` portal account. Move that account binding to the entry that previously held index 0 by matching on slug rather than index:

```typescript
const PORTAL_ACCOUNT_SLUG = "halimah-nur-azizah";
```

and replace the three `index === 0` uses with `item.slug === PORTAL_ACCOUNT_SLUG`. The demo portal account must stay on a fictional lecturer — binding a login to a real person's profile is not acceptable.

The record:

```typescript
  {
    slug: "masykur",
    name: "Dr. Masykur, M.Hum.",
    nidn: null,
    nip: "197606172005011003",
    program: "AFI",
    position: "Dekan Fakultas Ushuluddin dan Pemikiran Islam",
    expertise: "Filsafat Islam, moderasi beragama, pemikiran keislaman kontemporer",
    officeLocation: "Gedung FUSPI Lt. 2, Ruang Dekan",
    officeHours: "Senin-Kamis, 09.00-14.00 WIB",
    googleScholarUrl: "https://scholar.google.co.id/citations?user=wlrJ3SsAAAAJ&hl=en",
    sintaUrl: "https://sinta.kemdikbud.go.id/authors/profile/6058892",
    scopusUrl: "https://www.scopus.com/authid/detail.uri?authorId=59316785500",
    bio: "<p>Dr. Masykur, M.Hum. lahir di Cirebon, 17 Juni 1976. Saat ini beliau menjabat sebagai Dekan Fakultas Ushuluddin dan Pemikiran Islam UIN Sultan Maulana Hasanuddin Banten. Sebelumnya beliau pernah menjabat sebagai Wakil Dekan II Fakultas Dakwah, Sekretaris LP2M, dan Sekretaris Halal Center di universitas yang sama. Beliau juga aktif dalam organisasi keagamaan dan sosial, antara lain sebagai Wakil Sekretaris RMI PWNU Banten (2020-2021).</p><p>Dr. Masykur menempuh pendidikan tinggi di bidang filsafat: S1 Aqidah Filsafat di UIN Sunan Kalijaga Yogyakarta, kemudian melanjutkan ke S2 dan S3 Ilmu Filsafat di Universitas Indonesia, Depok. Bidang kepakaran beliau meliputi filsafat Islam, moderasi beragama, dan studi pemikiran keislaman kontemporer.</p><p>Sebagai akademisi produktif, beliau telah menulis sejumlah buku dan artikel ilmiah, dan aktif dalam pengembangan moderasi beragama serta sertifikasi halal di Indonesia.</p>",
    educations: [
      {degree: "Dr.", field: "Ilmu Filsafat", institution: "Universitas Indonesia", city: "Depok", year: 2015},
      {degree: "M.Hum.", field: "Ilmu Filsafat", institution: "Universitas Indonesia", city: "Depok", year: 2004},
      {degree: "S.Ag.", field: "Aqidah Filsafat", institution: "UIN Sunan Kalijaga", city: "Yogyakarta", year: 2000},
    ],
    publications: [
      {title: "Ulama Perempuan Banten Kontemporer untuk Politik Keramahan dan Ekonomi Kerakyatan", type: "BUKU" as const, year: 2021, publisher: "Media Madani, Banten"},
      {title: "Filsafat Umum: Dari Filsafat Yunani Kuno ke Filsafat Modern", type: "BUKU" as const, year: 2021, publisher: "A-Empat, Banten"},
      {title: "Menanam Kembali Moderasi Beragama untuk Merajut Kebhinekaan Bangsa", type: "BUKU" as const, year: 2020, publisher: "Teras Karsa Publisher"},
      {title: "Ulama Perempuan Banten: Dari Mekah, Pesantren dan Majelis Taklim untuk Islam Nusantara", type: "BUKU" as const, year: 2017, publisher: "Bildung Nusa Media, Yogyakarta"},
      {title: "Data Perlindungan Perempuan dan Anak Korban Kekerasan", type: "BUKU" as const, year: 2016, publisher: "FTK Press, Banten"},
      {title: "Teori Interpretasi Paul Ricoeur", type: "BUKU" as const, year: 2015, publisher: "LKiS, Yogyakarta"},
      {title: "Dialektika Teks Suci Agama: Struktur Makna Agama dalam Kehidupan Masyarakat", type: "BUKU" as const, year: 2008, publisher: "Pustaka Pelajar, Yogyakarta"},
      {title: "Intelektual Pesantren: Potret dan Cakrawala Pemikiran di Era Keemasan Pesantren", type: "BUKU" as const, year: 2003, publisher: "Diva Pustaka, Jakarta"},
      {title: "Reviving Religious Moderation for World Peace", type: "JURNAL" as const, year: 2024, publisher: "Journal of Ecohumanism, Vol. 3 No. 3"},
      {title: "The Yahukimo Conflict", type: "JURNAL" as const, year: 2021, publisher: "Walisongo: Jurnal Penelitian Sosial Keagamaan, Vol. 29 No. 2"},
      {title: "The Perspective of al-Sunnah al-Nabawiyyah", type: "JURNAL" as const, year: 2021, publisher: "Turkish Journal of Computer and Mathematics Education"},
      {title: "Pre-Service Teachers' Perception", type: "JURNAL" as const, year: 2021, publisher: "Walisongo: Jurnal Penelitian Sosial Keagamaan"},
      {title: "Resolusi Konflik dan Islam Nusantara", type: "JURNAL" as const, year: 2016, publisher: "Refleksi"},
      {title: "Sunda Wiwitan Baduy", type: "JURNAL" as const, year: 2012, publisher: "El Harakah"},
      {title: "Agama, Etnisitas dan Radikalisme", type: "JURNAL" as const, year: 2008, publisher: "Al Qalam"},
    ],
  },
```

Only the 15 publications whose title and venue are both known are seeded. The source's remaining journal entries are bare URLs with no title — seeding a row whose `title` is a URL would be fabricating a citation. They are omitted deliberately; do not invent titles for them.

Also add teaching assignments to the same entry. **Without these the period filter built in Task 5 has zero options, renders disabled, and its Task 9 test asserts nothing** — the feature this branch exists to fix would ship untested. Four rows spanning two academic years and both terms, including two rows that share `semester: 3` across different years so the composite-key filter is genuinely exercised:

```typescript
    teaching: [
      {courseCode: "AFI-3101", courseName: "Filsafat Islam Klasik", programCode: "AFI", credits: 3, academicYearStart: 2026, academicYearEnd: 2027, term: "GANJIL" as const, semester: 3},
      {courseCode: "AFI-3204", courseName: "Hermeneutika dan Tafsir Kontemporer", programCode: "AFI", credits: 3, academicYearStart: 2026, academicYearEnd: 2027, term: "GANJIL" as const, semester: 5},
      {courseCode: "AFI-2202", courseName: "Moderasi Beragama", programCode: "AFI", credits: 2, academicYearStart: 2025, academicYearEnd: 2026, term: "GENAP" as const, semester: 4},
      {courseCode: "FUS-1103", courseName: "Pengantar Filsafat", programCode: "FUS", credits: 2, academicYearStart: 2025, academicYearEnd: 2026, term: "GANJIL" as const, semester: 3},
    ],
```

These are representative teaching assignments for his stated field, not sourced records — unlike the publications, the source page lists no courses. That is acceptable for a course schedule in a way it is not for a citation: a schedule is operational data the faculty sets, not a credential claim attributed to him.

The other `LECTURERS` entries have no `teaching` key, so type it optional and guard the write:

```typescript
        teachingAssignments: item.teaching
          ? {deleteMany: {}, create: item.teaching.map((t, order) => ({...t, order}))}
          : undefined,
```

Use `create:` without `deleteMany:` in the upsert's `create` branch.

- [ ] **Step 5: Thread the new fields through the seed loop**

`prisma/seed.ts:726-767` currently writes only `name`, `nidn`, `email`, `studyProgramId`, `order`, `isActive`. Extend both the `update` and `create` blocks with:

```typescript
        nip: item.nip ?? null,
        googleScholarUrl: item.googleScholarUrl ?? null,
        sintaUrl: item.sintaUrl ?? null,
        scopusUrl: item.scopusUrl ?? null,
```

and change the email line so the dean gets his own address rather than a slug-derived one:

```typescript
        email: `${item.slug}@fuspi.uinbanten.ac.id`,
```

This already yields `masykur@fuspi.uinbanten.ac.id` — no special case needed.

The `translation` object at `:727-736` already carries `officeLocation`; confirm `position`, `expertise`, `bio` are populated from the new entry. Entries without `googleScholarUrl` etc. need those keys present as `undefined` or the object literal type will narrow — add them as optional in the entry type if TypeScript complains.

- [ ] **Step 6: Attach the portrait**

Register `prisma/assets/lecturers/masykur.webp` through the same `seedMedia` helper the existing leadership portraits use, then set `photoMediaId` on the Masykur upsert. Follow the call shape found in Step 1 exactly.

- [ ] **Step 7: Run the seed against a scratch database**

Run: `npm run prisma:validate && npx tsx prisma/seed.ts`
Expected: completes without error. Then verify:

```bash
npx tsx -e "
import {getPrismaClient} from './src/lib/db/client';
const p = getPrismaClient();
const l = await p.lecturer.findUnique({
  where: {slug: 'dr-masykur-m-hum'},
  include: {publications: true, educations: true, translations: true},
});
console.log(l?.name, l?.email, l?.nip);
console.log('scopus:', l?.scopusUrl);
console.log('publications:', l?.publications.length, 'educations:', l?.educations.length);
console.log('photo:', l?.photoMediaId);
const t = await p.lecturerTeachingAssignment.findMany({where: {lecturerId: l!.id}});
console.log('teaching:', t.length, [...new Set(t.map((r) => r.academicYearStart + '-' + r.term))]);
"
```

Expected: `Dr. Masykur, M.Hum. masykur@fuspi.uinbanten.ac.id 197606172005011003`, `publications: 15 educations: 3`, a non-null photo id, and `teaching: 4` across three distinct periods (`2026-GANJIL`, `2025-GENAP`, `2025-GANJIL`).

- [ ] **Step 8: Confirm no FUDA identity leaked**

Run: `grep -rn "fuda\|FUDA" prisma/ src/ --include=*.ts --include=*.tsx | grep -v "^docs/"`
Expected: no matches introduced by this task. Any hit is a Global Constraints violation — fix before committing.

- [ ] **Step 9: Commit**

```bash
git add prisma/seed.ts prisma/assets/lecturers/masykur.webp
git commit -m "feat: seed the dean's full academic record with FUSPI identity"
```

---

### Task 3: Research media brand icons

The public page currently maps Google Scholar onto lucide `Globe` and SINTA onto `GraduationCap` — generic shapes that carry no brand meaning. The reference layout shows a row of recognisable marks.

**Files:**
- Create: `src/components/public/research-media-icons.tsx`
- Test: `tests/m4/runtime/research-media-icons.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `researchMediaLinks(lecturer): ReadonlyArray<{key: string; href: string; label: string; Icon: (props: {className?: string}) => JSX.Element}>` — Task 4 renders this.

- [ ] **Step 1: Write the failing test**

Create `tests/m4/runtime/research-media-icons.test.tsx`:

```typescript
import {describe, expect, it} from "vitest";

import {researchMediaLinks} from "@/components/public/research-media-icons";

describe("researchMediaLinks", () => {
  it("returns only the profiles that are set, in a stable order", () => {
    const links = researchMediaLinks({
      googleScholarUrl: "https://scholar.google.co.id/citations?user=abc",
      scopusUrl: "https://www.scopus.com/authid/detail.uri?authorId=1",
      sintaUrl: null,
      orcid: "0000-0002-1825-0097",
      linkedinUrl: null,
      instagramUrl: null,
    });

    expect(links.map((link) => link.key)).toEqual(["scholar", "scopus", "orcid"]);
  });

  it("builds an ORCID profile URL from the bare identifier", () => {
    const links = researchMediaLinks({
      googleScholarUrl: null, scopusUrl: null, sintaUrl: null,
      orcid: "0000-0002-1825-0097", linkedinUrl: null, instagramUrl: null,
    });

    expect(links[0].href).toBe("https://orcid.org/0000-0002-1825-0097");
  });

  it("drops a profile whose stored URL is not https", () => {
    const links = researchMediaLinks({
      googleScholarUrl: "http://scholar.google.co.id/citations?user=abc",
      scopusUrl: null, sintaUrl: null, orcid: null,
      linkedinUrl: null, instagramUrl: null,
    });

    expect(links).toEqual([]);
  });

  it("returns an empty list when no profile is set", () => {
    const links = researchMediaLinks({
      googleScholarUrl: null, scopusUrl: null, sintaUrl: null,
      orcid: null, linkedinUrl: null, instagramUrl: null,
    });

    expect(links).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/m4/runtime/research-media-icons.test.tsx`
Expected: FAIL — cannot resolve `@/components/public/research-media-icons`.

- [ ] **Step 3: Implement the module**

Create `src/components/public/research-media-icons.tsx`. It is a plain module (no `"use client"`) so the Server Component in Task 4 can call it directly.

```tsx
import {CmsHttpsExternalUrlSchema} from "@/contracts/cms";

type IconProps = {className?: string};

export type ResearchMediaSource = {
  googleScholarUrl: string | null;
  scopusUrl: string | null;
  sintaUrl: string | null;
  orcid: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
};

export type ResearchMediaLink = {
  key: string;
  href: string;
  label: string;
  Icon: (props: IconProps) => React.JSX.Element;
};

function ScholarIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2 1 8.5l11 6.5 9-5.32V17h2V8.5L12 2Z" />
      <path d="M5 13.18v4.09L12 21l7-3.73v-4.09L12 17l-7-3.82Z" />
    </svg>
  );
}

function ScopusIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M17.2 6.4a6.6 6.6 0 0 0-3.9-1.3c-2.2 0-3.7 1.2-3.7 2.9 0 1.5 1.1 2.3 3.3 3.1l1 .4c2.9 1 4.4 2.4 4.4 4.8 0 2.9-2.4 4.8-5.9 4.8a8.7 8.7 0 0 1-4.7-1.3l.7-1.9a7 7 0 0 0 4 1.2c2.1 0 3.5-1 3.5-2.6 0-1.4-1-2.2-3.2-3l-1-.4C8.7 12 7.2 10.7 7.2 8.2c0-2.8 2.3-4.7 5.9-4.7a8.4 8.4 0 0 1 4.6 1.3l-.5 1.6Z" />
    </svg>
  );
}

function SintaIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2.6a7.4 7.4 0 0 1 6.6 4.1H12l-2.4 4.2-1.7-2.9H4.9A7.4 7.4 0 0 1 12 4.6Zm-7.3 6.7h2.5l3 5.2 2.4-4.2h6.7a7.4 7.4 0 0 1-14.6-1Z" />
    </svg>
  );
}

function OrcidIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM8.5 6.6a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm-.9 3.3h1.8v7.5H7.6V9.9Zm3.6 0h3.2c2.4 0 3.9 1.6 3.9 3.7s-1.5 3.8-3.9 3.8h-3.2V9.9Zm1.8 1.6v4.3h1.3c1.5 0 2.2-1 2.2-2.2s-.7-2.1-2.2-2.1h-1.3Z" />
    </svg>
  );
}

function LinkedinIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm6.5 0h3.8v1.7h.05a4.2 4.2 0 0 1 3.75-2c4 0 4.75 2.6 4.75 6V21h-4v-5.6c0-1.34-.03-3.07-1.9-3.07-1.9 0-2.2 1.46-2.2 2.97V21h-4V9Z" />
    </svg>
  );
}

function InstagramIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.4.37 1 .42 2.2.07 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.4.17-1 .37-2.2.42-1.3.07-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.05-1.8-.25-2.2-.42-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.17-.4-.37-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.2.25-1.8.42-2.2.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.4-.17 1-.37 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 3.05a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5Zm0 11.13a4.38 4.38 0 1 1 0-8.76 4.38 4.38 0 0 1 0 8.76Zm6.99-11.4a1.58 1.58 0 1 1-3.15 0 1.58 1.58 0 0 1 3.15 0Z" />
    </svg>
  );
}

const ORCID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/u;

function safeHttpsUrl(value: string | null) {
  if (value === null) return null;
  const parsed = CmsHttpsExternalUrlSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function researchMediaLinks(source: ResearchMediaSource): ReadonlyArray<ResearchMediaLink> {
  const orcidHref = source.orcid && ORCID_PATTERN.test(source.orcid)
    ? `https://orcid.org/${source.orcid}`
    : null;

  return [
    {key: "scholar", href: safeHttpsUrl(source.googleScholarUrl), label: "Google Scholar", Icon: ScholarIcon},
    {key: "scopus", href: safeHttpsUrl(source.scopusUrl), label: "Scopus", Icon: ScopusIcon},
    {key: "sinta", href: safeHttpsUrl(source.sintaUrl), label: "SINTA", Icon: SintaIcon},
    {key: "orcid", href: orcidHref, label: "ORCID", Icon: OrcidIcon},
    {key: "linkedin", href: safeHttpsUrl(source.linkedinUrl), label: "LinkedIn", Icon: LinkedinIcon},
    {key: "instagram", href: safeHttpsUrl(source.instagramUrl), label: "Instagram", Icon: InstagramIcon},
  ].filter((link): link is ResearchMediaLink => link.href !== null);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/m4/runtime/research-media-icons.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/public/research-media-icons.tsx tests/m4/runtime/research-media-icons.test.tsx
git commit -m "feat: add research media brand icons for the lecturer profile"
```

---

### Task 4: Public detail page — containment and identity card

The fix for "menyatu dengan background" is an inversion: today the page ground is white and cards are `bg-slate-50/70` (invisible). After this task the ground is tinted and cards are white and elevated.

**Files:**
- Modify: `src/app/[locale]/(public)/dosen/[id]/page.tsx`

**Interfaces:**
- Consumes: `researchMediaLinks` from Task 3.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the missing columns to the query**

`LECTURER_DETAIL_SELECT` (`:33-76`) does not select `orcid` or `scopusUrl` even though both columns exist. Add them to the select and to the `Row` type (`:102-120`):

```typescript
  id: true, slug: true, name: true, nidn: true, nip: true, email: true, phone: true,
  orcid: true,
  googleScholarUrl: true, sintaUrl: true, scopusUrl: true,
  linkedinUrl: true, instagramUrl: true, twitterUrl: true,
```

and in `Row`:

```typescript
  orcid: string | null;
```

- [ ] **Step 2: Replace the hand-rolled link list with the Task 3 module**

Delete the `researchMediaLinks` array literal at `:194-200` and the now-unused `Globe`, `GraduationCap`, `Linkedin`, `Instagram` imports from the lucide import block (`:1-13`). Keep `BookOpen` — it is still used by the expertise chips. Add:

```typescript
import {researchMediaLinks} from "@/components/public/research-media-icons";
```

and in the component body:

```typescript
  const mediaLinks = researchMediaLinks(lecturer);
```

Update the render block at `:342-360` to iterate `mediaLinks` and use `link.Icon`:

```tsx
{mediaLinks.length > 0 ? (
  <CardField label={t("researchMedia")}>
    <ul className="flex flex-wrap items-center gap-2">
      {mediaLinks.map(({key, href, label, Icon}) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-royal-200 hover:bg-royal-50 hover:text-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
          >
            <Icon className="size-4" />
          </a>
        </li>
      ))}
    </ul>
  </CardField>
) : null}
```

- [ ] **Step 3: Invert the ground/card relationship**

Wrap the page body in a tinted ground. Replace the outer `<Container className="py-12 md:py-20">` (`:261`) with:

```tsx
<div className="bg-slate-50">
  <Container className="py-12 md:py-20">
```

and close the extra `</div>` before the component's final `);`.

Then introduce a section-card helper next to `CardField` (`:159-166`):

```tsx
function SectionCard({id, title, action, children}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-24px_rgba(15,23,42,0.25)] md:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="font-display text-lg font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
```

Wrap **Biography** and **Education** — currently bare (`:426-467`) — in `SectionCard`, and convert the **Publications** section (`:469-523`) to use it, dropping its inner `rounded-2xl border border-slate-200 bg-slate-50/70` wrapper (`:479`) since the card now provides that. Stack the right column's sections with `className="grid gap-8"` on their shared parent instead of the current per-section `mt-12`.

- [ ] **Step 4: Give the identity card the reference's name treatment**

Replace the hero block (`:272-276`) with the three-part presentation. Prefix and suffix are derived from the stored `name` — presentation only, never new columns:

```tsx
{(() => {
  const [base, ...rest] = lecturer.name.split(",");
  const suffix = rest.join(",").trim();
  return (
    <div className="lecturer-hero mb-10 rounded-2xl bg-royal-50 px-6 py-8 md:px-10 md:py-10">
      <h1 className="text-start font-display font-bold tracking-tight text-navy-900">
        <span className="block text-3xl md:text-4xl" dir="auto">{base.trim()}</span>
        {suffix ? <span className="mt-2 block text-base font-medium text-royal-700" dir="auto">{suffix}</span> : null}
      </h1>
      {tl?.position ? <p className="mt-3 text-sm text-royal-800" dir="auto">{tl.position}</p> : null}
    </div>
  );
})()}
```

The left aside's card (`:281`) keeps its existing structure but gains the same elevation as the section cards — replace its `className` with:

```
overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-24px_rgba(15,23,42,0.25)]
```

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev` then open `http://localhost:3004/id/dosen/dr-masykur-m-hum`.

Check, against the Task 2 seed data:
- Every section sits on a visibly distinct white card over a grey ground — no block reads as floating text.
- The identity card shows NIP, program chip, expertise chips, jabatan chip, and a six-icon research media row.
- 15 publications render grouped by type without the page feeling like one undifferentiated column.

Then `http://localhost:3004/ar/dosen/dr-masykur-m-hum` — confirm RTL mirrors correctly and no physical-direction utility leaked in.

- [ ] **Step 6: Run the gate**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/(public)/dosen/[id]/page.tsx"
git commit -m "feat: contain lecturer detail sections in elevated cards over a tinted ground"
```

---

### Task 5: Public teaching filter — academic periods

A course's semester number is not a period identity: 2025/2026 and 2026/2027 both have a "Semester 3". The filter must select `Ganjil 2026/2027`.

**Files:**
- Modify: `src/components/public/lecturer-academic-records.tsx:41-50` (type), `:109-117` (state), `:221-236` (control)
- Modify: `src/app/[locale]/(public)/dosen/[id]/page.tsx:247-258` (record mapping), `:530-554` (labels)
- Modify: `messages/id.json`, `messages/en.json`, `messages/ar.json`
- Test: `tests/m4/runtime/lecturer-teaching-periods.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `LecturerTeachingRecord` gains `academicYearStart: number` and `academicYearEnd: number`; `LecturerAcademicRecordsLabels` gains `allPeriods: string` and `period: string`.

**Do not remove the `allSemesters` message key.** `src/components/public/academic-course-catalog.tsx:17,58` still uses it for the `/akademik/mata-kuliah` catalogue, where a bare semester number *is* the right axis. Only this component stops reading it.

- [ ] **Step 1: Write the failing test**

Create `tests/m4/runtime/lecturer-teaching-periods.test.tsx`:

```typescript
import {describe, expect, it} from "vitest";

import {teachingPeriods} from "@/components/public/lecturer-academic-records";

const labels = {termOdd: "Ganjil", termEven: "Genap"};

describe("teachingPeriods", () => {
  it("labels a period by term and academic year, newest first", () => {
    const periods = teachingPeriods([
      {id: "a", code: "IAT101", course: "A", program: "IAT", credits: 3, academicYearStart: 2025, academicYearEnd: 2026, term: "even", semester: 2},
      {id: "b", code: "IAT201", course: "B", program: "IAT", credits: 3, academicYearStart: 2026, academicYearEnd: 2027, term: "odd", semester: 3},
    ], labels);

    expect(periods).toEqual([
      {key: "2026-odd", label: "Ganjil 2026/2027"},
      {key: "2025-even", label: "Genap 2025/2026"},
    ]);
  });

  it("collapses duplicate periods to one option", () => {
    const periods = teachingPeriods([
      {id: "a", code: "IAT101", course: "A", program: "IAT", credits: 3, academicYearStart: 2026, academicYearEnd: 2027, term: "odd", semester: 1},
      {id: "b", code: "IAT201", course: "B", program: "IAT", credits: 3, academicYearStart: 2026, academicYearEnd: 2027, term: "odd", semester: 3},
    ], labels);

    expect(periods).toEqual([{key: "2026-odd", label: "Ganjil 2026/2027"}]);
  });

  it("distinguishes the same semester number across different academic years", () => {
    const periods = teachingPeriods([
      {id: "a", code: "IAT101", course: "A", program: "IAT", credits: 3, academicYearStart: 2025, academicYearEnd: 2026, term: "odd", semester: 3},
      {id: "b", code: "IAT201", course: "B", program: "IAT", credits: 3, academicYearStart: 2026, academicYearEnd: 2027, term: "odd", semester: 3},
    ], labels);

    expect(periods).toHaveLength(2);
  });

  it("returns no options when there is no teaching", () => {
    expect(teachingPeriods([], labels)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/m4/runtime/lecturer-teaching-periods.test.tsx`
Expected: FAIL — `teachingPeriods` is not exported.

- [ ] **Step 3: Implement the period derivation**

In `src/components/public/lecturer-academic-records.tsx`, extend the record type (`:41-50`):

```typescript
export type LecturerTeachingRecord = {
  id: string;
  code: string;
  course: string;
  program: string;
  credits: number;
  academicYear?: string;
  academicYearStart: number;
  academicYearEnd: number;
  term: "odd" | "even";
  semester: number;
};
```

Add the exported helper above the component:

```typescript
export function teachingPeriods(
  teaching: readonly LecturerTeachingRecord[],
  labels: {termOdd: string; termEven: string},
): ReadonlyArray<{key: string; label: string}> {
  const seen = new Map<string, {key: string; label: string; start: number; term: string}>();
  for (const item of teaching) {
    const key = `${item.academicYearStart}-${item.term}`;
    if (seen.has(key)) continue;
    const termLabel = item.term === "odd" ? labels.termOdd : labels.termEven;
    seen.set(key, {
      key,
      label: `${termLabel} ${item.academicYearStart}/${item.academicYearEnd}`,
      start: item.academicYearStart,
      term: item.term,
    });
  }
  return [...seen.values()]
    .sort((a, b) => b.start - a.start || (a.term === "odd" ? -1 : 1))
    .map(({key, label}) => ({key, label}));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/m4/runtime/lecturer-teaching-periods.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Switch the control over to periods**

Replace the state and filter (`:110-117`):

```typescript
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const periods = useMemo(() => teachingPeriods(teaching, labels), [teaching, labels]);
  const filteredTeaching = selectedPeriod === "all"
    ? teaching
    : teaching.filter((item) => `${item.academicYearStart}-${item.term}` === selectedPeriod);
```

Replace the select block (`:221-236`), swapping the label keys and dropping the numeric coercion:

```tsx
          <div className="mt-6 flex flex-wrap items-center gap-3 border-y border-slate-200 py-3">
            <label htmlFor="lecturer-period" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays aria-hidden className="size-4 text-royal-600" strokeWidth={1.6} />
              {labels.period}
            </label>
            <select
              id="lecturer-period"
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
              disabled={periods.length === 0}
              className="min-h-10 border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-royal-500 focus:ring-2 focus:ring-royal-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="all">{labels.allPeriods}</option>
              {periods.map((period) => <option key={period.key} value={period.key}>{period.label}</option>)}
            </select>
          </div>
```

In `LecturerAcademicRecordsLabels` (`:52-76`), replace `allSemesters` and `semester` with `allPeriods` and `period`. Keep `termOdd` / `termEven` — `teachingPeriods` needs them.

- [ ] **Step 6: Feed the new fields from the page**

In `src/app/[locale]/(public)/dosen/[id]/page.tsx`, the teaching map (`:247-258`) currently collapses the years into a display string and discards them. Keep both:

```typescript
    .map((item) => ({
      id: item.id,
      code: item.courseCode,
      course: item.courseName,
      program: item.programCode,
      credits: item.credits,
      academicYear: `${item.academicYearStart}/${item.academicYearEnd}`,
      academicYearStart: item.academicYearStart,
      academicYearEnd: item.academicYearEnd,
      term: item.term === "GANJIL" ? "odd" as const : "even" as const,
      semester: item.semester,
    }));
```

In the `labels` prop (`:530-554`), replace the two keys:

```typescript
              allPeriods: t("allPeriods"),
              period: t("period"),
```

- [ ] **Step 7: Add the message keys**

Add to the `LecturerProfile` namespace in all three message files, leaving `allSemesters` in place:

`messages/id.json`: `"allPeriods": "Semua periode"`, `"period": "Periode"`
`messages/en.json`: `"allPeriods": "All periods"`, `"period": "Period"`
`messages/ar.json`: `"allPeriods": "جميع الفترات"`, `"period": "الفترة"`

- [ ] **Step 8: Run the gate and confirm the catalogue still works**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all pass.

Then open `http://localhost:3004/id/akademik/mata-kuliah` and confirm its semester filter is untouched — that page still uses `allSemesters` and must keep working.

- [ ] **Step 9: Commit**

```bash
git add src/components/public/lecturer-academic-records.tsx "src/app/[locale]/(public)/dosen/[id]/page.tsx" messages/ tests/m4/runtime/lecturer-teaching-periods.test.tsx
git commit -m "feat: filter lecturer teaching by academic period instead of semester number"
```

---

### Task 6: Admin record table and Sheet primitives

Replaces the "one expanded form card per record" pattern. With 15 seeded publications the current admin editor renders a 15-card stack.

**Files:**
- Create: `src/components/admin/shared/record-table.tsx`
- Create: `src/components/admin/lecturer/lecturer-record-sheet.tsx`
- Test: `tests/m4/runtime/admin-record-table.test.tsx`

**Interfaces:**
- Consumes: `src/components/ui/sheet.tsx` (already installed), `src/components/ui/alert-dialog.tsx` (already installed).
- Produces:
  - `RecordTable<T>(props: {title: string; description?: string; addLabel: string; onAdd: () => void; columns: ReadonlyArray<RecordColumn<T>>; rows: readonly T[]; rowKey: (row: T) => string; emptyLabel: string; renderActions: (row: T) => ReactNode; renderCard: (row: T) => ReactNode})`
  - `RecordColumn<T> = {key: string; label: string; align?: "start" | "end"; render: (row: T) => ReactNode}`
  - `LecturerRecordSheet(props: {open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode})`

**Do not use `src/components/ui/table.tsx`.** It does not exist. `docs/superpowers/specs/2026-08-28-admin-list-table-search-pagination-design.md` plans that shadcn primitive plus a migration of every admin list onto it; introducing it here would front-run that spec and leave two table languages in the tree. `record-table.tsx` matches the markup `src/components/admin/lecturer/lecturer-list.tsx:124-139` already uses.

- [ ] **Step 1: Read the table language being generalized**

Run: `sed -n '91,141p' src/components/admin/lecturer/lecturer-list.tsx`

Note four things the generalization must preserve: the `md:hidden` card list for narrow screens, the `bg-slate-50` `<thead>` with `text-xs uppercase tracking-[0.12em]`, `border-t` row separators with `hover:bg-slate-50/70`, and the dashed-border empty state.

- [ ] **Step 2: Write the failing test**

Create `tests/m4/runtime/admin-record-table.test.tsx`:

```tsx
import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {RecordTable} from "@/components/admin/shared/record-table";

type Row = {id: string; title: string; year: number};

const columns = [
  {key: "title", label: "Judul", render: (row: Row) => row.title},
  {key: "year", label: "Tahun", render: (row: Row) => String(row.year)},
];

function renderTable(rows: readonly Row[], onAdd = vi.fn()) {
  return render(
    <RecordTable
      title="Publikasi"
      addLabel="Tambah publikasi"
      onAdd={onAdd}
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      emptyLabel="Belum ada publikasi."
      renderActions={(row) => <button type="button">Sunting {row.title}</button>}
      renderCard={(row) => <span>{row.title}</span>}
    />,
  );
}

describe("RecordTable", () => {
  it("shows the empty label and no table when there are no rows", () => {
    renderTable([]);
    expect(screen.getByText("Belum ada publikasi.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders one row per record with its columns", () => {
    renderTable([
      {id: "a", title: "Teori Interpretasi Paul Ricoeur", year: 2015},
      {id: "b", title: "The Yahukimo Conflict", year: 2021},
    ]);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("Teori Interpretasi Paul Ricoeur")).toBeInTheDocument();
    expect(screen.getByText("2021")).toBeInTheDocument();
  });

  it("shows the record count in the header", () => {
    renderTable([
      {id: "a", title: "A", year: 2015},
      {id: "b", title: "B", year: 2021},
    ]);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calls onAdd when the add button is pressed", async () => {
    const onAdd = vi.fn();
    renderTable([], onAdd);
    screen.getByRole("button", {name: "Tambah publikasi"}).click();
    expect(onAdd).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/m4/runtime/admin-record-table.test.tsx`
Expected: FAIL — cannot resolve `@/components/admin/shared/record-table`.

- [ ] **Step 4: Implement `RecordTable`**

Create `src/components/admin/shared/record-table.tsx`:

```tsx
"use client";

import {PlusIcon} from "lucide-react";
import type {ReactNode} from "react";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

export type RecordColumn<T> = {
  key: string;
  label: string;
  align?: "start" | "end";
  render: (row: T) => ReactNode;
};

type RecordTableProps<T> = {
  title: string;
  description?: string;
  addLabel: string;
  onAdd: () => void;
  columns: ReadonlyArray<RecordColumn<T>>;
  rows: readonly T[];
  rowKey: (row: T) => string;
  emptyLabel: string;
  renderActions: (row: T) => ReactNode;
  renderCard: (row: T) => ReactNode;
};

export function RecordTable<T>({
  title, description, addLabel, onAdd, columns, rows, rowKey, emptyLabel, renderActions, renderCard,
}: RecordTableProps<T>) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-slate-950">{title}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
              {rows.length}
            </span>
          </div>
          {description ? <p className="mt-1 max-w-prose text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        <Button type="button" size="sm" onClick={onAdd}>
          <PlusIcon data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyLabel}
        </p>
      ) : (
        <>
          <ul className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <li key={rowKey(row)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                {renderCard(row)}
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                  {renderActions(row)}
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className={cn("px-5 py-3", column.align === "end" ? "text-end" : "text-start")}
                      >
                        {column.label}
                      </th>
                    ))}
                    <th scope="col" className="px-5 py-3 text-end">
                      <span className="sr-only">{addLabel}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={rowKey(row)} className="border-t border-slate-200 align-middle transition hover:bg-slate-50/70">
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn("px-5 py-4 text-slate-700", column.align === "end" ? "text-end" : "text-start")}
                        >
                          {column.render(row)}
                        </td>
                      ))}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">{renderActions(row)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/m4/runtime/admin-record-table.test.tsx`
Expected: PASS (4 tests).

If `cn` is not at `@/lib/utils`, run `grep -rn "export function cn" src/` and use the real path.

- [ ] **Step 6: Implement `LecturerRecordSheet`**

Create `src/components/admin/lecturer/lecturer-record-sheet.tsx`. `AGENTS.md` requires an accessible title on every overlay, so `SheetTitle` is mandatory, not optional.

```tsx
"use client";

import type {ReactNode} from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function LecturerRecordSheet({
  open, onOpenChange, title, description, children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="px-4 pb-8">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
```

All five imports are confirmed present in `src/components/ui/sheet.tsx:129-138` (`Sheet`, `SheetTrigger`, `SheetClose`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`) — no substitution needed.

- [ ] **Step 7: Run the gate**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/admin/shared/record-table.tsx src/components/admin/lecturer/lecturer-record-sheet.tsx tests/m4/runtime/admin-record-table.test.tsx
git commit -m "feat: add shared admin record table and lecturer record sheet primitives"
```

---

### Task 7: Six-tab admin editor with four record managers

**Files:**
- Create: `src/components/admin/lecturer/lecturer-manager-copy.ts`
- Create: `src/components/admin/lecturer/education-manager.tsx`
- Create: `src/components/admin/lecturer/publication-manager.tsx`
- Create: `src/components/admin/lecturer/hki-manager.tsx`
- Create: `src/components/admin/lecturer/teaching-manager.tsx`
- Delete: `src/components/admin/lecturer/lecturer-relations-manager.tsx`
- Delete: `src/components/admin/lecturer/lecturer-academic-records-manager.tsx`
- Modify: `src/components/admin/lecturer/lecturer-admin-workspace.tsx`
- Modify: `src/app/[locale]/admin/dosen/[id]/edit/page.tsx:46`

**Interfaces:**
- Consumes: `RecordTable`, `RecordColumn`, `LecturerRecordSheet` from Task 6; the four unchanged server actions from `lecturer-relations-actions.ts` and `lecturer-academic-records-actions.ts`.
- Produces: `LecturerAdminWorkspace(props: {locale: AppLocale; profile: ReactNode; media: ReactNode; education: ReactNode; publication: ReactNode; hki: ReactNode; teaching: ReactNode})`. Task 8 supplies the `media` panel.

- [ ] **Step 1: Extract the shared copy**

The two managers being deleted inline their `id`/`en`/`ar` COPY blocks (`lecturer-relations-manager.tsx:23-36`, `lecturer-academic-records-manager.tsx:25-38`). Move all four subjects' strings verbatim into `src/components/admin/lecturer/lecturer-manager-copy.ts` as one exported `LECTURER_MANAGER_COPY` object keyed `id`/`en`/`ar`, each holding `education`, `publication`, `hki`, `teaching`. Copy the strings exactly — do not retranslate.

Add per-subject `editTitle` strings (the Sheet title when editing an existing row), which the card-stack pattern never needed:

- `id`: `"Sunting pendidikan"`, `"Sunting publikasi"`, `"Sunting HKI"`, `"Sunting mata kuliah"`
- `en`: `"Edit education"`, `"Edit publication"`, `"Edit IP record"`, `"Edit course"`
- `ar`: `"تحرير المؤهل"`, `"تحرير المنشور"`, `"تحرير الملكية الفكرية"`, `"تحرير المقرر"`

- [ ] **Step 2: Build `publication-manager.tsx` first**

Publications are the highest-volume subject (15 seeded rows), so build this one first and use it as the template for the other three.

```tsx
"use client";

import {PencilLineIcon} from "lucide-react";
import {useActionState, useEffect, useState} from "react";

import {LecturerRecordSheet} from "./lecturer-record-sheet";
import {LECTURER_MANAGER_COPY} from "./lecturer-manager-copy";
import {saveAdminPublicationAction, type AdminLecturerRelationFormState} from "./lecturer-relations-actions";
import type {AdminLecturerRelations} from "@/features/academic/lecturer-relations";
import {RecordTable} from "@/components/admin/shared/record-table";
import {Button} from "@/components/ui/button";
import {Field, FieldGroup, FieldLabel} from "@/components/ui/field";
import {Input} from "@/components/ui/input";
import {PortalSubmitButton} from "@/components/portal/portal-form-status";
import type {AppLocale} from "@/i18n/routing";

type Publication = AdminLecturerRelations["publications"][number];

const TYPES = ["JURNAL", "BUKU", "BAB_BUKU", "PROSIDING", "ARTIKEL", "LAINNYA"] as const;

function PublicationForm({
  lecturerId, item, labels, onSaved,
}: {
  lecturerId: string;
  item: Publication | null;
  labels: (typeof LECTURER_MANAGER_COPY)["id"]["publication"];
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveAdminPublicationAction,
    {status: "idle"} satisfies AdminLecturerRelationFormState,
  );
  const key = item?.id ?? "new";

  useEffect(() => {
    if (state.status === "saved") onSaved();
  }, [state.status, onSaved]);

  return (
    <form action={action} className="flex flex-col gap-5 pt-4">
      <input type="hidden" name="lecturerId" value={lecturerId} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`publication-title-${key}`}>{labels.name}</FieldLabel>
          <Input id={`publication-title-${key}`} name="title" required maxLength={500} defaultValue={item?.title ?? ""} dir="auto" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`publication-type-${key}`}>{labels.type}</FieldLabel>
            <select
              id={`publication-type-${key}`}
              name="type"
              defaultValue={item?.type ?? "JURNAL"}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
            >
              {TYPES.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`publication-year-${key}`}>{labels.year}</FieldLabel>
            <Input id={`publication-year-${key}`} name="year" type="number" min={1900} max={2100} defaultValue={item?.year ?? ""} dir="ltr" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`publication-publisher-${key}`}>{labels.publisher}</FieldLabel>
            <Input id={`publication-publisher-${key}`} name="publisher" maxLength={300} defaultValue={item?.publisher ?? ""} dir="auto" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`publication-doi-${key}`}>{labels.doi}</FieldLabel>
            <Input id={`publication-doi-${key}`} name="doi" maxLength={200} defaultValue={item?.doi ?? ""} dir="ltr" />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`publication-url-${key}`}>{labels.url}</FieldLabel>
          <Input id={`publication-url-${key}`} name="url" type="url" maxLength={2048} defaultValue={item?.url ?? ""} dir="ltr" />
        </Field>
      </FieldGroup>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">{labels.error}</p>
      ) : null}
      <div className="flex justify-end">
        <PortalSubmitButton pending={pending} label={item ? labels.save : labels.add} pendingLabel={labels.save} />
      </div>
    </form>
  );
}

export function PublicationManager({
  locale, lecturerId, publications,
}: {
  locale: AppLocale;
  lecturerId: string;
  publications: readonly Publication[];
}) {
  const labels = LECTURER_MANAGER_COPY[locale].publication;
  const [editing, setEditing] = useState<Publication | null | "closed">("closed");

  return (
    <section className="pt-4">
      <RecordTable<Publication>
        title={labels.title}
        description={labels.description}
        addLabel={labels.add}
        onAdd={() => setEditing(null)}
        rows={publications}
        rowKey={(row) => row.id}
        emptyLabel={labels.empty}
        columns={[
          {key: "title", label: labels.name, render: (row) => <span dir="auto" className="font-medium text-slate-900">{row.title}</span>},
          {key: "type", label: labels.type, render: (row) => <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">{row.type.replace("_", " ")}</span>},
          {key: "year", label: labels.year, render: (row) => <span className="font-mono text-xs tabular-nums">{row.year ?? "—"}</span>},
          {key: "publisher", label: labels.publisher, render: (row) => <span dir="auto" className="text-slate-600">{row.publisher ?? "—"}</span>},
        ]}
        renderCard={(row) => (
          <div>
            <p dir="auto" className="font-semibold text-slate-900">{row.title}</p>
            <p className="mt-1 text-xs text-slate-500">{row.type.replace("_", " ")} · {row.year ?? "—"}</p>
          </div>
        )}
        renderActions={(row) => (
          <>
            <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(row)}>
              <PencilLineIcon data-icon="inline-start" />
              {labels.save}
            </Button>
            <DeletePublicationAction lecturerId={lecturerId} item={row} labels={labels} />
          </>
        )}
      />

      <LecturerRecordSheet
        open={editing !== "closed"}
        onOpenChange={(open) => { if (!open) setEditing("closed"); }}
        title={editing && editing !== "closed" ? labels.editTitle : labels.addTitle}
        description={labels.description}
      >
        {editing !== "closed" ? (
          <PublicationForm
            key={editing?.id ?? "new"}
            lecturerId={lecturerId}
            item={editing}
            labels={labels}
            onSaved={() => setEditing("closed")}
          />
        ) : null}
      </LecturerRecordSheet>
    </section>
  );
}
```

Two details that matter:

- The `key={editing?.id ?? "new"}` on `PublicationForm` forces a remount when switching rows. Without it React reuses the instance and `defaultValue` goes stale — the second row you edit would show the first row's data.
- The sheet closes only on `state.status === "saved"`. On error it stays open with the user's input intact, per the spec's error handling.

- [ ] **Step 3: Add the delete confirm**

Still in `publication-manager.tsx`, add above `PublicationManager`. This replaces the current bare delete button — a misclick today destroys a row with no confirmation.

Extend the file's imports first (all confirmed exported at `src/components/ui/alert-dialog.tsx:174-187`):

```tsx
import {PencilLineIcon, Trash2Icon} from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
```

```tsx
function DeletePublicationAction({
  lecturerId, item, labels,
}: {
  lecturerId: string;
  item: Publication;
  labels: (typeof LECTURER_MANAGER_COPY)["id"]["publication"];
}) {
  const [state, action, pending] = useActionState(
    saveAdminPublicationAction,
    {status: "idle"} satisfies AdminLecturerRelationFormState,
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.status === "saved") setOpen(false);
  }, [state.status]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="ghost" size="sm" type="button" />} nativeButton={false}>
        <Trash2Icon data-icon="inline-start" />
        {labels.remove}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.confirmTitle}</AlertDialogTitle>
          <AlertDialogDescription dir="auto">
            {labels.confirmDescription.replace("{title}", item.title)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
          <form action={action}>
            <input type="hidden" name="lecturerId" value={lecturerId} />
            <input type="hidden" name="id" value={item.id} />
            <PortalSubmitButton pending={pending} name="intent" value="delete" label={labels.remove} pendingLabel={labels.remove} />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

Add `confirmTitle`, `confirmDescription` (containing a `{title}` placeholder), and `cancel` to each subject's copy block. Run `sed -n '1,91p' src/components/admin/lecturer/lecturer-delete-action.tsx` first and match that file's `AlertDialog` import list and trigger idiom exactly — it is the proven working shape in this codebase.

- [ ] **Step 4: Build `education-manager.tsx`**

Same three-part file shape as Step 2 — `EducationForm`, `DeleteEducationAction`, `EducationManager` — with `saveAdminEducationAction` imported from `./lecturer-relations-actions` and `type Education = AdminLecturerRelations["educations"][number]`.

The form's `FieldGroup` body, transcribed from `lecturer-relations-manager.tsx:55-61`:

```tsx
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`education-degree-${key}`}>{labels.degree}</FieldLabel>
          <Input id={`education-degree-${key}`} name="degree" required maxLength={100} defaultValue={item?.degree ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`education-field-${key}`}>{labels.field}</FieldLabel>
          <Input id={`education-field-${key}`} name="field" maxLength={200} defaultValue={item?.field ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`education-institution-${key}`}>{labels.institution}</FieldLabel>
          <Input id={`education-institution-${key}`} name="institution" required maxLength={300} defaultValue={item?.institution ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`education-city-${key}`}>{labels.city}</FieldLabel>
          <Input id={`education-city-${key}`} name="city" maxLength={120} defaultValue={item?.city ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`education-year-${key}`}>{labels.year}</FieldLabel>
          <Input id={`education-year-${key}`} name="year" type="number" min={1900} max={2100} defaultValue={item?.year ?? ""} dir="ltr" />
        </Field>
      </FieldGroup>
```

Its `RecordTable` columns:

```tsx
        columns={[
          {key: "degree", label: labels.degree, render: (row) => <span dir="auto" className="font-medium text-slate-900">{row.degree}</span>},
          {key: "field", label: labels.field, render: (row) => <span dir="auto">{row.field ?? "—"}</span>},
          {key: "institution", label: labels.institution, render: (row) => <span dir="auto">{[row.institution, row.city].filter(Boolean).join(", ")}</span>},
          {key: "year", label: labels.year, render: (row) => <span className="font-mono text-xs tabular-nums">{row.year ?? "—"}</span>},
        ]}
```

- [ ] **Step 5: Build `hki-manager.tsx`**

Same shape, with `saveAdminHkiAction` from `./lecturer-academic-records-actions`, `AdminLecturerAcademicFormState` as the state type, and `type Hki = AdminLecturerAcademicRecords["hki"][number]`.

```tsx
const HKI_TYPES = ["PATEN", "HAK_CIPTA", "MEREK", "DESAIN_INDUSTRI", "LAINNYA"] as const;
```

Form body, transcribed from `lecturer-academic-records-manager.tsx:57-63`:

```tsx
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`hki-title-${key}`}>{labels.name}</FieldLabel>
          <Input id={`hki-title-${key}`} name="title" required maxLength={500} defaultValue={item?.title ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`hki-type-${key}`}>{labels.type}</FieldLabel>
          <select
            id={`hki-type-${key}`}
            name="type"
            defaultValue={item?.type ?? "HAK_CIPTA"}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
          >
            {HKI_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`hki-year-${key}`}>{labels.year}</FieldLabel>
          <Input id={`hki-year-${key}`} name="year" type="number" min={1900} max={2100} defaultValue={item?.year ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`hki-registration-${key}`}>{labels.registration}</FieldLabel>
          <Input id={`hki-registration-${key}`} name="registrationNumber" maxLength={191} defaultValue={item?.registrationNumber ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`hki-url-${key}`}>{labels.url}</FieldLabel>
          <Input id={`hki-url-${key}`} name="url" type="url" maxLength={2048} defaultValue={item?.url ?? ""} dir="ltr" />
        </Field>
      </FieldGroup>
```

Columns:

```tsx
        columns={[
          {key: "title", label: labels.name, render: (row) => <span dir="auto" className="font-medium text-slate-900">{row.title}</span>},
          {key: "type", label: labels.type, render: (row) => <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">{row.type.replaceAll("_", " ")}</span>},
          {key: "year", label: labels.year, render: (row) => <span className="font-mono text-xs tabular-nums">{row.year ?? "—"}</span>},
          {key: "registration", label: labels.registration, render: (row) => <span dir="auto">{row.registrationNumber ?? "—"}</span>},
        ]}
```

- [ ] **Step 6: Build `teaching-manager.tsx`**

Same shape, with `saveAdminTeachingAction` and `type Teaching = AdminLecturerAcademicRecords["teaching"][number]`. The program and term option lists move out of `lecturer-academic-records-manager.tsx:95-96` into `lecturer-manager-copy.ts` (they carry locale labels) and are read as `labels.programs` / `labels.terms`.

Form body, transcribed from `lecturer-academic-records-manager.tsx:77-86`:

```tsx
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`teaching-code-${key}`}>{labels.code}</FieldLabel>
          <Input id={`teaching-code-${key}`} name="courseCode" required maxLength={50} defaultValue={item?.courseCode ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-program-${key}`}>{labels.program}</FieldLabel>
          <select
            id={`teaching-program-${key}`}
            name="programCode"
            defaultValue={item?.programCode ?? "IAT"}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
          >
            {labels.programs.map((program) => <option key={program.value} value={program.value}>{program.label}</option>)}
          </select>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`teaching-name-${key}`}>{labels.name}</FieldLabel>
          <Input id={`teaching-name-${key}`} name="courseName" required maxLength={255} defaultValue={item?.courseName ?? ""} dir="auto" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-credits-${key}`}>{labels.credits}</FieldLabel>
          <Input id={`teaching-credits-${key}`} name="credits" type="number" min={0} max={10} defaultValue={item?.credits ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-semester-${key}`}>{labels.semester}</FieldLabel>
          <Input id={`teaching-semester-${key}`} name="semester" type="number" min={1} max={8} defaultValue={item?.semester ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-start-${key}`}>{labels.yearStart}</FieldLabel>
          <Input id={`teaching-start-${key}`} name="academicYearStart" type="number" min={1900} max={2100} defaultValue={item?.academicYearStart ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-end-${key}`}>{labels.yearEnd}</FieldLabel>
          <Input id={`teaching-end-${key}`} name="academicYearEnd" type="number" min={1900} max={2100} defaultValue={item?.academicYearEnd ?? ""} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor={`teaching-term-${key}`}>{labels.term}</FieldLabel>
          <select
            id={`teaching-term-${key}`}
            name="term"
            defaultValue={item?.term ?? "GANJIL"}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/15"
          >
            {labels.terms.map((term) => <option key={term.value} value={term.value}>{term.label}</option>)}
          </select>
        </Field>
      </FieldGroup>
```

Columns — note the academic year and term read as one column, matching how the public table presents them:

```tsx
        columns={[
          {key: "code", label: labels.code, render: (row) => <span className="font-mono text-xs">{row.courseCode}</span>},
          {key: "name", label: labels.name, render: (row) => <span dir="auto" className="font-medium text-slate-900">{row.courseName}</span>},
          {key: "program", label: labels.program, render: (row) => <span className="rounded-full bg-primary/8 px-2.5 py-1 text-xs font-semibold text-primary">{row.programCode}</span>},
          {key: "period", label: labels.term, render: (row) => (
            <span className="font-mono text-xs tabular-nums">
              {labels.terms.find((term) => term.value === row.term)?.label ?? row.term} {row.academicYearStart}/{row.academicYearEnd}
            </span>
          )},
          {key: "credits", label: labels.credits, align: "end" as const, render: (row) => <span className="tabular-nums">{row.credits}</span>},
        ]}
```

- [ ] **Step 7: Rebuild the workspace with six tabs**

Replace `src/components/admin/lecturer/lecturer-admin-workspace.tsx`. Six tabs will not fit a `sm:grid-cols-3` grid, so the strip becomes a scrollable flex row. Six tabs also make the missing keyboard navigation a real accessibility gap, so add roving arrow-key support:

```tsx
"use client";

import {
  AwardIcon, BookOpenIcon, GraduationCapIcon, ImageIcon, LightbulbIcon, UserRoundIcon,
} from "lucide-react";
import {useRef, useState, type ReactNode} from "react";

import {LECTURER_WORKSPACE_COPY} from "./lecturer-manager-copy";
import type {AppLocale} from "@/i18n/routing";

type TabId = "profile" | "education" | "publication" | "hki" | "teaching" | "media";

export function LecturerAdminWorkspace({
  locale, profile, education, publication, hki, teaching, media,
}: {
  locale: AppLocale;
  profile: ReactNode;
  education: ReactNode;
  publication: ReactNode;
  hki: ReactNode;
  teaching: ReactNode;
  media: ReactNode;
}) {
  const t = LECTURER_WORKSPACE_COPY[locale];
  const [active, setActive] = useState<TabId>("profile");
  const stripRef = useRef<HTMLDivElement>(null);

  const tabs = [
    {id: "profile" as const, label: t.profile, icon: UserRoundIcon, content: profile},
    {id: "education" as const, label: t.education, icon: GraduationCapIcon, content: education},
    {id: "publication" as const, label: t.publication, icon: BookOpenIcon, content: publication},
    {id: "hki" as const, label: t.hki, icon: LightbulbIcon, content: hki},
    {id: "teaching" as const, label: t.teaching, icon: AwardIcon, content: teaching},
    {id: "media" as const, label: t.media, icon: ImageIcon, content: media},
  ];

  function onKeyDown(event: React.KeyboardEvent) {
    const order = tabs.map((tab) => tab.id);
    const current = order.indexOf(active);
    const next =
      event.key === "ArrowRight" ? (current + 1) % order.length
      : event.key === "ArrowLeft" ? (current - 1 + order.length) % order.length
      : event.key === "Home" ? 0
      : event.key === "End" ? order.length - 1
      : -1;
    if (next === -1) return;
    event.preventDefault();
    setActive(order[next]);
    stripRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']")[next]?.focus();
  }

  return (
    <div className="mt-8">
      <div
        ref={stripRef}
        role="tablist"
        aria-label={t.label}
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map(({id, label, icon: Icon}) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`lecturer-editor-tab-${id}`}
              aria-selected={selected}
              aria-controls={`lecturer-editor-panel-${id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/70 hover:text-slate-900"}`}
            >
              <Icon aria-hidden className={`size-4 shrink-0 ${selected ? "text-primary" : "text-slate-400"}`} />
              {label}
            </button>
          );
        })}
      </div>
      {tabs.map(({id, content}) => (
        <div
          key={id}
          id={`lecturer-editor-panel-${id}`}
          role="tabpanel"
          aria-labelledby={`lecturer-editor-tab-${id}`}
          hidden={active !== id}
          className="pt-1"
        >
          {content}
        </div>
      ))}
    </div>
  );
}
```

Add `LECTURER_WORKSPACE_COPY` to `lecturer-manager-copy.ts` with `label`, `profile`, `education`, `publication`, `hki`, `teaching`, `media` per locale, reusing the tab strings already in `lecturer-admin-workspace.tsx:15-43` where they carry over.

- [ ] **Step 8: Wire the edit page**

In `src/app/[locale]/admin/dosen/[id]/edit/page.tsx:46`, replace the three-panel `LecturerAdminWorkspace` call with six panels. Swap the two deleted manager imports for the four new ones. The `media` panel is supplied by Task 8 — until then pass `media={null}`:

```tsx
<LecturerAdminWorkspace
  locale={locale as AppLocale}
  profile={<LecturerEditorForm locale={locale as "id" | "en" | "ar"} mode="edit" initialDraft={draft} programs={programs} />}
  education={<EducationManager locale={locale as AppLocale} lecturerId={id} educations={relations.data.educations} />}
  publication={<PublicationManager locale={locale as AppLocale} lecturerId={id} publications={relations.data.publications} />}
  hki={<HkiManager locale={locale as AppLocale} lecturerId={id} hki={academicRecords.data.hki} />}
  teaching={<TeachingManager locale={locale as AppLocale} lecturerId={id} teaching={academicRecords.data.teaching} />}
  media={null}
/>
```

- [ ] **Step 9: Delete the replaced managers**

```bash
git rm src/components/admin/lecturer/lecturer-relations-manager.tsx \
       src/components/admin/lecturer/lecturer-academic-records-manager.tsx
```

Run: `grep -rn "lecturer-relations-manager\|lecturer-academic-records-manager" src/ tests/`
Expected: no matches. Fix any that remain.

- [ ] **Step 10: Verify in the browser**

Run: `npm run dev`, sign in as admin, open `/id/admin/dosen/<masykur-id>/edit` (get the id from the `/id/admin/dosen` list).

Check:
- Six tabs, each with one subject. The strip scrolls horizontally on a narrow window rather than wrapping into a block.
- Arrow keys move between tabs; `Home`/`End` jump to the ends.
- The Publikasi tab shows a 15-row table, not a 15-card stack.
- Editing row 3 then row 7 shows row 7's data — not row 3's (the remount key).
- A failed save leaves the sheet open with input intact.
- Delete asks for confirmation.

- [ ] **Step 11: Run the gate**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all pass. `tests/m4/runtime/admin-lecturer-relations.test.ts` exercises the server actions, which are unchanged — it must still pass untouched. If it fails, an action was modified; revert that.

- [ ] **Step 12: Commit**

```bash
git add src/components/admin/lecturer/ "src/app/[locale]/admin/dosen/[id]/edit/page.tsx"
git commit -m "feat: split the lecturer editor into six single-subject tabs with record tables"
```

---

### Task 8: Media & CV tab

Closes the loop opened in Task 1: the contract accepts `cvMediaId`, and this gives an admin the UI to set it.

**Files:**
- Create: `src/components/admin/lecturer/media-manager.tsx`
- Modify: `src/components/admin/lecturer/lecturer-types.ts`
- Modify: `src/components/admin/lecturer/lecturer-editor-form.tsx:77-81` (payload), `:116` (contact fieldset)
- Modify: `src/app/[locale]/admin/dosen/[id]/edit/page.tsx:45` (draft), `:46` (media panel)

**Interfaces:**
- Consumes: `LecturerInputSchema` shape from Task 1; `LecturerAdminWorkspace` from Task 7.
- Produces: nothing.

- [ ] **Step 1: Extend the draft type**

In `src/components/admin/lecturer/lecturer-types.ts`, add to `LecturerTranslationDraft`:

```typescript
  officeLocation: string;
  quote: string;
```

to `LecturerDraft`:

```typescript
  scopusUrl: string;
  linkedinUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  cvMediaId: string | null;
```

and add matching `""` / `null` defaults to `EMPTY_LECTURER_TRANSLATION` and `emptyLecturerDraft()`. Every field must be present in both, or the controlled inputs become uncontrolled on first render.

- [ ] **Step 2: Send the new fields in the payload**

In `lecturer-editor-form.tsx`, extend the payload object (`:77-81`):

```typescript
    const payload = {
      name: draft.name.trim(), slug: draft.slug.trim(),
      nidn: draft.nidn.trim() || null, nip: draft.nip.trim() || null, orcid: draft.orcid.trim() || null,
      googleScholarUrl: externalUrl(draft.googleScholarUrl),
      sintaUrl: externalUrl(draft.sintaUrl),
      scopusUrl: externalUrl(draft.scopusUrl),
      linkedinUrl: externalUrl(draft.linkedinUrl),
      instagramUrl: externalUrl(draft.instagramUrl),
      twitterUrl: externalUrl(draft.twitterUrl),
      email: draft.email.trim() || null, phone: draft.phone.trim() || null,
      photoMediaId: draft.photoMediaId, cvMediaId: draft.cvMediaId,
      studyProgramId: draft.studyProgramId, order: draft.order, isActive: draft.isActive,
      translations,
    };
```

Add Scopus, LinkedIn, Instagram, and Twitter inputs to the contact `FieldSet` (`:116`), following the existing Google Scholar field's exact markup including its `ExternalLinkIcon` affordance. Add `officeLocation` and `quote` inputs to the public-profile `FieldSet` (`:120`) next to `officeHours`; `quote` is a `Textarea` with `dir="rtl"` and `lang="ar"` when `activeLocale === "ar"`.

Add the corresponding label strings to all three `ui` locale blocks (`:23-25`).

- [ ] **Step 3: Hydrate the draft on the edit page**

In `src/app/[locale]/admin/dosen/[id]/edit/page.tsx:45`, extend the draft construction:

```typescript
  const draft: LecturerDraft = {
    id, name: input.name, slug: input.slug,
    nidn: input.nidn ?? "", nip: input.nip ?? "", orcid: input.orcid ?? "",
    googleScholarUrl: input.googleScholarUrl?.href ?? "",
    sintaUrl: input.sintaUrl?.href ?? "",
    scopusUrl: input.scopusUrl?.href ?? "",
    linkedinUrl: input.linkedinUrl?.href ?? "",
    instagramUrl: input.instagramUrl?.href ?? "",
    twitterUrl: input.twitterUrl?.href ?? "",
    email: input.email ?? "", phone: input.phone ?? "",
    photoMediaId: input.photoMediaId, cvMediaId: input.cvMediaId,
    studyProgramId: input.studyProgramId, order: input.order, isActive: input.isActive,
    translations,
  };
```

and extend the `translations` mapping at `:44` to carry `officeLocation` and `quote` the same way it carries `officeHours`.

- [ ] **Step 4: Study the picker being followed**

Run: `sed -n '1,80p' src/components/admin/posts/post-cover-picker.tsx`

Note how it opens the media picker, what it receives back, and how it reports the selected media id upward. `media-manager.tsx` must follow this shape rather than invent a second picker protocol.

- [ ] **Step 5: Build `media-manager.tsx`**

Two panels — photo (`CMS_IMAGE`) and CV (`PUBLIC_PDF`). `/api/admin/media/upload` already accepts both policies (`src/contracts/media-admin.ts:74,88`), so no API change is needed.

Because photo and CV are part of the `LecturerInputSchema` payload rather than a separate action, this tab cannot submit on its own — it must read and write the *same* draft the Profil tab submits. Lift the `useState<LecturerDraft>` out of `LecturerEditorForm` into a small context so both tabs share one draft:

```tsx
"use client";

import {createContext, useContext} from "react";

import type {LecturerDraft} from "./lecturer-types";

type DraftContext = {
  draft: LecturerDraft;
  setDraft: (update: (current: LecturerDraft) => LecturerDraft) => void;
};

export const LecturerDraftContext = createContext<DraftContext | null>(null);

export function useLecturerDraft() {
  const value = useContext(LecturerDraftContext);
  if (!value) throw new Error("useLecturerDraft must be used inside LecturerDraftContext.");
  return value;
}
```

Put that in `src/components/admin/lecturer/lecturer-draft-context.tsx`, provide it from the workspace, and have `LecturerEditorForm` consume it instead of owning `useState`.

Then the manager itself:

```tsx
"use client";

import {DownloadIcon, FileTextIcon, Trash2Icon} from "lucide-react";
import {useState} from "react";

import {useLecturerDraft} from "./lecturer-draft-context";
import {LECTURER_MEDIA_COPY} from "./lecturer-manager-copy";
import {Button} from "@/components/ui/button";
import {Spinner} from "@/components/ui/spinner";
import type {AppLocale} from "@/i18n/routing";

type CvView = {id: string; originalName: string; url: string} | null;

export function MediaManager({locale, initialCv}: {locale: AppLocale; initialCv: CvView}) {
  const t = LECTURER_MEDIA_COPY[locale];
  const {draft, setDraft} = useLecturerDraft();
  const [cv, setCv] = useState<CvView>(initialCv);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadCv(file: File) {
    if (file.type !== "application/pdf") {
      setError(t.cvTypeError);
      return;
    }
    setPending(true);
    setError(null);
    const body = new FormData();
    body.append("policy", "PUBLIC_PDF");
    body.append("file", file);
    try {
      const response = await fetch("/api/admin/media/upload", {method: "POST", body, credentials: "same-origin"});
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || typeof result !== "object" || result === null || (result as {ok?: unknown}).ok !== true) {
        setError(t.cvUploadError);
        return;
      }
      const media = result as {mediaId: string; url: string; originalName: string};
      setCv({id: media.mediaId, originalName: media.originalName, url: media.url});
      setDraft((current) => ({...current, cvMediaId: media.mediaId}));
    } catch {
      setError(t.cvUploadError);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-6 pt-4 xl:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-display text-lg font-semibold text-slate-950">{t.cvTitle}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{t.cvDescription}</p>

        {cv ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <FileTextIcon aria-hidden className="size-5 shrink-0 text-primary" />
            <span dir="auto" className="min-w-0 flex-1 truncate text-sm text-slate-700">{cv.originalName}</span>
            <Button variant="ghost" size="sm" render={<a href={cv.url} target="_blank" rel="noopener noreferrer" />} nativeButton={false}>
              <DownloadIcon data-icon="inline-start" />
              {t.cvDownload}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => { setCv(null); setDraft((current) => ({...current, cvMediaId: null})); }}
            >
              <Trash2Icon data-icon="inline-start" />
              {t.cvRemove}
            </Button>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {t.cvEmpty}
          </p>
        )}

        <label className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCv(file); }}
          />
          <span className="cursor-pointer rounded-lg border border-primary/30 px-3 py-2 hover:bg-primary/5">
            {pending ? <Spinner data-icon /> : null}
            {cv ? t.cvReplace : t.cvUpload}
          </span>
        </label>

        {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
        <p className="mt-3 text-xs text-slate-500">{t.cvHint}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-display text-lg font-semibold text-slate-950">{t.photoTitle}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">{t.photoDescription}</p>
        {/* Photo picker: mirror src/components/admin/posts/post-cover-picker.tsx, writing
            the chosen id via setDraft((current) => ({...current, photoMediaId: id})). */}
      </div>
    </section>
  );
}
```

Before writing the fetch call, confirm the upload route's actual request and response shape:

Run: `sed -n '1,60p' src/app/api/admin/media/upload/route.ts`

If the field names differ from `policy` / `file` / `mediaId` / `url` / `originalName`, use the route's real names — the shape above is the expected one, not a verified one.

Add `LECTURER_MEDIA_COPY` to `lecturer-manager-copy.ts` with `cvTitle`, `cvDescription`, `cvEmpty`, `cvUpload`, `cvReplace`, `cvRemove`, `cvDownload`, `cvHint`, `cvTypeError`, `cvUploadError`, `photoTitle`, `photoDescription` per locale.

The save button must be reachable from this tab — a user who only changes the CV still needs to submit. Either render it in the workspace shell outside the panels, or repeat it here bound to the shared draft.

- [ ] **Step 6: Wire the panel**

Replace `media={null}` from Task 7 Step 6 with the real `<MediaManager ... />`.

- [ ] **Step 7: Verify the round trip**

Run `npm run dev`, open the Media & CV tab for Dr. Masykur:
- Upload a PDF → save → reload the page → the CV filename persists.
- Open `/id/dosen/dr-masykur-m-hum` → the "Unduh CV" button appears in the identity card and downloads the file.
- Remove the CV → save → reload → the button is gone from the public page.
- Attempt to upload a non-PDF as the CV → rejected. Confirm the server rejects it too, not just the client: the `validateCertificate` guard from Task 1 is the real boundary.

- [ ] **Step 8: Run the gate**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: all pass, zero warnings. `npm run build` is included here because this is the last task that changes application code — Tasks 9 and 10 add tests and the handoff only.

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/lecturer/ "src/app/[locale]/admin/dosen/[id]/edit/page.tsx"
git commit -m "feat: add the lecturer media and CV tab"
```

---

### Task 9: Accessibility and RTL end-to-end coverage

Spec §8 requires an axe pass on the rebuilt public page and the six-tab editor. `@axe-core/playwright` is already a dependency (`package.json:74`) and `e2e/m4/page-admin.spec.ts:1-5` establishes the idiom — this task applies it to the two surfaces this branch rebuilt.

**Files:**
- Create: `e2e/m5/lecturer-profile.spec.ts`

**Interfaces:**
- Consumes: the seeded `dr-masykur-m-hum` lecturer from Task 2; the rebuilt page from Task 4; the period filter from Task 5.
- Produces: nothing.

- [ ] **Step 1: Write the spec**

Create `e2e/m5/lecturer-profile.spec.ts`:

```typescript
import AxeBuilder from "@axe-core/playwright";
import {expect, test} from "@playwright/test";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

test.describe("M5 lecturer profile — public detail", () => {
  test("has no accessibility violations", async ({page}) => {
    await page.goto("/id/dosen/dr-masykur-m-hum");
    await expect(page.locator("h1")).toContainText("Masykur");
    const results = await new AxeBuilder({page}).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test("labels the teaching filter by academic period, not semester number", async ({page}) => {
    await page.goto("/id/dosen/dr-masykur-m-hum");
    const filter = page.locator("#lecturer-period");
    await expect(filter).toBeVisible();
    await expect(filter).toBeEnabled();
    const options = await filter.locator("option").allInnerTexts();
    const periods = options.slice(1);
    expect(periods.length).toBeGreaterThanOrEqual(3);
    for (const option of periods) {
      expect(option).toMatch(/^(Ganjil|Genap) \d{4}\/\d{4}$/u);
    }
    expect(periods).not.toContain("Semester 3");
  });

  test("filtering by period narrows the course table", async ({page}) => {
    await page.goto("/id/dosen/dr-masykur-m-hum");
    const rows = page.locator("#lecturer-teaching tbody tr");
    await expect(rows).toHaveCount(4);
    await page.locator("#lecturer-period").selectOption({label: "Ganjil 2026/2027"});
    await expect(rows).toHaveCount(2);
  });

  test("renders Arabic RTL without leaking physical direction", async ({page}) => {
    await page.goto("/ar/dosen/dr-masykur-m-hum");
    const html = page.locator("html").first();
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");
    const results = await new AxeBuilder({page}).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test("exposes each research media link with an accessible name", async ({page}) => {
    await page.goto("/id/dosen/dr-masykur-m-hum");
    for (const label of ["Google Scholar", "Scopus", "SINTA"]) {
      await expect(page.getByRole("link", {name: label})).toBeVisible();
    }
  });
});
```

- [ ] **Step 2: Run it**

Run: `npx playwright test e2e/m5/lecturer-profile.spec.ts --project=chromium`
Expected: 5 passing.

Every violation axe reports is a real defect introduced by Tasks 4–5 — fix the markup, never relax `AXE_TAGS` or filter the violation list to make the test green.

- [ ] **Step 3: Run the mobile project too**

Run: `npx playwright test e2e/m5/lecturer-profile.spec.ts --project=mobile`
Expected: 5 passing. This is what catches the sticky identity card and the card-list fallback breaking at 390px.

- [ ] **Step 4: Commit**

```bash
git add e2e/m5/lecturer-profile.spec.ts
git commit -m "test: cover lecturer profile accessibility, periods, and RTL end to end"
```

---

### Task 10: Handoff

`AGENTS.md`: "A task is not done without its committed handoff."

**Files:**
- Create: `coordination/handoffs/M5-LECTURER-PROFILE-claude.md`

- [ ] **Step 1: Read the template**

Run: `cat coordination/tasks/TEMPLATE.md && ls coordination/handoffs/ | head -5`

Match the existing handoff shape.

- [ ] **Step 2: Write the handoff**

Must contain: task ID, branch `ai/claude/m5-lecturer-profile-redesign`, base SHA `8a7bbf08c272ba8fbdb88df6c6225f5abc827c9e`, head SHA, summary, files changed, API/schema/migration impact (**no migration; contract change only**), the exact commands run and their results, untested areas, risks, and follow-ups.

Under "requested contract/dependency change", record explicitly: `LecturerInputSchema` and `PersonTranslationInputSchema` were extended in the Claude lane, which `AGENTS.md` assigns to GPT. The product owner was shown the conflict and directed this session to proceed. The change is additive and nullable; no existing caller breaks.

Carry forward the four follow-ups from spec §9: table-primitive convergence when the 2026-08-28 spec lands, uploading Dr. Masykur's real CV, unifying the lecturer-portal and admin write paths, and a publication reorder affordance.

- [ ] **Step 3: Commit**

```bash
git add coordination/handoffs/M5-LECTURER-PROFILE-claude.md
git commit -m "docs: close the lecturer profile redesign handoff"
```

---

## Notes for the executor

**Task order matters.** Task 1 must land before Tasks 7–8 (they build payloads against the extended contract). Task 2 should land early — Tasks 4, 7, and 9 all depend on the seeded `dr-masykur-m-hum` record, and stub data hides the exact density problems this work exists to fix. Task 3 must precede Task 4. Task 6 must precede Task 7. Task 9 needs Tasks 2, 4, and 5 in place.

**Three things that look like bugs but are not:**
- `academicYear` stays on `LecturerTeachingRecord` as an optional display string even after Task 5 adds the numeric fields — the table column still renders it.
- `allSemesters` stays in the message files after Task 5 — the course catalogue still uses it.
- The four record server actions are never modified. If a task seems to require changing one, re-read the Global Constraints.
