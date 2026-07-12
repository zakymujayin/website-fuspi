# 19 — Halaman Berita: Daftar, Detail & Sidebar

Spesifikasi detail halaman berita, mengikuti pola **Unilam** (`unilam.ac.id/berita`) yang dijadikan rujukan: daftar berita → klik → halaman detail dengan **sidebar berita terbaru** di sampingnya.

Pola ini berlaku sama untuk **Pengumuman** dan **Kolom** — bangun sebagai template yang dapat dipakai ulang, jangan tiga kali menulis kode yang sama.

---

## A. Alur navigasi (yang diminta)

```
Beranda
  └─ Section "Berita Terbaru" (4 kartu)
       ├─ klik kartu ──────────────→ /berita/[slug]  (halaman detail)
       └─ tombol "Semua Berita" ───→ /berita         (halaman daftar)

/berita  ──klik kartu──→  /berita/[slug]
                              └─ sidebar "Berita Terbaru" → berita lain
```

**Tombol "Semua Berita"** di section beranda: varian sekunder, ditempatkan **rata tengah di bawah grid kartu** (margin-top `32px`), teks + ikon `arrow-right` (**`rtl:rotate-180`**). Ini yang diminta: "ada link untuk melihat semua berita".

---

## B. Halaman daftar `/berita`

### Struktur
1. **PageHeader** — judul "Berita" + **breadcrumb** (`Beranda › Berita`) + garis brass signature. Boleh diberi gambar latar tipis (overlay navy) seperti Unilam.
2. **Body 2 kolom** (desktop):
   - **Kolom utama** (`8/12`) — daftar kartu berita.
   - **Sidebar** (`4/12`) — panel arsip (lihat bagian D).
3. **Pagination** di bawah kolom utama (`17-I`).

### Kartu berita di halaman daftar (varian horizontal)
Berbeda dari `PostCard` beranda yang vertikal. Di halaman daftar, pakai **kartu horizontal** agar ringkasan lebih leluasa:

- Gambar di sisi `start`: lebar `240px`, `aspect-video`, `object-cover`, `rounded-lg`.
- Konten di sisi `end`, gap `20px`:
  - **Badge kategori** — pill `royal-50` / teks `royal-700`, `11px` uppercase.
  - **Judul** — `20px` `font-medium`, `line-clamp-2`, hover jadi `royal-600`.
  - **Baris meta** — `13px` `slate-500`: `[ikon user] Penulis · [ikon calendar] 8 Juli 2026`.
  - **Ringkasan** — `14px` `slate-600`, `line-clamp-2`.
  - **Tautan "Selengkapnya →"** — `14px` `font-medium` `royal-600`, ikon `arrow-right` (`rtl:rotate-180`).
- Pemisah antar kartu: border-bottom `slate-200`, padding vertikal `24px`.
- **Mobile:** gambar pindah ke atas (full-width, `aspect-video`), konten di bawahnya — **jangan** paksa layout horizontal di layar kecil (aturan `03`).

---

## C. Halaman detail `/berita/[slug]` — INI YANG DIMINTA

### Layout 2 kolom
```
┌────────────────────────────────────────┬──────────────────┐
│  KOLOM UTAMA (8/12)                    │  SIDEBAR (4/12)  │
│  • Breadcrumb                          │  ┌────────────┐  │
│  • Judul (H1)                          │  │ Berita     │  │
│  • Baris meta (penulis·tanggal·kat.)   │  │ Terbaru    │  │
│  • Gambar utama                        │  │ ─────────  │  │
│  • Isi artikel (Prose)                 │  │ [5 item]   │  │
│  • Tag                                 │  └────────────┘  │
│  • Tombol bagikan                      │  ┌────────────┐  │
│  • Navigasi Sebelumnya / Berikutnya    │  │ Kategori   │  │
│  • Berita Terkait (3 kartu)            │  └────────────┘  │
│                                        │  ← sticky        │
└────────────────────────────────────────┴──────────────────┘
```

### Kolom utama — detail
- **Breadcrumb**: `Beranda › Berita › [Judul]` (`17-J`).
- **Judul (H1)**: `36px` `font-bold` Plus Jakarta Sans, `line-height 1.25`, `max-width` penuh kolom.
- **Baris meta** (`14px` `slate-500`, gap `16px`, ikon `16px`):
  - `[user] Penulis` — dari `Post.author.name`.
  - `[calendar] 8 Juli 2026` — dari `publishedAt`, format `Asia/Jakarta`.
  - `[folder] Kategori` — badge, dapat diklik → `/berita/kategori/[slug]`.
  - `[clock] 4 menit baca` — dihitung dari jumlah kata (±200 kata/menit).
  - `[eye] 128 dilihat` — dari `viewCount`; wajib tampil bila nilai >0 dan mengikuti semantik hitung pada `13-I`.
- **Gambar utama**: full-width kolom, `aspect-video`, `object-cover`, `rounded-xl`, margin `24px 0`. Caption opsional di bawahnya (`13px` `slate-500`, italic).
- **Isi artikel**: komponen `Prose`, `max-width: 72ch`, `16px/1.75`. Merender HTML tersanitasi dari editor — termasuk **gambar berposisi start/center/end** (`09-A`), tabel, embed video, blockquote.
- **Tag**: pill `slate-100`, dapat diklik → `/tag/[slug]`.
- **Tombol bagikan**: WhatsApp (paling penting untuk Indonesia), Facebook, X, Salin Tautan. Ikon `20px` dalam lingkaran `36px`, border `slate-300`, hover `royal-50`. **Gunakan Web Share API** di mobile bila tersedia.
- **Navigasi Sebelumnya / Berikutnya**: dua kartu kecil di sisi `start`/`end` berisi judul berita sebelum & sesudah (berdasar `publishedAt`). Panah **`rtl:rotate-180`**.
- **Berita Terkait**: 3 `PostCard` dari kategori/tag yang sama (`13-D`), judul section "Berita Terkait".

### Sidebar — INI YANG ANDA MINTA
`position: sticky; top: 92px` (di bawah header sticky). Berisi widget bertumpuk, gap `24px`:

**1. Widget "Berita Terbaru"** (utama)
- Judul widget: `16px` `font-medium` + **garis brass 2px selebar 32px** di bawahnya (elemen signature).
- **5 item** berita terbaru (kecuali yang sedang dibuka — `where: { id: { not: currentId } }`).
- Tiap item baris horizontal, padding vertikal `12px`, border-bottom `slate-100`:
  - **Thumbnail** `72×56px`, `object-cover`, `rounded-md`, di sisi `start`.
  - **Judul** `14px` `font-medium`, `line-clamp-2`, hover `royal-600`.
  - **Tanggal** `12px` `slate-400`.
- Hover baris: bg `slate-50`.
- Tautan "Lihat semua →" di bawah widget.

**2. Widget Kategori** — daftar kategori + jumlah berita (`Berita (24)`).

**3. Widget Arsip** — per bulan/tahun (`Juli 2026 (12)`), lihat `11-B`.

**4. Widget Pencarian** — input cari berita.

**Mobile (<lg):** sidebar **pindah ke bawah** konten utama (bukan disembunyikan — pengguna mobile tetap butuh berita terbaru). Widget jadi full-width, urutan: Berita Terbaru → Kategori → Arsip. Sticky dimatikan.

---

## D. Sidebar halaman daftar

Sama seperti sidebar detail, tetapi tanpa "Berita Terbaru" (karena daftar utamanya sudah berita). Isinya: Pencarian → Kategori → Arsip → Tag populer.

---

## E. Yang diambil dari Unilam (dan yang tidak)

**Diambil:**
- Pola daftar → detail → sidebar berita terbaru (permintaan utama Anda).
- Breadcrumb konsisten di setiap halaman berita.
- Baris meta yang menampilkan **penulis dan tanggal** dengan jelas.
- Tombol "Selengkapnya" eksplisit di tiap kartu.
- Halaman `/berita` sebagai arsip tunggal yang mudah dijangkau dari beranda.

**Tidak diambil:**
- Menu "TAUTAN" sebagai keranjang serba-ada — kita sudah punya struktur menu 6 item yang rapi (`05`).
- Menautkan layanan penting (pengaduan PPKS, kotak saran) ke **Google Form / bit.ly eksternal**. FUSPI punya sistem tiket sendiri dengan kanal PPKS terlindungi (`14`) — jauh lebih aman dan terlacak.
- Judul berita ALL CAPS di navigasi.

---

## F. Catatan teknis

- **URL**: `/berita/[slug]` (bukan `/article/detail/[slug]`). Lebih pendek dan jelas.
- **Query sidebar**: ambil 5 berita terbaru `PUBLISHED`, `publishedAt <= now()`, kecuali berita saat ini. Cache ringan; `revalidatePath` saat ada berita baru.
- **generateMetadata()**: title, description dari `excerpt`, `og:image` dari `coverImage`, `article:published_time`, `article:author`. Wajib, agar tampilan bagus saat dibagikan di WhatsApp.
- **viewCount**: naikkan saat halaman detail dibuka (server action ringan, jangan blokir render).
- **Multibahasa**: judul/isi diambil dari terjemahan aktif dengan fallback ke `id` (`12-C`).
- **Reuse**: template yang sama dipakai untuk `/pengumuman/[slug]` dan `/kolom/[slug]`. Untuk Kolom, baris meta menampilkan **rubrik** (Dekan/Dosen/Mahasiswa).

---

## G. Perubahan pada dokumen lain

- **`05`** — halaman `/berita` dan `/berita/[slug]` kini memakai layout 2 kolom + sidebar (menggantikan deskripsi ringkas sebelumnya).
- **`17`** — tambah varian `PostCardHorizontal` (kartu halaman daftar) di samping `PostCard` (kartu beranda).
