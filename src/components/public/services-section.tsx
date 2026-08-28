import { ArrowRight, ArrowUpRight, BookOpen, DoorOpen, FileText, Headset } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/public/reveal";
import { Link } from "@/i18n/navigation";

type ServiceCard = {
  key: "sila" | "ejournal" | "booking" | "complaints";
  icon: typeof FileText;
  href: string;
  external: boolean;
};

/**
 * SILA has no configured public URL yet (`NEXT_PUBLIC_SILA_URL` is unset) and
 * E-Journal has no dedicated route in this build — both fall back to the
 * general services hub rather than a guessed destination (see AGENTS.md).
 */
function buildServices(): readonly ServiceCard[] {
  const silaUrl = process.env.NEXT_PUBLIC_SILA_URL;
  return [
    {
      key: "sila",
      icon: FileText,
      href: silaUrl && silaUrl.length > 0 ? silaUrl : "/layanan",
      external: Boolean(silaUrl && silaUrl.length > 0),
    },
    { key: "ejournal", icon: BookOpen, href: "/layanan", external: false },
    { key: "booking", icon: DoorOpen, href: "/peminjaman", external: false },
    { key: "complaints", icon: Headset, href: "/pengaduan", external: false },
  ] as const;
}

export async function ServicesSection() {
  const t = await getTranslations("Home");
  const services = buildServices();

  return (
    <section className="bg-gradient-to-b from-slate-50 to-royal-50/40 py-14 md:py-20">
      <Container>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-medium tracking-wide text-royal-600 uppercase">{t("servicesEyebrow")}</span>
            <h2 className="section-rule mt-2 font-display text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
              {t("servicesTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{t("servicesDescription")}</p>
          </div>
          <Link
            href="/layanan"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-600 transition-colors hover:text-royal-700"
          >
            {t("viewAll")}
            <ArrowRight aria-hidden className="size-4 rtl:rotate-180" strokeWidth={1.5} />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:gap-5">
          {services.map((service, index) => {
            const title = t(`service.${service.key}.title`);
            const description = t(`service.${service.key}.description`);
            const content = (
              <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-royal-700 p-7 shadow-sm ring-1 ring-royal-600 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brass-500/60 md:p-8">
                {/* Oversized watermark of the card's own icon, bleeding off the
                    trailing-bottom corner. Purely decorative. */}
                <service.icon
                  aria-hidden
                  strokeWidth={1}
                  className="pointer-events-none absolute -end-4 -bottom-6 size-40 text-white/[0.07] transition-transform duration-300 group-hover:scale-105 rtl:-scale-x-100"
                />
                <div className="relative flex items-start justify-between">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/20 transition-colors duration-200 group-hover:bg-brass-400 group-hover:text-royal-950">
                    <service.icon aria-hidden className="size-7" strokeWidth={1.75} />
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="size-5 text-white/30 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:text-brass-400 rtl:-scale-x-100"
                    strokeWidth={1.75}
                  />
                </div>
                <h3 className="relative mt-6 font-display text-xl font-bold tracking-tight text-white md:text-2xl">
                  {title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-royal-100">{description}</p>
                <span className="sr-only">{t("serviceCta")}</span>
              </div>
            );

            return (
              <Reveal key={service.key} index={index}>
                {service.external ? (
                  <a href={service.href} target="_blank" rel="noopener noreferrer" className="block h-full">
                    {content}
                  </a>
                ) : (
                  <Link href={service.href} className="block h-full">
                    {content}
                  </Link>
                )}
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
