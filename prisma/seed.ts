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
    ctaUrl: "/profil/fasilitas", itemLimit: 5,
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

  await prisma.siteSetting.upsert({
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
  for (const [index, stat] of statistics.entries()) {
    const translations = [
      { locale: "id" as const, label: stat.id_, status: "PUBLISHED" as const },
      { locale: "en" as const, label: stat.en_, status: "PUBLISHED" as const },
      { locale: "ar" as const, label: stat.ar_, status: "PUBLISHED" as const },
    ];
    await prisma.statistic.upsert({
      where: { id: stat.id },
      update: {
        value: stat.value, suffix: stat.suffix, icon: stat.icon, order: index,
        translations: { deleteMany: {}, create: translations },
      },
      create: {
        id: stat.id, value: stat.value, suffix: stat.suffix, icon: stat.icon, order: index,
        translations: { create: translations },
      },
    });
  }

  const quickLinks = [
    ["Layanan", "/layanan"],
    ["Pengaduan", "/pengaduan"],
    ["Survei", "/survei"],
    ["Peminjaman Ruangan", "/peminjaman-ruangan"],
    ["PMB", "https://pmb.uinbanten.ac.id"],
    ["E-Learning", "https://elearning.uinbanten.ac.id"],
  ] as const;
  for (const [index, [label, url]] of quickLinks.entries()) {
    const id = `quick-${index + 1}`;
    await prisma.quickLink.upsert({
      where: { id },
      update: { url, order: index },
      create: { id, url, order: index, translations: { create: { locale: "id", label, status: "PUBLISHED" } } },
    });
  }

  // Hero slider — three real slides with generated placeholder imagery.
  const slides = [
    {
      id: "slider-1",
      label: "FUSPI",
      id_: { title: "Fakultas Ushuluddin dan Pemikiran Islam", subtitle: "Mengembangkan kajian Al-Qur'an, hadis, aqidah, filsafat Islam, studi agama-agama, serta tasawuf dan psikoterapi.", ctaLabel: "Profil Fakultas" },
      en_: { title: "Faculty of Ushuluddin and Islamic Thought", subtitle: "Developing Qur'anic, hadith, aqidah, Islamic philosophy, religious studies, and Sufism/psychotherapy scholarship.", ctaLabel: "Faculty Profile" },
      ar_: { title: "كلية أصول الدين والفكر الإسلامي", subtitle: "تطوير دراسات القرآن والحديث والعقيدة والفلسفة الإسلامية ودراسات الأديان والتصوف والعلاج النفسي.", ctaLabel: "ملف الكلية" },
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
      ctaUrl: "https://pmb.uinbanten.ac.id",
    },
  ];
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
    await prisma.homeSlider.upsert({
      where: { id: slide.id },
      update: {
        imageMediaId: media.id, ctaUrl: slide.ctaUrl, order: index, isVisible: true,
        translations: { deleteMany: {}, create: translations },
      },
      create: {
        id: slide.id, imageMediaId: media.id, ctaUrl: slide.ctaUrl, order: index, isVisible: true,
        translations: { create: translations },
      },
    });
  }

  // Dean welcome — sample content until the faculty supplies a real photo and message.
  const deanPhoto = await upsertPlaceholderMedia(admin.id, {
    label: "Dekan", width: 800, height: 800, from: "#0f172a", to: "#1e3a8a",
    alt: "Prof. Dr. H. Ahmad Fauzi, M.Ag.", originalName: "dean-portrait.webp",
  });
  await prisma.siteSetting.update({
    where: { id: "singleton" },
    data: {
      deanName: "Prof. Dr. H. Ahmad Fauzi, M.Ag.",
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
              id: "Jl. Jenderal Sudirman No. 30, Serang, Banten 42118",
              en: "Jl. Jenderal Sudirman No. 30, Serang, Banten 42118, Indonesia",
              ar: "شارع الجنرال سوديرمان رقم 30، سيرانج، بانتن 42118، إندونيسيا",
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
              id: "Jl. Jenderal Sudirman No. 30, Serang, Banten 42118",
              en: "Jl. Jenderal Sudirman No. 30, Serang, Banten 42118, Indonesia",
              ar: "شارع الجنرال سوديرمان رقم 30، سيرانج، بانتن 42118، إندونيسيا",
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
