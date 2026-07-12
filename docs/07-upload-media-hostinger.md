# 07 — Upload Media di Storage Native Hostinger

Ini bagian paling rawan salah, jadi ikuti persis. Tujuannya: meniru cara WordPress (`wp-content/uploads`) — file diunggah ke **direktori persisten di luar folder build**, disajikan langsung oleh web server sebagai file statis, dan aplikasi hanya menyimpan URL-nya di database.

## Prinsip kunci

1. **JANGAN** menulis file ke folder `public/` Next.js. Folder itu dibekukan saat build; file runtime yang ditaruh di sana tidak tersaji dengan benar dan hilang saat redeploy dari GitHub.
2. **Tulis ke direktori persisten** milik domain di Hostinger, yaitu di dalam `public_html`, di luar path build `nodejs`. Direktori ini bertahan antar-deploy dan bisa disajikan langsung oleh web server.
3. Simpan **URL publik** file ke tabel `Media` (dan ke field seperti `coverImage`). Frontend memuatnya sebagai gambar statis biasa.
4. File privat **tidak pernah** mendapat URL statis. Database menyimpan `storageKey`; file hanya dikirim melalui Route Handler yang mengulang pemeriksaan izin.
5. Lampiran PPKS menggunakan direktori dan kunci enkripsi terpisah dari lampiran privat biasa.

## Lokasi direktori (Hostinger Business)

Struktur direktori Hostinger untuk aplikasi Node.js:
```
/home/{username}/domains/fuspi.uinbanten.ac.id/
├── nodejs/        ← build aplikasi (diganti tiap deploy)
└── public_html/   ← disajikan web server; .htaccess dibuat otomatis
    └── uploads/   ← BUAT folder ini; tujuan upload (persisten)
        └── 2026/07/namafile.webp
```

Set di `.env` (lihat `01`):
```bash
UPLOAD_DIR="/home/{username}/domains/fuspi.uinbanten.ac.id/public_html/uploads"
UPLOAD_PUBLIC_URL="https://fuspi.uinbanten.ac.id/uploads"
UPLOAD_PRIVATE_DIR="/home/{username}/domains/fuspi.uinbanten.ac.id/private_uploads"
PPKS_PRIVATE_DIR="/home/{username}/domains/fuspi.uinbanten.ac.id/ppks_private"
PPKS_ENCRYPTION_KEY="base64-encoded-32-byte-key"
```

File yang disimpan ke `UPLOAD_DIR/2026/07/abc.webp` otomatis dapat diakses di `UPLOAD_PUBLIC_URL/2026/07/abc.webp`.

> Saat pengembangan lokal, arahkan `UPLOAD_DIR` ke folder lokal (mis. `./.uploads`) dan `UPLOAD_PUBLIC_URL` ke route lokal (lihat opsi fallback di bawah). Buat folder otomatis bila belum ada.

## Endpoint upload (`app/api/upload/route.ts`)

Memakai Route Handler (bukan Server Action) karena menangani `multipart/form-data`.

```ts
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const UPLOAD_DIR = process.env.UPLOAD_DIR!;
const PUBLIC_URL = process.env.UPLOAD_PUBLIC_URL!;
const MAX = Number(process.env.UPLOAD_MAX_SIZE ?? 5_242_880);
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "File tidak ada" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Ukuran melebihi batas" }, { status: 400 });
  if (!ALLOWED.includes(file.type))
    return NextResponse.json({ error: "Tipe file tidak diizinkan" }, { status: 400 });

  const now = new Date();
  const subdir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const destDir = path.join(UPLOAD_DIR, subdir);
  await mkdir(destDir, { recursive: true });

  const isImage = file.type.startsWith("image/");
  const buf = Buffer.from(await file.arrayBuffer());
  const base = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let filename: string, width: number | undefined, height: number | undefined, size = file.size;

  if (isImage) {
    // konversi ke webp + resize maksimum → hemat storage & cepat
    const out = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    const meta = await sharp(out).metadata();
    width = meta.width; height = meta.height; size = out.length;
    filename = `${base}.webp`;
    await writeFile(path.join(destDir, filename), out);
  } else {
    filename = `${base}.pdf`;
    await writeFile(path.join(destDir, filename), buf);
  }

  const url = `${PUBLIC_URL}/${subdir}/${filename}`;
  const media = await prisma.media.create({
    data: { filename, url, mimeType: isImage ? "image/webp" : file.type, size, width, height, uploadedById: session.user.id },
  });

  return NextResponse.json({ media });
}
```

Contoh di atas hanya kerangka. Implementasi final **wajib** menambahkan validasi magic bytes, canonical path, batas dimensi/decompression, cleanup bila insert DB gagal, dan alt text sesuai aturan berikut.

## Kontrak upload final

| Kelas file | Batas | Jumlah | Penyimpanan | Akses |
|---|---:|---:|---|---|
| Gambar CMS | 5 MB | multi-upload maks. 20/request | publik | URL statis |
| PDF publik | 20 MB | 1/field | publik | URL statis |
| Lampiran tiket umum | 5 MB/file | maks. 3 | privat | token pelapor atau petugas berizin |
| Surat booking | 10 MB | 1 | privat | token pemohon atau ADMIN/PETUGAS |
| Lampiran PPKS | 5 MB/file | maks. 3 | PPKS privat + terenkripsi | SATGAS_PPKS atau token pelapor terkait |

Aturan wajib:

- Jangan percaya `File.type` atau ekstensi. Periksa signature/magic bytes dan cocokkan MIME, ekstensi, serta isi.
- SVG, HTML, executable, archive, dan file dengan format ganda ditolak.
- Gambar didekode dengan `sharp`, auto-rotate, maksimum 1600×1600, lalu ditulis ulang sebagai WebP kualitas 82. Terapkan pixel limit untuk menolak decompression bomb.
- PDF wajib diawali signature PDF yang valid dan disajikan dengan `nosniff`. File tidak pernah dieksekusi.
- Nama storage memakai `crypto.randomBytes(32)`; nama asli hanya metadata yang disanitasi.
- Semua path di-resolve/canonicalize dan harus tetap berada di root kelas storage. Tolak `..`, separator asing, null byte, dan symlink escape.
- Gambar informatif wajib memiliki alt text. Gambar dekoratif harus secara eksplisit disimpan dengan `isDecorative=true` dan `alt=""`.
- Tulis file sementara, validasi/transformasi, insert database, lalu atomic rename. Bila transaksi database gagal, hapus file sementara.
- Penghapusan Media ditolak bila masih direferensikan oleh model atau HTML konten; sediakan laporan referensi kepada admin. Job pembersihan file yatim berjalan hanya setelah backup dan masa tunggu 30 hari.

## Storage privat & route download

- `UPLOAD_PRIVATE_DIR` dan `PPKS_PRIVATE_DIR` wajib berada di luar `public_html` dan di luar standalone build.
- Database menyimpan `storageKey`, `originalName`, `mimeType`, `size`, checksum SHA-256, kelas storage, serta metadata enkripsi; jangan simpan filesystem path absolut.
- Route `GET /api/private-files/[id]` menerima sesi internal atau token pelacakan yang sudah diverifikasi. Route memuat record induk, menjalankan `authorize()`, lalu melakukan stream dengan `Content-Disposition`, `Content-Type`, `nosniff`, dan cache `private, no-store`.
- Untuk PDF, dukung byte range agar viewer tidak perlu memuat seluruh file. Jangan mengungkap path disk pada error/header.
- Setiap view/download PPKS—berhasil maupun ditolak—ditulis ke `TicketAccessLog`.

### Enkripsi PPKS

- Gunakan AES-256-GCM dengan key 32 byte dari `PPKS_ENCRYPTION_KEY`.
- Buat nonce acak baru untuk setiap file. Simpan nonce, authentication tag, dan key version pada metadata attachment.
- Dekripsi hanya saat streaming setelah otorisasi. Plaintext tidak boleh ditulis kembali ke disk.
- Backup direktori PPKS tetap terenkripsi; backup kunci disimpan terpisah dari backup data.
- Rotasi kunci memakai `keyVersion`; file lama tetap dapat dibaca selama migrasi re-enkripsi terkontrol.

Tambahkan dependency: `npm i sharp`. (Sharp tersedia di runtime Node.js Hostinger; bila build gagal karena binary, set `sharp` sebagai dependency biasa dan pastikan Node.js versi yang didukung.)

## Menghapus file

Saat record `Media` dihapus di admin, hapus juga file fisiknya:
```ts
import { unlink } from "fs/promises";
// dari url → path lokal:
const rel = url.replace(PUBLIC_URL, "");           // /2026/07/abc.webp
  const candidate = path.resolve(UPLOAD_DIR, `.${rel}`);
  if (!candidate.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) throw new Error("Path tidak valid");
  await unlink(candidate).catch(() => {}); // abaikan hanya ENOENT; error lain dicatat
```
Sebelum menghapus, pemeriksaan referensi **wajib**. File yang masih dipakai tidak boleh dihapus. File yatim dicatat dan baru dibersihkan setelah 30 hari serta setelah backup terverifikasi.

## Serving & .htaccess

Hostinger otomatis membuat `.htaccess` di `public_html` untuk routing aplikasi Node.js. Folder `uploads/` berada di dalam `public_html`, jadi web server menyajikannya langsung **sebelum** request diteruskan ke Node.js — cepat dan tanpa membebani aplikasi. Bila perlu, tambahkan aturan agar `/uploads` di-bypass ke file statis dan diberi cache header panjang:

```apache
# public_html/uploads/.htaccess (opsional, untuk cache)
<IfModule mod_headers.c>
  Header set Cache-Control "public, max-age=31536000, immutable"
</IfModule>
```

Verifikasi setelah deploy: unggah 1 gambar dari admin, cek muncul di `https://fuspi.uinbanten.ac.id/uploads/...`, lalu lakukan redeploy dan pastikan gambar **masih ada** (bukti persistensi).

## Fallback dev lokal (opsional)

Bila mengembangkan tanpa akses struktur Hostinger, buat route `app/uploads/[...path]/route.ts` yang membaca file dari `UPLOAD_DIR` lokal dan mengembalikannya, atau cukup arahkan `UPLOAD_DIR` ke `./public/uploads` **hanya untuk dev** (dan `.gitignore`-kan). Di produksi tetap pakai path Hostinger. Perbedaan ini murni dari env, tanpa ubah kode.

## Batasan yang perlu diketahui

- Storage terpakai kuota paket Business — kompresi ke webp sangat membantu.
- Tidak ada CDN bawaan; untuk situs fakultas beban ini wajar. Bila trafik gambar besar kelak, adapter bisa ditukar ke S3/Supabase Storage tanpa ubah skema (hanya ganti isi `lib/upload`).
