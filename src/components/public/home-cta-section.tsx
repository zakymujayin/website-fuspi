import { ArrowRight, Globe2, Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export async function HomeCtaSection() {
  const t = await getTranslations("Home");
  const sloganWords = t("ctaSlogan").split(" ").filter(Boolean);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-royal-800 to-royal-950">
      <div className="relative flex flex-col md:flex-row">
        <div className="flex-1 px-6 py-16 md:px-10 md:py-20 lg:px-14">
          <div className="mx-auto flex max-w-2xl flex-col items-start gap-5 text-start">
            <span className="text-xs font-medium tracking-wide text-royal-300 uppercase">
              {t("ctaEyebrow")}
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl">
              {t("footerCtaTitle")}
            </h2>
            <p className="max-w-prose text-base text-slate-300">
              {t("footerCtaDescription")}
            </p>
            <Link
              href="/kontak"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-brass-500 to-brass-400 px-5 text-sm font-semibold text-navy-900 transition-all duration-200 hover:from-brass-400 hover:to-brass-400 active:scale-[0.98]"
            >
              <Handshake aria-hidden className="size-4" strokeWidth={1.5} />
              {t("footerCtaButton")}
              <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        {/* Gold block carries the faculty motto — gradient kept within
            brass-400/500 so the dark navy text stays WCAG AA (brass-600
            drops white/navy-900 contrast below 4.5:1). Words stack upright
            (never rotated) with a globe mark and hairline rules so the tall
            panel reads as filled, not just decorative color. */}
        <div className="flex shrink-0 items-center justify-center gap-3 bg-gradient-to-b from-brass-400 to-brass-500 px-6 py-5 md:h-auto md:w-40 md:flex-col md:justify-center md:gap-4 md:bg-gradient-to-r md:px-4 md:py-10 lg:w-56">
          <Globe2 aria-hidden className="hidden size-7 shrink-0 text-navy-900/70 md:block" strokeWidth={1.5} />
          <div className="flex items-center gap-2 md:flex-col md:gap-3">
            {sloganWords.map((word, index) => (
              <span key={word} className="contents">
                {index > 0 ? (
                  <span aria-hidden className="h-3 w-px bg-navy-900/25 md:h-px md:w-6" />
                ) : null}
                <span className="whitespace-nowrap font-display text-xs font-extrabold uppercase tracking-[0.15em] text-navy-900 md:text-sm md:tracking-[0.2em]">
                  {word}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
