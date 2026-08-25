import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { ImageWithFallback } from "@/components/public/image-with-fallback";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { PublicPostView } from "@/contracts/post";
import { formatJakartaPublishedDate } from "@/components/public/post/format";

/* Full class per role (bg + text), not a shared hardcoded text-white: brass
   is light enough that white text on it fails WCAG AA (2.45:1), so DEKAN
   needs dark text while the other two stay white-on-dark. */
const ROLE_BADGE_CLASS: Record<string, string> = {
  DEKAN: "bg-gradient-to-r from-brass-500 to-brass-400 text-navy-900",
  DOSEN: "bg-gradient-to-r from-royal-600 to-royal-500 text-white",
  MAHASISWA: "bg-gradient-to-r from-navy-800 to-navy-900 text-white",
};
const ROLE_MESSAGE_KEY: Record<string, string> = {
  DEKAN: "dean", DOSEN: "lecturer", MAHASISWA: "student",
};

type ColumnsSectionProps = { items: readonly PublicPostView[]; locale: AppLocale };

export async function ColumnsSection({ items, locale }: ColumnsSectionProps) {
  const t = await getTranslations("Home");

  if (items.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-gradient-to-b from-white to-royal-50/40 py-12 md:py-16">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">{t("columnsEyebrow")}</span>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {t("columnsTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("columnsDescription")}</p>
          </div>
          <Link
            href="/kolom"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700"
          >
            {t("viewAll")}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((column) => (
            <Link
              key={column.id}
              href={`/kolom/${column.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <ImageWithFallback
                  src={column.cover?.url}
                  alt=""
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                />
                {column.columnType ? (
                  <span
                    className={`absolute start-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold ${ROLE_BADGE_CLASS[column.columnType] ?? ROLE_BADGE_CLASS.MAHASISWA}`}
                  >
                    {t(`columnRole.${ROLE_MESSAGE_KEY[column.columnType] ?? "dean"}`)}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="line-clamp-2 font-display text-sm font-semibold text-slate-900 group-hover:text-royal-700">
                  {column.translation.value.title}
                </h3>
                {column.translation.value.excerpt ? (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {column.translation.value.excerpt}
                  </p>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                  <span className="truncate text-[11px] font-medium text-slate-600">{column.authorName}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">
                    {formatJakartaPublishedDate(column.publishedAt, locale)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
