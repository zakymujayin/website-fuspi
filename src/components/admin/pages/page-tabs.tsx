"use client";

import { cn } from "@/lib/utils";

export type PageEditorLocale = "id" | "en" | "ar";

export const PAGE_EDITOR_LOCALES: readonly PageEditorLocale[] = ["id", "en", "ar"];

type PageLocaleTabsProps = {
  active: PageEditorLocale;
  labels: Record<PageEditorLocale, string>;
  hasTranslation: Record<PageEditorLocale, boolean>;
  onChange: (locale: PageEditorLocale) => void;
};

export function PageLocaleTabs({ active, labels, hasTranslation, onChange }: PageLocaleTabsProps) {
  return (
    <div role="tablist" aria-label="Bahasa konten" className="flex flex-wrap gap-2 border-b border-slate-200">
      {PAGE_EDITOR_LOCALES.map((locale) => {
        const isActive = locale === active;
        const hasContent = hasTranslation[locale];
        return (
          <button
            key={locale}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`page-locale-panel-${locale}`}
            id={`page-locale-tab-${locale}`}
            onClick={() => onChange(locale)}
            className={cn(
              "relative inline-flex h-10 items-center gap-2 px-3 text-sm font-medium transition-colors",
              isActive
                ? "text-royal-700"
                : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {labels[locale]}
            <span
              className={cn(
                "inline-flex size-2 rounded-full",
                hasContent ? "bg-emerald-500" : "bg-slate-300",
              )}
              aria-hidden
            />
            {isActive ? (
              <span className="absolute bottom-0 start-0 end-0 h-0.5 bg-royal-500" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
