import type {Metadata} from "next";
import Image from "next/image";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {DeanAvatarPlate} from "@/components/public/dean-avatar-plate";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";
import {deanProfile} from "@/lib/data/dummy-dean";
import {viceDeans} from "@/lib/data/dummy-leadership";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("leadership")};
}

export default async function LeadershipPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const deanPosition = deanProfile.position[locale] ?? deanProfile.position.id;
  const deanMessage = deanProfile.message[locale] ?? deanProfile.message.id;

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("leadership")} description={t("leadershipDesc")} />

      <div className="mt-12 grid items-center gap-10 lg:grid-cols-5">
        <div className="mx-auto w-full max-w-xs lg:col-span-2">
          {deanProfile.photoUrl ? (
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
              <Image src={deanProfile.photoUrl} alt={deanProfile.name} fill sizes="320px" className="object-cover" priority />
            </div>
          ) : (
            <DeanAvatarPlate initials={deanProfile.initials} name={deanProfile.name} />
          )}
        </div>
        <div className="lg:col-span-3">
          <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">
            {t("dean")}
          </span>
          <p className="mt-3 font-display text-xl font-bold text-slate-900">{deanProfile.name}</p>
          <p className="mt-1 text-sm text-slate-500">{deanPosition}</p>
          <blockquote className="mt-5 border-s-4 border-royal-200 ps-6">
            <p className="max-w-[60ch] text-sm leading-relaxed text-slate-600">{deanMessage}</p>
          </blockquote>
        </div>
      </div>

      <div className="mt-16 border-t border-slate-200 pt-12">
        <h2 className="font-display text-lg font-bold text-slate-900">{t("viceDeans")}</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {viceDeans.map((vd) => (
            <div key={vd.initials} className="flex flex-col">
              <div className="max-w-[220px]">
                {vd.photoUrl ? (
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                    <Image src={vd.photoUrl} alt={vd.name} fill sizes="220px" className="object-cover" />
                  </div>
                ) : (
                  <DeanAvatarPlate initials={vd.initials} name={vd.name} />
                )}
              </div>
              <p className="mt-4 font-display text-sm font-semibold text-slate-900">{vd.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{vd.position[locale] ?? vd.position.id}</p>
              {vd.bio ? (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{vd.bio[locale] ?? vd.bio.id}</p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
