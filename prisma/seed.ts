import bcrypt from "bcryptjs";
import {PrismaClient} from "../src/generated/prisma/client";
import {PrismaMariaDb} from "@prisma/adapter-mariadb";
import {institution} from "../src/config/institution";
import {parseDatabaseUrl} from "../src/lib/db/config";

const adapter = new PrismaMariaDb(
  parseDatabaseUrl(process.env.DATABASE_URL ?? ""),
);
const prisma = new PrismaClient({adapter});

const sections = [
  "HERO", "QUICKLINK", "DEAN", "STATS", "NEWS", "ANNOUNCEMENT", "PRODI",
  "PARTNERSHIP", "VIDEO", "AGENDA", "TESTIMONIAL", "COLUMN", "CTA",
] as const;

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD (minimal 12 karakter) wajib diisi.");
  }

  const admin = await prisma.user.upsert({
    where: {email},
    update: {},
    create: {
      email,
      name: "Administrator FUSPI",
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      mustChangePassword: true,
    },
  });

  await prisma.siteSetting.upsert({
    where: {id: "singleton"},
    update: {contentOwnerId: admin.id},
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

  for (const [index, {code, slug, name}] of institution.studyPrograms.entries()) {
    await prisma.studyProgram.upsert({
      where: {code},
      update: {slug, externalUrl: null, order: index, contentOwnerId: admin.id},
      create: {
        code,
        slug,
        degree: "S1",
        order: index,
        contentOwnerId: admin.id,
        translations: {create: {locale: "id", name, status: "PUBLISHED"}},
      },
    });
  }

  for (const [slug, name] of [["berita", "Berita"], ["pengumuman", "Pengumuman"]]) {
    await prisma.category.upsert({
      where: {slug},
      update: {},
      create: {slug, translations: {create: {locale: "id", name, status: "PUBLISHED"}}},
    });
  }

  for (const [index, key] of sections.entries()) {
    await prisma.homeSection.upsert({
      where: {key},
      update: {order: index},
      create: {
        key,
        order: index,
        translations: {create: {locale: "id", title: key, status: "PUBLISHED"}},
      },
    });
  }

  for (const [index, value] of ["5", "100+", "3000+"].entries()) {
    const id = `stat-${index + 1}`;
    await prisma.statistic.upsert({
      where: {id},
      update: {value, order: index},
      create: {
        id,
        value,
        order: index,
        translations: {create: {locale: "id", label: ["Program Studi", "Dosen", "Mahasiswa"][index], status: "PUBLISHED"}},
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
      where: {id},
      update: {url, order: index},
      create: {id, url, order: index, translations: {create: {locale: "id", label, status: "PUBLISHED"}}},
    });
  }

  const placeholder = await prisma.media.upsert({
    where: {storageKey: "seed/hero-placeholder.svg"},
    update: {},
    create: {
      storageKey: "seed/hero-placeholder.svg",
      checksumSha256: "0".repeat(64),
      originalName: "hero-placeholder.svg",
      mimeType: "image/svg+xml",
      size: 0,
      alt: "Placeholder hero yang wajib diganti sebelum publikasi",
    },
  });
  await prisma.homeSlider.upsert({
    where: {id: "slider-1"},
    update: {imageMediaId: placeholder.id},
    create: {
      id: "slider-1",
      imageMediaId: placeholder.id,
      translations: {
        create: {locale: "id", title: "Selamat Datang di FUSPI", status: "DRAFT"},
      },
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
