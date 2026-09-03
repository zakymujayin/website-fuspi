# 02 — Skema Database (Prisma + PostgreSQL)

> **⚠️ KONTRAK FINAL:** dokumen ini wajib dibaca sampai bagian **“Kontrak skema final v1”**. Blok inventaris awal mempertahankan nama model agar mudah ditelusuri; kontrak final di bawah bersifat normatif dan menimpa field lama yang dipindah ke translation, token mentah, serta model yang diperluas dokumen 12–18. Tidak boleh ada keputusan skema yang diserahkan kepada implementer.

Dokumen ini adalah sumber kebenaran struktur data. Sebelum migrasi pertama, hasil `prisma/schema.prisma` harus direview terhadap checklist kontrak final dan lulus `npx prisma validate`; jangan menjalankan skema inventaris awal tanpa extension final.

> **Catatan PostgreSQL:** provider Prisma adalah `postgresql`. Teks panjang memakai `@db.Text`, tanggal tanpa waktu memakai `@db.Date`, dan ID memakai `cuid()`. Kontrak runtime menggunakan `@prisma/adapter-pg`; database remote wajib TLS.

## Skema lengkap

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ========================= ENUM =========================

enum Role {
  ADMIN         // akses penuh (KECUALI isi tiket PPKS — lihat 14)
  EDITOR        // penulis: hanya berita miliknya sendiri
  PETUGAS       // petugas pengaduan: menangani tiket NON-PPKS
  SATGAS_PPKS   // Satgas PPKS: SATU-SATUNYA yang boleh membuka tiket pelecehan seksual
}

enum PostType {
  BERITA
  PENGUMUMAN
  INFORMASI
  KOLOM
}

enum ColumnType {
  DEKAN
  DOSEN
  MAHASISWA
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum PageStatus {
  DRAFT
  PUBLISHED
}

enum ContribType {
  DOSEN
  MAHASISWA
}

enum PartnershipLevel {
  INTERNASIONAL
  NASIONAL
  LOKAL
}

enum ServiceCategory {
  AKADEMIK
  LABORATORIUM
  UMUM
}

enum UnitType {
  PUSAT_STUDI           // pusat kajian / research center
  LABORATORIUM          // laboratorium prodi/fakultas
  ORGANISASI_MAHASISWA  // ormawa (SEMA, DEMA, HMJ, UKM)
  LEMBAGA               // unit/lembaga lain
}

enum AchievementLevel {
  INTERNASIONAL
  NASIONAL
  REGIONAL
  LOKAL
}

enum MenuLocation {
  CONTENT_BAR   // bar tipis paling atas: Berita, Pengumuman, Kolom, Agenda, Album, Dokumen
  TOPBAR        // utilitas kanan atas: PMB, SIAKAD, E-Learning, GKM
  HEADER        // menu utama (6 dropdown)
  FOOTER
}

enum LinkCategory {
  TERKAIT
  JURNAL
}

// ===================== AUTENTIKASI ======================
// Model Auth.js v5 dengan session database (lihat 06)

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String
  role          Role      @default(EDITOR)
  avatar        String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions      Session[]
  posts         Post[]
  media         Media[]
  assignedTickets Ticket[]      @relation("TicketAssignee")
  ticketReplies   TicketReply[] @relation("TicketReplyAuthor")
  approvedBookings Booking[]    @relation("BookingApprover")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ======================= KONTEN =========================

// Berita, Pengumuman, Informasi, dan Kolom disatukan di sini,
// dibedakan oleh field `type`. Kolom (opini) memakai `columnType`.
model Post {
  id          String      @id @default(cuid())
  type        PostType    @default(BERITA)
  columnType  ColumnType?               // hanya diisi bila type = KOLOM
  title       String      @db.VarChar(255)
  slug        String      @unique
  excerpt     String?     @db.VarChar(500)
  content     String      @db.Text
  coverImage  String?
  status      PostStatus  @default(DRAFT)
  isFeatured  Boolean     @default(false)   // untuk highlight/pinned di beranda
  viewCount   Int         @default(0)
  metaTitle   String?                        // SEO (opsional; fallback ke title)
  metaDesc    String?     @db.VarChar(500)   // SEO (opsional; fallback ke excerpt)
  publishedAt DateTime?                      // isi masa depan = terjadwal (lihat 09)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  categoryId  String?
  category    Category?   @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  authorId    String?
  author      User?       @relation(fields: [authorId], references: [id], onDelete: SetNull)
  tags        Tag[]       @relation("PostTags")

  @@index([type, status, publishedAt])
  @@index([slug])
  @@index([isFeatured])
}

model Tag {
  id    String @id @default(cuid())
  name  String
  slug  String @unique
  posts Post[] @relation("PostTags")
}

model Category {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  posts     Post[]
}

// Halaman statis: Profil, Visi-Misi, Organisasi, Fasilitas, dll.
// parentId memungkinkan hierarki (mis. sub-halaman kurikulum).
model Page {
  id         String     @id @default(cuid())
  title      String     @db.VarChar(255)
  slug       String     @unique
  content    String     @db.Text
  heroImage  String?
  status     PageStatus @default(DRAFT)
  order      Int        @default(0)
  parentId   String?
  parent     Page?      @relation("PageTree", fields: [parentId], references: [id], onDelete: SetNull)
  children   Page[]     @relation("PageTree")
  updatedAt  DateTime   @updatedAt
  createdAt  DateTime   @default(now())

  @@index([slug])
}

// ====================== SDM & PRODI =====================

model StudyProgram {
  id                 String      @id @default(cuid())
  name               String
  code               String      @unique      // active v1: IAT, IH, AFI
  degree             String      @default("S1")
  accreditation      String?                   // mis. "Unggul", "Baik Sekali"
  accreditationYear  Int?
  description        String?     @db.Text
  logo               String?
  externalUrl        String?                   // untuk prodi dengan subdomain sendiri
  order              Int         @default(0)
  isActive           Boolean     @default(true)

  lecturers          Lecturer[]
  createdAt          DateTime    @default(now())
}

model Lecturer {
  id          String        @id @default(cuid())
  name        String
  nip         String?
  photo       String?
  position    String?                          // Dekan, Wakil Dekan, Kaprodi, Dosen
  expertise   String?                          // bidang keahlian
  bio         String?       @db.Text        // biografi lengkap (halaman detail, gaya Zaytuna)
  officeHours String?                           // jam konsultasi / office hours
  email       String?
  scholarUrl  String?
  sintaUrl    String?
  order       Int           @default(0)
  isActive    Boolean       @default(true)
  prodiId     String?
  prodi       StudyProgram? @relation(fields: [prodiId], references: [id], onDelete: SetNull)
  createdAt   DateTime      @default(now())

  @@index([prodiId])
}

model Staff {
  id        String   @id @default(cuid())   // Tenaga Kependidikan
  name      String
  photo     String?
  position  String?
  unit      String?
  order     Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

// =============== PENELITIAN & PENGABDIAN ================

model Research {
  id        String      @id @default(cuid())
  title     String      @db.VarChar(500)
  authors   String                             // nama penulis (teks bebas)
  year      Int
  type      ContribType @default(DOSEN)
  abstract  String?     @db.Text
  fileUrl   String?
  createdAt DateTime    @default(now())

  @@index([type, year])
}

model CommunityService {
  id          String      @id @default(cuid())  // Pengabdian (PkM)
  title       String      @db.VarChar(500)
  authors     String
  year        Int
  type        ContribType @default(DOSEN)
  description String?     @db.Text
  fileUrl     String?
  createdAt   DateTime    @default(now())

  @@index([type, year])
}

// ==================== KEMAHASISWAAN =====================

model Scholarship {
  id          String    @id @default(cuid())   // Beasiswa
  title       String
  provider    String?
  description String?   @db.Text
  deadline    DateTime?
  fileUrl     String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
}

model Achievement {
  id          String           @id @default(cuid())  // Prestasi Mahasiswa
  studentName String
  title       String
  level       AchievementLevel @default(LOKAL)
  year        Int
  description String?          @db.Text
  image       String?
  createdAt   DateTime         @default(now())
}

model StudentActivity {
  id          String   @id @default(cuid())   // Kegiatan Kemahasiswaan
  title       String
  description String?  @db.Text
  date        DateTime?
  image       String?                          // gambar utama
  gallery     ActivityImage[]                  // galeri foto tambahan
  createdAt   DateTime @default(now())
}

model ActivityImage {
  id         String          @id @default(cuid())
  url        String
  caption    String?
  order      Int             @default(0)
  activityId String
  activity   StudentActivity @relation(fields: [activityId], references: [id], onDelete: Cascade)

  @@index([activityId])
}

// ====================== KERJASAMA =======================
// Kolom diselaraskan dengan kebutuhan dokumen akreditasi.
model Partnership {
  id          String           @id @default(cuid())
  partnerName String
  logo        String?
  level       PartnershipLevel @default(NASIONAL)
  country     String?
  category    String?                            // bidang kerjasama (Tri Dharma dsb.)
  startDate   DateTime?
  endDate     DateTime?
  documentUrl String?                            // MoU/MoA/dokumen bukti
  websiteUrl  String?
  description String?          @db.Text
  isActive    Boolean          @default(true)
  order       Int              @default(0)
  createdAt   DateTime         @default(now())

  @@index([level])
}

// ================= LAYANAN & DOKUMEN ====================

model Service {
  id          String          @id @default(cuid())  // Layanan
  name        String
  category    ServiceCategory @default(AKADEMIK)
  description String?         @db.Text
  linkUrl     String?
  icon        String?                              // nama ikon lucide (opsional)
  order       Int             @default(0)
  isActive    Boolean         @default(true)
}

// Unit organisasi: Pusat Studi, Laboratorium, Organisasi Mahasiswa, Lembaga
// (pola UIN Suka: IMPACT, CIA, REALM, lab prodi, ormawa, dll.)
model Unit {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  type        UnitType @default(PUSAT_STUDI)
  logo        String?
  description String?  @db.Text
  externalUrl String?              // bila unit punya situs/blog sendiri
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  @@index([type])
}

// ============ FORMULIR, FAQ, TESTIMONI (lihat 13) ============

enum SubmissionStatus {
  BARU
  DIPROSES
  SELESAI
}

// Kiriman formulir kontak. SURVEI memakai model berversi pada kontrak H;
// PENGADUAN memakai model Ticket (lihat 14).
model FormSubmission {
  id        String           @id @default(cuid())
  name      String?
  email     String?
  phone     String?
  subject   String?
  message   String           @db.Text
  status    SubmissionStatus @default(BARU)
  adminNote String?          @db.Text
  ipHash    String?                            // hash IP untuk anti-spam, bukan IP mentah
  createdAt DateTime         @default(now())

  @@index([status, createdAt])
}

// ============ SISTEM TIKET PENGADUAN (lihat 14) ============

enum ComplaintCategory {
  AKADEMIK            // layanan akademik: nilai, KRS, dosen, perkuliahan
  KEMAHASISWAAN       // beasiswa, organisasi, kegiatan
  SARANA              // fasilitas, sarana-prasarana
  PELECEHAN_SEKSUAL   // PPKS — AKSES TERBATAS (lihat 14 bagian D)
  LAINNYA
}

enum TicketPriority {
  RENDAH
  SEDANG
  TINGGI
  URGENT
}

enum TicketStatus {
  BARU
  DIVERIFIKASI
  DIPROSES
  MENUNGGU_PELAPOR
  SELESAI
  DITOLAK
}

model Ticket {
  id            String            @id @default(cuid())
  ticketNumber  String            @unique          // mis. FUSPI-2026-0001 (ditampilkan ke pelapor)
  trackingTokenHash String        @unique          // HMAC-SHA-256; token asli tidak disimpan
  category      ComplaintCategory @default(AKADEMIK)
  priority      TicketPriority    @default(SEDANG)
  status        TicketStatus      @default(BARU)

  isAnonymous   Boolean           @default(false)
  reporterName  String?                            // null bila anonim
  reporterEmail String?
  reporterPhone String?
  reporterNim   String?                            // NIM bila mahasiswa
  reporterProdi String?

  subject       String            @db.VarChar(255)
  description   String            @db.Text
  incidentDate  DateTime?                          // kapan kejadian (opsional)

  assignedToId  String?
  assignedTo    User?             @relation("TicketAssignee", fields: [assignedToId], references: [id], onDelete: SetNull)
  responseDueAt DateTime?
  resolutionDueAt DateTime?
  firstRespondedAt DateTime?
  pausedAt      DateTime?
  totalPausedSeconds Int          @default(0)
  closedAt      DateTime?
  resolution    String?           @db.Text         // ringkasan penyelesaian

  ipHash        String?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  replies       TicketReply[]
  attachments   TicketAttachment[]

  @@index([category, status, priority])
  @@index([ticketNumber])
  @@index([trackingTokenHash])
}

model TicketReply {
  id         String   @id @default(cuid())
  ticketId   String
  ticket     Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  message    String   @db.Text
  isInternal Boolean  @default(false)   // true = catatan internal, TIDAK terlihat pelapor
  fromReporter Boolean @default(false)  // true = balasan dari pelapor via halaman lacak
  authorId   String?                    // petugas yang membalas (null bila dari pelapor)
  author     User?    @relation("TicketReplyAuthor", fields: [authorId], references: [id], onDelete: SetNull)
  createdAt  DateTime @default(now())

  @@index([ticketId])
}

model TicketAttachment {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  url       String
  filename  String
  mimeType  String
  size      Int
  createdAt DateTime @default(now())

  @@index([ticketId])
}

// Jejak audit akses tiket sensitif (PPKS) — siapa membuka apa, kapan.
model TicketAccessLog {
  id        String   @id @default(cuid())
  ticketId  String
  userId    String
  action    String            // VIEW, UPDATE, ASSIGN, CLOSE, EXPORT
  createdAt DateTime @default(now())

  @@index([ticketId])
  @@index([userId])
}

// ============ PEMINJAMAN GEDUNG/RUANGAN (lihat 15) ============

enum BookingStatus {
  PENGAJUAN    // menunggu persetujuan
  DISETUJUI
  DITOLAK
  DIBATALKAN   // dibatalkan pemohon
  SELESAI      // sudah lewat & terpakai
}

model Room {
  id          String    @id @default(cuid())   // Gedung / Ruangan
  name        String                            // mis. "Aula FUSPI", "Ruang Sidang", "Lab Multimedia"
  code        String    @unique                 // mis. AULA-01
  capacity    Int?                              // kapasitas orang
  location    String?                           // gedung/lantai
  photo       String?
  facilities  String?   @db.Text                // AC, proyektor, sound system, dll.
  bufferMinutes Int     @default(30)
  needsApproval Boolean @default(true)
  isActive    Boolean   @default(true)
  order       Int       @default(0)
  createdAt   DateTime  @default(now())

  bookings    Booking[]
  // name/facilities diterjemahkan via RoomTranslation (lihat 12)
}

model Booking {
  id             String        @id @default(cuid())
  bookingNumber  String        @unique          // mis. PJM-2026-0001
  trackingTokenHash String     @unique          // HMAC-SHA-256; token asli tidak disimpan

  roomId         String
  room           Room          @relation(fields: [roomId], references: [id], onDelete: Restrict)

  // Pemohon
  requesterName  String
  requesterUnit  String?                        // prodi/ormawa/unit
  requesterEmail String
  requesterPhone String
  requesterNim   String?                        // NIM/NIP bila internal

  eventTitle     String        @db.VarChar(255) // nama kegiatan
  purpose        String        @db.Text         // maksud/keperluan
  participants   Int?                           // perkiraan jumlah peserta
  startTime      DateTime                       // mulai pemakaian
  endTime        DateTime                       // selesai pemakaian
  letterUrl      String?                        // surat permohonan (PDF)
  notes          String?       @db.Text         // kebutuhan tambahan (kursi, sound, dll.)

  status         BookingStatus @default(PENGAJUAN)
  rejectReason   String?       @db.Text
  approvedById   String?
  approvedBy     User?         @relation("BookingApprover", fields: [approvedById], references: [id], onDelete: SetNull)
  approvedAt     DateTime?

  isPublic       Boolean       @default(true)   // tampilkan di jadwal publik
  publishToAgenda Boolean      @default(false)  // ikut tampil di /agenda bila kegiatan terbuka

  ipHash         String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([roomId, startTime, endTime])
  @@index([status, startTime])
  @@index([trackingTokenHash])
}

model Faq {
  id        String   @id @default(cuid())
  category  String?
  order     Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  // question & answer ada di FaqTranslation (lihat 12)
}

model Testimonial {
  id        String   @id @default(cuid())   // testimoni alumni/mahasiswa
  name      String
  photo     String?
  gradYear  Int?                             // tahun lulus
  isAlumni  Boolean  @default(true)
  order     Int      @default(0)
  isActive  Boolean  @default(true)
  prodiId   String?
  prodi     StudyProgram? @relation(fields: [prodiId], references: [id], onDelete: SetNull)
  createdAt DateTime @default(now())
  // role/jabatan & quote ada di TestimonialTranslation (lihat 12)
}

model Document {
  id        String   @id @default(cuid())   // Dokumen Akademik / Unduhan
  title     String
  category  String?
  fileUrl   String
  fileSize  Int?
  createdAt DateTime @default(now())
}

// Album / Galeri Foto (seperti fitur "album" di UIN Suka)
model Album {
  id          String       @id @default(cuid())
  title       String
  slug        String       @unique
  description String?      @db.Text
  cover       String?
  date        DateTime?
  photos      AlbumPhoto[]
  createdAt   DateTime     @default(now())

  @@index([slug])
}

model AlbumPhoto {
  id      String @id @default(cuid())
  url     String
  caption String?
  order   Int    @default(0)
  albumId String
  album   Album  @relation(fields: [albumId], references: [id], onDelete: Cascade)

  @@index([albumId])
}

// ================== MEDIA LIBRARY =======================

model Media {
  id           String   @id @default(cuid())
  filename     String
  url          String
  mimeType     String
  size         Int
  width        Int?
  height       Int?
  alt          String?
  uploadedById String?
  uploadedBy   User?    @relation(fields: [uploadedById], references: [id], onDelete: SetNull)
  createdAt    DateTime @default(now())

  @@index([createdAt])
}

// ============ NAVIGASI, BERANDA, PENGATURAN =============

model MenuItem {
  id         String       @id @default(cuid())
  label      String
  url        String
  location   MenuLocation @default(HEADER)
  parentId   String?
  parent     MenuItem?    @relation("MenuTree", fields: [parentId], references: [id], onDelete: Cascade)
  children   MenuItem[]   @relation("MenuTree")
  order      Int          @default(0)
  isExternal Boolean      @default(false)

  @@index([location, order])
}

model HomeSlider {
  id       String  @id @default(cuid())
  title    String?
  subtitle String?
  image    String
  ctaLabel String?
  ctaUrl   String?
  order    Int     @default(0)
  isActive Boolean @default(true)
}

// Counter statistik beranda — FLEKSIBEL (admin bisa tambah/hapus/urutkan).
// Menggantikan field statMahasiswa/statDosen/statTendik yang terkunci.
model Statistic {
  id       String  @id @default(cuid())
  value    Int                       // angka yang di-counter (mis. 1000)
  suffix   String?                   // mis. "+", "%"
  icon     String?                   // nama ikon lucide
  order    Int     @default(0)
  isActive Boolean @default(true)
  // label diterjemahkan via StatisticTranslation (lihat 12)
}

// Kontrol tiap section beranda: tampil/sembunyi, urutan, judul & subjudul.
// Admin dapat mengatur beranda TANPA menyentuh kode (lihat 18).
model HomeSection {
  id        String  @id @default(cuid())
  key       String  @unique   // HERO, QUICKLINK, DEAN, STATS, NEWS, ANNOUNCEMENT,
                              // PRODI, PARTNERSHIP, VIDEO, AGENDA, TESTIMONIAL, COLUMN, CTA
  isVisible Boolean @default(true)
  order     Int     @default(0)
  ctaLabel  String?             // khusus section CTA
  ctaUrl    String?
  bgImage   String?             // khusus section CTA/hero
  // title & subtitle diterjemahkan via HomeSectionTranslation (lihat 12)
}

model ExternalLink {
  id       String       @id @default(cuid())   // Website Terkait & Jurnal
  label    String
  url      String
  category LinkCategory @default(TERKAIT)
  order    Int          @default(0)
}

// Singleton: satu baris saja (id = "singleton").
model SiteSetting {
  id            String  @id @default("singleton")
  facultyName   String  @default("Fakultas Ushuluddin dan Pemikiran Islam")
  tagline       String? @default("Critically, Locally, Globally")
  logo          String?
  address1      String? @db.Text
  address2      String? @db.Text
  email         String?
  phone         String?
  facebook      String?
  instagram     String?
  youtube       String?
  twitter       String?
  deanName      String?
  deanPhoto     String?
  deanMessage   String? @db.Text
  videoUrl      String?                 // URL YouTube untuk section video beranda
  videoTitle    String?
  videoDesc     String? @db.Text
  updatedAt     DateTime @updatedAt
}
// CATATAN: statistik beranda TIDAK lagi di sini — pindah ke model `Statistic`
// agar admin bisa menambah/menghapus counter (mis. Alumni, Guru Besar) tanpa ubah skema.

// Agenda / Events (situs lama punya "Upcoming Events")
model Event {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique
  description String?   @db.Text
  location    String?
  startDate   DateTime
  endDate     DateTime?
  image       String?
  isPublished Boolean   @default(true)
  createdAt   DateTime  @default(now())

  @@index([startDate])
}

// Kartu akses cepat di beranda (Layanan, Survei, E-Journal, PMB, dll.)
model QuickLink {
  id       String  @id @default(cuid())
  label    String
  icon     String?              // nama ikon lucide
  url      String
  order    Int     @default(0)
  isActive Boolean @default(true)
}

// Langganan newsletter (opsional)
model Subscriber {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
}
```

## Kontrak skema final v1 (normatif)

Bagian ini menutup seluruh delta dari dokumen 12–18. Bila field di blok awal bertentangan dengan bagian ini, bagian ini yang berlaku.

### A. Aturan translation

- Tambahkan `enum Locale { id en ar }`.
- Setiap translation memiliki `id @default(cuid())`, `locale Locale`, foreign key induk dengan `onDelete: Cascade`, `@@unique([parentId, locale])`, dan `@@index([locale])`.
- Field Indonesia wajib ada sebelum induk boleh dipublikasikan/diaktifkan; EN dan AR boleh kosong. Jangan membuat row translation kosong.
- Slug, URL, file, tanggal, angka, status, enum, kode, email, telepon, nama orang, serta relasi tetap di induk.
- Semua operasi induk + translation menggunakan satu `$transaction`.

| Translation | Foreign key | Field final |
|---|---|---|
| `PostTranslation` | `postId` | `title VarChar(255)`, `excerpt VarChar(500)?`, `content LongText`, `metaTitle?`, `metaDesc VarChar(500)?`, `coverCaption?` |
| `PageTranslation` | `pageId` | `title VarChar(255)`, `content LongText`, `metaTitle?`, `metaDesc VarChar(500)?` |
| `StudyProgramTranslation` | `studyProgramId` | `name`, `description LongText?`, `vision LongText?`, `mission LongText?`, `objectives LongText?`, `graduateProfile LongText?`, `careerProspects LongText?`, `learningOutcomes LongText?` |
| `LecturerTranslation` | `lecturerId` | `position?`, `expertise?`, `bio LongText?`, `officeHours?` |
| `StaffTranslation` | `staffId` | `position?`, `unit?` |
| `CategoryTranslation` | `categoryId` | `name` |
| `TagTranslation` | `tagId` | `name` |
| `UnitTranslation` | `unitId` | `name`, `description LongText?` |
| `ServiceTranslation` | `serviceId` | `name`, `description Text?` |
| `PartnershipTranslation` | `partnershipId` | `category?`, `description Text?` |
| `ScholarshipTranslation` | `scholarshipId` | `title`, `provider?`, `description Text?` |
| `AchievementTranslation` | `achievementId` | `title`, `description Text?` |
| `StudentActivityTranslation` | `studentActivityId` | `title`, `description LongText?` |
| `ResearchTranslation` | `researchId` | `title VarChar(500)`, `abstract Text?` |
| `CommunityServiceTranslation` | `communityServiceId` | `title VarChar(500)`, `description Text?` |
| `AlbumTranslation` | `albumId` | `title`, `description Text?` |
| `EventTranslation` | `eventId` | `title`, `description LongText?`, `location?` |
| `DocumentTranslation` | `documentId` | `title`, `category?` |
| `MenuItemTranslation` | `menuItemId` | `label` |
| `QuickLinkTranslation` | `quickLinkId` | `label` |
| `ExternalLinkTranslation` | `externalLinkId` | `label` |
| `HomeSliderTranslation` | `homeSliderId` | `title?`, `subtitle?`, `ctaLabel?` |
| `StatisticTranslation` | `statisticId` | `label` |
| `HomeSectionTranslation` | `homeSectionId` | `title`, `subtitle?`, `ctaLabel?` |
| `SiteSettingTranslation` | `siteSettingId` | `facultyName`, `tagline?`, `address1 Text?`, `address2 Text?`, `deanPosition?`, `deanMessage Text?`, `videoTitle?`, `videoDesc Text?` |
| `RoomTranslation` | `roomId` | `name`, `location?`, `facilities Text?` |
| `FaqTranslation` | `faqId` | `category?`, `question`, `answer LongText` |
| `TestimonialTranslation` | `testimonialId` | `currentRole?`, `quote Text` |

Field teks tersebut **dihapus dari induk**. Nama orang (`Lecturer.name`, `Staff.name`, `Testimonial.name`, `Achievement.studentName`) tetap di induk.

### B. Media dan file

- Tambahkan `enum StorageClass { PUBLIC PRIVATE PPKS_PRIVATE }`.
- `Media` menambah: `storageKey @unique`, `storageClass`, `checksumSha256`, `originalName`, `alt`, `isDecorative`, `width`, `height`, `encryptionNonce?`, `encryptionTag?`, `keyVersion?`, dan uploader.
- Model yang memakai media terstruktur menyimpan foreign key Media: cover Post/Page/Album, foto Lecturer/Staff/Testimonial, logo StudyProgram/Partnership/SiteSetting, slider, activity, album photo, dan background HomeSection. URL eksternal disimpan pada field terpisah dan tidak berpura-pura sebagai Media.
- `TicketAttachment` dan surat Booking menyimpan `storageKey`, bukan URL publik. Attachment mencatat storage class dan metadata enkripsi.
- Penghapusan Media menggunakan `onDelete: Restrict`; file tidak dapat dihapus selama masih direferensikan.

### C. Relasi konten

- Tambahkan pivot eksplisit dengan timestamp: `LecturerResearch`, `LecturerCommunityService`, `LecturerPost`, `StudyProgramPost`, dan `StudyProgramAlbum`; masing-masing memakai composite unique pada dua foreign key.
- `StudyProgram` menambah `curriculumDocumentId?` dan `brochureDocumentId?` ke `Document` dengan `onDelete: SetNull`.
- `Event` menambah `sourceBookingId @unique?`; satu booking hanya dapat menghasilkan satu Event.
- `Post` menambah `version Int @default(1)` untuk optimistic locking. Mutation memakai kondisi `id + version`, lalu increment version.

### D. Beranda final

- Tambahkan `enum HomeSectionKey { HERO QUICKLINK DEAN STATS NEWS ANNOUNCEMENT PRODI PARTNERSHIP VIDEO AGENDA TESTIMONIAL COLUMN CTA }`.
- `HomeSection.key` memakai enum dan unique; bukan String bebas.
- `HomeSection` menyimpan `isVisible`, `order`, `itemLimit Int @default(4)`, `ctaUrl?`, dan media background. Label CTA berada di translation.
- `SiteSetting` induk menyimpan `deanName`, `deanPhotoId`, `videoUrl`, kontak, URL sosial, serta updatedAt. `deanPosition` berada di translation.
- Seed wajib membuat tepat 13 HomeSection, tiga Statistic, QuickLink dasar, satu slider, dan SiteSetting singleton.

### E. Auth, permission, dan audit

- Pertahankan `User` dan `Session`; lengkapi model adapter yang diwajibkan versi Auth.js terpilih. `Session.sessionToken` opaque dan unique.
- `User` menambah `mustChangePassword Boolean @default(false)`. Perubahan password/role/isActive menghapus seluruh Session user dalam transaksi yang sama.
- Tambahkan `ActivityLog`: actor nullable, action enum, resource type/id, JSON metadata tersanitasi, createdAt, dan indeks actor/resource/date. Jangan simpan password, token, isi PPKS, atau data rahasia dalam metadata.
- `TicketAccessLog` memiliki relasi `ticket` dan `user`, `TicketAccessAction` enum, `allowed Boolean`, `reasonCode?`, `createdAt`; tidak memiliki updatedAt atau action delete UI.

### F. Ticket final

- Ganti `trackingToken` menjadi `trackingTokenHash String @unique`.
- Ticket menambah `responseDueAt`, `resolutionDueAt`, `firstRespondedAt`, `closedAt`, `pausedAt`, `totalPausedSeconds`, serta timeline `TicketHistory`.
- `TicketHistory` mencatat actor, event enum, from/to status atau priority, alasan, dan timestamp. History tidak menyimpan ulang isi laporan.
- Untuk PPKS, field subject, description, reporter identity, resolution, dan reply disimpan sebagai ciphertext + nonce/tag/keyVersion; plaintext tidak disimpan berdampingan.
- Tambahkan `AnnualSequence` dengan unique `[kind, year]` untuk nomor Ticket dan Booking.
- Tambahkan `Holiday(date @unique, name, isActive)` untuk perhitungan SLA.
- User tidak boleh di-hard-delete bila direferensikan audit/ticket; gunakan `isActive=false`.

### G. Booking final

- Ganti `trackingToken` menjadi `trackingTokenHash String @unique`.
- `Room` tidak memakai `openHour/closeHour`. Gunakan `RoomOperatingHour(roomId, dayOfWeek, opensAtMinute, closesAtMinute)` dengan unique `[roomId, dayOfWeek]`.
- `Room` menambah `bufferMinutes Int @default(30)`.
- Tambahkan `RoomBlackout(roomId, startTime, endTime, reason, createdAt)` dan indeks overlap.
- `Booking` menambah `version`, `cancelledAt`, `cancelReason?`, dan relasi `BookingHistory`.
- Surat permohonan memakai private Media/attachment reference.
- Approval dan auto-approval memakai transaksi Serializable + retry P2034; hanya `DISETUJUI` menjadi hard conflict.

### H. Form, survei, rate limit, email, redirect

- Tambahkan `SurveyDefinition`, `SurveyQuestion`, `SurveySubmission`, dan `SurveyAnswer`. Submission menyimpan versi definisi sehingga laporan historis tidak berubah ketika pertanyaan diedit.
- `FormSubmission` tetap hanya untuk KONTAK; tipe SURVEI dipindahkan ke model survei terstruktur.
- Tambahkan `RateLimitBucket(keyHash, scope, windowStart, count, blockedUntil?)` dengan unique `[keyHash, scope, windowStart]`. `keyHash` adalah HMAC, bukan IP/email mentah.
- Tambahkan `NotificationOutbox`: type, recipient, locale, template, payload terenkripsi bila sensitif, idempotencyKey unique, status, attempts, nextAttemptAt, sentAt, lastError tersanitasi, createdAt.
- Tambahkan `Redirect(sourcePath @unique, destinationPath, statusCode @default(301), isActive, hitCount, createdAt, updatedAt)`; source harus path lokal tanpa domain dan tidak boleh membentuk chain/loop.

### I. Delete dan retention

- Konten publik menggunakan archive/soft state bila model memiliki status. Hard delete hanya sebelum pernah dipublikasikan dan bila tanpa relasi historis.
- User, Ticket, TicketReply, TicketAttachment PPKS, TicketAccessLog, ActivityLog, BookingHistory, dan NotificationOutbox tidak dihapus dari UI.
- PPKS berada dalam retention hold tanpa auto-delete sampai kebijakan Satgas disahkan.
- Translation mengikuti induk dengan Cascade; penghapusan satu locale hanya boleh untuk EN/AR, sedangkan ID wajib dipertahankan selama induk ada.
- Semua timestamp disimpan UTC; input/output bisnis diformat eksplisit `Asia/Jakarta`.

### J. Validasi skema sebelum migrasi

Sebelum `prisma migrate dev`, wajib lulus:

1. `npx prisma format` dan `npx prisma validate`.
2. Tidak ada field teks pada induk yang juga diduplikasi di translation.
3. Tidak ada `trackingToken` plaintext atau URL untuk storage privat.
4. Semua relasi sensitif memiliki kebijakan delete eksplisit.
5. Seed berhasil di database kosong dan dapat dijalankan ulang tanpa duplikasi.

### K. Governance, privacy, alert, academic discovery

Tambahkan model normatif dari `21` dan `22`:

- Field governance pada resource publishable: `contentOwnerId`, `lastReviewedAt`, `lastReviewedById`, `reviewDueAt`, `expiresAt`, dan `GovernanceStatus`.
- `ContentRevision(resourceType, resourceId, locale?, version, snapshotJson, changeSummary?, actorId, createdAt)` dengan indeks resource+version.
- Semua translation menambah `TranslationStatus`, `sourceVersion`, translator/reviewer, dan reviewedAt.
- `GlossaryTerm` + `GlossaryTranslation` untuk istilah institusi ID/EN/AR.
- `SiteAlert` + `SiteAlertTranslation`; `ServiceEndpoint`, `ServiceIncident`, `ServiceIncidentTranslation`, dan `ServiceIncidentUpdate`.
- `PrivacyNotice` + translation/version, `ConsentRecord`, `DataSubjectRequest`, `DataIncident`, `DataExportLog`, dan `RetentionPolicy`.
- `AccessibilityIssue` dan `AccessibilityRequest`; jangan gabungkan alternative-format request dengan DataSubjectRequest.
- `AdmissionInfo` + translation/source/review/expiry.
- Fase 2: `Curriculum`, `Course`, `CourseTranslation`, `CurriculumCourse`, dan `CoursePrerequisite`.
- Research menambah publication type, DOI, repository/publisher/journal/volume/issue/pages/date/language/peerReviewed; Lecturer menambah ORCID dan identifier akademik.
- `PageFeedback(pageType, pageId, locale, helpful, reason, comment?, createdAt)` tanpa user identity default.

Aturan delete/retention mengikuti `21`: revision/audit/export log tidak hard-delete dari UI; incident dan curriculum retired mempertahankan histori.

## Penjelasan keputusan desain skema

- **Post disatukan** (Berita/Pengumuman/Informasi/Kolom) karena strukturnya identik. Ini menyederhanakan editor & query; pembeda cukup field `type`. Kolom opini memakai `columnType` untuk memisah Dekan/Dosen/Mahasiswa.
- **Page bersifat hierarkis** (`parentId`) supaya halaman seperti Profil bisa punya sub-halaman tanpa menambah tabel.
- **StudyProgram punya `externalUrl`** sebagai ekstensi opsional bila suatu saat prodi memiliki situs terpisah. Seluruh tiga prodi aktif FUSPI v1 memakai halaman internal.
- **Partnership** sengaja punya kolom `startDate`, `endDate`, `documentUrl`, `level`, dan `category` agar datanya bisa langsung dipakai untuk instrumen akreditasi.
- **SiteSetting singleton** memakai id tetap `"singleton"` sehingga selalu satu baris; di admin cukup form edit, bukan CRUD.
- **onDelete: SetNull** dipakai pada relasi author/category agar menghapus user/kategori tidak ikut menghapus konten.

## Seed awal (`prisma/seed.ts`) — wajib

Isi minimal saat pertama deploy:

1. **1 user ADMIN** dari `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`; password tidak boleh di-hardcode, `mustChangePassword=true`, hash via bcrypt.
2. **3 StudyProgram aktif v1**: IAT, IH, dan AFI; seluruhnya memakai halaman internal pada v1.
3. **SiteSetting** singleton dengan data FUSPI (alamat 2 kampus, email `fuspi@uinbanten.ac.id`, dekan).
4. **Kategori dasar**: Berita, Pengumuman.

```bash
# Perintah
npx prisma migrate dev --name init
npx prisma db seed
```

Tambahkan di `package.json`:
```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```
