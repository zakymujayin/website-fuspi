import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {institution} from "@/config/institution";
import type {AppLocale} from "@/i18n/routing";
import {deanProfile} from "@/lib/data/dummy-dean";
import {headOfAdmin, viceDeans} from "@/lib/data/dummy-leadership";

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Pages"});
  return {title: t("structure")};
}

function OrgCard({
  initials,
  name,
  position,
  tone = "light",
}: {
  initials: string;
  name: string;
  position: string;
  tone?: "light" | "brand";
}) {
  return (
    <div
      className={
        tone === "brand"
          ? "flex flex-col items-center gap-3 rounded-xl border border-brass-400/40 bg-gradient-to-br from-navy-950 via-navy-900 to-royal-800 p-6 text-center shadow-sm"
          : "flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm"
      }
    >
      <span
        className={
          tone === "brand"
            ? "grid size-14 place-items-center rounded-full bg-white/10 font-display text-lg font-bold text-white ring-1 ring-white/20"
            : "grid size-12 place-items-center rounded-full bg-royal-50 font-display text-sm font-bold text-royal-700"
        }
      >
        {initials}
      </span>
      <div>
        <p className={tone === "brand" ? "font-display text-base font-semibold text-white" : "font-display text-sm font-semibold text-slate-900"}>
          {name}
        </p>
        <p className={tone === "brand" ? "mt-1 text-xs text-slate-300" : "mt-1 text-xs text-slate-500"}>{position}</p>
      </div>
    </div>
  );
}

function Connector() {
  return <div aria-hidden className="mx-auto h-8 w-px bg-slate-300" />;
}

export default async function StructurePage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const tNav = await getTranslations("Nav");
  const deanPosition = deanProfile.position[locale] ?? deanProfile.position.id;

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={t("structure")} description={t("structureDesc")} />

      <div className="mt-12">
        <div className="mx-auto max-w-xs">
          <OrgCard initials={deanProfile.initials} name={deanProfile.name} position={deanPosition} tone="brand" />
        </div>

        <Connector />

        <div className="grid gap-5 sm:grid-cols-3">
          {viceDeans.map((vd) => (
            <OrgCard key={vd.initials} initials={vd.initials} name={vd.name} position={vd.position[locale] ?? vd.position.id} />
          ))}
        </div>

        <Connector />

        <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-6">
          <OrgCard
            initials={headOfAdmin.initials}
            name={headOfAdmin.name}
            position={headOfAdmin.position[locale] ?? headOfAdmin.position.id}
          />
          {institution.studyPrograms.map((program) => (
            <OrgCard
              key={program.code}
              initials={program.code.slice(0, 2)}
              name={tNav(`program.${program.code}`)}
              position={t("kaprodi")}
            />
          ))}
        </div>
      </div>
    </Container>
  );
}
