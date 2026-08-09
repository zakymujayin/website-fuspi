import {getTranslations, setRequestLocale} from "next-intl/server";

import {Link} from "@/i18n/navigation";
import type {AppLocale} from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{locale: AppLocale}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations("M0");

  return (
    // The public layout owns the single <main> landmark and the min-h-screen
    // shell, so this page only centres the M0 card in the space it is given.
    <div className="grid place-items-center px-6 py-12 md:py-20">
      <section className="foundation-card" aria-labelledby="foundation-title">
        <p className="foundation-eyebrow">FUSPI · M0</p>
        <h1 id="foundation-title">{t("title")}</h1>
        <p>{t("description")}</p>
        <nav aria-label={t("languageLabel")} className="locale-list">
          {(["id", "en", "ar"] as const).map((targetLocale) => (
            <Link
              key={targetLocale}
              href="/"
              locale={targetLocale}
              aria-current={locale === targetLocale ? "page" : undefined}
            >
              {targetLocale.toUpperCase()}
            </Link>
          ))}
        </nav>
        <p className="foundation-status" role="status">
          {t("status")}
        </p>
      </section>
    </div>
  );
}
