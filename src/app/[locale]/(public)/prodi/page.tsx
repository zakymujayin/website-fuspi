import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumb } from "@/components/public/breadcrumb";
import { SectionHeading } from "@/components/public/section-heading";
import { Container } from "@/components/ui/container";
import { institution } from "@/config/institution";
import { Link } from "@/i18n/navigation";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StudyPrograms" });

  return { title: t("title"), description: t("description") };
}

export default async function StudyProgramsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("StudyPrograms");
  const tNav = await getTranslations("Nav");

  return (
    <Container className="py-12 md:py-20">
      <Breadcrumb
        ariaLabel={tNav("breadcrumbLabel")}
        className="mb-6"
        items={[
          {label: tNav("home"), href: "/"},
          {label: t("title")},
        ]}
      />
      <SectionHeading
        as="h1"
        id="programs-title"
        title={t("title")}
        description={t("description")}
      />

      <ul
        aria-labelledby="programs-title"
        className="mt-12 grid gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3"
      >
        {institution.studyPrograms.map((program) => (
          <li key={program.code} className="flex">
            <Link
              href={`/prodi/${program.slug}`}
              className="group flex flex-1 flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-[11px] font-medium tracking-wide text-royal-600 uppercase">
                {program.code}
              </span>
              <h2 className="font-display text-[17px] font-semibold text-balance text-slate-900">
                {tNav(`program.${program.code}`)}
              </h2>
              <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-royal-600">
                {t("readMore")}
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                  strokeWidth={1.5}
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
