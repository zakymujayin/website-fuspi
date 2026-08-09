import type {MetadataRoute} from "next";
import {institution} from "@/config/institution";
import {createPrismaClient} from "@/lib/db/client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuspi.uinbanten.ac.id";

const STATIC_ROUTES = [
  "", "/profil", "/akademik", "/riset", "/kontak",
  "/berita", "/pengumuman", "/kolom", "/agenda", "/album", "/dokumen",
  "/prodi", "/layanan", "/kerjasama", "/beasiswa", "/prestasi", "/kegiatan",
  "/faq", "/testimoni",
];

async function getPublishedSlugs(model: "post" | "service" | "event" | "page"): Promise<string[]> {
  try {
    const prisma = createPrismaClient();
    if (model === "post") {
      const rows = await prisma.post.findMany({where: {status: "PUBLISHED"}, select: {slug: true}});
      return rows.map((r) => r.slug);
    }
    if (model === "service") {
      const rows = await prisma.service.findMany({where: {isActive: true}, select: {slug: true}});
      return rows.map((r) => r.slug);
    }
    if (model === "event") {
      const rows = await prisma.event.findMany({where: {isPublished: true}, select: {slug: true}});
      return rows.map((r) => r.slug);
    }
    if (model === "page") {
      const rows = await prisma.page.findMany({where: {status: "PUBLISHED"}, select: {slug: true}});
      return rows.map((r) => r.slug);
    }
  } catch {}
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const [posts, pages] = await Promise.all([getPublishedSlugs("post"), getPublishedSlugs("page")]);

  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}/id${route}`,
    lastModified,
    alternates: {
      languages: {
        id: `${SITE_URL}/id${route}`,
        en: `${SITE_URL}/en${route}`,
        ar: `${SITE_URL}/ar${route}`,
      },
    },
  }));

  const prodiEntries = institution.studyPrograms.map((p) => ({
    url: `${SITE_URL}/id/prodi/${p.slug}`,
    lastModified,
    alternates: {
      languages: {
        id: `${SITE_URL}/id/prodi/${p.slug}`,
        en: `${SITE_URL}/en/prodi/${p.slug}`,
        ar: `${SITE_URL}/ar/prodi/${p.slug}`,
      },
    },
  }));

  const postEntries = posts.map((slug) => ({
    url: `${SITE_URL}/id/berita/${slug}`,
    lastModified,
    alternates: {
      languages: {
        id: `${SITE_URL}/id/berita/${slug}`,
        en: `${SITE_URL}/en/berita/${slug}`,
        ar: `${SITE_URL}/ar/berita/${slug}`,
      },
    },
  }));

  const pageEntries = pages.map((slug) => ({
    url: `${SITE_URL}/id/halaman/${slug}`,
    lastModified,
    alternates: {
      languages: {
        id: `${SITE_URL}/id/halaman/${slug}`,
        en: `${SITE_URL}/en/halaman/${slug}`,
        ar: `${SITE_URL}/ar/halaman/${slug}`,
      },
    },
  }));

  return [...staticEntries, ...prodiEntries, ...postEntries, ...pageEntries];
}
