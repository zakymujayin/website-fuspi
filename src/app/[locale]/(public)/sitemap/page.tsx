import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import {institution} from "@/config/institution";

const ROUTES = [
  {href: "/", key: "home"}, {href: "/profil", key: "profile"},
  {href: "/prodi", key: "studyPrograms"}, {href: "/dosen", key: "lecturers"},
  {href: "/tenaga-kependidikan", key: "staff"}, {href: "/akademik", key: "academics"},
  {href: "/riset", key: "research"}, {href: "/berita", key: "news"},
  {href: "/pengumuman", key: "announcements"}, {href: "/kolom", key: "columns"},
  {href: "/agenda", key: "agenda"}, {href: "/album", key: "albums"},
  {href: "/dokumen", key: "documents"}, {href: "/layanan", key: "services"},
  {href: "/kerjasama", key: "partnerships"}, {href: "/beasiswa", key: "scholarships"},
  {href: "/prestasi", key: "achievements"}, {href: "/kegiatan", key: "activities"},
  {href: "/faq", key: "faq"}, {href: "/testimoni", key: "testimonials"},
  {href: "/calon-mahasiswa", key: "prospective"}, {href: "/kontak", key: "contact"},
  {href: "/privasi", key: "privacy"}, {href: "/aksesibilitas", key: "accessibility"},
];

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Footer"});
  return {title: t("sitemap")};
}

export default async function SitemapPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Nav");
  const tPages = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={tPages("sitemapTitle")} />
      <nav aria-label={tPages("sitemapTitle")} className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROUTES.map(({href, key}) => (
          <Link key={href} href={href}
            className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-royal-200 hover:bg-royal-50 hover:text-royal-600">
            {t(key)}
          </Link>
        ))}
        {institution.studyPrograms.map((p) => (
          <Link key={p.code} href={`/prodi/${p.slug}`}
            className="ms-4 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-600 transition-colors hover:border-royal-200 hover:bg-royal-50 hover:text-royal-600">
            {t(`program.${p.code}`)}
          </Link>
        ))}
      </nav>
    </Container>
  );
}
