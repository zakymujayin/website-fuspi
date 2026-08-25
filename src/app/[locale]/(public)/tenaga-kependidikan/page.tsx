import type {Metadata} from "next";
import Image from "next/image";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {Breadcrumb} from "@/components/public/breadcrumb";
import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {getPrismaClient} from "@/lib/db/client";
import type {AppLocale} from "@/i18n/routing";

const STAFF_SELECT = {
  id: true, name: true, slug: true,
  photoMedia: {select: {id: true, storageKey: true, alt: true}},
  translations: {where: {status: "PUBLISHED" as const}, select: {locale: true, position: true, unit: true}},
} as const;

type StaffRow = {
  id: string; name: string; slug: string;
  photoMedia: {id: string; storageKey: string; alt: string | null} | null;
  translations: ReadonlyArray<{locale: string; position: string | null; unit: string | null}>;
};

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Nav"});
  return {title: t("staff")};
}

export default async function StaffPage({params}: {params: Promise<{locale: AppLocale}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pages");
  const tNav = await getTranslations("Nav");

  let rows: StaffRow[] = [];
  try {
    const prisma = getPrismaClient();
    rows = await prisma.staff.findMany({where: {isActive: true}, orderBy: {order: "asc"}, select: STAFF_SELECT}) as StaffRow[];
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
          {label: tNav("staff")},
        ]}
      />
      <SectionHeading as="h1" title={tNav("staff")} description={t("staffDescription")} />
      {rows.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => {
            const tl = resolveLocale(s.translations, locale);
            return (
              <div key={s.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-slate-100">
                  {s.photoMedia ? (
                    <Image
                      src={`/uploads/${s.photoMedia.storageKey}`}
                      alt={s.photoMedia.alt ?? s.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex size-full items-center justify-center font-display text-lg font-bold text-slate-300">{s.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h2 className="font-display text-[15px] font-semibold text-slate-900">{s.name}</h2>
                  {tl?.position ? <p className="text-sm text-slate-500">{tl.position}</p> : null}
                  {tl?.unit ? <p className="text-xs text-slate-400">{tl.unit}</p> : null}
                </div>
              </div>
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
