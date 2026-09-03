import type {Metadata} from "next";
import {getTranslations, setRequestLocale} from "next-intl/server";

import {SectionHeading} from "@/components/public/section-heading";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import {institution} from "@/config/institution";
import {primaryNav, quickLinks, type ExternalLink, type NavLink} from "@/components/public/nav-items";

const ROUTES = [
  {href: "/", key: "home"},
  ...primaryNav,
  {href: "/dokumen", key: "documents"},
  {href: "/testimoni", key: "testimonials"},
  {href: "/calon-mahasiswa", key: "prospective"},
  {href: "/privasi", key: "privacy"}, {href: "/aksesibilitas", key: "accessibility"},
] as const;

function isExternalLink(item: NavLink | ExternalLink): item is ExternalLink {
  return "url" in item;
}

export async function generateMetadata({params}: {params: Promise<{locale: string}>}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: "Footer"});
  return {title: t("sitemap")};
}

export default async function SitemapPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Nav");
  const tPages = await getTranslations("Pages");

  return (
    <Container className="py-12 md:py-20">
      <SectionHeading as="h1" title={tPages("sitemapTitle")} />
      <nav aria-label={tPages("sitemapTitle")} className="mt-10 grid gap-5 lg:grid-cols-3">
        {ROUTES.map((route) => (
          <section key={`${route.key}-${route.href}`} className="border border-slate-200 bg-white p-5">
            <Link href={route.href} className="font-display text-base font-semibold text-slate-950 transition-colors hover:text-royal-600">
              {t(route.key)}
            </Link>
            {"children" in route && route.children?.length ? (
              <ul className="mt-4 flex flex-col gap-2">
                {route.children.map((child) => (
                  <li key={`${child.key}-${child.href}`}>
                    <Link href={child.href} className="inline-flex py-1 text-sm text-slate-600 transition-colors hover:text-royal-600">
                      {t(child.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </nav>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="font-display text-lg font-semibold text-slate-950">{t("studyPrograms")}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {institution.studyPrograms.map((p) => (
            <Link key={p.code} href={`/prodi/${p.slug}`}
              className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 transition-colors hover:border-royal-200 hover:bg-royal-50 hover:text-royal-600">
              {t(`program.${p.code}`)}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-slate-200 pt-8">
        <h2 className="font-display text-lg font-semibold text-slate-950">{t("services")}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {quickLinks.map((item) =>
            isExternalLink(item) ? null : (
              <Link key={item.href} href={item.href} className="border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 transition-colors hover:border-royal-200 hover:bg-royal-50 hover:text-royal-600">
                {t(item.key)}
              </Link>
            ),
          )}
        </div>
      </section>
    </Container>
  );
}
