import { ArrowRight, Quote } from "lucide-react";
import NextImage from "next/image";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { deanProfile } from "@/lib/data/dummy-dean";

type DeanWelcomeSectionProps = {
  locale: AppLocale;
};

export async function DeanWelcomeSection({locale}: DeanWelcomeSectionProps) {
  const t = await getTranslations("Home");
  const message = deanProfile.message[locale] ?? deanProfile.message.id;
  const position = deanProfile.position[locale] ?? deanProfile.position.id;

  return (
    <section className="bg-slate-50 py-16 md:py-24">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="relative mx-auto max-w-xs overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <NextImage
                src={deanProfile.photo}
                alt={deanProfile.name}
                width={400}
                height={500}
                className="aspect-[3/4] w-full object-cover"
                unoptimized
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <span className="text-[11px] font-medium tracking-wide text-royal-600 uppercase">
              {t("deanWelcome")}
            </span>
            <div className="mt-4">
              <blockquote className="relative">
                <Quote
                  aria-hidden
                  className="absolute -start-1 -top-2 size-8 text-royal-100 rtl:rotate-180"
                  strokeWidth={1}
                />
                <div className="ps-8">
                  <p className="text-lg leading-relaxed text-slate-600 md:text-xl md:leading-relaxed">
                    {message}
                  </p>
                </div>
              </blockquote>
              <div className="mt-6">
                <p className="font-display text-lg font-semibold text-slate-900">
                  {deanProfile.name}
                </p>
                <p className="text-sm text-slate-500">{position}</p>
              </div>
              <div className="mt-6">
                <Link
                  href={deanProfile.slug}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-royal-200 hover:bg-royal-50 hover:text-royal-700 active:scale-[0.98]"
                >
                  {t("deanCta")}
                  <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
