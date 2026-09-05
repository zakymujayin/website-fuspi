import {ArrowRight, ArrowUpRight} from "lucide-react";
import {getTranslations} from "next-intl/server";

import {pmbLink} from "@/components/public/nav-items";
import {Container} from "@/components/ui/container";
import {Link} from "@/i18n/navigation";
import styles from "./home-design.module.css";

export async function HomeCtaSection() {
  const t = await getTranslations("Home");
  const tNav = await getTranslations("Nav");

  return (
    <section className={`${styles.section} ${styles.primary} bg-royal-500 text-white`}>
      <Container>
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <p className="text-xl font-bold text-white">{t("ctaEyebrow")}</p>
            <h2 className="mt-4 max-w-4xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.015em] text-white">
              {t("footerCtaTitle")}
            </h2>
          </div>
          <div className="border-s border-white/40 ps-6 lg:col-span-5 lg:ps-10">
            <p className="text-xl font-bold leading-7 text-white">{t("footerCtaDescription")}</p>
            <div className="mt-6 flex flex-col items-start gap-3">
              <a href={pmbLink.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 w-full items-center justify-between gap-4 rounded-md bg-white px-5 text-sm font-semibold text-royal-700 transition-colors duration-200 hover:bg-royal-50 motion-safe:active:scale-[0.98]">
                {t("footerCtaButton")}<ArrowUpRight aria-hidden className="size-4" strokeWidth={1.5} />
              </a>
              <Link href="/calon-mahasiswa" className="inline-flex min-h-11 items-center gap-2 text-xl font-bold text-white transition-colors hover:underline">
                {tNav("prospective")}<ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
