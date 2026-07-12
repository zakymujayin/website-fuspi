# 03 — Design System

Warna utama **Royal Blue `#4169E1`** sudah ditetapkan pemilik proyek dan tidak diubah. Dokumen ini membangun identitas visual di sekitarnya. Ikuti token ini persis — jangan menambah warna, font, atau efek di luar yang tercantum. Konsistensi inilah yang membuat hasilnya terlihat intentional, bukan AI slop.

## Arah desain: "Dignified Academic Modern"

FUSPI menaungi kajian Al-Qur’an, hadis, aqidah dan filsafat Islam, studi agama-agama, serta tasawuf dan psikoterapi—institusi keilmuan yang membutuhkan kesan **kredibel, formal, tetapi tidak kaku/kuno**. Identitasnya: royal blue sebagai warna kepercayaan & keilmuan, navy dalam untuk kedalaman (header/footer), dan **aksen kuningan tembaga yang dipakai sangat hemat** hanya untuk penanda prestasi & akreditasi (mis. badge "Unggul"). Banyak ruang putih, tipografi tegas, tanpa gradient berlebihan.

**Aturan emas:** boldness dibelanjakan di satu tempat (aksen prestasi & hero), sisanya tenang dan disiplin.

## Palet warna

### Primer — Royal Blue
```
royal-50   #EEF2FE
royal-100  #E0E8FD
royal-200  #C7D4FB
royal-300  #A0B5F6
royal-400  #728EEF
royal-500  #4169E1   ← warna brand
royal-600  #3352C9   ← hover tombol
royal-700  #2A43A6   ← active/press, link
royal-800  #263A83
royal-900  #253667
royal-950  #182042
```

### Navy (permukaan gelap: topbar, footer, sidebar admin)
```
navy-800  #1E2A5A
navy-900  #16204A
navy-950  #0E1533
```

### Aksen — Kuningan/Brass (HEMAT: badge prestasi, akreditasi, garis emas kecil)
```
brass-400  #D6B45E
brass-500  #C79A3A   ← aksen utama
brass-600  #A87F28
```

### Netral (Slate)
```
slate-50   #F8FAFC   ← background halaman
slate-100  #F1F5F9   ← background section alternatif / hover baris
slate-200  #E2E8F0   ← border
slate-300  #CBD5E1   ← border input, divider
slate-400  #94A3B8   ← teks placeholder / muted
slate-500  #64748B   ← teks sekunder
slate-600  #475569
slate-700  #334155   ← teks body
slate-800  #1E293B
slate-900  #0F172A   ← heading
```

### Semantik (badge status, notifikasi)
```
success  #16A34A   bg #DCFCE7
warning  #D97706   bg #FEF3C7
danger   #DC2626   bg #FEE2E2
info     #4169E1   bg #E0E8FD
```

## Token CSS (`globals.css`)

Pakai variabel CSS + konvensi shadcn (HSL). Definisikan di `:root`:

```css
@layer base {
  :root {
    --background: 210 40% 98%;        /* slate-50 */
    --foreground: 222 47% 11%;        /* slate-900 */
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --primary: 225 73% 57%;           /* #4169E1 royal-500 */
    --primary-foreground: 0 0% 100%;
    --secondary: 210 40% 96%;         /* slate-100 */
    --secondary-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;  /* slate-500 */
    --accent: 41 57% 50%;             /* brass-500 */
    --accent-foreground: 0 0% 100%;
    --destructive: 0 72% 51%;         /* danger */
    --destructive-foreground: 0 0% 100%;
    --border: 214 32% 91%;            /* slate-200 */
    --input: 214 32% 87%;             /* slate-300 */
    --ring: 225 73% 57%;              /* royal */
    --radius: 0.625rem;               /* 10px basis */
  }
}
```

Petakan ke Tailwind di `tailwind.config.ts` (extend colors dengan skala `royal`, `navy`, `brass`, plus mapping shadcn `primary`, `accent`, dst.).

## Tipografi

Pasangan font dipilih sengaja, **bukan** kombinasi default:

- **Display / Heading — Plus Jakarta Sans.** Dipilih karena buatan foundry Indonesia (Tokotype) dan diberi nama Jakarta — ikatan lokal yang bermakna untuk institusi Indonesia, sekaligus modern dan tegas. Dipakai untuk semua heading dan judul.
- **Body / UI — Inter.** Netral, sangat terbaca pada teks panjang dan antarmuka admin.
- **Arab (UI & body) — IBM Plex Sans Arabic** (atau Noto Sans Arabic). WAJIB untuk mode bahasa Arab; Inter & Plus Jakarta Sans tidak punya glyph Arab yang layak. Aktif otomatis saat `html[dir="rtl"]`. Ekspos sebagai `--font-arabic-ui`. Naikkan `line-height` ke ~1.8 (diakritik butuh ruang).
- **Arab (kutipan ayat) — Amiri.** Untuk kutipan Qur'an/hadis di semua bahasa. Class `.font-arabic` + `dir="rtl"` `lang="ar"`.

Muat lewat `next/font/google` di root layout, ekspos sebagai variabel CSS (`--font-display`, `--font-body`, `--font-arabic`).

### Skala tipe
```
Display XL  48/52px  Plus Jakarta Sans  700   (hero judul)
H1          36/40px  Plus Jakarta Sans  700
H2          28/34px  Plus Jakarta Sans  700
H3          22/28px  Plus Jakarta Sans  600
H4          18/26px  Plus Jakarta Sans  600
Body-lg     18/30px  Inter              400
Body        16/26px  Inter              400   (default)
Small       14/20px  Inter              400
Caption     12/16px  Inter              500   (uppercase, tracking-wide, slate-500)
```
Body text panjang (isi berita/halaman) diberi `max-width: 72ch` untuk keterbacaan.

## Spacing, radius, bayangan

- **Grid 8px.** Semua padding/margin kelipatan 4px, dominan 8/16/24/32/48/64.
- **Container:** `max-width: 1200px`, padding samping 24px (mobile 16px).
- **Radius:** kartu `rounded-xl` (12px), tombol & input `rounded-lg` (8px), badge `rounded-full`. Konsisten — jangan campur.
- **Bayangan** (halus, berlapis — bukan drop-shadow tebal):
  ```
  shadow-sm  0 1px 2px rgba(15,23,42,.06)
  shadow-md  0 4px 12px rgba(15,23,42,.08)
  shadow-lg  0 12px 32px rgba(15,23,42,.10)
  ```

## Aturan komponen

**Tombol**
- Primer: bg `royal-500`, teks putih, hover `royal-600`, active `royal-700`. `rounded-lg`, tinggi 40px, padding-x 16px, `font-medium`.
- Sekunder: bg putih, border `slate-300`, teks `slate-700`, hover bg `slate-100`.
- Ghost: transparan, hover bg `slate-100`.
- Destruktif: bg `danger`, teks putih.
- Fokus keyboard wajib terlihat: `ring-2 ring-royal-500 ring-offset-2`.

**Input & form**
- Border `slate-300`, `rounded-lg`, tinggi 40px, fokus border `royal-500` + ring tipis.
- Label `font-medium text-slate-700 text-sm`, error `text-danger text-sm` di bawah field.

**Kartu**
- bg putih, border `slate-200`, `rounded-xl`, `shadow-sm`, padding 24px. Hover kartu berlink: naik `shadow-md` + translate-y kecil.

**Badge status** (pill, `rounded-full`, text-xs font-medium):
- Published → success · Draft → slate · Archived → warning.
- Akreditasi "Unggul" → gunakan **brass** (satu-satunya tempat brass sebagai fill mencolok).

**Tabel admin**
- Header `bg-slate-50 text-slate-500 text-xs uppercase tracking-wide`, baris border-bottom `slate-100`, hover baris `bg-slate-50`. Padding sel 12px 16px. Zebra tidak perlu.

## Layout panel admin

- **Sidebar kiri** lebar 260px, `bg-navy-900`, teks `slate-300`, item aktif `bg-royal-500/15 text-white` dengan garis kiri `royal-400` 3px. Logo fakultas di atas.
- **Topbar** tinggi 60px, bg putih, border-bottom `slate-200`: judul halaman di kiri, avatar + menu user di kanan.
- **Area konten** `bg-slate-50`, padding 32px, `max-width` 1200px.
- **Dashboard**: baris kartu statistik (jumlah berita, halaman, dosen, media) memakai angka besar + label kecil + ikon lucide dalam kotak `royal-50`. Di bawahnya: daftar 5 berita terbaru + tombol aksi cepat.

## Panduan anti-slop (WAJIB dipatuhi agen)

1. **Jangan** memakai gradient hero ungu-biru generik, blob dekoratif acak, atau emoji sebagai ikon.
2. **Jangan** menaruh nomor 01/02/03 besar kecuali kontennya memang urutan langkah.
3. Hero beranda **bukan** "angka besar + gradient". Gunakan foto gedung/kegiatan FUSPI berkualitas + judul tegas + 1 CTA.
4. Satu aksen saja (brass) dan dipakai jarang. Jangan warna-warni.
5. Ikon konsisten dari satu set (lucide), ukuran & stroke seragam (1.5px stroke, 20px).
6. Kualitas dasar tanpa diminta: responsif hingga mobile, fokus keyboard terlihat, `prefers-reduced-motion` dihormati, kontras teks memenuhi WCAG AA.
7. Animasi seperlunya: reveal halus saat scroll di beranda, transisi hover 150ms. Tidak ada animasi berlebihan.

## Elemen signature

**Garis kuningan tipis (2px) di bawah setiap judul section publik**, sepanjang ± 48px, rata kiri judul. Detail kecil ini konsisten di seluruh situs, memberi kesan "resmi & terkurasi" khas dokumen akademik, tanpa ramai. Ini satu-satunya ornamen tetap.

## Responsif & mobile (WAJIB — tidak ada toleransi)

> **PERINGATAN RTL:** situs ini multibahasa (ID/EN/AR) dengan **Arabic RTL**. Seluruh aturan tata letak di bawah **wajib memakai CSS logical properties** (`ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`/`start-`/`end-`) — **JANGAN** pakai `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`. Font Arab, arah ikon, dan pencerminan tata letak diatur di **`12-multibahasa-rtl.md`** (bagian E) — baca dokumen itu bersama dokumen ini.

Situs **harus** sempurna di mobile. Tidak boleh ada gambar/konten yang terpotong, meluber keluar layar, atau wrapping yang berantakan. Ini syarat lulus, bukan tambahan.

**Prinsip:**
- **Mobile-first.** Rancang untuk layar 360px dulu, lalu perbesar. Breakpoint Tailwind: `sm 640 · md 768 · lg 1024 · xl 1280`.
- **Tidak boleh ada horizontal scroll** pada halaman mana pun. Uji: buka di 360px, tidak ada geser samping.

**Gambar (tidak boleh terpotong/meluber):**
- Semua gambar pakai `next/image` dengan `width`/`height` dari record `Media`, dibungkus kotak **aspect-ratio tetap** (mis. `aspect-video` untuk sampul, `aspect-square` untuk foto dosen) + `object-cover` + `object-position` fokus. Ini mencegah crop tak terduga dan layout shift.
- Gambar tidak pernah melebihi lebar kontainer: `max-w-full h-auto`. Gambar dalam konten artikel yang di-set posisi kiri/kanan (`09-A`) **otomatis jadi full-width di bawah `sm`** (float dilepas di mobile) agar teks tidak terjepit.
- Logo marquee kerjasama: tinggi logo diskalakan turun di mobile, tetap dalam satu baris berjalan, tidak terpotong.

**Teks (tidak boleh wrapping berantakan):**
- Judul panjang dibatasi `line-clamp-2`/`line-clamp-3` di kartu agar tinggi kartu seragam.
- Kata sangat panjang / URL diberi `break-words` supaya tidak menembus kontainer.
- Ukuran font mengecil bertahap di mobile (mis. hero `text-3xl` di mobile → `text-5xl` di desktop). Jangan biarkan heming besar memenuhi layar kecil.

**Grid & layout (turun rapi, tidak ada item yatim miring):**
- Grid selalu punya jenjang jelas: 4 kolom (desktop) → 2 (tablet) → 1 (mobile). Contoh: kartu berita, prodi, dosen.
- Gunakan `gap` konsisten; jangan ada elemen yang menggantung setengah keluar.
- Section 2 kolom (mis. Sambutan Dekan) menjadi tumpukan 1 kolom di mobile dengan urutan logis (teks/gambar).

**Tabel (data akreditasi, kerjasama, tabel admin):**
- Bungkus tabel dalam `overflow-x-auto` sehingga tabel lebar bisa digeser **di dalam** wadahnya tanpa merusak layout halaman; ATAU ubah jadi tampilan kartu bertumpuk di mobile. Jangan pernah memaksa tabel lebar memecah tata letak.

**Navigasi:**
- Di bawah `md`, menu utama berubah jadi **hamburger → drawer** dengan sub-menu accordion (lihat bagian navigasi di `05`). Topbar link ikut masuk drawer.
- Target sentuh minimal **44×44px**.

**Panel admin di mobile:**
- Sidebar jadi **off-canvas drawer** (tombol hamburger di topbar). Area konten full-width.
- Semua `DataTable` dibungkus `overflow-x-auto`. Form satu kolom penuh di mobile. Media library grid: 4 kolom → 2 di mobile.

**Verifikasi wajib sebelum selesai:** cek setiap halaman (publik & admin) pada lebar **360, 390, 768, 1024, 1440px**. Tidak boleh ada: horizontal scroll halaman, gambar terpotong aneh, teks menembus tepi, kartu tinggi-timpang, atau elemen tumpang tindih.
