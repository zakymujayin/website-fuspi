import {MapPin, Mail, Phone} from "lucide-react";
import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("contact")};
}

export default async function ContactPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("contactTitle")} description={t("contactDescription")} />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
            <MapPin data-icon aria-hidden className="size-5" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-semibold text-slate-900">{t("address")}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {institution.name}<br />{institution.university}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
            <Mail data-icon aria-hidden className="size-5" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-semibold text-slate-900">{t("email")}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{t("emailHint")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-lg bg-royal-50 text-royal-600">
            <Phone data-icon aria-hidden className="size-5" strokeWidth={1.5} />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-semibold text-slate-900">{t("phone")}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{t("phoneHint")}</p>
          </div>
        </div>
      </div>
    </Container>
  );
}
