import type {Metadata} from "next";
import Image from "next/image";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {DeanAvatarPlate} from "@/components/public/dean-avatar-plate";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";
import {deanProfile} from "@/lib/data/dummy-dean";
import {headOfAdmin, viceDeans} from "@/lib/data/dummy-leadership";

const lhkpnLabels: Record<AppLocale, string> = {
  id: "Lihat LHKPN",
  en: "View LHKPN",
  ar: "عرض LHKPN",
};
const LHKPN_URL = "https://elhkpn.kpk.go.id/portal/user/check_search_announ";

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

  return (
    <div className="bg-slate-50">
      <Container className="py-8 md:py-12">
        <header className="border-b border-slate-200 pb-6 md:pb-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-700">FUSPI · Profil Fakultas</p>
            <h1 className="section-rule mt-3 font-display text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
              {t("leadership")}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 md:text-base md:leading-8">
              {t("leadershipDesc")}
            </p>
          </div>
        </header>

        <main>
          <section aria-labelledby="dean-profile" className="mt-8 md:mt-12">
            <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
              <div className="bg-royal-50 p-4 md:p-6">
                {deanProfile.photoUrl ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-navy-900 ring-1 ring-inset ring-royal-200">
                    <Image
                      src={deanProfile.photoUrl}
                      alt={deanProfile.name}
                      fill
                      sizes="(min-width: 1024px) 38vw, 100vw"
                      className="object-contain"
                      priority
                    />
                  </div>
                ) : (
                  <DeanAvatarPlate initials={deanProfile.initials} name={deanProfile.name} />
                )}
              </div>

              <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-royal-600">{t("dean")}</p>
                <h2 id="dean-profile" className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-950 md:text-4xl">
                  {deanProfile.name}
                </h2>
                <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-600 md:text-base">{deanPosition}</p>
                <a
                  href={LHKPN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg bg-royal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal-700 active:scale-[0.98]"
                >
                  {lhkpnLabels[locale]}
                  <span aria-hidden="true" className="text-base leading-none">↗</span>
                </a>
              </div>
            </div>
          </section>

          <section aria-labelledby="vice-deans" className="mt-20 md:mt-24">
            <div className="border-b border-slate-200 pb-5">
              <h2 id="vice-deans" className="section-rule font-display text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                {t("viceDeans")}
              </h2>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {viceDeans.map((vd) => (
                <article key={vd.initials} className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
                  {vd.photoUrl ? (
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      <Image src={vd.photoUrl} alt={vd.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-contain" />
                    </div>
                  ) : (
                    <DeanAvatarPlate initials={vd.initials} name={vd.name} />
                  )}
                  <div className="flex flex-1 flex-col p-5 md:p-6">
                    <h3 className="font-display text-base font-bold leading-6 text-slate-950">{vd.name}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-royal-700">{vd.position[locale] ?? vd.position.id}</p>
                    {vd.bio ? <p className="mt-4 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">{vd.bio[locale] ?? vd.bio.id}</p> : null}
                    <a
                      href={LHKPN_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-auto inline-flex min-h-10 w-fit items-center gap-2 pt-5 text-sm font-semibold text-royal-700 transition-colors hover:text-royal-900 active:scale-[0.98]"
                    >
                      {lhkpnLabels[locale]}
                      <span aria-hidden="true" className="text-base leading-none">↗</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="admin-leadership" className="mt-20 md:mt-24">
            <div className="border-b border-slate-200 pb-5">
              <h2 id="admin-leadership" className="section-rule font-display text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                {headOfAdmin.position[locale] ?? headOfAdmin.position.id}
              </h2>
            </div>

            <article className="mt-8 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
              {headOfAdmin.photoUrl ? (
                <div className="relative aspect-[4/3] w-full bg-slate-100 sm:aspect-auto sm:min-h-[240px]">
                  <Image src={headOfAdmin.photoUrl} alt={headOfAdmin.name} fill sizes="(min-width: 640px) 320px, 100vw" className="object-contain" />
                </div>
              ) : (
                <DeanAvatarPlate initials={headOfAdmin.initials} name={headOfAdmin.name} />
              )}
              <div className="flex flex-col justify-center p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-royal-600">FUSPI · Administrasi</p>
                <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-slate-950 md:text-2xl">{headOfAdmin.name}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{headOfAdmin.position[locale] ?? headOfAdmin.position.id}</p>
                <a
                  href={LHKPN_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex min-h-10 w-fit items-center gap-2 rounded-lg border border-royal-200 px-4 py-2.5 text-sm font-semibold text-royal-700 transition-colors hover:border-royal-300 hover:bg-royal-50 active:scale-[0.98]"
                >
                  {lhkpnLabels[locale]}
                  <span aria-hidden="true" className="text-base leading-none">↗</span>
                </a>
              </div>
            </article>
          </section>
        </main>
      </Container>
    </div>
  );
}
