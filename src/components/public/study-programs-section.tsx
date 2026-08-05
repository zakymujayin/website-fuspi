import { ArrowRight, GraduationCap } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { institution } from "@/config/institution";
import { Link } from "@/i18n/navigation";

export async function StudyProgramsSection() {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");
  const tProdi = await getTranslations("StudyPrograms");

  return (
    <section className="bg-slate-50 py-16 md:py-24">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-medium tracking-wide text-royal-600 uppercase">
              {t("programsEyebrow")}
            </span>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {tProdi("title")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{tProdi("description")}</p>
          </div>
          <Link
            href="/prodi"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700"
          >
            {t("viewAll")}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {institution.studyPrograms.map((program) => {
            const title = tNav(`program.${program.code}`);
            return (
              <Link
                key={program.code}
                href={`/prodi/${program.slug}`}
                className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-royal-50 text-royal-600 transition-colors group-hover:bg-royal-100">
                  <GraduationCap aria-hidden className="size-5" strokeWidth={1.5} />
                </span>
                <div>
                  <span className="text-[11px] font-medium tracking-wide text-royal-600 uppercase">
                    {program.code}
                  </span>
                  <h3 className="mt-1 font-display text-[15px] font-semibold leading-snug text-balance text-slate-900">
                    {title}
                  </h3>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-royal-600 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                  {tProdi("readMore")}
                  <ArrowRight aria-hidden className="size-3 rtl:rotate-180" strokeWidth={1.5} />
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
