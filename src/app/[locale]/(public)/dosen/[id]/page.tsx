import {
  BookOpen,
  Clock,
  Download,
  ExternalLink,
  Globe,
  GraduationCap,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import Image from "next/image";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import type {Metadata} from "next";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {LecturerAcademicRecords} from "@/components/public/lecturer-academic-records";
import {splitExpertiseTags} from "@/components/public/lecturer-profile-utils";
import {sanitizeStoredContentOrNull} from "@/components/public/post/sanitize";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";
import {CmsHttpsExternalUrlSchema} from "@/contracts/cms";
import {Link} from "@/i18n/navigation";
import {getPrismaClient} from "@/lib/db/client";
import type {AppLocale} from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuspi.uinbanten.ac.id";

const LECTURER_DETAIL_SELECT = {
  id: true, slug: true, name: true, nidn: true, nip: true, email: true, phone: true,
  googleScholarUrl: true, sintaUrl: true, scopusUrl: true,
  linkedinUrl: true, instagramUrl: true, twitterUrl: true,
  studyProgram: {select: {code: true, slug: true}},
  photoMedia: {select: {id: true, storageKey: true, mimeType: true, alt: true, width: true, height: true}},
  cvMedia: {select: {id: true, storageKey: true, originalName: true}},
  translations: {
    where: {status: "PUBLISHED" as const},
    select: {locale: true, position: true, expertise: true, bio: true, quote: true, officeHours: true, officeLocation: true},
  },
  educations: {
    select: {id: true, degree: true, field: true, institution: true, city: true, year: true, order: true},
  },
  publications: {
    select: {id: true, title: true, type: true, year: true, publisher: true, url: true, doi: true, order: true},
  },
  research: {
    select: {
      research: {
        select: {
          id: true, year: true, documentUrl: true,
          translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, title: true}},
        },
      },
    },
  },
  communityServices: {
    select: {
      communityService: {
        select: {
          id: true, year: true, location: true, documentUrl: true,
          translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, title: true}},
        },
      },
    },
  },
  intellectualProperties: {
    select: {id: true, title: true, type: true, registrationNumber: true, year: true, url: true, order: true},
  },
  teachingAssignments: {
    select: {id: true, courseCode: true, courseName: true, programCode: true, credits: true, academicYearStart: true, academicYearEnd: true, term: true, semester: true, order: true},
  },
} as const;

type MediaRef = {id: string; storageKey: string; mimeType: string; alt: string | null; width: number | null; height: number | null};
type EducationRow = {id: string; degree: string; field: string | null; institution: string; city: string | null; year: number | null; order: number};
type PublicationRow = {
  id: string; title: string; type: string; year: number | null;
  publisher: string | null; url: string | null; doi: string | null; order: number;
};
type ResearchRelationRow = {
  research: {
    id: string;
    year: number;
    documentUrl: string | null;
    translations: ReadonlyArray<{locale: string; title: string}>;
  };
};
type CommunityRelationRow = {
  communityService: {
    id: string;
    year: number;
    location: string | null;
    documentUrl: string | null;
    translations: ReadonlyArray<{locale: string; title: string}>;
  };
};

type Row = {
  id: string; slug: string; name: string; nidn: string | null; nip: string | null;
  email: string | null; phone: string | null;
  googleScholarUrl: string | null; sintaUrl: string | null; scopusUrl: string | null;
  linkedinUrl: string | null; instagramUrl: string | null; twitterUrl: string | null;
  studyProgram: {code: string; slug: string} | null;
  photoMedia: MediaRef | null;
  cvMedia: {id: string; storageKey: string; originalName: string} | null;
  translations: ReadonlyArray<{
    locale: string; position: string | null; expertise: string | null; bio: string | null;
    quote: string | null; officeHours: string | null; officeLocation: string | null;
  }>;
  educations: ReadonlyArray<EducationRow>;
  publications: ReadonlyArray<PublicationRow>;
  research: ReadonlyArray<ResearchRelationRow>;
  communityServices: ReadonlyArray<CommunityRelationRow>;
  intellectualProperties: ReadonlyArray<{id: string; title: string; type: string; registrationNumber: string | null; year: number | null; url: string | null; order: number}>;
  teachingAssignments: ReadonlyArray<{id: string; courseCode: string; courseName: string; programCode: string; credits: number; academicYearStart: number; academicYearEnd: number; term: string; semester: number; order: number}>;
};

const PUBLICATION_ORDER = ["JURNAL", "BUKU", "BAB_BUKU", "PROSIDING", "ARTIKEL", "LAINNYA"] as const;

export async function generateMetadata({params}: {params: Promise<{locale: string; id: string}>}): Promise<Metadata> {
  const {locale, id} = await params;
  const lecturer = await getLecturer(id);
  if (!lecturer) return {title: id};
  const tl = resolveLocale(lecturer.translations, locale as AppLocale);
  const title = tl?.position ? `${lecturer.name}, ${tl.position}` : lecturer.name;
  return {
    title,
    description: tl?.bio ? stripTags(tl.bio).slice(0, 160) : undefined,
    openGraph: {type: "profile", url: `${SITE_URL}/${locale}/dosen/${id}`},
  };
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
}

function safeExternalUrl(value: string | null) {
  if (value === null) return null;
  const parsed = CmsHttpsExternalUrlSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
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

export default async function DosenDetailPage({params}: {params: Promise<{locale: AppLocale; id: string}>}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("LecturerProfile");
  const tAcademic = await getTranslations("Academic");
  const tNav = await getTranslations("Nav");

  const lecturer = await getLecturer(id);
  if (!lecturer) notFound();

  const tl = resolveLocale(lecturer.translations, locale);
  const sanitizedBio = tl?.bio ? sanitizeStoredContentOrNull(tl.bio) : null;
  const programName = lecturer.studyProgram
    ? institution.studyPrograms.find((p) => p.code === lecturer.studyProgram!.code)?.name
      ?? lecturer.studyProgram.code
    : null;

  const scholarLinks = [
    {href: lecturer.googleScholarUrl, label: "Google Scholar", icon: Globe},
    {href: lecturer.sintaUrl, label: "SINTA", icon: GraduationCap},
    {href: lecturer.scopusUrl, label: "Scopus", icon: BookOpen},
  ].filter((link): link is {href: string; label: string; icon: typeof Globe} => Boolean(link.href));

  const socialLinks = [
    {href: lecturer.linkedinUrl, label: "LinkedIn", icon: Linkedin},
    {href: lecturer.instagramUrl, label: "Instagram", icon: Instagram},
  ].filter((link): link is {href: string; label: string; icon: typeof Linkedin} => Boolean(link.href));

  const expertiseTags = splitExpertiseTags(tl?.expertise ?? null);

  /* Sorted here rather than in the query: the select is `as const`, which makes a
     multi-key Prisma `orderBy` readonly and therefore rejected. Ties are broken
     explicitly so equal years and equal `order` values cannot reshuffle between
     page loads. */
  const educations = [...lecturer.educations].sort(
    (a, b) => a.order - b.order || a.degree.localeCompare(b.degree),
  );
  const publications = [...lecturer.publications].sort(
    (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.order - b.order || a.title.localeCompare(b.title),
  );

  const groupedPublications = PUBLICATION_ORDER
    .map((type) => ({type, items: publications.filter((p) => p.type === type)}))
    .filter((group) => group.items.length > 0);

  const research = lecturer.research
    .map(({research: item}) => {
      const translation = resolveLocale(item.translations, locale);
      return translation ? {
        id: item.id,
        title: translation.title,
        year: item.year,
        url: safeExternalUrl(item.documentUrl),
      } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  const community = lecturer.communityServices
    .map(({communityService: item}) => {
      const translation = resolveLocale(item.translations, locale);
      return translation ? {
        id: item.id,
        title: translation.title,
        year: item.year,
        location: item.location,
        url: safeExternalUrl(item.documentUrl),
      } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
  const hki = [...lecturer.intellectualProperties]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.order - b.order || a.title.localeCompare(b.title))
    .map((item) => ({...item, url: safeExternalUrl(item.url)}));
  const teaching = [...lecturer.teachingAssignments]
    .sort((a, b) => b.academicYearStart - a.academicYearStart || a.semester - b.semester || a.order - b.order)
    .map((item) => ({
      id: item.id,
      code: item.courseCode,
      course: item.courseName,
      program: item.programCode,
      credits: item.credits,
      academicYear: `${item.academicYearStart}/${item.academicYearEnd}`,
      term: item.term === "GANJIL" ? "odd" as const : "even" as const,
      semester: item.semester,
    }));

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

      <div className="lecturer-hero mb-10 rounded-2xl bg-royal-50 px-6 py-8 md:px-10 md:py-10">
        <h1 className="text-start font-display text-3xl font-bold tracking-tight text-navy-900 md:text-4xl">
          <span dir="auto">{lecturer.name}</span>
        </h1>
        {tl?.position ? (
          <p className="mt-3 text-start text-lg text-royal-800"><span dir="auto">{tl.position}</span></p>
        ) : null}
        {lecturer.studyProgram ? (
          <p className="mt-2 text-start text-sm text-royal-700">
            {tAcademic("scheduleProgram")}
            {": "}
            <span className="font-semibold">{programName}</span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
        <aside className="order-1 lg:col-span-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {lecturer.photoMedia ? (
                <div className="relative aspect-[4/5] bg-slate-100">
                  <Image
                    src={`/uploads/${lecturer.photoMedia.storageKey}`}
                    alt={lecturer.photoMedia.alt ?? lecturer.name}
                    fill
                    priority
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center bg-slate-50 py-8">
                  <span className="flex size-20 items-center justify-center rounded-full bg-royal-100 font-display text-2xl font-bold text-royal-500">
                    {lecturer.name.charAt(0)}
                  </span>
                </div>
              )}

              <div className="space-y-4 p-6">
                <p className="font-display text-base font-bold text-slate-900"><span dir="auto">{lecturer.name}</span></p>

                {(lecturer.nip || lecturer.nidn) ? (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-4 text-sm">
                    {lecturer.nip ? (
                      <div>
                        <dt className="text-xs text-slate-400">NIP</dt>
                        <dd dir="ltr" className="font-mono text-slate-700">{lecturer.nip}</dd>
                      </div>
                    ) : null}
                    {lecturer.nidn ? (
                      <div>
                        <dt className="text-xs text-slate-400">NIDN</dt>
                        <dd dir="ltr" className="font-mono text-slate-700">{lecturer.nidn}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}

                {expertiseTags.length > 0 ? (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs text-slate-400">{t("expertise")}</p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {expertiseTags.map((tag) => (
                        <li
                          key={tag}
                          className="inline-flex items-center rounded-full bg-royal-50 px-3 py-1 text-xs font-medium text-royal-700"
                        >
                          <span dir="auto">{tag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {socialLinks.length > 0 ? (
                  <ul className="flex items-center gap-2 border-t border-slate-100 pt-4">
                    {socialLinks.map(({href, label, icon: Icon}) => (
                      <li key={label}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={label}
                          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-royal-200 hover:bg-royal-50 hover:text-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
                        >
                          <Icon aria-hidden className="size-4" strokeWidth={1.5} />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            {lecturer.cvMedia ? (
              <a
                href={`/uploads/${lecturer.cvMedia.storageKey}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-royal-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 active:translate-y-px"
              >
                <Download data-icon aria-hidden className="size-4" strokeWidth={1.5} />
                {t("downloadCv")}
              </a>
            ) : null}

            {(lecturer.email || lecturer.phone || tl?.officeLocation || tl?.officeHours) ? (
              <section aria-labelledby="lecturer-contact" className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 id="lecturer-contact" className="section-rule font-display text-sm font-semibold text-slate-900">
                  {t("contact")}
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  {lecturer.email ? (
                    <div className="flex items-start gap-3">
                      <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                      <div>
                        <dt className="sr-only">{t("contact")}</dt>
                        <dd>
                          <a href={`mailto:${lecturer.email}`} className="text-royal-600 underline-offset-2 hover:underline">
                            {lecturer.email}
                          </a>
                        </dd>
                      </div>
                    </div>
                  ) : null}
                  {lecturer.phone ? (
                    <div className="flex items-start gap-3">
                      <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                      <div>
                        <dt className="sr-only">{t("contact")}</dt>
                        <dd dir="ltr" className="text-start text-slate-700">{lecturer.phone}</dd>
                      </div>
                    </div>
                  ) : null}
                  {tl?.officeLocation ? (
                    <div className="flex items-start gap-3">
                      <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                      <div>
                        <dt className="text-xs text-slate-400">{t("office")}</dt>
                        <dd dir="auto" className="text-slate-700">{tl.officeLocation}</dd>
                      </div>
                    </div>
                  ) : null}
                  {tl?.officeHours ? (
                    <div className="flex items-start gap-3">
                      <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                      <div>
                        <dt className="text-xs text-slate-400">{t("officeHours")}</dt>
                        <dd dir="auto" className="text-slate-700">{tl.officeHours}</dd>
                      </div>
                    </div>
                  ) : null}
                </dl>
              </section>
            ) : null}

            {scholarLinks.length > 0 ? (
              <section aria-labelledby="lecturer-scholar" className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 id="lecturer-scholar" className="section-rule font-display text-sm font-semibold text-slate-900">
                  {t("scholarProfiles")}
                </h2>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {scholarLinks.map(({href, label, icon: Icon}) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-royal-600 underline-offset-2 hover:underline"
                      >
                        <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
                        {label}
                        <ExternalLink aria-hidden className="size-3 text-slate-400" strokeWidth={1.5} />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </aside>

        <div className="order-2 lg:col-span-8 lg:col-start-5 lg:row-start-1">
          {tl?.quote ? (
            <blockquote
              dir="rtl"
              lang="ar"
              className="mb-10 border-s-2 border-royal-200 ps-5 font-arabic text-xl leading-loose text-royal-900"
            >
              {tl.quote}
            </blockquote>
          ) : null}

          {sanitizedBio ? (
            <section aria-labelledby="lecturer-bio">
              <h2 id="lecturer-bio" className="font-display text-lg font-semibold text-slate-900">
                {t("biography")}
              </h2>
              <div
                dir="auto"
                className="rich-text mt-3"
                dangerouslySetInnerHTML={{__html: sanitizedBio}}
              />
            </section>
          ) : null}

          <section aria-labelledby="lecturer-education" className={sanitizedBio ? "mt-12" : undefined}>
            <h2 id="lecturer-education" className="font-display text-lg font-semibold text-slate-900">
              {t("education")}
            </h2>
            {educations.length > 0 ? (
              <ol className="mt-5 border-s border-slate-200">
                {educations.map((edu) => (
                  <li key={edu.id} className="relative ps-6 pb-7 last:pb-0">
                    <span
                      aria-hidden
                      className="absolute start-0 top-1.5 size-2 -translate-x-1/2 rounded-full bg-royal-500 rtl:translate-x-1/2"
                    />
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span dir="auto" className="font-display text-base font-bold text-royal-900">{edu.degree}</span>
                      {edu.field ? <span dir="auto" className="text-slate-700">{edu.field}</span> : null}
                      {edu.year ? (
                        <span className="ms-auto font-mono text-sm text-slate-400">{edu.year}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-start text-sm text-slate-500">
                      <span dir="auto">{[edu.institution, edu.city].filter(Boolean).join(", ")}</span>
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{t("noEducation")}</p>
            )}
          </section>

          <section aria-labelledby="lecturer-publications" className="mt-12">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="lecturer-publications" className="font-display text-lg font-semibold text-slate-900">
                {t("publications")}
              </h2>
              {publications.length > 0 ? (
                <span className="font-mono text-xs text-slate-400">{publications.length}</span>
              ) : null}
            </div>
            {groupedPublications.length > 0 ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 md:p-8">
                <div className="space-y-8">
                  {groupedPublications.map(({type, items}, groupIndex) => (
                    <div key={type} className={groupIndex > 0 ? "border-t border-slate-200 pt-8" : undefined}>
                      <h3 className="font-display text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        {t(`type${type}` as "typeJURNAL")}
                      </h3>
                      <ul className="mt-4 divide-y divide-slate-200">
                        {items.map((pub) => (
                          <li key={pub.id} className="grid grid-cols-[3.5rem_1fr] gap-x-4 py-3 first:pt-0 last:pb-0">
                            <span className="font-mono text-sm text-slate-400">{pub.year ?? ""}</span>
                            <div className="text-start">
                              {pub.url ? (
                                <a
                                  href={pub.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  dir="auto" className="font-medium text-slate-900 underline-offset-2 hover:text-royal-600 hover:underline"
                                >
                                  {pub.title}
                                </a>
                              ) : (
                                <span dir="auto" className="font-medium text-slate-900">{pub.title}</span>
                              )}
                              {(pub.publisher || pub.doi) ? (
                                <p className="mt-1 text-sm text-slate-500">
                                  <span dir="auto">
                                    {pub.publisher}
                                    {pub.publisher && pub.doi ? " · " : ""}
                                    {pub.doi ? `DOI ${pub.doi}` : ""}
                                  </span>
                                </p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{t("noPublications")}</p>
            )}
          </section>

          <LecturerAcademicRecords
            research={research}
            community={community}
            hki={hki}
            teaching={teaching}
            labels={{
              research: t("research"),
              researchDescription: t("researchDescription"),
              community: t("community"),
              communityDescription: t("communityDescription"),
              hki: t("hki"),
              hkiDescription: t("hkiDescription"),
              teaching: t("teaching"),
              teachingDescription: t("teachingDescription"),
              noRecords: t("noRecords"),
              viewArchive: t("viewArchive"),
              viewDocument: t("viewDocument"),
              location: t("location"),
              academicYear: t("academicYear"),
              termOdd: t("termOdd"),
              termEven: t("termEven"),
              allSemesters: t("allSemesters"),
              semester: t("semester"),
              noTeaching: t("noTeaching"),
              teachingPending: t("teachingPending"),
              code: tAcademic("courseCode"),
              course: tAcademic("courseName"),
              program: tAcademic("scheduleProgram"),
              credits: tAcademic("courseCredits"),
              navigationLabel: t("navigationLabel"),
            }}
          />

          <div className="mt-12">
            <Link
              href="/dosen"
              className="text-sm font-medium text-royal-600 underline-offset-2 hover:underline"
            >
              {t("backToList")}
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}
