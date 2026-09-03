import {ArrowUpRight, GraduationCap, Mail, Phone} from "lucide-react";
import type {Metadata} from "next";
import Image from "next/image";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {ImageWithFallback} from "@/components/public/image-with-fallback";
import {pmbLink} from "@/components/public/nav-items";
import {formatJakartaPublishedDate} from "@/components/public/post/format";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";
import {Link} from "@/i18n/navigation";
import {getPrismaClient} from "@/lib/db/client";
import {getPostsByStudyProgram, type RelatedPostCard} from "@/lib/content/post-public-queries";
import type {AppLocale} from "@/i18n/routing";

const STUDY_PROGRAM_SELECT = {
  id: true, code: true, slug: true, degree: true, accreditation: true, accreditationExpiry: true,
  externalUrl: true, email: true, phone: true, isActive: true,
  translations: {
    where: {status: "PUBLISHED" as const},
    select: {
      locale: true, name: true, description: true, vision: true, mission: true,
      objectives: true, learningOutcomes: true, graduateProfile: true, careerProspects: true,
    },
  },
} as const;

const LECTURER_SELECT = {
  id: true, slug: true, name: true,
  photoMedia: {select: {storageKey: true, alt: true}},
  translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, position: true}},
} as const;

/** How many lecturers the programme page previews before deferring to /dosen. */
const LECTURER_PREVIEW_COUNT = 3;

type ProdiRow = {
  id: string; code: string; slug: string; degree: string | null;
  accreditation: string | null; accreditationExpiry: Date | null;
  externalUrl: string | null; email: string | null; phone: string | null; isActive: boolean;
  translations: ReadonlyArray<{
    locale: string; name: string; description: string | null;
    vision: string | null; mission: string | null; objectives: string | null;
    learningOutcomes: string | null; graduateProfile: string | null; careerProspects: string | null;
  }>;
};

type LecturerRow = {
  id: string; slug: string; name: string;
  photoMedia: {storageKey: string; alt: string | null} | null;
  translations: ReadonlyArray<{locale: string; position: string | null}>;
};

export async function generateStaticParams() {
  return institution.studyPrograms.map((p) => ({slug: p.slug}));
}

export async function generateMetadata({params}: {params: Promise<{locale: string; slug: string}>}): Promise<Metadata> {
  const {locale, slug} = await params;
  const program = institution.studyPrograms.find((p) => p.slug === slug);
  if (!program) return {};
  const t = await getTranslations({locale, namespace: "Nav"});
  return {
    title: t(`program.${program.code}` as never),
    description: `Program studi ${program.name} — ${institution.name}`,
  };
}

function resolveTranslation<T extends {locale: string}>(items: ReadonlyArray<T>, locale: AppLocale): T | undefined {
  return items.find((t) => t.locale === locale) ?? items.find((t) => t.locale === "id");
}

export default async function ProdiDetailPage({params}: {params: Promise<{locale: AppLocale; slug: string}>}) {
  const {locale, slug} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("StudyPrograms");
  const tNav = await getTranslations("Nav");
  const tLecturer = await getTranslations("LecturerProfile");

  const program = institution.studyPrograms.find((p) => p.slug === slug);
  if (!program) notFound();

  let dbProdi: ProdiRow | null = null;
  let lecturers: LecturerRow[] = [];
  let relatedPosts: RelatedPostCard[] = [];
  try {
    const prisma = getPrismaClient();
    const rows = await prisma.studyProgram.findMany({
      where: {slug, isActive: true},
      select: STUDY_PROGRAM_SELECT,
    }) as ProdiRow[];
    dbProdi = rows[0] ?? null;
    if (dbProdi) {
      const uploadBase = process.env.UPLOAD_PUBLIC_URL ?? "/uploads";
      [lecturers, relatedPosts] = await Promise.all([
        prisma.lecturer.findMany({
          where: {isActive: true, studyProgramId: dbProdi.id},
          /* `order` is an editorial hint and is not unique, so name breaks the
             tie — otherwise the preview reshuffles between page loads. */
          orderBy: [{order: "asc"}, {name: "asc"}],
          take: LECTURER_PREVIEW_COUNT,
          select: LECTURER_SELECT,
        }) as Promise<LecturerRow[]>,
        getPostsByStudyProgram(prisma, dbProdi.id, locale, uploadBase, 3),
      ]);
    }
  } catch {
    // database unavailable
  }

  const tl = dbProdi ? resolveTranslation(dbProdi.translations, locale) : null;
  const programName = tl?.name ?? tNav(`program.${program.code}`);
  const accreditationExpiryYear = dbProdi?.accreditationExpiry?.getUTCFullYear() ?? null;
  const otherPrograms = institution.studyPrograms.filter((p) => p.slug !== slug);

  /* Every narrative block is optional per programme, so the article is built as
     data: an empty list is what drives the "no content yet" state, and the
     section order stays the one an accreditation reader expects. */
  const narrative = [
    {id: "vision", heading: t("vision"), html: tl?.vision, variant: "quote" as const},
    {id: "mission", heading: t("mission"), html: tl?.mission, variant: "mission" as const},
    {id: "objectives", heading: t("objectives"), html: tl?.objectives, variant: "prose" as const},
    {id: "outcomes", heading: t("learningOutcomes"), html: tl?.learningOutcomes, variant: "prose" as const},
    {id: "graduates", heading: t("graduateProfile"), html: tl?.graduateProfile, variant: "prose" as const},
    {id: "careers", heading: t("careerProspects"), html: tl?.careerProspects, variant: "prose" as const},
  ].filter((section): section is typeof section & {html: string} => Boolean(section.html?.trim()));

  const facts = [
    dbProdi?.degree ? {label: t("degree"), value: dbProdi.degree} : null,
    dbProdi?.accreditation ? {label: t("accreditation"), value: dbProdi.accreditation} : null,
    accreditationExpiryYear ? {label: t("accreditationValidLabel"), value: String(accreditationExpiryYear)} : null,
  ].filter((fact): fact is {label: string; value: string} => fact !== null);

  return (
    <>
      <Container className="pt-8">
        <Breadcrumb
          ariaLabel={tNav("breadcrumbLabel")}
          items={[
            {label: tNav("home"), href: "/"},
            {label: tNav("studyPrograms"), href: "/prodi"},
            {label: programName, resolvedLocale: tl ? (tl.locale as AppLocale) : undefined},
          ]}
        />
      </Container>

      {/* Identity band. The programme's positioning line and its hard
          credentials live here and nowhere else on the page — the old layout
          repeated the description twice and re-listed the degree in a sidebar
          box. */}
      <section aria-labelledby="prodi-title" className="grain relative mt-8 overflow-hidden bg-gradient-to-br from-royal-800 to-royal-950">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 55% 80% at 88% 15%, rgba(114,142,239,0.32), transparent 62%)",
          }}
        />
        <Container className="relative py-14 md:py-20">
          <span className="inline-flex items-center rounded-full border border-white/25 px-3 py-1 font-display text-xs font-semibold tracking-wide text-white">
            {program.code}
          </span>
          <h1
            id="prodi-title"
            dir="auto"
            className="section-rule mt-5 max-w-4xl font-display text-3xl font-bold tracking-tight text-balance text-white md:text-4xl lg:text-5xl"
          >
            {programName}
          </h1>
          {tl?.description ? (
            <p dir="auto" className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
              {tl.description}
            </p>
          ) : null}

          {facts.length > 0 ? (
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-white/15 pt-6 text-center sm:gap-8">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs font-medium text-slate-400">{fact.label}</dt>
                  <dd className="mt-1 font-display text-lg font-semibold text-white">{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Container>
      </section>

      <Container className="py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7 xl:col-span-8">
            {narrative.length > 0 ? (
              <div className="space-y-12">
                {narrative.map((section) => (
                  <section key={section.id} aria-labelledby={`${section.id}-heading`}>
                    <h2
                      id={`${section.id}-heading`}
                      className="section-rule font-display text-xl font-bold text-slate-900 md:text-2xl"
                    >
                      {section.heading}
                    </h2>
                    {section.variant === "quote" ? (
                      /* The vision is a single aspirational sentence — it reads
                         as a statement, not as body copy, so it gets the tinted
                         plate the faculty vision already uses on the home page. */
                      <div
                        dir="auto"
                        className="rich-text mt-6 rounded-2xl border border-royal-100 bg-royal-50 p-6 font-display text-base font-semibold leading-relaxed text-royal-900 md:p-8 md:text-lg"
                        dangerouslySetInnerHTML={{__html: section.html}}
                      />
                    ) : (
                      <div
                        dir="auto"
                        className={section.variant === "mission" ? "mission-list mt-6" : "rich-text prose-measure mt-6"}
                        dangerouslySetInnerHTML={{__html: section.html}}
                      />
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="text-sm text-slate-500">{t("noContent")}</p>
              </div>
            )}
          </div>

          <aside className="lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-[152px] lg:space-y-8">
              {/* One panel for the only question a prospective student has left. */}
              <div className="rounded-2xl border border-royal-100 bg-royal-50 p-6 md:p-7">
                <h2 className="font-display text-base font-bold text-royal-900">{t("nextStepTitle")}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t("nextStepBody")}</p>
                <a
                  href={pmbLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-royal-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 active:translate-y-px"
                >
                  <GraduationCap data-icon aria-hidden className="size-4" strokeWidth={1.5} />
                  {t("nextStepCta")}
                </a>
                <ul className="mt-5 space-y-3 border-t border-royal-100 pt-5 text-sm">
                  <li>
                    <Link
                      href="/kontak"
                      className="inline-flex items-center gap-2 text-royal-700 transition-colors hover:text-royal-900"
                    >
                      <Mail data-icon aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                      {t("contactFaculty")}
                    </Link>
                  </li>
                  {dbProdi?.email ? (
                    <li>
                      <a
                        href={`mailto:${dbProdi.email}`}
                        className="inline-flex items-center gap-2 break-all text-royal-700 transition-colors hover:text-royal-900"
                      >
                        <Mail data-icon aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                        {dbProdi.email}
                      </a>
                    </li>
                  ) : null}
                  {dbProdi?.phone ? (
                    <li>
                      <a
                        href={`tel:${dbProdi.phone.replace(/[^+\d]/g, "")}`}
                        className="inline-flex items-center gap-2 text-royal-700 transition-colors hover:text-royal-900"
                      >
                        <Phone data-icon aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                        <span dir="ltr">{dbProdi.phone}</span>
                      </a>
                    </li>
                  ) : null}
                  {dbProdi?.externalUrl ? (
                    <li>
                      <a
                        href={dbProdi.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-royal-700 transition-colors hover:text-royal-900"
                      >
                        <ArrowUpRight data-icon aria-hidden className="size-4 shrink-0 rtl:-scale-x-100" strokeWidth={1.5} />
                        {t("externalSite")}
                      </a>
                    </li>
                  ) : null}
                </ul>
              </div>

              {otherPrograms.length > 0 ? (
                <nav aria-labelledby="other-programs-heading" className="mt-8 lg:mt-0">
                  <h2
                    id="other-programs-heading"
                    className="section-rule font-display text-sm font-bold text-slate-900"
                  >
                    {t("otherPrograms")}
                  </h2>
                  <ul className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
                    {otherPrograms.map((p) => (
                      <li key={p.code}>
                        <Link
                          href={`/prodi/${p.slug}`}
                          className="group flex items-center gap-3 py-3.5 transition-colors hover:text-royal-700"
                        >
                          <span className="inline-flex min-w-11 shrink-0 justify-center rounded border border-slate-200 px-1.5 py-0.5 font-display text-[11px] font-semibold text-slate-500 group-hover:border-royal-200 group-hover:text-royal-600">
                            {p.code}
                          </span>
                          <span className="text-sm text-slate-700 group-hover:text-royal-700">
                            {tNav(`program.${p.code}`)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}
            </div>
          </aside>
        </div>
      </Container>

      {lecturers.length > 0 ? (
        <section aria-labelledby="lecturers-heading" className="border-t border-slate-200 bg-white py-14 md:py-16">
          <Container>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="lecturers-heading" className="section-rule font-display text-xl font-bold text-slate-900 md:text-2xl">
                {t("programLecturers")}
              </h2>
              <Link
                href={`/dosen?prodi=${program.code}`}
                className="text-sm font-medium text-royal-600 underline-offset-4 hover:underline"
              >
                {t("viewAllLecturers")}
              </Link>
            </div>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lecturers.map((lecturer) => {
                const position = resolveTranslation(lecturer.translations, locale)?.position;
                return (
                  <li key={lecturer.id}>
                    <Link
                      href={`/dosen/${lecturer.slug}`}
                      className="group flex h-full items-center gap-4 rounded-xl border border-slate-200 p-4 transition-colors hover:border-royal-200 hover:bg-royal-50/50"
                    >
                      <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        {lecturer.photoMedia ? (
                          <Image
                            src={`/uploads/${lecturer.photoMedia.storageKey}`}
                            alt={lecturer.photoMedia.alt ?? lecturer.name}
                            fill
                            sizes="56px"
                            className="object-cover object-top"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center font-display text-lg font-bold text-slate-400">
                            {lecturer.name.charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span
                          dir="auto"
                          className="block truncate font-display text-sm font-semibold text-slate-900 group-hover:text-royal-700"
                        >
                          {lecturer.name}
                        </span>
                        {position ? (
                          <span dir="auto" className="mt-0.5 block truncate text-xs text-slate-500">
                            {position}
                          </span>
                        ) : (
                          <span className="mt-0.5 block text-xs text-slate-400">{tLecturer("viewProfile")}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Container>
        </section>
      ) : null}

      {relatedPosts.length > 0 ? (
        <section aria-labelledby="related-news-heading" className="border-t border-slate-200 py-14 md:py-16">
          <Container>
            <h2 id="related-news-heading" className="section-rule font-display text-xl font-bold text-slate-900 md:text-2xl">
              {t("relatedNews")}
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/${post.type === "KOLOM" ? "kolom" : "berita"}/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-royal-200"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <ImageWithFallback
                      src={post.cover?.url}
                      alt=""
                      className="object-cover"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-slate-900 group-hover:text-royal-700">
                      {post.translation.title}
                    </h3>
                    <p className="mt-auto text-xs text-slate-400">
                      {formatJakartaPublishedDate(post.publishedAt, locale)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      ) : null}
    </>
  );
}
