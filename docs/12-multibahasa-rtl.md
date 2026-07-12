# 12 — Multibahasa (ID / EN / AR) & Dukungan RTL

> **Dokumen ini MENGIKAT dan menimpa keputusan sebelumnya.** Website wajib mendukung **tiga bahasa**: Indonesia (`id`, default), English (`en`), dan Arabic (`ar`) — dengan **dukungan RTL penuh** untuk Arabic. Ini memengaruhi routing (`01`), skema (`02`), design system (`03`), admin (`04`), dan halaman publik (`05`). Baca dokumen ini sebelum menulis kode apa pun.

---

## A. Prinsip & keputusan arsitektur

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Routing | **Sub-path**: `/id/...`, `/en/...`, `/ar/...` | Ramah SEO, mudah di-hreflang, tanpa domain tambahan |
| Bahasa default | `id` | Audiens utama Indonesia |
| Fallback konten | `id` | Bila terjemahan belum ada, tampilkan versi Indonesia + label "Belum tersedia dalam bahasa ini" |
| String UI (label tombol, menu, dsb.) | **File kamus JSON** | Statis, tak perlu database |
| Konten (berita, halaman, dosen…) | **Tabel terjemahan di database** | Dikelola admin lewat CMS |
| Library i18n | `next-intl` | Dukungan App Router & Server Components matang |
| Arah teks | `dir="rtl"` otomatis untuk `ar` | Wajib |

**Dua lapisan terjemahan — jangan dicampur:**
1. **String antarmuka** (mis. "Baca Selengkapnya", "Beranda", "Cari") → file `messages/id.json`, `messages/en.json`, `messages/ar.json`. Diubah oleh developer.
2. **Konten** (judul berita, isi halaman, bio dosen) → tabel terjemahan di database. Diubah oleh admin lewat panel.

---

## B. Routing & konfigurasi

### Struktur folder (mengubah `01`)
```
src/app/
├── [locale]/                 ← semua rute publik & admin masuk sini
│   ├── layout.tsx            ← set <html lang dir>, muat messages
│   ├── (public)/
│   │   ├── page.tsx          ← beranda
│   │   ├── berita/...
│   │   └── ...
│   ├── admin/...
│   └── login/page.tsx
├── api/...                   ← TIDAK di-locale
└── layout.tsx (root minimal)
```

### Setup `next-intl`
```bash
npm i next-intl
```

`src/i18n/routing.ts`:
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["id", "en", "ar"],
  defaultLocale: "id",
  localePrefix: "always",       // /id/... eksplisit, konsisten
});

export const LOCALES = ["id", "en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

// Arah teks per bahasa
export const DIRECTION: Record<Locale, "ltr" | "rtl"> = {
  id: "ltr",
  en: "ltr",
  ar: "rtl",
};
```

### Root layout locale (`app/[locale]/layout.tsx`)
```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { DIRECTION, LOCALES, type Locale } from "@/i18n/routing";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!LOCALES.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = DIRECTION[locale as Locale];

  return (
    <html lang={locale} dir={dir}>
      <body className={dir === "rtl" ? "font-arabic-ui" : "font-body"}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**Penting:** `dir` di-set pada `<html>` — bukan hanya pada div — agar seluruh dokumen (termasuk scrollbar, form, dialog) ikut RTL.

### Proxy (Next 16 — dulu `middleware.ts`)
Gabungkan proxy `next-intl` dengan proteksi auth dari `06` di **`src/proxy.ts`**. Urutan: jalankan i18n dulu (deteksi/redirect locale), lalu cek auth pada rute `/[locale]/admin/*`. Matcher harus mencakup `/((?!api|_next|uploads|.*\\..*).*)` — **kecualikan `/uploads`** agar file media tidak kena redirect locale. Ingat peringatan keamanan di `06`: proxy hanya untuk redirect, **bukan** lapisan otorisasi.

---

## C. Skema database — tabel terjemahan (mengubah `02`)

Pola: model induk menyimpan field **netral bahasa** (slug, tanggal, gambar, angka, relasi). Field **teks** dipindah ke tabel `*Translation` dengan kunci `(parentId, locale)`.

### Enum locale
```prisma
enum Locale {
  id
  en
  ar
}
```

### Contoh: Post
```prisma
model Post {
  id          String      @id @default(cuid())
  type        PostType    @default(BERITA)
  columnType  ColumnType?
  slug        String      @unique          // slug netral (dari judul ID)
  coverImage  String?
  status      PostStatus  @default(DRAFT)
  isFeatured  Boolean     @default(false)
  viewCount   Int         @default(0)
  publishedAt DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  categoryId  String?
  category    Category?   @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  authorId    String?
  author      User?       @relation(fields: [authorId], references: [id], onDelete: SetNull)
  tags        Tag[]       @relation("PostTags")

  translations PostTranslation[]

  @@index([type, status, publishedAt])
  @@index([slug])
}

model PostTranslation {
  id       String @id @default(cuid())
  locale   Locale
  title    String @db.VarChar(255)
  excerpt  String? @db.VarChar(500)
  content  String @db.LongText
  metaTitle String?
  metaDesc  String? @db.VarChar(500)

  postId   String
  post     Post   @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([postId, locale])
  @@index([locale])
}
```

### Model yang WAJIB punya tabel terjemahan
Terapkan pola identik (field teks → `*Translation`, sisanya tetap di induk):

| Model induk | Field yang diterjemahkan |
|---|---|
| `Post` | title, excerpt, content, metaTitle, metaDesc |
| `Page` | title, content, metaTitle, metaDesc |
| `StudyProgram` | name, description |
| `Lecturer` | position, expertise, bio, officeHours |
| `Staff` | position, unit |
| `Category` | name |
| `Tag` | name |
| `Unit` | name, description |
| `Service` | name, description |
| `Partnership` | category, description |
| `Scholarship` | title, provider, description |
| `Achievement` | title, description |
| `StudentActivity` | title, description |
| `Album` | title, description |
| `Event` | title, description, location |
| `Document` | title, category |
| `Research` / `CommunityService` | title, abstract/description |
| `MenuItem` | label |
| `QuickLink` | label |
| `ExternalLink` | label |
| `HomeSlider` | title, subtitle, ctaLabel |
| `SiteSetting` | facultyName, tagline, address1, address2, deanMessage, videoTitle, videoDesc |
| `Room` | name, location, facilities |
| `Faq` | category, question, answer |
| `Testimonial` | currentRole, quote |
| `Statistic` | label |
| `HomeSection` | title, subtitle, ctaLabel |

**Field yang TIDAK diterjemahkan** (tetap di induk): slug, semua gambar/file, tanggal, angka/statistik, email, telepon, URL, kode prodi, NIP, nama orang (nama dosen/mahasiswa tetap sama), logo, urutan, status, relasi.

Daftar field dan nama foreign key yang lengkap berada di kontrak final `02-A`; daftar di dokumen ini tidak boleh diperluas atau dikurangi saat implementasi.

> **Catatan nama orang:** nama dosen umumnya sama lintas bahasa, jadi `Lecturer.name` tetap di induk. Namun `position` ("Dekan" / "Dean" / "عميد") dan `bio` diterjemahkan.

### Query dengan fallback
Buat helper di `lib/queries/`:
```ts
// Ambil terjemahan sesuai locale, fallback ke "id" bila belum ada.
export function pickTranslation<T extends { locale: string }>(
  translations: T[],
  locale: string,
): { data: T; isFallback: boolean } | null {
  const exact = translations.find((t) => t.locale === locale);
  if (exact) return { data: exact, isFallback: false };
  const fallback = translations.find((t) => t.locale === "id");
  return fallback ? { data: fallback, isFallback: true } : null;
}
```
Bila `isFallback`, tampilkan banner halus: "Konten ini belum tersedia dalam bahasa yang dipilih; menampilkan versi Bahasa Indonesia."

### Slug & URL
Gunakan **satu slug netral** (dibuat dari judul Indonesia) untuk semua bahasa: `/en/berita/workshop-kurikulum`. Ini menyederhanakan routing dan menjaga tautan tidak pecah. (Slug per bahasa boleh ditambah kelak, tapi **jangan** sekarang.)

### Migrasi
Karena skema berubah signifikan, buat migrasi baru dari awal (proyek belum rilis). Seed harus mengisi minimal terjemahan `id` untuk setiap konten awal.

---

## D. Panel admin — editor multibahasa (mengubah `04`)

Setiap form konten yang punya field teks harus punya **tab bahasa** di atas form:

```
[ Indonesia ]  [ English ]  [ العربية ]
```

**Perilaku:**
- Tab `Indonesia` **wajib diisi** (bahasa dasar & fallback). Tab lain opsional.
- Field netral bahasa (gambar, tanggal, kategori, status, slug) tampil **sekali saja di luar tab** — jangan diduplikasi per bahasa.
- Field teks (judul, ringkasan, isi, meta) berganti isi mengikuti tab aktif.
- Tab yang **belum ada terjemahannya** diberi penanda (mis. titik abu-abu); yang sudah terisi diberi centang. Ini penting agar admin tahu apa yang belum diterjemahkan.
- Tab **العربية**: editor otomatis `dir="rtl"` dan memakai font Arab — mengetik Arab harus terasa alami.
- Simpan: satu server action menulis induk + semua `*Translation` yang terisi dalam **satu transaksi** (`prisma.$transaction`).

**Tabel daftar admin** menampilkan judul dari terjemahan `id`, ditambah kolom kecil **"Terjemahan"** berisi badge `ID` `EN` `AR` (yang sudah ada berwarna, yang belum abu-abu). Sediakan filter "Belum diterjemahkan ke EN/AR" agar mudah menyisir.

**Menu, QuickLink, ExternalLink, SiteSetting** juga punya tab bahasa yang sama untuk field labelnya.

---

## E. Dukungan RTL (WAJIB — memperluas `03`)

RTL bukan sekadar membalik teks; seluruh tata letak harus dicerminkan. Ini aturan mengikat.

### 1. Gunakan CSS logical properties — JANGAN physical
Ini kunci agar satu kode melayani LTR & RTL tanpa duplikasi. Ganti seluruh utilitas arah:

| ❌ Jangan pakai | ✅ Pakai |
|---|---|
| `ml-4` / `mr-4` | `ms-4` / `me-4` |
| `pl-6` / `pr-6` | `ps-6` / `pe-6` |
| `text-left` / `text-right` | `text-start` / `text-end` |
| `left-0` / `right-0` | `start-0` / `end-0` |
| `border-l` / `border-r` | `border-s` / `border-e` |
| `rounded-l-lg` | `rounded-s-lg` |
| `float: left` | `float: inline-start` |

Tailwind mendukung `ms/me/ps/pe/start/end` secara native. **Agen: jangan pernah menulis `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right` di komponen.** Kecuali untuk hal yang memang tidak boleh dicerminkan (lihat poin 4).

### 2. Ikon & elemen arah
- Panah "berikutnya/kembali", breadcrumb, dan tombol carousel **harus dicerminkan** di RTL. Terapkan `rtl:rotate-180` (varian Tailwind) atau pilih ikon berdasar `dir`.
- Ikon non-arah (kalender, unduh, cari, media sosial) **tidak** dicerminkan.

### 3. Komponen yang butuh perhatian khusus
- **Sidebar admin** — di RTL pindah ke kanan (pakai `start-0`, otomatis). Indikator item aktif (garis 3px) juga di sisi `start`.
- **Marquee logo kerjasama** (`09-D`) — arah gerak dibalik di RTL (kanan→kiri jadi kiri→kanan). Tentukan arah animasi berdasar `dir`.
- **Gambar dalam artikel dengan posisi kiri/kanan** (`09-A`) — atribut `data-align="left"/"right"` harus dipetakan ke **inline-start / inline-end**, sehingga "rata kiri" di teks Arab menjadi rata kanan secara visual. Simpan sebagai `start`/`end` di data, bukan `left`/`right`, agar semantiknya benar lintas arah. (Untuk konten lama yang sudah tersimpan `left`/`right`, petakan saat render.)
- **Slider/carousel** — arah geser dibalik.
- **Dropdown & drawer** — buka dari sisi yang benar (gunakan properti logical, jangan hard-code).
- **Tabel** — kolom mengalir dari kanan di RTL secara otomatis bila `dir` benar. Jangan paksa arah.
- **PdfViewer** — PDF tetap ditampilkan apa adanya (jangan dicerminkan); hanya kontrol di sekitarnya yang mengikuti RTL.
- **Angka & tanggal** — gunakan `Intl.NumberFormat` / `Intl.DateTimeFormat` dengan locale aktif. Angka tetap ditulis kiri-ke-kanan di dalam kalimat RTL (perilaku bawaan browser — jangan diakali).

### 4. Yang TIDAK dicerminkan
Logo, foto, video, PDF, kode/`<code>`, dan grafik data. Jangan flip gambar.

### 5. Tipografi Arab (memperluas `03`)
- **UI & body Arab:** gunakan **IBM Plex Sans Arabic** atau **Noto Sans Arabic** (bukan Inter — Inter tidak punya glyph Arab yang layak). Muat via `next/font/google`, ekspos sebagai `--font-arabic-ui`.
- **Kutipan ayat / teks Qur'an:** tetap **Amiri** (`--font-arabic`), seperti di `03`.
- **Line-height Arab lebih longgar** (diakritik butuh ruang): naikkan `line-height` ~1.8 untuk body Arab.
- Ukuran font Arab cenderung terlihat lebih kecil pada ukuran px yang sama — naikkan ~1 langkah untuk body Arab.
- Terapkan otomatis: `html[dir="rtl"]` memakai stack font Arab.

### 6. Verifikasi RTL (wajib sebelum selesai)
Buka setiap halaman dalam bahasa Arab dan pastikan: tidak ada teks/ikon yang salah arah, tidak ada elemen menempel di sisi keliru, tidak ada horizontal scroll, panah menghadap benar, sidebar admin di kanan, dan form terasa alami. Uji juga pada lebar 360px (RTL + mobile sekaligus).

---

## F. Language switcher (memperluas `05`)

- Letak: pojok kanan atas (topbar). Di RTL otomatis pindah ke kiri.
- Tampilan: dropdown ringkas — `ID` · `EN` · `AR` (atau "Indonesia / English / العربية").
- Perilaku: berpindah bahasa **mempertahankan halaman yang sedang dibuka** (mis. `/id/berita/slug` → `/ar/berita/slug`), bukan melempar ke beranda.
- Simpan preferensi di cookie (`NEXT_LOCALE`) agar kunjungan berikutnya konsisten.
- Di mobile, switcher masuk ke dalam drawer menu.

---

## G. SEO multibahasa (memperluas `05`)

- **hreflang** — setiap halaman menyertakan tautan alternatif ketiga bahasa + `x-default` (arahkan ke `id`). Gunakan `alternates.languages` di `generateMetadata()`.
- **sitemap.xml** — sertakan ketiga varian locale tiap URL.
- **`lang` & `dir`** benar di `<html>` (sudah di B).
- Metadata (title/description) diambil dari terjemahan aktif, fallback ke `id`.
- Konten yang belum diterjemahkan tetap dapat diindeks lewat versi fallback — jangan `noindex`.

---

## H. Dampak ke dokumen lain (ringkas untuk agen)

| Dokumen | Yang berubah |
|---|---|
| `01` | Semua rute pindah ke `app/[locale]/...`; tambah `next-intl`; middleware digabung dengan i18n; kecualikan `/uploads` dari matcher |
| `02` | Tambah `enum Locale` + tabel `*Translation` untuk model di daftar C; field teks pindah dari induk ke tabel terjemahan |
| `03` | Wajib logical properties (`ms/me/ps/pe/start/end`); font Arab UI; line-height Arab; aturan RTL |
| `04` | Semua form konten memakai **tab bahasa**; tabel daftar menampilkan status terjemahan |
| `05` | Tambah language switcher; hreflang; semua URL ber-prefix locale |
| `09` | Posisi gambar disimpan sebagai `start`/`end`, bukan `left`/`right`; marquee arahnya mengikuti `dir` |
| `11` | Keputusan "Indonesia saja" DIBATALKAN |

## I. Urutan pengerjaan yang disarankan (revisi)

1. Setup Next.js + `next-intl` + routing `[locale]` **sejak awal** (jangan ditambahkan belakangan — memindahkan rute setelah jadi itu mahal).
2. Prisma + skema dengan tabel terjemahan.
3. Design system dengan logical properties + font Arab **sejak awal** (mengganti `ml-`→`ms-` belakangan sangat melelahkan).
4. Auth + admin dengan tab bahasa.
5. Halaman publik + switcher + hreflang.
6. Uji RTL menyeluruh, lalu deploy.
