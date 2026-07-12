import { getTranslations } from "next-intl/server";

import { BrandMark } from "@/components/public/brand-mark";
import { quickLinks, studyProgramLinks } from "@/components/public/nav-items";
import { Container } from "@/components/ui/container";
import { institution } from "@/config/institution";
import { Link } from "@/i18n/navigation";

const CURRENT_YEAR = 2026;

function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="section-rule mb-4 font-display text-sm font-medium text-white [&::after]:w-8">
      {children}
    </h2>
  );
}

const LINK_CLASS = "text-sm text-slate-400 transition-colors hover:text-white";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tNav = await getTranslations("Nav");

  return (
    <footer className="mt-20 bg-navy-900 pt-16 text-slate-300">
      <Container>
        <div className="grid gap-8 pb-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <BrandMark tone="dark" />
            <address className="prose-measure text-sm text-slate-400 not-italic">
              {institution.name}, {institution.university}
            </address>
          </div>

          <nav aria-labelledby="footer-programs">
            <ColumnTitle>
              <span id="footer-programs">{tNav("studyPrograms")}</span>
            </ColumnTitle>
            <ul className="flex flex-col gap-2">
              {studyProgramLinks.map((program) => (
                <li key={program.key}>
                  <Link href={program.href} className={LINK_CLASS}>
                    {tNav(program.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-quick">
            <ColumnTitle>
              <span id="footer-quick">{t("quickLinks")}</span>
            </ColumnTitle>
            <ul className="flex flex-col gap-2">
              {quickLinks.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className={LINK_CLASS}>
                    {tNav(item.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <ColumnTitle>{t("contact")}</ColumnTitle>
            <p className="prose-measure text-sm text-slate-400">{t("contactHint")}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-navy-800 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-slate-500">
            © {CURRENT_YEAR} {institution.name}
          </p>
          <nav aria-label={t("legalLabel")} className="flex flex-wrap gap-4">
            <Link href="/privasi" className="text-[13px] text-slate-500 hover:text-white">
              {t("privacy")}
            </Link>
            <Link
              href="/aksesibilitas"
              className="text-[13px] text-slate-500 hover:text-white"
            >
              {t("accessibility")}
            </Link>
            <Link href="/sitemap" className="text-[13px] text-slate-500 hover:text-white">
              {t("sitemap")}
            </Link>
          </nav>
        </div>
      </Container>
    </footer>
  );
}
