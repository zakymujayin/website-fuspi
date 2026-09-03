# 26 — Kontrak IA Publik & Brief Desain FUSPI

Dokumen ini adalah sumber utama untuk struktur informasi, narasi beranda, dan arah visual publik FUSPI. Dokumen ini tidak mengubah kontrak model data atau komponen yang sudah ada. Jika implementasi memerlukan enum, schema, navigasi bersama, token global, atau dependensi baru, buka task kontrak terpisah sebelum task UI.

## A. Keputusan produk yang mengikat

1. Situs diluncurkan sebagai produk FUSPI yang baru. Konten awal dimasukkan manual melalui CMS dan disetujui pemilik konten.
2. Tidak ada impor artikel, halaman, media, metadata, maupun daftar URL dari situs terdahulu sebagai syarat v1.
3. Situs referensi eksternal dipakai hanya untuk memahami jenis informasi yang perlu mudah ditemukan. Identitas, teks, data, orang, kontak, statistik, program, media, URL, layout, tema, dan komposisi visualnya tidak boleh disalin.
4. Tiga program studi aktif v1, dalam urutan resmi, adalah IAT, IH, dan AFI. Nama lengkap dan metadata harus selalu dibaca dari `src/config/institution.ts`.
5. Konten publik tidak boleh mengarang nama pimpinan, angka statistik, sejarah, capaian, akreditasi, alamat, kontak, atau klaim institusional.
6. Semua bagian beranda dapat disusun ulang, disembunyikan, dan diedit dari admin. Bagian tanpa konten valid tidak boleh menampilkan data contoh seolah-olah nyata.

## B. Prinsip pengalaman

Situs harus terasa seperti ruang pengetahuan kontemporer: tenang, berwibawa, terbuka, dan mudah dipindai. Pengunjung datang dengan tiga kebutuhan utama:

- memahami identitas, arah, kepemimpinan, dan program FUSPI;
- menemukan berita, agenda, dokumen, serta layanan dengan cepat;
- mengambil tindakan menuju PMB, layanan akademik, pengaduan, atau kontak resmi.

Struktur informasi boleh mempertahankan kategori yang telah familier bagi pemangku kepentingan, tetapi pengalaman visualnya harus berdiri sendiri. Hindari tampilan tema portal kampus generik, deretan kartu seragam, ornamen berlebihan, carousel yang mendominasi, dan halaman statis berupa satu blok rich text panjang.

## C. Arsitektur navigasi publik

Navigasi dibagi menjadi tiga lapis agar kategori yang luas tetap mudah dipahami.

### 1. Bar konten

`Berita · Pengumuman · Sorotan Akademik · Agenda · Album · Dokumen`

Bar ini memberi akses langsung ke konten yang sering diperbarui tanpa membebani menu institusional.

### 2. Utilitas

`Calon Mahasiswa · Portal PMB · SILA · SIAKAD · E-Learning · GKM · ID/EN/AR`

- `Calon Mahasiswa` membuka hub internal.
- Tautan eksternal diberi ikon dan label aksesibilitas yang jelas.
- URL SILA hanya dibaca dari `NEXT_PUBLIC_SILA_URL`; jangan menebaknya atau menaruhnya langsung di kode.

### 3. Menu institusional

```text
PROFIL
├── Profil Fakultas
├── Sejarah
├── Visi, Misi, Tujuan & Strategi
├── Pimpinan & Struktur Organisasi
├── Dosen
├── Tenaga Kependidikan
├── Fasilitas
└── Profil Lulusan

AKADEMIK
├── Program Studi
│   ├── Ilmu Al-Qur'an dan Tafsir (IAT)
│   ├── Ilmu Hadis (IH)
│   └── Aqidah dan Filsafat Islam (AFI)
├── Jadwal Perkuliahan
├── Kalender Akademik
├── Kurikulum
├── Mata Kuliah per Tahun Ajaran
├── Monitoring & Evaluasi
├── Tugas Akhir, Sidang & Yudisium
├── Dokumen Akademik
├── Akreditasi
└── Pedoman Akademik

PENELITIAN & PKM
├── Penelitian Dosen
├── Penelitian Mahasiswa
├── Pengabdian Dosen
├── Pengabdian Mahasiswa
├── Panduan Teknis
├── Pusat Studi & Laboratorium
└── Jurnal

KEMAHASISWAAN
├── Beasiswa
├── Prestasi
├── Kegiatan Mahasiswa
├── Organisasi Mahasiswa
└── Alumni & Tracer Study

KERJA SAMA
├── Internasional
├── Nasional
└── Lokal

AKREDITASI

LAYANAN
├── Informasi Layanan
├── Pengaduan & Lacak Pengaduan
├── Peminjaman & Jadwal Ruangan
├── Survei Kepuasan
├── FAQ
├── Kontak
├── Status Layanan
└── PPID
```

`Layanan` adalah kategori eksplisit pengganti menu penampung yang ambigu. `Akreditasi` mudah ditemukan di bawah Akademik karena konteksnya melekat pada mutu pendidikan, sedangkan tiga program aktif tetap muncul sebagai submenu Akademik dan akses cepat kontekstual pada beranda.

Pada mobile, ketiga lapis masuk ke satu drawer dengan bagian yang jelas, submenu accordion, target sentuh minimum 44 px, fokus keyboard terkelola, dan language switcher di bagian awal.

## D. Narasi beranda

Beranda bukan daftar semua modul. Urutannya membentuk perjalanan dari pengenalan menuju bukti, informasi terbaru, lalu tindakan. Urutan dapat diubah admin, tetapi susunan awal yang direkomendasikan adalah:

1. **Hero editorial** — satu pesan utama, satu media FUSPI, dan maksimal dua CTA. Hindari slider ramai; bila memakai beberapa slide, kontrol manual harus jelas dan autoplay berhenti sesuai preferensi gerak pengguna.
2. **Akses cepat** — enam sampai delapan tindakan prioritas seperti layanan, pengaduan, survei, jurnal, PMB, dan e-learning.
3. **Sambutan Dekan** — foto resmi, nama, jabatan, kutipan singkat, dan tautan ke sambutan lengkap.
4. **FUSPI dalam angka** — minimal mahasiswa, dosen, dan tenaga kependidikan; hanya tampil setelah angkanya diverifikasi.
5. **Pengantar fakultas** — ringkasan identitas dan arah ke profil, visi-misi, serta struktur organisasi.
6. **Program studi** — tiga program aktif dalam urutan kontrak, dengan deskripsi singkat dan CTA detail.
7. **Informasi & pengumuman** — daftar ringkas yang mengutamakan keterbacaan tanggal dan status.
8. **Layanan** — kelompok layanan akademik, umum, laboratorium, dan pengaduan berdasarkan kebutuhan pengguna.
9. **Berita terbaru** — satu berita utama dan beberapa berita pendamping, bukan grid kartu identik.
10. **Kerja sama** — logo atau daftar mitra aktif yang memiliki data dan aset resmi.
11. **Sorotan akademik & opini** — pilihan karya atau kolom Dekan, dosen, dan mahasiswa.
12. **Video** — tur, profil, atau liputan resmi; gunakan poster image dan persetujuan cookie bila embed pihak ketiga memerlukannya.
13. **Agenda** — agenda mendatang dengan tanggal, lokasi, dan CTA detail.
14. **Testimoni/alumni** — opsional dan tersembunyi sampai tersedia kutipan serta izin penggunaan identitas.
15. **CTA akhir** — ajakan menuju hub calon mahasiswa atau PMB yang URL-nya telah dikonfigurasi.

### Aturan konten beranda

- Teks, angka, gambar, video, urutan, visibilitas, dan batas jumlah item dikelola dari admin.
- Tidak ada angka contoh, foto stok yang menyiratkan afiliasi, atau nama orang rekaan di produksi.
- Bagian otomatis hanya membaca record berstatus publik.
- Jika data kosong, sembunyikan bagian yang tidak esensial. Untuk daftar yang memang dibuka langsung oleh pengguna, tampilkan empty state yang jujur dan memberi langkah berikutnya.
- Foto Dekan dan media hero memakai aset resmi FUSPI dengan alt text bermakna.

## E. Brief template halaman

### Profil fakultas dan sejarah

Gunakan pembuka ringkas, fakta utama yang telah disetujui, lalu narasi bertahap. Sejarah sebaiknya memakai timeline responsif, bukan paragraf panjang. Jangan mengisi hubungan kelembagaan atau tanggal sebelum materi resmi tersedia.

### Visi, misi, tujuan, dan strategi

Visi menjadi pernyataan fokus di bagian awal. Misi ditampilkan sebagai daftar bernomor; tujuan dan strategi dipetakan sebagai pasangan yang dapat dipindai. Sediakan anchor navigation untuk empat bagian dan pertahankan struktur semantik heading.

### Pimpinan dan struktur organisasi

Pisahkan bagan organisasi, profil pimpinan, dan direktori unit. Bagan harus tetap terbaca tanpa zoom dan memiliki representasi teks/tabel yang aksesibel. Profil hanya tampil setelah nama, jabatan, foto, dan persetujuan publikasi tersedia.

### Dosen dan tenaga kependidikan

Gunakan direktori dengan pencarian serta filter yang relevan. Kartu ringkas mengarah ke profil; jangan mengekspos data pribadi. Empty state membedakan “belum ada data publik” dari hasil filter yang kosong.

### Fasilitas

Kelompokkan menurut fungsi. Setiap fasilitas memerlukan nama, deskripsi, media resmi, aksesibilitas dasar, dan informasi penggunaan bila relevan. Hindari galeri tanpa konteks.

### Program studi

Ketiga halaman memakai kerangka konsisten: identitas, deskripsi, visi/keunggulan yang disetujui, kurikulum atau fokus kajian, profil lulusan, pengelola/kontak resmi, dokumen, berita terkait, dan CTA. Konten spesifik tidak boleh disalin antarprogram sebagai pengisi.

### Akademik dan akreditasi

Utamakan pencarian dokumen, kategori, tahun, ukuran berkas, dan tanggal pembaruan. Status akreditasi hanya ditampilkan dari data terverifikasi dan disertai dokumen sumber yang memang boleh dipublikasikan.

### Penelitian, PkM, kemahasiswaan, dan kerja sama

Gunakan landing tematik dengan sorotan terbaru, filter, dan akses ke arsip. Kerja sama dibagi Internasional, Nasional, dan Lokal. Logo mitra hanya tampil bila ada record aktif dan aset resmi.

### Layanan

Gunakan task-oriented layout: nama kebutuhan, ringkasan, persyaratan, langkah, waktu layanan bila ada, kanal resmi, dan CTA. Jangan menjanjikan SLA yang belum disetujui.

## F. Arah visual: “Ruang Nalar FUSPI”

Konsep visual adalah editorial institusional kontemporer—lapang, bernalar, dan hangat—bukan reproduksi tema situs referensi.

- **Komposisi:** grid editorial asimetris dengan satu fokus kuat per section, whitespace lega, dan ritme halaman bervariasi. Tidak semua informasi dimasukkan ke kartu.
- **Warna:** gunakan token institusi yang sudah disetujui. Navy/royal menjadi jangkar, permukaan terang yang hangat menjaga keterbacaan, dan brass dipakai hemat sebagai penanda, bukan dekorasi dominan. Hindari gradient generik.
- **Tipografi:** pertahankan kontrak font global yang berlaku. Bentuk karakter ditekankan lewat perbedaan skala, berat, panjang baris, dan ruang; jangan menambah font tanpa task desain-sistem.
- **Citra:** foto nyata FUSPI dengan sudut dokumenter—aktivitas akademik, ruang, artefak, dan manusia—bukan stok korporat. Crop harus menjaga subjek dan memiliki focal point.
- **Bentuk:** garis halus, bidang datar, radius terkendali, dan bayangan seperlunya. Hindari kumpulan kartu rounded dengan shadow yang seragam.
- **Gerak:** transisi singkat untuk orientasi, bukan tontonan. Count-up, marquee, dan carousel harus mematuhi `prefers-reduced-motion`.
- **Ikon:** konsisten, fungsional, dan tidak menggantikan label teks penting.

### Ritme beranda yang disarankan

Hero memakai bidang gambar besar dengan judul yang tidak lebih dari tiga baris pada laptop kecil. Akses cepat menjadi strip utilitas yang padat. Sambutan Dekan bergeser ke komposisi potret-editorial. Statistik menjadi jeda visual. Berita memakai hirarki satu utama plus daftar, sedangkan program studi dapat memakai nomor atau kode besar sebagai sistem identitas. Pergantian ritme inilah yang membuat halaman terasa dirancang, bukan disusun dari template.

## G. Multibahasa, RTL, aksesibilitas, dan performa

- ID wajib lengkap. EN dan AR boleh fallback sesuai kontrak locale, tetapi fallback harus terlihat konsisten dan tidak menghasilkan campuran arah teks.
- Gunakan properti/logical utilities `start/end`, `ms/me`, dan `ps/pe`. Arabic bekerja RTL sejak implementasi pertama.
- Urutan fokus mengikuti urutan visual dan DOM. Semua menu, drawer, dialog, carousel, tab, serta accordion dapat digunakan dengan keyboard.
- Kontras, ukuran sentuh, label form, error state, caption, dan alt text mengikuti WCAG AA.
- Jangan menyampaikan informasi hanya melalui warna, animasi, atau ikon.
- Media memiliki dimensi untuk mencegah layout shift, format responsif, dan prioritas pemuatan yang tepat.
- Embed dan skrip pihak ketiga dimuat hanya ketika dibutuhkan dan tunduk pada kontrak consent.

## H. Kesiapan konten awal manual

Sebelum go-live, pemilik konten memasukkan dan menyetujui:

- identitas, profil, sejarah, visi, misi, tujuan, dan strategi;
- nama, jabatan, foto, dan sambutan Dekan;
- struktur organisasi, pimpinan, dosen, serta tenaga kependidikan yang boleh dipublikasikan;
- tiga program studi aktif beserta deskripsi dan dokumen resminya;
- angka mahasiswa, dosen, dan tenaga kependidikan beserta tanggal verifikasi;
- fasilitas, layanan, kontak, dokumen akademik, dan akreditasi;
- minimal media hero yang resmi, quick links, dan CTA yang tujuannya valid;
- berita, pengumuman, agenda, kerja sama, opini, serta video bila tersedia.

Berita lama tidak perlu dimasukkan untuk memenuhi go-live. Modul dinamis boleh diluncurkan tanpa isi sepanjang section beranda terkait disembunyikan dan halaman arsip memiliki empty state yang layak.

## I. Batas implementasi dan pembagian task

1. **GPT contract task:** perubahan enum section, schema, seed struktural, registry navigasi, route contract, atau shared configuration.
2. **Claude UI task:** sistem visual dan implementasi beranda serta template halaman publik setelah kontrak dibekukan.
3. **DeepSeek domain/CMS task:** form dan CRUD konten non-sensitif, validasi kelengkapan, fixture netral, serta pengujian content readiness.

Task UI tidak boleh mengubah shared contract secara terselubung. Task CMS tidak boleh mengisi data institusional rekaan agar tampilan terlihat penuh.

## J. Uji terima desain dan konten

- [ ] Semua label dan program mengikuti identitas FUSPI serta urutan kontrak.
- [ ] Menu desktop, mobile, keyboard, dan RTL memuat kategori yang sama tanpa item terputus.
- [ ] Beranda memprioritaskan hero, sambutan Dekan, statistik, pengantar fakultas, program, informasi, layanan, berita, dan CTA.
- [ ] Halaman visi-misi, organisasi, direktori SDM, fasilitas, dan program studi memakai template khusus, bukan satu rich-text generik.
- [ ] Visual tidak menyalin layout, tema, media, atau komposisi situs referensi.
- [ ] Semua konten faktual berasal dari input manual yang disetujui; tidak ada data contoh yang tampak nyata.
- [ ] Section kosong tersembunyi atau memiliki empty state yang jujur tanpa layout rusak.
- [ ] Tidak ada URL integrasi yang ditebak atau di-hardcode.
- [ ] Audit axe, keyboard, reduced motion, kontras, responsive layout, dan RTL lulus pada route prioritas.
- [ ] Crawl route publik tidak menemukan tautan internal rusak sebelum go-live.
