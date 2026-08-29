import {Search} from "lucide-react";
import type {Metadata} from "next";
import Image from "next/image";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import {getPrismaClient} from "@/lib/db/client";
import type {AppLocale} from "@/i18n/routing";

const LECTURER_SELECT = {
  id: true, slug: true, name: true, studyProgramId: true,
  studyProgram: {select: {code: true, slug: true}},
  photoMedia: {select: {id: true, storageKey: true, mimeType: true, alt: true, width: true, height: true}},
  translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, position: true, expertise: true}},
  educations: {
    orderBy: {order: "asc" as const},
    take: 3,
    select: {id: true, degree: true, field: true, institution: true, year: true},
  },
} as const;

type LecturerRow = {
  id: string; slug: string; name: string; studyProgramId: string | null;
  studyProgram: {code: string; slug: string} | null;
  photoMedia: {id: string; storageKey: string; mimeType: string; alt: string | null; width: number | null; height: number | null} | null;
  translations: ReadonlyArray<{locale: string; position: string | null; expertise: string | null}>;
  educations: ReadonlyArray<{id: string; degree: string; field: string | null; institution: string; year: number | null}>;
};

type ProgramRow = {id: string; code: string};

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("lecturers")};
}

function readParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return (value ?? "").trim().slice(0, 120);
}

export default async function DosenPage({
  params,
  searchParams,
}: {
  params: Promise<{locale: AppLocale}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const t = await getTranslations("Pages");
  const tp = await getTranslations("LecturerProfile");
  const tNav = await getTranslations("Nav");

  const search = readParam(query.q);
  const program = readParam(query.prodi);

  let rows: LecturerRow[] = [];
  let programs: ProgramRow[] = [];
  try {
    const prisma = getPrismaClient();
    [rows, programs] = await Promise.all([
      prisma.lecturer.findMany({
        where: {
          isActive: true,
          ...(search ? {name: {contains: search, mode: "insensitive" as const}} : {}),
          ...(program ? {studyProgram: {code: program}} : {}),
        },
        /* `order` is an editorial hint and is not unique, so name breaks the tie.
           Without it the directory can reshuffle between page loads. */
        orderBy: [{order: "asc"}, {name: "asc"}],
        select: LECTURER_SELECT,
      }) as Promise<LecturerRow[]>,
      prisma.studyProgram.findMany({
        where: {isActive: true},
        orderBy: {order: "asc"},
        select: {id: true, code: true},
      }) as Promise<ProgramRow[]>,
    ]);
  } catch {}

  const resolveLocale = (tl: LecturerRow["translations"], loc: AppLocale) =>
    tl.find((item) => item.locale === loc) ?? tl.find((item) => item.locale === "id");

  const isFiltered = Boolean(search || program);

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: tNav("lecturers")},
        ]}
      />
      <SectionHeading as="h1" title={tNav("lecturers")} description={t("lecturersDesc")} />

      <form
        method="get"
        role="search"
        className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="lecturer-search" className="block text-sm font-medium text-slate-700">
            {tp("searchPlaceholder")}
          </label>
          <div className="relative mt-2">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              strokeWidth={1.5}
            />
            <input
              id="lecturer-search"
              type="search"
              name="q"
              defaultValue={search}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pe-3 ps-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-royal-500 focus:outline-2 focus:outline-offset-0 focus:outline-royal-500"
            />
          </div>
        </div>
        {programs.length > 0 ? (
          <div className="sm:w-56">
            <label htmlFor="lecturer-program" className="block text-sm font-medium text-slate-700">
              {t("studyPrograms")}
            </label>
            <select
              id="lecturer-program"
              name="prodi"
              defaultValue={program}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-royal-500 focus:outline-2 focus:outline-offset-0 focus:outline-royal-500"
            >
              <option value="">{tp("allPrograms")}</option>
              {programs.map((p) => (
                <option key={p.id} value={p.code}>{p.code}</option>
              ))}
            </select>
          </div>
        ) : null}
        <button
          type="submit"
          className="rounded-lg bg-royal-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-royal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600 active:translate-y-px"
        >
          {tp("submitSearch")}
        </button>
      </form>

      {rows.length > 0 ? (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => {
            const tl = resolveLocale(d.translations, locale);
            return (
              <li key={d.id}>
                <Link
                  href={`/dosen/${d.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-600"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {d.photoMedia ? (
                      <Image
                        src={`/uploads/${d.photoMedia.storageKey}`}
                        alt={d.photoMedia.alt ?? d.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover object-top"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center font-display text-5xl font-bold text-slate-300">
                        {d.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    {d.studyProgram ? (
                      <p className="text-xs font-medium tracking-wide text-royal-600 uppercase">
                        {d.studyProgram.code}
                      </p>
                    ) : null}
                    <h2 className="mt-1.5 text-start font-display text-base font-semibold text-slate-900 group-hover:text-royal-700"><span dir="auto">
                      {d.name}
                    </span></h2>
                    {tl?.position ? (
                      <p className="mt-1 text-start text-sm text-slate-500"><span dir="auto">{tl.position}</span></p>
                    ) : null}
                    {d.educations.length > 0 ? (
                      <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-500">
                        {d.educations.map((edu) => (
                          <li key={edu.id} dir="auto" className="flex gap-2 text-start">
                            <span className="font-semibold text-slate-700">{edu.degree}</span>
                            <span className="truncate">
                              {[edu.field, edu.institution].filter(Boolean).join(", ")}
                              {edu.year ? ` (${edu.year})` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <span className="mt-auto pt-4 text-sm font-medium text-royal-600 group-hover:underline">
                      {tp("viewProfile")}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            {isFiltered ? tp("emptySearch") : tp("emptyDirectory")}
          </p>
          {isFiltered ? (
            <Link
              href="/dosen"
              className="mt-4 inline-block text-sm font-medium text-royal-600 underline-offset-2 hover:underline"
            >
              {tp("resetSearch")}
            </Link>
          ) : null}
        </div>
      )}
    </Container>
  );
}
