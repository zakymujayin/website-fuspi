# 06 — Autentikasi & Role (Auth.js v5)

Login hanya untuk admin & editor internal. Tidak ada registrasi publik. Memakai **Auth.js v5 (NextAuth beta)** dengan **Credentials provider** dan **session database** (bukan JWT) — pilihan ini disengaja agar sesi bisa dicabut dan aman untuk aplikasi internal.

## Konfigurasi (`lib/auth.ts`)

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database", maxAge: 60 * 60 * 8 }, // 8 jam
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      // sertakan role & id ke session
      if (session.user) {
        session.user.id = user.id;
        (session.user as any).role = (user as any).role;
      }
      return session;
    },
  },
});
```

> **Keputusan final:** tidak ada fallback JWT. Pin versi `next-auth` dan `@auth/prisma-adapter` yang lulus integration test. Credentials harus menghasilkan record `Session` database dan cookie opaque `sessionToken`. Bila adapter pada versi terpilih tidak membuat session Credentials otomatis, implementasikan pembuatan/revokasi session database pada callback autentikasi dan uji alur tersebut; jangan mengubah strategi menjadi JWT. Cookie wajib `HttpOnly`, `Secure` di produksi, `SameSite=Lax`, `Path=/`, dan kedaluwarsa 8 jam.

Tambahkan augmentasi tipe di `types/next-auth.d.ts` agar `session.user.role` dan `session.user.id` bertipe benar.

## Route handler & Server Actions

`app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

Login memakai Server Action yang memanggil `signIn("credentials", { email, password, redirectTo: "/admin" })`, menangkap error, dan menampilkan pesan ramah ("Email atau kata sandi salah").

## Proteksi rute (`src/proxy.ts` — Next.js 16)

> **⚠️ PENTING (Next 16):** file ini dulu bernama `middleware.ts`. Di Next.js 16 namanya **`proxy.ts`**. Isinya sama, namanya berubah untuk memperjelas batas jaringan.
>
> **⚠️ PERINGATAN KEAMANAN — WAJIB DIBACA:** sepanjang 2025–2026 Next.js merilis beberapa perbaikan keamanan untuk **bypass otorisasi lewat middleware/proxy** (segment-prefetch, injeksi parameter rute dinamis, i18n path). Artinya: **JANGAN PERNAH menjadikan proxy.ts sebagai satu-satunya lapisan otorisasi.** Proxy hanya untuk redirect/UX; **keputusan akses yang sesungguhnya harus di server** (Server Action / Server Component / Route Handler), seperti diatur di bagian "Otorisasi berlapis" di bawah. Ini bukan saran — ini keharusan. Selalu pakai versi Next.js terbaru yang sudah dipatch.

```ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ROLE_ALLOWED: Record<string, string[]> = {
  EDITOR: ["/admin", "/admin/berita", "/admin/pengumuman", "/admin/kolom", "/admin/media"],
  PETUGAS: ["/admin", "/admin/pengaduan", "/admin/peminjaman", "/admin/ruangan"],
  SATGAS_PPKS: ["/admin", "/admin/pengaduan/ppks"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Catatan: rute ber-locale, mis. /id/admin/... — normalisasi dulu.
  const locale = pathname.match(/^\/(id|en|ar)(?:\/|$)/)?.[1] ?? "id";
  const path = pathname.replace(/^\/(id|en|ar)/, "") || "/";

  if (path.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
    const role = (session.user as any)?.role;

    if (role !== "ADMIN") {
      const allowed = (ROLE_ALLOWED[role] ?? []).some((p) => path === p || path.startsWith(p + "/"));
      if (!allowed) return NextResponse.redirect(new URL(`/${locale}/admin`, req.url));
    }
  }

  if (path === "/login" && session) {
    return NextResponse.redirect(new URL(`/${locale}/admin`, req.url));
  }
  return NextResponse.next();
});

export const config = {
  // Kecualikan /uploads agar file media tidak kena redirect locale (lihat 12-B)
  matcher: ["/((?!api|_next|uploads|.*\\..*).*)"],
};
```

> Gabungkan dengan middleware `next-intl` (lihat `12-B`): jalankan i18n dulu, lalu cek auth.

## Otorisasi berlapis (WAJIB)

**`proxy.ts` TIDAK cukup** — dan ini bukan sekadar praktik baik, melainkan konsekuensi dari kerentanan bypass proxy yang nyata (lihat peringatan di atas). Setiap Server Action / Server Component / Route Handler yang mengakses atau menulis data harus memeriksa sesi & role **di server** sebelum eksekusi. Anggap proxy bisa dilewati; server harus tetap aman.

```ts
"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("Tidak terautentikasi");
  return session;
}

// Kepemilikan: EDITOR hanya boleh mengubah/menghapus POST miliknya sendiri.
// ADMIN boleh atas post siapa pun.
async function requireOwnPost(postId: string) {
  const session = await requireAuth();
  const role = (session.user as any).role;
  if (role === "ADMIN") return session;

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
  if (!post || post.authorId !== session.user.id) {
    throw new Error("Anda hanya dapat mengelola berita yang Anda buat sendiri");
  }
  return session;
}
```

`requireOwnPost()` tetap dipakai untuk ownership, tetapi pemeriksaan role memakai permission matrix terpusat di `lib/authorization.ts`, bukan konsep `minRole`. API-nya:

```ts
authorize(session, action, resource, context?)
// action: VIEW | CREATE | UPDATE | DELETE | PUBLISH | ASSIGN | EXPORT | DOWNLOAD
// resource: POST | MEDIA | CMS | USER | BOOKING | TICKET | PPKS_TICKET | AUDIT_LOG
```

### Matriks izin final

| Resource / aksi | ADMIN | EDITOR | PETUGAS | SATGAS_PPKS |
|---|---|---|---|---|
| Post semua penulis | penuh | ❌ | ❌ | ❌ |
| Post milik sendiri | penuh | create/update/delete/**publish/schedule** | ❌ | ❌ |
| Media | penuh | upload & kelola milik sendiri | ❌ | ❌ |
| CMS lain, menu, branding, beranda | penuh | ❌ | ❌ | ❌ |
| User & perubahan role | penuh | ❌ | ❌ | ❌ |
| Booking | penuh | ❌ | penuh | ❌ |
| Tiket non-PPKS | penuh | ❌ | penuh | ❌ |
| Agregat PPKS tanpa detail | view | ❌ | view | view |
| Isi, balasan, identitas & lampiran PPKS | ❌ | ❌ | ❌ | penuh |
| TicketAccessLog PPKS | ❌ | ❌ | ❌ | view terbatas |

Aturan tambahan:

- Hanya ADMIN dapat membuat akun `SATGAS_PPKS`, tetapi hak ini tidak memberi ADMIN akses kasus.
- Assignment non-PPKS hanya kepada `PETUGAS`/`ADMIN`; assignment PPKS hanya kepada `SATGAS_PPKS`.
- Query, Server Component, Server Action, Route Handler, download, dan ekspor memanggil `authorize()` masing-masing. Proxy tidak dihitung sebagai otorisasi.
- Daftar EDITOR selalu memfilter `authorId=session.user.id`; endpoint detail tetap memeriksa ownership agar ID langsung tidak menjadi IDOR.
- EDITOR boleh mengubah post miliknya ke `PUBLISHED`, menetapkan `publishedAt` sekarang atau masa depan, dan mengembalikannya ke `DRAFT`/`ARCHIVED`.
- Konten publik hanya mengambil `status=PUBLISHED AND publishedAt<=now()`.
- Form edit mengirim `updatedAt`; mutation ditolak sebagai konflik bila record sudah berubah sejak form dibuka.

## Hashing password

- Simpan `passwordHash` dengan `bcrypt.hash(password, 10)`.
- Saat membuat/mengubah user di admin: hash di server action, jangan pernah kirim password plain ke client atau simpan mentah.
- Seed admin awal juga memakai bcrypt.
- Password minimum 12 karakter. Tolak password yang sama dengan email atau termasuk daftar password umum.
- Password admin awal hanya dibaca dari `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD`; tidak boleh di-hardcode. Setelah login pertama, `mustChangePassword=true` memaksa penggantian.
- Tidak ada registrasi atau reset password publik pada v1. ADMIN mereset password user lain; pemulihan ADMIN terakhir dilakukan lewat perintah CLI terdokumentasi yang langsung mengubah hash setelah verifikasi operator.

## Keamanan tambahan

- `AUTH_SECRET` wajib diisi (env), string acak kuat.
- Cegah admin menonaktifkan/menghapus akunnya sendiri.
- Rate limit login wajib: maksimum 5 kegagalan dalam 15 menit per kombinasi HMAC IP dan HMAC email. Blokir selama 15 menit, kembalikan pesan generik, dan jangan mengungkap apakah email terdaftar.
- Jangan bocorkan apakah email ada — pesan error selalu generik.
- Saat user dinonaktifkan, password diubah, atau role berubah, hapus seluruh `Session` miliknya dalam transaksi yang sama. Setiap request juga memeriksa `User.isActive` sehingga sesi lama tidak tetap berfungsi.
- ADMIN tidak boleh menonaktifkan dirinya sendiri atau menonaktifkan/menghapus satu-satunya ADMIN aktif.
