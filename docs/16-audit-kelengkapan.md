# 16 — Audit Kelengkapan Fitur (Final)

Perbandingan menyeluruh antara dokumentasi ini dengan kebutuhan website fakultas/universitas pada umumnya (referensi: NN/g, Modern Campus, Kanopi, Optasy, situs UIN Suka, Zaytuna, dan situs FUDA sebagai referensi eksternal—bukan identitas target).

## ✅ Sudah lengkap

### Manajemen konten (CMS)
| Fitur | Dok |
|---|---|
| Berita, Pengumuman, Kolom (+ draft, jadwal terbit, unggulan, pratinjau) | 04, 09 |
| Halaman statis hierarkis | 04 |
| Editor sekelas WordPress (gambar berposisi, tabel, embed, paste bersih) | 09-A, 10-C |
| Media library + picker + upload native Hostinger | 04, 07 |
| Arsip berita (per bulan/tahun/kategori/tag) | 11-B |
| Album foto + lightbox | 11-D |
| Dokumen + **render PDF inline** | 11-C |
| Import massal dosen + foto (CSV/XLSX) | 09-B |
| Menu builder drag & drop (4 lokasi) | 10-A |
| Branding: ganti logo, favicon, kontak, sosial media | 10-B |
| Multibahasa ID/EN/AR + **RTL penuh** | 12 |

### Konten akademik
| Fitur | Dok |
|---|---|
| Program studi berlapis (CPL, profil lulusan, prospek karier, kurikulum) | 13-E |
| Direktori dosen (grid → detail bio, office hours) gaya Zaytuna | 11-A |
| Tenaga kependidikan | 04 |
| Penelitian & Pengabdian (PkM) | 04 |
| Pusat Studi, Laboratorium, Ormawa (`Unit`) | 02 |
| Akreditasi, kalender akademik, pedoman | 05 |
| Kerjasama (+ ekspor CSV untuk akreditasi) | 04 |
| Interlinking (dosen ↔ publikasi ↔ berita ↔ prodi) | 13-D |

### Kemahasiswaan & publik
| Fitur | Dok |
|---|---|
| Beasiswa, Prestasi, Kegiatan | 04 |
| **Agenda/Events** | 09-D |
| Testimoni alumni + data outcome | 13-C |
| FAQ | 13-B |
| Pencarian (autocomplete, FULLTEXT, lintas tipe) | 13-F |

### Layanan (pembeda FUSPI)
| Fitur | Dok |
|---|---|
| **Pengaduan bertiket** (kategori, prioritas RENDAH–URGENT, SLA, pelacakan) | 14 |
| **Kanal PPKS terlindungi** (akses terisolasi, anonim, audit log) | 14-D |
| **Peminjaman ruangan + kalender jadwal publik** (deteksi bentrok) | 15 |
| Kontak + peta, Survei kepuasan | 13-A |
| PPID | 05 |

### Teknis & tata kelola
| Fitur | Dok |
|---|---|
| Peran: ADMIN, EDITOR (kepemilikan), PETUGAS, SATGAS_PPKS | 06, 14 |
| Aksesibilitas WCAG 2.2 AA + pernyataan aksesibilitas | 13-G |
| Mobile ketat (tidak boleh terpotong/wrapping berantakan) | 03 |
| SEO: metadata, sitemap, hreflang, RSS | 05, 12-G |
| Keamanan: security headers, CSP, sanitasi HTML, rate limit | 13-J |
| Analytics + cookie consent + kebijakan privasi | 13-I |
| Backup DB **dan folder uploads**, uji restore | 13-K |
| **Redirect URL WordPress lama** (jangan sampai SEO mati) | 13-K |
| Log aktivitas admin | 10-D |
| 404/500, sitemap HTML | 13-H |

---

## ⚠️ Sengaja TIDAK dibangun (keputusan sadar, bukan kelalaian)

| Fitur | Alasan |
|---|---|
| **Portal pendaftaran (PMB) / sistem aplikasi** | Sudah ditangani sistem universitas. Cukup tautan. |
| **Donasi / alumni giving** | Umum di kampus AS, **tidak relevan** untuk PTKIN Indonesia. |
| **Login mahasiswa / area terproteksi** | Sudah ada SIAKAD & E-Learning. Jangan duplikasi. |
| **Sinkronisasi otomatis dengan SIAKAD/PDDikti** | Butuh API institusi; **belum tersedia**. Data dosen via import massal (09-B). |
| **Chatbot / AI search** | Nilai tambah, bukan kebutuhan. Tambahkan nanti bila perlu. |
| **Virtual tour 360°** | Opsional (13-L); cukup video + foto pada tahap awal. |
| **Modul alumni penuh** | Cukup tracer study (tautan) + testimoni. |
| **Program S2/S3** | FUSPI hanya S1. Field `degree` siap bila kelak berubah. |

---

## ✅ Keputusan gap yang sudah dikunci

1. **Email:** SMTP Hostinger + `NotificationOutbox`, cron 5 menit, retry maksimal 5 kali, idempotency key, serta retry manual.
2. **Cron:** hanya wajib untuk outbox. Status booking selesai dihitung saat query. SLA dihitung dari timestamp/timeline dan tidak bergantung cron.
3. **Subdomain prodi:** tetap situs eksternal pada v1; tidak ada multisite.
4. **Storage:** public/private/PPKS dipisahkan, quota dimonitor, alert 70% dan critical 85%, backup mencakup seluruh kelas storage.
5. **Migrasi konten:** workstream wajib dengan importer idempotent, media checksum, rekonsiliasi, crawl staging, dan redirect 301.
6. **Auth:** Credentials + database session; tidak ada fallback JWT.
7. **Publishing:** EDITOR boleh publish/schedule Post miliknya.
8. **PPKS:** token hash, encryption, query-level isolation, audit akses, dan retention hold wajib.
9. **Booking:** hanya booking disetujui menjadi hard conflict; approval memakai Serializable transaction + retry.
10. **Skema/i18n:** kontrak lengkap berada di `02`; seluruh translation dan model infrastruktur bersifat wajib.
11. **Layanan akademik:** SILA tetap sumber kebenaran; website hanya deep link v1 dan tidak menduplikasi workflow/data (`23`).
12. **Governance/PDP/alert:** review/expiry/revision, translation stale, data-subject request, retention, global alert, dan service status masuk v1 (`21`).
13. **Audience/discoverability:** hub calon mahasiswa, direktori, structured data, performance budget, dan goal analytics masuk v1; katalog Course/riset bibliografis masuk fase 2 (`22`).

## ⚠️ Gate institusional yang belum boleh ditebak developer

Ini bukan keputusan arsitektur terbuka. Sistem memakai default aman sampai pemilik kebijakan memberikan persetujuan tertulis:

- Satgas PPKS memverifikasi kontak bantuan, wording korban, cakupan role, alur resmi, target waktu, dan retention hold.
- Pengelola Hostinger memverifikasi quota, lokasi private storage, SMTP, cron, backup, dan restore.
- Pemilik konten menyetujui daftar exclusion migrasi WordPress bila ada.

Tidak adanya persetujuan tersebut memblokir **go-live**, bukan memblokir pembangunan fitur lain.

## Status audit

Dokumentasi dinilai **decision-complete untuk implementasi** setelah seluruh kontradiksi terhapus dan checklist konsistensi lulus. Produk baru dinilai lengkap setelah seluruh test dan gerbang pada `20-test-acceptance-go-live.md` mempunyai bukti.

Klaim “selesai” tidak boleh hanya berdasarkan keberadaan halaman atau komponen. Security isolation PPKS, concurrency booking, restore, SMTP/outbox, migrasi WordPress, RTL, dan accessibility adalah acceptance gate setara fitur utama.
