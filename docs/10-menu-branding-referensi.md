# 10 — Menu Builder, Branding, Fitur Lanjutan & Referensi

Dokumen ini melengkapi permintaan: menu drag & drop, pengaturan branding (logo), penegasan peran berbasis kepemilikan, editor rich-text modern, dan referensi desain website universitas yang dirancang khusus.

---

## A. Menu Builder (drag & drop)

Halaman `/admin/menu` adalah pembangun navigasi visual, bukan sekadar tabel.

### Kemampuan
- **Tambah** item menu (label, URL/rute, lokasi, tandai eksternal & buka tab baru).
- **Hapus** item (dengan konfirmasi; menghapus induk menghapus anaknya — sudah diatur `onDelete: Cascade` di skema).
- **Urutkan dengan drag** — seret item ke atas/bawah untuk mengubah urutan.
- **Buat sub-menu dengan drag** — seret item ke dalam item lain untuk menjadikannya anak (maksimal 2 level, sesuai navigasi FUSPI).
- Tiga tab lokasi: **Bar Konten**, **Topbar**, **Header** (menu utama), **Footer** — sesuai `MenuLocation` di `02` dan struktur navigasi di `05`.

### Implementasi
- Library: **`@dnd-kit/core`** + `@dnd-kit/sortable` (ringan, aksesibel, mendukung keyboard). Jangan pakai library drag lawas.
- Struktur data: pohon dari `MenuItem` (root = `parentId: null`, urut `order`).
- Saat drop, kirim **seluruh susunan baru** ke satu server action `reorderMenu(location, items)` yang menulis ulang `order` dan `parentId` dalam satu transaksi Prisma. Hindari banyak request kecil.
- Optimistic update di UI, lalu `revalidatePath("/")` agar navigasi publik ikut berubah.
- Aksesibilitas: sediakan juga tombol panah naik/turun sebagai alternatif drag (untuk keyboard/mobile).

### Pola reorder yang dapat dipakai ulang
Field `order` juga ada di `HomeSlider`, `QuickLink`, `Lecturer`, `Partnership`, `Service`, `Page`. Bangun komponen `SortableList` generik sekali, lalu pakai di semua modul tersebut agar admin bisa mengurutkan slider, logo mitra, dosen, dll. dengan drag yang sama.

---

## B. Branding & Pengaturan Situs (ganti logo, dll.)

Di `/admin/pengaturan`, ADMIN dapat mengubah identitas situs tanpa menyentuh kode:

- **Logo** — upload via media picker → `SiteSetting.logo`. Tampil di navbar & footer. Sediakan pratinjau langsung.
- **Favicon** — upload ikon situs (opsional; simpan sebagai field tambahan atau file tetap).
- **Nama fakultas & tagline**.
- **Warna aksen** (opsional lanjutan) — bila ingin admin bisa mengubah warna utama kelak, simpan sebagai variabel; namun default tetap Royal Blue `#4169E1` sesuai `03`. Untuk versi awal, warna dikunci di kode; cukup logo & teks yang bisa diubah.
- **Kontak** — alamat 2 kampus, email, telepon.
- **Sosial media** — URL Facebook, Instagram, YouTube, Twitter.
- **Sambutan Dekan** — nama, foto, pesan.
- **Statistik** — jumlah mahasiswa/dosen/tendik (angka di beranda).
- **Video beranda** — URL YouTube + judul (lihat `09-D`).

Semua tersimpan di baris singleton `SiteSetting` (id `"singleton"`). Form tunggal, tombol "Simpan Perubahan".

---

## C. Editor rich-text modern (penegasan)

Editor (`09-A`) harus memberi kontrol editorial yang lengkap dan konsisten:

- Format teks penuh: heading H2–H4, tebal, miring, garis bawah, coret, subscript/superscript, warna teks (opsional), highlight.
- Perataan paragraf: kiri/tengah/kanan/rata kanan-kiri.
- Daftar berurutan & tak berurutan, indentasi.
- Kutipan (blockquote), garis pemisah, kode.
- Tautan dengan opsi buka tab baru.
- **Gambar dalam konten dengan posisi kiri/tengah/kanan + atur lebar** (inti permintaan — lihat `09-A`).
- Sisip video YouTube, sisip tabel.
- Tempel dari Word/Google Docs yang dibersihkan (paste sebagai teks bersih).
- Hitungan kata & estimasi waktu baca.
- Simpan sebagai **Draft** atau **Terbit**; draft tidak tampil publik.

Simpan HTML tersanitasi; render di publik lewat komponen `Prose` berbasis token `03`.

---

## D. "Dan masih banyak lagi" — fitur yang melengkapi CMS

Distilasi dari praktik situs universitas terbaik (lihat referensi di bawah). Terapkan yang relevan:

- **Log aktivitas / audit** — catat siapa mengubah apa & kapan (ringan: tabel `ActivityLog`), berguna untuk tata kelola multi-editor.
- **Pencarian global di admin** — cari cepat lintas berita/halaman/dosen.
- **Pencarian & filter publik** — cari berita, filter dosen per prodi, filter penelitian per tahun.
- **Menu berbasis audiens** (pola Duke) — CTA jelas untuk "Calon Mahasiswa" (PMB), "Mahasiswa" (SIAKAD/E-Learning), "Dosen".
- **Cerita visual** — beranda menonjolkan foto kampus/kegiatan berkualitas; video diselipkan tanpa mendominasi (pola Hull/Lesley).
- **Aksesibilitas WCAG 2.2 AA** — fokus keyboard terlihat, kontras cukup, navigasi keyboard penuh (pola SOAS).
- **Breadcrumb** di halaman dalam, **sitemap.xml**, **RSS feed** berita (opsional).
- **Statistik pengunjung** — hitungan tampilan per berita (`viewCount`) + ringkasan sederhana di dashboard.
- **Registry redirect aman** — tersedia untuk perubahan URL FUSPI di masa depan; cegah loop dan redirect chain. Tidak ada kewajiban memuat daftar URL dari sistem terdahulu.
- **Mode pemeliharaan** (opsional) — banner/halaman saat update besar.

---

## E. Referensi desain — website universitas/fakultas custom

Situs higher-ed yang kuat mengandalkan konten terstruktur, akses berbasis peran, dan design system yang konsisten. Situs yang kacau biasanya bermasalah pada tata kelola dan pemodelan konten, bukan sekadar teknologi. Arah visual FUSPI yang mengikat berada di `26`.

### Referensi paling relevan untuk FUSPI (kampus keislaman)
- **Zaytuna College** — kampus liberal arts Muslim terakreditasi pertama di AS; desain bersih dan elegan yang memadukan tradisi keilmuan Islam dan Barat, dengan akses mudah ke kurikulum, profil dosen, dan program. Acuan utama untuk nuansa akademik-keislaman yang modern.

### Prinsip desain yang diadopsi ke `03`
- **Warna dipakai hemat.** Pada situs Carleton, warna biru brand menjadi jangkar tetapi dipakai secukupnya sehingga foto dan konten yang membawa bobot emosional; hasilnya modern, terstruktur, dan terpercaya. Ini persis strategi Royal Blue + brass hemat di `03`.
- **Kesetimbangan gravitas & modern.** Perpaduan wibawa institusional dan desain web kontemporer menjadi tolok ukur bagaimana universitas mapan menampilkan diri.
- **Ruang bernapas & video terselip.** Situs terbaik memberi konten ruang untuk bernapas alih-alih menjejalkan informasi, dan memanfaatkan video di titik-titik kunci tanpa membiarkannya mendominasi.
- **Minimalis, konten yang jadi fokus.** Desain minimalis menjaga fokus pada hal terpenting — kontennya sendiri — didukung hierarki visual, tipografi baik, dan ruang putih.
- **Konsistensi branding di semua halaman.** Setiap halaman mengikuti branding dan gaya desain yang sama, memberi tingkat konsistensi yang menjadi ciri universitas papan atas dan memperkuat kesan profesional.
- **Carousel berita/acara vertikal** untuk menjaga beranda tetap dinamis (pola VCU), selaras dengan section berita & agenda kita.

### Galeri inspirasi (untuk dilihat sendiri)
- Numiko — "Best University Websites 2026" (SOAS, Ravensbourne — contoh custom-built beraksesibilitas AA).
- Ingeniux — "Higher Education Website Design 2026" (Amherst, Bowdoin, Carleton — minimalis akademik).
- Blacksmith & CyberOptik — kompilasi 20–30 situs universitas terbaik.

> Catatan: ambil prinsipnya (ruang putih, warna hemat, tipografi tegas, foto kuat, navigasi jelas), jangan meniru mentah. Identitas FUSPI sudah dikunci di `03` (Royal Blue #4169E1 + Plus Jakarta Sans + aksen brass + garis signature).

---

## F. Ringkasan pembaruan pada dokumen lain

- **`02`** — ditambah: `Post.isFeatured/metaTitle/metaDesc/tags`, model `Tag`, `Event`, `QuickLink`, `Subscriber`, `ActivityImage`, field video di `SiteSetting`.
- **`04`** — tabel otorisasi diganti ke model kepemilikan; menu builder drag & drop.
- **`06`** — middleware membatasi EDITOR ke rute berita; `requireOwnPost()` menegakkan kepemilikan.
- **`09`** — editor lengkap (gambar berposisi), import massal, section beranda tambahan.
- **`10`** (dokumen ini) — menu builder, branding, fitur lanjutan, referensi.
