import { ArrowRight, Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";

export async function HomeCtaSection() {
  const t = await getTranslations("Home");

  return (
    <section className="bg-navy-900 py-16 md:py-24">
      <Container>
        <div className="flex max-w-2xl flex-col items-center gap-5 text-center md:items-start md:text-start">
          <span className="text-[11px] font-medium tracking-wide text-royal-300 uppercase">
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
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-brass-500 px-5 text-sm font-medium text-white transition-all duration-200 hover:bg-brass-600 active:scale-[0.98]"
          >
            <Handshake aria-hidden className="size-4" strokeWidth={1.5} />
            {t("footerCtaButton")}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
