import type {Metadata} from "next";
import Image from "next/image";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {DeanAvatarPlate} from "@/components/public/dean-avatar-plate";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";
import {deanProfile} from "@/lib/data/dummy-dean";
import {headOfAdmin, viceDeans} from "@/lib/data/dummy-leadership";

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
    <div className="bg-slate-50">
      <Container className="py-8 md:py-12">
        <header className="relative overflow-hidden rounded-3xl bg-navy-950 px-6 py-10 text-white shadow-lg md:px-12 md:py-14">
          <div aria-hidden="true" className="absolute inset-y-0 end-0 w-1/2 bg-royal-900/30 [clip-path:polygon(35%_0,100%_0,100%_100%,0_100%)]" />
          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass-400">FUSPI · Profil Fakultas</p>
            <h1 className="section-rule mt-4 font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
              {t("leadership")}
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300 md:text-base md:leading-8">
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
                      className="object-cover"
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

                <blockquote className="mt-8 rounded-2xl border-s-4 border-brass-500 bg-royal-50 px-5 py-5 md:px-6 md:py-6">
                  <p className="max-w-[62ch] text-sm leading-7 text-slate-700 md:text-base md:leading-8">{deanMessage}</p>
                </blockquote>
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
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy-900">
                      <Image src={vd.photoUrl} alt={vd.name} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover object-top" />
                    </div>
                  ) : (
                    <DeanAvatarPlate initials={vd.initials} name={vd.name} />
                  )}
                  <div className="flex flex-1 flex-col p-5 md:p-6">
                    <h3 className="font-display text-base font-bold leading-6 text-slate-950">{vd.name}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-royal-700">{vd.position[locale] ?? vd.position.id}</p>
                    {vd.bio ? <p className="mt-4 border-t border-slate-200 pt-4 text-sm leading-6 text-slate-600">{vd.bio[locale] ?? vd.bio.id}</p> : null}
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

            <article className="mt-8 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
              {headOfAdmin.photoUrl ? (
                <div className="relative aspect-[4/3] w-full bg-slate-100 sm:aspect-auto sm:min-h-[220px]">
                  <Image src={headOfAdmin.photoUrl} alt={headOfAdmin.name} fill sizes="(min-width: 640px) 280px, 100vw" className="object-cover object-top" />
                </div>
              ) : (
                <DeanAvatarPlate initials={headOfAdmin.initials} name={headOfAdmin.name} />
              )}
              <div className="flex flex-col justify-center p-6 md:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-royal-600">FUSPI · Administrasi</p>
                <h3 className="mt-3 font-display text-xl font-bold tracking-tight text-slate-950 md:text-2xl">{headOfAdmin.name}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{headOfAdmin.position[locale] ?? headOfAdmin.position.id}</p>
              </div>
            </article>
          </section>
        </main>
      </Container>
    </div>
  );
}
