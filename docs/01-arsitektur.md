# 01 — Arsitektur & Struktur Folder

> **⚠️ VERSI: Next.js 16 (bukan 15).** Next.js 16 adalah major stabil sejak Oktober 2025; per pertengahan 2026 versi stabil adalah 16.2.x. Perbedaan penting yang WAJIB dipatuhi agen:
> - **Turbopack** adalah bundler default (dev & build). Jangan tambahkan konfigurasi webpack kustom.
> - **`middleware.ts` DIGANTI menjadi `proxy.ts`** (di root `src/`). Lihat `06`.
> - **Async params**: `params` dan `searchParams` adalah Promise — wajib `await`.
> - **Node.js ≥ 20.9** (disarankan Node 22 LTS). Next 16 menolak jalan di Node 18.
> - **Caching bersifat opt-in** (Cache Components / `use cache`). Kode dinamis dieksekusi saat request secara default.
> - Prop `next/image` yang dihapus: `priority`, `onLoadingComplete`, `lazyBoundary`, `lazyRoot`. Jangan dipakai.
> - `next lint` dihapus — pakai ESLint langsung.
> - Saat implementasi, verifikasi versi terbaru: `npm show next version`. Bila ada major baru, gunakan codemod resmi `npx @next/codemod@latest upgrade`.

## Prinsip arsitektur

- **Satu aplikasi Next.js** yang melayani dua dunia: rute publik (`/`) dan panel admin (`/admin`). Keduanya berbagi database, komponen UI, dan design system yang sama.
- **Server Components sebagai default.** Gunakan Client Components (`"use client"`) hanya untuk bagian interaktif (form, editor, tabel dengan sorting, dropdown).
- **Akses data lewat lapisan `lib/` (server-only).** Rute publik membaca langsung via Prisma di Server Component. Panel admin menulis via Server Actions. Jangan membuat REST API kecuali benar-benar dibutuhkan (mis. upload).
- **Validasi di dua tempat:** Zod di client (UX) dan di server action (keamanan). Skema Zod ditulis sekali di `lib/validations/` dan dipakai ulang.

## Struktur folder

```
fuspi-web/
├── prisma/
│   ├── schema.prisma            # skema database (lihat 02)
│   └── seed.ts                  # data awal: admin default, prodi, pengaturan
├── public/                      # aset statis yang di-commit (logo, favicon) — BUKAN untuk upload user
├── src/
│   ├── app/
│   │   ├── (public)/            # route group situs publik
│   │   │   ├── layout.tsx       # Navbar + Footer publik
│   │   │   ├── page.tsx         # Beranda
│   │   │   ├── berita/
│   │   │   │   ├── page.tsx      # daftar berita (paginasi)
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── pengumuman/
│   │   │   ├── kolom/
│   │   │   ├── halaman/[slug]/page.tsx   # halaman statis dinamis
│   │   │   ├── dosen/
│   │   │   ├── program-studi/
│   │   │   ├── penelitian/
│   │   │   ├── kerjasama/
│   │   │   └── ...
│   │   ├── admin/               # panel admin (dilindungi middleware)
│   │   │   ├── layout.tsx       # Sidebar + Topbar admin
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── berita/
│   │   │   │   ├── page.tsx      # tabel daftar
│   │   │   │   ├── baru/page.tsx
│   │   │   │   └── [id]/page.tsx # edit
│   │   │   ├── halaman/
│   │   │   ├── dosen/
│   │   │   ├── media/           # media library
│   │   │   ├── pengguna/        # ADMIN saja
│   │   │   └── pengaturan/      # ADMIN saja
│   │   ├── login/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   └── upload/route.ts  # endpoint upload (lihat 07)
│   │   ├── layout.tsx           # root minimal; html lang/dir ada di [locale]/layout
│   │   └── globals.css          # token CSS + Tailwind
│   ├── actions/                 # Server Actions per modul
│   │   ├── post.ts
│   │   ├── page.ts
│   │   ├── lecturer.ts
│   │   └── ...
│   ├── components/
│   │   ├── ui/                  # komponen shadcn (button, input, dialog, ...)
│   │   ├── admin/               # komponen khusus admin (DataTable, FormField, RichEditor)
│   │   ├── public/              # komponen situs publik (Hero, NewsCard, SectionHeading)
│   │   └── shared/
│   ├── lib/
│   │   ├── prisma.ts            # singleton PrismaClient
│   │   ├── auth.ts              # config Auth.js v5
│   │   ├── queries/             # fungsi baca data (server-only)
│   │   ├── validations/         # skema Zod
│   │   ├── upload.ts            # helper simpan/hapus file
│   │   └── utils.ts             # cn(), formatTanggal(), slugify()
│   ├── config/
│   │   ├── nav-public.ts        # struktur menu publik (lihat 05)
│   │   └── nav-admin.ts         # struktur sidebar admin
│   └── middleware/  (TIDAK ADA — lihat proxy.ts)
│   └── proxy.ts                 # Next 16: pengganti middleware.ts — proteksi /admin + i18n
├── .env                        # variabel lokal (JANGAN commit)
├── .env.example                # template variabel
├── next.config.ts
├── tailwind.config.ts
├── components.json             # config shadcn
└── package.json
```

## Konvensi kode

- **Bahasa UI:** Indonesia. **Bahasa kode (variabel, fungsi, model):** Inggris. Rute publik pakai bahasa Indonesia (`/berita`, `/program-studi`) agar SEO & keterbacaan bagus.
- **Penamaan file:** `kebab-case` untuk file & folder rute; `PascalCase` untuk komponen.
- **Slug** dibuat otomatis dari judul dengan `slugify()`, bisa diedit manual, dan wajib unik per model.
- **Tanggal** disimpan sebagai `DateTime` UTC, ditampilkan dalam zona `Asia/Jakarta` lewat helper `formatTanggal()` (format: `8 Juli 2026`).
- **Semua mutasi data** lewat Server Action yang: (1) cek sesi & role, (2) validasi Zod, (3) tulis Prisma, (4) `revalidatePath()` halaman terkait.

## Prisma client singleton (`src/lib/db/client.ts`)

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { parseDatabaseUrl } from "@/lib/db/config";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg(parseDatabaseUrl(process.env.DATABASE_URL!));
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

## Environment variables (`.env.example`)

```bash
# PostgreSQL. Remote/staging/production wajib TLS; lihat 08.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/NAMA_DB?connection_limit=10&sslmode=verify-full"

# Auth.js v5
AUTH_SECRET="ganti-dengan-string-acak-panjang"   # generate: openssl rand -base64 32
AUTH_URL="https://fuspi.uinbanten.ac.id"

# Upload — direktori penyimpanan persisten & URL publiknya (lihat 07)
UPLOAD_DIR="/srv/fuspi/shared/public/uploads"
UPLOAD_PUBLIC_URL="https://fuspi.uinbanten.ac.id/uploads"

# Batas ukuran upload (byte) — default 5MB
UPLOAD_MAX_SIZE="5242880"

# Storage privat — WAJIB berada di luar document root reverse proxy
UPLOAD_PRIVATE_DIR="/srv/fuspi/shared/private/uploads"
PPKS_PRIVATE_DIR="/srv/fuspi/shared/ppks"
PPKS_ENCRYPTION_KEY="base64-encoded-32-byte-key"

# SMTP + transactional outbox; provider ditentukan saat provisioning VPS
SMTP_HOST="smtp.example.edu"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="noreply@fuspi.uinbanten.ac.id"
SMTP_PASSWORD="ganti-di-secret-manager"
MAIL_FROM="FUSPI UIN Banten <noreply@fuspi.uinbanten.ac.id>"

# HMAC untuk token/IP hash; berbeda dari AUTH_SECRET
TOKEN_HMAC_SECRET="ganti-dengan-string-acak-panjang-yang-berbeda"
IP_HASH_SECRET="ganti-dengan-string-acak-panjang-yang-berbeda"

# Seed; password tidak pernah ditulis di source
SEED_ADMIN_EMAIL="admin@fuspi.uinbanten.ac.id"
SEED_ADMIN_PASSWORD="ganti-sebelum-seed"
```

## next.config.ts

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",          // artifact ringkas untuk deploy VPS/container
  images: {
    // gambar upload disajikan sebagai file statis dari domain sendiri
    remotePatterns: [
      { protocol: "https", hostname: "fuspi.uinbanten.ac.id" },
    ],
  },
  // Turbopack default di Next 16 — jangan tambahkan config webpack kustom.
  // Security headers: lihat 13-J
};

export default nextConfig;
```

## Dependensi utama

```bash
# Pastikan Node >= 20.9 (disarankan Node 22 LTS): node --version
npx create-next-app@latest fuspi-web --typescript --tailwind --app --src-dir --eslint --import-alias "@/*"
cd fuspi-web

# Verifikasi versi: harus 16.x
npm show next version

npm i prisma @prisma/client @prisma/adapter-pg pg next-auth@beta @auth/prisma-adapter bcryptjs zod
npm i next-intl                                   # multibahasa (12)
npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link
npm i @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-youtube @tiptap/extension-table
npm i @tanstack/react-table lucide-react date-fns
npm i @dnd-kit/core @dnd-kit/sortable            # menu builder & reorder (10)
npm i @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/list  # jadwal ruangan (15)
npm i sharp file-type isomorphic-dompurify       # upload (07) & sanitasi HTML (13)
npm i react-pdf                                  # viewer PDF final (11)
npm i nodemailer                                 # SMTP + outbox
npm i papaparse xlsx                             # import massal dosen (09)
npm i -D @types/bcryptjs @types/nodemailer tsx vitest @playwright/test
npx shadcn@latest init
```
