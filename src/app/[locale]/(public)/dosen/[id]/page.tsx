import {BookOpen, Globe, GraduationCap} from "lucide-react";
import Image from "next/image";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import type {Metadata} from "next";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import {getPrismaClient} from "@/lib/db/client";
import type {AppLocale} from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuspi.uinbanten.ac.id";

const LECTURER_DETAIL_SELECT = {
  id: true, slug: true, name: true, nidn: true, nip: true, email: true,
  googleScholarUrl: true, sintaUrl: true,
  studyProgram: {select: {code: true, slug: true}},
  photoMedia: {select: {id: true, storageKey: true, mimeType: true, alt: true, width: true, height: true}},
  translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, position: true, expertise: true, bio: true}},
} as const;

type Row = {
  id: string; slug: string; name: string; nidn: string | null; nip: string | null; email: string | null;
  googleScholarUrl: string | null; sintaUrl: string | null;
  studyProgram: {code: string; slug: string} | null;
  photoMedia: {id: string; storageKey: string; mimeType: string; alt: string | null; width: number | null; height: number | null} | null;
  translations: ReadonlyArray<{locale: string; position: string | null; expertise: string | null; bio: string | null}>;
};

export async function generateMetadata({params}: {params: Promise<{locale: string; slug: string}>}): Promise<Metadata> {
  const {locale, slug} = await params;
  const lecturer = await getLecturer(slug);
  if (!lecturer) return {title: slug};
  const tl = resolveLocale(lecturer.translations, locale as AppLocale);
  return {
    title: `${lecturer.name} — ${tl?.position ?? ""}`,
    description: tl?.bio?.slice(0, 160) ?? undefined,
    openGraph: {type: "profile", url: `${SITE_URL}/${locale}/dosen/${slug}`},
  };
}

function resolveLocale<T extends {locale: string}>(items: ReadonlyArray<T>, locale: AppLocale): T | undefined {
  return items.find((t) => t.locale === locale) ?? items.find((t) => t.locale === "id");
}

async function getLecturer(slug: string): Promise<Row | null> {
  try {
    const prisma = getPrismaClient();
    const rows = await prisma.lecturer.findMany({where: {slug, isActive: true}, select: LECTURER_DETAIL_SELECT}) as Row[];
    return rows[0] ?? null;
  } catch { return null; }
}

export default async function DosenDetailPage({params}: {params: Promise<{locale: AppLocale; slug: string}>}) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const tNav = await getTranslations("Nav");

  const lecturer = await getLecturer(slug);
  if (!lecturer) notFound();

  const tl = resolveLocale(lecturer.translations, locale);

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-8"
        items={[
          {label: tNav("home"), href: "/"},
          {label: tNav("lecturers"), href: "/dosen"},
          {label: lecturer.name},
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <SectionHeading as="h1" title={lecturer.name} description={tl?.position ?? undefined} />
          {tl?.bio ? (
            <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{__html: tl.bio}} />
          ) : null}
          {tl?.expertise ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="section-rule font-display text-lg font-semibold text-slate-900">{t("expertise")}</h2>
              <p className="mt-3 text-slate-600">{tl.expertise}</p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          {lecturer.photoMedia ? (
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <Image
                src={`/uploads/${lecturer.photoMedia.storageKey}`}
                alt={lecturer.photoMedia.alt ?? lecturer.name}
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="rounded-xl border border-slate-200 p-6 space-y-3">
            <h3 className="section-rule font-display text-sm font-semibold text-slate-900">{t("quickFacts")}</h3>
            {lecturer.nidn ? <div><dt className="text-xs text-slate-400 uppercase">NIDN</dt><dd className="text-sm font-medium text-slate-700">{lecturer.nidn}</dd></div> : null}
            {lecturer.nip ? <div><dt className="text-xs text-slate-400 uppercase">NIP</dt><dd className="text-sm font-medium text-slate-700">{lecturer.nip}</dd></div> : null}
            {lecturer.studyProgram ? (
              <Link href={`/prodi/${lecturer.studyProgram.slug}`}
                className="inline-flex items-center gap-2 text-sm text-royal-600 transition-colors hover:text-royal-700">
                <BookOpen data-icon aria-hidden className="size-4" strokeWidth={1.5} />
                {lecturer.studyProgram.code}
              </Link>
            ) : null}
          </div>
          {(lecturer.googleScholarUrl || lecturer.sintaUrl) ? (
            <div className="rounded-xl border border-slate-200 p-6 space-y-3">
              <h3 className="section-rule font-display text-sm font-semibold text-slate-900">{t("publications")}</h3>
              {lecturer.googleScholarUrl ? (
                <a href={lecturer.googleScholarUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-royal-600 hover:text-royal-700">
                  <Globe data-icon aria-hidden className="size-4" strokeWidth={1.5} /> Google Scholar
                </a>
              ) : null}
              {lecturer.sintaUrl ? (
                <a href={lecturer.sintaUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-royal-600 hover:text-royal-700">
                  <GraduationCap data-icon aria-hidden className="size-4" strokeWidth={1.5} /> SINTA
                </a>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}
