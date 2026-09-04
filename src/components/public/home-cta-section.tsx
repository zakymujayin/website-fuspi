import {ArrowRight, ArrowUpRight} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {pmbLink} from "@/components/public/nav-items";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";

export async function HomeCtaSection() {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");

  return (
    <section className="bg-royal-500 py-16 text-white md:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white">{t("ctaEyebrow")}</p>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.015em] text-white">
              {t("footerCtaTitle")}
            </h2>
          </div>
          <div className="lg:col-span-3">
            <p className="text-sm leading-6 text-white md:text-[15px]">{t("footerCtaDescription")}</p>
            <div className="mt-6 flex flex-col items-start gap-3">
              <a href={pmbLink.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 w-full items-center justify-between gap-4 rounded-md bg-white px-5 text-sm font-semibold text-royal-700 transition-colors duration-200 hover:bg-royal-50 motion-safe:active:scale-[0.98]">
                {t("footerCtaButton")}<ArrowUpRight aria-hidden className="size-4" strokeWidth={1.5} />
              </a>
              <Link href="/calon-mahasiswa" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-royal-100">
                {tNav("prospective")}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
