import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import bcrypt from "bcryptjs";
import sharp from "sharp";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import type { HomeSectionKey } from "../src/generated/prisma/enums";
import { institution } from "../src/config/institution";
import { parseDatabaseUrl } from "../src/lib/db/config";

const adapter = new PrismaPg(
  parseDatabaseUrl(process.env.DATABASE_URL ?? ""),
);
const prisma = new PrismaClient({ adapter });

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/tmp/fuspi-public";

type SectionCopy = {
  key: HomeSectionKey;
  id: { title: string; subtitle?: string; ctaLabel?: string };
  en: { title: string; subtitle?: string; ctaLabel?: string };
  ar: { title: string; subtitle?: string; ctaLabel?: string };
  ctaUrl?: string;
  itemLimit?: number;
};

const SECTIONS: SectionCopy[] = [
  { key: "HERO", id: { title: "Hero" }, en: { title: "Hero" }, ar: { title: "الرئيسية" } },
  {
    key: "QUICKLINK",
    id: { title: "Tautan Cepat" }, en: { title: "Quick Links" }, ar: { title: "روابط سريعة" },
  },
  {
    key: "DEAN",
    id: { title: "Sambutan Dekan", ctaLabel: "Profil Pimpinan" },
    en: { title: "Dean's Welcome", ctaLabel: "Leadership Profile" },
    ar: { title: "كلمة العميد", ctaLabel: "ملف القيادة" },
    ctaUrl: "/profil/pimpinan",
  },
  {
    key: "STATS",
    id: { title: "FUSPI dalam Angka" }, en: { title: "FUSPI in Numbers" }, ar: { title: "الكلية بالأرقام" },
  },
  {
    key: "INTRO",
    id: { title: "Tentang FUSPI", subtitle: "Pusat kajian keislaman yang integratif dan kontekstual." },
    en: { title: "About FUSPI", subtitle: "An integrative, contextual center for Islamic studies." },
    ar: { title: "عن الكلية", subtitle: "مركز متكامل وسياقي للدراسات الإسلامية." },
  },
  {
    key: "PRODI",
    id: { title: "Program Studi" }, en: { title: "Study Programs" }, ar: { title: "البرامج الدراسية" },
    ctaUrl: "/prodi",
  },
  {
    key: "ANNOUNCEMENT",
    id: { title: "Pengumuman" }, en: { title: "Announcements" }, ar: { title: "الإعلانات" },
    itemLimit: 5,
  },
  {
    key: "SERVICE",
    id: { title: "Layanan", ctaLabel: "Semua Layanan" },
    en: { title: "Services", ctaLabel: "All Services" },
    ar: { title: "الخدمات", ctaLabel: "جميع الخدمات" },
    ctaUrl: "/layanan",
  },
  {
    key: "FACILITY",
    id: { title: "Sarana dan Prasarana", ctaLabel: "Semua Fasilitas" },
    en: { title: "Facilities", ctaLabel: "All Facilities" },
    ar: { title: "المرافق", ctaLabel: "جميع المرافق" },
    ctaUrl: "/profil/fasilitas", itemLimit: 8,
  },
  {
    key: "NEWS",
    id: { title: "Berita Terbaru", ctaLabel: "Semua Berita" },
    en: { title: "Latest News", ctaLabel: "All News" },
    ar: { title: "آخر الأخبار", ctaLabel: "جميع الأخبار" },
    ctaUrl: "/berita", itemLimit: 5,
  },
  {
    key: "PARTNERSHIP",
    id: { title: "Mitra Kerjasama" }, en: { title: "Partners" }, ar: { title: "الشركاء" },
    itemLimit: 12,
  },
  {
    key: "VIDEO",
    id: { title: "Video Profil" }, en: { title: "Profile Video" }, ar: { title: "فيديو تعريفي" },
  },
  {
    key: "VIDEO_GALLERY",
    id: { title: "Galeri Video", subtitle: "Kegiatan, wisuda, dan suasana kampus dalam video." },
    en: { title: "Video Gallery", subtitle: "Activities, graduations, and campus life in video." },
    ar: { title: "معرض الفيديو", subtitle: "الأنشطة وحفلات التخرج وأجواء الحرم الجامعي بالفيديو." },
    itemLimit: 12,
  },
  {
    key: "AGENDA",
    id: { title: "Agenda Kegiatan" }, en: { title: "Upcoming Events" }, ar: { title: "الفعاليات القادمة" },
    itemLimit: 4,
  },
  {
    key: "TESTIMONIAL",
    id: { title: "Testimoni Alumni" }, en: { title: "Alumni Testimonials" }, ar: { title: "آراء الخريجين" },
  },
  {
    key: "COLUMN",
    id: { title: "Kolom", subtitle: "Opini dan gagasan dari dekan, dosen, dan mahasiswa.", ctaLabel: "Semua Kolom" },
    en: { title: "Columns", subtitle: "Opinions from the dean, lecturers, and students.", ctaLabel: "All Columns" },
    ar: { title: "المقالات", subtitle: "آراء من العميد وأعضاء هيئة التدريس والطلاب.", ctaLabel: "جميع المقالات" },
    ctaUrl: "/kolom", itemLimit: 4,
  },
  {
    key: "ACHIEVEMENT",
    id: { title: "Prestasi dan Inspirasi", subtitle: "Capaian membanggakan mahasiswa FUSPI di berbagai ajang.", ctaLabel: "Semua Prestasi" },
    en: { title: "Achievements and Inspiration", subtitle: "Proud milestones from FUSPI students across competitions and events.", ctaLabel: "All Achievements" },
    ar: { title: "الإنجازات والإلهام", subtitle: "إنجازات مفخرة لطلاب الكلية في مختلف الفعاليات والمسابقات.", ctaLabel: "جميع الإنجازات" },
    ctaUrl: "/prestasi", itemLimit: 4,
  },
  {
    key: "CTA",
    id: { title: "Punya Pertanyaan?", ctaLabel: "Hubungi Kami" },
    en: { title: "Have a Question?", ctaLabel: "Contact Us" },
    ar: { title: "هل لديك سؤال؟", ctaLabel: "تواصل معنا" },
    ctaUrl: "/kontak",
  },
];

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function makePlaceholderFile(opts: { label: string; width: number; height: number; from: string; to: string }) {
  const fontSize = Math.round(Math.min(opts.width, opts.height) / 11);
  const svg = `<svg width="${opts.width}" height="${opts.height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${opts.from}"/>
        <stop offset="100%" stop-color="${opts.to}"/>
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="${fontSize}" font-weight="700"
      fill="#ffffff" text-anchor="middle" dominant-baseline="middle" opacity="0.92">${escapeXml(opts.label)}</text>
  </svg>`;

  const buffer = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
  const checksumSha256 = createHash("sha256").update(buffer).digest("hex");
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const storageKey = `${yyyy}/${mm}/${checksumSha256}.webp`;
  const dir = path.join(UPLOAD_DIR, yyyy, mm);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, storageKey), buffer);
  return { storageKey, checksumSha256, size: buffer.length };
}

async function upsertPlaceholderMedia(
  uploaderId: string,
  opts: { label: string; width: number; height: number; from: string; to: string; alt: string; originalName: string },
) {
  const file = await makePlaceholderFile(opts);
  return prisma.media.upsert({
    where: { storageKey: file.storageKey },
    update: {},
    create: {
      storageKey: file.storageKey,
      checksumSha256: file.checksumSha256,
      originalName: opts.originalName,
      mimeType: "image/webp",
      size: file.size,
      alt: opts.alt,
      width: opts.width,
      height: opts.height,
      uploaderId,
    },
  });
}

/* Demo lecturers. Identities are fictional on purpose: the directory carries
   education history and publications, and attaching invented credentials to a
   real person would fabricate an academic record. */
const LECTURERS = [
  {
    slug: "halimah-nur-azizah",
    name: "Dr. Halimah Nur Azizah, M.Ag.",
    nidn: "2014058701",
    program: "IAT",
    position: "Dosen Ilmu Al-Qur'an dan Tafsir",
    expertise: "Tafsir tematik, studi mushaf Nusantara",
    quote: "خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ",
    officeLocation: "Gedung FUSPI Lt. 2, Ruang Dosen IAT",
    officeHours: "Selasa dan Kamis, 09.00-12.00 WIB",
    bio: "<p>Menekuni kajian tafsir tematik dengan perhatian khusus pada tradisi penyalinan mushaf di Nusantara. Aktif membimbing penelitian mahasiswa tentang resepsi Al-Qur'an dalam praktik keagamaan masyarakat Banten.</p>",
    educations: [
      { degree: "Dr.", field: "Ilmu Al-Qur'an dan Tafsir", institution: "UIN Sunan Kalijaga", city: "Yogyakarta", year: 2019 },
      { degree: "M.Ag.", field: "Tafsir Hadis", institution: "UIN Sunan Ampel", city: "Surabaya", year: 2012 },
      { degree: "S.Ag.", field: "Tafsir Hadis", institution: "UIN Sunan Ampel", city: "Surabaya", year: 2009 },
    ],
    publications: [
      { title: "Resepsi Estetis Surah Ar-Rahman dalam Tradisi Pesantren Banten", type: "JURNAL" as const, year: 2024, publisher: "Jurnal Studi Al-Qur'an" },
      { title: "Metodologi Tafsir Maqasidi: Pembacaan atas Ayat-ayat Sosial", type: "JURNAL" as const, year: 2022, publisher: "Ulumuna" },
      { title: "Mushaf Nusantara: Jejak Lokalitas dalam Penyalinan Al-Qur'an", type: "BUKU" as const, year: 2021, publisher: "Pustaka Pelajar" },
    ],
  },
  {
    slug: "ahmad-syauqi-ramadhan",
    name: "Ahmad Syauqi Ramadhan, M.Th.I.",
    nidn: "2027119002",
    program: "IAT",
    position: "Dosen Ulumul Qur'an",
    expertise: "Ulumul Qur'an, qiraat",
    officeLocation: "Gedung FUSPI Lt. 2, Ruang Dosen IAT",
    officeHours: "Rabu, 13.00-15.00 WIB",
    bio: "<p>Mengampu mata kuliah Ulumul Qur'an dan ilmu qiraat. Penelitiannya berfokus pada transmisi bacaan Al-Qur'an di lembaga tahfiz.</p>",
    educations: [
      { degree: "M.Th.I.", field: "Ilmu Al-Qur'an dan Tafsir", institution: "UIN Syarif Hidayatullah", city: "Jakarta", year: 2018 },
      { degree: "S.Th.I.", field: "Ilmu Al-Qur'an dan Tafsir", institution: "UIN Syarif Hidayatullah", city: "Jakarta", year: 2015 },
    ],
    publications: [
      { title: "Transmisi Qiraat Sab'ah di Lembaga Tahfiz Banten", type: "JURNAL" as const, year: 2023, publisher: "Jurnal Ilmu Al-Qur'an" },
      { title: "Pengantar Ulumul Qur'an untuk Mahasiswa", type: "BUKU" as const, year: 2020, publisher: "Rajawali Pers" },
    ],
  },
  {
    slug: "muhammad-faiz-abdullah",
    name: "Dr. Muhammad Faiz Abdullah, Lc., M.A.",
    nidn: "2003077503",
    program: "IH",
    position: "Dosen Ulumul Hadis",
    expertise: "Kritik sanad, hadis dan isu kontemporer",
    quote: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ",
    officeLocation: "Gedung FUSPI Lt. 3, Ruang Dosen IH",
    officeHours: "Senin dan Rabu, 10.00-12.00 WIB",
    bio: "<p>Mendalami kritik sanad dan matan hadis serta penerapannya pada persoalan kontemporer. Menyelesaikan studi sarjana di Kairo sebelum melanjutkan program magister dan doktor di Jakarta.</p>",
    educations: [
      { degree: "Dr.", field: "Ilmu Hadis", institution: "UIN Syarif Hidayatullah", city: "Jakarta", year: 2016 },
      { degree: "M.A.", field: "Tafsir Hadis", institution: "UIN Syarif Hidayatullah", city: "Jakarta", year: 2008 },
      { degree: "Lc.", field: "Ushuluddin", institution: "Universitas Al-Azhar", city: "Kairo", year: 2003 },
    ],
    publications: [
      { title: "Kritik Matan Hadis dalam Wacana Fikih Kontemporer", type: "JURNAL" as const, year: 2024, publisher: "Al-Qalam" },
      { title: "Hadis dan Otoritas Keilmuan di Pesantren", type: "BAB_BUKU" as const, year: 2021, publisher: "LKiS" },
      { title: "Standar Kesahihan Hadis: Tinjauan Metodologis", type: "PROSIDING" as const, year: 2019, publisher: "Annual Conference on Islamic Studies" },
    ],
  },
  {
    slug: "zulfa-kamila",
    name: "Zulfa Kamila, M.Hum.",
    nidn: "2019098804",
    program: "IH",
    position: "Dosen Sejarah Hadis",
    expertise: "Historiografi hadis, manuskrip keislaman",
    officeLocation: "Gedung FUSPI Lt. 3, Ruang Dosen IH",
    officeHours: "Kamis, 09.00-11.00 WIB",
    bio: "<p>Meneliti historiografi periwayatan hadis dan koleksi manuskrip keislaman di wilayah Banten.</p>",
    educations: [
      { degree: "M.Hum.", field: "Sejarah Peradaban Islam", institution: "Universitas Indonesia", city: "Depok", year: 2017 },
      { degree: "S.Hum.", field: "Sejarah Kebudayaan Islam", institution: "UIN Sunan Kalijaga", city: "Yogyakarta", year: 2013 },
    ],
    publications: [
      { title: "Manuskrip Hadis di Banten: Inventarisasi Awal", type: "JURNAL" as const, year: 2023, publisher: "Manuskripta" },
      { title: "Perempuan Periwayat dalam Sejarah Hadis", type: "ARTIKEL" as const, year: 2022, publisher: "Jurnal Perempuan dan Islam" },
    ],
  },
  {
    slug: "ridwan-maulana-hakim",
    name: "Dr. Ridwan Maulana Hakim, M.Fil.I.",
    nidn: "2011068205",
    program: "AFI",
    position: "Dosen Filsafat Islam",
    expertise: "Filsafat Islam klasik, etika",
    officeLocation: "Gedung FUSPI Lt. 3, Ruang Dosen AFI",
    officeHours: "Selasa, 13.00-15.00 WIB",
    bio: "<p>Mengkaji pemikiran filsafat Islam klasik dan relevansinya bagi diskursus etika modern.</p>",
    educations: [
      { degree: "Dr.", field: "Filsafat Islam", institution: "UIN Sunan Kalijaga", city: "Yogyakarta", year: 2017 },
      { degree: "M.Fil.I.", field: "Filsafat Islam", institution: "UIN Sunan Kalijaga", city: "Yogyakarta", year: 2010 },
      { degree: "S.Fil.I.", field: "Aqidah Filsafat", institution: "UIN Sunan Gunung Djati", city: "Bandung", year: 2007 },
    ],
    publications: [
      { title: "Etika Kebajikan dalam Pemikiran Ibn Miskawaih", type: "JURNAL" as const, year: 2024, publisher: "Jurnal Filsafat" },
      { title: "Rasionalitas dan Wahyu: Perdebatan Klasik yang Belum Usai", type: "BUKU" as const, year: 2022, publisher: "Mizan" },
    ],
  },
  {
    slug: "nabila-syarifah",
    name: "Nabila Syarifah, M.Ag.",
    nidn: "2025039106",
    program: "AFI",
    position: "Dosen Ilmu Kalam",
    expertise: "Ilmu kalam, pemikiran Islam kontemporer",
    officeLocation: "Gedung FUSPI Lt. 3, Ruang Dosen AFI",
    officeHours: "Jumat, 09.00-11.00 WIB",
    bio: "<p>Fokus pada kajian ilmu kalam dan perkembangan pemikiran Islam kontemporer di Indonesia.</p>",
    educations: [
      { degree: "M.Ag.", field: "Aqidah dan Filsafat Islam", institution: "UIN Syarif Hidayatullah", city: "Jakarta", year: 2019 },
      { degree: "S.Ag.", field: "Aqidah dan Filsafat Islam", institution: "UIN Sultan Maulana Hasanuddin", city: "Serang", year: 2015 },
    ],
    publications: [
      { title: "Kalam Jadid dan Tantangan Pluralisme", type: "JURNAL" as const, year: 2023, publisher: "Refleksi" },
      { title: "Membaca Ulang Konsep Iman dalam Teologi Asy'ariyah", type: "ARTIKEL" as const, year: 2021, publisher: "Jurnal Theologia" },
    ],
  },
];


/* Bookable rooms. dayOfWeek follows getUTCDay(): 0 is Sunday, so 1..5 is the
   Monday-to-Friday working week in Jakarta. Minutes are counted from midnight. */
const ROOMS = [
  {
    slug: "aula-fuspi",
    capacity: 200,
    bufferMinutes: 60,
    name: "Aula FUSPI",
    location: "Gedung FUSPI Lt. 1",
    facilities: "Panggung, tata suara, proyektor, kursi 200",
    hours: [1, 2, 3, 4, 5].map((dayOfWeek) => ({dayOfWeek, opensAtMinute: 480, closesAtMinute: 1020})),
  },
  {
    slug: "ruang-seminar-2-1",
    capacity: 60,
    bufferMinutes: 30,
    name: "Ruang Seminar 2.1",
    location: "Gedung FUSPI Lt. 2",
    facilities: "Proyektor, papan tulis, pendingin ruangan",
    hours: [
      ...[1, 2, 3, 4, 5].map((dayOfWeek) => ({dayOfWeek, opensAtMinute: 480, closesAtMinute: 1020})),
      {dayOfWeek: 6, opensAtMinute: 480, closesAtMinute: 720},
    ],
  },
  {
    slug: "ruang-diskusi-3-4",
    capacity: 25,
    bufferMinutes: 15,
    name: "Ruang Diskusi 3.4",
    location: "Gedung FUSPI Lt. 3",
    facilities: "Meja diskusi, papan tulis",
    hours: [1, 2, 3, 4, 5].map((dayOfWeek) => ({dayOfWeek, opensAtMinute: 480, closesAtMinute: 960})),
  },
];

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD (minimal 12 karakter) wajib diisi.");
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Administrator FUSPI",
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      mustChangePassword: true,
    },
  });

  const editor = await prisma.user.upsert({
    where: { email: "editor.demo@fuspi.uinbanten.ac.id" },
    update: {},
    create: {
      email: "editor.demo@fuspi.uinbanten.ac.id",
      name: "Siti Fauziah, S.Ag.",
      passwordHash: await bcrypt.hash("WelcomeEditorDemo321@_", 12),
      role: "EDITOR",
      mustChangePassword: true,
    },
  });

  const siteSetting = await prisma.siteSetting.upsert({
    where: { id: "singleton" },
    update: { contentOwnerId: admin.id },
    create: {
      id: "singleton",
      email: "fuspi@uinbanten.ac.id",
      contentOwnerId: admin.id,
      translations: {
        create: {
          locale: "id",
          facultyName: "Fakultas Ushuluddin dan Pemikiran Islam",
          status: "PUBLISHED",
        },
      },
    },
  });

  for (const [index, { code, slug, name }] of institution.studyPrograms.entries()) {
    await prisma.studyProgram.upsert({
      where: { code },
      update: { slug, externalUrl: null, order: index, contentOwnerId: admin.id },
      create: {
        code,
        slug,
        degree: "S1",
        order: index,
        contentOwnerId: admin.id,
        translations: { create: { locale: "id", name, status: "PUBLISHED" } },
      },
    });
  }
  await prisma.studyProgram.updateMany({
    where: { code: { notIn: institution.studyPrograms.map((program) => program.code) } },
    data: { isActive: false },
  });

  for (const [slug, name] of [["berita", "Berita"], ["pengumuman", "Pengumuman"], ["kolom", "Kolom"]]) {
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { slug, translations: { create: { locale: "id", name, status: "PUBLISHED" } } },
    });
  }

  for (const [index, section] of SECTIONS.entries()) {
    const translations = (["id", "en", "ar"] as const).map((locale) => ({
      locale,
      title: section[locale].title,
      subtitle: section[locale].subtitle ?? null,
      ctaLabel: section[locale].ctaLabel ?? null,
      status: "PUBLISHED" as const,
    }));
    await prisma.homeSection.upsert({
      where: { key: section.key },
      update: {
        order: index, itemLimit: section.itemLimit ?? 4, ctaUrl: section.ctaUrl ?? null,
        translations: { deleteMany: {}, create: translations },
      },
      create: {
        key: section.key,
        order: index,
        itemLimit: section.itemLimit ?? 4,
        ctaUrl: section.ctaUrl ?? null,
        translations: { create: translations },
      },
    });
  }

  const statistics = [
    { id: "stat-1", value: "3", suffix: "", icon: "book-open", id_: "Program Studi", en_: "Study Programs", ar_: "برامج دراسية" },
    { id: "stat-2", value: "62", suffix: "+", icon: "users", id_: "Dosen", en_: "Lecturers", ar_: "أعضاء هيئة التدريس" },
    { id: "stat-3", value: "1200", suffix: "+", icon: "graduation-cap", id_: "Mahasiswa", en_: "Students", ar_: "الطلاب" },
    { id: "stat-4", value: "24", suffix: "+", icon: "handshake", id_: "Mitra Kerjasama", en_: "Partners", ar_: "شركاء" },
  ];
  // Seeded once — the faculty maintains the real numbers and labels in the admin.
  if ((await prisma.statistic.count()) === 0) {
    for (const [index, stat] of statistics.entries()) {
      const translations = [
        { locale: "id" as const, label: stat.id_, status: "PUBLISHED" as const },
        { locale: "en" as const, label: stat.en_, status: "PUBLISHED" as const },
        { locale: "ar" as const, label: stat.ar_, status: "PUBLISHED" as const },
      ];
      await prisma.statistic.create({
        data: {
          id: stat.id, value: stat.value, suffix: stat.suffix, icon: stat.icon, order: index,
          translations: { create: translations },
        },
      });
    }
  }

  const quickLinks = [
    ["Layanan", "/layanan"],
    ["Pengaduan", "/pengaduan"],
    ["Survei", "/survei"],
    ["Peminjaman Ruangan", "/peminjaman"],
    ["PMB", "https://pmb.uinbanten.ac.id/"],
    ["SIAKAD", "https://neosiakad.uinbanten.ac.id"],
    ["PPID", "https://fuspi-ppid.uinbanten.ac.id/"],
    ["GKM", "https://gkm-fuda.uinbanten.ac.id/"],
    ["E-Learning", "https://fuspi.uinbanten.ac.id/e-learning"],
    ["E-Layanan", "https://fuspi.uinbanten.ac.id/e-layanan"],
  ] as const;
  // Seeded once — admins reorder, relabel, and add their own quick links.
  if ((await prisma.quickLink.count()) === 0) {
    for (const [index, [label, url]] of quickLinks.entries()) {
      await prisma.quickLink.create({
        data: {
          id: `quick-${index + 1}`, url, order: index,
          translations: { create: { locale: "id", label, status: "PUBLISHED" } },
        },
      });
    }
  }

  // Hero slider — three real slides with generated placeholder imagery.
  const slides = [
    {
      id: "slider-1",
      label: "FUSPI",
      id_: { title: "Fakultas Ushuluddin dan Pemikiran Islam", subtitle: "Mengembangkan kajian Al-Qur'an, hadis, aqidah, dan filsafat Islam.", ctaLabel: "Profil Fakultas" },
      en_: { title: "Faculty of Ushuluddin and Islamic Thought", subtitle: "Developing Qur'anic, hadith, aqidah, and Islamic philosophy scholarship.", ctaLabel: "Faculty Profile" },
      ar_: { title: "كلية أصول الدين والفكر الإسلامي", subtitle: "تطوير دراسات القرآن والحديث والعقيدة والفلسفة الإسلامية.", ctaLabel: "ملف الكلية" },
      ctaUrl: "/profil",
    },
    {
      id: "slider-2",
      label: "3 Program Studi",
      id_: { title: "Unggul dalam Kajian Keislaman", subtitle: "Tiga program studi dirancang untuk membentuk akademisi dan profesional yang berdaya saing.", ctaLabel: "Lihat Program" },
      en_: { title: "Excellence in Islamic Studies", subtitle: "Three study programs shaping competitive academics and professionals.", ctaLabel: "See Programs" },
      ar_: { title: "التميز في الدراسات الإسلامية", subtitle: "ثلاثة برامج دراسية لإعداد أكاديميين ومحترفين تنافسيين.", ctaLabel: "استعرض البرامج" },
      ctaUrl: "/prodi",
    },
    {
      id: "slider-3",
      label: "PMB 2026/2027",
      id_: { title: "Jadi Bagian dari FUSPI", subtitle: "Bergabunglah dengan komunitas pembelajar yang mendalam dalam ilmu keislaman.", ctaLabel: "Daftar PMB" },
      en_: { title: "Become Part of FUSPI", subtitle: "Join a community of learners deeply rooted in Islamic knowledge.", ctaLabel: "Apply for Admission" },
      ar_: { title: "كن جزءاً من الكلية", subtitle: "انضم إلى مجتمع من المتعلمين المتجذرين في المعرفة الإسلامية.", ctaLabel: "التقديم للقبول" },
      ctaUrl: "https://pmb.uinbanten.ac.id/",
    },
  ];
  // Seeded once as demo content. Re-running the seed must never overwrite the image,
  // links, order, or copy of slides the faculty has since edited or replaced in the admin.
  if ((await prisma.homeSlider.count()) === 0) {
    for (const [index, slide] of slides.entries()) {
      const media = await upsertPlaceholderMedia(admin.id, {
        label: slide.label, width: 1600, height: 900, from: "#1e3a8a", to: "#4169e1",
        alt: slide.id_.title, originalName: `hero-${index + 1}.webp`,
      });
      const translations = [
        { locale: "id" as const, ...slide.id_, status: "PUBLISHED" as const },
        { locale: "en" as const, ...slide.en_, status: "PUBLISHED" as const },
        { locale: "ar" as const, ...slide.ar_, status: "PUBLISHED" as const },
      ];
      await prisma.homeSlider.create({
        data: {
          id: slide.id, imageMediaId: media.id, ctaUrl: slide.ctaUrl, order: index, isVisible: true,
          translations: { create: translations },
        },
      });
    }
  }

  // Dean welcome + localized site copy — seeded once. Re-running the seed must never
  // overwrite values the faculty has since edited in the admin, so skip when the
  // singleton already carries a dean name.
  if (!siteSetting.deanName) {
    const deanPhoto = await upsertPlaceholderMedia(admin.id, {
      label: "Dekan", width: 800, height: 800, from: "#0f172a", to: "#1e3a8a",
      alt: "Dr. Masykur, M.Hum.", originalName: "dean-portrait.webp",
    });
    await prisma.siteSetting.update({
      where: { id: "singleton" },
      data: {
        deanName: "Dr. Masykur, M.Hum.",
        deanPhotoId: deanPhoto.id,
        email: "fuspi@uinbanten.ac.id",
        phone: "+62254200323",
        translations: {
          upsert: (["id", "en", "ar"] as const).map((locale) => ({
            where: { siteSettingId_locale: { siteSettingId: "singleton", locale } },
            update: {
              deanPosition: {
                id: "Dekan Fakultas Ushuluddin dan Pemikiran Islam",
                en: "Dean of the Faculty of Ushuluddin and Islamic Thought",
                ar: "عميد كلية أصول الدين والفكر الإسلامي",
              }[locale],
              deanMessage: {
                id: "Assalamu'alaikum warahmatullahi wabarakatuh. Selamat datang di situs resmi Fakultas Ushuluddin dan Pemikiran Islam UIN Sultan Maulana Hasanuddin Banten. FUSPI hadir sebagai pusat pengembangan keilmuan Islam yang integratif, menghasilkan lulusan yang mendalam dalam ilmu keislaman sekaligus tanggap terhadap dinamika zaman.",
                en: "Assalamu'alaikum warahmatullahi wabarakatuh. Welcome to the official website of the Faculty of Ushuluddin and Islamic Thought, UIN Sultan Maulana Hasanuddin Banten. FUSPI is a hub for integrative Islamic knowledge development, producing graduates deeply rooted in Islamic sciences and responsive to contemporary dynamics.",
                ar: "السلام عليكم ورحمة الله وبركاته. أهلاً بكم في الموقع الرسمي لكلية أصول الدين والفكر الإسلامي. تقدم الكلية نفسها كمركز لتطوير المعرفة الإسلامية التكاملية، لإعداد خريجين متجذرين في العلوم الإسلامية ومستجيبين لديناميكيات العصر.",
              }[locale],
              tagline: {
                id: "Kredibel, kontekstual, dan berdaya saing global.",
                en: "Credible, contextual, and globally competitive.",
                ar: "موثوقة وسياقية وتنافسية عالمياً.",
              }[locale],
              address1: {
                id: "Kampus 2 — Jl. Syekh Nawawi Al-Bantani, Kp. Andamui, Kel. Sukawana, Kec. Curug, Kota Serang, Banten 42171",
                en: "Campus 2 — Jl. Syekh Nawawi Al-Bantani, Kp. Andamui, Kel. Sukawana, Kec. Curug, Kota Serang, Banten 42171, Indonesia",
                ar: "الحرم الثاني — شارع الشيخ نووي البنتاني، كامبونج أنداموي، سوكاوانا، كوروغ، مدينة سيرانج، بانتن 42171",
              }[locale],
              status: "PUBLISHED" as const,
            },
            create: {
              locale,
              facultyName: {
                id: "Fakultas Ushuluddin dan Pemikiran Islam",
                en: "Faculty of Ushuluddin and Islamic Thought",
                ar: "كلية أصول الدين والفكر الإسلامي",
              }[locale],
              tagline: {
                id: "Kredibel, kontekstual, dan berdaya saing global.",
                en: "Credible, contextual, and globally competitive.",
                ar: "موثوقة وسياقية وتنافسية عالمياً.",
              }[locale],
              address1: {
                id: "Kampus 2 — Jl. Syekh Nawawi Al-Bantani, Kp. Andamui, Kel. Sukawana, Kec. Curug, Kota Serang, Banten 42171",
                en: "Campus 2 — Jl. Syekh Nawawi Al-Bantani, Kp. Andamui, Kel. Sukawana, Kec. Curug, Kota Serang, Banten 42171, Indonesia",
                ar: "الحرم الثاني — شارع الشيخ نووي البنتاني، كامبونج أنداموي، سوكاوانا، كوروغ، مدينة سيرانج، بانتن 42171",
              }[locale],
              deanPosition: {
                id: "Dekan Fakultas Ushuluddin dan Pemikiran Islam",
                en: "Dean of the Faculty of Ushuluddin and Islamic Thought",
                ar: "عميد كلية أصول الدين والفكر الإسلامي",
              }[locale],
              deanMessage: {
                id: "Assalamu'alaikum warahmatullahi wabarakatuh. Selamat datang di situs resmi Fakultas Ushuluddin dan Pemikiran Islam UIN Sultan Maulana Hasanuddin Banten.",
                en: "Assalamu'alaikum warahmatullahi wabarakatuh. Welcome to the official website of the Faculty of Ushuluddin and Islamic Thought, UIN Sultan Maulana Hasanuddin Banten.",
                ar: "السلام عليكم ورحمة الله وبركاته. أهلاً بكم في الموقع الرسمي لكلية أصول الدين والفكر الإسلامي.",
              }[locale],
              status: "PUBLISHED" as const,
            },
          })),
        },
      },
    });
  }

  // Facilities album — homepage "Fasilitas" section reuses the Album/AlbumPhoto feature.
  const facilities = [
    { key: "library", label: "Perpustakaan", caption: "Perpustakaan Fakultas" },
    { key: "mosque", label: "Masjid Kampus", caption: "Masjid Kampus" },
    { key: "classroom", label: "Ruang Kelas", caption: "Ruang Kelas" },
    { key: "lab", label: "Laboratorium", caption: "Laboratorium Bahasa" },
    { key: "auditorium", label: "Auditorium", caption: "Auditorium" },
    { key: "reading-room", label: "Ruang Baca", caption: "Ruang Baca Mahasiswa" },
  ];
  const album = await prisma.album.upsert({
    where: { slug: "fasilitas-kampus" },
    update: { isPublished: true },
    create: {
      slug: "fasilitas-kampus", isPublished: true,
      translations: { create: { locale: "id", title: "Fasilitas Kampus", status: "PUBLISHED" } },
    },
  });
  for (const [index, facility] of facilities.entries()) {
    const media = await upsertPlaceholderMedia(admin.id, {
      label: facility.label, width: 1200, height: 800, from: "#1e3a8a", to: "#64748b",
      alt: facility.caption, originalName: `facility-${facility.key}.webp`,
    });
    await prisma.albumPhoto.upsert({
      where: { albumId_mediaId: { albumId: album.id, mediaId: media.id } },
      update: { caption: facility.caption, order: index },
      create: { albumId: album.id, mediaId: media.id, caption: facility.caption, order: index },
    });
  }

  // Sample news (BERITA), announcements (PENGUMUMAN), and columns (KOLOM) — demo content, real editors replace these.
  const beritaCategory = await prisma.category.findUniqueOrThrow({ where: { slug: "berita" } });
  const news = [
    {
      slug: "fuspi-buka-pendaftaran-mahasiswa-baru-2026",
      authorId: admin.id,
      id_title: "FUSPI Buka Pendaftaran Mahasiswa Baru Tahun Akademik 2026/2027",
      id_excerpt: "Pendaftaran mahasiswa baru untuk tiga program studi FUSPI resmi dibuka mulai awal tahun ajaran.",
      id_content: "<p>Fakultas Ushuluddin dan Pemikiran Islam membuka pendaftaran mahasiswa baru untuk tiga program studi yang saat ini aktif: Ilmu Al-Qur'an dan Tafsir, Ilmu Hadis, dan Aqidah dan Filsafat Islam.</p>",
    },
    {
      slug: "seminar-nasional-moderasi-beragama",
      authorId: editor.id,
      id_title: "FUSPI Gelar Seminar Nasional Moderasi Beragama",
      id_excerpt: "Seminar menghadirkan akademisi dan praktisi untuk membahas moderasi beragama di ruang publik digital.",
      id_content: "<p>Fakultas Ushuluddin dan Pemikiran Islam menyelenggarakan seminar nasional bertema moderasi beragama, menghadirkan akademisi dan praktisi dari berbagai perguruan tinggi.</p>",
    },
  ];
  for (const [index, item] of news.entries()) {
    await prisma.post.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        type: "BERITA", slug: item.slug, status: "PUBLISHED", isFeatured: index === 0,
        publishedAt: new Date(Date.now() - index * 86_400_000),
        authorId: item.authorId, categoryId: beritaCategory.id,
        translations: {
          create: {
            locale: "id", title: item.id_title, excerpt: item.id_excerpt, content: item.id_content, status: "PUBLISHED",
          },
        },
      },
    });
  }

  const pengumumanCategory = await prisma.category.findUniqueOrThrow({ where: { slug: "pengumuman" } });
  const announcements = [
    {
      slug: "jadwal-ujian-akhir-semester-genap",
      id_title: "Jadwal Ujian Akhir Semester Genap",
      id_content: "<p>Ujian Akhir Semester Genap dilaksanakan sesuai jadwal yang telah ditetapkan oleh masing-masing program studi. Mahasiswa diimbau memeriksa jadwal melalui SIAKAD.</p>",
    },
    {
      slug: "pengumuman-libur-hari-raya",
      id_title: "Pengumuman Libur Hari Raya",
      id_content: "<p>Perkuliahan diliburkan sesuai kalender akademik fakultas. Informasi lebih lanjut akan disampaikan melalui pengumuman resmi berikutnya.</p>",
    },
  ];
  for (const [index, item] of announcements.entries()) {
    await prisma.post.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        type: "PENGUMUMAN", slug: item.slug, status: "PUBLISHED",
        publishedAt: new Date(Date.now() - index * 86_400_000),
        authorId: admin.id, categoryId: pengumumanCategory.id,
        translations: { create: { locale: "id", title: item.id_title, content: item.id_content, status: "PUBLISHED" } },
      },
    });
  }

  const programsByCode = new Map(
    (await prisma.studyProgram.findMany({ select: { id: true, code: true } })).map((p) => [p.code, p.id]),
  );

  const lecturerAccount = await prisma.user.upsert({
    where: { email: "dosen.demo@fuspi.uinbanten.ac.id" },
    update: { role: "DOSEN" },
    create: {
      email: "dosen.demo@fuspi.uinbanten.ac.id",
      name: LECTURERS[0].name,
      passwordHash: await bcrypt.hash("WelcomeDosenDemo321@_", 12),
      role: "DOSEN",
      mustChangePassword: true,
    },
  });

  for (const [index, item] of LECTURERS.entries()) {
    const translation = {
      locale: "id" as const,
      position: item.position,
      expertise: item.expertise,
      bio: item.bio,
      quote: item.quote ?? null,
      officeHours: item.officeHours,
      officeLocation: item.officeLocation,
      status: "PUBLISHED" as const,
    };
    const educations = item.educations.map((e, order) => ({ ...e, order }));
    const publications = item.publications.map((p, order) => ({ ...p, order }));

    await prisma.lecturer.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        nidn: item.nidn,
        email: `${item.slug}@fuspi.uinbanten.ac.id`,
        studyProgramId: programsByCode.get(item.program) ?? null,
        order: index,
        isActive: true,
        userId: index === 0 ? lecturerAccount.id : undefined,
        translations: { deleteMany: {}, create: [translation] },
        educations: { deleteMany: {}, create: educations },
        publications: { deleteMany: {}, create: publications },
      },
      create: {
        slug: item.slug,
        name: item.name,
        nidn: item.nidn,
        email: `${item.slug}@fuspi.uinbanten.ac.id`,
        studyProgramId: programsByCode.get(item.program) ?? null,
        order: index,
        userId: index === 0 ? lecturerAccount.id : undefined,
        translations: { create: [translation] },
        educations: { create: educations },
        publications: { create: publications },
      },
    });
  }

  for (const room of ROOMS) {
    await prisma.room.upsert({
      where: {slug: room.slug},
      update: {
        capacity: room.capacity,
        bufferMinutes: room.bufferMinutes,
        isActive: true,
        contentOwnerId: admin.id,
        translations: {
          deleteMany: {},
          create: [{
            locale: "id" as const,
            name: room.name,
            location: room.location,
            facilities: room.facilities,
            status: "PUBLISHED" as const,
          }],
        },
        operatingHours: {deleteMany: {}, create: room.hours},
      },
      create: {
        slug: room.slug,
        capacity: room.capacity,
        bufferMinutes: room.bufferMinutes,
        contentOwnerId: admin.id,
        translations: {
          create: [{
            locale: "id" as const,
            name: room.name,
            location: room.location,
            facilities: room.facilities,
            status: "PUBLISHED" as const,
          }],
        },
        operatingHours: {create: room.hours},
      },
    });
  }

  await prisma.post.deleteMany({
    where: {
      type: "KOLOM",
      slug: {in: [
        "menumbuhkan-nalar-kritis-mahasiswa",
        "tafsir-kontekstual-di-era-digital",
      ]},
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
