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
} as const;

type LecturerRow = {
  id: string; slug: string; name: string; studyProgramId: string | null;
  studyProgram: {code: string; slug: string} | null;
  photoMedia: {id: string; storageKey: string; mimeType: string; alt: string | null; width: number | null; height: number | null} | null;
  translations: ReadonlyArray<{locale: string; position: string | null; expertise: string | null}>;
};

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("lecturers")};
}

export default async function DosenPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const tNav = await getTranslations("Nav");

  let rows: LecturerRow[] = [];
  try {
    const prisma = getPrismaClient();
    rows = await prisma.lecturer.findMany({
      where: {isActive: true},
      orderBy: {order: "asc"},
      select: LECTURER_SELECT,
    }) as LecturerRow[];
  } catch {}

  const resolveLocale = (tl: typeof rows[0]["translations"], loc: AppLocale) =>
    tl.find((t) => t.locale === loc) ?? tl.find((t) => t.locale === "id");

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
      {rows.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((d) => {
            const tl = resolveLocale(d.translations, locale);
            return (
              <Link key={d.id} href={`/dosen/${d.slug}`}
                className="group flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative size-24 overflow-hidden rounded-full bg-slate-100">
                  {d.photoMedia ? (
                    <Image
                      src={`/uploads/${d.photoMedia.storageKey}`}
                      alt={d.photoMedia.alt ?? d.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center font-display text-2xl font-bold text-slate-300">
                      {d.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-display text-[15px] font-semibold text-slate-900">{d.name}</h2>
                  {tl?.position ? <p className="mt-1 text-sm text-slate-500">{tl.position}</p> : null}
                  {d.studyProgram ? (
                    <p className="mt-1 text-xs font-medium tracking-wide text-royal-600 uppercase">{d.studyProgram.code}</p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-12 rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">{t("noContent")}</p>
        </div>
      )}
    </Container>
  );
}
