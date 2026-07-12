import { getTranslations } from "next-intl/server";

/** Visible only on keyboard focus; first tab stop of every public page. */
export async function SkipLink() {
  const t = await getTranslations("Nav");

  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
    >
      {t("skipToContent")}
    </a>
  );
}
