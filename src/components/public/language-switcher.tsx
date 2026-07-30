"use client";

import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<AppLocale, string> = {
  id: "ID",
  en: "EN",
  ar: "AR",
};

const LOCALE_NAMES: Record<AppLocale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
  ar: "العربية",
};

type LanguageSwitcherProps = {
  tone?: "light" | "dark";
  /** `lg` meets the 44px drawer target floor (docs/26-C). */
  size?: "sm" | "lg";
  /** Id of a visible heading that names this group, used instead of aria-label. */
  labelledBy?: string;
  className?: string;
};

/**
 * Switching locale keeps the current path (docs/12-F). Rendered as links so it
 * works without JavaScript and stays operable with the keyboard.
 */
export function LanguageSwitcher({
  tone = "dark",
  size = "sm",
  labelledBy,
  className,
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const activeLocale = useLocale();
  const t = useTranslations("Nav");

  return (
    <nav
      aria-label={labelledBy ? undefined : t("languageLabel")}
      aria-labelledby={labelledBy}
      className={cn("flex items-center gap-1", className)}
    >
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;

        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            hrefLang={locale}
            lang={locale}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "grid place-items-center rounded-md px-2 font-medium transition-colors",
              size === "lg"
                ? "min-h-11 min-w-11 text-sm"
                : "min-h-9 min-w-9 text-xs",
              tone === "dark"
                ? "text-slate-300 hover:bg-white/10 hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-royal-700",
              isActive && tone === "dark" && "bg-white/15 text-white",
              isActive && tone === "light" && "bg-royal-50 text-royal-700",
            )}
          >
            <span aria-hidden>{LOCALE_LABELS[locale]}</span>
            <span className="sr-only">{LOCALE_NAMES[locale]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
