"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

import { useAuthDraft } from "@/components/auth/auth-draft";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
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

/**
 * Auth-only language switcher.
 *
 * The public switcher keeps just `usePathname()`, which drops both the typed
 * credentials and the `?next=` destination — a visitor who changes language
 * mid-form has to start over. This one keeps the query string in the URL and
 * hands the typed values to the destination locale through a single-use memory
 * draft. Values still travel as a real navigation, so they are never written to
 * the URL, history state, storage, or any server payload.
 */
export function AuthLanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeLocale = useLocale();
  const router = useRouter();
  const t = useTranslations("Nav");
  const { capture } = useAuthDraft();

  const query = searchParams.toString();
  // The raw `next` value rides along untouched; it is the server's to judge.
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <nav aria-label={t("languageLabel")} className={cn("flex items-center gap-1", className)}>
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;

        return (
          <Link
            key={locale}
            href={href}
            locale={locale}
            hrefLang={locale}
            lang={locale}
            aria-current={isActive ? "true" : undefined}
            onClick={(event) => {
              if (isActive) return;
              // Take over the navigation so the draft is stashed first; without
              // JavaScript the plain link still works, it just cannot carry
              // state that only exists in the browser.
              event.preventDefault();
              capture();
              router.replace(href, { locale });
            }}
            className={cn(
              "grid min-h-9 min-w-9 place-items-center rounded-md px-2 text-xs font-medium transition-colors",
              "text-slate-600 hover:bg-slate-100 hover:text-royal-700",
              isActive && "bg-royal-50 text-royal-700",
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
