import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { ImageWithFallback } from "@/components/public/image-with-fallback";
import { toFocalPoint } from "@/components/public/focal-point";
import { Reveal } from "@/components/public/reveal";
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

type ColumnGroup = { role: "DEKAN" | "DOSEN" | "MAHASISWA"; items: readonly PublicPostView[] };
type ColumnsSectionProps = { groups: readonly ColumnGroup[]; locale: AppLocale };

/**
 * Three role-scoped card rows, stacked, not one merged grid - a single feed
 * made "Sorotan Akademik" read as ~80% dean posts since that role simply has
 * the most content. Each role keeps its own heading and its own row of up to
 * 5 full photo cards, so the section still reads as the same visual identity
 * as before, just fairly split by author role instead of blended.
 */
export async function ColumnsSection({ groups, locale }: ColumnsSectionProps) {
  const t = await getTranslations("Home");

  if (groups.every((group) => group.items.length === 0)) return null;

  return (
    <section className="border-t border-slate-200 bg-gradient-to-b from-royal-50/70 to-royal-100/50 py-12 md:py-16">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">{t("columnsEyebrow")}</span>
            <h2 className="section-rule mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
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

        <div className="flex flex-col gap-10">
          {groups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.role}>
                <h3 className="font-display text-base font-bold tracking-tight text-slate-900">
                  {t(`columnRole.${ROLE_MESSAGE_KEY[group.role] ?? "dean"}`)}
                </h3>
                {/* Horizontal shelf, not a wrap-grid: every card is the same
                    size (no item enlarged over the others), and scrolling
                    replaces re-wrapping rows as the way more items show up. */}
                <div className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                  {group.items.map((column, index) => (
                    <Reveal key={column.id} index={index} className="w-64 shrink-0 snap-start sm:w-72">
                      <Link
                        href={`/kolom/${column.slug}`}
                        className="group flex w-full flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                          <ImageWithFallback
                            src={column.cover?.url}
                            alt=""
                            className="object-contain transition-transform duration-500 group-hover:scale-105"
                            sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
                            focalPoint={toFocalPoint(column.cover)}
                          />
                          <span
                            className={`absolute start-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold ${ROLE_BADGE_CLASS[group.role] ?? ROLE_BADGE_CLASS.DEKAN}`}
                          >
                            {t(`columnRole.${ROLE_MESSAGE_KEY[group.role] ?? "dean"}`)}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <h4 className="line-clamp-2 font-display text-sm font-semibold text-slate-900 group-hover:text-royal-700">
                            {column.translation.value.title}
                          </h4>
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
                    </Reveal>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
