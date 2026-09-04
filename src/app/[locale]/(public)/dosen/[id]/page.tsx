import {
  Award,
  BookOpen,
  Clock,
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import type {ReactNode} from "react";
import Image from "next/image";
import {notFound} from "next/navigation";
import {getTranslations, setRequestLocale} from "next-intl/server";
import type {Metadata} from "next";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {LecturerAcademicRecords} from "@/components/public/lecturer-academic-records";
import {splitExpertiseTags} from "@/components/public/lecturer-profile-utils";
import {sanitizeStoredContentOrNull} from "@/components/public/post/sanitize";
import {researchMediaLinks} from "@/components/public/research-media-icons";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";
import {CmsHttpsExternalUrlSchema} from "@/contracts/cms";
import {Link} from "@/i18n/navigation";
import {getPrismaClient} from "@/lib/db/client";
import type {AppLocale} from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fuspi.uinbanten.ac.id";

const LECTURER_DETAIL_SELECT = {
  id: true, slug: true, name: true, nidn: true, nip: true, email: true, phone: true,
  orcid: true,
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
  orcid: string | null;
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

function CardField({label, children}: {label: string; children: ReactNode}) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <div className="mt-1.5 text-sm text-slate-700">{children}</div>
    </div>
  );
}

function SectionCard({id, title, action, children}: {
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-24px_rgba(15,23,42,0.25)] md:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="font-display text-lg font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Chip({icon: Icon, children}: {icon: typeof Award; children: ReactNode}) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-md bg-royal-50 px-2.5 py-1 text-xs font-medium text-royal-700">
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.6} />
      <span dir="auto">{children}</span>
    </li>
  );
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

  const mediaLinks = researchMediaLinks(lecturer);

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
      academicYearStart: item.academicYearStart,
      academicYearEnd: item.academicYearEnd,
      term: item.term === "GANJIL" ? "odd" as const : "even" as const,
      semester: item.semester,
    }));

  return (
    <div className="bg-slate-50">
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

      <header className="lecturer-hero mb-10 rounded-2xl border border-royal-100 bg-royal-50 px-6 py-8 md:px-10 md:py-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold tracking-[0.14em] text-royal-700 uppercase">
          {lecturer.studyProgram?.code ? <span>{lecturer.studyProgram.code}</span> : null}
          {lecturer.studyProgram?.code && programName ? <span aria-hidden className="h-px w-6 bg-brass-500" /> : null}
          {programName ? <span className="tracking-normal normal-case text-royal-800">{programName}</span> : null}
        </div>
        <h1 className="mt-6 max-w-3xl text-start font-display text-3xl font-bold tracking-tight text-navy-900 text-balance md:text-5xl">
          <span dir="auto">{lecturer.name}</span>
        </h1>
        {tl?.position ? <p className="mt-3 text-sm font-medium text-royal-800" dir="auto">{tl.position}</p> : null}
      </header>

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
        <aside className="order-1 lg:col-span-4 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-24 grid gap-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-24px_rgba(15,23,42,0.25)]">
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

                {lecturer.nip ? (
                  <CardField label="NIP">
                    <span dir="ltr" className="font-mono">{lecturer.nip}</span>
                  </CardField>
                ) : null}

                {lecturer.nidn ? (
                  <CardField label="NIDN">
                    <span dir="ltr" className="font-mono">{lecturer.nidn}</span>
                  </CardField>
                ) : null}

                {programName ? (
                  <CardField label={tAcademic("scheduleProgram")}>
                    <ul className="flex flex-wrap gap-2">
                      <Chip icon={GraduationCap}>{programName}</Chip>
                    </ul>
                  </CardField>
                ) : null}

                {expertiseTags.length > 0 ? (
                  <CardField label={t("expertise")}>
                    <ul className="flex flex-wrap gap-2">
                      {expertiseTags.map((tag) => (
                        <Chip key={tag} icon={BookOpen}>{tag}</Chip>
                      ))}
                    </ul>
                  </CardField>
                ) : null}

                {tl?.position ? (
                  <CardField label={t("position")}>
                    <ul className="flex flex-wrap gap-2">
                      <Chip icon={Award}>{tl.position}</Chip>
                    </ul>
                  </CardField>
                ) : null}

                {mediaLinks.length > 0 ? (
                  <CardField label={t("researchMedia")}>
                    <ul className="flex flex-wrap items-center gap-2">
                      {mediaLinks.map(({key, href, label, Icon}) => (
                        <li key={key}>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={label}
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-royal-200 hover:bg-royal-50 hover:text-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
                          >
                            <Icon className="size-4" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </CardField>
                ) : null}

                {(lecturer.email || lecturer.phone) ? (
                  <CardField label={t("contact")}>
                    <div className="space-y-2">
                      {lecturer.email ? (
                        <p className="flex items-start gap-2">
                          <Mail aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                          <a href={`mailto:${lecturer.email}`} dir="ltr" className="text-start break-all text-royal-600 underline-offset-2 hover:underline">{lecturer.email}</a>
                        </p>
                      ) : null}
                      {lecturer.phone ? (
                        <p className="flex items-start gap-2">
                          <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                          <span dir="ltr" className="text-start">{lecturer.phone}</span>
                        </p>
                      ) : null}
                    </div>
                  </CardField>
                ) : null}

                {tl?.officeLocation ? (
                  <CardField label={t("officeAddress")}>
                    <p className="flex items-start gap-2">
                      <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                      <span dir="auto">{tl.officeLocation}</span>
                    </p>
                  </CardField>
                ) : null}

                {tl?.officeHours ? (
                  <CardField label={t("officeHours")}>
                    <p className="flex items-start gap-2">
                      <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={1.5} />
                      <span dir="auto">{tl.officeHours}</span>
                    </p>
                  </CardField>
                ) : null}

                {lecturer.cvMedia ? (
                  <CardField label={t("curriculumVitae")}>
                    <a
                      href={`/uploads/${lecturer.cvMedia.storageKey}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-royal-200 bg-royal-50 px-3 py-2 text-sm font-semibold text-royal-700 transition-colors hover:bg-royal-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
                    >
                      <Download data-icon aria-hidden className="size-4" strokeWidth={1.5} />
                      {t("downloadCv")}
                    </a>
                  </CardField>
                ) : null}
              </div>
            </div>
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

          <div className="grid gap-8">
            {sanitizedBio ? (
              <SectionCard id="lecturer-bio" title={t("biography")}>
                <div
                  dir="auto"
                  className="rich-text"
                  dangerouslySetInnerHTML={{__html: sanitizedBio}}
                />
              </SectionCard>
            ) : null}

            <SectionCard id="lecturer-education" title={t("education")}>
              {educations.length > 0 ? (
                <ol className="border-s border-slate-200">
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
                <p className="text-sm text-slate-500">{t("noEducation")}</p>
              )}
            </SectionCard>

            <SectionCard
              id="lecturer-publications"
              title={t("publications")}
              action={publications.length > 0 ? <span className="font-mono text-xs text-slate-400">{publications.length}</span> : undefined}
            >
              {groupedPublications.length > 0 ? (
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
              ) : (
                <p className="text-sm text-slate-500">{t("noPublications")}</p>
              )}
            </SectionCard>
          </div>

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
              allPeriods: t("allPeriods"),
              period: t("period"),
              noTeaching: t("noTeaching"),
              teachingPending: t("teachingPending"),
              code: tAcademic("courseCode"),
              course: tAcademic("courseName"),
              program: tAcademic("scheduleProgram"),
              credits: tAcademic("courseCredits"),
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
    </div>
  );
}
