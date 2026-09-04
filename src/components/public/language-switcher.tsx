"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_NAMES: Record<AppLocale, string> = {
  id: "Bahasa Indonesia",
  en: "English",
  ar: "العربية",
};

const LOCALE_SHORT: Record<AppLocale, string> = {
  id: "ID",
  en: "EN",
  ar: "AR",
};

type FlagProps = { locale: AppLocale; className?: string };

function FlagIcon({ locale, className }: FlagProps) {
  if (locale === "id") {
    return (
      <svg aria-hidden viewBox="0 0 60 40" className={className}>
        <rect width="60" height="40" fill="#ffffff" />
        <rect width="60" height="20" fill="#dc2626" />
      </svg>
    );
  }
  if (locale === "en") {
    return (
      <svg aria-hidden viewBox="0 0 60 40" className={className}>
        <rect width="60" height="40" fill="#1e40af" />
        <path d="M0 0L60 40M60 0L0 40" stroke="#ffffff" strokeWidth="6" />
        <rect x="22" y="0" width="16" height="40" fill="#ffffff" />
        <rect x="0" y="14" width="60" height="12" fill="#ffffff" />
        <rect x="24" y="2" width="12" height="36" fill="#dc2626" />
        <rect x="2" y="16" width="56" height="8" fill="#dc2626" />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 60 40" className={className}>
      <rect width="60" height="40" fill="#16a34a" />
      <text x="30" y="26" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">لا إله إلا الله</text>
    </svg>
  );
}

type LanguageSwitcherProps = {
  tone?: "light" | "dark";
  size?: "sm" | "lg";
  labelledBy?: string;
  className?: string;
};

/**
 * Locale switcher rendered as a dropdown with inline flag icons, matching the
 * reference pattern. Current path is preserved when switching languages.
 */
export function LanguageSwitcher({
  tone = "dark",
  size = "sm",
  labelledBy,
  className,
}: LanguageSwitcherProps) {
  const pathname = usePathname();
  const activeLocale = useLocale() as AppLocale;
  const t = useTranslations("Nav");

  return (
    <nav
      aria-label={labelledBy ? undefined : t("languageLabel")}
      aria-labelledby={labelledBy}
      className={className}
    >
      <Menu.Root modal={false}>
        <Menu.Trigger
          aria-label={`${t("languageLabel")}: ${LOCALE_NAMES[activeLocale]}`}
          className={cn(
            "inline-flex items-center gap-2 rounded-md font-medium transition-colors",
            size === "lg" ? "min-h-11 px-3 text-sm" : "min-h-9 px-2 text-xs",
            tone === "dark"
              ? "text-slate-300 hover:bg-white/10 hover:text-white"
              : "text-slate-700 hover:bg-slate-100 hover:text-royal-700",
          )}
        >
          <Globe aria-hidden className="size-4" strokeWidth={1.5} />
          <span className="inline-flex items-center gap-1.5">
            <FlagIcon locale={activeLocale} className="h-3.5 w-auto rounded-sm" />
            <span aria-hidden>{LOCALE_SHORT[activeLocale]}</span>
          </span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={4} align="end" className="z-50">
            <Menu.Popup className="min-w-[180px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg outline-none">
              {routing.locales.map((locale) => {
                const isActive = locale === activeLocale;
                const nextLocale = locale as AppLocale;
                return (
                  <Menu.Item
                    key={locale}
                    render={<Link href={pathname} locale={nextLocale} hrefLang={nextLocale} lang={nextLocale} />}
                    className={cn(
                      "flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm outline-none transition-colors",
                      "text-slate-700 data-[highlighted]:bg-royal-50 data-[highlighted]:text-royal-700",
                    )}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <FlagIcon locale={nextLocale} className="h-4 w-auto rounded-sm" />
                    <span className="flex-1">{LOCALE_NAMES[nextLocale]}</span>
                    {isActive ? (
                      <Check aria-hidden className="size-4 text-royal-600" strokeWidth={1.5} />
                    ) : null}
                  </Menu.Item>
                );
              })}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </nav>
  );
}
