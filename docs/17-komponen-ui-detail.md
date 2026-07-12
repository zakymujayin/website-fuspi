# 17 — Spesifikasi Komponen & Pola UI (Angka Presisi)

Melengkapi `03` (token) dengan **spesifikasi setiap komponen** — angka pasti, bukan kira-kira. Agen harus mengikuti ini persis. Semua nilai arah memakai **logical properties** (`ms/me/ps/pe/start/end`) karena situs mendukung RTL (`12-E`).

---

## A. Spacing — aturan pemakaian (bukan hanya "grid 8px")

| Konteks | Nilai |
|---|---|
| Padding dalam tombol | `10px 16px` (tinggi total 40px) |
| Padding dalam input | `10px 12px` (tinggi 40px) |
| Padding dalam kartu | `24px` (mobile: `16px`) |
| Gap antar kartu dalam grid | `24px` (mobile: `16px`) |
| Gap antar field dalam form | `20px` |
| Gap label → input | `6px` |
| Gap input → pesan error | `4px` |
| Jarak antar section halaman publik | `80px` (mobile: `48px`) |
| Padding area konten admin | `32px` (mobile: `16px`) |
| Padding sel tabel | `12px 16px` |
| Gap ikon → teks | `8px` |
| Container max-width | `1200px`, padding samping `24px` (mobile `16px`) |
| Lebar teks artikel | `max-width: 72ch` |

---

## B. Header publik

**Tiga lapis** (sesuai `05`):

1. **Bar konten** — tinggi `36px`, bg `slate-100`, teks `13px` `slate-600`. Isi: Berita · Pengumuman · Kolom · Agenda · Album · Dokumen. Hover: teks `royal-600`. Border-bottom `slate-200`.
2. **Topbar utilitas** — tinggi `36px`, bg `navy-900`, teks `12px` `slate-300`. Isi (rata `end`): PMB · SIAKAD · E-Learning · GKM + language switcher.
3. **Header utama** — tinggi `76px`, bg putih. Logo (tinggi `44px`) di `start`; menu utama di `end`, teks `15px` `font-medium` `slate-700`, gap antar item `28px`.

**Perilaku scroll:** setelah scroll >100px, bar konten & topbar menghilang (slide up), header utama jadi `sticky` dengan tinggi menyusut ke `60px` + `shadow-sm`. Transisi `200ms`.

**Dropdown menu:**
- Panel putih, `rounded-xl`, `shadow-lg`, border `slate-200`, padding `8px`, lebar min `220px`.
- Muncul `4px` di bawah item, animasi fade+slide-down `150ms`.
- Item: padding `10px 12px`, `rounded-lg`, teks `14px`. Hover: bg `royal-50`, teks `royal-700`.
- Buka saat **hover** (desktop) DAN **klik/fokus** (keyboard). Wajib bisa dinavigasi dengan Tab + panah, tutup dengan `Esc`.
- Item aktif (halaman sedang dibuka): teks `royal-600` + `font-medium`.

**Mobile (<md):** hamburger (`44×44px`) → drawer geser dari sisi `end`, lebar `85vw` (maks `360px`), bg putih. Sub-menu **accordion** (bukan hover). Overlay hitam 40%. Tutup dengan `Esc` / klik overlay.

---

## C. Footer publik

- bg `navy-900`, teks `slate-300`, padding `64px 0 0`.
- **4 kolom** (desktop) → 2 (tablet) → 1 (mobile), gap `32px`:
  1. Logo (putih) + nama fakultas + alamat 2 kampus + email + telepon.
  2. Program Studi (6 tautan).
  3. Tautan Cepat (Layanan, Pengaduan, Peminjaman, PPID, FAQ, Kontak).
  4. Website Terkait & Jurnal (dari `ExternalLink`) + ikon sosial media (`20px`, gap `12px`).
- Judul kolom: `14px` `font-medium` putih, `margin-bottom: 16px`, dengan **garis brass 2px selebar 32px** di bawahnya (elemen signature).
- Tautan: `14px` `slate-400`, hover putih.
- **Bar bawah**: border-top `navy-800`, padding `20px 0`, teks `13px` `slate-500`, isi: "© 2026 Fakultas Ushuluddin dan Pemikiran Islam" (start) + tautan Privasi · Aksesibilitas · Sitemap (end).

---

## D. Panel admin — layout

- **Sidebar**: lebar `260px`, bg `navy-900`, `position: sticky`, tinggi penuh.
  - Header sidebar: logo `28px` + teks "FUSPI Admin" `14px` `font-medium` putih, padding `16px`, border-bottom `rgba(255,255,255,.12)`.
  - **Label grup**: `11px` uppercase, `letter-spacing: .06em`, `slate-400`, padding `16px 16px 6px`.
  - **Item menu**: padding `9px 12px`, margin samping `8px`, `rounded-lg`, teks `14px` `slate-300`, ikon lucide `18px`, gap `10px`.
  - **Item aktif**: bg `rgba(65,105,225,.22)`, teks putih, **garis `3px` `royal-400` di sisi `start`** (radius sisi itu = 0).
  - Hover: bg `rgba(255,255,255,.06)`.
  - **Badge angka** (mis. pengaduan baru): pill `danger`, `10px`, di sisi `end` item.
- **Topbar admin**: tinggi `60px`, bg putih, border-bottom `slate-200`, padding `0 24px`. Judul halaman `18px` `font-medium` (start); ikon notifikasi + avatar `32px` (end).
- **Area konten**: bg `slate-50`, padding `32px`, `max-width: 1200px`.
- **Mobile**: sidebar jadi drawer off-canvas (hamburger di topbar), konten full-width.

---

## E. Notifikasi (Toast) — belum ada sebelumnya, WAJIB

Gunakan **shadcn `sonner`** (bukan alert bawaan browser).

- **Posisi**: pojok atas sisi `end`, offset `24px`. Di mobile: melebar penuh di atas, offset `16px`.
- **Ukuran**: lebar `360px` (mobile: `calc(100vw - 32px)`), padding `12px 16px`, `rounded-lg`, `shadow-lg`.
- **Struktur**: ikon (`18px`) + teks (`14px`) + tombol tutup (`×`, `16px`, di sisi `end`).
- **Varian**:
  | Jenis | bg | border | teks/ikon | Ikon lucide |
  |---|---|---|---|---|
  | Sukses | `#DCFCE7` | `#86EFAC` | `#166534` | `check-circle` |
  | Error | `#FEE2E2` | `#FCA5A5` | `#991B1B` | `alert-circle` |
  | Peringatan | `#FEF3C7` | `#FCD34D` | `#92400E` | `alert-triangle` |
  | Info | `#E0E8FD` | `#A0B5F6` | `#2A43A6` | `info` |
- **Durasi**: sukses/info `4 detik` (auto-hilang); error **tidak auto-hilang** (harus ditutup manual — pengguna perlu membacanya).
- **Animasi**: slide-in dari sisi `end` + fade, `200ms`. Hormati `prefers-reduced-motion` (fade saja).
- **Aksesibilitas**: container `aria-live="polite"` (error: `assertive`).
- **Isi pesan**: kalimat aktif & spesifik. ✅ "Berita diterbitkan" · ❌ "Berhasil!" atau "Sukses melakukan operasi".

**Notifikasi in-page (banner/alert)** — untuk pesan menetap (mis. "Konten belum tersedia dalam bahasa ini"): bar `rounded-lg`, padding `12px 16px`, warna sama seperti tabel di atas, lebar penuh kontainer, ikon di sisi `start`.

---

## F. Dialog / Modal

- Overlay: hitam `40%`, blur tidak perlu.
- Panel: putih, `rounded-xl`, `shadow-lg`, lebar `480px` (konfirmasi) / `640px` (form) / `90vw` mobile. Padding `24px`.
- Header: judul `18px` `font-medium` + tombol `×` di sisi `end`.
- Footer: tombol rata `end`, gap `12px`. Urutan: [Batal (sekunder)] [Aksi (primer)].
- **Dialog hapus**: tombol aksi memakai varian `destructive`, teks jelas menyebut objeknya — "Hapus berita «Workshop Kurikulum»?" bukan "Anda yakin?".
- Fokus terperangkap di dalam dialog; `Esc` menutup; fokus kembali ke pemicu saat ditutup.

---

## G. Form (admin)

- **Satu kolom** untuk form panjang (lebih mudah dipindai). Dua kolom hanya untuk field pendek berpasangan (mis. Tanggal mulai / selesai).
- Label: `14px` `font-medium` `slate-700`, di **atas** input (bukan di samping).
- Helper text: `13px` `slate-500`, di bawah input.
- Error: `13px` `danger`, ikon `alert-circle` `14px`, border input jadi `danger`.
- Field wajib: tanda `*` warna `danger` setelah label.
- **Tombol simpan** menempel di bawah (sticky bar, bg putih, border-top, padding `16px 24px`) pada form panjang — jangan paksa pengguna scroll ke bawah.
- Saat menyimpan: tombol jadi `disabled` + spinner + teks "Menyimpan…".

---

## H. Empty state & Loading

**Empty state** (tidak ada data):
- Ikon lucide `40px` `slate-300`, judul `16px` `font-medium`, deskripsi `14px` `slate-500`, tombol aksi primer.
- Nada mengundang, bukan minta maaf: ✅ "Belum ada berita. Tulis berita pertama Anda." + tombol [Tulis Berita] · ❌ "Tidak ada data."
- Padding `48px 24px`, rata tengah.

**Loading**:
- Tabel & kartu: **skeleton** (blok abu `slate-200`, animasi pulse `1.5s`) yang bentuknya menyerupai konten asli — bukan spinner di tengah layar.
- Tombol: spinner `16px` di dalam tombol.
- Halaman publik: `loading.tsx` per rute dengan skeleton.

---

## I. Pagination

- Rata tengah, margin-top `32px`.
- Tombol: `36×36px`, `rounded-lg`, border `slate-300`. Aktif: bg `royal-500`, teks putih.
- Format: `‹ 1 2 [3] 4 5 … 12 ›`. Panah `chevron-left/right` — **wajib `rtl:rotate-180`**.
- Mobile: cukup `‹ Sebelumnya` / `Berikutnya ›` + "Hal 3 dari 12".

---

## J. Breadcrumb

- `13px` `slate-500`, pemisah `chevron-right` `14px` (**`rtl:rotate-180`**), gap `8px`.
- Item terakhir (halaman aktif): `slate-700`, tidak dapat diklik.
- Ada di semua halaman kecuali beranda. Sertakan schema.org `BreadcrumbList`.

---

## K. Kartu berita (PostCard)

- Gambar: `aspect-video`, `object-cover`, `rounded-t-xl`.
- Body padding `20px`: kategori (`11px` uppercase `royal-600`) → judul (`17px` `font-medium`, `line-clamp-2`, tinggi tetap) → ringkasan (`14px` `slate-500`, `line-clamp-2`) → tanggal (`13px` `slate-400`).
- Hover: `shadow-md` + `translate-y(-2px)`, transisi `200ms`.
- **Tinggi kartu seragam** dalam satu baris grid (pakai `line-clamp` + `flex` agar tidak timpang).

---

## L. Referensi desain (rujukan tunggal)

Sebelumnya terserak di `10-E`; ini rujukan resminya.

| Situs | Yang diambil |
|---|---|
| **UIN Suka Ushuluddin** (`ushuluddin.uin-suka.ac.id`) | **Rujukan utama tata letak.** Header bersih, bar konten terpisah dari menu utama, banyak ruang putih, kartu seragam, arsip konsisten tiap tipe konten. |
| **Zaytuna College** (`zaytuna.edu/faculty`) | **Rujukan direktori dosen.** Grid kartu foto → halaman detail berisi biografi, email, office hours. Nuansa akademik-keislaman yang modern. |
| **Carleton / Bowdoin / Amherst** | Warna brand dipakai **hemat** — foto & konten yang membawa bobot, bukan warna. Minimalis akademik. |
| **Duke** | Navigasi berbasis audiens (Calon Mahasiswa / Mahasiswa / Dosen). |
| **SOAS** | Aksesibilitas WCAG AA sebagai standar, bukan tambahan. |

**Yang TIDAK ditiru:** gradient hero ungu-biru generik, blob dekoratif, angka besar 01/02/03, ikon emoji, carousel penuh sesak. (Lihat aturan anti-slop `03`.)

**Identitas FUSPI tetap milik sendiri:** Royal Blue `#4169E1` + navy + aksen brass hemat, Plus Jakarta Sans + Inter (+ IBM Plex Sans Arabic untuk AR), dan **garis brass 2px** di bawah setiap judul section sebagai satu-satunya ornamen tetap.

---

## M. Checklist verifikasi UI (sebelum dianggap selesai)

- [ ] Tidak ada `ml-`/`mr-`/`pl-`/`pr-`/`text-left`/`text-right` di seluruh komponen (RTL).
- [ ] Semua tombol/input tinggi `40px`, radius konsisten (`lg` kontrol, `xl` kartu).
- [ ] Toast muncul untuk setiap aksi simpan/hapus; error tidak auto-hilang.
- [ ] Setiap tabel punya empty state; setiap halaman punya loading skeleton.
- [ ] Fokus keyboard terlihat di semua elemen interaktif.
- [ ] Dropdown & dialog bisa ditutup dengan `Esc`.
- [ ] Kartu dalam satu baris tingginya seragam.
- [ ] Diuji di 360 / 390 / 768 / 1024 / 1440px, dan dalam mode Arabic (RTL).
