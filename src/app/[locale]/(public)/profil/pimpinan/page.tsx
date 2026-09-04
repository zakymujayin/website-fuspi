import type {Metadata} from "next";
import Image from "next/image";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {DeanAvatarPlate} from "@/components/public/dean-avatar-plate";
import {Container} from "@/components/ui/container";
import type {AppLocale} from "@/i18n/routing";
import {deanProfile} from "@/lib/data/dummy-dean";
import {headOfAdmin, viceDeans} from "@/lib/data/dummy-leadership";

function LeadershipPortrait({
  photoUrl,
  initials,
  name,
  sizes,
  priority = false,
}: {
  photoUrl?: string;
  initials: string;
  name: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className="relative aspect-[4/3] w-full rounded-2xl bg-slate-100 p-2 ring-1 ring-inset ring-slate-200">
      <div className="relative size-full overflow-hidden rounded-xl bg-slate-100">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={name}
            fill
            sizes={sizes}
            className="object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            priority={priority}
          />
        ) : (
          <div className="flex size-full items-center justify-center p-4">
            <DeanAvatarPlate initials={initials} name={name} />
          </div>
        )}
      </div>
    </div>
  );
}

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
        <header className="relative overflow-hidden rounded-2xl border border-royal-100 bg-royal-50 px-6 py-7 shadow-sm md:px-9 md:py-8">
          <div aria-hidden="true" className="absolute end-8 top-1/2 size-28 -translate-y-1/2 rounded-full border border-royal-200/70 md:size-40" />
          <div className="relative max-w-3xl border-s-4 border-brass-500 ps-5 md:ps-6">
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
          <section aria-labelledby="dean-profile" className="mt-10 md:mt-14">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto max-w-xs">
                <LeadershipPortrait
                  photoUrl={deanProfile.photoUrl}
                  initials={deanProfile.initials}
                  name={deanProfile.name}
                  sizes="(min-width: 768px) 320px, 80vw"
                  priority
                />
              </div>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-royal-600">{t("dean")}</p>
              <h2 id="dean-profile" className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                {deanProfile.name}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{deanPosition}</p>
            </div>
          </section>

          <section aria-labelledby="vice-deans" className="mt-16 md:mt-20">
            <div className="mb-8 flex items-end gap-4 px-1">
              <h2 id="vice-deans" className="section-rule shrink-0 font-display text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                {t("viceDeans")}
              </h2>
              <span aria-hidden="true" className="mb-1 h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid items-stretch gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {viceDeans.map((vd) => (
                <article key={vd.initials} className="group flex min-h-full flex-col text-center">
                  <LeadershipPortrait
                    photoUrl={vd.photoUrl}
                    initials={vd.initials}
                    name={vd.name}
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  />
                  <div className="flex flex-1 flex-col border-t border-slate-200 pt-4">
                    <h3 className="font-display text-base font-bold leading-6 text-slate-950">{vd.name}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-royal-700">{vd.position[locale] ?? vd.position.id}</p>
                    {vd.bio ? <p className="mt-3 text-sm leading-6 text-slate-600">{vd.bio[locale] ?? vd.bio.id}</p> : null}
                  </div>
                </article>
              ))}
              <article className="group flex min-h-full flex-col text-center">
                <LeadershipPortrait
                  photoUrl={headOfAdmin.photoUrl}
                  initials={headOfAdmin.initials}
                  name={headOfAdmin.name}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                />
                <div className="flex flex-1 flex-col border-t border-slate-200 pt-4">
                  <h3 className="font-display text-base font-bold leading-6 text-slate-950">{headOfAdmin.name}</h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-royal-700">{headOfAdmin.position[locale] ?? headOfAdmin.position.id}</p>
                </div>
              </article>
            </div>
          </section>
        </main>
      </Container>
    </div>
  );
}
